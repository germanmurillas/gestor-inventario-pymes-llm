import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Cpu, Bell, ShieldCheck, Save, LogOut, Key, Zap, Database, CheckCircle, AlertTriangle, ExternalLink, Server, HardDrive, Loader2, Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { router } from '@inertiajs/react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'GENERAL' | 'LLM' | 'NOTIFICATIONS' | 'SECURITY' | 'CUSTOMFIELDS' | 'COMPANY';

interface ModelInfo {
  name: string;
  display: string;
  source: string;
  developer_url: string;
  parameter_count: number;
  context_length: number;
  speed_tok_s: number;
  size_mb: number;
  quantization: string;
  installed: boolean;
}

const classifySpeed = (tok_s: number) => {
  if (tok_s > 100) return { label: '💫 Instantáneo', level: 5 };
  if (tok_s > 30)  return { label: '🌩️ Teletipo', level: 4 };
  if (tok_s > 8)   return { label: '⚡ Rápido', level: 3 };
  if (tok_s > 4)   return { label: '🚀 Normal', level: 2 };
  return { label: '🐌 Pausado', level: 1 };
};

const classifyIntel = (params: number) => {
  if (params > 200_000_000_000) return { label: '🧠🧠🧠 Genio', level: 5 };
  if (params > 20_000_000_000)  return { label: '🧠🧠 Maestro', level: 4 };
  if (params > 2_000_000_000)   return { label: '🧠 Experto', level: 3 };
  if (params > 500_000_000)     return { label: '🎓 Intermedio', level: 2 };
  return { label: '🔰 Básico', level: 1 };
};

const classifyContext = (ctx: number) => {
  if (ctx > 200000) return { label: '📚📚 Biblioteca', level: 5 };
  if (ctx > 64000)  return { label: '📚 Enciclopedia', level: 4 };
  if (ctx > 16000)  return { label: '📑 Documento', level: 3 };
  if (ctx > 4000)   return { label: '📄 Carta', level: 2 };
  return { label: '📝 Nota', level: 1 };
};

// ─── Component ────────────────────────────────────────────────────────────────
const FigmaSettings = () => {
    const [activeTab, setActiveTab]     = useState<Tab>('GENERAL');
    const [temperature, setTemperature] = useState(0.3);
    const [llmModel, setLlmModel]       = useState('pymetory-8b:latest');
    const [maxTokens, setMaxTokens]     = useState(1024);
    const [llmActive, setLlmActive]     = useState(true);
    const [llmSource, setLlmSource]     = useState('local');
    const [llmExternalKey, setLlmExternalKey] = useState('');
    const [localModels, setLocalModels] = useState<string[]>([]);
    const [numCtx, setNumCtx]           = useState(2048);
    const [numGpu, setNumGpu]           = useState(32);
    const [notifFefo, setNotifFefo]         = useState(true);
    const [notifStock, setNotifStock]       = useState(true);
    const [notifEmail, setNotifEmail]       = useState(false);
    const [notifTelegram, setNotifTelegram] = useState(false);
    const [notifEmailAdmin, setNotifEmailAdmin] = useState('admin@pymetory.com');
    const [fefoDias, setFefoDias]           = useState(15);
    const [stockUmbral, setStockUmbral]     = useState(100);
    const [saving, setSaving]               = useState(false);
    const [feedback, setFeedback]       = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);
    const [gardenModels, setGardenModels] = useState<ModelInfo[]>([]);
    const [gardenSystem, setGardenSystem] = useState<any>(null);
    const [gardenLoading, setGardenLoading] = useState(false);

    // Custom Fields state
    interface CustomField { id: number; name: string; key: string; type: string; options?: string[]; sort_order: number; active: boolean; required: boolean; default_value: string | null; }
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [newField, setNewField] = useState({ name: '', key: '', type: 'text', required: false, options: '' });
    const [cfLoading, setCfLoading] = useState(false);

    // Company settings state
    const [companyName, setCompanyName] = useState('Pymetory Premium');
    const [companyLogo, setCompanyLogo] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');


    // Fetch local models on mount and when LLM tab is active
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch('/ollama-models');
                const data = await res.json();
                if (data.models) {
                    setLocalModels(data.models);
                }
            } catch (err) {
                // Safe fallback
            }
        };
        fetchModels();
    }, [activeTab]);

    // Fetch MiniModelGarden models when LLM source is local
    useEffect(() => {
        const fetchGardenModels = async () => {
            setGardenLoading(true);
            try {
                const res = await fetch('/api/models/benchmark');
                const data = await res.json();
                setGardenModels(data.models || []);
                setGardenSystem(data.system || null);
            } catch (err) {
                // MiniModelGarden might be down
            } finally {
                setGardenLoading(false);
            }
        };
        if (llmSource === 'local') {
            fetchGardenModels();
        }
    }, [llmSource]);

    // Fetch custom fields
    const fetchCustomFields = useCallback(async () => {
        try {
            const res = await fetch('/api/custom-fields');
            const data = await res.json();
            setCustomFields(data.fields || []);
        } catch (err) { /* handle */ }
    }, []);

    useEffect(() => { if (activeTab === 'CUSTOMFIELDS') fetchCustomFields(); }, [activeTab, fetchCustomFields]);

    const handleCreateField = async () => {
        if (!newField.name || !newField.key) return;
        setCfLoading(true);
        try {
            const csrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
            const res = await fetch('/api/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(csrf ?? '') },
                body: JSON.stringify({ ...newField, options: newField.options ? newField.options.split(',').map(s => s.trim()) : null }),
            });
            if (res.ok) { setNewField({ name: '', key: '', type: 'text', required: false, options: '' }); fetchCustomFields(); }
        } finally { setCfLoading(false); }
    };

    const handleToggleField = async (field: CustomField) => {
        try {
            const csrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
            await fetch(`/api/custom-fields/${field.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(csrf ?? '') },
                body: JSON.stringify({ active: !field.active }),
            });
            fetchCustomFields();
        } catch (err) { /* handle */ }
    };

    const handleDeleteField = async (id: number) => {
        if (!confirm('¿Eliminar este campo personalizado?')) return;
        try {
            const csrf = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1];
            await fetch(`/api/custom-fields/${id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(csrf ?? '') },
            });
            fetchCustomFields();
        } catch (err) { /* handle */ }
    };



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
            <div className="flex bg-slate-800/50 border border-slate-100 rounded-[2.5rem] p-2 w-fit flex-wrap">
                <TabButton id="GENERAL"       label="General"   icon={Globe}       />
                <TabButton id="LLM"           label="Núcleo IA" icon={Cpu}         />
                <TabButton id="NOTIFICATIONS" label="Alertas"   icon={Bell}        />
                <TabButton id="CUSTOMFIELDS"  label="Campos Extra" icon={Tag}      />
                <TabButton id="COMPANY"       label="Empresa"   icon={Database}    />
                <TabButton id="SECURITY"      label="Seguridad" icon={ShieldCheck} />
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-slate-50 rounded-[3rem] p-12 shadow-sm min-h-[500px]">

                {/* ── 1. GENERAL ─────────────────────────────────────────── */}
                {activeTab === 'GENERAL' && (
                    <div key="general" className="space-y-12 w-full animate-in slide-in-from-bottom-8 duration-500">
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
                            <div className="p-6 bg-slate-800/50 rounded-[2rem] flex items-center justify-between">
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
                    <div key="llm" className="space-y-12 w-full animate-in slide-in-from-bottom-8 duration-500">
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
                                className="p-8 bg-slate-800/50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-slate-900/80 backdrop-blur-xl hover:border-indigo-100 transition-all"
                                onClick={() => setLlmActive(!llmActive)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Módulo LLM</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Activa el asistente de inventario por IA</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${llmActive ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-slate-900/80 backdrop-blur-xl rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Selector de Origen del LLM */}
                            <div className="space-y-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Origen del LLM</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'local', label: 'Local' },
                                        { id: 'external', label: 'Manual' },
                                        { id: 'free', label: 'Gratuito' }
                                    ].map((s) => (
                                        <button
                                            key={s.id} type="button"
                                            onClick={() => setLlmSource(s.id)}
                                            className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                                                llmSource === s.id
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                    : 'border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Entrada de API Key Externa o Gratuita */}
                            {llmSource !== 'local' && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">API Key / Token {llmSource === 'free' ? 'Gratuita' : 'Externa'}</div>
                                    <input
                                        type="text"
                                        value={llmExternalKey}
                                        onChange={(e) => setLlmExternalKey(e.target.value)}
                                        placeholder={llmSource === 'free' ? 'Ingresa Token de HuggingFace...' : 'Ingresa API Key Externa de OpenAI...'}
                                        className="w-full bg-slate-800/50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:bg-slate-900/80 backdrop-blur-xl outline-none transition-all"
                                    />
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Clave para la comunicación con el proveedor seleccionado.</p>
                                </div>
                            )}

                            {/* Selector de Modelo con Tarjetas */}
                            <div className="space-y-3">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    Modelos Disponibles en MiniModelGarden
                                </div>

                                {gardenLoading && (
                                    <div className="p-8 text-center text-slate-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Consultando MiniModelGarden...
                                    </div>
                                )}

                                {!gardenLoading && gardenModels.length === 0 && llmSource === 'local' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {localModels.length > 0 ? localModels.map((m) => (
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
                                        )) : (
                                            <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-800/50 rounded-[2rem]">
                                                No se pudieron cargar los modelos. Verifica que MiniModelGarden esté activo.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!gardenLoading && llmSource !== 'local' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku', 'claude-3-sonnet'].map((m) => (
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
                                )}

                                <div className="grid grid-cols-1 gap-4">
                                    {gardenModels.filter(m => m.installed).map((model) => {
                                        const speed = classifySpeed(model.speed_tok_s);
                                        const intel = classifyIntel(model.parameter_count);
                                        const ctx = classifyContext(model.context_length);
                                        const isSelected = llmModel === model.name;

                                        return (
                                            <div
                                                key={model.name}
                                                onClick={() => {
                                                    setLlmModel(model.name);
                                                    setLlmSource('local');
                                                }}
                                                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100'
                                                        : 'border-slate-100 bg-slate-900/80 backdrop-blur-xl hover:border-slate-200 hover:shadow-md'
                                                }`}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                                                            style={{ background: (model as any).color || '#6366f1' }}>
                                                            {model.display.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900">{model.display}</div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{model.source}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {model.installed && (
                                                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">INSTALADO</span>
                                                        )}
                                                        <a
                                                            href={model.developer_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                                                            title={`Sitio del desarrollador`}
                                                        >
                                                            <ExternalLink size={14} className="text-slate-400 hover:text-indigo-600" />
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Bars */}
                                                <div className="space-y-3">
                                                    {/* Speed */}
                                                    <div>
                                                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                                                            <span>⚡ Velocidad</span>
                                                            <span>{speed.label}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all"
                                                                style={{ width: `${(speed.level / 5) * 100}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Intelligence */}
                                                    <div>
                                                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                                                            <span>🧠 Inteligencia</span>
                                                            <span>{intel.label}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-violet-500 rounded-full transition-all"
                                                                style={{ width: `${(intel.level / 5) * 100}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Context */}
                                                    <div>
                                                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                                                            <span>🎓 Contexto</span>
                                                            <span>{ctx.label}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-500 rounded-full transition-all"
                                                                style={{ width: `${(ctx.level / 5) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer info */}
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                    <span>💾 {model.size_mb}MB · {model.quantization}</span>
                                                    <span>{model.speed_tok_s} tok/s</span>
                                                </div>

                                                {/* Selected indicator */}
                                                {isSelected && (
                                                    <div className="mt-3 text-center">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase bg-indigo-100 px-4 py-1.5 rounded-full">
                                                            <CheckCircle size={12} /> Modelo Activo
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Panel de Sistema MiniModelGarden */}
                            {gardenSystem && (
                                <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Server className="text-emerald-400" size={20} />
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-emerald-400">MiniModelGarden</div>
                                            <div className="text-xs text-slate-400 font-mono">{gardenSystem.active_model || 'Sin modelo activo'}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        {/* RAM */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                                <span>💾 RAM</span>
                                                <span>{gardenSystem.ram_available_mb}MB</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${((gardenSystem.ram_total_mb - gardenSystem.ram_available_mb) / gardenSystem.ram_total_mb) * 100}%` }} />
                                            </div>
                                            <div className="text-[7px] text-slate-500">de {gardenSystem.ram_total_mb}MB</div>
                                        </div>

                                        {/* Disco */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                                <span>💿 Disco</span>
                                                <span>{gardenSystem.disk_free_gb}GB</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${(gardenSystem.disk_used_gb / gardenSystem.disk_total_gb) * 100}%` }} />
                                            </div>
                                            <div className="text-[7px] text-slate-500">de {gardenSystem.disk_total_gb}GB</div>
                                        </div>

                                        {/* CPU */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                                                <span>⚙️ CPU</span>
                                                <span>{gardenSystem.cpu_pct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${gardenSystem.cpu_pct}%` }} />
                                            </div>
                                            <div className="text-[7px] text-slate-500">{gardenSystem.cpu_cores} cores</div>
                                        </div>
                                    </div>
                                </div>
                            )}


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
                            {/* Opciones Avanzadas de Ollama Local */}

                            {llmSource === 'local' && (
                                <div className="grid grid-cols-2 gap-4 p-6 bg-slate-800/50 border border-slate-100 rounded-[2rem]">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            <span>Tamaño Contexto (Ollama)</span>
                                            <span className="text-indigo-600 font-bold">{numCtx}</span>
                                        </div>
                                        <input
                                            type="range" min="1024" max="8192" step="1024"
                                            value={numCtx}
                                            onChange={(e) => setNumCtx(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            <span>Capas GPU (Ollama)</span>
                                            <span className="text-indigo-600 font-bold">{numGpu}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="99" step="1"
                                            value={numGpu}
                                            onChange={(e) => setNumGpu(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Estado RAG */}
                            <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Database className="text-indigo-400" size={24} />
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-indigo-400">Estado del RAG</div>
                                        <div className="text-sm font-bold uppercase tracking-tight">Vectores Sincronizados</div>
                                    </div>
                                </div>
                                <button type="button" className="px-4 py-2 bg-slate-900/80 backdrop-blur-xl/10 hover:bg-slate-900/80 backdrop-blur-xl/20 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Re-Indexar
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({
                                llm_modelo:       llmModel,
                                llm_temperatura:  String(temperature),
                                llm_max_tokens:   String(maxTokens),
                                llm_activo:       llmActive ? 'true' : 'false',
                                llm_source:       llmSource,
                                llm_external_key: llmExternalKey,
                                llm_num_ctx:      String(numCtx),
                                llm_num_gpu:      String(numGpu),
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
                    <div key="notifications" className="space-y-12 w-full animate-in slide-in-from-bottom-8 duration-500">
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
                                className="p-8 bg-slate-800/50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-slate-900/80 backdrop-blur-xl hover:border-indigo-100 transition-all"
                                onClick={() => setNotifFefo(!notifFefo)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Alertas FEFO Crítico</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Notificaciones cuando un lote entra en período crítico</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${notifFefo ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-slate-900/80 backdrop-blur-xl rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Toggle Stock Bajo */}
                            <div
                                className="p-8 bg-slate-800/50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between cursor-pointer group hover:bg-slate-900/80 backdrop-blur-xl hover:border-indigo-100 transition-all"
                                onClick={() => setNotifStock(!notifStock)}
                            >
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-slate-900 uppercase">Stock Bajo</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alerta cuando el stock cae por debajo del mínimo</div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 flex transition-all ${notifStock ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'}`}>
                                    <div className="w-6 h-6 bg-slate-900/80 backdrop-blur-xl rounded-full shadow-lg" />
                                </div>
                            </div>

                            {/* Canales de Entrega */}
                            <div className="p-6 bg-slate-800/50 border border-slate-100 rounded-[2rem] space-y-4">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Canales de entrega</div>

                                {/* Email Channel */}
                                <div className="flex items-center justify-between"
                                    onClick={() => setNotifEmail(!notifEmail)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <Bell size={14} className="text-blue-500" />
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-600 uppercase">Email</div>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full p-0.5 flex cursor-pointer transition-all ${notifEmail ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                                        <div className="w-4 h-4 bg-slate-900/80 backdrop-blur-xl rounded-full shadow" />
                                    </div>
                                </div>

                                {/* Telegram Channel */}
                                <div className="flex items-center justify-between"
                                    onClick={() => setNotifTelegram(!notifTelegram)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
                                            <Bell size={14} className="text-sky-500" />
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-600 uppercase">Telegram</div>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full p-0.5 flex cursor-pointer transition-all ${notifTelegram ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                                        <div className="w-4 h-4 bg-slate-900/80 backdrop-blur-xl rounded-full shadow" />
                                    </div>
                                </div>

                                {/* Admin Email */}
                                {notifEmail && (
                                    <div className="space-y-2 pt-2">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email del administrador</div>
                                        <input
                                            type="email"
                                            value={notifEmailAdmin}
                                            onChange={(e) => setNotifEmailAdmin(e.target.value)}
                                            placeholder="admin@pymetory.com"
                                            className="w-full bg-slate-900/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl px-5 py-3 text-xs font-bold text-slate-900 focus:border-indigo-600 outline-none transition-all"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Thresholds */}
                            <div className="p-6 bg-slate-800/50 border border-slate-100 rounded-[2rem] space-y-5">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Umbrales de alerta</div>

                                {/* FEFO Días */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        <span>Días críticos FEFO</span>
                                        <span className="text-orange-600">{fefoDias} días</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="30" step="1"
                                        value={fefoDias}
                                        onChange={(e) => setFefoDias(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                    />
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Lotes con menos de {fefoDias} días hasta vencimiento disparan alerta</p>
                                </div>

                                {/* Stock Bajo Umbral */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        <span>Umbral stock bajo (por material)</span>
                                        <span className="text-orange-600">{stockUmbral} unidades</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="500" step="10"
                                        value={stockUmbral}
                                        onChange={(e) => setStockUmbral(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                    />
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Cantidad por debajo de la cual se dispara alerta de stock bajo</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSave({
                                notif_fefo_activo:    notifFefo     ? 'true' : 'false',
                                notif_stock_bajo:     notifStock    ? 'true' : 'false',
                                notif_email_activo:   notifEmail    ? 'true' : 'false',
                                notif_telegram_activo: notifTelegram ? 'true' : 'false',
                                notif_email_admin:    notifEmailAdmin,
                                fefo_dias_criticos:   String(fefoDias),
                                stock_umbral_bajo:    String(stockUmbral),
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
                    <div key="security" className="space-y-12 w-full animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><ShieldCheck size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Seguridad y Acceso</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protección de credenciales y sesiones</p>
                            </div>
                        </div>

                        <div className="space-y-8 pt-4">
                            {/* Sesión timeout info */}
                            <div className="p-8 bg-slate-800/50 border border-slate-100 rounded-[2.5rem] space-y-3">
                                <div className="flex items-center gap-3">
                                    <Key size={16} className="text-slate-400" />
                                    <div className="text-sm font-black text-slate-700 uppercase">Timeout de sesión</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number" min="30" max="480" step="30"
                                        defaultValue={120}
                                        id="session-timeout"
                                        className="w-32 bg-slate-900/80 backdrop-blur-xl border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 text-center"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">minutos de inactividad</span>
                                </div>
                            </div>

                            {/* Log de Auditoría */}
                            <div className="p-8 bg-slate-800/50 border border-slate-100 rounded-[2.5rem] flex items-center justify-between">
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

                {/* ── 5. CUSTOM FIELDS ─────────────────────────────────────── */}
                {activeTab === 'CUSTOMFIELDS' && (
                    <div key="customfields" className="space-y-10 w-full animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-purple-50 text-purple-600 rounded-[1.5rem]"><Tag size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Campos Personalizados</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Agrega campos extra a los materiales (color, proveedor, N° factura...)</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-800/50 border border-slate-100 rounded-[2rem] space-y-4">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nuevo campo</div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Nombre (ej: Color)" value={newField.name}
                                    onChange={e => { const v = e.target.value; setNewField(p => ({...p, name: v, key: v.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,'') })); }}
                                    className="bg-slate-900 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-purple-600" />
                                <input type="text" placeholder="Clave (ej: color)" value={newField.key}
                                    onChange={e => setNewField(p => ({...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'_')}))}
                                    className="bg-slate-900 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-purple-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <select value={newField.type} onChange={e => setNewField(p => ({...p, type: e.target.value}))}
                                    className="bg-slate-900 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-purple-600">
                                    <option value="text">Texto</option>
                                    <option value="number">Número</option>
                                    <option value="date">Fecha</option>
                                    <option value="select">Selector</option>
                                    <option value="boolean">Sí/No</option>
                                    <option value="url">URL</option>
                                </select>
                                {newField.type === 'select' && (
                                    <input type="text" placeholder="Opciones (rojo, azul, verde)" value={newField.options}
                                        onChange={e => setNewField(p => ({...p, options: e.target.value}))}
                                        className="flex-1 bg-slate-900 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:border-purple-600" />
                                )}
                                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 cursor-pointer">
                                    <input type="checkbox" checked={newField.required} onChange={e => setNewField(p => ({...p, required: e.target.checked}))} /> Obligatorio
                                </label>
                            </div>
                            <button onClick={handleCreateField} disabled={cfLoading || !newField.name || !newField.key}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">
                                <Plus size={14} /> Agregar Campo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {customFields.length === 0 && (
                                <div className="p-8 text-center text-slate-400 bg-slate-800/50 rounded-[2rem] text-[10px] font-bold uppercase">
                                    No hay campos personalizados. ¡Crea el primero!
                                </div>
                            )}
                            {customFields.map((field) => (
                                <div key={field.id} className="flex items-center gap-4 p-5 bg-slate-800/50 border border-slate-100 rounded-2xl">
                                    <GripVertical size={16} className="text-slate-300" />
                                    <div className="flex-1">
                                        <div className="text-sm font-black text-slate-900">{field.name}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">{field.key} · {field.type}{field.required ? ' · obligatorio' : ''}</div>
                                    </div>
                                    <button onClick={() => handleToggleField(field)}
                                        className={`w-10 h-5 rounded-full p-0.5 flex transition-all ${field.active ? 'bg-purple-600 justify-end' : 'bg-slate-300 justify-start'}`}>
                                        <div className="w-4 h-4 bg-white rounded-full shadow" />
                                    </button>
                                    <button onClick={() => handleDeleteField(field.id)}
                                        className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                                        <Trash2 size={16} className="text-slate-300 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── 6. COMPANY ───────────────────────────────────────────── */}
                {activeTab === 'COMPANY' && (
                    <div key="company" className="space-y-10 w-full animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Database size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Datos de la Empresa</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nombre, logo, dirección y contacto</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre empresa</div>
                                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                                        className="w-full bg-slate-800/50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono</div>
                                    <input type="text" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+57 300 000 0000"
                                        className="w-full bg-slate-800/50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-600" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Dirección</div>
                                <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Calle 123 #45-67, Ciudad"
                                    className="w-full bg-slate-800/50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-600" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">URL del Logo</div>
                                <input type="text" value={companyLogo} onChange={e => setCompanyLogo(e.target.value)} placeholder="https://miapp.com/logo.png"
                                    className="w-full bg-slate-800/50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-600" />
                            </div>
                            <button onClick={() => handleSave({
                                empresa_nombre: companyName,
                                empresa_logo: companyLogo,
                                empresa_direccion: companyAddress,
                                empresa_telefono: companyPhone,
                            })} disabled={saving}
                                className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95">
                                <Save size={14} /> Guardar Empresa
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default FigmaSettings;
