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

        $webhookUrl = env('N8N_WEBHOOK_URL');

        if (!$webhookUrl) {
            // Fallback for testing/development if n8n is not set up
            return $this->mockExtraction($relativeUrl);
        }

        try {
            // Send the file to n8n webhook
            $response = Http::timeout(60)
                ->attach('data', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post($webhookUrl);

            if ($response->successful()) {
                $extractedData = $response->json();
                $extractedData['pdf_path'] = $relativeUrl;
                
                // Process and validate the extracted data against the database
                return response()->json($this->enrichAndValidateData($extractedData));
            }

            Log::error('n8n Webhook Failed', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['message' => 'Failed to process document with AI service.'], 500);

        } catch (\Exception $e) {
            Log::error('n8n Webhook Exception', ['message' => $e->getMessage()]);
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
            $matchedPo = PurchaseOrder::with(['items', 'supplier'])->where('po_number', $poNumber)->first();
        }

        $enrichedItems = [];
        $items = $data['items'] ?? [];

        foreach ($items as $item) {
            $validationStatus = 'ok';
            $validationMessage = '';
            
            if ($matchedPo) {
                // Try to match the item with a PO item (by description or drawing number)
                $poItem = $matchedPo->items->first(function ($pi) use ($item) {
                    return stripos($pi->item_description, $item['description']) !== false 
                        || ($item['drawing_number'] && $pi->drawing_number === $item['drawing_number']);
                });

                if ($poItem) {
                    // Map to what the frontend expects
                    $item['item_code'] = $poItem->item_code;
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
            $data['supplier_name'] = $matchedPo->supplier->name ?? ($data['supplier_name'] ?? '');
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
