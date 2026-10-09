import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { CalendarCheck, X } from 'lucide-react';

/** Confirmar o corregir la fecha de vencimiento de un lote (solo administrador). */
export default function FigmaVencimiento({ lote, onClose }: { lote: any; onClose: () => void }) {
    const [fecha, setFecha] = useState(lote.vencimiento ?? '');
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.patch(`/inventory/lote/${lote.id}/vencimiento`, { expiration_date: fecha }, {
            preserveScroll: true,
            onError: (errs: any) => setError(errs.expiration_date ?? 'Revise la fecha.'),
            onSuccess: () => onClose(),
            onFinish: () => setGuardando(false),
        });
    };
    return createPortal(
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-obsidiana/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-labelledby="venc-titulo" onClick={(e) => e.stopPropagation()} onSubmit={guardar}
                className="w-full max-w-sm space-y-4 rounded-t-2xl border border-slate-700/50 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                    <h2 id="venc-titulo" className="flex items-center gap-2 text-lg font-black text-white"><CalendarCheck size={18} aria-hidden="true" /> Vencimiento del lote {lote.lote}</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-800"><X size={18} /></button>
                </div>
                <label className="block text-sm font-semibold text-slate-300">Fecha de la etiqueta
                    <input type="date" required autoFocus value={fecha} onChange={(e) => setFecha(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5 text-base text-white" />
                    {error && <span role="alert" className="mt-1 block text-sm text-rose-300">{error}</span>}
                </label>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300">Cancelar</button>
                    <button type="submit" disabled={guardando} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Confirmar fecha'}</button>
                </div>
            </form>
        </div>,
        document.body,
    );
}
