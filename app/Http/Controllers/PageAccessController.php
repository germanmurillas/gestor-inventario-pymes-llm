<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PageAccessController extends Controller
{
    public function verify(Request $request)
    {
        $request->validate([
            'page' => 'required|in:indice,nicho',
            'password' => 'required|string',
        ]);

        $page = $request->input('page');
        $correctPassword = config("page-access.{$page}");

        if ($correctPassword && $request->input('password') === $correctPassword) {
            return response()->json(['valid' => true]);
        }

        return response()->json(['valid' => false], 401);
    }
}
