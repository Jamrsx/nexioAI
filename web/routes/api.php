<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SyncBatchController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'ok' => true,
    'time' => now()->toIso8601String(),
]));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/refresh', [AuthController::class, 'refresh']);

Route::middleware('auth:api')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/sync/batch', [SyncBatchController::class, 'store']);
});
