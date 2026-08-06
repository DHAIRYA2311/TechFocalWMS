<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use App\Models\PasswordHistory;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Translation\PotentiallyTranslatedString;

class NotUsedPassword implements ValidationRule
{
    protected $user;

    public function __construct($user = null)
    {
        $this->user = $user;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!$this->user) {
            // Cannot check history without user context
            return;
        }

        $histories = PasswordHistory::where('user_id', $this->user->id)
            ->latest()
            ->take(5)
            ->get();

        foreach ($histories as $history) {
            if (Hash::check($value, $history->password_hash)) {
                $fail('You cannot reuse any of your last 5 passwords. Please choose a new password.');
                return;
            }
        }
    }
}
