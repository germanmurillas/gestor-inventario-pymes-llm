import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, Save } from 'lucide-react';

interface Props {
    materialId: number;
    unidad: string;
    categoria: string | null;
    minimo: number;
    diasCriticos: number | null;
    /** Días que tarda el proveedor en entregar; con ellos se calcula el punto de reorden. */
    diasEntrega?: number | null;
    /** Umbral que se está aplicando (propio o general). */
    umbral: number;
    /** Categorías ya usadas, sugeridas al escribir para no crear duplicados. */
    categorias?: string[];
}

/** Ajustes de control del insumo (solo administrador): categoría, stock mínimo, umbral FEFO propio y días de entrega. */
export default function FigmaMaterialAjustes({ materialId, unidad, categoria, minimo, diasCriticos, diasEntrega = null, umbral, categorias = [], presentacion = null, factor = null, vidaUtil = null, codigoBarras = null }: Props & { presentacion?: string | null; factor?: number | null; vidaUtil?: number | null; codigoBarras?: string | null }) {
    const [abierto, setAbierto] = useState(false);
    const [form, setForm] = useState({ categoria: categoria ?? '', stock_minimo: minimo ? String(minimo) : '', dias_criticos: diasCriticos ? String(diasCriticos) : '', dias_entrega: diasEntrega !== null && diasEntrega !== undefined ? String(diasEntrega) : '', presentacion_nombre: presentacion ?? '', presentacion_cantidad: factor ? String(factor) : '', vida_util_dias: vidaUtil ? String(vidaUtil) : '', codigo_barras: codigoBarras ?? '' });
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
                <form onSubmit={guardar} className="grid grid-cols-1 gap-3 border-t border-slate-700/40 p-4 sm:grid-cols-4">
                    <label className="block text-xs font-semibold text-slate-400">Categoría
                        <input className={`${campo} mt-1`} list={`categorias-${materialId}`} autoComplete="off" maxLength={100} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                        <datalist id={`categorias-${materialId}`}>{categorias.map((c) => <option key={c} value={c} />)}</datalist>
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
                    <label className="block text-xs font-semibold text-slate-400">Días de entrega
                        <input className={`${campo} mt-1`} type="number" min={0} max={365} step={1} placeholder="Sin dato" value={form.dias_entrega} onChange={(e) => setForm({ ...form, dias_entrega: e.target.value })} />
                        {errores.dias_entrega && <span className="mt-1 block text-rose-300">{errores.dias_entrega}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400">Presentación (p. ej. bulto, caja)
                        <input className={`${campo} mt-1`} maxLength={30} placeholder="Sin presentación" value={form.presentacion_nombre} onChange={(e) => setForm({ ...form, presentacion_nombre: e.target.value })} />
                        {errores.presentacion_nombre && <span className="mt-1 block text-rose-300">{errores.presentacion_nombre}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400">{unidad} por presentación
                        <input className={`${campo} mt-1`} type="number" min={0.001} step="0.001" placeholder="Ej: 50" value={form.presentacion_cantidad} onChange={(e) => setForm({ ...form, presentacion_cantidad: e.target.value })} />
                        {errores.presentacion_cantidad && <span className="mt-1 block text-rose-300">{errores.presentacion_cantidad}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400">Vida útil (días)
                        <input className={`${campo} mt-1`} type="number" min={1} max={3650} step={1} placeholder="Sin dato" value={form.vida_util_dias} onChange={(e) => setForm({ ...form, vida_util_dias: e.target.value })} />
                        {errores.vida_util_dias && <span className="mt-1 block text-rose-300">{errores.vida_util_dias}</span>}
                    </label>
                    <label className="block text-xs font-semibold text-slate-400 sm:col-span-3">Código de barras de la bolsa (los números debajo de las barras)
                        <input className={`${campo} mt-1`} inputMode="numeric" maxLength={14} placeholder="Ej: 7709869863117" value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value.replace(/\D/g, '') })} />
                        {errores.codigo_barras && <span className="mt-1 block text-rose-300">{errores.codigo_barras}</span>}
                    </label>
                    <p className="text-[11px] text-slate-400 sm:col-span-3">Presentación: si llega en bultos de 50 kg, escriba «bulto» y 50; así se puede registrar en bultos y el sistema lo guarda en {unidad}. Días críticos: cuántos días antes de vencer un lote de este insumo pasa a crítico (vacío = umbral general). Días de entrega: lo que tarda el proveedor desde el pedido; con ellos se calcula el punto de reorden en Reabastecimiento.</p>
                    <button type="submit" disabled={guardando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                        <Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                </form>
            )}
        </div>
    );
}
