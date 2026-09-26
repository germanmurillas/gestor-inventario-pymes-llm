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
    X, BookOpen } from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    label: string;
    view: string;
    href?: string;
    desc?: string;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const DASHBOARD_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
                items: [
            { icon: LayoutGrid, label: 'Tablero', view: 'TABLERO', desc: 'KPIs, métricas y Kardex en tiempo real' },
            { icon: Box, label: 'Inventario', view: 'INVENTARIO', desc: 'Gestionar materiales, lotes y stock' },
            { icon: Search, label: 'Buscar', view: 'BUSCAR', desc: 'Buscar por nombre, código o categoría' },
        ],
    },
    {
        title: 'Análisis',
        items: [
            { icon: MessageSquare, label: 'Asistente', view: 'LLM', desc: 'Consultar el inventario con IA (RAG + LLM)' },
            { icon: BarChart3, label: 'Reportes', view: 'REPORTES', desc: 'Exportar PDF y CSV del inventario' },
            { icon: LayoutGrid, label: 'Kardex', view: 'LOG_MAESTRO', desc: 'Kardex: historial inmutable de movimientos' },
            { icon: Tag, label: 'Etiquetas', view: 'ETIQUETAS', desc: 'Clasificar materiales con tags' },
            { icon: ScanLine, label: 'Escáner QR', view: 'ESCANER', desc: 'Check-in/out de stock por código QR' },
        ],
    },
    {
        title: 'Gestión',
        items: [
            { icon: History, label: 'Historial QR', view: 'SCAN_HISTORY', desc: 'Registro de todos los escaneos QR' },
            { icon: ArrowRightLeft, label: 'Transferencias', view: 'TRANSFERENCIAS', desc: 'Mover stock entre bodegas' },
            { icon: Truck, label: 'Órdenes de compra', view: 'PURCHASE_ORDERS', desc: 'Crear y recibir órdenes de compra' },
            { icon: Printer, label: 'Imprimir etiquetas', view: 'LABELS_PRINT', desc: 'Generar etiquetas con QR para lotes' },
            { icon: Bell, label: 'Alertas', view: 'NOTIFICACIONES', desc: 'Notificaciones de stock bajo y vencimientos' },
            { icon: Settings, label: 'Ajustes', href: '/settings-page', desc: 'Configuración: API Keys, usuarios, LLM' },
            { icon: LayoutGrid, label: 'Kanban', href: '/kanban', desc: 'Tablero Kanban drag & drop con @dnd-kit' },
        ],
    },
];

const KANBAN_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { icon: LayoutGrid, label: 'Tablero',    href: '/dashboard?v=TABLERO' },
            { icon: Box,        label: 'Inventario',  href: '/dashboard?v=INVENTARIO' },
            { icon: Search,     label: 'Buscar',      href: '/dashboard?v=BUSCAR' },
        ],
    },
    {
        title: 'Análisis',
        items: [
            { icon: MessageSquare, label: 'Asistente', href: '/dashboard?v=LLM' },
            { icon: BarChart3,     label: 'Reportes',      href: '/dashboard?v=REPORTES' },
            { icon: LayoutGrid,    label: 'Kardex',   href: '/dashboard?v=LOG_MAESTRO' },
            { icon: Tag,           label: 'Etiquetas',     href: '/dashboard?v=ETIQUETAS' },
            { icon: ScanLine,      label: 'Escáner QR',    href: '/dashboard?v=ESCANER' },
        ],
    },
    {
        title: 'Gestión',
        items: [
            { icon: History,        label: 'Historial QR',    href: '/dashboard?v=SCAN_HISTORY' },
            { icon: ArrowRightLeft, label: 'Transferencias',  href: '/dashboard?v=TRANSFERENCIAS' },
            { icon: Truck,          label: 'Órdenes de compra',  href: '/dashboard?v=PURCHASE_ORDERS' },
            { icon: Printer,        label: 'Imprimir etiquetas', href: '/dashboard?v=LABELS_PRINT' },
            { icon: Bell,           label: 'Alertas',         href: '/dashboard?v=NOTIFICACIONES' },
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
            {/* FIX-UI: shrink-0 — sin él, el header cedía altura y descuadraba el logo
                cuando la lista de navegación desbordaba. */}
            <div className="h-20 shrink-0 flex items-center justify-between px-4 lg:px-6 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0" aria-hidden="true">
                        <Box size={22} strokeWidth={2.5} />
                    </div>
                    <Link
                        href="/dashboard"
                        aria-label="Pymetory, ir al tablero"
                        className={`pm-logo font-display text-2xl tracking-tighter text-white ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
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

            {/* FIX-UI: min-h-0 es obligatorio para que flex-1 + overflow-y-auto funcione
                dentro de un flex-col; sin él, el hijo fuerza altura y empuja el footer.
                overscroll-contain evita que el scroll del sidebar arrastre al <main>. */}
            <nav className="flex-1 min-h-0 px-2 space-y-0.5 overflow-y-auto overscroll-contain custom-scrollbar mt-2">
                {sections.map((section, i) => (
                    <React.Fragment key={section.title}>
                        <div
                            className={`sticky top-0 z-10 bg-obsidiana/95 backdrop-blur-sm px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ${i > 0 ? 'mt-4' : ''} ${sidebarOpen ? 'block' : 'hidden lg:block'}`}
                        >
                            {section.title}
                        </div>
                        {section.items.map((item) => {
                            const isActive = activeView === item.view;
                            // FIX-UI: py-3 -> py-2.5 y transition-all -> transition-colors.
                            // 'transition-all' animaba también width/padding, lo que producía
                            // el temblor de los items al aparecer el scrollbar.
                            const itemClasses = `pm-nav-item w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-sans text-sm font-bold ${isActive ? 'bg-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`;

                            if (onNavigate && !item.href) {
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => handleNav(item.view)}
                                        aria-label={`Ir a ${item.label}`}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={itemClasses}
                                        title={item.desc || ''}
                                    >
                                        <item.icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                                        <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'} tracking-tight`}>{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href || `/dashboard`}
                                    className={itemClasses}
                                    title={item.desc || ''}
                                    aria-label={`Ir a ${item.label}`}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => onMobileClose()}
                                >
                                    <item.icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                                    <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'} tracking-tight`}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </React.Fragment>
                ))}
            </nav>

            <div className="shrink-0 p-4 border-t border-white/5 bg-slate-950/40">
                <div className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 text-xs font-bold capitalize rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <User size={16} />
                    </div>
                    <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} text-left truncate`}>
                        <div className="text-white truncate">{user?.name}</div>
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{user?.role}</div>
                    </div>
                </div>
                <a href="https://tesis.pymetory.com/manual-de-usuario.pdf" target="_blank" rel="noopener"
                    aria-label="Manual de usuario (se abre en una pestaña nueva)"
                    className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all text-[10px] font-black uppercase tracking-widest rounded-lg">
                    <BookOpen size={16} />
                    <span className={`${sidebarOpen ? 'block' : 'hidden lg:block'}`}>Manual de usuario</span>
                </a>
                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="w-full mt-1 flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest rounded-lg"
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
            {/* FIX-UI: shrink-0 (el aside cedía ancho cuando el <main> tenía contenido ancho)
                + transition-[width] en vez de transition-all que re-animaba color/sombra de todo el subárbol. */}
            <aside
                aria-label="Navegación principal"
                className={`pm-chrome h-full shrink-0 bg-obsidiana flex-col z-40 border-r border-white/5 hidden lg:flex overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'w-64' : 'w-20'}`}
            >
                {sidebarContent}
            </aside>

            {/* Mobile sidebar (slide-in overlay) */}
            <aside
                aria-label="Navegación principal móvil"
                className={`pm-chrome h-full bg-obsidiana flex-col z-50 border-r border-white/5 lg:hidden fixed inset-y-0 left-0 w-72 transition-transform duration-300 ease-out flex ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
