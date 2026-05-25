<?php

namespace App\Services;

use App\Models\User;
use Laravel\Passport\PersonalAccessTokenResult;

class ApiTokenIssuer
{
    /**
     * Issue API tokens for the mobile app (no internal /oauth/token HTTP call).
     *
     * @return array{token_type: string, expires_in: int, access_token: string, refresh_token: string}
     */
    public function forUser(User $user): array
    {
        $result = $user->createToken('mobile');

        return $this->format($result);
    }

    /**
     * @return array{token_type: string, expires_in: int, access_token: string, refresh_token: string}
     */
    private function format(PersonalAccessTokenResult $result): array
    {
        return [
            'token_type' => 'Bearer',
            'expires_in' => (int) $result->expiresIn,
            'access_token' => $result->accessToken,
            'refresh_token' => $result->accessToken,
        ];
    }
}
