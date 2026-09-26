import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, Save } from 'lucide-react';

interface Props {
    materialId: number;
    unidad: string;
    categoria: string | null;
    minimo: number;
    diasCriticos: number | null;
    /** Umbral que se está aplicando (propio o general). */
    umbral: number;
}

/** Ajustes de control del insumo (solo administrador): categoría, stock mínimo y umbral FEFO propio. */
export default function FigmaMaterialAjustes({ materialId, unidad, categoria, minimo, diasCriticos, umbral }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [form, setForm] = useState({ categoria: categoria ?? '', stock_minimo: minimo ? String(minimo) : '', dias_criticos: diasCriticos ? String(diasCriticos) : '' });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        router.put(`/inventory/material/${materialId}`, form, {
            preserveScroll: true,
            onError: (errs) => setErrores(errs as Record<string, string>),
            onSuccess: () => { setErrores({}); setAbierto(false); },
            onFinish: () => setGuardando(false),
        });
    };

    const campo = 'w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none';

    return (
        <div className="mt-4 rounded-2xl border border-slate-700/40 bg-slate-800/30">
            <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-200">
                <span>Ajustes del insumo <span className="font-normal text-slate-400">· crítico a {umbral} días{diasCriticos ? ' (propio)' : ' (general)'}</span></span>
                <ChevronDown size={16} className={`transition ${abierto ? 'rotate-180' : ''}`} />
            </button>
            {abierto && (
                <form onSubmit={guardar} className="grid grid-cols-1 gap-3 border-t border-slate-700/40 p-4 sm:grid-cols-3">
                    <label className="block text-xs font-semibold text-slate-400">Categoría
                        <input className={`${campo} mt-1`} maxLength={100} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                        {errores.categoria && <span className="mt-1 block text-rose-300">{errores.categoria}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400">Stock mínimo ({unidad})
                        <input className={`${campo} mt-1`} type="number" min={0} step="0.01" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
                        {errores.stock_minimo && <span className="mt-1 block text-rose-300">{errores.stock_minimo}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400">Días críticos
                        <input className={`${campo} mt-1`} type="number" min={1} max={365} step={1} placeholder="Umbral general" value={form.dias_criticos} onChange={(e) => setForm({ ...form, dias_criticos: e.target.value })} />
                        {errores.dias_criticos && <span className="mt-1 block text-rose-300">{errores.dias_criticos}</span>}
                    </label>
                    <p className="text-[11px] text-slate-400 sm:col-span-2">Días críticos: cuántos días antes de vencer un lote de este insumo pasa a crítico. Vacío = el umbral general de Ajustes.</p>
                    <button type="submit" disabled={guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                        <Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </form>
            )}
        </div>
    );
}
