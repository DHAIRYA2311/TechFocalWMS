<?php

namespace App\Services;

use Exception;
use Smalot\PdfParser\Parser;

class PdfParserService
{
    /**
     * Parse raw text from PDF and extract PO fields.
     */
    public function parse(string $pdfPath)
    {
        $data = [
            'po_number' => null,
            'po_date' => null,
            'customer_name' => null,
            'customer_address' => null,
            'customer_gstin' => null,
            'customer_email' => null,
            'items' => [],
            'raw_text' => ''
        ];

        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($pdfPath);
            $text = $pdf->getText();
            $data['raw_text'] = $text;

            // Normalize spaces (convert non-breaking spaces to standard spaces)
            $text = str_replace(chr(194).chr(160), ' ', $text);
            $text = str_replace(chr(160), ' ', $text);

            // Normalize numbers (e.g. 1,000 -> 1000) by removing commas between digits
            $text = preg_replace('/(?<=\d),(?=\d)/', '', $text);

            $lines = explode("\n", $text);
            foreach ($lines as &$l) {
                $l = trim($l);
            }
            unset($l);

            // Check if this is the Sandvik / Structured format
            $isStructuredSandvik = false;
            foreach ($lines as $line) {
                if (stripos($line, 'SANDVIK MINING AND ROCK') !== false || preg_match('/^\d+Item Code:\s*/i', $line)) {
                    $isStructuredSandvik = true;
                    break;
                }
            }

            if ($isStructuredSandvik) {
                // 1. PO Number
                foreach ($lines as $line) {
                    if (preg_match('/NO\s*:\s*(\d+)/i', $line, $matches)) {
                        $data['po_number'] = $matches[1];
                        break;
                    }
                }

                // 2. PO Date (from footers right above Page X of Y)
                foreach ($lines as $i => $line) {
                    if (preg_match('/Page\s+\d+\s+of\s+\d+/i', $line)) {
                        for ($j = 1; $j <= 3; $j++) {
                            if ($i - $j >= 0) {
                                $prevLine = $lines[$i - $j];
                                if (preg_match('/^(\d{2}\/\d{2}\/\d{4})$/', $prevLine, $dMatches)) {
                                    $data['po_date'] = date('Y-m-d', strtotime(str_replace('/', '-', $dMatches[1])));
                                    break 2;
                                }
                            }
                        }
                    }
                }

                // 3. Customer Name & Address & GSTIN (extracting above SUPPLIER:)
                $supplierIdx = -1;
                foreach ($lines as $i => $line) {
                    if (strpos($line, 'SUPPLIER:') !== false) {
                        $supplierIdx = $i;
                        break;
                    }
                }

                if ($supplierIdx !== -1) {
                    $custLines = [];
                    for ($i = $supplierIdx - 1; $i >= 0; $i--) {
                        $line = $lines[$i];
                        if (preg_match('/(?:^NO\s*:\s*\d+|\bPURCHASE\s+ORDER\b|Registered\s+office)/i', $line) || empty($line)) {
                            break;
                        }
                        $custLines[] = $line;
                    }
                    $custLines = array_reverse($custLines);
                    if (count($custLines) >= 2) {
                        $data['customer_name'] = $custLines[0] . ' ' . $custLines[1];
                        
                        $addressLines = [];
                        foreach (array_slice($custLines, 2) as $line) {
                            if (preg_match('/GSTIN\s*(?:No)?\s*:\s*([A-Za-z0-9]+)/i', $line, $gstinMatches)) {
                                $data['customer_gstin'] = trim($gstinMatches[1]);
                            } else {
                                $addressLines[] = $line;
                            }
                        }
                        $data['customer_address'] = implode("\n", $addressLines);
                    } elseif (count($custLines) === 1) {
                        $data['customer_name'] = $custLines[0];
                    }
                }

                if (empty($data['customer_name'])) {
                    $data['customer_name'] = 'SANDVIK MINING AND ROCK TECHNOLOGY INDIA PRIVATE LIMITED';
                }

                // 4. Parse Items Grid
                $currentItem = null;
                foreach ($lines as $i => $line) {
                    if (preg_match('/^(\d+)Item Code:\s*(.*)/i', $line, $matches)) {
                        if ($currentItem) {
                            $data['items'][] = $currentItem;
                        }
                        $currentItem = [
                            'item_code' => trim($matches[2]),
                            'desc_lines' => [],
                            'delivery_date' => null,
                            'hsn_sac' => null,
                            'uqc' => 'PC',
                            'unit' => 'PC',
                            'quantity' => 0.0,
                            'rate' => 0.0,
                            'cgst' => 0.0,
                            'sgst' => 0.0,
                            'igst' => 0.0,
                            'total_amount' => 0.0
                        ];
                        continue;
                    }

                    if ($currentItem) {
                        // Check if this line is the values line
                        if (preg_match('/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+([A-Z]{2,})\s+([\d.,\s]+)$/i', $line, $valMatches)) {
                            $currentItem['delivery_date'] = date('Y-m-d', strtotime(str_replace('/', '-', $valMatches[1])));
                            $currentItem['hsn_sac'] = $valMatches[2];
                            $currentItem['uqc'] = $valMatches[3];
                            $currentItem['unit'] = $valMatches[3];
                            
                            $numsStr = trim($valMatches[4]);
                            $nums = preg_split('/\s+/', $numsStr);
                            $count = count($nums);
                            if ($count >= 3) {
                                $currentItem['quantity'] = floatval(str_replace(',', '', $nums[0]));
                                $currentItem['rate'] = floatval(str_replace(',', '', $nums[1]));
                                $currentItem['total_amount'] = floatval(str_replace(',', '', $nums[$count - 1]));
                                
                                if ($count === 6) {
                                    $currentItem['cgst'] = floatval($nums[3]);
                                    $currentItem['sgst'] = floatval($nums[4]);
                                    $currentItem['igst'] = 0.0;
                                } elseif ($count === 5) {
                                    $currentItem['cgst'] = 0.0;
                                    $currentItem['sgst'] = 0.0;
                                    $currentItem['igst'] = floatval($nums[3]);
                                } else {
                                    $currentItem['cgst'] = 0.0;
                                    $currentItem['sgst'] = 0.0;
                                    $currentItem['igst'] = 0.0;
                                }
                            }
                            
                            $data['items'][] = $currentItem;
                            $currentItem = null;
                        } else {
                            // Skip header/footer lines
                            if (preg_match('/^(Page\s+\d+|Sonali Dhote|\d{2}\/\d{2}\/\d{4}$|SANDVIK MINING|Registered office|CTS No|Dapodi|Maharashtra|PAN No|CIN No|Bank Details|Standard Chartered|Swift Code|IFSC code|NO:\d+|ItemDescription|SrlGoods)/i', $line)) {
                                continue;
                            }
                            $currentItem['desc_lines'][] = $line;
                        }
                    }
                }
                if ($currentItem) {
                    $data['items'][] = $currentItem;
                }

                // Format descriptions
                foreach ($data['items'] as &$item) {
                    $item['description'] = implode("\n", $item['desc_lines']);
                    unset($item['desc_lines']);
                }

            } else {
                // Fallback / Generic Parser
                // 1. Parse PO Number
                if (preg_match('/(?:P\.?O\.?\s*(?:No|Number|#)?|Purchase\s*Order\s*(?:No|Number|#)?|Order\s*(?:No|Number|#)?)\s*[:\-#]?\s*([A-Za-z0-9\-\/]+)/i', $text, $matches)) {
                    $data['po_number'] = trim($matches[1]);
                }

                // 2. Parse PO Date
                if (preg_match('/(?:Date|P\.?O\.?\s*Date)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\d{4}[\-\/\.]\d{1,2}[\-\/\.]\d{1,2})/i', $text, $matches)) {
                    $dateStr = trim($matches[1]);
                    $parsedDate = date('Y-m-d', strtotime(str_replace(['/', '.'], '-', $dateStr)));
                    if ($parsedDate && $parsedDate !== '1970-01-01') {
                        $data['po_date'] = $parsedDate;
                    }
                }

                // 3. Parse Customer/Company Name
                foreach ($lines as $line) {
                    if (preg_match('/(?:M\/s|Company|Customer|Client|Name|To)\s*[:\-]\s*([A-Za-z0-9\s\.&,]+)/i', $line, $matches)) {
                        $data['customer_name'] = trim($matches[1]);
                        break;
                    }
                }
                if (empty($data['customer_name'])) {
                    foreach ($lines as $line) {
                        if (strlen($line) > 5 && !preg_match('/(?:purchase|order|invoice|quotation|date|no|tax)/i', $line)) {
                            $data['customer_name'] = $line;
                            break;
                        }
                    }
                }

                // 4. Parse Items Grid
                foreach ($lines as $line) {
                    if (preg_match('/(\d+)?\s*(.+?)\s+(\d+(?:\.\d+)?)\s*(Pcs|Nos|Kgs|Sets|Units|Mtr|SqFt)?\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/i', $line, $matches)) {
                        $data['items'][] = [
                            'item_code' => $matches[1] ? trim($matches[1]) : null,
                            'description' => trim($matches[2]),
                            'delivery_date' => null,
                            'hsn_sac' => null,
                            'uqc' => $matches[4] ? trim($matches[4]) : 'Pcs',
                            'unit' => $matches[4] ? trim($matches[4]) : 'Pcs',
                            'quantity' => floatval($matches[3]),
                            'rate' => floatval($matches[5]),
                            'cgst' => 0.0,
                            'sgst' => 0.0,
                            'igst' => 0.0,
                            'total_amount' => floatval($matches[6])
                        ];
                    }
                }
            }

            // Clean up and set defaults
            if (empty($data['po_number'])) {
                $data['po_number'] = 'UNKNOWN-' . time();
            }
            if (empty($data['po_date'])) {
                $data['po_date'] = date('Y-m-d');
            }
            if (empty($data['customer_name'])) {
                $data['customer_name'] = 'UNKNOWN CUSTOMER';
            }

        } catch (Exception $e) {
            logger()->error("PDF Parsing Exception: " . $e->getMessage());
        }

        return $data;
    }
}
