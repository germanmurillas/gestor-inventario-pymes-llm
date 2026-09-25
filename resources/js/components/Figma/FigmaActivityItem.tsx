import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ActivityItemProps {
    id: number;
    material: string;
    code?: string;
    batch: string;
    user: string;
    quantity: number;
    time: string;
    action: string;
    type?: 'entrada' | 'salida';
}

export default function FigmaActivityItem({ material, code, batch, user, quantity, time, action, type, unit = 'kg' }: ActivityItemProps & { unit?: string }) {
    const isEntrada = type === 'entrada' || action.toLowerCase().includes('ingreso');
    const cantidad = Number(quantity).toLocaleString('es-CO', { maximumFractionDigits: 2 });

    return (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-slate-800/30 transition-all duration-300 group border-b border-slate-700/30 last:border-b-0">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                isEntrada ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
                {isEntrada ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-bold text-white tracking-tight">{material}</span>
                    {code && <span className="hidden sm:inline shrink-0 text-[10px] font-black text-slate-500 uppercase tracking-wider">{code}</span>}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-400">
                    {action} · Lote {batch}<span className="hidden sm:inline"> · {user}</span>
                </div>
            </div>
            <div className="shrink-0 text-right">
                <div className={`text-sm font-black tracking-tight font-display normal-case ${isEntrada ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isEntrada ? '+' : '−'}{cantidad} {unit}
                </div>
                <div className="text-[10px] text-slate-500">{time}</div>
            </div>
        </div>
    );
}
