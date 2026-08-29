<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$user = App\Models\User::where('role', 'manager')->first();
auth()->login($user);
$request = Illuminate\Http\Request::create('/api/attendance', 'GET', ['date' => '2026-08-09', 'shift' => 'day']);
$request->setUserResolver(function () use ($user) { return $user; });
$controller = app()->make(App\Http\Controllers\Api\AttendanceController::class);
$response = $controller->index($request);
file_put_contents('test.json', $response->getContent());
