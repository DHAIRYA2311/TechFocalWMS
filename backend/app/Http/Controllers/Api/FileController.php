<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Services\SecurityLogger;

class FileController extends Controller
{
    /**
     * Generate a temporary signed URL for a private file.
     */
    public function generateSignedUrl(Request $request)
    {
        $request->validate(['path' => 'required|string']);
        $path = $request->input('path');
        $user = $request->user();

        // Validate the path to prevent directory traversal
        if (strpos($path, 'private/') !== 0 || strpos($path, '../') !== false || strpos($path, '..\\') !== false) {
            SecurityLogger::log('unauthorized_file_access', 'System', $user->id, null, null, "Attempted directory traversal or access to restricted folder: {$path}");
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        // Check permissions
        if (str_starts_with($path, 'private/drawings/')) {
            if (!$user->hasPermission('jobs')) {
                SecurityLogger::log('unauthorized_file_access', 'Jobs', $user->id, null, null, "Attempted to generate signed URL for job drawing without permission.");
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
        }

        // Generate signed URL valid for 15 minutes
        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'files.download', now()->addMinutes(15), ['path' => $path, 'user_id' => $user->id]
        );

        return response()->json(['url' => $url]);
    }

    /**
     * Download or view a private file securely.
     */
    public function download(Request $request)
    {
        // The 'signed' middleware handles signature validation automatically.
        $path = $request->query('path');
        $userId = $request->query('user_id', 0); // User who requested the link

        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        // Log access to sensitive files
        SecurityLogger::log('file_download', 'System', $userId, null, null, "Downloaded private file via signed URL: {$path}");

        return Storage::disk('local')->response($path);
    }
}
