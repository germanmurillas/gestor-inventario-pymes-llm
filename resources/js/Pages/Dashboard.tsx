import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import gsap from 'gsap';
import Sidebar from '../Components/Sidebar';
import MobileNav, { VIEW_LABELS } from '../Components/MobileNav';
import { Boxes } from 'lucide-react';

// Figma Components
import FigmaTablero from '../components/Figma/FigmaTablero';
import FigmaInventario from '../components/Figma/FigmaInventario';
import FigmaReports from '../components/Figma/FigmaReports';
import FigmaLLM from '../components/Figma/FigmaLLM';
import FigmaNotifications from '../components/Figma/FigmaNotifications';
import FigmaSearch from '../components/Figma/FigmaSearch';
import FigmaLabels from '../components/Figma/FigmaLabels';
import FigmaLogMaestro from '../components/Figma/FigmaLogMaestro';
import FigmaQRScanner from '../components/Figma/FigmaQRScanner';
import FigmaScanHistory from '../components/Figma/FigmaScanHistory';
import FigmaTransferForm from '../components/Figma/FigmaTransferForm';
import FigmaPurchaseOrders from '../components/Figma/FigmaPurchaseOrders';
import FigmaLabelPrint from '../components/Figma/FigmaLabelPrint';
import FigmaBodegaManager from '../components/Figma/FigmaBodegaManager';

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'NOTIFICACIONES' | 'LOG_MAESTRO' | 'ESCANER' | 'SCAN_HISTORY' | 'TRANSFERENCIAS' | 'PURCHASE_ORDERS' | 'LABELS_PRINT';

export default function Dashboard({ auth, initialLotes, dashboardStats }: { auth: any, initialLotes: any[], dashboardStats: any }) {
    const [lotes, setLotes] = useState(initialLotes || []);
    const [stats, setStats] = useState(dashboardStats || null);

    // Sync state when Inertia props change (Reactivity fix)
    useEffect(() => {
        setLotes(initialLotes || []);
    }, [initialLotes]);

    useEffect(() => {
        setStats(dashboardStats || null);
    }, [dashboardStats]);

    // ?v=VISTA permite volver a una vista concreta desde otras páginas (Kanban, Ajustes).
    const [activeView, setActiveView] = useState<ViewMode>(() => {
        const v = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('v') : null;
        return (v && v in VIEW_LABELS ? v : 'TABLERO') as ViewMode;
    });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [bodegaFiltro, setBodegaFiltro] = useState<string | null>(null);
    const [gestorBodegas, setGestorBodegas] = useState<'nueva' | number | null | false>(false);
    const abrirBodega = (code: string) => { setBodegaFiltro(code); setActiveView('INVENTARIO'); };
    const [mobileOpen, setMobileOpen] = useState(false);
    const viewRef = useRef<HTMLDivElement>(null);
    const user = auth?.user || { name: 'Invitado', role: 'operario' };

    const toggleSidebar = () => {
        if (window.innerWidth >= 1024) {
            setSidebarOpen(!sidebarOpen);
        } else {
            setMobileOpen(!mobileOpen);
        }
    };

    // GSAP View Transition
    useEffect(() => {
        if (viewRef.current) {
            gsap.fromTo(viewRef.current,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' }
            );
        }
    }, [activeView]);

    return (
        <div className="flex h-screen overflow-hidden font-sans bg-obsidiana text-white relative">
            {/* ── Aurora Background ── */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.12)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.1)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '4s' }} />
                <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.06)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
            </div>
            <Head title={`${VIEW_LABELS[activeView] ?? activeView} | Pymetory`} />

            <Sidebar
                sidebarOpen={sidebarOpen}
                mobileOpen={mobileOpen}
                user={user}
                activeView={activeView}
                mode="dashboard"
                onNavigate={setActiveView}
                onMobileClose={() => setMobileOpen(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                <header className="h-14 lg:h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 z-40 bg-obsidiana/60 backdrop-blur-xl border-slate-700/30 text-white">
                    <div className="flex items-center gap-3 lg:gap-6">
                        <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'} className="hidden lg:inline-flex p-2 rounded-xl transition-all hover:scale-110 active:scale-95 hover:bg-slate-800 text-slate-400">
                            <Menu size={20} aria-hidden="true" />
                        </button>
                        <span className="lg:hidden grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><Boxes size={16} /></span>
                        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
                             <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest italic text-slate-500">Pymetory /</span>
                             <h1 className="text-sm lg:text-xs font-black lg:uppercase tracking-tight lg:tracking-widest text-white">{VIEW_LABELS[activeView] ?? activeView}</h1>
                        </nav>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={viewRef} className="px-4 pt-4 pb-28 sm:px-6 sm:pt-6 lg:p-8 min-h-full">
                        {activeView === 'TABLERO' && <FigmaTablero stats={stats} user={user} onViewChange={setActiveView} onOpenBodega={abrirBodega} onManageBodegas={setGestorBodegas} />}
                        {activeView === 'INVENTARIO' && <FigmaInventario key={bodegaFiltro ?? 'todas'} lotes={lotes} bodegas={stats?.bodegas || []} user={user} onNavigate={setActiveView} initialBodegaCode={bodegaFiltro} onManageBodegas={setGestorBodegas} />}
                        {activeView === 'BUSCAR' && <FigmaSearch lotes={lotes} />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels lotes={lotes} />}
                        {activeView === 'REPORTES' && <FigmaReports stats={stats} />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'LOG_MAESTRO' && <FigmaLogMaestro movements={stats?.fullActivity || []} onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'ESCANER' && <FigmaQRScanner onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'SCAN_HISTORY' && <FigmaScanHistory onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'TRANSFERENCIAS' && <FigmaTransferForm bodegas={stats?.bodegas || []} lotes={lotes} onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'PURCHASE_ORDERS' && <FigmaPurchaseOrders />}
                        {activeView === 'LABELS_PRINT' && <FigmaLabelPrint initialLotes={lotes} />}

                    </div>
                </div>
            </main>

            {gestorBodegas !== false && (
                <FigmaBodegaManager bodegas={stats?.bodegas || []} inicial={gestorBodegas} onClose={() => setGestorBodegas(false)} />
            )}

            <MobileNav activeView={activeView} onNavigate={(v) => setActiveView(v as ViewMode)} user={user} />
        </div>
    );
}
