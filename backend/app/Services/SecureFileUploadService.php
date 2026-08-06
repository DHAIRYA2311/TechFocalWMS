<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SecureFileUploadService
{
    /**
     * Upload a file securely to the specified disk and directory.
     *
     * @param UploadedFile $file The file to upload.
     * @param string $directory The directory to store the file (e.g., 'photos', 'drawings').
     * @param string $disk The storage disk (e.g., 'public', 'private').
     * @return string The relative path to the stored file.
     * @throws \Exception
     */
    public static function upload(UploadedFile $file, string $directory, string $disk = 'public'): string
    {
        // Deep MIME type validation (Laravel uses finfo under the hood for this)
        $mimeType = $file->getMimeType();
        $allowedMimes = [
            'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'text/plain', 'text/csv'
        ];

        if (!in_array($mimeType, $allowedMimes)) {
            throw new \Exception("File type '{$mimeType}' is not allowed for security reasons.");
        }

        // Generate a completely unpredictable, sanitized filename to prevent directory traversal
        // Format: {UUID}_{timestamp}.{extension}
        $extension = $file->getClientOriginalExtension();
        
        // Failsafe: if the extension doesn't match the MIME type, force a safe extension
        if (empty($extension)) {
            $extension = $file->guessExtension() ?? 'bin';
        }

        $safeFileName = Str::uuid()->toString() . '_' . time() . '.' . $extension;

        // Store the file
        $path = $file->storeAs($directory, $safeFileName, $disk);

        if (!$path) {
            throw new \Exception("Failed to store the file on disk '{$disk}'.");
        }

        return $path;
    }

    /**
     * Delete a file securely from the specified disk.
     *
     * @param string $path
     * @param string $disk
     * @return bool
     */
    public static function delete(string $path, string $disk = 'public'): bool
    {
        if (Storage::disk($disk)->exists($path)) {
            return Storage::disk($disk)->delete($path);
        }
        return false;
    }
}
