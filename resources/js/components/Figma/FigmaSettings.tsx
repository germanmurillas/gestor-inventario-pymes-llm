import React, { useState } from 'react';
import { Globe, Cpu, Bell, ShieldCheck, Save, LogOut, Key, Zap, Database } from 'lucide-react';

const FigmaSettings = () => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'LLM' | 'NOTIFICATIONS' | 'SECURITY'>('GENERAL');
    const [temperature, setTemperature] = useState(0.7);

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button 
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-3xl ${activeTab === id ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200' : 'text-slate-400 hover:text-slate-900'}`}
        >
            <Icon size={16} strokeWidth={3} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">Configuración Central</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de parámetros del núcleo Pymetory</p>
                </div>
            </div>

            {/* Tab System */}
            <div className="flex bg-slate-50 border border-slate-100 rounded-[2.5rem] p-2 w-fit">
                <TabButton id="GENERAL" label="General" icon={Globe} />
                <TabButton id="LLM" label="Núcleo IA" icon={Cpu} />
                <TabButton id="NOTIFICATIONS" label="Alertas" icon={Bell} />
                <TabButton id="SECURITY" label="Seguridad" icon={ShieldCheck} />
            </div>

            {/* Tab Content */}
            <div className="bg-white border-2 border-slate-50 rounded-[3rem] p-12 shadow-sm min-h-[500px] transition-all duration-500">
                
                {/* 1. GENERAL */}
                {activeTab === 'GENERAL' && (
                    <div key="general" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Preferencias de Entorno</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Regionalización y localización del software</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Idioma Oficial</label>
                                    <select className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600/10 rounded-2xl px-6 py-4 text-sm font-bold appearance-none cursor-pointer">
                                        <option>Español (Colombia)</option>
                                        <option>English (International)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Divisa de Valuación</label>
                                    <select className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600/10 rounded-2xl px-6 py-4 text-sm font-bold appearance-none cursor-pointer">
                                        <option>COP ($)</option>
                                        <option>USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 flex justify-end">
                            <button className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200">
                                <Save size={16} /> Aplicar Cambios
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. LLM (NÚCLEO IA) */}
                {activeTab === 'LLM' && (
                    <div key="llm" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-[1.5rem]">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Configuración de Inteligencia Artificial</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ajustes del motor RAG Pymetory AI</p>
                                </div>
                            </div>

                            <div className="space-y-8 pt-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Motor de Generación</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 border-2 border-indigo-600 bg-indigo-50/20 rounded-2xl flex items-center gap-4">
                                            <div className="w-4 h-4 rounded-full border-4 border-indigo-600"></div>
                                            <span className="font-bold text-slate-900">OpenAI GPT-4o</span>
                                        </div>
                                        <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 opacity-40 grayscale">
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                                            <span className="font-bold text-slate-400">Anthropic Claude</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clave de Conexión (API Key)</label>
                                    <div className="relative">
                                        <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input 
                                            type="password" 
                                            defaultValue="sk-••••••••••••••••••••••••" 
                                            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 text-sm font-mono text-slate-900" 
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        <span>Temperatura de respuesta</span>
                                        <span className="text-indigo-600">{temperature}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-slate-300 uppercase mt-1">
                                        <span>Conciso / Preciso</span>
                                        <span>Creativo / Proactivo</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Database className="text-indigo-400" size={24} />
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-indigo-400">Estado del RAG</div>
                                            <div className="text-sm font-bold uppercase tracking-tight">Vectores Sincronizados</div>
                                        </div>
                                    </div>
                                    <button type="button" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">
                                        Re-Indexar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. NOTIFICATIONS */}
                {activeTab === 'NOTIFICATIONS' && (
                    <div key="notifications" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                         <div className="flex items-center gap-4">
                                <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem]">
                                    <Bell size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Centro de Alertas</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configura cómo quieres ser notificado</p>
                                </div>
                         </div>

                         <div className="space-y-6 pt-4">
                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all cursor-pointer">
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Alertas en Tiempo Real</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Notificaciones de navegador para stock crítico</div>
                                </div>
                                <div className="w-14 h-8 bg-indigo-600 rounded-full p-1 flex justify-end">
                                    <div className="w-6 h-6 bg-white rounded-full shadow-lg"></div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between group hover:bg-white hover:border-indigo-100 transition-all cursor-pointer">
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Resumen por Correo</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reporte diario de movimientos y vencimientos</div>
                                </div>
                                <div className="w-14 h-8 bg-slate-200 rounded-full p-1 flex justify-start">
                                    <div className="w-6 h-6 bg-white rounded-full shadow-lg"></div>
                                </div>
                            </div>
                         </div>
                    </div>
                )}
                
                {/* 4. SECURITY */}
                {activeTab === 'SECURITY' && (
                    <div key="security" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                         <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Seguridad y Acceso</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protección de credenciales y sesiones</p>
                                </div>
                         </div>

                         <div className="space-y-8 pt-4">
                            <button 
                                type="button"
                                className="w-full flex items-center justify-between p-8 bg-red-50 border border-red-100 rounded-[2.5rem] group hover:bg-red-600 transition-all duration-300"
                            >
                                <div className="text-left">
                                    <div className="text-lg font-black text-red-700 group-hover:text-white uppercase transition-colors">Cerrar Sesión Global</div>
                                    <div className="text-[10px] text-red-500 group-hover:text-white/70 font-bold uppercase tracking-widest transition-colors">Terminar todas las instancias activas</div>
                                </div>
                                <LogOut className="text-red-600 group-hover:text-white transition-colors" size={28} />
                            </button>
                         </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FigmaSettings;
