<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
try {
    $ip = \App\Models\IpWhitelist::create(['ip_address' => '127.0.0.1', 'label' => 'Test', 'is_active' => true]);
    \App\Services\SecurityLogger::log('ip_whitelist_added', 'Settings', 1, null, $ip->toArray(), 'Added IP', \App\Models\User::find(1));
    echo 'Success';
} catch (\Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
