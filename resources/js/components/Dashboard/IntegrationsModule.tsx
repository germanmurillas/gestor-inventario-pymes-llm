import React, { useEffect, useState } from 'react';
import { Workflow, Server, Database, Globe, Network, ArrowRight } from 'lucide-react';

export default function IntegrationsModule() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 150);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#111111] text-[#F5F3EE] rounded-xl overflow-hidden shadow-2xl border border-[#F5F3EE]/10 font-sans animate-in fade-in zoom-in-90 duration-700">
            {/* Cabecera */}
            <div className="p-6 md:p-8 border-b border-[#F5F3EE]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div>
                    <h2 className="font-serif italic text-3xl flex items-center gap-3">
                        <Workflow className="text-[#E63B2E]" /> Ecosistema de Datos
                    </h2>
                    <p className="font-mono text-sm opacity-60">Sincronización en tiempo real (Pymetory Core)</p>
                </div>
                <div className="flex items-center gap-3 bg-[#E63B2E]/10 border border-[#E63B2E]/30 text-[#E63B2E] px-4 py-2 rounded-lg font-mono text-xs font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E63B2E] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E63B2E]"></span>
                    </span>
                    ALL SYSTEMS NOMINAL
                </div>
            </div>

            {/* Canvas de Integraciones SVG Brutalista */}
            <div className="flex-1 relative p-8 flex items-center justify-center overflow-hidden">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>

                {/* Contenedor central de flujo SVG */}
                <div className={`relative w-full max-w-4xl h-[400px] transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    
                    {/* Líneas Trazadas con SVG */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#111111" />
                                <stop offset="50%" stopColor="#F5F3EE" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#111111" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Top Left Line to Center */}
                        <path className="animate-[dash_6s_linear_infinite]" d="M 150 100 Q 300 100, 450 200" fill="none" stroke="#F5F3EE" strokeWidth="2" strokeOpacity="0.2" strokeDasharray="10 10" />
                        {/* Partícula fluyendo TL */}
                        <circle cx="0" cy="0" r="4" fill="#E63B2E" filter="url(#glow)">
                            <animateMotion dur="4s" repeatCount="indefinite" path="M 150 100 Q 300 100, 450 200" />
                        </circle>

                        {/* Bottom Left Line to Center */}
                        <path className="animate-[dash_8s_linear_infinite]" d="M 150 300 Q 300 300, 450 200" fill="none" stroke="#F5F3EE" strokeWidth="2" strokeOpacity="0.2" strokeDasharray="10 10" />
                        {/* Partícula fluyendo BL */}
                        <circle cx="0" cy="0" r="4" fill="#E63B2E" filter="url(#glow)">
                            <animateMotion dur="5s" repeatCount="indefinite" path="M 150 300 Q 300 300, 450 200" />
                        </circle>

                        {/* Center to Right Line */}
                        <path className="animate-[dash_5s_linear_infinite]" d="M 550 200 Q 700 200, 800 200" fill="none" stroke="#F5F3EE" strokeWidth="2" strokeOpacity="0.2" strokeDasharray="10 10" />
                        {/* Partícula fluyendo CR */}
                        <circle cx="0" cy="0" r="4" fill="#E63B2E" filter="url(#glow)">
                            <animateMotion dur="3s" repeatCount="indefinite" path="M 550 200 Q 700 200, 800 200" />
                        </circle>
                    </svg>

                    {/* Nodes (HTML Absolutos encajados al SVG) */}
                    {/* Main Core Node */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group">
                        <div className="w-24 h-24 rounded-2xl bg-black border border-[#F5F3EE]/30 shadow-[0_0_50px_rgba(230,59,46,0.2)] flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#E63B2E]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Network size={40} className="text-[#F5F3EE]" />
                        </div>
                        <div className="mt-4 font-serif italic text-xl font-bold">Pymetory.</div>
                        <div className="font-mono text-[10px] opacity-50 bg-[#F5F3EE]/10 px-2 py-1 rounded mt-1">CORE ROUTER</div>
                    </div>

                    {/* Node Top Left: ERP (SAP/Oracle) */}
                    <div className="absolute left-[10%] top-[10%] z-20 flex flex-col items-center hover:-translate-y-2 transition-transform duration-500">
                        <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] border border-[#F5F3EE]/20 flex items-center justify-center mb-3">
                            <Database size={24} className="text-[#F5F3EE]/70" />
                        </div>
                        <div className="font-sans font-bold text-sm tracking-wide">Legacy ERP</div>
                        <div className="font-mono text-[10px] opacity-40">READ_ONLY</div>
                    </div>

                    {/* Node Bottom Left: Producción */}
                    <div className="absolute left-[10%] top-[70%] z-20 flex flex-col items-center hover:-translate-y-2 transition-transform duration-500">
                        <div className="w-16 h-16 rounded-xl bg-[#1a1a1a] border border-[#F5F3EE]/20 flex items-center justify-center mb-3">
                            <Server size={24} className="text-[#F5F3EE]/70" />
                        </div>
                        <div className="font-sans font-bold text-sm tracking-wide">IoT Scales</div>
                        <div className="font-mono text-[10px] text-green-400 opacity-80">98ms PING</div>
                    </div>

                    {/* Node Center Right: Web / Venta */}
                    <div className="absolute right-[10%] top-[50%] -translate-y-1/2 z-20 flex flex-col items-center hover:-translate-y-2 transition-transform duration-500">
                        <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-[#F5F3EE]/20 flex items-center justify-center mb-3 border-dashed">
                            <Globe size={28} className="text-[#E63B2E]/80" />
                        </div>
                        <div className="font-sans font-bold text-sm tracking-wide">B2B E-Commerce</div>
                        <div className="font-mono text-[10px] opacity-40">SYNCING_DATA</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#F5F3EE]/10 bg-[#000000] flex justify-between font-mono text-[10px] opacity-50 uppercase tracking-widest">
                <span>Total Nodes: 4 Active</span>
                <span className="flex items-center gap-1 hover:text-[#E63B2E] transition-colors cursor-pointer text-[#F5F3EE]">Añadir Conexión Webhook <ArrowRight size={10} /></span>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes dash {
                    to {
                        stroke-dashoffset: -100;
                    }
                }
            `}} />
        </div>
    );
}
