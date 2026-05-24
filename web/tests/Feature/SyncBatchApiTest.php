<?php

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Passport\ClientRepository;

uses(RefreshDatabase::class);

beforeEach(function () {
    $client = app(ClientRepository::class)->createPasswordGrantClient('Test Mobile', null, true);

    config([
        'services.passport.password_client_id' => $client->id,
        'services.passport.password_client_secret' => $client->plainSecret,
    ]);
});

function syncAuthHeaders(): array
{
    $register = test()->postJson('/api/register', [
        'name' => 'Sync User',
        'email' => 'sync'.Str::random(8).'@nexio.ai',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $token = $register->json('access_token');

    return ['Authorization' => 'Bearer '.$token];
}

test('sync batch creates conversations and messages', function () {
    $conversationUuid = (string) Str::uuid();
    $userMessageUuid = (string) Str::uuid();
    $assistantMessageUuid = (string) Str::uuid();

    $response = $this->postJson('/api/sync/batch', [
        'conversations' => [
            [
                'client_uuid' => $conversationUuid,
                'title' => 'Test chat',
                'model_name' => 'tinyllama-q4',
            ],
        ],
        'messages' => [
            [
                'client_uuid' => $userMessageUuid,
                'conversation_client_uuid' => $conversationUuid,
                'role' => 'user',
                'content' => 'Hello offline',
                'source' => 'local_llama',
                'client_created_at' => now()->toIso8601String(),
            ],
            [
                'client_uuid' => $assistantMessageUuid,
                'conversation_client_uuid' => $conversationUuid,
                'role' => 'assistant',
                'content' => 'Hello from local model',
                'source' => 'local_llama',
                'model_name' => 'tinyllama-q4',
                'client_created_at' => now()->addSecond()->toIso8601String(),
            ],
        ],
    ], syncAuthHeaders());

    $response->assertOk()
        ->assertJsonStructure([
            'synced_at',
            'conversations',
            'messages',
        ]);

    expect(Conversation::query()->where('client_uuid', $conversationUuid)->exists())->toBeTrue();
    expect(Message::query()->where('client_uuid', $userMessageUuid)->exists())->toBeTrue();
    expect(Message::query()->where('client_uuid', $assistantMessageUuid)->exists())->toBeTrue();
});

test('sync batch upserts by client uuid without duplicates', function () {
    $conversationUuid = (string) Str::uuid();
    $messageUuid = (string) Str::uuid();
    $headers = syncAuthHeaders();

    $payload = [
        'conversations' => [
            [
                'client_uuid' => $conversationUuid,
                'title' => 'First title',
            ],
        ],
        'messages' => [
            [
                'client_uuid' => $messageUuid,
                'conversation_client_uuid' => $conversationUuid,
                'role' => 'user',
                'content' => 'Original question',
            ],
        ],
    ];

    $this->postJson('/api/sync/batch', $payload, $headers)->assertOk();

    $payload['conversations'][0]['title'] = 'Updated title';
    $payload['messages'][0]['content'] = 'Updated question';

    $this->postJson('/api/sync/batch', $payload, $headers)->assertOk();

    expect(Conversation::query()->where('client_uuid', $conversationUuid)->count())->toBe(1);
    expect(Message::query()->where('client_uuid', $messageUuid)->count())->toBe(1);

    $conversation = Conversation::query()->where('client_uuid', $conversationUuid)->first();
    $message = Message::query()->where('client_uuid', $messageUuid)->first();

    expect($conversation->title)->toBe('Updated title');
    expect($message->content)->toBe('Updated question');
});

test('sync batch requires authentication', function () {
    $this->postJson('/api/sync/batch', [
        'conversations' => [],
        'messages' => [],
    ])->assertUnauthorized();
});
