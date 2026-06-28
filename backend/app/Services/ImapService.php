<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Exception;

class ImapService
{
    protected $mbox = null;
    protected $error = '';

    /**
     * Connect to IMAP mail server using cached settings.
     */
    public function connect()
    {
        $host = Setting::getVal('imap_host');
        $port = Setting::getVal('imap_port', '993');
        $encryption = Setting::getVal('imap_encryption', 'ssl');
        $username = Setting::getVal('imap_username');
        $password = Setting::getVal('imap_password');
        $folder = Setting::getVal('imap_source_folder', 'INBOX');

        if (!$host || !$username || !$password) {
            throw new Exception("IMAP settings are not fully configured in settings.");
        }

        $sslString = '';
        if ($encryption === 'ssl') {
            $sslString = '/imap/ssl/novalidate-cert';
        } elseif ($encryption === 'tls') {
            $sslString = '/imap/tls/novalidate-cert';
        } else {
            $sslString = '/imap/novalidate-cert';
        }

        $connStr = "{" . $host . ":" . $port . $sslString . "}" . $folder;

        // Socket connection pre-check to prevent hanging on unreachable hosts/ports
        $socketHost = ($encryption === 'ssl') ? 'ssl://' . $host : $host;
        $socket = @fsockopen($socketHost, (int)$port, $errno, $errstr, 4);
        if (!$socket) {
            $this->error = "Mail server port $port is unreachable on host '$host'. Details: $errstr ($errno)";
            return false;
        }
        fclose($socket);

        // Open connection with 5-second timeout
        imap_timeout(IMAP_OPENTIMEOUT, 5);
        $this->mbox = @imap_open($connStr, $username, $password);

        if (!$this->mbox) {
            $errs = imap_errors();
            $this->error = $errs ? implode('; ', $errs) : 'Connection timed out or failed';
            return false;
        }

        return true;
    }

    /**
     * Retrieve the last connection error.
     */
    public function getLastError()
    {
        return $this->error;
    }

    /**
     * Close mailbox.
     */
    public function disconnect()
    {
        if ($this->mbox) {
            @imap_close($this->mbox);
            $this->mbox = null;
        }
    }

    /**
     * Connect to mail, download sample PO, extract fields, and transition email folder.
     */
    public function fetchPurchaseOrders()
    {
        if (!$this->mbox && !$this->connect()) {
            throw new Exception("Could not connect to IMAP server: " . $this->error);
        }

        // Record fetch timestamp in local/system timezone
        Setting::setVal('po_last_fetch_at', now()->toDateTimeString());

        $processedEmails = 0;
        $failedEmails = 0;

        // Search for UNSEEN emails matching the subject filter directly
        $subjectFilter = Setting::getVal('imap_subject_filter');
        $searchCriteria = 'UNSEEN';
        if ($subjectFilter) {
            $searchCriteria .= ' SUBJECT "' . $subjectFilter . '"';
        }

        $emails = imap_search($this->mbox, $searchCriteria);

        if ($emails) {
            // Process the newest unread messages first and limit to 15 to prevent server timeouts
            $emails = array_reverse($emails);
            $emails = array_slice($emails, 0, 15);
        }

        if (!$emails) {
            return [
                'processed' => 0,
                'failed' => 0,
                'message' => 'No new unread emails found.'
            ];
        }

        $pdfParser = new PdfParserService();

        // Ensure storage directory exists
        if (!Storage::disk('public')->exists('drawings')) {
            Storage::disk('public')->makeDirectory('drawings');
        }

        foreach ($emails as $msgNumber) {
            try {
                $header = imap_headerinfo($this->mbox, $msgNumber);
                $uid = imap_uid($this->mbox, $msgNumber);

                // Skip if this message UID has already been imported
                if (PurchaseOrder::where('email_uid', $uid)->exists()) {
                    continue;
                }

                // Filter by Subject keyword if configured
                $subject = isset($header->subject) ? imap_utf8($header->subject) : '';
                $subjectFilter = Setting::getVal('imap_subject_filter');
                if ($subjectFilter && stripos($subject, $subjectFilter) === false) {
                    continue; // Skip if subject doesn't match the required PO filter
                }

                $fromInfo = $header->from[0] ?? null;
                $fromEmail = $fromInfo ? ($fromInfo->mailbox . '@' . $fromInfo->host) : 'unknown@example.com';
                $fromName = $fromInfo ? (isset($fromInfo->personal) ? imap_utf8($fromInfo->personal) : $fromEmail) : 'Unknown';

                // Fetch email structural parts
                $structure = imap_fetchstructure($this->mbox, $msgNumber);
                $attachments = [];
                $this->getAttachments($msgNumber, $structure, '', $attachments);

                $pdfAttachment = null;
                foreach ($attachments as $att) {
                    if (strtolower(pathinfo($att['filename'], PATHINFO_EXTENSION)) === 'pdf') {
                        $pdfAttachment = $att;
                        break; // Grab the first PDF attachment
                    }
                }

                if (!$pdfAttachment) {
                    continue; // Skip emails that do not contain a PDF PO
                }

                // Download attachment content
                $data = imap_fetchbody($this->mbox, $msgNumber, $pdfAttachment['part_num']);
                
                // Decode based on encoding type
                if ($pdfAttachment['encoding'] === 3) { // BASE64
                    $data = base64_decode($data);
                } elseif ($pdfAttachment['encoding'] === 4) { // QUOTED-PRINTABLE
                    $data = quoted_printable_decode($data);
                }

                // Clean file name
                $cleanFilename = preg_replace('/[^a-zA-Z0-9_.-]/', '', $pdfAttachment['filename']);
                $fileName = time() . '_' . $cleanFilename;
                
                // Write to public storage
                Storage::disk('public')->put('drawings/' . $fileName, $data);
                $relativeUrl = 'storage/drawings/' . $fileName;
                $absolutePath = storage_path('app/public/drawings/' . $fileName);

                // Run PDF extraction
                $parsedData = $pdfParser->parse($absolutePath);

                $poNumber = $parsedData['po_number'] ?? null;
                $existingPo = null;
                if ($poNumber) {
                    $existingPo = PurchaseOrder::where('po_number', $poNumber)->first();
                }

                if ($existingPo) {
                    // Duplicate PO Detection
                    $hasDifferences = $this->comparePoData($existingPo, $parsedData);

                    if ($hasDifferences) {
                        // Flag as potential revision
                        $revision = \App\Models\PurchaseOrderRevision::create([
                            'purchase_order_id' => $existingPo->id,
                            'po_number' => $poNumber,
                            'po_date' => $parsedData['po_date'] ?? date('Y-m-d'),
                            'customer_name' => $parsedData['customer_name'] ?? $fromName,
                            'customer_email' => $parsedData['customer_email'] ?? $fromEmail,
                            'pdf_path' => $relativeUrl,
                            'email_uid' => $uid,
                            'status' => 'pending',
                            'extracted_data' => $parsedData,
                            'has_differences' => true,
                        ]);

                        $this->sendPoRevisionNotification($revision, $existingPo);
                    } else {
                        // Duplicate PO exists and is identical
                        \App\Models\PurchaseOrderRevision::create([
                            'purchase_order_id' => $existingPo->id,
                            'po_number' => $poNumber,
                            'po_date' => $parsedData['po_date'] ?? date('Y-m-d'),
                            'customer_name' => $parsedData['customer_name'] ?? $fromName,
                            'customer_email' => $parsedData['customer_email'] ?? $fromEmail,
                            'pdf_path' => $relativeUrl,
                            'email_uid' => $uid,
                            'status' => 'ignored', // Auto-ignored/archived because it is a direct duplicate
                            'extracted_data' => $parsedData,
                            'has_differences' => false,
                        ]);

                        $this->sendPoDuplicateNotification($existingPo);
                    }
                } else {
                    // Save new PO Draft
                    $po = PurchaseOrder::create([
                        'po_number' => $poNumber ?? 'DRAFT_PO_' . time(),
                        'po_date' => $parsedData['po_date'] ?? date('Y-m-d'),
                        'customer_name' => $parsedData['customer_name'] ?? $fromName,
                        'customer_address' => $parsedData['customer_address'] ?? null,
                        'customer_gstin' => $parsedData['customer_gstin'] ?? null,
                        'customer_email' => $parsedData['customer_email'] ?? $fromEmail,
                        'pdf_path' => $relativeUrl,
                        'email_uid' => $uid,
                        'status' => 'draft_review',
                    ]);

                    // Create items
                    if (!empty($parsedData['items'])) {
                        foreach ($parsedData['items'] as $item) {
                            PoItem::create([
                                'purchase_order_id' => $po->id,
                                'item_code' => $item['item_code'] ?? null,
                                'description' => $item['description'],
                                'delivery_date' => $item['delivery_date'] ?? null,
                                'hsn_sac' => $item['hsn_sac'] ?? null,
                                'uqc' => $item['uqc'] ?? 'PC',
                                'quantity' => $item['quantity'],
                                'unit' => $item['unit'],
                                'rate' => $item['rate'],
                                'cgst' => $item['cgst'] ?? 0,
                                'sgst' => $item['sgst'] ?? 0,
                                'igst' => $item['igst'] ?? 0,
                                'total_amount' => $item['total_amount'],
                            ]);
                        }
                    } else {
                        // Default generic review line item
                        PoItem::create([
                            'purchase_order_id' => $po->id,
                            'description' => 'Text details extracted from PDF: review drawing for items configuration.',
                            'quantity' => 1.00,
                            'unit' => 'Pcs',
                            'rate' => 0.00,
                            'total_amount' => 0.00,
                        ]);
                    }

                    // Send notifications to supervisors/managers for new PO
                    $this->sendNewPoNotification($po);
                }

                // CATEGORY SHIFT: Move processed email to archive folder on mail server
                $processedFolder = Setting::getVal('imap_processed_folder');
                if ($processedFolder) {
                    @imap_mail_move($this->mbox, "$msgNumber", $processedFolder);
                    @imap_expunge($this->mbox);
                } else {
                    // Mark as read if no folder is configured
                    @imap_setflag_full($this->mbox, "$msgNumber", "\\Seen");
                }

                $processedEmails++;
            } catch (Exception $e) {
                $failedEmails++;
                logger()->error("Failed to process email message $msgNumber: " . $e->getMessage());
            }
        }

        return [
            'processed' => $processedEmails,
            'failed' => $failedEmails,
            'message' => "Email check completed. Imported $processedEmails draft POs ($failedEmails failed)."
        ];
    }

    /**
     * Recursively extract parts to find attachments.
     */
    protected function getAttachments($msgNumber, $structure, $partNumber, &$attachments)
    {
        if (isset($structure->parts)) {
            foreach ($structure->parts as $index => $subPart) {
                $prefix = $partNumber ? $partNumber . '.' : '';
                $this->getAttachments($msgNumber, $subPart, $prefix . ($index + 1), $attachments);
            }
        } else {
            $filename = '';
            $isAttachment = false;

            if ($structure->ifdparameters) {
                foreach ($structure->dparameters as $object) {
                    if (strtolower($object->attribute) === 'filename') {
                        $filename = $object->value;
                        $isAttachment = true;
                    }
                }
            }

            if ($structure->ifparameters && !$isAttachment) {
                foreach ($structure->parameters as $object) {
                    if (strtolower($object->attribute) === 'name') {
                        $filename = $object->value;
                        $isAttachment = true;
                    }
                }
            }

            if ($isAttachment && $filename) {
                $attachments[] = [
                    'part_num' => $partNumber ?: '1',
                    'filename' => $filename,
                    'encoding' => $structure->encoding
                ];
            }
        }
    }

    /**
     * Create system notifications and send Expo Push notifications to all paired manager/admin devices.
     */
    protected function sendNewPoNotification($po)
    {
        PushNotificationService::sendToRoles(
            ['admin', 'manager', 'partner'],
            'New Purchase Order Received',
            "PO-{$po->po_number} from {$po->customer_name}",
            'purchase_order',
            ['po_id' => $po->id]
        );
    }

    /**
     * Compare existing PO and items with parsed email data to check for revisions.
     */
    protected function comparePoData($existingPo, $parsedData)
    {
        $existingDate = $existingPo->po_date ? date('Y-m-d', strtotime($existingPo->po_date)) : null;
        $parsedDate = isset($parsedData['po_date']) ? date('Y-m-d', strtotime($parsedData['po_date'])) : null;
        if ($existingDate !== $parsedDate) {
            return true;
        }

        if (trim($existingPo->customer_name) !== trim($parsedData['customer_name'] ?? '')) {
            return true;
        }

        if (($existingPo->customer_gstin ?? '') !== ($parsedData['customer_gstin'] ?? '')) {
            return true;
        }

        $existingItems = $existingPo->items;
        $parsedItems = $parsedData['items'] ?? [];

        if (count($existingItems) !== count($parsedItems)) {
            return true;
        }

        foreach ($parsedItems as $idx => $pItem) {
            $eItem = $existingItems[$idx];

            if (($eItem->item_code ?? '') !== ($pItem['item_code'] ?? '')) {
                return true;
            }

            if (trim($eItem->description) !== trim($pItem['description'] ?? '')) {
                return true;
            }

            if (floatval($eItem->quantity) !== floatval($pItem['quantity'] ?? 0)) {
                return true;
            }

            if (floatval($eItem->rate) !== floatval($pItem['rate'] ?? 0)) {
                return true;
            }
        }

        return false;
    }

    protected function sendPoRevisionNotification($revision, $existingPo)
    {
        PushNotificationService::sendToRoles(
            ['admin', 'manager', 'partner'],
            'PO Revision Detected',
            "PO-{$existingPo->po_number} was received again with changes. Review required.",
            'po_revision',
            ['revision_id' => $revision->id, 'po_id' => $existingPo->id]
        );
    }

    /**
     * Send duplicate PO received notification.
     */
    protected function sendPoDuplicateNotification($existingPo)
    {
        PushNotificationService::sendToRoles(
            ['admin', 'manager', 'partner'],
            'Duplicate PO Received',
            "PO-{$existingPo->po_number} already exists in the system.",
            'po_duplicate',
            ['po_id' => $existingPo->id]
        );
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}
