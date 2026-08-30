<?php

namespace App\Http\Controllers\Api\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\InvoiceSequence;
use App\Services\InvoiceNumberingService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class InvoiceSettingsController extends Controller
{
    /**
     * Get current invoice numbering configuration and sequence.
     */
    public function index()
    {
        $config = [
            'invoice_prefix' => Setting::getVal('invoice_prefix', 'TE'),
            'invoice_separator' => Setting::getVal('invoice_separator', '/'),
            'invoice_fy_start_month' => (int) Setting::getVal('invoice_fy_start_month', 4),
            'invoice_fy_format' => Setting::getVal('invoice_fy_format', 'auto'),
            'invoice_padding' => (int) Setting::getVal('invoice_padding', 3),
            'invoice_starting_number' => (int) Setting::getVal('invoice_starting_number', 1),
            'invoice_numbering_active' => filter_var(Setting::getVal('invoice_numbering_active', '1'), FILTER_VALIDATE_BOOLEAN),
        ];

        // Fetch current financial year string
        $fyString = InvoiceNumberingService::getFinancialYear(Carbon::now());
        
        // Fetch current next_number from the sequence
        $sequence = InvoiceSequence::where('financial_year', $fyString)->first();
        $nextNumber = $sequence ? $sequence->next_number : $config['invoice_starting_number'];

        // Generate a preview
        $previewFormat = $config['invoice_fy_format'] === 'hidden' ? '' : 
                         ($config['invoice_fy_format'] === 'YYYY' ? Carbon::now()->format('Y') : $fyString);
        
        $numberString = $config['invoice_padding'] > 0 
            ? str_pad($nextNumber, $config['invoice_padding'], '0', STR_PAD_LEFT) 
            : (string) $nextNumber;

        $previewParts = array_filter([$config['invoice_prefix'], $previewFormat, $numberString], function($value) {
            return !empty($value) || $value === '0';
        });
        
        $preview = implode($config['invoice_separator'], $previewParts);

        return response()->json([
            'config' => $config,
            'current_fy' => $fyString,
            'next_number' => $nextNumber,
            'preview' => $preview,
        ]);
    }

    /**
     * Update configuration.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'invoice_prefix' => 'nullable|string|max:20',
            'invoice_separator' => 'nullable|string|max:5',
            'invoice_fy_start_month' => 'required|integer|min:1|max:12',
            'invoice_fy_format' => 'required|string|in:auto,hidden,YYYY',
            'invoice_padding' => 'required|integer|min:0|max:10',
            'invoice_starting_number' => 'required|integer|min:1',
            'invoice_numbering_active' => 'required|boolean',
            'override_next_number' => 'nullable|integer|min:1',
        ]);

        // Save settings
        $keys = [
            'invoice_prefix',
            'invoice_separator',
            'invoice_fy_start_month',
            'invoice_fy_format',
            'invoice_padding',
            'invoice_starting_number',
        ];

        foreach ($keys as $key) {
            if (isset($validated[$key])) {
                Setting::setVal($key, (string) $validated[$key]);
            }
        }
        
        Setting::setVal('invoice_numbering_active', $validated['invoice_numbering_active'] ? '1' : '0');

        // Override next sequence number if requested
        if (!empty($validated['override_next_number'])) {
            $fyString = InvoiceNumberingService::getFinancialYear(Carbon::now());
            $sequence = InvoiceSequence::firstOrCreate(
                ['financial_year' => $fyString],
                ['next_number' => $validated['override_next_number']]
            );
            
            if (!$sequence->wasRecentlyCreated && $sequence->next_number !== $validated['override_next_number']) {
                $sequence->next_number = $validated['override_next_number'];
                $sequence->save();
            }
        }

        activity('settings')
            ->causedBy(auth()->user())
            ->log('Updated invoice numbering configuration');

        return response()->json(['message' => 'Invoice numbering settings updated successfully']);
    }
}
