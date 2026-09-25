import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, MapPin, Package, Search, ShieldAlert, X } from 'lucide-react';

function useDebounce<T>(value: T, delay = 250): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

type Filtro = 'TODOS' | 'CRITICO' | 'NORMAL' | 'CUARENTENA';

interface LoteBusqueda {
    id: number;
    codigo: string;
    material_name: string;
    categoria?: string | null;
    unit: string;
    lote: string;
    cantidad: number;
    vencimiento: string;
    days_until_expiration: number;
    bodega: string;
    status: 'CRITICO' | 'NORMAL';
    estado?: string;
    photo_url?: string | null;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Búsqueda sobre los lotes con existencias: insumo, código, lote, categoría o bodega. */
const FigmaSearch = ({ lotes = [] }: { lotes: LoteBusqueda[] }) => {
    const [query, setQuery] = useState('');
    const [filtro, setFiltro] = useState<Filtro>('TODOS');
    const [bodega, setBodega] = useState('TODAS');
    const inputRef = useRef<HTMLInputElement>(null);
    const q = useDebounce(query);

    // Solo lotes con existencias; los consumidos quedan en el Kardex.
    const disponibles = useMemo(() => lotes.filter((l) => Number(l.cantidad) > 0 && l.estado !== 'consumed'), [lotes]);
    const bodegas = useMemo(() => Array.from(new Set(disponibles.map((l) => l.bodega))).sort(), [disponibles]);

    const cumpleFiltro = (l: LoteBusqueda, f: Filtro) =>
        f === 'TODOS' ? true : f === 'CUARENTENA' ? l.estado === 'quarantined' : l.status === f && l.estado !== 'quarantined';

    const resultados = useMemo(() => {
        const s = normalizar(q.trim());
        return disponibles.filter((l) =>
            (!s || [l.material_name, l.codigo, l.lote, l.bodega, l.categoria ?? ''].some((v) => normalizar(v).includes(s)))
            && cumpleFiltro(l, filtro)
            && (bodega === 'TODAS' || l.bodega === bodega));
    }, [q, filtro, bodega, disponibles]);

    const conteo = (f: Filtro) => disponibles.filter((l) => cumpleFiltro(l, f)).length;

    const limpiar = useCallback(() => {
        setQuery(''); setFiltro('TODOS'); setBodega('TODAS');
        inputRef.current?.focus();
    }, []);

    const hayFiltros = !!query || filtro !== 'TODOS' || bodega !== 'TODAS';

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Buscar</h2>
                <p className="mt-1 text-xs text-slate-400">Lotes con existencias, ordenados por vencimiento (FEFO).</p>
            </div>

            <div className="relative">
                <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input ref={inputRef} type="search" id="search-input" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Insumo, código, lote, categoría o bodega…"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-4 pl-12 pr-12 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
                {hayFiltros && (
                    <button onClick={limpiar} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
                        <X size={18} />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {([['TODOS', 'Todos'], ['CRITICO', 'Por vencer'], ['NORMAL', 'Vigentes'], ['CUARENTENA', 'Cuarentena']] as [Filtro, string][]).map(([id, txt]) => (
                    <button key={id} onClick={() => setFiltro(id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filtro === id ? 'border-indigo-400/50 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                        {txt} <span className="opacity-60">{conteo(id)}</span>
                    </button>
                ))}
                <label className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                    <MapPin size={14} />
                    <select value={bodega} onChange={(e) => setBodega(e.target.value)} aria-label="Filtrar por bodega"
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-400 focus:outline-none">
                        <option value="TODAS">Todas las bodegas</option>
                        {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                </label>
            </div>

            <p className="text-xs text-slate-500">{resultados.length} lote{resultados.length !== 1 ? 's' : ''}</p>

            {resultados.length > 0 ? (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {resultados.map((l) => {
                        const dias = l.days_until_expiration;
                        const cuarentena = l.estado === 'quarantined';
                        const tono = cuarentena ? 'text-amber-300' : l.status === 'CRITICO' ? 'text-rose-300' : 'text-slate-400';
                        return (
                            <li key={l.id} className="flex gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-3 transition hover:border-indigo-400/40">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                                    {l.photo_url ? <img src={l.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={22} className="m-auto mt-5 text-slate-300" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">{l.codigo}{l.categoria ? ` · ${l.categoria}` : ''}</p>
                                    <p className="truncate text-sm font-bold text-white">{l.material_name}</p>
                                    <p className="mt-0.5 text-xs text-slate-400"><span className="font-semibold text-slate-200">{Number(l.cantidad).toLocaleString('es-CO')} {l.unit}</span> · lote {l.lote}</p>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                        <span className={`inline-flex items-center gap-1 ${tono}`}>
                                            {cuarentena ? <ShieldAlert size={12} /> : l.status === 'CRITICO' ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                            {cuarentena ? 'En cuarentena' : dias < 0 ? 'Vencido' : dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}
                                        </span>
                                        <span className="inline-flex min-w-0 items-center gap-1 text-slate-500"><MapPin size={12} /><span className="truncate">{l.bodega}</span></span>
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-700 px-6 py-16 text-center">
                    <Search size={28} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-200">Sin resultados</p>
                    <p className="text-xs text-slate-400">{q ? `Ningún lote coincide con “${q}”.` : 'No hay lotes con los filtros elegidos.'}</p>
                    {hayFiltros && <button onClick={limpiar} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Limpiar filtros</button>}
                </div>
            )}
        </div>
    );
};

export default FigmaSearch;
