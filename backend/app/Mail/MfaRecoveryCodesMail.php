<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class MfaRecoveryCodesMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $plainCodes;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, array $plainCodes)
    {
        $this->user = $user;
        $this->plainCodes = $plainCodes;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your MFA Recovery Codes - TechFocal WMS',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.mfa-recovery-codes',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        // Join the recovery codes into a plain text file format
        $fileContent = "TECHFOCAL WMS - MFA RECOVERY CODES\n";
        $fileContent .= "Generated on: " . now()->toDateTimeString() . "\n";
        $fileContent .= "User: " . $this->user->email . "\n";
        $fileContent .= str_repeat("-", 40) . "\n\n";
        
        foreach ($this->plainCodes as $index => $code) {
            $fileContent .= ($index + 1) . ". " . $code . "\n";
        }
        
        $fileContent .= "\n" . str_repeat("-", 40) . "\n";
        $fileContent .= "Keep this file safe. Do not share these codes with anyone.\n";
        $fileContent .= "Each code can only be used once.";

        return [
            Attachment::fromData(fn () => $fileContent, 'techfocal-mfa-recovery-codes.txt')
                ->withMime('text/plain'),
        ];
    }
}
