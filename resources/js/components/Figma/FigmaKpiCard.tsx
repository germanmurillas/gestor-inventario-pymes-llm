import React, { useRef, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type KpiColor = 'indigo' | 'emerald' | 'red' | 'amber' | 'blue';
type TrendDirection = 'up' | 'down' | 'neutral';

interface FigmaKpiCardProps {
    icon: React.ReactNode;
    count: string | number;
    label: string;
    color?: KpiColor;
    trend?: TrendDirection;
    trendValue?: string;
}

const colorMap: Record<KpiColor, { bg: string; text: string; border: string; glow: string }> = {
    indigo:   { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'shadow-[0_0_30px_-8px_rgba(99,102,241,0.3)]' },
    emerald:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-[0_0_30px_-8px_rgba(16,185,129,0.3)]' },
    red:      { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-[0_0_30px_-8px_rgba(239,68,68,0.3)]' },
    amber:    { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-[0_0_30px_-8px_rgba(245,158,11,0.3)]' },
    blue:     { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-[0_0_30px_-8px_rgba(59,130,246,0.3)]' },
};

const trendIcon = (dir: TrendDirection) => {
    if (dir === 'up') return <TrendingUp size={12} className="text-emerald-400" />;
    if (dir === 'down') return <TrendingDown size={12} className="text-red-400" />;
    return <Minus size={12} className="text-slate-500" />;
};

const trendColor = (dir: TrendDirection) => {
    if (dir === 'up') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (dir === 'down') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
};

export default function FigmaKpiCard({ icon, count, label, color = 'indigo', trend, trendValue }: FigmaKpiCardProps) {
    const c = colorMap[color];
    const cardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 12;
        const rotateY = (centerX - x) / 12;
        const shadowX = (centerX - x) / 3;
        const shadowY = (y - centerY) / 3;
        setStyle({
            transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`,
            boxShadow: `${shadowX}px ${shadowY}px 20px 0px rgba(0,0,0,0.3)`,
            transition: 'transform 0.1s ease-out',
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setStyle({
            transform: 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
            boxShadow: '',
            transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.5s ease',
        });
    }, []);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
            className={`bg-slate-800/50 backdrop-blur-xl border ${c.border} rounded-2xl p-5 flex flex-col gap-3 hover:border-[var(--champagne)]/30 transition-colors duration-300 group ${c.glow} relative overflow-hidden cursor-default`}
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
                <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                {trend && trendValue && (
                    <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${trendColor(trend)}`}>
                        {trendIcon(trend)}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <div className="text-2xl font-black text-white tracking-tighter font-display">{count}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</div>
            </div>
        </div>
    );
}
