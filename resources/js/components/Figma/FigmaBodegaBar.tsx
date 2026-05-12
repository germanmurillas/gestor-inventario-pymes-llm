import React from 'react';
import { Warehouse } from 'lucide-react';

interface BodegaBarProps {
    name: string;
    code?: string;
    percentage: number;
    capacity: number;
    occupied: number;
    status?: string;
}

function barColor(pct: number) {
    if (pct >= 85) return 'from-red-500 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
    if (pct >= 60) return 'from-amber-500 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
    return 'from-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
}

function labelColor(pct: number) {
    if (pct >= 85) return 'text-red-400';
    if (pct >= 60) return 'text-amber-400';
    return 'text-emerald-400';
}

export default function FigmaBodegaBar({ name, code, percentage, capacity, occupied, status }: BodegaBarProps) {
    const clamped = Math.min(Math.max(percentage, 0), 100);

    return (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 rounded-xl p-4 space-y-3 hover:border-slate-600/50 transition-all duration-300 group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                        <Warehouse size={14} />
                    </div>
                    <div>
                        <div className="text-xs font-black text-white uppercase tracking-tight font-display">{name}</div>
                        {code && <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{code}</div>}
                    </div>
                </div>
                <div className={`text-sm font-black ${labelColor(clamped)} font-display`}>
                    {clamped}%
                </div>
            </div>

            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${barColor(clamped)} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${clamped}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{occupied} / {capacity} kg</span>
                {status && (
                    <span className={status === 'active' ? 'text-emerald-500' : 'text-slate-600'}>
                        {status === 'active' ? '· Activa' : '· Inactiva'}
                    </span>
                )}
            </div>
        </div>
    );
}
