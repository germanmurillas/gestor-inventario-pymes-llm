import React, { useState, useCallback } from 'react';
import { Globe, Cpu, Bell, ShieldCheck, Save, LogOut, Key, Zap, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { router } from '@inertiajs/react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'GENERAL' | 'LLM' | 'NOTIFICATIONS' | 'SECURITY';

const MODELS = ['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku', 'claude-3-sonnet'] as const;

// ─── Component ────────────────────────────────────────────────────────────────
const FigmaSettings = () => {
    const [activeTab, setActiveTab]     = useState<Tab>('GENERAL');
    const [temperature, setTemperature] = useState(0.3);
    const [llmModel, setLlmModel]       = useState('gpt-4o-mini');
    const [maxTokens, setMaxTokens]     = useState(1024);
    const [llmActive, setLlmActive]     = useState(true);
    const [notifFefo, setNotifFefo]     = useState(true);
    const [notifStock, setNotifStock]   = useState(true);
    const [fefoDias, setFefoDias]       = useState(15);
    const [saving, setSaving]           = useState(false);
    const [feedback, setFeedback]       = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

    // ── Save handler — sends changed settings to /settings (PUT) ──────────────
    const handleSave = useCallback(async (settingsMap: Record<string, string>) => {
        setSaving(true);
        setFeedback(null);
        try {
            const csrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
            const res = await fetch('/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(csrf ?? ''),
                },
                body: JSON.stringify({ settings: settingsMap }),
            });
            const data = await res.json();
            setFeedback({ type: data.success ? 'ok' : 'error', msg: data.message });
        } catch (err) {
            setFeedback({ type: 'error', msg: 'Error de red al guardar.' });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 4000);
        }
    }, []);

    // ── Tab Button ────────────────────────────────────────────────────────────
    const TabButton = ({ id, label, icon: Icon }: { id: Tab; label: string; icon: any }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-3xl ${
                activeTab === id ? 'bg-slate-900 text-white shadow-2xl shadow-slate-200' : 'text-slate-400 hover:text-slate-900'
            }`}
        >
            <Icon size={16} strokeWidth={3} />
            <span>{label}</span>
        </button>
    );

    // ── Feedback Banner ───────────────────────────────────────────────────────
    const FeedbackBanner = () => feedback ? (
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
            feedback.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
            {feedback.type === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {feedback.msg}
        </div>
    ) : null;

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">Configuración Central</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión de parámetros del núcleo Pymetory</p>
                </div>
                <FeedbackBanner />
            </div>

            {/* Tab System */}
            <div className="flex bg-slate-50 border border-slate-100 rounded-[2.5rem] p-2 w-fit">
                <TabButton id="GENERAL"       label="General"   icon={Globe}       />
                <TabButton id="LLM"           label="Núcleo IA" icon={Cpu}         />
                <TabButton id="NOTIFICATIONS" label="Alertas"   icon={Bell}        />
                <TabButton id="SECURITY"      label="Seguridad" icon={ShieldCheck} />
            </div>

            {/* Tab Content */}
            <div className="bg-white border-2 border-slate-50 rounded-[3rem] p-12 shadow-sm min-h-[500px]">

                {/* ── 1. GENERAL ─────────────────────────────────────────── */}
                {activeTab === 'GENERAL' && (
                    <div key="general" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><Globe size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Preferencias de Entorno</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Regionalización y parámetros operativos</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* FEFO threshold */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    <span>Días críticos FEFO</span>
                                    <span className="text-indigo-600">{fefoDias} días</span>
                                </div>
                                <input
                                    type="range" min="7" max="30" step="1"
                                    value={fefoDias}
                                    onChange={(e) => setFefoDias(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Lotes con menos de {fefoDias} días hasta vencimiento se marcan como críticos</p>
                            </div>

                            {/* Timezone info */}
                            <div className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-sm font-black text-slate-900 uppercase">Zona Horaria</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">America/Bogota (UTC-5)</div>
                                </div>
                                <div className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">Activa</div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({ fefo_dias_criticos: String(fefoDias) })}
                            disabled={saving}
                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                        >
                            <Save size={14} />
                            {saving ? 'Guardando...' : 'Guardar General'}
                        </button>
                    </div>
                )}

                {/* ── 2. LLM ─────────────────────────────────────────────── */}
                {activeTab === 'LLM' && (
                    <div key="llm" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-violet-50 text-violet-600 rounded-[1.5rem]"><Cpu size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Núcleo de Inteligencia Artificial</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Parámetros del módulo RAG y LLM</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Activar/desactivar LLM */}
                            <div
                                className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-white hover:border-indigo-100 transition-all"
                                onClick={() => setLlmActive(!llmActive)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Módulo LLM</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Activa el asistente de inventario por IA</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${llmActive ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Selector de modelo */}
                            <div className="space-y-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Modelo de Lenguaje</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {MODELS.map((m) => (
                                        <button
                                            key={m} type="button"
                                            onClick={() => setLlmModel(m)}
                                            className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                                llmModel === m
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                    : 'border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Temperatura */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    <span>Temperatura de respuesta</span>
                                    <span className="text-indigo-600">{temperature}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-slate-300 uppercase">
                                    <span>Conciso / Preciso</span>
                                    <span>Creativo / Proactivo</span>
                                </div>
                            </div>

                            {/* Max tokens */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    <span>Máx. tokens por respuesta</span>
                                    <span className="text-indigo-600">{maxTokens}</span>
                                </div>
                                <input
                                    type="range" min="256" max="4096" step="256"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>

                            {/* Estado RAG */}
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

                        <button
                            onClick={() => handleSave({
                                llm_modelo:      llmModel,
                                llm_temperatura: String(temperature),
                                llm_max_tokens:  String(maxTokens),
                                llm_activo:      llmActive ? 'true' : 'false',
                            })}
                            disabled={saving}
                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                        >
                            <Save size={14} />
                            {saving ? 'Guardando...' : 'Guardar Configuración IA'}
                        </button>
                    </div>
                )}

                {/* ── 3. NOTIFICATIONS ───────────────────────────────────── */}
                {activeTab === 'NOTIFICATIONS' && (
                    <div key="notifications" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem]"><Bell size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Centro de Alertas</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configura cómo quieres ser notificado</p>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            {/* Toggle FEFO */}
                            <div
                                className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-white hover:border-indigo-100 transition-all"
                                onClick={() => setNotifFefo(!notifFefo)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Alertas FEFO Crítico</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Notificaciones cuando un lote entra en período crítico</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${notifFefo ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Toggle Stock Bajo */}
                            <div
                                className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-white hover:border-indigo-100 transition-all"
                                onClick={() => setNotifStock(!notifStock)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Stock Bajo</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alerta cuando el stock cae por debajo del mínimo</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${notifStock ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-white rounded-full shadow-lg" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({
                                notif_fefo_activo: notifFefo  ? 'true' : 'false',
                                notif_stock_bajo:  notifStock ? 'true' : 'false',
                            })}
                            disabled={saving}
                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                        >
                            <Save size={14} />
                            {saving ? 'Guardando...' : 'Guardar Alertas'}
                        </button>
                    </div>
                )}

                {/* ── 4. SECURITY ────────────────────────────────────────── */}
                {activeTab === 'SECURITY' && (
                    <div key="security" className="space-y-12 max-w-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><ShieldCheck size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Seguridad y Acceso</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protección de credenciales y sesiones</p>
                            </div>
                        </div>

                        <div className="space-y-8 pt-4">
                            {/* Sesión timeout info */}
                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-3">
                                <div className="flex items-center gap-3">
                                    <Key size={16} className="text-slate-400" />
                                    <div className="text-sm font-black text-slate-700 uppercase">Timeout de sesión</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number" min="30" max="480" step="30"
                                        defaultValue={120}
                                        id="session-timeout"
                                        className="w-32 bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">minutos de inactividad</span>
                                </div>
                            </div>

                            {/* Log de Auditoría */}
                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="text-sm font-black text-slate-900 uppercase">Log de Auditoría</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registra todas las acciones del sistema</div>
                                </div>
                                <div className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2">
                                    <Zap size={10} /> Activo
                                </div>
                            </div>

                            {/* Cerrar sesión global */}
                            <button
                                type="button"
                                onClick={() => router.post('/logout')}
                                className="w-full flex items-center justify-between p-8 bg-red-50 border border-red-100 rounded-[2.5rem] group hover:bg-red-600 transition-all duration-300"
                            >
                                <div className="text-left">
                                    <div className="text-lg font-black text-red-700 group-hover:text-white uppercase transition-colors">Cerrar Sesión</div>
                                    <div className="text-[10px] text-red-500 group-hover:text-white/70 font-bold uppercase tracking-widest transition-colors">Terminar sesión actual</div>
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
