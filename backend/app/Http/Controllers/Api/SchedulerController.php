<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Console\Scheduling\Schedule;
use App\Models\Setting;

class SchedulerController extends Controller
{
    public function index()
    {
        // Load the console routes to populate the Schedule facade
        require base_path('routes/console.php');
        
        $schedule = app(Schedule::class);
        $events = $schedule->events();
        
        $schedulers = [];
        foreach ($events as $event) {
            // Extract the clean artisan command name
            $cleanCommand = null;
            if ($event->command) {
                // E.g., "'/usr/bin/php' 'artisan' command:name"
                $parts = explode('artisan', $event->command);
                if (count($parts) > 1) {
                    $cleanCommand = trim(str_replace(['"', "'"], '', $parts[1]));
                } else {
                    $cleanCommand = $event->command;
                }
            }

            // Identify closure tasks by description if command is null
            $identifier = $cleanCommand ?: 'closure_' . md5($event->description . $event->expression);
            
            // Check active status in DB (default is '1' if not set)
            $isActive = Setting::getVal('scheduler_' . $identifier, '1') === '1';

            $schedulers[] = [
                'id' => $identifier,
                'command' => $cleanCommand,
                'is_closure' => is_null($cleanCommand),
                'expression' => $event->expression,
                'description' => $event->description,
                'is_active' => $isActive,
                'next_run' => $event->nextRunDate()->format('Y-m-d H:i:s')
            ];
        }

        return response()->json($schedulers);
    }

    public function toggle(Request $request, $id)
    {
        $validated = $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $val = $validated['is_active'] ? '1' : '0';
        
        $setting = Setting::firstOrNew(['key' => 'scheduler_' . $id]);
        $setting->value = $val;
        $setting->save();

        return response()->json(['message' => 'Scheduler status updated successfully.']);
    }

    public function run(Request $request, $id)
    {
        // We cannot run closures easily through Artisan call.
        if (str_starts_with($id, 'closure_')) {
            return response()->json(['message' => 'Inline closure tasks cannot be manually executed via the web UI.'], 400);
        }

        try {
            Artisan::call($id);
            $output = Artisan::output();
            return response()->json([
                'message' => 'Command executed successfully.',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Command execution failed.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
