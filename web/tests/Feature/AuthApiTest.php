<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Passport\ClientRepository;
use Laravel\Passport\Token;

uses(RefreshDatabase::class);

beforeEach(function () {
    app(ClientRepository::class)->createPersonalAccessGrantClient('Test Personal', 'users');
});

test('user can register and receive passport tokens', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@nexio.ai',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonStructure([
            'user' => ['id', 'name', 'email'],
            'token_type',
            'access_token',
            'refresh_token',
            'expires_in',
        ]);

    $this->assertDatabaseHas('users', ['email' => 'test@nexio.ai']);
});

test('user can login and access profile', function () {
    User::factory()->create([
        'email' => 'login@nexio.ai',
        'password' => 'password123',
    ]);

    $login = $this->postJson('/api/login', [
        'email' => 'login@nexio.ai',
        'password' => 'password123',
    ]);

    $login->assertOk();
    $token = $login->json('access_token');

    $this->getJson('/api/user', [
        'Authorization' => 'Bearer '.$token,
    ])->assertOk()
        ->assertJsonPath('user.email', 'login@nexio.ai');
});

test('logout revokes token', function () {
    User::factory()->create([
        'email' => 'logout@nexio.ai',
        'password' => 'password123',
    ]);

    $login = $this->postJson('/api/login', [
        'email' => 'logout@nexio.ai',
        'password' => 'password123',
    ]);

    $token = $login->json('access_token');

    $this->postJson('/api/logout', [], [
        'Authorization' => 'Bearer '.$token,
    ])->assertOk();

    $parts = explode('.', $token);
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/'), true), true);
    $jti = $payload['jti'] ?? null;

    expect($jti)->not->toBeNull();
    expect(Token::query()->find($jti)?->revoked)->toBeTrue();

    Auth::forgetGuards();

    $this->getJson('/api/user', [
        'Authorization' => 'Bearer '.$token,
    ])->assertUnauthorized();
});
