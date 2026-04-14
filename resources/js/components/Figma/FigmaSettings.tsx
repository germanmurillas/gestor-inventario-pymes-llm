import React, { useState } from 'react';
import { Settings, Globe, Cpu, Bell, ShieldCheck, Save, RefreshCw, Trash2 } from 'lucide-react';

const FigmaSettings = () => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'LLM' | 'NOTIFICATIONS' | 'SECURITY'>('GENERAL');

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === id ? 'border-black text-black bg-white shadow-sm' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
            <Icon size={16} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2">
                 <Settings size={24} className="opacity-50" />
                 <h2 className="text-xl font-bold uppercase tracking-tight">Configuración</h2>
            </div>

            {/* Tab System (Mockup 15-18 Top) */}
            <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                <TabButton id="GENERAL" label="General" icon={Globe} />
                <TabButton id="LLM" label="Integración LLM" icon={Cpu} />
                <TabButton id="NOTIFICATIONS" label="Notificaciones" icon={Bell} />
                <TabButton id="SECURITY" label="Seguridad" icon={ShieldCheck} />
            </div>

            {/* Tab Content */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                
                {/* 1. GENERAL (Mockup 15) */}
                {activeTab === 'GENERAL' && (
                    <div className="space-y-8 max-w-2xl animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold">Preferencias del Sistema</h3>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Idioma de la Interfaz</label>
                                    <select className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none">
                                        <option>Español (ES)</option>
                                        <option>English (US)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Moneda Base</label>
                                    <select className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none">
                                        <option>USD - Dólar Estadounidense</option>
                                        <option>COP - Peso Colombiano</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Huso Horario</label>
                                    <select className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none">
                                        <option>(GMT-05:00) Bogota, Lima, Quito</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                            <button className="px-6 py-2.5 bg-black text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                                <Save size={16} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. LLM (Mockup 16) */}
                {activeTab === 'LLM' && (
                    <div className="space-y-8 max-w-2xl animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold">Configuración de Inteligencia Artificial</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Proveedor de Modelo</label>
                                    <select className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm font-bold">
                                        <option>OpenAI (GPT-4o)</option>
                                        <option>Anthropic (Claude 3.5 Sonnet)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Clave API</label>
                                    <input type="password" value="sk-••••••••••••••••••••••••" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono" readOnly />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Temperatura</label>
                                        <input type="range" className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black" />
                                        <div className="text-[10px] text-right text-gray-400 font-bold">0.7</div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Límite de Tokens</label>
                                        <input type="number" placeholder="4096" className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                            <button className="px-6 py-2.5 bg-gray-100 text-black border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2">
                                <RefreshCw size={16} /> Probar Conexión
                            </button>
                            <button className="px-6 py-2.5 bg-black text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                                Actualizar Modelo
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. NOTIFICATIONS (Mockup 17) */}
                {activeTab === 'NOTIFICATIONS' && (
                    <div className="space-y-8 max-w-2xl animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold">Gestión de Alertas</h3>
                            <div className="p-6 bg-gray-50 rounded-xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold">Alertas Push (Navegador)</div>
                                        <div className="text-xs text-gray-500">Notificaciones en tiempo real mientras usas la plataforma.</div>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-black cursor-pointer" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                                    <div>
                                        <div className="text-sm font-bold">Resumen Diario (Email)</div>
                                        <div className="text-xs text-gray-500">Recibe un reporte matutino con el estado de la bodega.</div>
                                    </div>
                                    <input type="checkbox" className="w-5 h-5 accent-black cursor-pointer" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Historial de Envíos</h4>
                                <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="p-4 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="font-medium text-gray-600">Alerta Stock Crítico - Lote #8492</span>
                                            </div>
                                            <div className="text-gray-400 font-bold">ENTREGADO - Hace 2h</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SECURITY (Mockup 18) */}
                {activeTab === 'SECURITY' && (
                    <div className="space-y-8 max-w-2xl animate-in slide-in-from-left-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold">Acceso y Privacidad</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nueva Contraseña</label>
                                    <input type="password" placeholder="••••••••••••" className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirmar Contraseña</label>
                                    <input type="password" placeholder="••••••••••••" className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                </div>
                            </div>

                            <div className="p-6 border border-red-100 rounded-xl space-y-4">
                                <div className="flex items-start gap-4">
                                    <ShieldCheck className="text-red-500 shrink-0" size={24} />
                                    <div>
                                        <div className="text-sm font-bold">Sesiones Activas</div>
                                        <p className="text-xs text-gray-500 mt-1">Has iniciado sesión en 2 dispositivos actualmente.</p>
                                    </div>
                                </div>
                                <button className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    <LogOut size={14} /> Cerrar Todas las Sesiones
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FigmaSettings;
