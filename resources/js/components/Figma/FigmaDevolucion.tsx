import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { Undo2, X } from 'lucide-react';

/**
 * Devolver al lote lo que sobró de la producción (pedido de la empresa, 8-oct-2026): por ejemplo,
 * «de ese bulto me quedaron 3 kilos». Se registra como una entrada nueva en el Kardex.
 */
export default function FigmaDevolucion({ lote, onClose }: { lote: any; onClose: () => void }) {
    const [cantidad, setCantidad] = useState('');
    const [nota, setNota] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const primero = useRef<HTMLInputElement>(null);

    useEffect(() => {
        primero.current?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, []);

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.post(`/inventory/lote/${lote.id}/devolver`, { cantidad, nota }, {
            preserveScroll: true,
            onError: (errs) => setErrores(errs as Record<string, string>),
            onSuccess: () => onClose(),
            onFinish: () => setGuardando(false),
        });
    };

    const campo = 'mt-1 w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5 text-base text-white focus:border-indigo-400 focus:outline-none';
    return createPortal(
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-obsidiana/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-labelledby="devolucion-titulo" onClick={(e) => e.stopPropagation()} onSubmit={guardar}
                className="w-full max-w-md space-y-4 rounded-t-2xl border border-slate-700/50 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 id="devolucion-titulo" className="flex items-center gap-2 text-lg font-black text-white"><Undo2 size={18} aria-hidden="true" /> Devolver sobrante al lote</h2>
                        <p className="text-sm text-slate-300">{lote.material_name ?? lote.nombre} · lote {lote.lote}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-800"><X size={18} /></button>
                </div>
                <label className="block text-sm font-semibold text-slate-300">Cantidad que sobró ({lote.unit || 'kg'})
                    <input ref={primero} className={campo} type="number" inputMode="decimal" min="0.001" step="0.001" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                    {errores.cantidad && <span role="alert" className="mt-1 block text-sm text-rose-300">{errores.cantidad}</span>}
                </label>
                <label className="block text-sm font-semibold text-slate-300">Nota (opcional)
                    <input className={campo} maxLength={255} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: sobró de la producción de la tarde" />
                </label>
                <p className="text-xs text-slate-400">Vuelve al mismo lote y queda como una entrada en el Kardex. No se puede devolver más de lo que salió de este lote.</p>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300">Cancelar</button>
                    <button type="submit" disabled={guardando} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? 'Guardando…' : 'Devolver'}</button>
                </div>
            </form>
        </div>,
        document.body,
    );
}
