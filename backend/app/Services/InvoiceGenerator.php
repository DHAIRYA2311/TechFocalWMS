<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\PoItem;
use App\Services\PushNotificationService;
use Exception;

class InvoiceGenerator
{
    /**
     * Generate an invoice from a Delivery Challan automatically.
     *
     * @param DeliveryChallan $dc
     * @return Invoice
     * @throws Exception
     */
    public static function generateFromChallan(DeliveryChallan $dc)
    {
        if ($dc->invoice_id) {
            throw new Exception("Delivery Challan {$dc->challan_number} is already linked to an Invoice.");
        }

        $poIds = $dc->purchaseOrders->pluck('id')->toArray();
        if (empty($poIds) && $dc->purchase_order_id) {
            $poIds = [$dc->purchase_order_id];
        }

        // Generate sequential invoice number (INV-YYYY-XXXX)
        $year = date('Y', strtotime($dc->challan_date));
        $settingPrefix = \App\Models\Setting::getVal('prefix_invoice', 'INV-');
        $prefix = "{$settingPrefix}{$year}-";

        $latest = Invoice::where('invoice_number', 'LIKE', "{$prefix}%")
            ->orderBy('invoice_number', 'desc')
            ->first();

        $nextSequence = 1;
        if ($latest) {
            $parts = explode('-', $latest->invoice_number);
            $lastSeq = (int) end($parts);
            $nextSequence = $lastSeq + 1;
        }

        $invoiceNumber = $prefix . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);

        // Identify items
        $itemsToBill = [];
        $dcItems = DeliveryChallanItem::where('delivery_challan_id', $dc->id)->get();
        foreach ($dcItems as $dcItem) {
            $itemsToBill[] = [
                'po_item_id' => $dcItem->po_item_id,
                'job_card_id' => $dcItem->job_card_id,
                'quantity' => $dcItem->quantity_delivered,
            ];
        }

        if (count($itemsToBill) === 0) {
            throw new Exception("No items found on Delivery Challan to generate an Invoice.");
        }

        // Compute taxable subtotal and taxes
        $subtotal = 0;
        $cgstTotal = 0;
        $sgstTotal = 0;
        $igstTotal = 0;
        $invoiceItemsData = [];

        foreach ($itemsToBill as $billItem) {
            $poItem = PoItem::findOrFail($billItem['po_item_id']);
            
            $qty = $billItem['quantity'];
            $rate = $poItem->rate;
            
            $itemTaxable = $qty * $rate;
            $cgstAmount = $itemTaxable * (($poItem->cgst ?? 0) / 100);
            $sgstAmount = $itemTaxable * (($poItem->sgst ?? 0) / 100);
            $igstAmount = $itemTaxable * (($poItem->igst ?? 0) / 100);
            $itemTotal = $itemTaxable + $cgstAmount + $sgstAmount + $igstAmount;

            $subtotal += $itemTaxable;
            $cgstTotal += $cgstAmount;
            $sgstTotal += $sgstAmount;
            $igstTotal += $igstAmount;

            $invoiceItemsData[] = [
                'po_item_id' => $poItem->id,
                'job_card_id' => $billItem['job_card_id'],
                'quantity' => $qty,
                'rate' => $rate,
                'cgst_rate' => $poItem->cgst ?? 0,
                'sgst_rate' => $poItem->sgst ?? 0,
                'igst_rate' => $poItem->igst ?? 0,
                'cgst_amount' => $cgstAmount,
                'sgst_amount' => $sgstAmount,
                'igst_amount' => $igstAmount,
                'total_amount' => $itemTotal,
            ];
        }

        $grandTotal = $subtotal + $cgstTotal + $sgstTotal + $igstTotal;

        $invoice = Invoice::create([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => $dc->challan_date,
            'purchase_order_id' => $poIds[0] ?? null,
            'delivery_challan_id' => $dc->id,
            'subtotal' => $subtotal,
            'cgst_total' => $cgstTotal,
            'sgst_total' => $sgstTotal,
            'igst_total' => $igstTotal,
            'grand_total' => $grandTotal,
            'remarks' => "Auto-generated from Delivery Challan " . $dc->challan_number,
            'status' => 'unpaid',
        ]);

        if (count($poIds) > 0) {
            $invoice->purchaseOrders()->sync($poIds);
        }

        foreach ($invoiceItemsData as $itemData) {
            $itemData['invoice_id'] = $invoice->id;
            InvoiceItem::create($itemData);
        }

        $dc->update([
            'invoice_id' => $invoice->id
        ]);

        PushNotificationService::sendToRoles(
            ['admin', 'partner'],
            'Invoice Generated 📄',
            "Invoice {$invoice->invoice_number} has been generated.",
            'invoice_generated',
            ['invoice_id' => $invoice->id]
        );

        return $invoice;
    }
}
