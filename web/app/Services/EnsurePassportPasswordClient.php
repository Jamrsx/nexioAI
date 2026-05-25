<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Laravel\Passport\ClientRepository;
use RuntimeException;

class EnsurePassportPasswordClient
{
    public function ensure(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        $this->ensurePersonalAccessClient();
    }

    private function ensurePersonalAccessClient(): void
    {
        $provider = config('auth.guards.api.provider', 'users');

        try {
            app(ClientRepository::class)->personalAccessClient($provider);

            return;
        } catch (RuntimeException) {
            app(ClientRepository::class)->createPersonalAccessGrantClient('NexioAI Personal', $provider);

            Log::info('Passport personal access client created for mobile API tokens.');
        }
    }
}
