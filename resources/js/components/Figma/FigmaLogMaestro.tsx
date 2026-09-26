import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { History, Search, ArrowLeft, ArrowUpRight, ArrowDownLeft, User, Package, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

type Pagina = { movimientos: any[]; pagina: number; paginas: number; total: number; total_general: number };

// El Kardex se consulta por páginas de 50 movimientos, filtrado en el servidor.
const FigmaLogMaestro = ({ onBack }: { onBack?: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'entrada' | 'salida'>('all');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<Pagina | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(false);

    // Espera a que el usuario deje de escribir antes de consultar.
    useEffect(() => {
        const t = setTimeout(() => { setBusqueda(searchTerm.trim()); setPagina(1); }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        axios.get('/inventory/kardex', { params: { q: busqueda || undefined, tipo: filterType === 'all' ? undefined : filterType, page: pagina } })
            .then(({ data }) => { if (vigente) { setDatos(data); setError(false); } })
            .catch(() => { if (vigente) setError(true); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [busqueda, filterType, pagina]);

    const filteredMovements = datos?.movimientos ?? [];
    const cambiarTipo = (tipo: 'all' | 'entrada' | 'salida') => { setFilterType(tipo); setPagina(1); };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header section with back button if applicable */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button aria-label="Volver" onClick={onBack} className="p-2 hover:bg-slate-700/60 rounded-xl border border-slate-700/50 transition-all">
                            <ArrowLeft size={18} className="text-slate-300" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <History size={20} className="text-indigo-400" />
                            <h2 className="text-xl font-bold uppercase tracking-tight text-white font-display">Kardex de movimientos</h2>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kardex Histórico Completo de la PYME</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar por material, lote o usuario..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
                        <button 
                            onClick={() => cambiarTipo('all')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-slate-900/80 backdrop-blur-xl text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => cambiarTipo('entrada')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'entrada' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-400'}`}
                        >
                            Entradas
                        </button>
                        <button 
                            onClick={() => cambiarTipo('salida')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'salida' ? 'bg-amber-700 text-white shadow-sm' : 'text-slate-400 hover:text-amber-400'}`}
                        >
                            Salidas
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col relative">
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de movimientos (desplazable)">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-slate-800/50/80 border-b border-slate-700/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimiento</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumo / Lote</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fecha & Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/40">
                            {filteredMovements.length > 0 ? filteredMovements.map((mov) => (
                                <tr key={mov.id} className="hover:bg-slate-800/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mov.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {mov.type === 'entrada' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white uppercase tracking-tight">{mov.action}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{mov.reason || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <Package size={16} className="text-slate-300" />
                                            <div>
                                                <div className="text-sm font-bold text-slate-300">{mov.material}</div>
                                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Lote: {mov.batch}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-slate-800/60 rounded-full flex items-center justify-center text-slate-400">
                                                <User size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{mov.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`text-sm font-black tracking-tighter ${mov.type === 'entrada' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {mov.type === 'entrada' ? '+' : '-'}{mov.quantity} {mov.unit ?? ''}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="text-[11px] font-bold text-white uppercase tracking-tighter">{mov.date}</div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{mov.time}</div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <FileText size={48} className="mb-4 opacity-10" />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">{cargando ? 'Cargando movimientos…' : error ? 'No se pudo cargar el Kardex. Intenta de nuevo.' : 'No se encontraron movimientos registrados'}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Stats Footer for the Log */}
                <div className="bg-slate-800/50 border-t border-slate-700/50 px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]" aria-live="polite">
                            {datos ? `Mostrando ${filteredMovements.length} de ${datos.total} transacciones${datos.total !== datos.total_general ? ` (de ${datos.total_general} en total)` : ''}` : 'Cargando…'}
                        </div>
                        {datos && datos.paginas > 1 && (
                            <div className="flex items-center gap-2">
                                <button aria-label="Página anterior" disabled={pagina <= 1 || cargando} onClick={() => setPagina(pagina - 1)}
                                    className="p-1.5 rounded-lg border border-slate-700/50 text-slate-300 hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Página {datos.pagina} de {datos.paginas}</span>
                                <button aria-label="Página siguiente" disabled={pagina >= datos.paginas || cargando} onClick={() => setPagina(pagina + 1)}
                                    className="p-1.5 rounded-lg border border-slate-700/50 text-slate-300 hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-6">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ingresos</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Salidas</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaLogMaestro;
