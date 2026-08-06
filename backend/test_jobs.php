<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$ctrl = app(\App\Http\Controllers\Api\InvoiceController::class);
$request = \Illuminate\Http\Request::create('/api/invoices', 'GET');
try {
    $res = $ctrl->index($request);
    echo "OK. Length: " . strlen($res->getContent());
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine();
}
