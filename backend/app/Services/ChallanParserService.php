<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use Exception;
use Smalot\PdfParser\Parser;

class ChallanParserService
{
    /**
     * Parse raw text from Challan PDF and match against POs.
     */
    public function parse(string $pdfPath)
    {
        $data = [
            'challan_number' => null,
            'challan_date' => null,
            'purchase_order_id' => null,
            'po_number' => null,
            'items' => [],
            'raw_text' => ''
        ];

        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($pdfPath);
            $text = $pdf->getText();
            $data['raw_text'] = $text;

            // Normalize spaces
            $text = str_replace(chr(194).chr(160), ' ', $text);
            $text = str_replace(chr(160), ' ', $text);

            // Normalize numbers (e.g. 1,000 -> 1000) by removing commas between digits
            $text = preg_replace('/(?<=\d),(?=\d)/', '', $text);

            $lines = explode("\n", $text);
            foreach ($lines as &$l) {
                $l = trim($l);
            }
            unset($l);

            // 1. Match PO Number by looking up approved/draft POs in the database
            $matchedPo = null;
            $purchaseOrders = PurchaseOrder::with('items')->get();
            foreach ($purchaseOrders as $po) {
                if (stripos($text, $po->po_number) !== false) {
                    $matchedPo = $po;
                    $data['purchase_order_id'] = $po->id;
                    $data['po_number'] = $po->po_number;
                    break;
                }
            }

            // 2. Parse Challan Number
            // Matches "Challan No: 123", "DC No: 123", "Document No: 123"
            if (preg_match('/(?:Challan|DC|Delivery\s*Challan|Doc|Document)\s*(?:No|Number)?\s*[:\-#]?\s*([A-Za-z0-9\-]+)/i', $text, $matches)) {
                $data['challan_number'] = trim($matches[1]);
            }

            // 3. Parse Challan Date
            if (preg_match('/(?:Date|Challan\s*Date|DC\s*Date)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2})/i', $text, $matches)) {
                $dateStr = trim($matches[1]);
                $parsedDate = date('Y-m-d', strtotime(str_replace(['/', '.'], '-', $dateStr)));
                if ($parsedDate && $parsedDate !== '1970-01-01') {
                    $data['challan_date'] = $parsedDate;
                }
            }

            // 4. Match Items and Quantities
            if ($matchedPo) {
                foreach ($matchedPo->items as $poItem) {
                    $qtyReceived = 0.0;
                    $itemFound = false;

                    // Scan lines for this item code
                    foreach ($lines as $i => $line) {
                        if (stripos($line, $poItem->item_code) !== false) {
                            $itemFound = true;
                            
                            // Look at this line and the next line for quantities
                            $searchArea = $line;
                            if (isset($lines[$i + 1])) {
                                $searchArea .= ' ' . $lines[$i + 1];
                            }
                            if (isset($lines[$i + 2])) {
                                $searchArea .= ' ' . $lines[$i + 2];
                            }

                            // Remove item code from search area to avoid digit conflicts
                            $cleanArea = str_ireplace($poItem->item_code, '', $searchArea);

                            // Match numeric decimal values (quantities)
                            // Look for quantity preceding or following UQC/unit
                            if (preg_match('/(\d+(?:\.\d+)?)\s*(?:PC|Pcs|Nos|Kgs|Sets|Units|Mtr|SqFt)/i', $cleanArea, $qtyMatches)) {
                                $qtyReceived = floatval($qtyMatches[1]);
                                break;
                            }
                        }
                    }

                    if ($itemFound) {
                        $data['items'][] = [
                            'po_item_id' => $poItem->id,
                            'item_code' => $poItem->item_code,
                            'description' => $poItem->description,
                            'ordered_quantity' => $poItem->quantity,
                            'quantity_received' => $qtyReceived,
                        ];
                    }
                }
            }

            // Defaults
            if (empty($data['challan_number'])) {
                $data['challan_number'] = 'CHALLAN-' . time();
            }
            if (empty($data['challan_date'])) {
                $data['challan_date'] = date('Y-m-d');
            }

        } catch (Exception $e) {
            logger()->error("Challan Parsing Exception: " . $e->getMessage());
        }

        return $data;
    }
}
