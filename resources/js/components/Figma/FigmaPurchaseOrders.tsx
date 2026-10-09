import React, { useState, useEffect, useCallback } from 'react';
import { avisar } from '../../Components/Avisos';
import { mensajeDeError } from '../../lib/http';
import { usePage } from '@inertiajs/react';
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
// Insignias tintadas: texto claro sobre fondo translúcido (contraste AA en todos los temas).
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-700 text-slate-200', ready_for_review: 'bg-amber-500/15 text-amber-300', approved: 'bg-sky-500/15 text-sky-300',
    ordered: 'bg-indigo-500/15 text-indigo-200', received: 'bg-emerald-500/15 text-emerald-300', closed: 'bg-slate-700 text-slate-300'
};

export default function FigmaPurchaseOrders() {
    const [orders, setOrders] = useState<PO[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [showReceive, setShowReceive] = useState<PO | null>(null);
    // Recepción: por cada ítem, lo recibido ahora y los datos reales del lote (FEFO necesita el vencimiento del proveedor).
    type Recibo = { received: string; batch_number: string; expiration_date: string; bodega_id: string };
    const [recibos, setRecibos] = useState<Record<number, Recibo>>({});
    const [erroresRecibo, setErroresRecibo] = useState<Record<string, string>>({});
    const pageProps = usePage().props as any;
    const bodegas: { id: number; name: string }[] = pageProps?.dashboardStats?.bodegas ?? [];
    const esAdmin = pageProps?.auth?.user?.role === 'admin';
    const abrirRecepcion = (po: PO) => {
        setErroresRecibo({});
        setRecibos(Object.fromEntries(po.items.map((i) => [i.id!, { received: String(Math.max(0, i.quantity - (i.received_qty || 0))), batch_number: '', expiration_date: '', bodega_id: '' }])));
        setShowReceive(po);
    };
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
        if (newStatus === 'received') { alert('La orden queda recibida al registrar la recepción con el botón Recibir.'); return; }
        const res = await fetch(`/api/purchase-orders/${order.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) alert((await res.json().catch(() => ({})))?.message ?? 'No se pudo cambiar el estado de la orden.');
        fetchOrders();
    };

    const handleReceive = async () => {
        if (!showReceive) return;
        const items = showReceive.items.map((i) => {
            const r = recibos[i.id!];
            return { id: i.id!, received: Number(r?.received || 0), batch_number: r?.batch_number || null, expiration_date: r?.expiration_date || null, bodega_id: r?.bodega_id || null };
        });
        const res = await fetch(`/api/purchase-orders/${showReceive.id}/receive`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': csrf() },
            body: JSON.stringify({ items }),
        });
        if (res.status === 422) {
            const data = await res.json();
            setErroresRecibo(Object.fromEntries(Object.entries(data.errors ?? {}).map(([k, v]) => [k, (v as string[])[0]])));
            return;
        }
        if (!res.ok) { setErroresRecibo({ general: (await res.json().catch(() => ({})))?.message ?? 'No se pudo registrar la recepción.' }); return; }
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
        } else {
            let d = null; try { d = await res.json(); } catch { /* no era JSON */ }
            avisar('error', mensajeDeError(res.status, d));
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
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Crear, aprobar y recibir órdenes a proveedores</p>
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
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_COLORS[po.status]}`}>
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
                                                aria-label={s === po.status ? `Estado actual: ${STATUS_LABELS[s]}` : `Cambiar a ${STATUS_LABELS[s]}`}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
                                                    s === po.status ? 'bg-indigo-600 text-white scale-125' :
                                                    isPast ? 'bg-slate-600 text-slate-400' : 'bg-slate-700/30 text-slate-300'
                                                } ${s !== po.status ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {isPast ? <CheckCircle size={10} /> : i + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button onClick={() => abrirRecepcion(po)}
                                    disabled={!['approved','ordered'].includes(po.status)}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 disabled:opacity-30 text-[9px] font-black uppercase rounded-lg transition-all">
                                    Recibir
                                </button>
                                {esAdmin && <button aria-label={`Eliminar la orden ${po.po_number}`}
                                    onClick={async () => { if (!confirm(`¿Eliminar la orden ${po.po_number}? Esta acción no se puede deshacer.`)) return; await fetch(`/api/purchase-orders/${po.id}`, { method: 'DELETE', headers: {'X-XSRF-TOKEN': csrf()} }); fetchOrders(); }}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                                    <Trash2 size={14} />
                                </button>}
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
                                <button onClick={() => setShowForm(false)} aria-label="Cerrar" className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">N° Orden</div>
                                    <input aria-label="N° Orden" maxLength={50} type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Fecha Esperada</div>
                                    <input aria-label="Fecha Esperada" type="date" value={dateExpected} onChange={e => setDateExpected(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Proveedor</div>
                                    <select aria-label="Proveedor" value={vendorId || ''} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500">
                                        <option value="">Sin proveedor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase">Enviado por</div>
                                    <input aria-label="Enviado por" maxLength={100} type="text" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)}
                                        placeholder="Nombre del solicitante" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            {/* Quick add vendor */}
                            <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                                <input aria-label="Nombre del proveedor" maxLength={200} type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)}
                                    placeholder="Nuevo proveedor rápido" className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500" />
                                <input aria-label="Teléfono del proveedor" maxLength={50} type="text" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)}
                                    placeholder="Teléfono" className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500" />
                                <button onClick={handleAddVendor} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl">
                                    Agregar
                                </button>
                            </div>

                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Dirección de envío</div>
                                <input aria-label="Dirección de envío" maxLength={500} type="text" value={shipTo} onChange={e => setShipTo(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Notas</div>
                                <textarea aria-label="Notas" maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500 resize-none" />
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                                <div className="text-[9px] font-black text-slate-400 uppercase">Items</div>
                                {selectedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                                        <span className="flex-1 text-xs font-bold text-white">{item.material_name}</span>
                                        <input aria-label="Cantidad" type="number" min="0.01" step="0.01" value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-center outline-none" placeholder="Cant" />
                                        <input aria-label="Costo unitario" type="number" min="0" step="0.01" value={item.unit_cost}
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
                        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white">Recibir orden {showReceive.po_number}</h3>
                                <button onClick={() => setShowReceive(null)} aria-label="Cerrar" className="p-2 hover:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
                            </div>
                            <p className="text-xs text-slate-400">Registre cada lote tal como llega del proveedor: su número, su fecha de vencimiento y la bodega donde se guarda.</p>
                            {showReceive.items.map((item, idx) => {
                                const r = recibos[item.id!] ?? { received: '', batch_number: '', expiration_date: '', bodega_id: '' };
                                const set = (k: keyof Recibo, v: string) => setRecibos({ ...recibos, [item.id!]: { ...r, [k]: v } });
                                const err = (k: string) => erroresRecibo[`items.${idx}.${k}`];
                                return (
                                    <fieldset key={item.id} className="space-y-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
                                        <legend className="px-1 text-sm font-bold text-white">{item.material_name}</legend>
                                        <p className="text-[11px] text-slate-400">Ordenado: {item.quantity} · Recibido antes: {item.received_qty || 0}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="text-[11px] font-semibold text-slate-400">Cantidad recibida
                                                <input type="number" min="0" step="0.001" value={r.received} onChange={(e) => set('received', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 mt-1" />
                                            </label>
                                            <label className="text-[11px] font-semibold text-slate-400">Número de lote
                                                <input type="text" maxLength={50} value={r.batch_number} onChange={(e) => set('batch_number', e.target.value.toUpperCase())} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 mt-1" placeholder="Del proveedor" />
                                                {err('batch_number') && <span className="mt-1 block text-rose-300">{err('batch_number')}</span>}
                                            </label>
                                            <label className="text-[11px] font-semibold text-slate-400">Vence
                                                <input type="date" value={r.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 mt-1" />
                                                {err('expiration_date') && <span className="mt-1 block text-rose-300">{err('expiration_date')}</span>}
                                            </label>
                                            <label className="text-[11px] font-semibold text-slate-400">Bodega
                                                <select value={r.bodega_id} onChange={(e) => set('bodega_id', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 mt-1">
                                                    <option value="">Elegir…</option>
                                                    {bodegas.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                                {err('bodega_id') && <span className="mt-1 block text-rose-300">{err('bodega_id')}</span>}
                                            </label>
                                        </div>
                                    </fieldset>
                                );
                            })}
                            {erroresRecibo.general && <p className="text-xs text-rose-300">{erroresRecibo.general}</p>}
                            <button onClick={handleReceive}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all">
                                <CheckCircle size={14} /> Confirmar recepción
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
