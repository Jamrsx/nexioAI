<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;

class PassportTokenService
{
    /**
     * @return array<string, mixed>
     */
    public function issuePasswordGrantToken(string $email, string $password): array
    {
        $request = Request::create('/oauth/token', 'POST', [
            'grant_type' => 'password',
            'client_id' => config('services.passport.password_client_id'),
            'client_secret' => config('services.passport.password_client_secret'),
            'username' => $email,
            'password' => $password,
            'scope' => '',
        ]);

        $response = App::handle($request);
        $data = json_decode($response->getContent(), true);

        if ($response->getStatusCode() >= 400) {
            $error = $data['message'] ?? $data['error'] ?? 'Token request failed';

            Log::warning('Passport password grant failed.', [
                'status' => $response->getStatusCode(),
                'error' => $error,
                'hint' => $error === 'invalid_client'
                    ? 'oauth_clients may be empty or .env client credentials are stale'
                    : null,
                'client_id' => config('services.passport.password_client_id'),
            ]);

            return [
                'error' => $error,
                'status' => $response->getStatusCode(),
            ];
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function refreshToken(string $refreshToken): array
    {
        $request = Request::create('/oauth/token', 'POST', [
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
            'client_id' => config('services.passport.password_client_id'),
            'client_secret' => config('services.passport.password_client_secret'),
            'scope' => '',
        ]);

        $response = App::handle($request);
        $data = json_decode($response->getContent(), true);

        if ($response->getStatusCode() >= 400) {
            return [
                'error' => $data['message'] ?? $data['error'] ?? 'Refresh failed',
                'status' => $response->getStatusCode(),
            ];
        }

        return $data;
    }
}
