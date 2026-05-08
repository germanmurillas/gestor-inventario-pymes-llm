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

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'AYUDA' | 'NOTIFICACIONES' | 'CONFIGURACION' | 'PROYECTO' | 'LOG_MAESTRO';

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
    const viewRef = useRef<HTMLDivElement>(null);
    const user = auth?.user || { name: 'Invitado', role: 'operario' };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
        <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans radial-decor">
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
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-40">
                    <div className="flex items-center gap-6">
                        <button onClick={toggleSidebar} aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:scale-110 active:scale-95">
                            <Menu size={20} aria-hidden="true" />
                        </button>
                        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
                             <span className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Pymetory /</span>
                             <h1 className="text-xs font-black uppercase tracking-widest text-slate-900">{activeView}</h1>
                        </nav>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={viewRef} className="p-8 h-full">
                        {activeView === 'TABLERO' && <FigmaTablero stats={stats} user={user} onViewChange={setActiveView} />}
                        {activeView === 'INVENTARIO' && <FigmaInventario lotes={lotes} bodegas={stats?.bodegas || []} user={user} />}
                        {activeView === 'BUSCAR' && <FigmaSearch lotes={lotes} />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels lotes={lotes} />}
                        {activeView === 'REPORTES' && <FigmaReports stats={stats} />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'CONFIGURACION' && <FigmaSettings />}
                        {activeView === 'PROYECTO' && <FigmaKanban />}
                        {activeView === 'LOG_MAESTRO' && <FigmaLogMaestro movements={stats?.fullActivity || []} onBack={() => setActiveView('TABLERO')} />}
                        
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
