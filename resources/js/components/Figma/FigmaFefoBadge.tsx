import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, Skull } from 'lucide-react';

interface FigmaFefoBadgeProps {
    daysUntilExpiration: number;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    showLabel?: boolean;
}

const FigmaFefoBadge = ({ daysUntilExpiration, size = 'md', showIcon = true, showLabel = true }: FigmaFefoBadgeProps) => {
    const level = daysUntilExpiration < 0
        ? 'vencido'
        : daysUntilExpiration <= 15
            ? 'critico'
            : daysUntilExpiration <= 30
                ? 'warning'
                : 'ok';

    const config = {
        vencido: {
            bg: 'bg-red-500/15 border-red-500/40',
            text: 'text-red-300',
            dot: 'bg-red-500',
            icon: <Skull size={12} className="text-red-500" />,
            label: daysUntilExpiration < 0 ? `VENCIÓ HACE ${Math.abs(daysUntilExpiration)}d` : 'VENCIDO',
        },
        critico: {
            bg: 'bg-red-500/10 border-red-500/25',
            text: 'text-red-400',
            dot: 'bg-red-500 animate-pulse',
            icon: <AlertTriangle size={12} className="text-red-500" />,
            label: `${daysUntilExpiration}d`,
        },
        warning: {
            bg: 'bg-amber-500/10 border-amber-500/25',
            text: 'text-amber-300',
            dot: 'bg-amber-500',
            icon: <Clock size={12} className="text-amber-500" />,
            label: `${daysUntilExpiration}d`,
        },
        ok: {
            bg: 'bg-emerald-500/10 border-emerald-500/25',
            text: 'text-emerald-300',
            dot: 'bg-emerald-500',
            icon: <ShieldCheck size={12} className="text-emerald-500" />,
            label: `${daysUntilExpiration}d`,
        },
    }[level];

    const sizeClasses = {
        sm: 'text-[9px] px-2 py-0.5 gap-1 rounded-full',
        md: 'text-[10px] px-2.5 py-1 gap-1.5 rounded-full',
        lg: 'text-xs px-3 py-1.5 gap-2 rounded-full',
    }[size];

    return (
        <span className={`inline-flex items-center font-black uppercase tracking-wider border ${config.bg} ${config.text} ${sizeClasses}`}>
            {showIcon && config.icon}
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {showLabel && <span>{config.label}</span>}
        </span>
    );
};

export default FigmaFefoBadge;
export type { FigmaFefoBadgeProps };
