import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Box,
    LayoutGrid,
    Search,
    Tag,
    BarChart3,
    MessageSquare,
    Bell,
    Settings,
    User,
    LogOut,
    ScanLine,
    History,
    ArrowRightLeft,
} from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    label: string;
    view: string;
    href?: string;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const DASHBOARD_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { icon: LayoutGrid, label: 'Tablero', view: 'TABLERO' },
            { icon: Box, label: 'Inventario', view: 'INVENTARIO' },
            { icon: Search, label: 'Buscar', view: 'BUSCAR' },
        ],
    },
    {
        title: 'Análisis',
        items: [
            { icon: MessageSquare, label: 'Asistente RAG', view: 'LLM' },
            { icon: BarChart3, label: 'Reportes', view: 'REPORTES' },
            { icon: LayoutGrid, label: 'Log Maestro', view: 'LOG_MAESTRO' },
            { icon: Tag, label: 'Etiquetas', view: 'ETIQUETAS' },
            { icon: ScanLine, label: 'Escáner QR', view: 'ESCANER' },
        ],
    },
    {
        title: 'Gestión',
        items: [
            { icon: History, label: 'Historial QR', view: 'SCAN_HISTORY' },
            { icon: ArrowRightLeft, label: 'Transferencias', view: 'TRANSFERENCIAS' },
            { icon: Bell, label: 'Alertas', view: 'NOTIFICACIONES' },
            { icon: Settings, label: 'Ajustes', view: 'CONFIGURACION' },
            { icon: LayoutGrid, label: 'Kanban', view: '/kanban', href: '/kanban' },
        ],
    },
];

const KANBAN_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { icon: LayoutGrid, label: 'Tablero', view: '/dashboard', href: '/dashboard' },
            { icon: LayoutGrid, label: 'Kanban', view: '/kanban', href: '/kanban' },
        ],
    },
    {
        title: 'Análisis',
        items: [
            { icon: MessageSquare, label: 'Asistente RAG', view: '/dashboard', href: '/dashboard' },
            { icon: BarChart3, label: 'Reportes', view: '/dashboard', href: '/dashboard' },
        ],
    },
    {
        title: 'Gestión',
        items: [
            { icon: Bell, label: 'Alertas', view: '/dashboard', href: '/dashboard' },
            { icon: Settings, label: 'Ajustes', view: '/dashboard', href: '/dashboard' },
        ],
    },
];

export default function Sidebar({
    sidebarOpen,
    user,
    activeView,
    mode,
    onNavigate,
}: {
    sidebarOpen: boolean;
    user: { name: string; role: string };
    activeView: string;
    mode: 'dashboard' | 'kanban';
    onNavigate?: (view: string) => void;
}) {
    const sections = mode === 'dashboard' ? DASHBOARD_SECTIONS : KANBAN_SECTIONS;

    return (
        <aside
            role="navigation"
            aria-label="Navegación principal"
            className={`${sidebarOpen ? 'w-64' : 'w-20'} h-full bg-obsidiana flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 border-r border-white/5`}
        >
            <div className="h-20 flex items-center px-6 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white glow-indigo" aria-hidden="true">
                        <Box size={22} strokeWidth={2.5} />
                    </div>
                    <Link
                        href="/dashboard"
                        className={`font-display text-2xl tracking-tighter text-white ${sidebarOpen ? 'block' : 'hidden'}`}
                        role="banner"
                    >
                        Pymetory
                    </Link>
                </div>
            </div>

            <div className="flex-1 px-3 space-y-1.5 overflow-y-auto mt-4 custom-scrollbar">
                {sections.map((section, i) => (
                    <React.Fragment key={section.title}>
                        <div
                            className={`px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ${i > 0 ? 'mt-6' : ''} ${sidebarOpen ? 'block' : 'hidden'}`}
                        >
                            {section.title}
                        </div>
                        {section.items.map((item) => {
                            const isActive = activeView === item.view;
                            const itemClasses = `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-bold ${isActive ? 'bg-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`;

                            if (item.href) {
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={itemClasses}
                                        aria-label={`Ir a ${item.label}`}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <item.icon size={18} className={isActive ? 'text-champan' : 'text-slate-500'} aria-hidden="true" />
                                        <span className={`${sidebarOpen ? 'block' : 'hidden'} tracking-tight`}>{item.label}</span>
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={item.label}
                                    onClick={() => onNavigate?.(item.view)}
                                    aria-label={`Ir a ${item.label}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={itemClasses}
                                >
                                    <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} aria-hidden="true" />
                                    <span className={`${sidebarOpen ? 'block' : 'hidden'} tracking-tight`}>{item.label}</span>
                                </button>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/40">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all text-xs font-bold capitalize rounded-xl hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <User size={16} />
                    </div>
                    <div className={`${sidebarOpen ? 'block' : 'hidden'} text-left`}>
                        <div className="text-white truncate">{user?.name}</div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{user?.role}</div>
                    </div>
                </button>
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest rounded-lg"
                >
                    <LogOut size={16} />
                    <span className={`${sidebarOpen ? 'block' : 'hidden'}`}>Cerrar Sesión</span>
                </Link>
            </div>
        </aside>
    );
}
