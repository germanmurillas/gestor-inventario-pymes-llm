import React from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface FefoTimerProps {
    material: string;
    codigo?: string;
    lote: string;
    diasRestantes: number;
    vencimiento: string;
    bodega?: string;
    nivel: 'critico' | 'warning' | 'info';
}

export default function FigmaFefoTimer({ material, codigo, lote, diasRestantes, vencimiento, bodega, nivel }: FefoTimerProps) {
    const maxDays = 30;
    const progress = Math.min(Math.max((diasRestantes / maxDays) * 100, 0), 100);

    const config = {
        critico: {
            ring: 'stroke-red-500',
            track: 'stroke-red-500/15',
            text: 'text-red-400',
            badge: 'bg-red-500/15 text-red-400 border-red-500/30',
            bg: 'bg-red-500/5 border-red-500/20',
            icon: <AlertTriangle size={14} className="text-red-400 animate-pulse" />,
            label: 'CRÍTICO',
        },
        warning: {
            ring: 'stroke-amber-500',
            track: 'stroke-amber-500/15',
            text: 'text-amber-400',
            badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            bg: 'bg-amber-500/5 border-amber-500/20',
            icon: <AlertCircle size={14} className="text-amber-400" />,
            label: 'ATENCIÓN',
        },
        info: {
            ring: 'stroke-blue-400',
            track: 'stroke-blue-500/15',
            text: 'text-blue-400',
            badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            bg: 'bg-blue-500/5 border-blue-500/20',
            icon: <Clock size={14} className="text-blue-400" />,
            label: 'PRÓXIMO',
        },
    }[nivel];

    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:border-slate-600/50 ${config.bg}`}>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="4" className={config.track} />
                    <circle
                        cx="32" cy="32" r={radius}
                        fill="none" strokeWidth="4"
                        strokeLinecap="round"
                        className={config.ring}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-black font-display ${config.text}`}>
                        {diasRestantes <= 0 ? 'HOY' : `${diasRestantes}d`}
                    </span>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate tracking-tight">{material}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${config.badge}`}>
                        {config.label}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    {codigo && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{codigo}</span>}
                    <span className="text-[9px] text-slate-600">·</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lote {lote}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">{vencimiento}</span>
                    {bodega && (
                        <>
                            <span className="text-[9px] text-slate-700">·</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">{bodega}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
