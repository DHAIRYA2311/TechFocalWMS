<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @page { 
            margin: 30px 30px 70px 30px; 
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10px;
            color: #0f172a;
            margin: 0;
            padding: 0;
        }
        .main-table {
            width: 100%;
            border-collapse: collapse;
        }

        .watermark {
            position: fixed;
            top: 40%;
            left: 20%;
            transform: rotate(-45deg);
            opacity: 0.15;
            font-size: 32px;
            font-weight: bold;
            color: #475569;
            z-index: -100;
            white-space: nowrap;
        }
        
        .qr-container {
            float: right;
            text-align: center;
        }
        
        .qr-container p {
            margin: 2px 0 0 0;
            font-size: 8px;
            color: #64748b;
        }
        
        .header-container {
            width: 100%;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header-left { float: left; width: 60%; }
        .header-right { float: right; width: 40%; text-align: right; }
        
        .address-container {
            width: 100%;
            margin-bottom: 20px;
        }
        .address-panel {
            float: left;
            width: 48%;
            border: 1px solid #cbd5e1;
            padding: 12px;
            border-radius: 6px;
            box-sizing: border-box;
        }
        .address-panel-right {
            float: right;
            width: 48%;
            border: 1px solid #cbd5e1;
            padding: 12px;
            border-radius: 6px;
            box-sizing: border-box;
        }
        
        .col-header th {
            background-color: #f8fafc;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
            padding: 10px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            color: #334155;
        }
        
        .item-row td {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 6px;
            vertical-align: top;
        }
        
        .summary-wrapper {
            margin-top: 20px;
            margin-bottom: 20px;
            clear: both;
        }

        .summary-table {
            width: 45%;
            float: right;
            border-collapse: collapse;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
        }
        .summary-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        .grand-total {
            border-top: 2px solid #94a3b8 !important;
            font-weight: bold;
            font-size: 13px;
        }
        
        .words-box {
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            margin-top: 20px;
            margin-bottom: 20px;
            clear: both;
            width: 60%;
        }
        
        .bank-details-box {
            border: 1px solid #cbd5e1;
            padding: 12px;
            border-radius: 6px;
            float: left;
            width: 48%;
            box-sizing: border-box;
        }
        
        .signature-box {
            float: right;
            width: 40%;
            text-align: right;
            padding-top: 20px;
        }
        
        .footer-container {
            clear: both;
            margin-top: 40px;
        }
        
        .clear { clear: both; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }

        .section-title {
            font-size: 12px;
            color: #1e3a8a;
            border-bottom: 1px solid #e2e8f0;
            display: block;
            padding-bottom: 4px;
            margin-bottom: 8px;
            font-weight: bold;
        }

        #page-footer {
            position: fixed;
            bottom: -50px;
            left: 0;
            right: 0;
            height: 30px;
            font-size: 9px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        /* Pagination now handled via PHP script below */
    </style>
</head>
<body>

    <div id="page-footer">
        <div style="float: left; width: 33%;">&nbsp;</div>
        <div style="float: left; width: 33%; text-align: center;">
            TechFocal Enterprises LLP
        </div>
        <div style="float: right; width: 33%; text-align: right;">
            Generated: {{ date('d/m/Y H:i A') }}
        </div>
        <div class="clear"></div>
    </div>

    @php
        $poNumbers = [];
        if($invoice->purchaseOrders && $invoice->purchaseOrders->count() > 0) {
            foreach($invoice->purchaseOrders as $po) {
                $poNumbers[] = $po->po_number;
            }
        } elseif($invoice->purchaseOrder) {
            $poNumbers[] = $invoice->purchaseOrder->po_number;
        }
        $poString = implode(', ', array_unique($poNumbers));
        
        $showQrCode = $config['showQrCode'] ?? true;
        $showCompanyTagline = $config['showCompanyTagline'] ?? true;
        $showBankDetails = $config['showBankDetails'] ?? true;
        $showAmountInWords = $config['showAmountInWords'] ?? true;
        $showJobReferences = $config['showJobReferences'] ?? true;
        $showHsnSac = $config['showHsnSac'] ?? true;
        $showPartNumbers = $config['showPartNumbers'] ?? true;
        $showSerialNumbers = $config['showSerialNumbers'] ?? false;
    @endphp

    @if(isset($config['enableWatermark']) && $config['enableWatermark'])
        <div class="watermark">
            @if(!empty($config['watermarkText']))
                {{ $config['watermarkText'] }}
            @else
                CONFIDENTIAL - GENERATED FOR {{ strtoupper($invoice->customer_name ?? 'CLIENT') }}<br>
                <span style="font-size: 16px;">Downloaded by {{ $config['downloadedBy'] ?? 'Admin' }} on {{ date('d-M-Y') }}</span>
            @endif
        </div>
    @endif

    <table class="main-table">
        <thead>
            <tr>
                <td colspan="{{ $showHsnSac ? 8 : 7 }}">
                    <!-- Top Header -->
                    <div class="header-container">
                        <div class="header-left">
                            @if(!empty($logo))
                                <img src="{{ $logo }}" style="max-height: 70px; max-width: 250px; margin-bottom: 8px; object-fit: contain;" alt="Logo" />
                            @else
                                <h1 style="font-size: 20px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0;">TECHFOCAL ENTERPRISES LLP</h1>
                                @if($showCompanyTagline)
                                    <p style="font-size: 11px; color: #64748b; margin: 0 0 10px 0; font-style: italic;">"Where Technology is First"</p>
                                @endif
                            @endif
                            <p style="color: #475569; margin: 0; line-height: 1.4;">
                                Plot 12, Industrial Area Phase-1, GIDC,<br>
                                Ahmedabad, Gujarat, India - 380001<br>
                                <strong>GSTIN: 24AAHFT8902M1Z8</strong>
                            </p>
                        </div>
                        <div class="header-right">
                            <h2 style="font-size: 16px; color: #1e3a8a; margin: 0 0 6px 0; font-weight: bold;">GST / TAX INVOICE</h2>
                            @if(isset($config['qrCodeSvg']))
                                <div class="qr-container">
                                    <img src="data:image/svg+xml;base64,{{ base64_encode($config['qrCodeSvg']) }}" width="80" height="80" />
                                    <p>Scan to Verify</p>
                                </div>
                            @endif
                        </div>
                        <div class="clear"></div>
                    </div>

                    <!-- Addresses -->
                    <table width="100%" style="margin-bottom: 20px; table-layout: fixed;">
                        <tr>
                            <td width="48%" valign="top" style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; box-sizing: border-box;">
                                <span class="section-title">Invoice Details</span>
                                <table width="100%">
                                    <tr>
                                        <td width="35%" style="padding: 3px 0; color: #475569;">Invoice No:</td>
                                        <td style="padding: 3px 0;"><strong>{{ $invoice->invoice_number }}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">Invoice Date:</td>
                                        <td style="padding: 3px 0;"><strong>{{ date('d/m/Y', strtotime($invoice->invoice_date)) }}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">State Code:</td>
                                        <td style="padding: 3px 0;"><strong>24 (Gujarat)</strong></td>
                                    </tr>
                                    @if(isset($invoice->payment_status))
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">Payment Status:</td>
                                        <td style="padding: 3px 0;"><strong>{{ ucfirst($invoice->payment_status) }}</strong></td>
                                    </tr>
                                    @endif
                                </table>
                            </td>
                            <td width="4%"></td>
                            <td width="48%" valign="top" style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; box-sizing: border-box;">
                                <span class="section-title">Purchase Details</span>
                                <table width="100%">
                                    <tr>
                                        <td width="35%" style="padding: 3px 0; color: #475569;">PO Ref:</td>
                                        <td style="padding: 3px 0;"><strong>{{ $poString }}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">PO Date:</td>
                                        <td style="padding: 3px 0;"><strong>{{ $invoice->purchaseOrder && $invoice->purchaseOrder->po_date ? date('d/m/Y', strtotime($invoice->purchaseOrder->po_date)) : 'N/A' }}</strong></td>
                                    </tr>
                                    @if($invoice->deliveryChallan)
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">Challan No:</td>
                                        <td style="padding: 3px 0;"><strong>{{ $invoice->deliveryChallan->challan_number }}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">Challan Date:</td>
                                        <td style="padding: 3px 0;"><strong>{{ date('d/m/Y', strtotime($invoice->deliveryChallan->challan_date)) }}</strong></td>
                                    </tr>
                                    @endif
                                    @if($invoice->eway_bill_no)
                                    <tr>
                                        <td style="padding: 3px 0; color: #475569;">E-Way Bill:</td>
                                        <td style="padding: 3px 0;"><strong>{{ $invoice->eway_bill_no }}</strong></td>
                                    </tr>
                                    @endif
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <table width="100%" style="margin-bottom: 20px; table-layout: fixed;">
                        <tr>
                            <td valign="top" style="border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; box-sizing: border-box;">
                                <span class="section-title">Billed To (Buyer)</span>
                                <span style="font-size: 14px; font-weight: bold; color: #0f172a; display: block; margin-top: 4px;">{{ $invoice->purchaseOrder ? $invoice->purchaseOrder->customer_name : '' }}</span>
                                <div style="margin-top: 6px; color: #334155; line-height: 1.4;">{{ $invoice->purchaseOrder ? $invoice->purchaseOrder->customer_address : '' }}</div>
                                <div style="margin-top: 8px;">
                                    <strong style="color: #475569;">GSTIN:</strong> {{ $invoice->purchaseOrder ? ($invoice->purchaseOrder->customer_gstin ?: 'N/A') : 'N/A' }} &nbsp;&nbsp;|&nbsp;&nbsp; 
                                    <strong style="color: #475569;">State:</strong> {{ $invoice->purchaseOrder ? ($invoice->purchaseOrder->customer_state ?: 'Gujarat') : 'Gujarat' }}
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <!-- Table Columns (Repeats on every page) -->
            <tr class="col-header">
                <th width="5%">Sr.</th>
                <th width="{{ $showHsnSac ? '50%' : '58%' }}">Description</th>
                @if($showHsnSac)
                    <th width="8%" class="text-center">SAC Code</th>
                @endif
                <th width="7%" class="text-center">Qty</th>
                <th width="10%" class="text-right">Rate (<span style="font-family: DejaVu Sans, sans-serif;">&#8377;</span>)</th>
                <th width="8%" class="text-center">Tax %</th>
                <th width="12%" class="text-right">Amount (<span style="font-family: DejaVu Sans, sans-serif;">&#8377;</span>)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $idx => $item)
            @php
                $taxRate = floatval($item->cgst_rate) + floatval($item->sgst_rate) + floatval($item->igst_rate);
                $desc = $item->poItem ? $item->poItem->description : '';
                $partNumber = $item->poItem && isset($item->poItem->part_number) ? $item->poItem->part_number : '';
            @endphp
            <tr class="item-row">
                <td class="text-center">{{ $idx + 1 }}</td>
                <td>
                    <strong>{!! nl2br(e($desc)) !!}</strong>
                    @if($showPartNumbers && $partNumber)
                        <br><span style="color: #64748b; font-size: 9px;">PN: {{ $partNumber }}</span>
                    @endif
                    @if($showJobReferences && $item->jobCard)
                        <br><span style="color: #64748b; font-size: 9px;">Job: {{ $item->jobCard->job_card_number }}</span>
                    @endif
                </td>
                @if($showHsnSac)
                    <td class="text-center">{{ $item->poItem ? $item->poItem->hsn_sac : '-' }}</td>
                @endif
                <td class="text-center">{{ number_format($item->quantity, 0) }}</td>
                <td class="text-right">{{ number_format($item->rate, 2) }}</td>
                <td class="text-center">{{ number_format($taxRate, 1) }}%</td>
                <td class="text-right"><strong>{{ number_format($item->total_amount, 2) }}</strong></td>
            </tr>
            @endforeach

            <!-- Final Row for Footer/Totals (Does not repeat) -->
            <tr>
                <td colspan="{{ $showHsnSac ? 8 : 7 }}" style="border-bottom: none; padding: 0;">
                    
                    <div class="summary-wrapper">
                        <!-- Totals Section -->
                        <table class="summary-table">
                            <tr>
                                <td>Taxable Value</td>
                                <td class="text-right"><strong>{{ number_format($invoice->subtotal, 2) }}</strong></td>
                            </tr>
                            @if($invoice->cgst_total > 0)
                            <tr>
                                <td>CGST</td>
                                <td class="text-right"><strong>{{ number_format($invoice->cgst_total, 2) }}</strong></td>
                            </tr>
                            @endif
                            @if($invoice->sgst_total > 0)
                            <tr>
                                <td>SGST</td>
                                <td class="text-right"><strong>{{ number_format($invoice->sgst_total, 2) }}</strong></td>
                            </tr>
                            @endif
                            @if($invoice->igst_total > 0)
                            <tr>
                                <td>IGST</td>
                                <td class="text-right"><strong>{{ number_format($invoice->igst_total, 2) }}</strong></td>
                            </tr>
                            @endif
                            <tr>
                                <td class="grand-total">Grand Total (<span style="font-family: DejaVu Sans, sans-serif;">&#8377;</span>)</td>
                                <td class="text-right grand-total">{{ number_format($invoice->grand_total, 2) }}</td>
                            </tr>
                        </table>
                        <div class="clear"></div>
                    </div>

                    @if($showAmountInWords)
                    <div class="words-box">
                        <span style="color: #64748b; font-size: 10px; display: block; margin-bottom: 4px;">Amount in Words</span>
                        <strong style="font-size: 12px; color: #0f172a;">{{ $amountInWords }}</strong>
                    </div>
                    @endif

                    <!-- Footer -->
                    <div class="footer-container">
                        @if($showBankDetails)
                        <div class="bank-details-box">
                            <span class="section-title" style="margin-bottom: 6px;">Bank Details</span>
                            <table width="100%">
                                <tr>
                                    <td width="30%" style="padding: 2px 0; color: #475569;">Bank Name:</td>
                                    <td style="padding: 2px 0;"><strong>BANK OF BARODA</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; color: #475569;">A/C No:</td>
                                    <td style="padding: 2px 0;"><strong>78030500000313</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; color: #475569;">IFSC Code:</td>
                                    <td style="padding: 2px 0;"><strong>BARB0ALKAPU</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0; color: #475569;">Bank Branch:</td>
                                    <td style="padding: 2px 0;"><strong>RC DUTT ROAD, VADODARA</strong></td>
                                </tr>
                            </table>
                        </div>
                        @endif
                        
                        <div class="signature-box" style="{{ !$showBankDetails ? 'width: 100%;' : '' }}">
                            <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 60px;">For TECHFOCAL ENTERPRISES LLP</strong>
                            <span style="font-size: 11px; color: #64748b; border-top: 1px solid #94a3b8; padding-top: 8px; display: inline-block; width: 220px; text-align: center;">
                                Authorised Signatory
                            </span>
                        </div>
                        <div class="clear"></div>
                    </div>

                </td>
            </tr>
        </tbody>
    </table>
    <script type="text/php">
        if (isset($pdf)) {
            $x = 30;
            $y = $pdf->get_height() - 40;
            $text = "Page {PAGE_NUM} of {PAGE_COUNT}";
            $font = $fontMetrics->get_font("Helvetica", "normal");
            $size = 6.75;
            $color = array(100/255, 116/255, 139/255);
            $pdf->page_text($x, $y, $text, $font, $size, $color);
        }
    </script>
</body>
</html>
