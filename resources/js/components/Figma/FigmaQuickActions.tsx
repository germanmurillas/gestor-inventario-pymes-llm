import React from 'react';
import { Plus, ScanLine, FileText, Zap } from 'lucide-react';

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    shortcut: string;
    color: string;
    onClick: () => void;
}

interface FigmaQuickActionsProps {
    onAction: (action: string) => void;
    isAdmin?: boolean;
}

export default function FigmaQuickActions({ onAction, isAdmin = false }: FigmaQuickActionsProps) {
    const actions: QuickAction[] = [
        {
            icon: <Plus size={16} />,
            label: 'Nuevo Insumo',
            shortcut: 'N',
            color: 'hover:bg-indigo-600 hover:border-indigo-500 text-indigo-400 border-indigo-500/20',
            onClick: () => onAction('INVENTARIO'),
        },
        {
            icon: <ScanLine size={16} />,
            label: 'Escanear QR',
            shortcut: 'Q',
            color: 'hover:bg-cyan-600 hover:border-cyan-500 text-cyan-400 border-cyan-500/20',
            onClick: () => onAction('ESCANER'),
        },
        {
            icon: <FileText size={16} />,
            label: 'Reporte PDF',
            shortcut: 'R',
            color: 'hover:bg-violet-600 hover:border-violet-500 text-violet-400 border-violet-500/20',
            onClick: () => window.open('/inventory/report', '_blank'),
        },
        {
            icon: <Zap size={16} />,
            label: 'Consumo Rápido',
            shortcut: 'C',
            color: 'hover:bg-amber-600 hover:border-amber-500 text-amber-400 border-amber-500/20',
            onClick: () => onAction('INVENTARIO'),
        },
    ];

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={action.onClick}
                    className={`group flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 backdrop-blur-sm border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${action.color} hover:shadow-lg`}
                >
                    <span className="group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                    <span className="hidden sm:inline">{action.label}</span>
                    <kbd className="hidden sm:inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-700/50 text-[9px] font-bold text-slate-400 border border-slate-600/30 ml-1 group-hover:border-white/20 transition-colors">
                        {action.shortcut}
                    </kbd>
                </button>
            ))}
        </div>
    );
}
