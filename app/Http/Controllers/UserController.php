<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        $users = User::orderBy('name')->get()->map(fn (User $u) => [
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'role'       => $u->role ?? 'operario',
            'created_at' => $u->created_at?->format('Y-m-d'),
        ]);

        return response()->json(['users' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|in:admin,operario',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'],
        ]);

        $this->audit('crear', $user->id);

        return response()->json(['message' => 'Usuario creado', 'id' => $user->id], 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => 'sometimes|in:admin,operario',
        ]);

        $user->update($validated);
        $this->audit('editar', $user->id);

        return response()->json(['message' => 'Usuario actualizado']);
    }

    public function destroy(Request $request, User $user)
    {
        // No permitir que el admin se elimine a sí mismo (evita quedarse sin acceso).
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 422);
        }

        $this->audit('eliminar', $user->id);
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado']);
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $user->update(['password' => Hash::make($validated['password'])]);
        $this->audit('reset_password', $user->id);

        return response()->json(['message' => 'Contraseña restablecida']);
    }

    private function audit(string $accion, int $id): void
    {
        DB::table('audit_log')->insert([
            'user_id'      => auth()->id(),
            'accion'       => $accion,
            'modulo'       => 'Users',
            'entidad_id'   => $id,
            'entidad_tipo' => 'User',
            'created_at'   => now(),
        ]);
    }
}
