<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PassportTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;

class AuthController extends Controller
{
    public function __construct(
        protected PassportTokenService $tokenService,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $tokens = $this->tokenService->issuePasswordGrantToken(
            $validated['email'],
            $validated['password'],
        );

        if (isset($tokens['error'])) {
            return response()->json(['message' => $tokens['error']], 500);
        }

        return response()->json([
            'user' => $user,
            ...$tokens,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $tokens = $this->tokenService->issuePasswordGrantToken(
            $validated['email'],
            $validated['password'],
        );

        if (isset($tokens['error'])) {
            return response()->json(['message' => $tokens['error']], 401);
        }

        return response()->json([
            'user' => $user,
            ...$tokens,
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        $tokens = $this->tokenService->refreshToken($validated['refresh_token']);

        if (isset($tokens['error'])) {
            return response()->json(['message' => $tokens['error']], 401);
        }

        return response()->json($tokens);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $accessToken = $request->user()->currentAccessToken();
        $tokenId = $accessToken?->oauth_access_token_id;

        if (is_string($tokenId) && $tokenId !== '') {
            Passport::token()->newQuery()->whereKey($tokenId)->update(['revoked' => true]);
            RefreshToken::query()->where('access_token_id', $tokenId)->update(['revoked' => true]);
        } elseif ($accessToken !== null) {
            $accessToken->revoke();
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
