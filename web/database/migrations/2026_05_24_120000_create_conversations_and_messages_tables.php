<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('client_uuid');
            $table->string('title')->nullable();
            $table->string('model_name')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'client_uuid']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->uuid('client_uuid');
            $table->string('role');
            $table->longText('content');
            $table->string('source')->default('local_llama');
            $table->string('model_name')->nullable();
            $table->unsignedInteger('prompt_tokens')->nullable();
            $table->unsignedInteger('completion_tokens')->nullable();
            $table->string('device_id')->nullable();
            $table->string('app_version')->nullable();
            $table->timestamp('client_created_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'client_uuid']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
    }
};
