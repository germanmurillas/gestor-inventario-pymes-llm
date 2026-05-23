import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { Globe, GraduationCap, Server, Code, Github, Shield, Lock, ArrowRight, Box, LayoutGrid, Search, Tag, BarChart3, MessageSquare, Bell, Settings, ScanLine, History, ArrowRightLeft, Truck, Printer, FileText } from 'lucide-react';
import PixelSnow from '../components/PixelSnow';

const SECTIONS = [
    {
        emoji: '🏠', title: 'App Principal', icon: Globe,
        links: [
            { href: '/', label: 'Landing' },
            { href: '/login', label: 'Login' },
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/kanban', label: 'Kanban' },
            { href: '/status-master', label: 'Status Master' },
        ],
    },
    {
        emoji: '🎓', title: 'Tesis', icon: GraduationCap,
        links: [
            { href: '/portafolio/SolucionesWeb/pymetoryTesis/tesis/', label: 'Índice Tesis' },
            { href: '/portafolio/SolucionesWeb/pymetoryTesis/tesis/magister/', label: 'Magíster' },
            { href: '/portafolio/SolucionesWeb/pymetoryTesis/tesis/tecnologo/', label: 'Tecnólogo' },
            { href: '/portafolio/SolucionesWeb/pymetoryTesis/tesis/dummies/', label: 'Dummies' },
        ],
    },
    {
        emoji: '🔧', title: 'Servicios', icon: Server,
        links: [
            { href: '/cazador/index.html', label: 'Titan Hunter' },
            { href: '/cazador-status.php', label: 'Hunter Status API' },
            { href: '/cazador-system.php', label: 'System Metrics API' },
            { href: '/monitor/', label: 'Monitor Live' },
            { href: '/monitor-status.php', label: 'Monitor Status API' },
            { href: '/chat/', label: 'Open WebUI Chat' },
            { href: '/magic/', label: 'React Bits Showcase' },
            { href: '/api/models', label: 'MiniModelGarden API' },
        ],
    },
    {
        emoji: '📡', title: 'API Endpoints', icon: Code,
        subsections: [
            {
                title: 'Auth', icon: Lock,
                links: [
                    { label: 'GET  /login', desc: 'Mostrar formulario login' },
                    { label: 'POST /login', desc: 'Autenticar' },
                    { label: 'GET  /register', desc: 'Registro' },
                    { label: 'POST /logout', desc: 'Cerrar sesión' },
                ],
            },
            {
                title: 'Dashboard & Inventario', icon: LayoutGrid,
                links: [
                    { label: 'GET  /dashboard', desc: 'KPIs + FEFO + Kardex' },
                    { label: 'POST /inventory/material', desc: 'Crear material' },
                    { label: 'PATCH /inventory/adjust/{id}', desc: 'Ajustar stock' },
                    { label: 'POST /bodegas', desc: 'Crear bodega' },
                ],
            },
            {
                title: 'Consumo FEFO', icon: Box,
                links: [
                    { label: 'GET  /inventory/fefo-suggest/{material}', desc: 'Sugerir lote FEFO' },
                    { label: 'POST /inventory/consume-fefo', desc: 'Consumir FEFO' },
                    { label: 'POST /inventory/consume-bulk', desc: 'Consumo masivo' },
                ],
            },
            {
                title: 'QR & Labels', icon: ScanLine,
                links: [
                    { label: 'POST /inventory/qr-scan', desc: 'Escanear QR' },
                    { label: 'GET  /inventory/qr-lookup/{id}', desc: 'Buscar por QR' },
                    { label: 'GET  /inventory/qr-history', desc: 'Historial QR' },
                    { label: 'GET  /inventory/labels', desc: 'Labels disponibles' },
                    { label: 'GET  /inventory/labels/print', desc: 'Imprimir labels' },
                    { label: 'POST /inventory/labels/generate', desc: 'Generar labels' },
                ],
            },
            {
                title: 'Fotos', icon: FileText,
                links: [
                    { label: 'POST /inventory/material/{id}/photo', desc: 'Subir foto material' },
                    { label: 'DELETE /inventory/material/{id}/photo', desc: 'Borrar foto' },
                    { label: 'POST /inventory/lote/{id}/photo', desc: 'Subir foto lote' },
                ],
            },
            {
                title: 'Transferencias', icon: ArrowRightLeft,
                links: [
                    { label: 'POST /inventory/transfer', desc: 'Transferir entre bodegas' },
                    { label: 'GET  /inventory/transfers', desc: 'Historial transferencias' },
                ],
            },
            {
                title: 'Reportes', icon: BarChart3,
                links: [
                    { label: 'GET  /reports/preview', desc: 'Preview reportes' },
                    { label: 'GET  /reports/export', desc: 'Exportar reportes' },
                    { label: 'GET  /inventory/report', desc: 'PDF inventario (admin)' },
                    { label: 'GET  /inventory/report/csv', desc: 'CSV inventario (admin)' },
                ],
            },
            {
                title: 'Chat RAG', icon: MessageSquare,
                links: [
                    { label: 'POST /chat-rag', desc: 'Consultar IA' },
                    { label: 'GET  /chat-history', desc: 'Historial chat' },
                    { label: 'GET  /chat-sessions', desc: 'Sesiones' },
                    { label: 'GET  /ollama-models', desc: 'Modelos disponibles' },
                ],
            },
            {
                title: 'Custom Fields', icon: Tag,
                links: [
                    { label: 'GET  /api/custom-fields', desc: 'Listar campos' },
                    { label: 'POST /api/custom-fields', desc: 'Crear campo' },
                    { label: 'PUT  /api/custom-fields/{field}', desc: 'Editar campo' },
                    { label: 'DELETE /api/custom-fields/{field}', desc: 'Eliminar campo' },
                ],
            },
            {
                title: 'Purchase Orders', icon: Truck,
                links: [
                    { label: 'GET  /api/purchase-orders', desc: 'Listar órdenes' },
                    { label: 'POST /api/purchase-orders', desc: 'Crear orden' },
                    { label: 'PUT  /api/purchase-orders/{order}', desc: 'Cambiar estado' },
                    { label: 'POST /api/purchase-orders/{order}/receive', desc: 'Recibir items' },
                    { label: 'GET  /api/purchase-orders/vendors', desc: 'Proveedores' },
                ],
            },
            {
                title: 'Tags', icon: Tag,
                links: [
                    { label: 'GET  /api/tags', desc: 'Listar tags' },
                    { label: 'POST /api/tags', desc: 'Crear tag' },
                    { label: 'POST /api/materials/{id}/tags', desc: 'Asignar tags' },
                    { label: 'GET  /api/materials/filter?tag=', desc: 'Filtrar por tag' },
                ],
            },
            {
                title: 'Settings', icon: Settings,
                links: [
                    { label: 'GET  /settings', desc: 'Listar settings' },
                    { label: 'PUT  /settings', desc: 'Guardar settings' },
                    { label: 'GET  /settings/{clave}', desc: 'Obtener clave' },
                ],
            },
            {
                title: 'Agentes', icon: MessageSquare,
                links: [
                    { label: 'GET  /api/agent-bus', desc: 'Eventos del bus' },
                    { label: 'GET  /api/agents/status', desc: 'Estado agentes' },
                    { label: 'POST /api/chat/relay', desc: 'Relay a Telegram' },
                ],
            },
            {
                title: 'Kanban', icon: LayoutGrid,
                links: [
                    { label: 'GET  /kanban', desc: 'Tablero Kanban' },
                    { label: 'POST /kanban', desc: 'Crear tarea' },
                    { label: 'POST /kanban/ask-rag', desc: 'Consultar RAG' },
                    { label: 'POST /kanban/reorder', desc: 'Reordenar' },
                ],
            },
        ],
    },
    {
        emoji: '📂', title: 'GitHub', icon: Github,
        links: [
            { href: 'https://github.com/germanmurillas/gestor-inventario-pymes-llm', label: 'Repositorio principal' },
            { href: 'https://github.com/users/germanmurillas/projects/4', label: 'Project Board #4' },
        ],
    },
];

export default function Indice() {
    const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('indice_unlocked') === '1');
    const [pass, setPass] = useState('');
    const [error, setError] = useState(false);

    const handleUnlock = async () => {
        try {
            const res = await axios.post('/api/verify-page-access', { page: 'indice', password: pass });
            if (res.data.valid) {
                sessionStorage.setItem('indice_unlocked', '1');
                setUnlocked(true);
                setError(false);
            }
        } catch {
            setError(true);
        }
    };

    if (!unlocked) {
        return (
            <div className="min-h-screen bg-obsidiana flex items-center justify-center p-8">
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-12 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto">
                        <Lock size={32} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase">Índice Pymetory</h1>
                        <p className="text-xs text-slate-500 font-bold mt-2">Ingresa el código de acceso</p>
                    </div>
                    <input
                        type="password"
                        value={pass}
                        onChange={e => { setPass(e.target.value); setError(false); }}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                        placeholder="Código"
                        maxLength={4}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl px-6 py-4 text-center text-2xl font-black text-white tracking-[0.5em] outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                    />
                    {error && <p className="text-red-400 text-xs font-bold uppercase">Código incorrecto</p>}
                    <button
                        onClick={handleUnlock}
                        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase rounded-2xl transition-all active:scale-95"
                    >
                        Acceder
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-obsidiana text-white pb-20 relative">
            <Head title="Índice General | Pymetory" />

            <PixelSnow
                color="#ffc3c3"
                flakeSize={0.011}
                minFlakeSize={1}
                pixelResolution={500}
                speed={0.6}
                depthFade={4}
                farPlane={30}
                brightness={3}
                gamma={0.1}
                density={0.3}
                variant="round"
                direction={260}
                style={{ position: 'fixed' }}
            />

            {/* Header */}
            <div className="sticky top-0 z-40 bg-obsidiana/80 backdrop-blur-xl border-b border-slate-700/30 relative z-10">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Box size={16} />
                        </div>
                        <h1 className="text-lg font-black uppercase tracking-tight">Índice General</h1>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase">
                        <span>{SECTIONS.reduce((sum, s) => sum + (s.links?.length || 0) + (s.subsections?.reduce((a, b) => a + (b.links?.length || 0), 0) || 0), 0)} enlaces</span>
                        <div className="w-1 h-1 rounded-full bg-slate-600" />
                        <span>74 rutas API</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-12 relative z-10">
                {SECTIONS.map((section, si) => (
                    <div key={si}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-800/50 rounded-xl">
                                <section.icon size={22} className="text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight">{section.emoji} {section.title}</h2>
                            <span className="px-2 py-0.5 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500">
                                {section.subsections ? section.subsections.reduce((a, b) => a + b.links.length, 0) : section.links?.length || 0}
                            </span>
                        </div>

                        {/* Simple links */}
                        {section.links && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {section.links.map((link) => (
                                    <a
                                        key={link.label}
                                        href={link.href}
                                        target={link.external ? '_blank' : undefined}
                                        className="group flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/30 hover:border-indigo-500/30 rounded-xl transition-all"
                                    >
                                        <div className="w-10 h-10 bg-slate-700/30 rounded-xl flex items-center justify-center shrink-0">
                                            <section.icon size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">{link.label}</div>
                                            <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Click para abrir</div>
                                        </div>
                                        <ArrowRight size={14} className="ml-auto text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Subsections (API endpoints) */}
                        {section.subsections && (
                            <div className="space-y-8">
                                {section.subsections.map((sub, subi) => (
                                    <div key={subi}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <sub.icon size={14} className="text-indigo-500" />
                                            <h3 className="text-sm font-black text-slate-300 uppercase tracking-wide">{sub.title}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {sub.links.map((link) => (
                                                <div
                                                    key={link.label}
                                                    className="flex items-center gap-3 p-3 bg-slate-800/20 border border-slate-700/20 rounded-xl hover:border-slate-600/30 transition-all"
                                                >
                                                    <code className="text-[11px] font-mono font-bold text-indigo-400 shrink-0">{link.label}</code>
                                                    <span className="text-[10px] text-slate-600 truncate">{link.desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-12 text-center relative z-10">
                <div className="text-[10px] font-bold text-slate-700 uppercase">
                    {SECTIONS.length} secciones · {SECTIONS.reduce((sum, s) => sum + (s.links?.length || 0) + (s.subsections?.reduce((a, b) => a + (b.links?.length || 0), 0) || 0), 0)} enlaces totales · DesktopTitan OCI A1.Flex
                </div>
            </div>
        </div>
    );
}
