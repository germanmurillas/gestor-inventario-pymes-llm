<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // Máximo 5 intentos fallidos por correo e IP; después, bloqueo temporal.
        $clave = Str::transliterate(Str::lower($credentials['email']) . '|' . $request->ip());
        if (RateLimiter::tooManyAttempts($clave, 5)) {
            $segundos = RateLimiter::availableIn($clave);

            return back()->withErrors([
                'email' => "Demasiados intentos. Intente de nuevo en {$segundos} segundos.",
            ])->onlyInput('email');
        }

        if (Auth::attempt($credentials)) {
            RateLimiter::clear($clave);
            $request->session()->regenerate();
            return redirect()->intended('/dashboard');
        }

        RateLimiter::hit($clave, 60);

        return back()->withErrors([
            'email' => 'El correo o la contraseña son incorrectos.',
        ])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
