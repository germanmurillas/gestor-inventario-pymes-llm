import React, { useState, useEffect, useCallback } from 'react';
import { 
    BarChart3, TrendingUp, AlertTriangle, DollarSign, Clock, LayoutGrid,
    FileText, Table, ChevronDown, Calendar, Filter, Download, RefreshCw,
    PackageSearch, ArrowDownToLine, ArrowUpFromLine, Warehouse, Layers
} from 'lucide-react';

type ReportType = 'inventario' | 'movimientos' | 'fefo' | 'consumo' | 'valorizacion' | 'historial';
type ExportFormat = 'pdf' | 'csv';

interface FilterState {
    type: ReportType;
    bodega_id: string;
    material_id: string;
    from: string;
    to: string;
}

interface FilterOptions {
    bodegas: { id: number; name: string; code: string }[];
    materials: { id: number; name: string; code: string }[];
}

interface ReportSummary {
    [key: string]: number | string;
}

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
    { value: 'inventario',   label: 'Inventario Actual',          desc: 'Existencias FEFO con días de vida restante' },
    { value: 'movimientos',  label: 'Historial de Movimientos',   desc: 'Kardex completo de entradas y salidas' },
    { value: 'fefo',         label: 'Lotes por Vencer (FEFO)',    desc: 'Alertas tempranas de vencimiento' },
    { value: 'consumo',      label: 'Consumo por Período',        desc: 'Estadísticas agregadas de despachos' },
    { value: 'valorizacion', label: 'Valorización de Inventario', desc: 'Valor actual por material (AVECO)' },
    { value: 'historial',    label: 'Historial de Valor',         desc: 'Evolución mensual del valor total' },
];

const SUMMARY_LABELS: Record<ReportType, Record<string, string>> = {
    inventario: {
        totalLotes: 'Lotes', totalCantidad: 'Kgs Totales', totalValor: 'Valor Total',
        criticos: 'Críticos FEFO',
    },
    movimientos: {
        total: 'Total Mov.', entradas: 'Entradas', salidas: 'Salidas', totalCantidad: 'Kgs',
    },
    fefo: {
        total: 'En Riesgo', vencidos: 'Vencidos', criticos7dias: '≤7 Días', criticos15dias: '≤15 Días',
    },
    consumo: {
        totalKilosConsumidos: 'Kgs Consumidos', totalOperaciones: 'Ops',
        porProduccion: 'Producción', porVenta: 'Ventas', porAjuste: 'Ajustes',
    },
    valorizacion: {
        totalValorInventario: 'Valor Total', totalMateriales: 'Materiales',
        totalStock: 'Kgs Stock', costoPromedio: 'Costo Prom kg',
    },
    historial: {
        valorActual: 'Valor Hoy', meses: 'Meses Analizados', variacion: 'Variación %',
    },
};

const HistoryChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return null;

    const width = 800;
    const height = 200;
    const padding = 40;
    
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1 || 100;
    const points = data.map((d, i) => ({
        x: padding + (i * (width - 2 * padding)) / (data.length - 1),
        y: height - padding - (d.value * (height - 2 * padding)) / maxValue,
        value: d.value,
        month: d.month
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="bg-obsidiana rounded-3xl p-8 mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-radial-at-t from-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] opacity-60">Historial de Valoración</h4>
                    <p className="text-white/40 text-[9px] font-bold uppercase mt-1">Últimos 12 meses (COP)</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                        <span className="text-white/60 text-[9px] font-black uppercase">Valor Total</span>
                    </div>
                </div>
            </div>
            
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible relative z-10">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(p => (
                    <line 
                        key={p} 
                        x1={padding} y1={padding + (height - 2*padding)*p} 
                        x2={width - padding} y2={padding + (height - 2*padding)*p} 
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                    />
                ))}
                
                {/* Area under line */}
                <path d={areaPath} fill="url(#chartGradient)" />

                {/* Main line */}
                <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                    className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />

                {/* Points */}
                {points.map((p, i) => (
                    <g key={i} className="group/point">
                        <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" className="cursor-pointer transition-all group-hover/point:r-6" />
                        <text x={p.x} y={height - 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">
                            {p.month.split('-')[1]}
                        </text>
                        {/* Tooltip on hover (simplified) */}
                        <g className="opacity-0 group-hover/point:opacity-100 transition-opacity">
                            <rect x={p.x - 30} y={p.y - 30} width="60" height="20" rx="4" fill="#1e1b4b" />
                            <text x={p.x} y={p.y - 17} textAnchor="middle" fill="white" fontSize="8" fontWeight="black">
                                ${Math.round(p.value / 1000)}k
                            </text>
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
};

const FigmaReports = ({ stats }: { stats: any }) => {
    const summary = stats?.summary || {};
    const efficiency = stats?.efficiency || {};
    const bodegas = stats?.bodegas || [];

    // Report filters
    const [filters, setFilters] = useState<FilterState>({
        type: 'inventario',
        bodega_id: '',
        material_id: '',
        from: '',
        to: '',
    });
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        bodegas: [],
        materials: [],
    });
    const [reportData, setReportData] = useState<any[] | null>(null);
    const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Load filter options on mount
    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // Auto-preview when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPreview();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters.type, filters.bodega_id, filters.material_id, filters.from, filters.to]);

    const fetchFilterOptions = async () => {
        try {
            const res = await fetch('/reports/preview?type=inventario');
            const json = await res.json();
            if (json.filters) {
                setFilterOptions(json.filters);
            }
        } catch (e) {
            // Fallback to bodegas from stats if any
            if (bodegas.length > 0) {
                setFilterOptions(prev => ({ ...prev, bodegas }));
            }
        }
    };

    const fetchPreview = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: filters.type });
            if (filters.bodega_id) params.set('bodega_id', filters.bodega_id);
            if (filters.material_id) params.set('material_id', filters.material_id);
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);

            const res = await fetch(`/reports/preview?${params.toString()}`);
            const json = await res.json();
            setReportData(json.data || []);
            setReportSummary(json.summary || {});
            if (json.filters) {
                setFilterOptions(prev => ({
                    bodegas: json.filters.bodegas || prev.bodegas,
                    materials: json.filters.materials || prev.materials,
                }));
            }
        } catch (e) {
            setReportData([]);
            setReportSummary(null);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const handleExport = async (format: ExportFormat) => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ type: filters.type, format });
            if (filters.bodega_id) params.set('bodega_id', filters.bodega_id);
            if (filters.material_id) params.set('material_id', filters.material_id);
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);

            const res = await fetch(`/reports/export?${params.toString()}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
                || `reporte.${format}`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters(prev => ({
            ...prev,
            bodega_id: '',
            material_id: '',
            from: '',
            to: '',
        }));
    };

    const isFiltered = filters.bodega_id || filters.material_id || filters.from || filters.to;

    // ── Render Helpers ────────────────────────────────────────────────────────

    const renderSummaryCard = (key: string, value: number | string, idx: number) => {
        const isMonetary = ['totalValor', 'totalValorInventario', 'costoPromedio', 'totalKilosConsumidos'].includes(key);
        const isKilos = ['totalCantidad', 'totalStock', 'totalKilosConsumidos'].includes(key);
        let display = typeof value === 'number'
            ? (isMonetary ? `$${value.toLocaleString('es-CO')}` : isKilos ? `${Number(value).toFixed(2)} kg` : value)
            : value;
        return (
            <div key={key} className="flex flex-col items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl/5 rounded-2xl min-w-[90px]">
                <div className="text-xl font-black text-white tracking-tight">{display}</div>
                <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider mt-1 text-center">{key}</div>
            </div>
        );
    };

    const labelFor = (key: string) => {
        const labels = SUMMARY_LABELS[filters.type] || {};
        return labels[key] || key;
    };

    // ── Main Render ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <BarChart3 size={24} className="opacity-50 text-indigo-400" />
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Reportes & Analítica</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Visión financiera y operativa de la bodega</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards (always visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 1. Valor Total */}
                <div className="bg-obsidiana text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <DollarSign size={120} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                            <DollarSign size={14} /><span>Valorización Total (AVECO)</span>
                        </div>
                        <div className="text-4xl font-black tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format(summary.totalInventoryValue || 0)}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Base: {summary.totalLotes || 0} Lotes</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase">Costo × cantidad por lote</span>
                        </div>
                    </div>
                </div>

                {/* 2. Eficiencia Operativa */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <TrendingUp size={14} className="text-indigo-400" /><span>Exactitud de Inventario</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-5xl font-black text-white tracking-tighter">{efficiency.accuracy != null ? `${efficiency.accuracy}%` : '—'}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mb-2">Movimientos sin ajuste</div>
                    </div>
                    <div className="relative h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                            style={{ width: `${efficiency.accuracy || 0}%` }}></div>
                    </div>
                </div>

                {/* 3. Rotación */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Clock size={14} className="text-indigo-400" /><span>Rotación (30 días)</span>
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter">{efficiency.turnoverRatio != null ? `${efficiency.turnoverRatio}x` : '—'}</div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                        Costo de lo que salió en los últimos 30 días ÷ valor del inventario actual.
                    </p>
                </div>

                {/* 4. Estado Crítico */}
                <div className="bg-red-500/10 border border-red-500/25 rounded-[2rem] p-8 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                        <AlertTriangle size={14} /><span>Puntos Críticos</span>
                    </div>
                    <div className="text-4xl font-black text-red-300 tracking-tighter">{summary.lotesCriticos || 0} lotes</div>
                    <div className="text-[10px] text-red-300 font-bold uppercase tracking-widest">Por vencer según el umbral de cada insumo</div>
                </div>

                {/* 5. Ocupación de Bodega */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <LayoutGrid size={14} className="text-indigo-400" /><span>Ocupación media de bodegas</span>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tighter">{efficiency.occupancyTotal != null ? `${Math.round(efficiency.occupancyTotal)}%` : '—'}</div>
                    <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000"
                            style={{ width: `${efficiency.occupancyTotal || 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* ── Advanced Reports Section ─────────────────────────────────── */}
            <div className="border-t border-slate-700/50 pt-8">
                <div className="flex items-center gap-2 mb-6">
                    <Layers size={18} className="text-indigo-400" />
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">Reportes Avanzados</h3>
                </div>

                {/* Report Type Selector */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {REPORT_TYPES.map((rt) => (
                        <button
                            key={rt.value}
                            onClick={() => setFilters(prev => ({ ...prev, type: rt.value, bodega_id: '', material_id: '', from: '', to: '' }))}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                ${filters.type === rt.value
                                    ? 'bg-obsidiana text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-slate-500 hover:border-slate-300 hover:text-slate-200'
                                }`}
                        >
                            {rt.label}
                            {filters.type === rt.value && <ChevronDown size={12} />}
                        </button>
                    ))}
                </div>

                {/* Filter Bar */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-200 transition-colors"
                        >
                            <Filter size={14} />
                            Filtros
                            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                        {isFiltered && (
                            <button
                                onClick={clearFilters}
                                className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> Limpiar filtros
                            </button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                            {/* Date From */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Desde</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="date"
                                        value={filters.from}
                                        onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            {/* Date To */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hasta</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="date"
                                        value={filters.to}
                                        onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            {/* Bodega Selector */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                    <Warehouse size={12} className="inline mr-1" />Bodega
                                </label>
                                <select
                                    value={filters.bodega_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, bodega_id: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                >
                                    <option value="">Todas las bodegas</option>
                                    {filterOptions.bodegas.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                            </div>
                            {/* Material Selector */}
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                    <PackageSearch size={12} className="inline mr-1" />Material
                                </label>
                                <select
                                    value={filters.material_id}
                                    onChange={(e) => setFilters(prev => ({ ...prev, material_id: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                >
                                    <option value="">Todos los materiales</option>
                                    {filterOptions.materials.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Summary */}
                {reportSummary && Object.keys(reportSummary).length > 0 && (
                    <div className="bg-obsidiana rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={14} className="text-white/50" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">
                                Resumen — {REPORT_TYPES.find(r => r.value === filters.type)?.label}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(reportSummary).map(([key, val], idx) => (
                                <div key={key} className="flex flex-col items-center justify-center px-5 py-3 bg-slate-900/80 backdrop-blur-xl/5 rounded-2xl min-w-[100px]">
                                    <div className="text-xl font-black text-white tracking-tight">
                                        {key.includes('Valor') || key.includes('Costo')
                                            ? `$${Number(val).toLocaleString('es-CO')}`
                                            : key.includes('Kilos') || key.includes('Cantidad') || key.includes('Stock')
                                                ? `${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`
                                                : val
                                        }
                                    </div>
                                    <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">{labelFor(key)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Export Buttons */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-sm"
                    >
                        <Download size={14} />
                        {exporting ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={exporting || loading}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-sm"
                    >
                        <Table size={14} />
                        {exporting ? 'Exportando...' : 'Exportar CSV'}
                    </button>
                </div>

                {/* Data Preview Table or Chart */}
                {filters.type === 'historial' && reportData && reportData.length > 0 ? (
                    <HistoryChart data={reportData} />
                ) : (
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/50">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <Table size={12} />
                                Vista Previa ({reportData?.length || 0} registros)
                            </div>
                            {loading && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                                    <RefreshCw size={12} className="animate-spin" /> Cargando...
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            {reportData && reportData.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-800/60">
                                            {Object.keys(reportData[0]).map((col) => (
                                                <th key={col} className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                    {col.replace(/_/g, ' ')}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.slice(0, 50).map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                                                {Object.values(row).map((val: any, i) => (
                                                    <td key={i} className="px-4 py-2.5 text-xs text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                                                        {val !== null && val !== undefined ? String(val) : '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center text-slate-300">
                                    <BarChart3 size={32} className="mx-auto mb-3 opacity-30" />
                                    <div className="text-[10px] font-black uppercase tracking-widest">
                                        {loading ? 'Cargando datos...' : 'Sin datos para mostrar'}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-1">
                                        {!loading && 'Selecciona un tipo de reporte y aplica filtros si deseas.'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FigmaReports;
