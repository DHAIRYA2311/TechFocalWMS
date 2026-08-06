<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
        }
        .header {
            padding: 24px 32px;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-left {
            font-size: 20px;
            font-weight: 700;
            color: #2563eb;
            text-decoration: none;
            display: inline-block;
        }
        .header-right {
            font-size: 14px;
            color: #64748b;
            text-decoration: none;
            float: right;
            margin-top: 4px;
        }
        /* Fallback for email clients that don't support flexbox */
        .header::after {
            content: "";
            clear: both;
            display: table;
        }
        .content {
            padding: 40px 32px;
        }
        h1 {
            margin: 0 0 16px;
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
        }
        p {
            margin: 0 0 24px;
            font-size: 16px;
            line-height: 24px;
            color: #475569;
        }
        .button-container {
            margin: 32px 0;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .security-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 32px;
        }
        .security-card ul {
            margin: 0;
            padding-left: 20px;
            color: #475569;
            font-size: 14px;
            line-height: 22px;
        }
        .security-card li {
            margin-bottom: 8px;
        }
        .security-card li:last-child {
            margin-bottom: 0;
        }
        .fallback {
            font-size: 14px;
            color: #64748b;
            word-break: break-all;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #f1f5f9;
        }
        .fallback a {
            color: #2563eb;
            text-decoration: underline;
        }
        .footer {
            background-color: #f8fafc;
            padding: 32px;
            text-align: center;
            border-top: 1px solid #f1f5f9;
        }
        .footer-logo {
            font-size: 18px;
            font-weight: 700;
            color: #94a3b8;
            margin-bottom: 12px;
        }
        .footer p {
            margin: 0 0 8px;
            font-size: 13px;
            color: #94a3b8;
        }
        .footer a {
            color: #94a3b8;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .disclaimer {
            margin-top: 16px !important;
            font-size: 12px !important;
            color: #cbd5e1 !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <a href="https://techfocal.co.in" class="header-left">TechFocal WMS</a>
            <a href="https://techfocal.co.in" class="header-right">techfocal.co.in</a>
        </div>

        <!-- Content -->
        <div class="content">
            <h1>Reset Your Password</h1>
            
            <p>We received a request to reset the password for your TechFocal account associated with this email address. Click the button below to create a new, secure password.</p>
            
            <div class="button-container">
                <a href="{{ $resetUrl }}" class="button">Reset Password</a>
            </div>

            <!-- Security Notice -->
            <div class="security-card">
                <ul>
                    <li>This link is valid for <strong>60 minutes</strong>.</li>
                    <li>The link can only be used once for your security.</li>
                    <li>If you did not request a password reset, you can safely ignore this email; no action is required.</li>
                </ul>
            </div>

            <!-- Fallback -->
            <div class="fallback">
                <p style="margin-bottom: 8px;">If the button doesn't work, copy and paste the following link into your browser:</p>
                <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-logo">TechFocal</div>
            <p>&copy; {{ date('Y') }} TechFocal. All rights reserved.</p>
            <p>
                <a href="https://techfocal.co.in">techfocal.co.in</a> | 
                <a href="mailto:support@techfocal.co.in">support@techfocal.co.in</a>
            </p>
            <p class="disclaimer">This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
