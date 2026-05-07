<?php

namespace App\Policies;

use App\Models\KanbanItem;
use App\Models\User;

class KanbanItemPolicy
{
    public function update(User $user, KanbanItem $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function delete(User $user, KanbanItem $item): bool
    {
        return $user->id === $item->user_id;
    }
}
