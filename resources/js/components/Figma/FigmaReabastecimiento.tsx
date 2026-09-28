import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CalendarClock, PackageCheck, PackageX, RefreshCw, TrendingDown } from 'lucide-react';

interface Fila {
    material_id: number;
    codigo: string;
    nombre: string;
    unidad: string;
    categoria: string | null;
    stock: number;
    stock_minimo: number;
    dias_entrega: number | null;
    consumo_diario: number;
    dias_cobertura: number | null;
    fecha_agotamiento: string | null;
    punto_reorden: number | null;
    pedir_antes_de: string | null;
    bajo_minimo: boolean;
    estado: 'pedir' | 'ok' | 'sin_consumo';
}

interface Punto { periodo: string; desde: string; cantidad: number }
type Periodo = 'dia' | 'semana' | 'mes';

const num = (n: number, d = 1) => n.toLocaleString('es-CO', { maximumFractionDigits: d });
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—');

const ESTADOS: Record<Fila['estado'], { texto: string; clase: string }> = {
    pedir: { texto: 'Reponer', clase: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    ok: { texto: 'Cubierto', clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    sin_consumo: { texto: 'Sin consumo', clase: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

/**
 * Reabastecimiento (RF-09 y RF-10): para cada insumo, consumo diario promedio de las
 * últimas 4 semanas según el Kardex, días de cobertura, fecha probable de agotamiento
 * y punto de reorden; y el consumo de un insumo por día, semana o mes.
 */
export default function FigmaReabastecimiento() {
    const [filas, setFilas] = useState<Fila[]>([]);
    const [ventana, setVentana] = useState(28);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtro, setFiltro] = useState<'todos' | 'pedir'>('todos');
    const [seleccion, setSeleccion] = useState<number | null>(null);
    const [periodo, setPeriodo] = useState<Periodo>('semana');
    const [serie, setSerie] = useState<Punto[]>([]);

    const cargar = () => {
        setCargando(true);
        fetch('/proyeccion', { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => {
                setFilas(d.insumos);
                setVentana(d.ventana_dias);
                setError(null);
                setSeleccion((s) => s ?? d.insumos.find((f: Fila) => f.consumo_diario > 0)?.material_id ?? null);
            })
            .catch(() => setError('No se pudo cargar la proyección.'))
            .finally(() => setCargando(false));
    };
    useEffect(cargar, []);

    useEffect(() => {
        if (!seleccion) return;
        fetch(`/proyeccion/${seleccion}/consumo?periodo=${periodo}`, { headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d) => setSerie(d.serie))
            .catch(() => setSerie([]));
    }, [seleccion, periodo]);

    const visibles = useMemo(() => (filtro === 'pedir' ? filas.filter((f) => f.estado === 'pedir') : filas), [filas, filtro]);
    const sel = filas.find((f) => f.material_id === seleccion) ?? null;
    const aReponer = filas.filter((f) => f.estado === 'pedir').length;
    const sinEntrega = filas.filter((f) => f.consumo_diario > 0 && f.dias_entrega === null).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-white">Reabastecimiento</h2>
                    <p className="text-sm text-slate-400">Proyección calculada con el consumo real del Kardex en los últimos {ventana} días (producción, venta, desperdicio y salidas por escáner).</p>
                </div>
                <button onClick={cargar} className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
                    <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} /> Actualizar
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Kpi icono={<PackageX size={18} />} titulo="Insumos por reponer" valor={String(aReponer)} nota="bajo el mínimo o en su punto de reorden" />
                <Kpi icono={<TrendingDown size={18} />} titulo="Con consumo registrado" valor={String(filas.filter((f) => f.consumo_diario > 0).length)} nota={`de ${filas.length} insumos`} />
                <Kpi icono={<CalendarClock size={18} />} titulo="Sin días de entrega" valor={String(sinEntrega)} nota="defínalos en Inventario → Ajustes del insumo" />
            </div>

            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

            {sel && (
                <section className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white">Consumo de {sel.nombre} <span className="font-normal text-slate-400">({sel.unidad})</span></h3>
                        <div role="group" aria-label="Periodo" className="flex rounded-xl border border-slate-700/50 p-0.5 text-xs">
                            {(['dia', 'semana', 'mes'] as Periodo[]).map((p) => (
                                <button key={p} onClick={() => setPeriodo(p)} aria-pressed={periodo === p}
                                    className={`rounded-lg px-3 py-1.5 font-semibold ${periodo === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    {{ dia: 'Diario', semana: 'Semanal', mes: 'Mensual' }[p]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-56" aria-label={`Gráfico de consumo ${periodo} de ${sel.nombre}`} role="img">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--pm-border)" vertical={false} />
                                <XAxis dataKey="periodo" tick={{ fill: 'var(--pm-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: 'var(--pm-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                                <Tooltip cursor={{ fill: 'var(--pm-panel-2)' }} contentStyle={{ background: 'var(--pm-panel)', border: '1px solid var(--pm-border)', borderRadius: 12, color: 'var(--pm-text)' }}
                                    formatter={(v: number) => [`${num(v)} ${sel.unidad}`, 'Consumo']} />
                                <Bar dataKey="cantidad" fill="var(--pm-accent)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                        Promedio {num(sel.consumo_diario, 2)} {sel.unidad}/día · alcanza para {sel.dias_cobertura !== null ? `${num(sel.dias_cobertura)} días (hasta el ${fecha(sel.fecha_agotamiento)})` : '— (sin consumo en la ventana)'}
                        {sel.punto_reorden !== null && ` · punto de reorden ${num(sel.punto_reorden)} ${sel.unidad} con ${sel.dias_entrega} días de entrega`}
                    </p>
                </section>
            )}

            <section className="rounded-2xl border border-slate-700/40 bg-slate-800/30">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 p-4">
                    <h3 className="text-sm font-bold text-white">Insumos</h3>
                    <div role="group" aria-label="Filtro" className="flex rounded-xl border border-slate-700/50 p-0.5 text-xs">
                        {(['todos', 'pedir'] as const).map((f) => (
                            <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f}
                                className={`rounded-lg px-3 py-1.5 font-semibold ${filtro === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                {f === 'todos' ? 'Todos' : `Por reponer (${aReponer})`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de insumos: consumo, cobertura y punto de reorden">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-4 py-2">Insumo</th><th className="px-3 py-2 text-right">Existencia</th>
                                <th className="px-3 py-2 text-right">Consumo/día</th><th className="px-3 py-2 text-right">Cobertura</th>
                                <th className="px-3 py-2">Se agota</th><th className="px-3 py-2 text-right">Punto de reorden</th>
                                <th className="px-3 py-2">Pedir antes de</th><th className="px-3 py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando && filas.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Cargando…</td></tr>}
                            {visibles.map((f) => (
                                <tr key={f.material_id} onClick={() => setSeleccion(f.material_id)}
                                    className={`cursor-pointer border-t border-slate-700/30 hover:bg-slate-800/60 ${f.material_id === seleccion ? 'bg-slate-800/60' : ''}`}>
                                    <td className="px-4 py-2.5"><span className="font-semibold text-white">{f.nombre}</span><span className="block text-[11px] text-slate-400">{f.codigo}{f.categoria ? ` · ${f.categoria}` : ''}</span></td>
                                    <td className="px-3 py-2.5 text-right text-slate-200">{num(f.stock)} {f.unidad}{f.bajo_minimo && <span className="block text-[11px] text-rose-300">mín. {num(f.stock_minimo)}</span>}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{f.consumo_diario > 0 ? num(f.consumo_diario, 2) : '—'}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{f.dias_cobertura !== null ? `${num(f.dias_cobertura)} d` : '—'}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{fecha(f.fecha_agotamiento)}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{f.punto_reorden !== null ? `${num(f.punto_reorden)} ${f.unidad}` : <span className="text-[11px] text-slate-500">sin días de entrega</span>}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-300">{f.estado === 'pedir' ? 'Ya' : fecha(f.pedir_antes_de)}</td>
                                    <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${ESTADOS[f.estado].clase}`}>
                                        {f.estado === 'ok' && <PackageCheck size={12} />}{ESTADOS[f.estado].texto}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <p className="text-xs text-slate-400">El pronóstico es un promedio móvil: supone que el consumo de los próximos días será como el de las últimas {ventana / 7} semanas. Punto de reorden = consumo diario × días de entrega + stock mínimo.</p>
        </div>
    );
}

function Kpi({ icono, titulo, valor, nota }: { icono: React.ReactNode; titulo: string; valor: string; nota: string }) {
    return (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">{icono}{titulo}</div>
            <div className="mt-1 text-2xl font-black text-white">{valor}</div>
            <div className="text-[11px] text-slate-400">{nota}</div>
        </div>
    );
}
