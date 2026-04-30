import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Search, Package, Clock, MapPin, AlertTriangle, CheckCircle, Filter, X } from 'lucide-react';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FilterState = 'TODOS' | 'CRITICO' | 'NORMAL' | 'CONSUMED';

// ── Component ─────────────────────────────────────────────────────────────────
const FigmaSearch = ({ lotes = [], bodegas = [] }: { lotes: any[]; bodegas: any[] }) => {
    const [query,         setQuery]         = useState('');
    const [activeFilter,  setActiveFilter]  = useState<FilterState>('TODOS');
    const [bodegaFilter,  setBodegaFilter]  = useState<string>('TODAS');
    const inputRef = useRef<HTMLInputElement>(null);

    const debouncedQuery = useDebounce(query, 280);

    // ── Filtered results ──────────────────────────────────────────────────────
    const filteredResults = useMemo(() => {
        let results = [...lotes];

        // Text search
        if (debouncedQuery.trim()) {
            const s = debouncedQuery.toLowerCase();
            results = results.filter(item =>
                item.codigo?.toLowerCase().includes(s)        ||
                item.lote?.toLowerCase().includes(s)          ||
                item.bodega?.toLowerCase().includes(s)        ||
                item.material?.name?.toLowerCase().includes(s)||
                item.material?.code?.toLowerCase().includes(s)
            );
        }

        // Status filter
        if (activeFilter !== 'TODOS') {
            results = results.filter(item => item.status === activeFilter);
        }

        // Bodega filter
        if (bodegaFilter !== 'TODAS') {
            results = results.filter(item => item.bodega === bodegaFilter);
        }

        return results;
    }, [debouncedQuery, activeFilter, bodegaFilter, lotes]);

    // ── Counts for filter badges ──────────────────────────────────────────────
    const counts = useMemo(() => ({
        total:    lotes.length,
        criticos: lotes.filter(l => l.status === 'CRITICO').length,
        normales: lotes.filter(l => l.status === 'NORMAL').length,
    }), [lotes]);

    const clearSearch = useCallback(() => {
        setQuery('');
        setActiveFilter('TODOS');
        setBodegaFilter('TODAS');
        inputRef.current?.focus();
    }, []);

    // ── Status badge ──────────────────────────────────────────────────────────
    const StatusBadge = ({ status }: { status: string }) => {
        if (status === 'CRITICO') return (
            <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-[8px] font-black rounded-full uppercase tracking-widest border border-red-200">
                <AlertTriangle size={8} /> Crítico
            </span>
        );
        if (status === 'CONSUMED') return (
            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[8px] font-black rounded-full uppercase tracking-widest">Consumido</span>
        );
        return (
            <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase tracking-widest border border-emerald-200">
                <CheckCircle size={8} /> Normal
            </span>
        );
    };

    // ── Days badge ────────────────────────────────────────────────────────────
    const DaysBadge = ({ vencimiento }: { vencimiento: string }) => {
        const days = Math.ceil((new Date(vencimiento).getTime() - Date.now()) / 86400000);
        const color = days <= 15 ? 'text-red-600 bg-red-50 border-red-200'
                    : days <= 30 ? 'text-amber-600 bg-amber-50 border-amber-200'
                    : 'text-slate-400 bg-slate-50 border-slate-200';
        return (
            <span className={`flex items-center gap-1 px-2 py-1 text-[8px] font-black rounded-full uppercase border ${color}`}>
                <Clock size={8} />
                {days > 0 ? `${days}d` : 'VENCIDO'}
            </span>
        );
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">Buscador Inteligente</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Explora materiales, lotes y ubicaciones en tiempo real
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Search size={22} strokeWidth={3} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    id="search-input"
                    placeholder="Nombre del producto, SKU, No. de Lote, Bodega..."
                    className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-20 pr-14 py-6 text-xl shadow-2xl shadow-indigo-100/50 focus:outline-none focus:border-indigo-300 transition-all placeholder:text-slate-300 font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                />
                {(query || activeFilter !== 'TODOS' || bodegaFilter !== 'TODAS') && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-600 transition-colors"
                        title="Limpiar filtros"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Status filters */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-1.5">
                    {([
                        { id: 'TODOS',    label: `Todos (${counts.total})` },
                        { id: 'CRITICO',  label: `Críticos (${counts.criticos})` },
                        { id: 'NORMAL',   label: `Normales (${counts.normales})` },
                    ] as { id: FilterState; label: string }[]).map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                activeFilter === f.id
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Bodega filter */}
                {bodegas.length > 0 && (
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <select
                            value={bodegaFilter}
                            onChange={(e) => setBodegaFilter(e.target.value)}
                            className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none focus:border-indigo-300 transition-all"
                        >
                            <option value="TODAS">Todas las bodegas</option>
                            {bodegas.map((b: any) => (
                                <option key={b.name} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Results count */}
                <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Results Grid */}
            {filteredResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredResults.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                        >
                            {/* Background icon */}
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Package size={80} />
                            </div>

                            <div className="space-y-5 relative z-10">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <span className="inline-flex px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                                        {item.codigo}
                                    </span>
                                    <StatusBadge status={item.status} />
                                </div>

                                {/* Material name */}
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase leading-tight text-sm line-clamp-2">
                                        {item.material?.name || 'Producto'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                        Lote: {item.lote}
                                    </p>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <div className="text-center">
                                        <div className="text-lg font-black text-slate-900">{item.cantidad}</div>
                                        <div className="text-[8px] text-slate-400 font-bold uppercase">Cantidad</div>
                                    </div>
                                    <div className="text-center">
                                        <DaysBadge vencimiento={item.vencimiento} />
                                        <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">Vence</div>
                                    </div>
                                </div>

                                {/* Bodega */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-2xl">
                                    <MapPin size={10} className="text-indigo-600 shrink-0" />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate">
                                        {item.bodega || 'Sin asignar'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 space-y-6 text-slate-300">
                    <Search size={56} strokeWidth={1} />
                    <div className="text-center space-y-2">
                        <p className="text-lg font-black uppercase tracking-tight">Sin resultados</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                            {debouncedQuery
                                ? `No hay lotes que coincidan con "${debouncedQuery}"`
                                : 'No hay lotes disponibles con los filtros seleccionados'
                            }
                        </p>
                    </div>
                    {(debouncedQuery || activeFilter !== 'TODOS' || bodegaFilter !== 'TODAS') && (
                        <button
                            onClick={clearSearch}
                            className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-colors active:scale-95"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FigmaSearch;
