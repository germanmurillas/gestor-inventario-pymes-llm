import React from 'react';
import { LayoutGrid, FileText, Folder, DollarSign, Clock, Package } from 'lucide-react';

const FigmaTablero = ({ stats }: { stats: any }) => {
    // Fallback data if stats are not loaded yet
    const summary = stats?.summary || { totalMaterials: 0, totalLotes: 0, lotesCriticos: 0, totalInventoryValue: 0 };
    const activity = stats?.recentActivity || [];
    const levels = stats?.inventoryLevels || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Resumen de inventario */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Resumen de inventario</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Package size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Insumos</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tighter">{summary.totalMaterials}</div>
                        <div className="text-[10px] text-slate-500 font-medium tracking-tight">Materiales registrados</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <FileText size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Lotes Activos</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tighter">{summary.totalLotes}</div>
                        <div className="text-[10px] text-slate-500 font-medium tracking-tight">En bodegas</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 ring-1 ring-red-100 bg-red-50/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                                <Clock size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">Críticos FEFO</span>
                        </div>
                        <div className="text-2xl font-black text-red-600 tracking-tighter">{summary.lotesCriticos}</div>
                        <div className="text-[10px] text-red-500 font-medium tracking-tight">Próximos a vencer</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                <DollarSign size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Volumen Total</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tighter">{summary.totalInventoryValue} <span className="text-sm font-bold text-slate-400 uppercase">Kg/L</span></div>
                        <div className="text-[10px] text-slate-500 font-medium tracking-tight">Métrica de stock</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Actividad reciente */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Actividad reciente</h3>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                        <div className="divide-y divide-slate-100">
                            {activity.length > 0 ? activity.map((act: any) => (
                                <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <div className="w-6 h-6 border-2 border-indigo-200 rounded-md bg-white"></div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900">{act.material}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{act.action} · Batch: {act.batch}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter bg-slate-100 px-3 py-1 rounded-full">{act.time}</div>
                                </div>
                            )) : (
                                <div className="p-10 text-center text-slate-300 text-sm italic font-medium">No hay actividad reciente registrada.</div>
                            )}
                        </div>
                        <button className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 border-t border-slate-100 transition-all bg-slate-50/30">
                            Ver toda la Actividad
                        </button>
                    </div>
                </div>

                {/* Nivel de Inventario (Top 3) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Nivel de Inventario</h3>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                        {levels.length > 0 ? levels.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{item.name}</span>
                                    <span className="text-xs font-black text-indigo-600">{item.quantity} Kg</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min((item.quantity / 500) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-300 text-xs italic py-10">Cargando niveles...</div>
                        )}
                        <div className="pt-6 border-t border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-4">Estado de Bodega</div>
                             <div className="flex gap-2">
                                 <div className="flex-1 h-20 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col items-center justify-center">
                                     <div className="text-xs font-black text-indigo-600 uppercase tracking-tighter">Bodega A</div>
                                     <div className="text-[10px] font-bold text-indigo-400 uppercase mt-1">Óptimo</div>
                                 </div>
                                 <div className="flex-1 h-20 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col items-center justify-center opacity-50">
                                     <div className="text-xs font-black text-slate-400 uppercase tracking-tighter">Bodega B</div>
                                     <div className="text-[10px] font-bold text-slate-300 uppercase mt-1">Vacío</div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaTablero;
