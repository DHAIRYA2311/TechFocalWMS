<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Webklex\IMAP\Facades\Client;
use Webklex\PHPIMAP\ClientManager;
use Exception;

class ImapService
{
    protected $client = null;
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

        try {
            $cm = new ClientManager();
            $this->client = $cm->make([
                'host'          => $host,
                'port'          => $port,
                'encryption'    => $encryption === 'none' ? false : $encryption,
                'validate_cert' => false,
                'username'      => $username,
                'password'      => $password,
                'protocol'      => 'imap',
                'options'       => [
                    'TIMEOUT' => 5,
                ]
            ]);

            $this->client->connect();
            return true;
        } catch (Exception $e) {
            $this->error = $e->getMessage();
            return false;
        }
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
        if ($this->client) {
            try {
                $this->client->disconnect();
            } catch (Exception $e) {
                // Ignore disconnect errors
            }
            $this->client = null;
        }
    }

    /**
     * Connect to mail, download sample PO, extract fields, and transition email folder.
     */
    public function fetchPurchaseOrders()
    {
        if (!$this->client && !$this->connect()) {
            PushNotificationService::sendToRoles(
                ['admin', 'manager'],
                'Email Sync Failed ⚠️',
                "Could not connect to IMAP server: " . $this->error,
                'workshop_alert_email_sync'
            );
            throw new Exception("Could not connect to IMAP server: " . $this->error);
        }

        // Record fetch timestamp in local/system timezone
        Setting::setVal('po_last_fetch_at', now()->toDateTimeString());

        $processedEmails = 0;
        $failedEmails = 0;

        $folderName = Setting::getVal('imap_source_folder', 'INBOX');

        try {
            $folder = $this->client->getFolder($folderName);
            
            // Search for recent emails (last 3 days) matching the subject filter directly
            $subjectFilter = Setting::getVal('imap_subject_filter');
            
            $query = $folder->query()->since(now()->subDays(3));
            if ($subjectFilter) {
                $query->whereSubject($subjectFilter);
            }
            
            // Fetch newest first, limit 15
            $emails = $query->limit(15)->get();

            if ($emails->isEmpty()) {
                return [
                    'processed' => 0,
                    'failed' => 0,
                    'message' => 'No new emails found.'
                ];
            }

            $pdfParser = new PdfParserService();

            // Ensure storage directory exists
            if (!Storage::disk('public')->exists('drawings')) {
                Storage::disk('public')->makeDirectory('drawings');
            }

            foreach ($emails as $message) {
                try {
                    $uid = $message->getUid();

                    // Skip if this message UID has already been imported
                    if (PurchaseOrder::where('email_uid', $uid)->exists()) {
                        continue;
                    }

                    $fromInfo = $message->getFrom()[0] ?? null;
                    $fromEmail = $fromInfo ? $fromInfo->mail : 'unknown@example.com';
                    $fromName = $fromInfo ? ($fromInfo->personal ?: $fromEmail) : 'Unknown';

                    // Fetch attachments
                    $pdfAttachment = null;
                    $attachments = $message->getAttachments();
                    
                    foreach ($attachments as $att) {
                        if (strtolower($att->getExtension()) === 'pdf') {
                            $pdfAttachment = $att;
                            break;
                        }
                    }

                    if (!$pdfAttachment) {
                        continue; // Skip emails that do not contain a PDF PO
                    }

                    // Download attachment content
                    $cleanFilename = preg_replace('/[^a-zA-Z0-9_.-]/', '', $pdfAttachment->getName());
                    $fileName = time() . '_' . $cleanFilename;
                    
                    // Write to public storage
                    Storage::disk('public')->put('drawings/' . $fileName, $pdfAttachment->getContent());
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
                    try {
                        $message->move($processedFolder);
                    } catch (Exception $e) {
                        // Ignore move error
                    }
                } else {
                    // Mark as read if no folder is configured
                    $message->setFlag('Seen');
                }

                $processedEmails++;
            } catch (Exception $e) {
                $failedEmails++;
                logger()->error("Failed to process email message {$message->getUid()}: " . $e->getMessage());
                PushNotificationService::sendToRoles(
                    ['admin', 'manager'],
                    'PO Import Failed ❌',
                    "Failed to process an email. Check logs for details.",
                    'purchase_order_fail'
                );
            }
            }
        } catch (Exception $e) {
            $this->error = $e->getMessage();
            throw new Exception("Could not search IMAP server: " . $this->error);
        }

        return [
            'processed' => $processedEmails,
            'failed' => $failedEmails,
            'message' => "Email check completed. Imported $processedEmails draft POs ($failedEmails failed)."
        ];
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
