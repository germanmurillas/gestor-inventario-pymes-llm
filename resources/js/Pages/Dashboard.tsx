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

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'AYUDA' | 'NOTIFICACIONES' | 'CONFIGURACION' | 'PROYECTO' | 'LOG_MAESTRO' | 'ESCANER' | 'SCAN_HISTORY' | 'TRANSFERENCIAS';

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
    const [scannerPrefillLote, setScannerPrefillLote] = useState<any>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const user = auth?.user || { name: 'Invitado', role: 'operario' };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const handleScanFromLabel = (lote: any) => {
        setScannerPrefillLote(lote);
        setActiveView('ESCANER');
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

    const isDashboardView = activeView === 'TABLERO';

    return (
        <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-500 ${isDashboardView ? 'bg-[#0a1628] text-white' : 'bg-[#F8FAFC] text-[#0F172A] radial-decor'}`}>
            <Head title={`${activeView} | Pymetory Premium`} />

            <Sidebar
                sidebarOpen={sidebarOpen}
                user={user}
                activeView={activeView}
                mode="dashboard"
                onNavigate={setActiveView}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className={`h-16 border-b flex items-center justify-between px-8 z-40 backdrop-blur-md transition-colors duration-500 ${
                    isDashboardView
                        ? 'bg-[#0a1628]/60 border-slate-700/40 text-white'
                        : 'bg-white/40 border-slate-200 text-[#0F172A]'
                }`}>
                    <div className="flex items-center gap-6">
                        <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'} className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                            isDashboardView ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}>
                            <Menu size={20} aria-hidden="true" />
                        </button>
                        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
                             <span className={`text-xs font-bold uppercase tracking-widest italic ${isDashboardView ? 'text-slate-500' : 'text-slate-400'}`}>Pymetory /</span>
                             <h1 className={`text-xs font-black uppercase tracking-widest ${isDashboardView ? 'text-white' : 'text-slate-900'}`}>{activeView}</h1>
                        </nav>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={viewRef} className="p-8 h-full">
                        {activeView === 'TABLERO' && <FigmaTablero stats={stats} user={user} onViewChange={setActiveView} />}
                        {activeView === 'INVENTARIO' && <FigmaInventario lotes={lotes} bodegas={stats?.bodegas || []} user={user} onNavigate={setActiveView} />}
                        {activeView === 'BUSCAR' && <FigmaSearch lotes={lotes} />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels lotes={lotes} onScanLote={handleScanFromLabel} />}
                        {activeView === 'REPORTES' && <FigmaReports stats={stats} />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'CONFIGURACION' && <FigmaSettings />}
                        {activeView === 'PROYECTO' && <FigmaKanban />}
                        {activeView === 'LOG_MAESTRO' && <FigmaLogMaestro movements={stats?.fullActivity || []} onBack={() => setActiveView('TABLERO')} />}
                        {activeView === 'ESCANER' && <FigmaQRScanner onBack={() => setActiveView('TABLERO')} prefillLote={scannerPrefillLote} />}
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
                        
                        {(['AYUDA'].includes(activeView)) && (
                            <div className="bg-white rounded-3xl border border-slate-200 p-24 shadow-sm flex flex-col items-center justify-center text-slate-300">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                    <HelpCircle size={32} className="opacity-20 text-indigo-600" />
                                </div>
                                <div className="text-sm font-black uppercase tracking-[0.3em] opacity-30 text-slate-900 text-center">
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
