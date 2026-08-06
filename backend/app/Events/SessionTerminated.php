<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SessionTerminated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $tokenId;
    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct($userId, $tokenId, $message = 'Your session has been terminated by an Admin.')
    {
        $this->userId = $userId;
        $this->tokenId = $tokenId;
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.' . $this->userId),
        ];
    }
    
    public function broadcastWith(): array
    {
        return [
            'token_id' => $this->tokenId,
            'message' => $this->message,
        ];
    }
}
