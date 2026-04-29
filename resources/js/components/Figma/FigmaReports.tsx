import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Clock, LayoutGrid } from 'lucide-react';

const FigmaReports = ({ stats }: { stats: any }) => {
    const summary = stats?.summary || {};
    const efficiency = stats?.efficiency || {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-8">
                 <BarChart3 size={24} className="opacity-50 text-indigo-600" />
                 <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Reportes & Analítica</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Visión financiera y operativa de la bodega</p>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* 1. Valor Total (Finanzas) */}
                <div className="bg-obsidiana text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <DollarSign size={120} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                            <DollarSign size={14} />
                            <span>Valorización Total (AVECO)</span>
                        </div>
                        <div className="text-4xl font-black tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format(summary.totalInventoryValue || 0)}
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-white/40 uppercase">Base: {summary.totalLotes || 0} Lotes</span>
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">+4.2% Eficiencia</span>
                        </div>
                    </div>
                </div>

                {/* 2. Eficiencia Operativa */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <TrendingUp size={14} className="text-indigo-600" />
                        <span>Exactitud de Inventario</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-5xl font-black text-slate-900 tracking-tighter">{efficiency.accuracy || 0}%</div>
                        <div className="text-[10px] font-black text-indigo-600 uppercase mb-2">Objetivo: 99%</div>
                    </div>
                    <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                            style={{ width: `${efficiency.accuracy || 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* 3. Rotación (Turnover) */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Clock size={14} className="text-indigo-600" />
                        <span>Índice de Rotación (FEFO)</span>
                    </div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter">{efficiency.turnoverRatio || 0}x</div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">
                        Velocidad promedio de despacho desde el ingreso del lote.
                    </p>
                </div>

                {/* 4. Estado Crítico (Alertas) */}
                <div className="bg-red-50 border border-red-100 rounded-[2rem] p-8 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">
                        <AlertTriangle size={14} />
                        <span>Puntos Críticos</span>
                    </div>
                    <div className="text-4xl font-black text-red-700 tracking-tighter">{summary.lotesCriticos || 0} Materiales</div>
                    <div className="text-[10px] text-red-500 font-bold uppercase tracking-widest italic">Acción requerida inmediata</div>
                </div>

                {/* 5. Ocupación de Bodega */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <LayoutGrid size={14} className="text-indigo-600" />
                        <span>Ocupación Global</span>
                    </div>
                    <div className="text-4xl font-black text-slate-900 tracking-tighter">{Math.round(efficiency.occupancyTotal || 0)}%</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-slate-900 transition-all duration-1000" 
                            style={{ width: `${efficiency.occupancyTotal || 0}%` }}
                        ></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FigmaReports;
