import React from 'react';
import { Package, ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';

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

export default function FigmaActivityItem({ material, code, batch, user, quantity, time, action, type }: ActivityItemProps) {
    const isEntrada = type === 'entrada' || action.toLowerCase().includes('ingreso');

    return (
        <div className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition-all duration-300 group border-b border-slate-700/30 last:border-b-0">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                    isEntrada ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                    {isEntrada ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">{material}</span>
                        {code && <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{code}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{action}</span>
                        <span className="text-[9px] text-slate-600">·</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lote {batch}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500">
                    <User size={10} />
                    <span className="font-bold uppercase tracking-wider">{user}</span>
                </div>
                <div className={`text-xs font-black tracking-tight font-display ${isEntrada ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isEntrada ? '+' : '-'}{quantity} kg
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/30">
                    {time}
                </div>
            </div>
        </div>
    );
}
