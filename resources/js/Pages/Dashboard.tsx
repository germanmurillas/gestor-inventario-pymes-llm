import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { HelpCircle, Menu } from 'lucide-react';
import gsap from 'gsap';
import Sidebar from '../Components/Sidebar';

// Figma Components
import FigmaTablero from '../components/Figma/FigmaTablero';
import FigmaInventario from '../components/Figma/FigmaInventario';
import FigmaReports from '../components/Figma/FigmaReports';
import FigmaLLM from '../components/Figma/FigmaLLM';
import FigmaSettings from '../components/Figma/FigmaSettings';
import FigmaNotifications from '../components/Figma/FigmaNotifications';
import FigmaSearch from '../components/Figma/FigmaSearch';
import FigmaLabels from '../components/Figma/FigmaLabels';
import FigmaKanban from '../components/Figma/FigmaKanban';
import FigmaLogMaestro from '../components/Figma/FigmaLogMaestro';
import FigmaQRScanner from '../components/Figma/FigmaQRScanner';
import FigmaScanHistory from '../components/Figma/FigmaScanHistory';
import FigmaTransferForm from '../components/Figma/FigmaTransferForm';
import FigmaPurchaseOrders from '../components/Figma/FigmaPurchaseOrders';
import FigmaLabelPrint from '../components/Figma/FigmaLabelPrint';

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'AYUDA' | 'NOTIFICACIONES' | 'CONFIGURACION' | 'PROYECTO' | 'LOG_MAESTRO' | 'ESCANER' | 'SCAN_HISTORY' | 'TRANSFERENCIAS' | 'PURCHASE_ORDERS' | 'LABELS_PRINT';

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

    const [activeView, setActiveView] = useState<ViewMode>('TABLERO');
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
                { opacity: 0, y: 15, filter: 'blur(8px)' }, 
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' }
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
            <Head title={`${activeView} | Pymetory Premium`} />

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
                <header className="h-16 border-b flex items-center justify-between px-8 z-40 bg-obsidiana/60 backdrop-blur-xl border-slate-700/30 text-white">
                    <div className="flex items-center gap-6">
                        <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'} className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95 hover:bg-slate-800 text-slate-400">
                            <Menu size={20} aria-hidden="true" />
                        </button>
                        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
                             <span className="text-xs font-bold uppercase tracking-widest italic text-slate-500">Pymetory /</span>
                             <h1 className="text-xs font-black uppercase tracking-widest text-white">{activeView}</h1>
                        </nav>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={viewRef} className="p-8 h-full">
                        {activeView === 'TABLERO' && <FigmaTablero stats={stats} user={user} onViewChange={setActiveView} />}
                        {activeView === 'INVENTARIO' && <FigmaInventario lotes={lotes} bodegas={stats?.bodegas || []} user={user} onNavigate={setActiveView} />}
                        {activeView === 'BUSCAR' && <FigmaSearch lotes={lotes} />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels lotes={lotes} />}
                        {activeView === 'REPORTES' && <FigmaReports stats={stats} />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'CONFIGURACION' && <FigmaSettings />}
                        {activeView === 'PROYECTO' && <FigmaKanban />}
                        {activeView === 'LOG_MAESTRO' && <FigmaLogMaestro movements={stats?.fullActivity || []} onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'ESCANER' && <FigmaQRScanner onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'SCAN_HISTORY' && <FigmaScanHistory onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'TRANSFERENCIAS' && (
                            <FigmaTransferForm
                                onBack={() => setActiveView('TABLERO')}
                                bodegas={stats?.bodegas || []}
                                lotes={(lotes || []).map((l: any) => ({
                                    id: l.id,
                                    batch_number: l.lote,
                                    quantity: Number(l.cantidad || l.quantity || 0),
                                    expiration_date: l.vencimiento || '',
                                    material: l.material_name || l.codigo || '',
                                    codigo: l.codigo || '',
                                    bodega_id: Number(l.bodega_id || 0),
                                }))}
                            />
                        )}
                        {activeView === 'PURCHASE_ORDERS' && <FigmaPurchaseOrders />}
                        {activeView === 'LABELS_PRINT' && <FigmaLabelPrint initialLotes={lotes} />}
                        
                        {(['AYUDA'].includes(activeView)) && (
                            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-24 flex flex-col items-center justify-center text-slate-500">
                                <div className="w-16 h-16 bg-slate-700/40 rounded-full flex items-center justify-center mb-6">
                                    <HelpCircle size={32} className="text-champan/30" />
                                </div>
                                <div className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 text-center">
                                    Módulo en<br/>Laboratorio
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
