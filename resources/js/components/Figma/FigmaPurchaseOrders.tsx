import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Truck, Package, CheckCircle, Clock, X, Search, Save, Trash2, ArrowRight, ChevronRight } from 'lucide-react';

interface POItem { id?: number; material_id: number; material_name?: string; material_code?: string; quantity: number; unit_cost: number; received_qty?: number; }
interface PO { id: number; po_number: string; status: string; vendor_name?: string; created_by_name?: string; date_expected?: string; total_cost: number; items_count: number; items: POItem[]; updated_at: string; }
interface Vendor { id: number; name: string; contact_name?: string; email?: string; phone?: string; }
interface Material { id: number; name: string; code: string; stock_total: number; unit: string; }

const STATUS_FLOW = ['draft', 'ready_for_review', 'approved', 'ordered', 'received', 'closed'] as const;
const STATUS_LABELS: Record<string, string> = {
    draft: 'Borrador', ready_for_review: 'Pendiente Revisión', approved: 'Aprobado',
    ordered: 'Ordenado', received: 'Recibido', closed: 'Cerrado'
};
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-500', ready_for_review: 'bg-yellow-500', approved: 'bg-blue-500',
    ordered: 'bg-purple-500', received: 'bg-emerald-500', closed: 'bg-slate-400'
};

export default function FigmaPurchaseOrders() {
    const [orders, setOrders] = useState<PO[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [showReceive, setShowReceive] = useState<PO | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // New PO state
    const [poNumber, setPoNumber] = useState('PO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*1000));
    const [vendorId, setVendorId] = useState<number | null>(null);
    const [dateExpected, setDateExpected] = useState('');
    const [submittedBy, setSubmittedBy] = useState('');
    const [shipTo, setShipTo] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState<POItem[]>([]);
    const [itemSearch, setItemSearch] = useState('');

    // New vendor inline
    const [newVendorName, setNewVendorName] = useState('');
    const [newVendorPhone, setNewVendorPhone] = useState('');

    const csrf = useCallback(() => {
        const c = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
        return decodeURIComponent(c ?? '');
    }, []);

    const fetchOrders = useCallback(async () => {
        const res = await fetch('/api/purchase-orders');
        setOrders((await res.json()).orders || []);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => {
        fetch('/api/purchase-orders/vendors').then(r => r.json()).then(d => setVendors(d.vendors || []));
        fetch('/api/agent-bus').catch(() => {}); // fallback: use dashboard data for materials
            // We'll load materials from the dashboard endpoint
    }, []);

    const handleCreate = async () => {
        if (!poNumber || selectedItems.length === 0) return;
        setSaving(true);
        const res = await fetch('/api/purchase-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({
                po_number: poNumber, vendor_id: vendorId, date_expected: dateExpected || null,
                submitted_by: submittedBy || null, ship_to: shipTo || null, notes: notes || null,
                items: selectedItems.map(i => ({ material_id: i.material_id, quantity: i.quantity, unit_cost: i.unit_cost })),
            }),
        });
        setSaving(false);
        if (res.ok) {
            setShowForm(false); resetForm(); fetchOrders();
        }
    };

    const handleStatusChange = async (order: PO, newStatus: string) => {
        await fetch(`/api/purchase-orders/${order.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ status: newStatus }),
        });
        fetchOrders();
    };

    const handleReceive = async () => {
        if (!showReceive) return;
        const items = showReceive.items.map(i => ({ id: i.id!, received: i.received_qty || i.quantity }));
        await fetch(`/api/purchase-orders/${showReceive.id}/receive`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ items }),
        });
        setShowReceive(null); fetchOrders();
    };

    const handleAddVendor = async () => {
        if (!newVendorName) return;
        const res = await fetch('/api/purchase-orders/vendors', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ name: newVendorName, phone: newVendorPhone || null }),
        });
        if (res.ok) {
            const d = await res.json();
            setVendors([...vendors, d.vendor]);
            setVendorId(d.vendor.id);
            setNewVendorName(''); setNewVendorPhone('');
        }
    };

    const resetForm = () => {
        setPoNumber('PO-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*1000));
        setVendorId(null); setDateExpected(''); setSubmittedBy(''); setShipTo(''); setNotes('');
        setSelectedItems([]); setItemSearch('');
    };

    const addItem = (mat: Material) => {
        if (selectedItems.find(i => i.material_id === mat.id)) return;
        setSelectedItems([...selectedItems, { material_id: mat.id, material_name: mat.name, material_code: mat.code, quantity: 1, unit_cost: 0 }]);
    };

    const updateItem = (idx: number, field: keyof POItem, value: any) => {
        const updated = [...selectedItems];
        (updated[idx] as any)[field] = value;
        setSelectedItems(updated);
    };

    const removeItem = (idx: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== idx));
    };

    const filteredOrders = orders.filter(o =>
        !searchTerm || o.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.vendor_name && o.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Órdenes de Compra</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Purchase Orders · Crear, aprobar y recibir</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="text" placeholder="Buscar orden..." value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 w-48" />
                    <button onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                        <Plus size={14} /> Nueva Orden
                    </button>
                </div>
            </div>

            {/* ── PO List ── */}
            <div className="space-y-3">
                {filteredOrders.map(po => (
                    <div key={po.id} className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-4 sm:p-6 hover:border-slate-600/30 transition-all">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <Truck size={20} className="text-indigo-400" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white uppercase">{po.po_number}</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                        {po.vendor_name || 'Sin proveedor'} · {po.items_count} items · ${Number(po.total_cost).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase text-white ${STATUS_COLORS[po.status]}`}>
                                    {STATUS_LABELS[po.status]}
                                </span>
                                <div className="flex items-center gap-1">
                                    {STATUS_FLOW.map((s, i) => {
                                        const currentIdx = STATUS_FLOW.indexOf(po.status);
                                        const isPast = i <= currentIdx;
                                        return (
                                            <button key={s}
                                                onClick={() => handleStatusChange(po, s)}
                                                disabled={s === po.status}
                                                title={STATUS_LABELS[s]}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
                                                    s === po.status ? STATUS_COLORS[s] + ' text-white scale-125' :
                                                    isPast ? 'bg-slate-600 text-slate-400' : 'bg-slate-700/30 text-slate-300'
                                                } ${s !== po.status ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {isPast ? <CheckCircle size={10} /> : i + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button onClick={() => setShowReceive(po)}
                                    disabled={!['approved','ordered'].includes(po.status)}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-30 text-[9px] font-black uppercase rounded-lg transition-all">
                                    Recibir
                                </button>
                                <button onClick={async () => { await fetch(`/api/purchase-orders/${po.id}`, { method: 'DELETE', headers: {'X-XSRF-TOKEN': csrf()} }); fetchOrders(); }}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        {/* Items preview */}
                        <div className="flex gap-2 flex-wrap">
                            {po.items.slice(0, 5).map((item, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-700/20 rounded-lg text-[9px] font-bold text-slate-400 uppercase">
                                    {item.material_name} ×{item.quantity}
                                </span>
                            ))}
                            {po.items.length > 5 && <span className="text-[9px] text-slate-500 font-bold">+{po.items.length - 5} más</span>}
                        </div>
                    </div>
                ))}
                {filteredOrders.length === 0 && (
                    <div className="p-12 text-center text-slate-300 text-xs font-bold uppercase tracking-wider">
                        <Package size={32} className="mx-auto mb-3 opacity-50" /> No hay órdenes de compra
                    </div>
                )}
            </div>

            {/* ── Create PO Form Modal ── */}
            {showForm && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
                        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-8 space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white uppercase">Nueva Orden de Compra</h3>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">N° Orden</div>
                                    <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Fecha Esperada</div>
                                    <input type="date" value={dateExpected} onChange={e => setDateExpected(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Proveedor</div>
                                    <select value={vendorId || ''} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500">
                                        <option value="">Sin proveedor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Enviado por</div>
                                    <input type="text" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)}
                                        placeholder="Nombre del solicitante" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            {/* Quick add vendor */}
                            <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                                <input type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)}
                                    placeholder="Nuevo proveedor rápido" className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500" />
                                <input type="text" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)}
                                    placeholder="Teléfono" className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500" />
                                <button onClick={handleAddVendor} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl">
                                    Agregar
                                </button>
                            </div>

                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Dirección de envío</div>
                                <input type="text" value={shipTo} onChange={e => setShipTo(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Notas</div>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500 resize-none" />
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Items</div>
                                {selectedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                                        <span className="flex-1 text-xs font-bold text-white">{item.material_name}</span>
                                        <input type="number" min="0.01" step="0.01" value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-center outline-none" placeholder="Cant" />
                                        <input type="number" min="0" step="0.01" value={item.unit_cost}
                                            onChange={e => updateItem(idx, 'unit_cost', Number(e.target.value))}
                                            className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-center outline-none" placeholder="$ Costo" />
                                        <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Buscar material..." value={itemSearch}
                                        onChange={e => setItemSearch(e.target.value)}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                                </div>
                                {/* Quick add buttons - would need materials list from server */}
                                <p className="text-[9px] text-slate-500 font-bold">Ingresa el ID del material o usa búsqueda</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                                <div className="text-xs font-bold text-white">
                                    Total: ${selectedItems.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0).toLocaleString()}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowForm(false)} className="px-6 py-2.5 text-slate-400 hover:text-white text-[10px] font-black uppercase">Cancelar</button>
                                    <button onClick={handleCreate} disabled={saving || selectedItems.length === 0}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[10px] font-black uppercase rounded-xl transition-all">
                                        <Save size={14} /> {saving ? 'Guardando...' : 'Crear Orden'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Receive Modal ── */}
            {showReceive && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowReceive(null)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
                        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white uppercase">Recibir Items · {showReceive.po_number}</h3>
                                <button onClick={() => setShowReceive(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                            </div>
                            {showReceive.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white">{item.material_name}</div>
                                        <div className="text-[9px] text-slate-500 font-bold">Ordenado: {item.quantity} · Recibido: {item.received_qty || 0}</div>
                                    </div>
                                    <input type="number" min="0" max={item.quantity} step="0.01"
                                        defaultValue={item.quantity - (item.received_qty || 0)}
                                        onChange={e => {
                                            const updated = [...showReceive.items];
                                            updated[idx].received_qty = Number(e.target.value);
                                            setShowReceive({...showReceive, items: updated});
                                        }}
                                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-center outline-none" />
                                </div>
                            ))}
                            <button onClick={handleReceive}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all">
                                <CheckCircle size={14} /> Confirmar Recepción
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
