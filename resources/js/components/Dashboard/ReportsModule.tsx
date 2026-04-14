import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp, AlertOctagon } from 'lucide-react';

export default function ReportsModule() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Datos simulados paramátricos para Barras CSS
    const weeklyData = [
        { day: 'LUN', val: 40, critical: false },
        { day: 'MAR', val: 80, critical: false },
        { day: 'MIE', val: 100, critical: true }, // Merma pico
        { day: 'JUE', val: 30, critical: false },
        { day: 'VIE', val: 50, critical: false },
        { day: 'SAB', val: 20, critical: false },
    ];

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-[#111111]/10 font-sans animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-[#111111]/10 bg-[#E8E4DD] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="font-serif italic text-3xl text-[#111111] flex items-center gap-3">
                        <BarChart3 className="text-[#E63B2E]" /> Inteligencia Logística
                    </h2>
                    <p className="font-mono text-sm opacity-60">Análisis FEFO y Mermas Historicas</p>
                </div>
                <div className="flex bg-[#111111] text-[#F5F3EE] rounded-lg p-1 font-mono text-xs font-bold">
                    <button className="px-4 py-2 bg-white/20 rounded shadow">ULT 7 DÍAS</button>
                    <button className="px-4 py-2 hover:bg-white/10 rounded transition-colors">MES</button>
                    <button className="px-4 py-2 hover:bg-white/10 rounded transition-colors">YTD</button>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Tarjeta de Métricas Rápidas */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#111111] text-[#F5F3EE] p-6 rounded-xl border border-[#111111]/10 shadow-[0_10px_30px_rgba(17,17,17,0.1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="font-mono text-xs opacity-60 uppercase tracking-widest mb-2">Tasa de Desperdicio</div>
                            <div className="text-5xl font-bold font-sans flex items-end gap-3">
                                1.2% <TrendingDown size={24} className="text-green-400 mb-2" />
                            </div>
                            <div className="mt-4 font-mono text-[10px] bg-green-400/20 text-green-400 px-3 py-1.5 rounded inline-block">
                                -0.4% vs semana anterior
                            </div>
                            <AlertOctagon size={180} className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                        </div>

                        <div className="bg-[#F5F3EE] p-6 rounded-xl border border-[#111111]/10 hover:-translate-y-1 transition-transform">
                            <div className="font-mono text-xs opacity-60 uppercase tracking-widest mb-2 text-[#111111]">Lotes Salvados (FEFO)</div>
                            <div className="text-5xl font-bold font-sans text-[#111111] flex items-end gap-3">
                                48 <TrendingUp size={24} className="text-[#E63B2E] mb-2" />
                            </div>
                            <div className="mt-4 font-mono text-[10px] border border-[#111111]/20 text-[#111111]/80 px-3 py-1.5 rounded inline-block">
                                Algoritmo predictivo activo
                            </div>
                        </div>
                    </div>

                    {/* Gráfico de Barras CSS Nativo (Brutalist) */}
                    <div className="lg:col-span-2 bg-[#F5F3EE] border border-[#111111]/10 rounded-xl p-8 flex flex-col">
                        <div className="flex justify-between items-end mb-12">
                            <div>
                                <h3 className="font-serif italic text-2xl text-[#111111]">Pico de Salidas Kgs</h3>
                                <p className="font-mono text-xs opacity-60 mt-1">Volumen desplazado por día (Kilos)</p>
                            </div>
                            <div className="font-sans font-bold text-3xl text-[#111111]">14,200<span className="text-lg opacity-50">kg</span></div>
                        </div>

                        {/* Flexbox Chart */}
                        <div className="flex-1 flex items-end justify-between gap-4 h-64 relative border-b-2 border-[#111111] pb-2">
                            {/* Grid lines */}
                            <div className="absolute w-full top-0 border-b border-dashed border-[#111111]/10"></div>
                            <div className="absolute w-full top-1/2 border-b border-dashed border-[#111111]/10"></div>
                            
                            {weeklyData.map((data, idx) => (
                                <div key={data.day} className="flex flex-col items-center flex-1 h-full justify-end group">
                                    <div className="w-full relative px-2 md:px-4 h-full flex items-end">
                                        <div 
                                            className={`w-full relative transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[height] shadow-sm ${data.critical ? 'bg-[#E63B2E]' : 'bg-[#111111]'}`}
                                            style={{ 
                                                height: mounted ? `${data.val}%` : '0%', 
                                                transitionDelay: `${idx * 100}ms` 
                                            }}
                                        >
                                            {/* Toolbar hover abstract */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#111111] text-[#F5F3EE] font-mono text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                {data.val * 120} KGs
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 font-mono text-[10px] font-bold text-[#111111]/60">
                                        {data.day}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
