<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\Setting;
use App\Models\Holiday;

class HolidayService
{
    /**
     * Check if the given date (and optionally shift) is a holiday.
     * 
     * @param string $date (Y-m-d)
     * @param string|null $shift ('day' or 'night')
     * @return array { is_holiday: bool, reason: string|null, type: string|null }
     */
    public static function isHoliday($date, $shift = null)
    {
        $carbonDate = Carbon::parse($date);
        
        // 1. Check for specific Holiday overrides first (takes precedence)
        $query = Holiday::where('date', $date)
            ->where('is_active', true)
            ->where(function ($q) use ($shift) {
                $q->where('applies_to', 'all');
                if ($shift) {
                    $q->orWhere(function ($subq) use ($shift) {
                        $subq->where('applies_to', 'shift')
                             ->where('target_shift', $shift);
                    });
                }
            });
            
        $holiday = $query->first();

        if ($holiday) {
            return [
                'is_holiday' => true,
                'reason' => $holiday->name,
                'type' => 'holiday'
            ];
        }

        // 2. Check for Weekly Off
        $weeklyOffSetting = Setting::where('key', 'att_weekly_off')->first();
        $weeklyOffDay = $weeklyOffSetting ? $weeklyOffSetting->value : 'Sunday'; // Default to Sunday
        
        if ($weeklyOffDay && strtolower($carbonDate->englishDayOfWeek) === strtolower($weeklyOffDay)) {
            return [
                'is_holiday' => true,
                'reason' => 'Weekly Off',
                'type' => 'weekly_off'
            ];
        }

        return [
            'is_holiday' => false,
            'reason' => null,
            'type' => null
        ];
    }
}
