<?php

namespace App\Http\Controllers;

use App\Models\KanbanItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class KanbanController extends Controller
{
    public function index()
    {
        $items = KanbanItem::where('user_id', Auth::id())->ordered()->get();

        $columns = [
            'todo' => $items->where('column', 'todo')->values(),
            'in_progress' => $items->where('column', 'in_progress')->values(),
            'review' => $items->where('column', 'review')->values(),
            'done' => $items->where('column', 'done')->values(),
        ];

        return Inertia::render('Kanban', [
            'columns' => $columns,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'column' => 'required|in:todo,in_progress,review,done',
        ]);

        $maxPosition = KanbanItem::where('user_id', Auth::id())
            ->where('column', $validated['column'])
            ->max('position') ?? -1;

        $item = KanbanItem::create([
            'user_id' => Auth::id(),
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'column' => $validated['column'],
            'position' => $maxPosition + 1,
        ]);

        return response()->json($item->load('user'));
    }

    public function update(Request $request, KanbanItem $item)
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'column' => 'sometimes|in:todo,in_progress,review,done',
            'position' => 'sometimes|integer',
        ]);

        $item->update($validated);

        return response()->json($item->load('user'));
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:kanban_items,id',
            'column' => 'required|in:todo,in_progress,review,done',
            'position' => 'required|integer',
        ]);

        $item = KanbanItem::findOrFail($validated['item_id']);
        $this->authorize('update', $item);

        $oldColumn = $item->column;
        $newColumn = $validated['column'];
        $newPosition = $validated['position'];

        \Illuminate\Support\Facades\DB::transaction(function () use ($item, $oldColumn, $newColumn, $newPosition) {
            if ($oldColumn !== $newColumn) {
                KanbanItem::where('user_id', Auth::id())
                    ->where('column', $oldColumn)
                    ->where('position', '>', $item->position)
                    ->decrement('position');
            }

            KanbanItem::where('user_id', Auth::id())
                ->where('column', $newColumn)
                ->where('position', '>=', $newPosition)
                ->increment('position');

            $item->update([
                'column' => $newColumn,
                'position' => $newPosition,
            ]);
        });

        $items = KanbanItem::where('user_id', Auth::id())->ordered()->get();

        return response()->json([
            'columns' => [
                'todo' => $items->where('column', 'todo')->values(),
                'in_progress' => $items->where('column', 'in_progress')->values(),
                'review' => $items->where('column', 'review')->values(),
                'done' => $items->where('column', 'done')->values(),
            ],
        ]);
    }

    public function destroy(KanbanItem $item)
    {
        $this->authorize('delete', $item);

        $item->delete();

        KanbanItem::where('user_id', Auth::id())
            ->where('column', $item->column)
            ->where('position', '>', $item->position)
            ->decrement('position');

        return response()->json(['success' => true]);
    }

    public function pin(KanbanItem $item)
    {
        $this->authorize('update', $item);

        $item->update(['is_pinned' => !$item->is_pinned]);

        return response()->json($item);
    }

    public function askRag(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:kanban_items,id',
        ]);

        $item = KanbanItem::findOrFail($validated['item_id']);

        $context = "Tarea del Kanban:\n";
        $context .= "Título: {$item->title}\n";
        $context .= "Descripción: " . ($item->description ?: 'Sin descripción') . "\n";
        $context .= "Columna: {$item->column}\n";
        if ($item->rag_context) {
            $context .= "\nContexto adicional del RAG:\n{$item->rag_context}";
        }

        return response()->json([
            'item' => $item,
            'rag_prompt' => $context,
        ]);
    }

    public function saveRagContext(Request $request, KanbanItem $item)
    {
        $this->authorize('update', $item);

        $validated = $request->validate([
            'rag_context' => 'nullable|string',
        ]);

        $item->update(['rag_context' => $validated['rag_context']]);

        return response()->json($item);
    }
}
