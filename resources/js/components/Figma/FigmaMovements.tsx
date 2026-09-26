import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Package, User, Hash, Calendar, ArrowDownToLine, ArrowUpFromLine, AlertCircle, Info } from 'lucide-react';

const FigmaMovements = ({ lote, onBack }: { lote: any, onBack: () => void }) => {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (lote?.id) {
            fetch(`/reports/preview?type=movimientos&material_id=${lote.material_id || ''}&lote_id=${lote.id}`)
                .then(res => res.json())
                .then(json => {
                    setMovements(json.data || []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [lote]);

    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button aria-label="Volver" 
                    onClick={onBack}
                    className="w-12 h-12 bg-slate-900/80 backdrop-blur-xl hover:bg-slate-800/50 border border-slate-700/50 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                >
                    <ArrowLeft size={20} className="text-slate-300 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight font-display">Auditoría de Lote</h2>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                        <span className="text-indigo-400">Lote #{lote.lote || lote.id}</span>
                        <span className="opacity-30">•</span>
                        <span>{lote.bodega}</span>
                        <span className="opacity-30">•</span>
                        <span>{lote.codigo}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Product Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-8 shadow-sm space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-[5rem] -mr-16 -mt-16 opacity-50" />
                        
                        <div className="aspect-square bg-slate-800/50 rounded-3xl border border-slate-700/50 flex items-center justify-center relative z-10 overflow-hidden">
                            {lote.photo_url ? (
                                <img src={lote.photo_url} alt={lote.material_name} className="w-full h-full object-cover" />
                            ) : (
                                <Package size={64} className="text-slate-200" />
                            )}
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Material</label>
                                <div className="text-lg font-black text-white leading-tight">{lote.material_name}</div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Stock Actual</label>
                                    <div className="text-xl font-black text-white">{lote.cantidad} <span className="text-[10px] text-slate-400 uppercase">KG</span></div>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Costo Unitario</label>
                                    <div className="text-xl font-black text-white">${new Intl.NumberFormat('es-CO').format(lote.unit_cost || 0)}</div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-700/50">
                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    <Calendar size={12} className="text-indigo-500" />
                                    Vencimiento
                                </div>
                                <div className="text-sm font-bold text-slate-300">{lote.vencimiento}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movements List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={14} /> Historial del Kardex
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full">
                            {movements.length} Registros
                        </span>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[9px] tracking-widest">Operación</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[9px] tracking-widest">Responsable</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[9px] tracking-widest">Fecha & Hora</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[9px] tracking-widest">Cantidad</th>
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase text-[9px] tracking-widest">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/40">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando Kardex...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : movements.length > 0 ? (
                                        movements.map((mov, idx) => (
                                            <tr key={mov.id} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                            mov.type === 'entrada' ? 'bg-emerald-500/10 text-emerald-400' : 
                                                            mov.type === 'salida' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                                                        }`}>
                                                            {mov.type === 'entrada' ? <ArrowDownToLine size={14} /> : 
                                                             mov.type === 'salida' ? <ArrowUpFromLine size={14} /> : <AlertCircle size={14} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white uppercase tracking-tight">{mov.type}</div>
                                                            <div className="text-[9px] text-slate-400 font-medium">{mov.reason || 'Sin observación'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-800/60 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400">
                                                            {mov.user?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-300">{mov.user?.name || 'Sistema'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs font-bold text-slate-300">{mov.fecha}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`text-xs font-black ${mov.type === 'entrada' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {mov.type === 'entrada' ? '+' : '-'}{mov.quantity} {lote?.unit || 'kg'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xs font-black text-white">{mov.quantity_new} {lote?.unit || 'kg'}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <Info size={48} className="text-slate-300" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron movimientos para este lote.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaMovements;