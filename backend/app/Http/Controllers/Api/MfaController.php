<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use PragmaRX\Google2FA\Google2FA;
use App\Services\SecurityLogger;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class MfaController extends Controller
{
    /**
     * Generate a new MFA secret and QR code for setup
     */
    public function setup(Request $request)
    {
        $user = $request->user();
        $google2fa = new Google2FA();
        
        $secret = $google2fa->generateSecretKey();
        
        // Temporarily store the secret in cache or session, but since it's API, 
        // we'll send it back and verify it before saving it.
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            'TechFocal WMS',
            $user->email,
            $secret
        );
        
        $renderer = new ImageRenderer(
            new RendererStyle(400),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $svg = $writer->writeString($qrCodeUrl);

        return response()->json([
            'secret' => $secret,
            'qr_code_svg' => base64_encode($svg)
        ]);
    }

    /**
     * Verify the code and save the secret to the user
     */
    public function verifySetup(Request $request)
    {
        $request->validate([
            'secret' => 'required|string',
            'code' => 'required|string|size:6'
        ]);

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($request->secret, $request->code);

        if ($valid) {
            $user = $request->user();
            $user->mfa_secret = encrypt($request->secret);
            
            // Generate Recovery Codes
            $plainCodes = [];
            $encryptedCodes = [];
            for ($i = 0; $i < 10; $i++) {
                $code = \Illuminate\Support\Str::random(10);
                $plainCodes[] = $code;
                $encryptedCodes[] = bcrypt($code);
            }
            $user->mfa_recovery_codes = json_encode($encryptedCodes);
            
            $user->save();
            
            SecurityLogger::log('mfa_enabled', 'Security', $user->id, null, null, 'User enabled Multi-Factor Authentication', $user);

            return response()->json([
                'message' => 'MFA has been successfully enabled.',
                'recovery_codes' => $plainCodes
            ]);
        }

        return response()->json(['message' => 'Invalid authentication code.'], 400);
    }

    /**
     * Disable MFA for the authenticated user
     */
    public function disable(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6'
        ]);

        $user = $request->user();
        if (!$user->mfa_secret) {
            return response()->json(['message' => 'MFA is not enabled.'], 400);
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey(decrypt($user->mfa_secret), $request->code);

        if ($valid) {
            $user->mfa_secret = null;
            $user->save();
            
            SecurityLogger::log('mfa_disabled', 'Security', $user->id, null, null, 'User disabled Multi-Factor Authentication', $user);
            
            return response()->json(['message' => 'MFA has been disabled.']);
        }

        return response()->json(['message' => 'Invalid authentication code.'], 400);
    }

    /**
     * Dismiss the MFA setup prompt
     */
    public function dismiss(Request $request)
    {
        $user = $request->user();
        $user->mfa_dismissed = true;
        $user->save();
        
        return response()->json(['message' => 'MFA prompt dismissed.']);
    }

    /**
     * Regenerate new recovery codes
     */
    public function getRecoveryCodes(Request $request)
    {
        $user = $request->user();
        if (!$user->mfa_secret) {
            return response()->json(['message' => 'MFA is not enabled.'], 400);
        }

        $plainCodes = [];
        $encryptedCodes = [];
        for ($i = 0; $i < 10; $i++) {
            $code = \Illuminate\Support\Str::random(10);
            $plainCodes[] = $code;
            $encryptedCodes[] = bcrypt($code);
        }
        $user->mfa_recovery_codes = json_encode($encryptedCodes);
        $user->save();
        
        SecurityLogger::log('mfa_recovery_codes_regenerated', 'Security', $user->id, null, null, 'User generated new recovery codes', $user);

        return response()->json([
            'message' => 'New recovery codes generated successfully. Previous codes are now invalid.',
            'recovery_codes' => $plainCodes
        ]);
    }
}
