<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SyncBatchController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'conversations' => ['nullable', 'array'],
            'conversations.*.client_uuid' => ['required', 'uuid'],
            'conversations.*.title' => ['nullable', 'string', 'max:255'],
            'conversations.*.model_name' => ['nullable', 'string', 'max:255'],
            'conversations.*.updated_at' => ['nullable', 'date'],
            'messages' => ['nullable', 'array'],
            'messages.*.client_uuid' => ['required', 'uuid'],
            'messages.*.conversation_client_uuid' => ['required', 'uuid'],
            'messages.*.role' => ['required', 'in:user,assistant,system'],
            'messages.*.content' => ['required', 'string'],
            'messages.*.source' => ['nullable', 'string', 'max:64'],
            'messages.*.model_name' => ['nullable', 'string', 'max:255'],
            'messages.*.prompt_tokens' => ['nullable', 'integer', 'min:0'],
            'messages.*.completion_tokens' => ['nullable', 'integer', 'min:0'],
            'messages.*.device_id' => ['nullable', 'string', 'max:255'],
            'messages.*.app_version' => ['nullable', 'string', 'max:64'],
            'messages.*.client_created_at' => ['nullable', 'date'],
        ]);

        $user = $request->user();
        $syncedAt = now();
        $conversationMap = [];

        foreach ($validated['conversations'] ?? [] as $item) {
            $conversation = Conversation::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'client_uuid' => $item['client_uuid'],
                ],
                [
                    'title' => $item['title'] ?? null,
                    'model_name' => $item['model_name'] ?? null,
                    'updated_at' => isset($item['updated_at'])
                        ? Carbon::parse($item['updated_at'])
                        : $syncedAt,
                ],
            );

            $conversationMap[$item['client_uuid']] = $conversation->id;
        }

        $messageMap = [];

        foreach ($validated['messages'] ?? [] as $item) {
            $conversationId = $conversationMap[$item['conversation_client_uuid']]
                ?? Conversation::query()
                    ->where('user_id', $user->id)
                    ->where('client_uuid', $item['conversation_client_uuid'])
                    ->value('id');

            if (! $conversationId) {
                $conversation = Conversation::query()->create([
                    'user_id' => $user->id,
                    'client_uuid' => $item['conversation_client_uuid'],
                    'title' => 'Synced conversation',
                ]);
                $conversationId = $conversation->id;
                $conversationMap[$item['conversation_client_uuid']] = $conversationId;
            }

            $message = Message::query()->updateOrCreate(
                [
                    'conversation_id' => $conversationId,
                    'client_uuid' => $item['client_uuid'],
                ],
                [
                    'role' => $item['role'],
                    'content' => $item['content'],
                    'source' => $item['source'] ?? 'local_llama',
                    'model_name' => $item['model_name'] ?? null,
                    'prompt_tokens' => $item['prompt_tokens'] ?? null,
                    'completion_tokens' => $item['completion_tokens'] ?? null,
                    'device_id' => $item['device_id'] ?? null,
                    'app_version' => $item['app_version'] ?? null,
                    'client_created_at' => isset($item['client_created_at'])
                        ? Carbon::parse($item['client_created_at'])
                        : $syncedAt,
                ],
            );

            $messageMap[$item['client_uuid']] = $message->id;
        }

        return response()->json([
            'synced_at' => $syncedAt->toIso8601String(),
            'conversations' => $conversationMap,
            'messages' => $messageMap,
        ]);
    }
}
