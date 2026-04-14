import React, { useState } from 'react';
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

// Figma Components
import FigmaTablero from '../components/Figma/FigmaTablero';
import FigmaInventario from '../components/Figma/FigmaInventario';
import FigmaReports from '../components/Figma/FigmaReports';
import FigmaLLM from '../components/Figma/FigmaLLM';
import FigmaSettings from '../components/Figma/FigmaSettings';
import FigmaNotifications from '../components/Figma/FigmaNotifications';
import FigmaSearch from '../components/Figma/FigmaSearch';
import FigmaLabels from '../components/Figma/FigmaLabels';

type ViewMode = 'TABLERO' | 'INVENTARIO' | 'BUSCAR' | 'ETIQUETAS' | 'REPORTES' | 'LLM' | 'AYUDA' | 'NOTIFICACIONES' | 'CONFIGURACION';

export default function Dashboard() {
    const [activeView, setActiveView] = useState<ViewMode>('TABLERO');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const SidebarItem = ({ icon: Icon, label, view, isActive }: { icon: any, label: string, view: ViewMode, isActive: boolean }) => (
        <button 
            onClick={() => setActiveView(view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-sans text-sm font-medium ${isActive ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-200/50'}`}
        >
            <Icon size={18} className={isActive ? 'text-black' : 'text-gray-400'} />
            <span className={`${sidebarOpen ? 'block' : 'hidden md:hidden lg:hidden'}`}>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-[#F3F4F6] text-[#111111] overflow-hidden font-sans">
            <Head title={`${activeView} | Pymetory`} />

            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} h-full bg-[#F3F4F6] border-r border-gray-200 flex flex-col transition-all duration-300`}>
                <div className="h-16 flex items-center px-6 mb-4">
                    <span className="font-bold text-xl tracking-tight uppercase">Pymetory</span>
                </div>

                <div className="flex-1 px-3 space-y-1">
                    <SidebarItem icon={LayoutGrid} label="Tablero" view="TABLERO" isActive={activeView === 'TABLERO'} />
                    <SidebarItem icon={Box} label="Inventario" view="INVENTARIO" isActive={activeView === 'INVENTARIO'} />
                    <SidebarItem icon={Search} label="Buscar" view="BUSCAR" isActive={activeView === 'BUSCAR'} />
                    <SidebarItem icon={Tag} label="Etiquetas" view="ETIQUETAS" isActive={activeView === 'ETIQUETAS'} />
                    <SidebarItem icon={BarChart3} label="Reportes" view="REPORTES" isActive={activeView === 'REPORTES'} />
                    <SidebarItem icon={MessageSquare} label="LLM" view="LLM" isActive={activeView === 'LLM'} />
                    <SidebarItem icon={HelpCircle} label="Ayuda" view="AYUDA" isActive={activeView === 'AYUDA'} />
                    <SidebarItem icon={Bell} label="Notificaciones" view="NOTIFICACIONES" isActive={activeView === 'NOTIFICACIONES'} />
                    <SidebarItem icon={Settings} label="Configuración" view="CONFIGURACION" isActive={activeView === 'CONFIGURACION'} />
                </div>

                <div className="p-4 border-t border-gray-200 space-y-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-black transition-colors text-sm">
                        <User size={18} />
                        <span className={`${sidebarOpen ? 'block' : 'hidden'}`}>Perfil</span>
                    </button>
                    <Link href="/logout" method="post" as="button" className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-600 transition-colors text-sm">
                        <LogOut size={18} />
                        <span className={`${sidebarOpen ? 'block' : 'hidden'}`}>Salir</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Top Header */}
                <header className="h-16 border-b border-gray-200 flex items-center justify-between px-8 bg-white">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-md">
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                             {/* Breadcrumb icons based on mockup */}
                             {activeView === 'TABLERO' && <LayoutGrid size={18} className="opacity-50" />}
                             {activeView === 'INVENTARIO' && <Box size={18} className="opacity-50" />}
                             <h2 className="text-sm font-semibold capitalize tracking-wide">{activeView.toLowerCase()}</h2>
                        </div>
                    </div>
                </header>

                {/* View Content */}
                <div className="flex-1 overflow-auto bg-[#F3F4F6]">
                    <div className="p-8 h-full">
                        {activeView === 'TABLERO' && <FigmaTablero />}
                        {activeView === 'INVENTARIO' && <FigmaInventario />}
                        {activeView === 'BUSCAR' && <FigmaSearch />}
                        {activeView === 'ETIQUETAS' && <FigmaLabels />}
                        {activeView === 'REPORTES' && <FigmaReports />}
                        {activeView === 'LLM' && <FigmaLLM />}
                        {activeView === 'NOTIFICACIONES' && <FigmaNotifications />}
                        {activeView === 'CONFIGURACION' && <FigmaSettings />}
                        
                        {(['AYUDA'].includes(activeView)) && (
                            <div className="bg-white rounded-lg border border-gray-200 p-20 flex flex-col items-center justify-center text-gray-300">
                                <HelpCircle size={48} className="mb-4 opacity-20" />
                                <div className="text-xl font-medium uppercase tracking-widest opacity-20">Vista en desarrollo</div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
