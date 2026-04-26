import React from 'react';
import { LayoutGrid, FileText, Folder, DollarSign, Clock, Package } from 'lucide-react';

const FigmaTablero = ({ stats, user }: { stats: any, user: any }) => {
    // Fallback data if stats are not loaded yet
    const summary = stats?.summary || { totalMaterials: 0, totalLotes: 0, lotesCriticos: 0, totalInventoryValue: 0 };
    const activity = stats?.recentActivity || [];
    const levels = stats?.inventoryLevels || [];

    const isAdmin = user.role === 'admin';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Resumen de inventario */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display">Resumen de inventario</h3>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <button 
                                className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:shadow-sm active:scale-95"
                                onClick={() => alert("Función de Conciliación (#10) habilitada: Permite ajustar stock físico vs lógico.")}
                            >
                                <LayoutGrid size={14} />
                                Conciliación
                            </button>
                        )}
                        {isAdmin && (
                            <a 
                                href="/inventory/report" 
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all glow-indigo hover:scale-105 active:scale-95"
                            >
                                <FileText size={14} />
                                Reporte PDF
                            </a>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-morphism p-6 rounded-[2.5rem] flex flex-col gap-1 hover:border-indigo-200 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <Package size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">Insumos</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter font-display">{summary.totalMaterials}</div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">Catálogo activo</div>
                    </div>

                    <div className="glass-morphism p-6 rounded-[2.5rem] flex flex-col gap-1 hover:border-blue-200 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">Lotes</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter font-display">{summary.totalLotes}</div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">En bodegas</div>
                    </div>

                    <div className="glass-morphism p-6 rounded-[2.5rem] flex flex-col gap-1 bg-red-50/5 border-red-100/50 hover:border-red-200 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                <Clock size={24} />
                            </div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest font-display italic animate-pulse">Críticos</span>
                        </div>
                        <div className="text-3xl font-black text-red-600 tracking-tighter font-display">{summary.lotesCriticos}</div>
                        <div className="text-[10px] text-red-400 font-bold tracking-tight uppercase italic">Riesgo FEFO</div>
                    </div>

                    <div className="glass-morphism p-6 rounded-[2.5rem] flex flex-col gap-1 bg-emerald-50/5 hover:border-emerald-200 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">Stock</span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter font-display">{summary.totalInventoryValue} <span className="text-xs text-slate-400">Kg/L</span></div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">Volumen Total</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Actividad reciente */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display">Kardex de Actividad</h3>
                    <div className="glass-morphism rounded-[2rem] overflow-hidden min-h-[400px]">
                        <div className="divide-y divide-slate-100">
                            {activity.length > 0 ? activity.map((act: any) => (
                                <div key={act.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all group cursor-default">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center group-hover:rotate-3 transition-all duration-500">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${act.action.includes('Ingreso') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {act.action.includes('Ingreso') ? <Package size={18} /> : <FileText size={18} />}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900 tracking-tight">{act.material}</div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{act.action} · Batch: {act.batch}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200/50">{act.time}</div>
                                </div>
                            )) : (
                                <div className="p-10 text-center text-slate-300 text-sm italic font-medium">No hay movimientos registrados.</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/20">
                            <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">
                                Ver historial completo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nivel de Inventario (Top 3) */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display">Insumos Críticos</h3>
                    <div className="glass-morphism rounded-[2rem] p-8 shadow-sm space-y-6">
                        {levels.length > 0 ? levels.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tighter">{item.name}</span>
                                    <span className="text-xs font-black text-indigo-600">{item.quantity} Kg</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.3)] transition-all duration-[1.5s] ease-out"
                                        style={{ width: `${Math.min((item.quantity / 500) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-300 text-xs italic py-10 font-display">Actualizando sincronización...</div>
                        )}
                        <div className="pt-8 border-t border-slate-100">
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Estado de Bodega Real</div>
                             <div className="grid grid-cols-2 gap-3">
                                 {stats?.bodegas?.length > 0 ? stats.bodegas.map((bodega: any, bIdx: number) => (
                                     <div key={bIdx} className="p-4 bg-obsidiana rounded-3xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 shadow-2xl">
                                         <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1.5 z-10">{bodega.name}</div>
                                         <div className="text-[8px] font-black text-indigo-400 uppercase z-10 tracking-widest">{bodega.percentage}% Ocupado</div>
                                         {/* Progress Bar Background (Radial style) */}
                                         <div 
                                            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.8)]"
                                            style={{ width: `${bodega.percentage}%` }}
                                         ></div>
                                         <div 
                                            className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                         ></div>
                                     </div>
                                 )) : (
                                     <div className="col-span-2 text-center text-slate-300 text-[10px] italic py-4">No hay bodegas configuradas.</div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaTablero;
