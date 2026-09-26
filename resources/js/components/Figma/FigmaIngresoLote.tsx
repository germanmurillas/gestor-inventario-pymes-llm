import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';

interface Props {
    materialId: number;
    unidad: string;
    bodegas: { id: number; name: string }[];
    /** Costo del último lote, como valor sugerido (el usuario lo confirma o lo cambia). */
    costoSugerido?: number | null;
    /** Bodega donde ya está el insumo, como valor sugerido. */
    bodegaSugerida?: number | null;
    onListo: () => void;
}

/** Ingreso de un lote nuevo de un insumo ya registrado (RF-02): queda su entrada en el Kardex. */
export default function FigmaIngresoLote({ materialId, unidad, bodegas, costoSugerido, bodegaSugerida, onListo }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [f, setF] = useState({ batch_number: '', quantity: '', unit_cost: costoSugerido ? String(costoSugerido) : '', expiration_date: '', bodega_id: bodegaSugerida ? String(bodegaSugerida) : '' });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const campo = 'mt-1 w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none';

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.post(`/inventory/material/${materialId}/lotes`, f, {
            preserveScroll: true,
            onError: (errs) => setErrores(errs as Record<string, string>),
            onSuccess: () => { setErrores({}); setAbierto(false); onListo(); },
            onFinish: () => setGuardando(false),
        });
    };

    if (!abierto) {
        return (
            <button type="button" onClick={() => setAbierto(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/50 py-3 text-sm font-bold text-slate-100">
                <PackagePlus size={16} /> Registrar ingreso de lote
            </button>
        );
    }

    return (
        <form onSubmit={guardar} className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4 sm:grid-cols-2" aria-label="Registrar ingreso de lote">
            <label className="text-xs font-semibold text-slate-400">Número de lote
                <input className={campo} required maxLength={50} value={f.batch_number} onChange={(e) => setF({ ...f, batch_number: e.target.value.toUpperCase() })} placeholder="El de la factura o la etiqueta" />
                {errores.batch_number && <span className="mt-1 block text-rose-300">{errores.batch_number}</span>}
            </label>
            <label className="text-xs font-semibold text-slate-400">Cantidad ({unidad})
                <input className={campo} required type="number" min="0.001" step="0.001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
                {errores.quantity && <span className="mt-1 block text-rose-300">{errores.quantity}</span>}
            </label>
            <label className="text-xs font-semibold text-slate-400">Costo unitario (COP por {unidad})
                <input className={campo} required type="number" min="0" step="0.01" value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} />
                {errores.unit_cost && <span className="mt-1 block text-rose-300">{errores.unit_cost}</span>}
            </label>
            <label className="text-xs font-semibold text-slate-400">Vence
                <input className={campo} required type="date" value={f.expiration_date} onChange={(e) => setF({ ...f, expiration_date: e.target.value })} />
                {errores.expiration_date && <span className="mt-1 block text-rose-300">{errores.expiration_date}</span>}
            </label>
            <label className="text-xs font-semibold text-slate-400 sm:col-span-2">Bodega
                <select className={campo} required value={f.bodega_id} onChange={(e) => setF({ ...f, bodega_id: e.target.value })}>
                    <option value="">Elegir…</option>
                    {bodegas.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errores.bodega_id && <span className="mt-1 block text-rose-300">{errores.bodega_id}</span>}
            </label>
            <div className="flex gap-2 sm:col-span-2">
                <button type="button" onClick={() => setAbierto(false)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Registrar lote'}</button>
            </div>
        </form>
    );
}
