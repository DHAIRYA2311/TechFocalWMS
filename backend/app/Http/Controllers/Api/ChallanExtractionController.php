<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\PurchaseOrder;

class ChallanExtractionController extends Controller
{
    /**
     * Handle the extraction of data from an incoming challan document.
     */
    public function extractIncoming(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,pdf|max:10240',
        ]);

        $file = $request->file('file');
        
        // Save file locally for viewing
        if (!\Storage::disk('public')->exists('drawings')) {
            \Storage::disk('public')->makeDirectory('drawings');
        }
        $fileName = time() . '_ai_challan_' . preg_replace('/[^a-zA-Z0-9_.-]/', '', $file->getClientOriginalName());
        \Storage::disk('public')->putFileAs('drawings', $file, $fileName);
        $relativeUrl = 'storage/drawings/' . $fileName;

        $geminiApiKey = env('GEMINI_API_KEY');

        if (!$geminiApiKey) {
            // Fallback for testing/development if API key is not set
            return $this->mockExtraction($relativeUrl);
        }

        try {
            $base64Image = base64_encode(file_get_contents($file->getRealPath()));
            $mimeType = $file->getMimeType();

            $payload = [
                'system_instruction' => [
                    'parts' => [
                        ['text' => 'You are a highly accurate data extraction assistant. Extract the information from the provided Incoming Challan. Return ONLY valid JSON matching this schema:
{
  "challan_number": "string or null",
  "challan_date": "YYYY-MM-DD or null",
  "purchase_order_number": "string or null",
  "supplier_name": "string or null",
  "items": [
    {
      "description": "string",
      "quantity": 0,
      "item_code": "string or null",
      "unit": "string or null"
    }
  ]
}
Do not invent data. If a field is not present, return null.']
                    ]
                ],
                'contents' => [
                    [
                        'parts' => [
                            ['text' => 'Extract the data from this document.'],
                            [
                                'inline_data' => [
                                    'mime_type' => $mimeType,
                                    'data' => $base64Image
                                ]
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'response_mime_type' => 'application/json'
                ]
            ];

            $response = Http::timeout(60)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" . $geminiApiKey, $payload);

            if ($response->successful()) {
                $geminiResponse = $response->json();
                $textResponse = $geminiResponse['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
                
                // Clean markdown if present
                $textResponse = str_replace(['```json', '```'], '', $textResponse);
                $extractedData = json_decode(trim($textResponse), true);

                if (!$extractedData) {
                    throw new \Exception("Failed to decode JSON from Gemini");
                }

                $extractedData['pdf_path'] = $relativeUrl;
                
                // Process and validate the extracted data against the database
                return response()->json($this->enrichAndValidateData($extractedData));
            }

            Log::error('Gemini API Failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['message' => 'Failed to process document with AI service. API returned: ' . $response->status()], 500);

        } catch (\Exception $e) {
            Log::error('Gemini API Exception', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to connect to the AI service.'], 500);
        }
    }

    /**
     * Enrich and validate the extracted data (PO matching, etc.)
     */
    private function enrichAndValidateData($data)
    {
        $poNumber = $data['purchase_order_number'] ?? null;
        $matchedPo = null;

        if ($poNumber) {
            // Try to find the Purchase Order in the database
            $matchedPo = PurchaseOrder::with(['items', 'customer'])->where('po_number', $poNumber)->first();
        }

        $enrichedItems = [];
        $items = $data['items'] ?? [];

        foreach ($items as $item) {
            $validationStatus = 'ok';
            $validationMessage = '';
            
            if ($matchedPo) {
                $itemCode = $item['item_code'] ?? $item['drawing_number'] ?? '';
                
                // First, find all items that match the item_code
                $matchedPoItems = $matchedPo->items->filter(function ($pi) use ($itemCode) {
                    return $itemCode && stripos($pi->item_code, $itemCode) !== false;
                });

                $poItem = null;

                if ($matchedPoItems->count() > 1) {
                    // If multiple items have the same item_code, pick the one with the best description match
                    // Use a combination of similar_text and exact word matching for uniqueness
                    $bestScore = -1;
                    $itemDesc = strtolower(trim($item['description'] ?? ''));
                    
                    foreach ($matchedPoItems as $pi) {
                        $piDesc = strtolower(trim($pi->description));
                        $score = 0;
                        
                        similar_text($piDesc, $itemDesc, $baseSim);
                        $score += $baseSim;
                        
                        // Boost score if unique words (like 'final', 'primary', 'grinding') match
                        $words = array_filter(explode(' ', preg_replace('/[^a-z0-9]/', ' ', $piDesc)));
                        $matchedWords = 0;
                        foreach($words as $word) {
                            if (strlen($word) > 2 && strpos($itemDesc, $word) !== false) {
                                $matchedWords++;
                            }
                        }
                        
                        if (count($words) > 0) {
                            $wordMatchRatio = $matchedWords / count($words);
                            $score += ($wordMatchRatio * 100); // Massive boost for exact word matches
                        }
                        
                        if ($score > $bestScore) {
                            $bestScore = $score;
                            $poItem = $pi;
                        }
                    }
                } elseif ($matchedPoItems->count() === 1) {
                    $poItem = $matchedPoItems->first();
                }

                if (!$poItem) {
                    // Fallback: match by description similarity if item_code is completely missing
                    $bestScore = 50; // Require at least 50% similarity for a fallback match
                    foreach ($matchedPo->items as $pi) {
                        similar_text(strtolower(trim($pi->description)), strtolower(trim($item['description'] ?? '')), $percent);
                        if ($percent > $bestScore) {
                            $bestScore = $percent;
                            $poItem = $pi;
                        }
                    }
                }

                if ($poItem) {
                    // Map to what the frontend expects
                    $item['item_code'] = $poItem->item_code;
                    $item['po_item_id'] = $poItem->id;
                    $item['quantity_received'] = (float)$item['quantity'];

                    // Check quantity
                    if ((float)$item['quantity'] > (float)$poItem->quantity) {
                        $validationStatus = 'warning';
                        $validationMessage = "Quantity mismatch. PO expected: {$poItem->quantity}";
                    }
                } else {
                    $validationStatus = 'warning';
                    $validationMessage = "Item not found in PO.";
                }
            } else {
                $validationStatus = 'info';
                $validationMessage = "Requires review.";
            }

            $item['validation_status'] = $validationStatus;
            $item['validation_message'] = $validationMessage;
            $enrichedItems[] = $item;
        }

        $data['items'] = $enrichedItems;
        
        if ($matchedPo) {
            $data['purchase_order_id'] = $matchedPo->id;
            $data['supplier_name'] = $matchedPo->customer->customer_name ?? ($data['supplier_name'] ?? '');
        }

        return $data;
    }

    /**
     * Mock response if n8n is not configured, used for UI testing
     */
    private function mockExtraction($pdfPath)
    {
        // Simulate processing delay
        sleep(2);
        
        $mockData = [
            'challan_number' => 'CHL-' . rand(1000, 9999),
            'challan_date' => date('Y-m-d'),
            'purchase_order_number' => 'PO-DEMO-123',
            'supplier_name' => 'Demo Supplier Industries',
            'pdf_path' => $pdfPath,
            'items' => [
                [
                    'description' => 'Demo Extracted Item ' . rand(1, 100),
                    'quantity' => rand(10, 50),
                    'drawing_number' => 'DRW-' . rand(100, 999),
                    'unit' => 'Nos',
                ]
            ]
        ];

        return response()->json($this->enrichAndValidateData($mockData));
    }
}
