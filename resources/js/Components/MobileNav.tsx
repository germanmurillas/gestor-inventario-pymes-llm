import React, { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import gsap from 'gsap';
import {
    ArrowRightLeft, BarChart3, Bell, BookOpen, Box, History, LayoutGrid, LogOut, MessageSquare, MoreHorizontal,
    ClipboardCheck, Printer, ScanLine, ScrollText, Search, Settings, Tag, TrendingDown, Truck, Columns3, X,
} from 'lucide-react';

type Item = { icon: React.ElementType; label: string; view?: string; href?: string; admin?: boolean };

/** Nombres legibles de cada vista del tablero (también se usan como título en el encabezado). */
export const VIEW_LABELS: Record<string, string> = {
    TABLERO: 'Tablero', INVENTARIO: 'Inventario', BUSCAR: 'Buscar', LLM: 'Asistente (IA)', REPORTES: 'Reportes', REABASTECIMIENTO: 'Reabastecimiento',
    LOG_MAESTRO: 'Kardex', ETIQUETAS: 'Etiquetas', ESCANER: 'Escanear código', SCAN_HISTORY: 'Historial QR',
    TRANSFERENCIAS: 'Transferencias', PURCHASE_ORDERS: 'Órdenes de compra', LABELS_PRINT: 'Imprimir etiquetas',
    NOTIFICACIONES: 'Alertas', CONCILIACION: 'Conteo físico',
};

const PRINCIPALES: Item[] = [
    { icon: LayoutGrid, label: 'Tablero', view: 'TABLERO' },
    { icon: Box, label: 'Inventario', view: 'INVENTARIO' },
    { icon: ScanLine, label: 'Escanear', view: 'ESCANER' },
    { icon: MessageSquare, label: 'Asistente IA', view: 'LLM' },
];

const GRUPOS: { titulo: string; items: Item[] }[] = [
    { titulo: 'Operación', items: [
        { icon: Search, label: 'Buscar', view: 'BUSCAR' },
        { icon: ArrowRightLeft, label: 'Transferencias', view: 'TRANSFERENCIAS' },
        { icon: Truck, label: 'Órdenes de compra', view: 'PURCHASE_ORDERS' },
        { icon: ClipboardCheck, label: 'Conteo físico', view: 'CONCILIACION', admin: true },
        { icon: History, label: 'Historial QR', view: 'SCAN_HISTORY' },
    ] },
    { titulo: 'Control', items: [
        { icon: ScrollText, label: 'Kardex', view: 'LOG_MAESTRO' },
        { icon: BarChart3, label: 'Reportes', view: 'REPORTES' },
        { icon: TrendingDown, label: 'Reabastecimiento', view: 'REABASTECIMIENTO' },
        { icon: Bell, label: 'Alertas', view: 'NOTIFICACIONES' },
        { icon: Columns3, label: 'Kanban', href: '/kanban' },
    ] },
    { titulo: 'Etiquetas y sistema', items: [
        { icon: Tag, label: 'Etiquetas', view: 'ETIQUETAS' },
        { icon: Printer, label: 'Imprimir etiquetas', view: 'LABELS_PRINT' },
        { icon: Settings, label: 'Ajustes', href: '/settings-page' },
    ] },
];

interface Props {
    activeView?: string;
    /** En el tablero cambia de vista sin recargar; en otras páginas navega a /dashboard?v=VISTA. */
    onNavigate?: (view: string) => void;
    user?: { name?: string; role?: string };
}

export default function MobileNav({ activeView, onNavigate, user }: Props) {
    const [abierto, setAbierto] = useState(false);
    const sheetRef = useRef<HTMLDivElement>(null);
    const fondoRef = useRef<HTMLDivElement>(null);

    const ir = (item: Item) => {
        setAbierto(false);
        if (item.href) return router.visit(item.href);
        if (onNavigate) onNavigate(item.view!);
        else router.visit(`/dashboard?v=${item.view}`);
    };

    useEffect(() => {
        if (!abierto || !sheetRef.current) return;
        gsap.fromTo(fondoRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(sheetRef.current, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.out' });
        gsap.fromTo(sheetRef.current.querySelectorAll('[data-mas-item]'), { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.35, stagger: 0.025, ease: 'power2.out', delay: 0.12 });
    }, [abierto]);

    const cerrar = () => {
        if (!sheetRef.current) return setAbierto(false);
        gsap.to(fondoRef.current, { opacity: 0, duration: 0.2 });
        gsap.to(sheetRef.current, { yPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: () => setAbierto(false) });
    };

    const enMas = !PRINCIPALES.some((p) => p.view === activeView);

    return (
        <>
            {/* Barra inferior */}
            <nav aria-label="Navegación principal" className="pm-chrome fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-obsidiana/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
                <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
                    {PRINCIPALES.map((item) => {
                        const Icon = item.icon;
                        const activo = activeView === item.view;
                        if (item.view === 'ESCANER') {
                            return (
                                <li key={item.label} className="flex justify-center">
                                    <button onClick={() => ir(item)} aria-label="Escanear código QR"
                                        className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50 ring-4 ring-obsidiana transition active:scale-95">
                                        <Icon size={24} />
                                    </button>
                                </li>
                            );
                        }
                        return (
                            <li key={item.label}>
                                <button onClick={() => ir(item)} aria-current={activo ? 'page' : undefined}
                                    className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${activo ? 'text-indigo-300' : 'text-slate-400'}`}>
                                    <Icon size={21} />
                                    {item.label}
                                </button>
                            </li>
                        );
                    })}
                    <li>
                        <button onClick={() => setAbierto(true)} aria-expanded={abierto}
                            className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${enMas ? 'text-indigo-300' : 'text-slate-400'}`}>
                            <MoreHorizontal size={21} />
                            Más
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Panel "Más" */}
            {abierto && (
                <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Más módulos">
                    <div ref={fondoRef} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cerrar} />
                    <div ref={sheetRef} className="pm-chrome absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-obsidiana px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-600" />
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white">{user?.name ?? 'Usuario'}</p>
                                <p className="text-xs capitalize text-slate-400">{user?.role ?? ''}</p>
                            </div>
                            <button onClick={cerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-300"><X size={18} /></button>
                        </div>
                        {GRUPOS.map((g) => (
                            <section key={g.titulo} className="mb-5">
                                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">{g.titulo}</h2>
                                <div className="grid grid-cols-4 gap-2">
                                    {g.items.filter((item) => !item.admin || user?.role === 'admin').map((item) => {
                                        const Icon = item.icon;
                                        const activo = activeView === item.view;
                                        return (
                                            <button key={item.label} data-mas-item onClick={() => ir(item)}
                                                className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-semibold leading-tight transition active:scale-95 ${activo ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200' : 'border-white/5 bg-slate-800/50 text-slate-300'}`}>
                                                <Icon size={20} />
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                        <a href="https://tesis.pymetory.com/manual-de-usuario.pdf" target="_blank" rel="noopener" data-mas-item
                            className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700/50 bg-slate-800/50 py-3 text-sm font-bold text-slate-200">
                            <BookOpen size={17} /> Manual de usuario
                        </a>
                        <Link href="/logout" method="post" as="button" data-mas-item
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-3 text-sm font-bold text-rose-300">
                            <LogOut size={17} /> Cerrar sesión
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
