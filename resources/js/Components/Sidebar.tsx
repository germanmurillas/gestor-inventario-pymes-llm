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
    Truck,
    Printer,
    X,
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
        title: 'Analisis',
        items: [
            { icon: MessageSquare, label: 'Asistente RAG', view: 'LLM' },
            { icon: BarChart3, label: 'Reportes', view: 'REPORTES' },
            { icon: LayoutGrid, label: 'Log Maestro', view: 'LOG_MAESTRO' },
            { icon: Tag, label: 'Etiquetas', view: 'ETIQUETAS' },
            { icon: ScanLine, label: 'Escaner QR', view: 'ESCANER' },
        ],
    },
    {
        title: 'Gestion',
        items: [
            { icon: History, label: 'Historial QR', view: 'SCAN_HISTORY' },
            { icon: ArrowRightLeft, label: 'Transferencias', view: 'TRANSFERENCIAS' },
            { icon: Truck, label: 'Ordenes Compra', view: 'PURCHASE_ORDERS' },
            { icon: Printer, label: 'Imprimir Labels', view: 'LABELS_PRINT' },
            { icon: Bell, label: 'Alertas', view: 'NOTIFICACIONES' },
            { icon: Settings, label: 'Ajustes', href: '/settings-page' },
            { icon: LayoutGrid, label: 'Kanban', href: '/kanban' },
        ],
    },
];

const KANBAN_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { icon: LayoutGrid, label: 'Tablero',    href: '/dashboard' },
            { icon: Box,        label: 'Inventario',  href: '/dashboard' },
            { icon: Search,     label: 'Buscar',      href: '/dashboard' },
        ],
    },
    {
        title: 'Analisis',
        items: [
            { icon: MessageSquare, label: 'Asistente RAG', href: '/dashboard' },
            { icon: BarChart3,     label: 'Reportes',      href: '/dashboard' },
            { icon: LayoutGrid,    label: 'Log Maestro',   href: '/dashboard' },
            { icon: Tag,           label: 'Etiquetas',     href: '/dashboard' },
            { icon: ScanLine,      label: 'Escaner QR',    href: '/dashboard' },
        ],
    },
    {
        title: 'Gestion',
        items: [
            { icon: History,        label: 'Historial QR',    href: '/dashboard' },
            { icon: ArrowRightLeft, label: 'Transferencias',  href: '/dashboard' },
            { icon: Truck,          label: 'Ordenes Compra',  href: '/dashboard' },
            { icon: Printer,        label: 'Imprimir Labels', href: '/dashboard' },
            { icon: Bell,           label: 'Alertas',         href: '/dashboard' },
            { icon: Settings,       label: 'Ajustes',         href: '/settings-page' },
            { icon: LayoutGrid,     label: 'Kanban',          href: '/kanban' },
        ],
    },
];

export default function Sidebar({
    sidebarOpen,
    mobileOpen,
    user,
    activeView,
    mode,
    onNavigate,
    onMobileClose,
}: {
    sidebarOpen: boolean;
    mobileOpen: boolean;
    user: { name: string; role: string };
    activeView: string;
    mode: 'dashboard' | 'kanban';
    onNavigate?: (view: string) => void;
    onMobileClose: () => void;
}) {
    const sections = mode === 'dashboard' ? DASHBOARD_SECTIONS : KANBAN_SECTIONS;

    const handleNav = (view: string) => {
        onNavigate?.(view);
        onMobileClose();
    };

    const sidebarContent = (
        <>
            <div className="h-20 flex items-center justify-between px-4 lg:px-6 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0" aria-hidden="true">
                        <Box size={22} strokeWidth={2.5} />
                    </div>
                    <Link
                        href="/dashboard"
                        className={`font-display text-2xl tracking-tighter text-white ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
                        role="banner"
                    >
                        Pymetory
                    </Link>
                </div>
                <button
                    onClick={onMobileClose}
                    className="lg:hidden text-slate-400 hover:text-white p-2"
                    aria-label="Cerrar menú"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scrollbar mt-2">
                {sections.map((section, i) => (
                    <React.Fragment key={section.title}>
                        <div
                            className={`px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ${i > 0 ? 'mt-4' : ''} ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
                        >
                            {section.title}
                        </div>
                        {section.items.map((item) => {
                            const isActive = activeView === item.view;
                            const itemClasses = `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-bold ${isActive ? 'bg-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`;

                            if (onNavigate && !item.href) {
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNav(item.view)}
                                        aria-label={`Ir a ${item.label}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={itemClasses}
                                    >
                                        <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} aria-hidden="true" />
                                        <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'} tracking-tight`}>{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href || `/dashboard`}
                                    className={itemClasses}
                                    aria-label={`Ir a ${item.label}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => onMobileClose()}
                                >
                                    <item.icon size={18} className={isActive ? 'text-champan' : 'text-slate-500'} aria-hidden="true" />
                                    <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'} tracking-tight`}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/40">
                <div className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 text-xs font-bold capitalize rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <User size={16} />
                    </div>
                    <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} text-left truncate`}>
                        <div className="text-white truncate">{user?.name}</div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{user?.role}</div>
                    </div>
                </div>
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest rounded-lg"
                >
                    <LogOut size={16} />
                    <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'}`}>Cerrar Sesión</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile overlay backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            {/* Desktop sidebar */}
            <aside
                role="navigation"
                aria-label="Navegación principal"
                className={`h-full bg-obsidiana flex-col z-40 border-r border-white/5 hidden lg:flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'w-64' : 'w-20'}`}
            >
                {sidebarContent}
            </aside>

            {/* Mobile sidebar (slide-in overlay) */}
            <aside
                role="navigation"
                aria-label="Navegación principal"
                className={`h-full bg-obsidiana flex-col z-50 border-r border-white/5 lg:hidden fixed inset-y-0 left-0 w-72 transition-transform duration-300 ease-out flex ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
