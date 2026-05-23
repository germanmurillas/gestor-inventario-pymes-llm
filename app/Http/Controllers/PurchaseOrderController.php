<?php
namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Vendor;
use App\Models\Material;
use App\Models\Lote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        $orders = PurchaseOrder::with(['vendor', 'items.material', 'creator'])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($po) {
                return [
                    'id' => $po->id,
                    'po_number' => $po->po_number,
                    'status' => $po->status,
                    'vendor_name' => $po->vendor?->name,
                    'created_by_name' => $po->creator?->name,
                    'date_expected' => $po->date_expected?->format('Y-m-d'),
                    'total_cost' => (float) $po->total_cost,
                    'items_count' => $po->items->count(),
                    'items' => $po->items->map(fn($i) => [
                        'id' => $i->id,
                        'material_name' => $i->material?->name,
                        'material_code' => $i->material?->code,
                        'quantity' => (float) $i->quantity,
                        'unit_cost' => (float) $i->unit_cost,
                        'received_qty' => (float) $i->received_qty,
                    ]),
                    'updated_at' => $po->updated_at->format('Y-m-d H:i'),
                ];
            });

        return response()->json(['orders' => $orders]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'po_number'    => 'required|string|max:50|unique:purchase_orders,po_number',
            'vendor_id'    => 'nullable|exists:vendors,id',
            'date_expected'=> 'nullable|date',
            'submitted_by' => 'nullable|string|max:100',
            'approved_by'  => 'nullable|string|max:100',
            'ship_to'      => 'nullable|string|max:500',
            'bill_to'      => 'nullable|string|max:500',
            'notes'        => 'nullable|string|max:2000',
            'items'        => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity'    => 'required|numeric|min:0.01',
            'items.*.unit_cost'   => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $po = PurchaseOrder::create([
                'po_number'    => $validated['po_number'],
                'status'       => 'draft',
                'vendor_id'    => $validated['vendor_id'] ?? null,
                'created_by'   => auth()->id(),
                'date_expected'=> $validated['date_expected'] ?? null,
                'submitted_by' => $validated['submitted_by'] ?? null,
                'approved_by'  => $validated['approved_by'] ?? null,
                'ship_to'      => $validated['ship_to'] ?? null,
                'bill_to'      => $validated['bill_to'] ?? null,
                'notes'        => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'material_id'      => $item['material_id'],
                    'quantity'         => $item['quantity'],
                    'unit_cost'        => $item['unit_cost'] ?? 0,
                ]);
            }

            $po->updateTotalCost();
            DB::commit();

            DB::table('audit_log')->insert([
                'user_id' => auth()->id(), 'accion' => 'crear', 'modulo' => 'PurchaseOrders',
                'entidad_id' => $po->id, 'entidad_tipo' => 'PurchaseOrder',
                'datos_nuevos' => json_encode($po->load('items')->toArray()), 'created_at' => now(),
            ]);

            return response()->json(['order' => $po->load('items.material', 'vendor'), 'message' => 'Orden creada']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, PurchaseOrder $order)
    {
        $validated = $request->validate([
            'status'       => 'string|in:draft,ready_for_review,approved,ordered,received,closed',
            'vendor_id'    => 'nullable|exists:vendors,id',
            'date_expected'=> 'nullable|date',
            'submitted_by' => 'nullable|string|max:100',
            'approved_by'  => 'nullable|string|max:100',
            'ship_to'      => 'nullable|string|max:500',
            'bill_to'      => 'nullable|string|max:500',
            'notes'        => 'nullable|string|max:2000',
        ]);

        $before = $order->toArray();
        $order->update($validated);

        DB::table('audit_log')->insert([
            'user_id' => auth()->id(), 'accion' => 'editar', 'modulo' => 'PurchaseOrders',
            'entidad_id' => $order->id, 'entidad_tipo' => 'PurchaseOrder',
            'datos_anteriores' => json_encode($before), 'datos_nuevos' => json_encode($order->toArray()),
            'created_at' => now(),
        ]);

        return response()->json(['order' => $order->load('items.material', 'vendor'), 'message' => 'Orden actualizada']);
    }

    public function destroy(PurchaseOrder $order)
    {
        DB::table('audit_log')->insert([
            'user_id' => auth()->id(), 'accion' => 'eliminar', 'modulo' => 'PurchaseOrders',
            'entidad_id' => $order->id, 'entidad_tipo' => 'PurchaseOrder',
            'datos_anteriores' => json_encode($order->load('items')->toArray()), 'created_at' => now(),
        ]);

        $order->delete();
        return response()->json(['message' => 'Orden eliminada']);
    }

    public function receive(Request $request, PurchaseOrder $order)
    {
        if (!in_array($order->status, ['approved', 'ordered'])) {
            return response()->json(['message' => 'Solo órdenes aprobadas pueden recibirse'], 422);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id'     => 'required|exists:purchase_order_items,id',
            'items.*.received'=> 'required|numeric|min:0',
            'folder'          => 'nullable|string|max:100',
        ]);

        DB::beginTransaction();
        try {
            $allReceived = true;
            foreach ($validated['items'] as $item) {
                $poi = PurchaseOrderItem::findOrFail($item['id']);
                $poi->received_qty += $item['received'];
                $poi->save();

                if ($poi->received_qty < $poi->quantity) $allReceived = false;

                // Registrar movimiento en inventario
                $material = Material::find($poi->material_id);
                Lote::create([
                    'material_id'    => $poi->material_id,
                    'batch_number'   => 'PO-' . $order->po_number . '-' . now()->format('Ymd'),
                    'quantity'       => $item['received'],
                    'unit_cost'      => $poi->unit_cost,
                    'expiration_date'=> now()->addYear(),
                    'status'         => 'active',
                    'notes'          => 'Recibido de orden ' . $order->po_number,
                ]);
            }

            $order->status = $allReceived ? 'received' : 'ordered';
            $order->save();
            DB::commit();

            return response()->json(['order' => $order->load('items.material'), 'message' => 'Items recibidos']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function vendors()
    {
        return response()->json(['vendors' => Vendor::orderBy('name')->get()]);
    }

    public function storeVendor(Request $request)
    {
        $vendor = Vendor::create($request->validate([
            'name'         => 'required|string|max:200',
            'contact_name' => 'nullable|string|max:200',
            'email'        => 'nullable|email|max:200',
            'phone'        => 'nullable|string|max:50',
            'address'      => 'nullable|string|max:500',
            'notes'        => 'nullable|string|max:2000',
        ]));

        return response()->json(['vendor' => $vendor, 'message' => 'Proveedor creado']);
    }
}
