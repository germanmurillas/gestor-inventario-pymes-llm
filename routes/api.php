
Route::get('/miloto', [\App\Http\Controllers\MilotoController::class, 'index']);
Route::get('/miloto/{id}', [\App\Http\Controllers\MilotoController::class, 'run']);

