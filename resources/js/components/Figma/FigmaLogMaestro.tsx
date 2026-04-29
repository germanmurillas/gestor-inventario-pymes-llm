import React, { useState } from 'react';
import { History, Search, Filter, ArrowLeft, ArrowUpRight, ArrowDownLeft, User, Package, FileText } from 'lucide-react';

const FigmaLogMaestro = ({ movements = [], onBack }: { movements: any[], onBack?: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'entrada' | 'salida'>('all');

    const filteredMovements = movements.filter(m => {
        const matchesSearch = 
            m.material.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.user.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'all' || m.type === filterType;
        
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header section with back button if applicable */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all">
                            <ArrowLeft size={18} className="text-slate-600" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <History size={20} className="text-indigo-600" />
                            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900 font-display">Log Maestro de Movimientos</h2>
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
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setFilterType('all')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setFilterType('entrada')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'entrada' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-600'}`}
                        >
                            Entradas
                        </button>
                        <button 
                            onClick={() => setFilterType('salida')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === 'salida' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-amber-600'}`}
                        >
                            Salidas
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimiento</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumo / Lote</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fecha & Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredMovements.length > 0 ? filteredMovements.map((mov) => (
                                <tr key={mov.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mov.type === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {mov.type === 'entrada' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{mov.action}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{mov.reason || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <Package size={16} className="text-slate-300" />
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{mov.material}</div>
                                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lote: {mov.batch}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                <User size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{mov.user}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`text-sm font-black tracking-tighter ${mov.type === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {mov.type === 'entrada' ? '+' : '-'}{mov.quantity} KG
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="text-[11px] font-bold text-slate-900 uppercase tracking-tighter">{mov.date}</div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{mov.time}</div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <FileText size={48} className="mb-4 opacity-10" />
                                            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">No se encontraron movimientos registrados</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Stats Footer for the Log */}
                <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Mostrando {filteredMovements.length} de {movements.length} transacciones
                    </div>
                    <div className="flex gap-6">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ingresos</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Salidas</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaLogMaestro;
