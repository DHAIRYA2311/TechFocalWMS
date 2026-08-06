<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/verify/{doc_id}', function ($doc_id) {
    // Parse doc id (e.g. INV-1, DC-5, PO-10)
    $parts = explode('-', $doc_id);
    $type = $parts[0] ?? '';
    $id = $parts[1] ?? 0;

    $doc = null;
    $typeLabel = '';

    if ($type === 'INV') {
        $doc = \App\Models\Invoice::find($id);
        $typeLabel = 'Invoice';
    } elseif ($type === 'DC') {
        $doc = \App\Models\DeliveryChallan::find($id);
        $typeLabel = 'Delivery Challan';
    } elseif ($type === 'PO') {
        $doc = \App\Models\PurchaseOrder::find($id);
        $typeLabel = 'Purchase Order';
    }

    if (!$doc) {
        abort(404, 'Document not found or invalid.');
    }

    return view('verify', compact('doc', 'typeLabel', 'doc_id'));
});
