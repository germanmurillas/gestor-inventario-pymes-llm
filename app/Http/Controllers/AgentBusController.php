<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AgentBusController extends Controller
{
    public function events()
    {
        return response()->json([
            'agents' => [],
            'events' => [],
            'count' => 0,
        ]);
    }
}
