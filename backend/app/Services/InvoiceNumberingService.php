<?php

namespace App\Services;

use App\Models\InvoiceSequence;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceNumberingService
{
    /**
     * Get the financial year string (e.g., "26-27") for a given date based on configured start month.
     */
    public static function getFinancialYear(Carbon $date): string
    {
        $fyStartMonth = (int) Setting::getVal('invoice_fy_start_month', 4);
        
        $year = $date->year;
        $month = $date->month;

        if ($month < $fyStartMonth) {
            $startYear = $year - 1;
            $endYear = $year;
        } else {
            $startYear = $year;
            $endYear = $year + 1;
        }

        // Format to "26-27"
        $start = substr((string)$startYear, -2);
        $end = substr((string)$endYear, -2);

        return "{$start}-{$end}";
    }

    /**
     * Generate the next invoice number atomically.
     * MUST be called inside a DB transaction to ensure locks are held correctly.
     */
    public static function generateNextInvoiceNumber(Carbon $invoiceDate): string
    {
        $isActive = filter_var(Setting::getVal('invoice_numbering_active', '1'), FILTER_VALIDATE_BOOLEAN);
        
        $prefix = Setting::getVal('invoice_prefix', 'TE');
        $separator = Setting::getVal('invoice_separator', '/');
        $padding = (int) Setting::getVal('invoice_padding', 3);
        $defaultStartingNumber = (int) Setting::getVal('invoice_starting_number', 1);

        $fyFormat = Setting::getVal('invoice_fy_format', 'auto');
        $fyString = self::getFinancialYear($invoiceDate);
        
        if ($fyFormat === 'hidden') {
            $fyString = '';
        } elseif ($fyFormat === 'YYYY') {
            $fyString = $invoiceDate->format('Y');
        }

        // Lock the sequence row for the financial year
        $sequence = InvoiceSequence::where('financial_year', $fyString)->lockForUpdate()->first();

        if (!$sequence) {
            $sequence = InvoiceSequence::create([
                'financial_year' => $fyString,
                'next_number' => $defaultStartingNumber,
            ]);
        }

        $currentNumber = $sequence->next_number;
        
        // Increment for the next invoice
        $sequence->next_number = $currentNumber + 1;
        $sequence->save();

        // Format the final string
        $numberString = $padding > 0 ? str_pad($currentNumber, $padding, '0', STR_PAD_LEFT) : (string) $currentNumber;

        $parts = array_filter([$prefix, $fyString, $numberString], function($value) {
            return !empty($value) || $value === '0';
        });

        return implode($separator, $parts);
    }
}
