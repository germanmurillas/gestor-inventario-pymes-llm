import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, ClipboardCheck, FileSpreadsheet, Loader2, PackageSearch, TriangleAlert, Upload } from 'lucide-react';

type Estado = 'ajustar' | 'igual' | 'sin_coincidencia' | 'sin_cantidad' | 'no_numerica' | 'unidad_distinta';

interface FilaServidor {
    fila: number;
    seccion: string | null;
    codigo: string;
    nombre: string;
    presentacion: string | null;
    cantidad: number | null;
    cantidad_texto: string | null;
    material_id: number | null;
    emparejado_por: 'codigo' | 'nombre' | 'parecido' | null;
    sugerencias: { id: number; nombre: string }[];
}

interface Material { id: number; codigo: string; nombre: string; unidad: string; stock: number }

interface Vista {
    archivo: string;
    hojas: string[];
    hoja: number;
    unidad: string;
    columnas: { codigo: string | null; nombre: string; cantidad: string };
    filas: FilaServidor[];
    materiales: Material[];
}

interface Resultado {
    ajustados: { nombre: string; unidad: string; sistema: number; contado: number; diferencia: number }[];
    omitidos: { nombre: string; motivo: string }[];
    movimientos: number;
}

const UNIDADES = ['kg', 'g', 'L', 'mL', 'gal', 'und'];
const FACTORES: Record<string, number> = { 'kg>g': 1000, 'g>kg': 0.001, 'L>mL': 1000, 'mL>L': 0.001 };
const factor = (desde: string, hacia: string) => (desde === hacia ? 1 : FACTORES[`${desde}>${hacia}`] ?? null);
const num = (n: number, d = 2) => n.toLocaleString('es-CO', { maximumFractionDigits: d });
const LETRAS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

const ESTADOS: Record<Estado, { texto: string; clase: string }> = {
    ajustar: { texto: 'Diferencia', clase: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    igual: { texto: 'Coincide', clase: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    sin_coincidencia: { texto: 'Sin insumo', clase: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
    sin_cantidad: { texto: 'Sin cantidad', clase: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
    no_numerica: { texto: 'Revisar cantidad', clase: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    unidad_distinta: { texto: 'Otra unidad', clase: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
};

/**
 * Conteo físico: importa la hoja de cálculo mensual de la bodega (.xlsx o .csv), la compara con el
 * stock de Pymetory y registra las diferencias como ajustes del Kardex (faltantes por FEFO, sobrantes
 * al lote más reciente). Solo administrador. Nada cambia hasta confirmar.
 */
export default function FigmaConciliacion({ onNavigate }: { onNavigate?: (view: string) => void }) {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [unidad, setUnidad] = useState('kg');
    const [vista, setVista] = useState<Vista | null>(null);
    const [asignado, setAsignado] = useState<Record<number, number | null>>({});
    const [marcado, setMarcado] = useState<Record<number, boolean>>({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<Resultado | null>(null);

    const pedirVista = async (extra: Record<string, string> = {}) => {
        if (!archivo) return;
        setCargando(true); setError(null); setResultado(null);
        const datos = new FormData();
        datos.append('archivo', archivo);
        datos.append('unidad', unidad);
        Object.entries(extra).forEach(([k, v]) => datos.append(k, v));
        try {
            const { data } = await axios.post<Vista>('/conciliacion/vista-previa', datos, { headers: { Accept: 'application/json' } });
            setVista(data);
            setAsignado(Object.fromEntries(data.filas.map((f) => [f.fila, f.material_id])));
            // Solo se marcan solas las coincidencias seguras (código o nombre igual); las parecidas, tras revisarlas.
            setMarcado(Object.fromEntries(data.filas.map((f) => [f.fila, f.emparejado_por === 'codigo' || f.emparejado_por === 'nombre'])));
        } catch (e: any) {
            setError(e?.response?.data?.message || 'No se pudo leer el archivo.');
        } finally {
            setCargando(false);
        }
    };

    const materiales = useMemo(() => new Map((vista?.materiales ?? []).map((m) => [m.id, m])), [vista]);

    const filas = useMemo(() => (vista?.filas ?? []).map((f) => {
        const m = asignado[f.fila] ? materiales.get(asignado[f.fila]!) ?? null : null;
        let estado: Estado; let contado: number | null = null; let diferencia: number | null = null;
        if (!m) estado = 'sin_coincidencia';
        else if (f.cantidad === null) estado = f.cantidad_texto ? 'no_numerica' : 'sin_cantidad';
        else {
            const k = factor(vista!.unidad, m.unidad);
            if (k === null) estado = 'unidad_distinta';
            else {
                contado = Math.round(f.cantidad * k * 1000) / 1000;
                diferencia = Math.round((contado - m.stock) * 1000) / 1000;
                estado = Math.abs(diferencia) < 0.001 ? 'igual' : 'ajustar';
            }
        }
        return { ...f, m, estado, contado, diferencia };
    }), [vista, asignado, materiales]);

    const usados = useMemo(() => {
        const n = new Map<number, number>();
        filas.forEach((f) => f.m && n.set(f.m.id, (n.get(f.m.id) ?? 0) + 1));
        return n;
    }, [filas]);
    const aplicables = filas.filter((f) => f.estado === 'ajustar' && marcado[f.fila]);
    const repetidos = aplicables.filter((f) => (usados.get(f.m!.id) ?? 0) > 1);
    const cuenta = (e: Estado[]) => filas.filter((f) => e.includes(f.estado)).length;

    const aplicar = async () => {
        if (!vista || !aplicables.length || repetidos.length) return;
        if (!confirm(`¿Registrar ${aplicables.length} ajuste(s) en el Kardex? Los movimientos quedan registrados y no se pueden borrar; un error se corrige con otro ajuste.`)) return;
        setCargando(true); setError(null);
        try {
            const { data } = await axios.post<Resultado>('/conciliacion/aplicar', {
                referencia: `pestaña «${vista.hojas[vista.hoja]}» de ${vista.archivo}`.slice(0, 200),
                items: aplicables.map((f) => ({ material_id: f.m!.id, contado: f.contado })),
            }, { headers: { Accept: 'application/json' } });
            setResultado(data);
            setVista(null);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'No se pudieron registrar los ajustes.');
        } finally {
            setCargando(false);
        }
    };

    const columnas = vista?.columnas;
    const cambiarColumna = (clave: 'col_codigo' | 'col_nombre' | 'col_cantidad', valor: string) => {
        if (!columnas) return;
        const actual: Record<string, string> = { col_nombre: columnas.nombre, col_cantidad: columnas.cantidad, hoja: String(vista!.hoja) };
        if (columnas.codigo) actual.col_codigo = columnas.codigo; else actual.sin_codigo = '1';
        if (clave === 'col_codigo' && valor === '') { delete actual.col_codigo; actual.sin_codigo = '1'; }
        else { actual[clave] = valor; if (clave === 'col_codigo') delete actual.sin_codigo; }
        pedirVista(actual);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-white">Conteo físico</h2>
                <p className="text-sm text-slate-400">Suba la hoja de cálculo con el conteo de la bodega (.xlsx o .csv: código, insumo y cantidad). Pymetory la compara con el sistema y, si usted confirma, registra cada diferencia como un ajuste del Kardex.</p>
            </div>

            <section className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold text-slate-400">Archivo</span>
                        {/* Botón propio: el del navegador muestra su texto en el idioma del sistema ("Choose File"). */}
                        <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 focus-within:ring-2 focus-within:ring-indigo-500">
                            <span className="rounded-l-xl bg-indigo-600 px-3 py-2 font-semibold text-white">Elegir archivo</span>
                            <span className="truncate text-slate-300">{archivo?.name ?? 'Ningún archivo seleccionado'}</span>
                            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setVista(null); setResultado(null); }} />
                        </span>
                    </label>
                    <label className="block text-sm">
                        <span className="mb-1 block text-xs font-semibold text-slate-400">Unidad de las cantidades</span>
                        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-white">
                            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </label>
                    <button onClick={() => pedirVista()} disabled={!archivo || cargando}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                        {cargando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Ver comparación
                    </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Vista previa sin cambios. Las celdas se leen con su valor (un 0 que Excel muestra como "-" se lee 0); lo que va entre paréntesis en el nombre se toma como presentación.</p>
            </section>

            {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

            {resultado && (
                <section role="status" className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                    <p className="flex items-center gap-2 font-bold text-emerald-300"><CheckCircle2 size={18} /> {resultado.ajustados.length} insumo(s) conciliados con {resultado.movimientos} movimiento(s) de ajuste.</p>
                    {resultado.ajustados.length > 0 && (
                        <ul className="space-y-0.5 text-slate-200">
                            {resultado.ajustados.map((a) => <li key={a.nombre}>{a.nombre}: {num(a.sistema)} → {num(a.contado)} {a.unidad} ({a.diferencia > 0 ? '+' : ''}{num(a.diferencia)})</li>)}
                        </ul>
                    )}
                    {resultado.omitidos.length > 0 && (
                        <ul className="space-y-0.5 text-amber-200">
                            {resultado.omitidos.map((o) => <li key={o.nombre}>{o.nombre}: {o.motivo}</li>)}
                        </ul>
                    )}
                    {onNavigate && <button onClick={() => onNavigate('LOG_MAESTRO')} className="rounded-xl border border-slate-600 px-3 py-1.5 text-slate-200 hover:bg-slate-800">Ver en el Kardex</button>}
                </section>
            )}

            {vista && columnas && (
                <>
                    <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-white"><FileSpreadsheet size={16} /> {vista.archivo}</span>
                        {vista.hojas.length > 1 && (
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-400">Pestaña</span>
                                <select value={vista.hoja} onChange={(e) => pedirVista({ hoja: e.target.value })} className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-1.5 text-white">
                                    {vista.hojas.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                </select>
                            </label>
                        )}
                        {([['col_codigo', 'Código', columnas.codigo], ['col_nombre', 'Insumo', columnas.nombre], ['col_cantidad', 'Cantidad', columnas.cantidad]] as const).map(([clave, texto, valor]) => (
                            <label key={clave} className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-400">Columna {texto}</span>
                                <select value={valor ?? ''} onChange={(e) => cambiarColumna(clave, e.target.value)} className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-1.5 text-white">
                                    {clave === 'col_codigo' && <option value="">(ninguna)</option>}
                                    {LETRAS.map((l) => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </label>
                        ))}
                    </section>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Kpi titulo="Con diferencia" valor={cuenta(['ajustar'])} />
                        <Kpi titulo="Coinciden" valor={cuenta(['igual'])} />
                        <Kpi titulo="Sin insumo en Pymetory" valor={cuenta(['sin_coincidencia'])} />
                        <Kpi titulo="Para revisar" valor={cuenta(['sin_cantidad', 'no_numerica', 'unidad_distinta'])} />
                    </div>

                    <section className="rounded-2xl border border-slate-700/40 bg-slate-800/30">
                        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Comparación del conteo físico con el sistema">
                            <table className="w-full min-w-[860px] text-left text-sm">
                                <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2"><span className="sr-only">Aplicar</span></th>
                                        <th className="px-3 py-2">Fila</th><th className="px-3 py-2">En la hoja</th><th className="px-3 py-2">Insumo en Pymetory</th>
                                        <th className="px-3 py-2 text-right">Contado</th><th className="px-3 py-2 text-right">Sistema</th>
                                        <th className="px-3 py-2 text-right">Diferencia</th><th className="px-3 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filas.map((f) => {
                                        const opciones = f.sugerencias.length ? f.sugerencias.map((s) => materiales.get(s.id)!).filter(Boolean) : [];
                                        const repetido = f.m && (usados.get(f.m.id) ?? 0) > 1;
                                        return (
                                            <tr key={f.fila} className="border-t border-slate-700/30 align-top">
                                                <td className="px-3 py-2.5">
                                                    <input type="checkbox" aria-label={`Aplicar ajuste de la fila ${f.fila}`} disabled={f.estado !== 'ajustar'}
                                                        checked={f.estado === 'ajustar' && !!marcado[f.fila]} onChange={(e) => setMarcado({ ...marcado, [f.fila]: e.target.checked })} />
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-400">{f.fila}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className="font-semibold text-white">{f.nombre}</span>
                                                    <span className="block text-[11px] text-slate-400">{[f.codigo && `cód. ${f.codigo}`, f.presentacion && `presentación ${f.presentacion}`, f.seccion].filter(Boolean).join(' · ')}</span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <select value={asignado[f.fila] ?? ''} aria-label={`Insumo de Pymetory para la fila ${f.fila}`}
                                                        onChange={(e) => { const id = e.target.value ? Number(e.target.value) : null; setAsignado({ ...asignado, [f.fila]: id }); setMarcado({ ...marcado, [f.fila]: !!id }); }}
                                                        className="w-56 rounded-lg border border-slate-700/50 bg-slate-900/40 px-2 py-1 text-xs text-white">
                                                        <option value="">— sin asignar —</option>
                                                        {opciones.length > 0 && <optgroup label="Sugeridos">{opciones.map((m) => <option key={`s${m.id}`} value={m.id}>{m.nombre}</option>)}</optgroup>}
                                                        <optgroup label="Todos">{vista.materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>)}</optgroup>
                                                    </select>
                                                    {f.emparejado_por === 'parecido' && asignado[f.fila] === f.material_id && <span className="mt-1 block text-[11px] text-amber-300">Por parecido del nombre: verifíquelo</span>}
                                                    {repetido && <span className="mt-1 block text-[11px] text-rose-300">Este insumo está en otra fila</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-slate-200">{f.contado !== null ? `${num(f.contado)} ${f.m!.unidad}` : f.cantidad_texto ?? (f.cantidad !== null ? `${num(f.cantidad)} ${vista.unidad}` : '—')}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-300">{f.m ? `${num(f.m.stock)} ${f.m.unidad}` : '—'}</td>
                                                <td className={`px-3 py-2.5 text-right font-semibold ${f.diferencia === null ? 'text-slate-500' : f.diferencia < 0 ? 'text-rose-300' : f.diferencia > 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                                                    {f.diferencia === null ? '—' : `${f.diferencia > 0 ? '+' : ''}${num(f.diferencia)}`}
                                                </td>
                                                <td className="px-3 py-2.5"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${ESTADOS[f.estado].clase}`}>{ESTADOS[f.estado].texto}</span></td>
                                            </tr>
                                        );
                                    })}
                                    {filas.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400"><PackageSearch className="mx-auto mb-1" size={20} />No se encontraron insumos en esta pestaña.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="max-w-2xl text-xs text-slate-400">
                            Faltante: sale de los lotes activos en orden FEFO. Sobrante: entra al lote activo que vence más tarde; si el insumo no tiene lotes activos, no se aplica y hay que registrar un lote con su vencimiento. El sistema solo compara el stock activo (no la cuarentena).
                        </p>
                        <button onClick={aplicar} disabled={!aplicables.length || repetidos.length > 0 || cargando}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                            {repetidos.length ? <TriangleAlert size={16} /> : <ClipboardCheck size={16} />}
                            Registrar {aplicables.length} ajuste(s) en el Kardex
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function Kpi({ titulo, valor }: { titulo: string; valor: number }) {
    return (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/30 p-4">
            <div className="text-xs font-semibold text-slate-400">{titulo}</div>
            <div className="mt-1 text-2xl font-black text-white">{valor}</div>
        </div>
    );
}
