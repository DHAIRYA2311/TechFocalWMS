<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>MFA Recovery Codes - TechFocal WMS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f172a; margin-bottom: 0;">TechFocal WMS</h2>
        <p style="color: #64748b; margin-top: 5px;">Multi-Factor Authentication Enabled</p>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="margin-top: 0;">Hello <strong>{{ $user->first_name ?? $user->name ?? 'User' }}</strong>,</p>
        
        <p>You have successfully configured Multi-Factor Authentication (MFA) for your TechFocal WMS account. Your account is now more secure.</p>
        
        <p>Attached to this email, you will find a text file containing your <strong>MFA Recovery Codes</strong>.</p>
        
        <h3 style="color: #0f172a; font-size: 16px; margin-top: 24px;">Why are these important?</h3>
        <p style="margin-bottom: 0;">If you ever lose access to your authenticator device, you will need one of these recovery codes to log into your account. Each code can only be used once.</p>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
        <strong style="color: #b45309; display: block; margin-bottom: 8px;">Action Required:</strong>
        <p style="margin: 0; color: #92400e; font-size: 14px;">Please download the attached file (<code>techfocal-mfa-recovery-codes.txt</code>) and store it in a secure location, such as a password manager. <strong>Do not leave it in your email inbox.</strong></p>
    </div>

    <p style="font-size: 13px; color: #64748b;">
        If you did not request or enable MFA, please contact your system administrator immediately.
    </p>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; {{ date('Y') }} TechFocal WMS. All rights reserved.
    </div>
</body>
</html>
