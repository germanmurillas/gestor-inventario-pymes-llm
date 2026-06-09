import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { LayoutGrid, Box, ScanLine, MessageSquare, ChartBar, ArrowRight, Github, GraduationCap, Shield, Zap } from 'lucide-react';

const features = [
    { icon: LayoutGrid, title: 'Dashboard KPIs', desc: 'Insumos activos, lotes en bodega, críticos FEFO y valorización en tiempo real.' },
    { icon: Box, title: 'Control FEFO', desc: 'First Expired First Out automático — sugerencia de lote y alertas de vencimiento.' },
    { icon: ScanLine, title: 'Etiquetas QR', desc: 'Generación de códigos QR y CODE128, escáner integrado con historial.' },
    { icon: MessageSquare, title: 'Asistente RAG', desc: 'Chat con IA que consulta tu inventario real — preguntas en español, 10 intenciones.' },
    { icon: ChartBar, title: 'Reportes', desc: 'PDF y CSV con KPIs, valorización COP, consumo FEFO y gráficos.' },
    { icon: LayoutGrid, title: 'Kanban', desc: 'Tablero de tareas con drag-and-drop, columnas personalizables y atajos de teclado.' },
];

const infra = [
    { icon: Zap, label: '4 OCPU ARM' },
    { icon: Box, label: '24 GB RAM' },
    { icon: Shield, label: '200 GB SSD' },
    { icon: Zap, label: '$0/mes' },
];

export default function Welcome() {
    return (
        <div className="min-h-screen bg-[#F3F4F6] text-[#111111] font-sans">
            <Head title="Pymetory | Inicio" />

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 py-4 px-8 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#111111] rounded-xl flex items-center justify-center">
                            <span className="text-white font-black text-lg">P</span>
                        </div>
                        <span className="font-black text-lg uppercase tracking-tight">Pymetory</span>
                        <span className="hidden sm:inline text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v1.0</span>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/login" className="px-5 py-2 text-sm font-bold hover:bg-gray-100 rounded-lg transition-colors">Iniciar Sesión</Link>
                        <Link href="/register" className="px-5 py-2 text-sm font-bold bg-[#111111] text-white rounded-lg hover:opacity-90 transition-opacity">Registrarse</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="max-w-7xl mx-auto px-6 py-24 text-center">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                    Gestión de Inventarios
                    <br />
                    <span className="bg-gradient-to-r from-[#111111] to-gray-500 bg-clip-text text-transparent">
                        con Inteligencia Artificial
                    </span>
                </h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Sistema de control de inventarios para PYMEs con trazabilidad FEFO, Kardex inmutable,
                    etiquetas QR y un asistente RAG que conoce tu stock en tiempo real.
                </p>

                {/* Infra bar */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    {infra.map((i) => (
                        <div key={i.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                            <i.icon size={14} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-600">{i.label}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-4">
                    <Link href="/login" className="px-8 py-3 bg-[#111111] text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors inline-flex items-center gap-2">
                        Acceder al Sistema <ArrowRight size={16} />
                    </Link>
                    <a href="https://github.com/germanmurillas/gestor-inventario-pymes-llm" target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                        <Github size={16} /> Ver en GitHub
                    </a>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-7xl mx-auto px-6 pb-24">
                <h2 className="text-2xl font-black text-center mb-12 uppercase tracking-tight">Funcionalidades</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((f) => (
                        <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors shadow-sm">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                                <f.icon size={20} className="text-gray-600" />
                            </div>
                            <h3 className="font-black text-sm uppercase tracking-tight mb-2">{f.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tesis + Académico */}
            <section className="bg-white border-t border-gray-200 py-20 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                            <GraduationCap size={20} className="text-gray-600" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Proyecto de Grado</h2>
                        <p className="text-gray-500 leading-relaxed">
                            Universidad del Valle, 2026. Desarrollado por{' '}
                            <strong>Germán David Murillas Mondragón</strong> y{' '}
                            <strong>Jorge Augusto Estacio Almeciga</strong> bajo la dirección
                            del profesor <strong>Héctor Fabio Ocampo</strong>.
                        </p>
                        <a href="/portafolio/SolucionesWeb/pymetoryTesis/tesis/" className="text-sm font-bold text-[#111111] hover:underline inline-flex items-center gap-1">
                            Ver Tesis <ArrowRight size={14} />
                        </a>
                    </div>
                    <div className="space-y-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Shield size={20} className="text-gray-600" />
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Infraestructura</h2>
                        <p className="text-gray-500 leading-relaxed">
                            Desplegado en <strong>Oracle Cloud Always Free</strong> sobre una instancia ARM Ampere A1
                            con 4 OCPU, 24 GB RAM y 200 GB SSD. Cero costo mensual. Stack: Laravel 11,
                            React 19, MySQL 8.0, Ollama.
                        </p>
                        <Link href="/indice" className="text-sm font-bold text-[#111111] hover:underline inline-flex items-center gap-1">
                            Índice de Enlaces <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6">
                <div className="max-w-7xl mx-auto text-center space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Pymetory · Universidad del Valle · 2026
                    </p>
                    <p className="text-[11px] text-gray-300">
                        Laravel 11 · React 19 · Inertia.js · MySQL 8.0 · Ollama · Oracle Cloud
                    </p>
                    <p className="text-[11px] text-gray-300">
                        DesktopTitan · A1.Flex · 4 OCPU / 24 GB / 200 GB · Always Free Tier
                    </p>
                </div>
            </footer>
        </div>
    );
}
