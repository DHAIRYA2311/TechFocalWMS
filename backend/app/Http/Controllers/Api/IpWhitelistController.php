<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\IpWhitelist;
use App\Models\Setting;
use App\Services\SecurityLogger;

class IpWhitelistController extends Controller
{
    /**
     * Get all whitelisted IPs.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $ips = IpWhitelist::orderBy('created_at', 'desc')->get();
        $enabled = Setting::where('key', 'ip_whitelisting_enabled')->value('value') === 'true';

        return response()->json([
            'ips' => $ips,
            'is_enabled' => $enabled
        ]);
    }

    /**
     * Add a new IP to the whitelist.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'ip_address' => 'required|ip|unique:ip_whitelists,ip_address',
            'label' => 'nullable|string|max:255',
            'is_active' => 'boolean'
        ]);

        $ip = IpWhitelist::create([
            'ip_address' => $validated['ip_address'],
            'label' => $validated['label'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        SecurityLogger::log('ip_whitelist_added', 'Settings', $request->user()->id, null, $ip->toArray(), "Added IP {$ip->ip_address} to whitelist", $request->user());

        return response()->json([
            'message' => 'IP address added to whitelist.',
            'ip' => $ip
        ]);
    }

    /**
     * Update an existing IP whitelist entry.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $ip = IpWhitelist::findOrFail($id);
        $oldData = $ip->toArray();

        $validated = $request->validate([
            'label' => 'nullable|string|max:255',
            'is_active' => 'boolean'
        ]);

        $ip->update([
            'label' => $request->has('label') ? $validated['label'] : $ip->label,
            'is_active' => $request->has('is_active') ? $validated['is_active'] : $ip->is_active,
        ]);

        SecurityLogger::log('ip_whitelist_updated', 'Settings', $request->user()->id, $oldData, $ip->toArray(), "Updated IP whitelist entry for {$ip->ip_address}", $request->user());

        return response()->json([
            'message' => 'IP address updated.',
            'ip' => $ip
        ]);
    }

    /**
     * Remove an IP from the whitelist.
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $ip = IpWhitelist::findOrFail($id);
        $ipAddress = $ip->ip_address;
        $ip->delete();

        SecurityLogger::log('ip_whitelist_deleted', 'Settings', $request->user()->id, null, null, "Removed IP {$ipAddress} from whitelist", $request->user());

        return response()->json([
            'message' => 'IP address removed from whitelist.'
        ]);
    }

    /**
     * Toggle the global IP whitelisting setting.
     */
    public function toggleGlobal(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'is_enabled' => 'required|boolean'
        ]);

        $setting = Setting::firstOrCreate(['key' => 'ip_whitelisting_enabled']);
        $setting->value = $validated['is_enabled'] ? 'true' : 'false';
        $setting->save();

        $statusStr = $validated['is_enabled'] ? 'Enabled' : 'Disabled';
        SecurityLogger::log('ip_whitelisting_toggled', 'Settings', $request->user()->id, null, null, "{$statusStr} global IP whitelisting", $request->user());

        return response()->json([
            'message' => "IP whitelisting has been {$statusStr}.",
            'is_enabled' => $validated['is_enabled']
        ]);
    }
}
