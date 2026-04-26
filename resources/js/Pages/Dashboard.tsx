import React, { useState, useEffect, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
    LayoutGrid, 
    Box, 
    Search, 
    Tag, 
    BarChart3, 
    MessageSquare, 
    HelpCircle, 
    Bell, 
    Settings,
    User,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import gsap from 'gsap';

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

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'AYUDA' | 'NOTIFICACIONES' | 'CONFIGURACION' | 'PROYECTO';

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

    const SidebarItem = ({ icon: Icon, label, view, isActive }: { icon: any, label: string, view: ViewMode, isActive: boolean }) => (
        <button 
            onClick={() => setActiveView(view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-sans text-sm font-bold ${isActive ? 'bg-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
            <span className={`${sidebarOpen ? 'block' : 'hidden md:hidden'} tracking-tight`}>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans radial-decor">
            <Head title={`${activeView} | Pymetory Premium`} />

            {/* Sidebar (Midnight Luxe) */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} h-full bg-obsidiana flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 border-r border-white/5`}>
                <div className="h-20 flex items-center px-6 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white glow-indigo">
                            <Box size={22} strokeWidth={2.5} />
                        </div>
                        <span className={`font-display text-2xl tracking-tighter text-white ${sidebarOpen ? 'block' : 'hidden'}`}>Pymetory</span>
                    </div>
                </div>

                <div className="flex-1 px-3 space-y-1.5 overflow-y-auto mt-4 custom-scrollbar">
                    <div className={`px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ${sidebarOpen ? 'block' : 'hidden'}`}>Principal</div>
                    <SidebarItem icon={LayoutGrid} label="Tablero" view="TABLERO" isActive={activeView === 'TABLERO'} />
                    <SidebarItem icon={Box} label="Inventario" view="INVENTARIO" isActive={activeView === 'INVENTARIO'} />
                    <SidebarItem icon={Search} label="Buscar" view="BUSCAR" isActive={activeView === 'BUSCAR'} />
                    
                    <div className={`px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 mt-6 ${sidebarOpen ? 'block' : 'hidden'}`}>Análisis</div>
                    <SidebarItem icon={MessageSquare} label="Asistente RAG" view="LLM" isActive={activeView === 'LLM'} />
                    <SidebarItem icon={BarChart3} label="Reportes" view="REPORTES" isActive={activeView === 'REPORTES'} />
                    <SidebarItem icon={Tag} label="Etiquetas" view="ETIQUETAS" isActive={activeView === 'ETIQUETAS'} />
                    
                    <div className={`px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 mt-6 ${sidebarOpen ? 'block' : 'hidden'}`}>Gestión</div>
                    <SidebarItem icon={Bell} label="Alertas" view="NOTIFICACIONES" isActive={activeView === 'NOTIFICACIONES'} />
                    <SidebarItem icon={Settings} label="Ajustes" view="CONFIGURACION" isActive={activeView === 'CONFIGURACION'} />
                    <SidebarItem icon={LayoutGrid} label="Kanban" view="PROYECTO" isActive={activeView === 'PROYECTO'} />
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
                    <Link href="/logout" method="post" as="button" className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest rounded-lg">
                        <LogOut size={16} />
                        <span className={`${sidebarOpen ? 'block' : 'hidden'}`}>Cerrar Sesión</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-40">
                    <div className="flex items-center gap-6">
                        <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:scale-110 active:scale-95">
                            <Menu size={20} />
                        </button>
                        <nav className="flex items-center gap-2">
                             <span className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Pymetory /</span>
                             <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">{activeView}</h2>
                        </nav>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={viewRef} className="p-8 h-full">
                        {activeView === 'TABLERO' && <FigmaTablero stats={stats} user={user} />}
                        {activeView === 'INVENTARIO' && <FigmaInventario lotes={lotes} bodegas={stats?.bodegas || []} user={user} />}
                        {activeView === 'BUSCAR' && <FigmaSearch />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels />}
                        {activeView === 'REPORTES' && <FigmaReports />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'CONFIGURACION' && <FigmaSettings />}
                        {activeView === 'PROYECTO' && <FigmaKanban />}
                        
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
