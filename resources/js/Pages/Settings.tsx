import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ChevronDown, ChevronRight, Save, Plus, Trash2, KeyRound, Users as UsersIcon,
    Cpu, SlidersHorizontal, RefreshCw, ShieldCheck, User as UserIcon, Power,
    Bell, Pencil, Shield, QrCode, Printer,
} from 'lucide-react';
import Sidebar from '../Components/Sidebar';

const CSRF = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
axios.defaults.headers.common['X-CSRF-TOKEN'] = CSRF;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

interface UserRow { id: number; name: string; email: string; role: 'admin'|'operario'; created_at: string|null; }
interface ApiKey { id: number; nombre: string; key_masked: string; base_url: string|null; model_name: string|null; tipo: 'opencode'|'openai'|'ollama'; activo: boolean; updated_at: string|null; }
type SettingsMap = Record<string, string>;

const field = 'w-full px-3 py-2 rounded-lg border border-[#111111]/20 bg-white font-mono text-sm text-[#111111] focus:outline-none focus:border-[#C42A1E]';
const label = 'block font-mono text-[11px] uppercase tracking-wider text-[#595959] mb-1';
const btn = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-transform hover:-translate-y-0.5';

function Section({ icon: Icon, title, subtitle, open, onToggle, children }: {
    icon: React.ElementType; title: string; subtitle: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-xl border border-[#111111]/10 overflow-hidden">
            <button onClick={onToggle} className="w-full flex items-center justify-between p-5 hover:bg-[#E8E4DD]/40 transition-colors">
                <div className="flex items-center gap-4 text-left">
                    <div className="h-11 w-11 rounded-lg bg-[#111111] text-[#F5F3EE] flex items-center justify-center"><Icon size={18} /></div>
                    <div><h2 className="font-sans font-bold text-lg text-[#111111]">{title}</h2><p className="font-mono text-xs text-[#595959]">{subtitle}</p></div>
                </div>
                {open ? <ChevronDown size={20} className="text-[#595959]" /> : <ChevronRight size={20} className="text-[#595959]" />}
            </button>
            {open && <div className="p-5 border-t border-[#111111]/10 bg-white/40">{children}</div>}
        </div>
    );
}

export default function Settings() {
    const { props } = usePage<any>();
    const user = props?.auth?.user ?? { name: 'Admin', role: 'admin' };
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openSec, setOpenSec] = useState<string>('general');
    const [flash, setFlash] = useState('');
    const toggle = (k: string) => setOpenSec(c => c === k ? '' : k);
    const notify = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 2500); };

    // ── Settings ──
    const [settings, setSettings] = useState<SettingsMap>({});
    const loadSettings = useCallback(async () => {
        const { data } = await axios.get('/settings');
        const flat: SettingsMap = {};
        Object.values(data.settings ?? {}).forEach((g: any) => Object.entries(g).forEach(([k, v]: [string, any]) => flat[k] = v.valor ?? ''));
        setSettings(flat);
    }, []);
    const setVal = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));
    const saveSettings = async (keys: string[]) => {
        const payload: Record<string,string> = {};
        keys.forEach(k => payload[k] = settings[k] ?? '');
        await axios.put('/settings', { settings: payload });
        notify('Guardado.');
    };

    // ── Ollama ──
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const loadOllama = useCallback(async () => { try { const { data } = await axios.get('/ollama-models'); setOllamaModels(data.models ?? []); } catch { setOllamaModels([]); } }, []);

    // ── API Keys ──
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [nk, setNk] = useState<any>({ nombre: '', key: '', base_url: '', model_name: '', tipo: 'opencode', activo: true });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [providers, setProviders] = useState<Record<string,any>>({});
    const [currentSource, setCurrentSource] = useState('local');

    const loadKeys = useCallback(async () => { const { data } = await axios.get('/api/api-keys'); setApiKeys(data.api_keys ?? []); }, []);
    const loadProviders = useCallback(async () => { try { const {data} = await axios.get('/api/llm-providers'); setProviders(data); } catch {} }, []);

    const saveKey = async () => {
        if (!nk.nombre) return notify('Nombre requerido.');
        if (!nk.key && !editingId) return notify('API Key requerida.');
        try {
            const csrf = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || CSRF;
            axios.defaults.headers.common['X-CSRF-TOKEN'] = csrf;
            if (editingId) {
                await axios.put(`/api/api-keys/${editingId}`, { nombre: nk.nombre, key: nk.key || undefined, base_url: nk.base_url, model_name: nk.model_name, tipo: nk.tipo });
                setEditingId(null);
            } else {
                await axios.post('/api/api-keys', nk);
            }
            notify(editingId ? 'Key actualizada.' : 'Key creada.');
            setNk({ nombre: '', key: '', base_url: '', model_name: '', tipo: 'opencode', activo: true });
            await loadKeys();
        } catch (e: any) {
            notify(e?.response?.data?.message || e?.message || 'Error al guardar. Refresca la página (F5).');
        }
    };
    const editKey = (k: ApiKey) => { setEditingId(k.id); setNk({ nombre: k.nombre, key: '', base_url: k.base_url || '', model_name: k.model_name || '', tipo: k.tipo, activo: k.activo }); };
    const cancelEdit = () => { setEditingId(null); setNk({ nombre: '', key: '', base_url: '', model_name: '', tipo: 'opencode', activo: true }); };
    const toggleKey = async (k: ApiKey) => { await axios.put(`/api/api-keys/${k.id}`, { activo: !k.activo }); await loadKeys(); };
    const deleteKey = async (id: number) => { if (!confirm('¿Eliminar esta API Key?')) return; await axios.delete(`/api/api-keys/${id}`); await loadKeys(); notify('API Key eliminada'); };
    const testKey = async (id: number) => {
        notify('Probando...');
        try {
            const { data } = await axios.post(`/api/api-keys/${id}/test`);
            notify(data.ok ? '✅ Conexión OK' : `❌ ${data.detail || data.error || 'Falló'}`);
        } catch (e: any) {
            notify('❌ ' + (e?.response?.data?.error || e?.message || 'Error de conexión'));
        }
    };

    // ── Providers CRUD ──
    const [pk, setPk] = useState<any>({ key: '', label: '', base_url: '', models: '', enabled: true });
    const [provEditKey, setProvEditKey] = useState<string | null>(null);
    const saveProv = async () => {
        if (!pk.key || !pk.label || !pk.base_url) return notify('Key, Label y Base URL requeridos.');
        const payload = { ...pk, models: (pk.models || '').split(',').map((s:string) => s.trim()).filter(Boolean) };
        if (provEditKey) {
            await axios.put(`/api/llm-providers/${provEditKey}`, payload);
            setProvEditKey(null);
        } else {
            await axios.post('/api/llm-providers', payload);
        }
        setPk({ key: '', label: '', base_url: '', models: '', enabled: true });
        await loadProviders();
        notify(provEditKey ? 'Provider actualizado.' : 'Provider creado.');
    };
    const editProv = (key: string) => {
        const p = providers[key] || {};
        setProvEditKey(key);
        setPk({ key, label: p.label || '', base_url: p.base_url || '', models: (p.models || []).join(', '), enabled: p.enabled !== false });
    };
    const deleteProv = async (key: string) => {
        if (!confirm(`¿Eliminar provider "${key}"?`)) return;
        await axios.delete(`/api/llm-providers/${key}`);
        await loadProviders();
        notify('Provider eliminado.');
    };
    const toggleProv = async (key: string) => {
        const p = providers[key] || {};
        await axios.put(`/api/llm-providers/${key}`, { enabled: p.enabled === false });
        await loadProviders();
    };

    const testRag = async (prompt: string) => {
        const el = document.getElementById('ragTestResult');
        if (!prompt) { if (el) el.textContent = 'Escribe una pregunta.'; return; }
        if (el) el.textContent = 'Probando...';
        try {
            const { data } = await axios.post('/chat-rag', { prompt });
            const resp = data.response || JSON.stringify(data);
            if (el) el.innerHTML = `<b style="color:#1B7F3B">✅ ${data.model || 'RAG'} · ${data.source || ''}</b><br>${resp}`;
        } catch (e: any) {
            if (el) el.textContent = '❌ ' + (e?.response?.data?.message || e?.message || 'Error');
        }
    };

    // ── Users ──
    const [users, setUsers] = useState<UserRow[]>([]);
    const [nu, setNu] = useState({ name: '', email: '', password: '', role: 'operario' });
    const loadUsers = useCallback(async () => { const { data } = await axios.get('/api/users'); setUsers(data.users ?? []); }, []);
    const createUser = async () => { if (!nu.name || !nu.email || nu.password.length < 8) return notify('Nombre, email y contraseña (min 8).'); await axios.post('/api/users', nu); setNu({ name: '', email: '', password: '', role: 'operario' }); await loadUsers(); notify('Usuario creado.'); };
    const changeRole = async (u: UserRow, role: string) => { await axios.put(`/api/users/${u.id}`, { role }); await loadUsers(); };
    const resetPass = async (u: UserRow) => { const pw = prompt(`Nueva contraseña para ${u.name} (min 8):`); if (!pw || pw.length < 8) return notify('Minimo 8 caracteres.'); await axios.post(`/api/users/${u.id}/reset-password`, { password: pw }); notify('Reset OK.'); };
    const deleteUser = async (u: UserRow) => { if (!confirm(`¿Eliminar a ${u.name}?`)) return; try { await axios.delete(`/api/users/${u.id}`); await loadUsers(); notify('Eliminado.'); } catch (e: any) { notify(e?.response?.data?.message ?? 'Error.'); } };

    useEffect(() => { loadSettings(); loadOllama(); loadKeys(); loadUsers(); loadProviders(); }, [loadSettings, loadOllama, loadKeys, loadUsers, loadProviders]);

    useEffect(() => { setCurrentSource(settings.llm_source || 'local'); }, [settings.llm_source]);

    // Auto-fill base_url from provider on mount
    useEffect(() => {
        const p = providers[nk.tipo];
        if (p?.base_url && !nk.base_url) {
            setNk(prev => ({...prev, base_url: p.base_url, model_name: prev.model_name || (p.models || [])[0] || ''}));
        }
    }, [providers, nk.tipo]);

    return (
        <div className="flex h-screen bg-[#F5F3EE] text-[#111111] overflow-hidden">
            <Head title="Configuración" />
            <Sidebar sidebarOpen={sidebarOpen} mobileOpen={mobileOpen} user={user} activeView="CONFIGURACION" mode="kanban" onMobileClose={() => setMobileOpen(false)} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 border-b border-[#111111]/10 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md">
                    <div><span className="text-[#4A4A4A] text-xs font-bold uppercase tracking-widest italic">Pymetory /</span><h1 className="text-xs font-black uppercase tracking-widest">Configuración</h1></div>
                    {flash && <div className="font-mono text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg border border-green-300">{flash}</div>}
                </header>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 max-w-4xl w-full mx-auto">
                    {/* ── 1. GENERAL ── */}
                    <Section icon={SlidersHorizontal} title="General" subtitle="Identidad del sistema y parametros operativos" open={openSec === 'general'} onToggle={() => toggle('general')}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className={label}>Nombre App</label><input className={field} value={settings.app_nombre ?? ''} onChange={e => setVal('app_nombre', e.target.value)} /></div>
                            <div><label className={label}>Empresa</label><input className={field} value={settings.app_empresa ?? ''} onChange={e => setVal('app_empresa', e.target.value)} /></div>
                            <div><label className={label}>Zona Horaria</label><input className={field} value={settings.zona_horaria ?? ''} onChange={e => setVal('zona_horaria', e.target.value)} /></div>
                            <div><label className={label}>Dias Criticos FEFO</label><input type="number" className={field} value={settings.fefo_dias_criticos ?? ''} onChange={e => setVal('fefo_dias_criticos', e.target.value)} /></div>
                            <div><label className={label}>Stock Umbral Bajo</label><input type="number" className={field} value={settings.stock_umbral_bajo ?? ''} onChange={e => setVal('stock_umbral_bajo', e.target.value)} /></div>
                            <div><label className={label}>Timeout Sesion (min)</label><input type="number" className={field} value={settings.sesion_timeout_min ?? ''} onChange={e => setVal('sesion_timeout_min', e.target.value)} /></div>
                            <div><label className={label}>Max Intentos Login</label><input type="number" className={field} value={settings.max_intentos_login ?? ''} onChange={e => setVal('max_intentos_login', e.target.value)} /></div>
                        </div>
                        <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={() => saveSettings(['app_nombre','app_empresa','zona_horaria','fefo_dias_criticos','stock_umbral_bajo','sesion_timeout_min','max_intentos_login'])}><Save size={15} /> Guardar General</button>
                    </Section>

                    {/* ── 2. MOTOR RAG ── */}
                    <Section icon={Cpu} title="Motor RAG" subtitle="Configuracion centralizada del asistente IA: modelo, proveedor, parametros y test en vivo" open={openSec === 'llm'} onToggle={() => toggle('llm')}>
                        {/* ── Proveedor + Key activa ── */}
                        <div className="p-4 rounded-lg bg-[#E8E4DD]/30 border border-[#111111]/10 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-sans font-black text-[11px] uppercase tracking-wider text-[#595959]">Proveedor y Key activa</span>
                                <span className="font-mono text-[10px] text-[#4A4A4A]">
                                    {apiKeys.filter(k => k.activo && k.tipo === settings.llm_source).length > 0
                                        ? `Usando: ${apiKeys.find(k => k.activo && k.tipo === settings.llm_source)?.nombre || '—'}`
                                        : settings.llm_source === 'local' ? 'Ollama (sin key)' : '⚠ Sin key activa'}
                                </span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                    <label className={label}>Origen</label>
                                    <select className={field} value={settings.llm_source ?? 'local'} onChange={e => setVal('llm_source', e.target.value)}>
                                        <option value="local">Ollama (local)</option>
                                        {Object.entries(providers).filter(([,p]:[string,any]) => p.enabled !== false).map(([k,v]:[string,any]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={label}>Activo</label>
                                    <select className={field} value={settings.llm_activo ?? 'true'} onChange={e => setVal('llm_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select>
                                </div>
                            </div>
                        </div>

                        {/* ── Modelo ── */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                                <label className={`${label} mb-0`}>Modelo</label>
                                <button onClick={loadOllama} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[#E63B2E] hover:underline"><RefreshCw size={11} /> Refrescar</button>
                            </div>
                            <select className={field} value={settings.llm_modelo ?? ''} onChange={e => setVal('llm_modelo', e.target.value)}>
                                <option value="">— Seleccionar —</option>
                                {settings.llm_source === 'local' && ollamaModels.length > 0 && <optgroup label="▸ Ollama Local">
                                    {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>}
                                {settings.llm_source !== 'local' && (providers[settings.llm_source]?.models || []).length > 0 && <optgroup label={`▸ ${providers[settings.llm_source]?.label || settings.llm_source}`}>
                                    {(providers[settings.llm_source]?.models || []).map((m:string) => <option key={m} value={m}>{m}</option>)}
                                </optgroup>}
                                {settings.llm_source !== 'local' && apiKeys.filter(k => k.activo && k.tipo === settings.llm_source && k.model_name).length > 0 && <optgroup label="▸ Keys activas">
                                    {apiKeys.filter(k => k.activo && k.tipo === settings.llm_source && k.model_name).map(k => <option key={`k-${k.id}`} value={k.model_name!}>{k.model_name} [{k.nombre}]</option>)}
                                </optgroup>}
                            </select>
                            <p className="font-mono text-[10px] text-[#4A4A4A] mt-1">
                                {ollamaModels.length > 0 && <span>{ollamaModels.length} locales · </span>}
                                {apiKeys.filter(k => k.activo).length} keys activas · {(providers[settings.llm_source]?.models || []).length} modelos provider
                            </p>
                        </div>

                        {/* ── Privacy Mode (anonimizar datos antes de API externa) ── */}
                        {settings.llm_source !== 'local' && (
                            <label className="flex items-center gap-2 mb-4 cursor-pointer bg-indigo-600/10 border border-indigo-500/30 rounded-lg p-3">
                                <input type="checkbox" checked={!!settings.llm_privacy} onChange={e => setVal('llm_privacy', e.target.checked ? '1' : '0')} />
                                <div>
                                    <span className="font-bold text-xs">🔒 Modo Privacidad</span>
                                    <p className="text-[10px] text-[#888]">Ollama local anonimiza los datos en un grafo antes de enviarlos a la API externa. Los nombres reales nunca salen de Titan.</p>
                                </div>
                            </label>
                        )}

                        {/* ── Parametros ── */}
                        <div className="grid md:grid-cols-3 gap-3 mb-4">
                            <div><label className={label}>Temperatura</label><input type="number" step="0.1" min="0" max="2" className={field} value={settings.llm_temperatura ?? '0.3'} onChange={e => setVal('llm_temperatura', e.target.value)} /></div>
                            <div><label className={label}>Max Tokens</label><input type="number" className={field} value={settings.llm_max_tokens ?? '1024'} onChange={e => setVal('llm_max_tokens', e.target.value)} /></div>
                            <div><label className={label}>Contexto Lotes</label><input type="number" className={field} value={settings.llm_contexto_lotes ?? '20'} onChange={e => setVal('llm_contexto_lotes', e.target.value)} /></div>
                        </div>

                        {/* ── System Prompt ── */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                                <label className={label}>System Prompt</label>
                                <button onClick={() => setVal('llm_prompt', 'Eres Pymetory IA, asistente de inventarios. Responde de forma concisa y directa, sin rodeos.')} className="font-mono text-[10px] uppercase text-[#E63B2E] hover:underline">Restaurar default</button>
                            </div>
                            <textarea className={`${field} font-mono text-xs h-24 resize-y`} value={settings.llm_prompt ?? ''} onChange={e => setVal('llm_prompt', e.target.value)} placeholder="Eres Pymetory IA, asistente de inventarios. Responde de forma concisa y directa, sin rodeos." />
                        </div>

                        {/* ── Test RAG en vivo ── */}
                        <div className="p-4 rounded-lg bg-[#E8E4DD]/20 border border-[#111111]/10 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="font-sans font-black text-[11px] uppercase tracking-wider text-[#595959]">Probar RAG</span>
                                <input id="ragTestInput" className={`${field} flex-1`} placeholder="Ej: ¿Cuál es el lote que vence primero?" onKeyDown={e => { if (e.key === 'Enter') { const i = (document.getElementById('ragTestInput') as HTMLInputElement); testRag(i.value); } }} />
                                <button className={`${btn} bg-[#111111] text-[#F5F3EE]`} onClick={() => { const i = (document.getElementById('ragTestInput') as HTMLInputElement); testRag(i.value); }}><RefreshCw size={15} /> Probar</button>
                            </div>
                            <div id="ragTestResult" className="font-mono text-xs text-[#4A4A4A] mt-2 max-h-32 overflow-y-auto"></div>
                        </div>

                        <button className={`${btn} bg-[#111111] text-[#F5F3EE]`} onClick={() => saveSettings(['llm_source','llm_activo','llm_modelo','llm_temperatura','llm_max_tokens','llm_contexto_lotes','llm_prompt','llm_privacy'])}><Save size={15} /> Guardar Motor RAG</button>
                    </Section>

                    {/* ── 3. ALERTAS ── */}
                    <Section icon={Bell} title="Alertas y Notificaciones" subtitle="Configuracion de avisos FEFO, stock bajo y canales" open={openSec === 'alertas'} onToggle={() => toggle('alertas')}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className={label}>Alertas FEFO</label><select className={field} value={settings.notif_fefo_activo ?? 'true'} onChange={e => setVal('notif_fefo_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                            <div><label className={label}>Alertas Stock Bajo</label><select className={field} value={settings.notif_stock_bajo ?? 'true'} onChange={e => setVal('notif_stock_bajo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                            <div className="md:col-span-2"><label className={label}>Email Admin</label><input type="email" className={field} value={settings.notif_email_admin ?? ''} onChange={e => setVal('notif_email_admin', e.target.value)} /></div>
                            <div><label className={label}>Notificar por Email</label><select className={field} value={settings.notif_email_activo ?? 'false'} onChange={e => setVal('notif_email_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                            <div><label className={label}>Notificar por Telegram</label><select className={field} value={settings.notif_telegram_activo ?? 'false'} onChange={e => setVal('notif_telegram_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                        </div>
                        <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={() => saveSettings(['notif_fefo_activo','notif_stock_bajo','notif_email_admin','notif_email_activo','notif_telegram_activo'])}><Save size={15} /> Guardar Alertas</button>
                    </Section>

                    {/* ── 4. API KEYS ── */}
                    <Section icon={KeyRound} title="API Keys" subtitle="Credenciales de proveedores LLM (cifradas en reposo)" open={openSec === 'keys'} onToggle={() => toggle('keys')}>
                        {apiKeys.length === 0 && <p className="font-mono text-xs text-[#4A4A4A] mb-4">Sin API Keys registradas.</p>}
                        {(['opencode','openai','ollama','anthropic','google'] as const).filter(t => apiKeys.some(k => k.tipo === t)).map(tipo => {
                          const provider = providers[tipo];
                          const keys = apiKeys.filter(k => k.tipo === tipo);
                          return (
                            <div key={tipo} className="mb-5">
                              <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="font-sans font-black text-[11px] uppercase tracking-wider text-[#595959]">{provider?.label || tipo}</span>
                                <span className="font-mono text-[10px] text-[#4A4A4A]">{keys.length} key(s)</span>
                              </div>
                              <div className="space-y-2">
                                {keys.map(k => (
                                  <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#111111]/10 bg-white">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-sans font-bold text-sm truncate">{k.nombre}</span>
                                        {k.activo && tipo === currentSource && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-mono text-[9px] font-black uppercase">● EN USO</span>}
                                        <span className="px-1.5 py-0.5 rounded bg-[#E8E4DD] font-mono text-[10px] uppercase">{k.tipo}</span>
                                        {k.activo && tipo !== currentSource && <span className="font-mono text-[10px] text-green-600">activa</span>}
                                      </div>
                                      <p className="font-mono text-[11px] text-[#4A4A4A] truncate">{k.key_masked} · {k.model_name || 'sin modelo'} · {k.base_url || 'sin url'}</p>
                                    </div>
                                    <button onClick={() => toggleKey(k)} title={k.activo ? 'Desactivar' : 'Activar'} className={`p-2 rounded-lg ${k.activo ? 'text-green-600 bg-green-50' : 'text-[#111111]/30 bg-[#E8E4DD]'}`}><Power size={15} /></button>
                                    <button onClick={() => testKey(k.id)} className="p-2 rounded-lg text-[#2563eb] hover:bg-[#2563eb]/10" title="Probar conexión"><RefreshCw size={15} /></button>
                                    <button onClick={() => editKey(k)} className="p-2 rounded-lg text-[#595959] hover:bg-[#E8E4DD]" title="Editar"><Pencil size={15} /></button>
                                    <button onClick={() => deleteKey(k.id)} className="p-2 rounded-lg text-[#E63B2E] hover:bg-[#E63B2E]/10" title="Eliminar"><Trash2 size={15} /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="grid md:grid-cols-3 gap-3 p-4 rounded-lg bg-[#E8E4DD]/40 border border-[#111111]/10">
                            <input className={field} placeholder="Nombre *" value={nk.nombre} onChange={e => setNk({...nk, nombre: e.target.value})} />
                            <select className={field} value={nk.tipo} onChange={e => {
                              const t = e.target.value;
                              const p = providers[t] || {};
                              setNk(prev => ({...prev, tipo: t, base_url: p.base_url || '', model_name: (p.models || [])[0] || ''}));
                            }}>
                                {Object.entries(providers).filter(([,p]:[string,any]) => p.enabled !== false).map(([k,v]:[string,any]) => <option key={k} value={k}>{v.label || k}</option>)}
                                {Object.keys(providers).length === 0 && <option value="opencode">OpenCode</option>}
                            </select>
                            <select className={field} value={nk.model_name} onChange={e => setNk({...nk, model_name: e.target.value})}>
                                <option value="">— Modelo —</option>
                                {(providers[nk.tipo]?.models || []).map((m:string) => <option key={m} value={m}>{m}</option>)}
                                {nk.tipo === 'ollama' && ollamaModels.map((m:string) => <option key={m} value={m}>{m}</option>)}
                                {((providers[nk.tipo]?.models || []).length === 0 && nk.tipo !== 'ollama') && <option value="">Sin modelos</option>}
                            </select>
                            <input className={field} placeholder={editingId ? 'API Key (dejar vacio = no cambiar)' : 'API Key * (secreta)'} value={nk.key} onChange={e => setNk({...nk, key: e.target.value})} />
                            <input className={`${field} bg-[#E8E4DD]/60 cursor-not-allowed`} placeholder="Base URL" value={nk.base_url} readOnly />
                            <button className={`${btn} bg-[#E63B2E] text-white justify-center`} onClick={saveKey}>
                                {editingId ? <><Save size={15} /> Actualizar Key</> : <><Plus size={15} /> Nueva Key</>}
                            </button>
                            {editingId && <button className={`${btn} bg-[#111111]/10 text-[#111111] justify-center`} onClick={cancelEdit}>Cancelar</button>}
                        </div>

                        {/* ── Provider CRUD ── */}
                        <div className="mt-5 pt-4 border-t border-[#111111]/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-sans font-black text-[11px] uppercase tracking-wider text-[#595959]">Proveedores</span>
                                <span className="font-mono text-[10px] text-[#4A4A4A]">{Object.keys(providers).length} configurados</span>
                            </div>
                            <div className="space-y-2 mb-4">
                                {Object.entries(providers).map(([key, p]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-2 p-2 rounded-lg border border-[#111111]/10 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs">{key}</span>
                                                <span className="font-sans text-xs text-[#4A4A4A]">{p.label}</span>
                                                <span className={`w-1.5 h-1.5 rounded-full ${p.enabled !== false ? 'bg-green-500' : 'bg-[#111111]/20'}`}></span>
                                            </div>
                                            <p className="font-mono text-[10px] text-[#4A4A4A] truncate">{p.base_url} · {(p.models || []).length} modelos</p>
                                        </div>
                                        <button onClick={() => toggleProv(key)} title={p.enabled !== false ? 'Deshabilitar' : 'Habilitar'} className={`p-1.5 rounded ${p.enabled !== false ? 'text-green-600 bg-green-50' : 'text-[#111111]/20 bg-[#E8E4DD]'}`}><Power size={13} /></button>
                                        <button onClick={() => editProv(key)} className="p-1.5 rounded text-[#595959] hover:bg-[#E8E4DD]" title="Editar"><Pencil size={13} /></button>
                                        {p.from_db && <button onClick={() => deleteProv(key)} className="p-1.5 rounded text-[#E63B2E] hover:bg-[#E63B2E]/10" title="Eliminar"><Trash2 size={13} /></button>}
                                    </div>
                                ))}
                                {Object.keys(providers).length === 0 && <p className="font-mono text-xs text-[#4A4A4A]">Cargando...</p>}
                            </div>
                            <div className="grid md:grid-cols-2 gap-2 p-3 rounded-lg bg-[#E8E4DD]/20 border border-[#111111]/10">
                                <input className={field} placeholder="Key (ej: groq)" value={pk.key} onChange={e => setPk({...pk, key: e.target.value})} disabled={!!provEditKey} />
                                <input className={field} placeholder="Label (ej: Groq Cloud)" value={pk.label} onChange={e => setPk({...pk, label: e.target.value})} />
                                <input className={`${field} md:col-span-2`} placeholder="Base URL" value={pk.base_url} onChange={e => setPk({...pk, base_url: e.target.value})} />
                                <input className={`${field} md:col-span-2`} placeholder="Modelos (coma separados)" value={pk.models} onChange={e => setPk({...pk, models: e.target.value})} />
                                <button className={`${btn} ${provEditKey ? 'bg-[#C42A1E]' : 'bg-[#111111]'} text-[#F5F3EE] justify-center`} onClick={saveProv}>
                                    {provEditKey ? <><Save size={13} /> Actualizar Proveedor</> : <><Plus size={13} /> Nuevo Proveedor</>}
                                </button>
                                {provEditKey && <button className={`${btn} bg-[#111111]/10 text-[#111111] justify-center`} onClick={() => { setProvEditKey(null); setPk({ key: '', label: '', base_url: '', models: '', enabled: true }); }}>Cancelar</button>}
                            </div>
                        </div>
                    </Section>

                    {/* ── 5. USUARIOS ── */}
                    <Section icon={UsersIcon} title="Usuarios y Roles" subtitle="Altas, bajas, asignacion de roles y reseteo de contraseñas" open={openSec === 'users'} onToggle={() => toggle('users')}>
                        <div className="space-y-2 mb-5">
                            {users.map(u => (
                                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#111111]/10 bg-white">
                                    <div className="h-9 w-9 rounded-lg bg-[#E8E4DD] flex items-center justify-center font-serif italic font-bold">{u.name.charAt(0)}</div>
                                    <div className="flex-1 min-w-0"><p className="font-sans font-bold text-sm truncate">{u.name}</p><p className="font-mono text-[11px] text-[#4A4A4A] truncate">{u.email}</p></div>
                                    <select value={u.role} onChange={e => changeRole(u, e.target.value)} className="px-2 py-1.5 rounded-lg border border-[#111111]/15 bg-white font-mono text-xs">
                                        <option value="admin">admin</option><option value="operario">operario</option>
                                    </select>
                                    {u.role === 'admin' ? <ShieldCheck size={16} className="text-[#111111]" /> : <UserIcon size={16} className="text-[#4A4A4A]" />}
                                    <button onClick={() => resetPass(u)} className="p-2 rounded-lg text-[#595959] hover:bg-[#E8E4DD]"><KeyRound size={15} /></button>
                                    <button onClick={() => deleteUser(u)} className="p-2 rounded-lg text-[#E63B2E] hover:bg-[#E63B2E]/10"><Trash2 size={15} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 p-4 rounded-lg bg-[#E8E4DD]/40 border border-[#111111]/10">
                            <input className={field} placeholder="Nombre *" value={nu.name} onChange={e => setNu({...nu, name: e.target.value})} />
                            <input className={field} type="email" placeholder="Email *" value={nu.email} onChange={e => setNu({...nu, email: e.target.value})} />
                            <input className={field} type="password" placeholder="Contraseña (min. 8) *" value={nu.password} onChange={e => setNu({...nu, password: e.target.value})} />
                            <select className={field} value={nu.role} onChange={e => setNu({...nu, role: e.target.value})}><option value="operario">operario</option><option value="admin">admin</option></select>
                            <button className={`${btn} bg-[#E63B2E] text-white justify-center md:col-span-2`} onClick={createUser}><Plus size={15} /> Crear Usuario</button>
                        </div>
                    </Section>

                    {/* ── 6. SEGURIDAD ── */}
                    <Section icon={Shield} title="Seguridad" subtitle="Auditoria, politicas de acceso y configuracion de sesion" open={openSec === 'seguridad'} onToggle={() => toggle('seguridad')}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className={label}>Audit Log Activo</label><select className={field} value={settings.audit_log_activo ?? 'true'} onChange={e => setVal('audit_log_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                            <div><label className={label}>Max Intentos Login</label><input type="number" className={field} value={settings.max_intentos_login ?? ''} onChange={e => setVal('max_intentos_login', e.target.value)} /></div>
                            <div><label className={label}>Timeout Sesion (min)</label><input type="number" className={field} value={settings.sesion_timeout_min ?? ''} onChange={e => setVal('sesion_timeout_min', e.target.value)} /></div>
                            <div><label className={label}>Passwords en Backend</label><input className={field} value="✅ .env (nunca expuesto)" disabled /></div>
                        </div>
                        <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={() => saveSettings(['audit_log_activo','max_intentos_login','sesion_timeout_min'])}><Save size={15} /> Guardar Seguridad</button>
                    </Section>

                    {/* ── 7. CODIGOS QR ── */}
                    <Section icon={QrCode} title="Codigos QR" subtitle="Configuracion de generacion de codigos QR para etiquetas" open={openSec === 'qr'} onToggle={() => toggle('qr')}>
                        {(() => {
                            const [qrLocal, setQrLocal] = useState(() => {
                                const raw = localStorage.getItem('pymetory_qr_config');
                                return raw ? JSON.parse(raw) : { size: 200, correction: 'H', payload: 'full' };
                            });
                            const saveQr = () => { localStorage.setItem('pymetory_qr_config', JSON.stringify(qrLocal)); notify('Configuracion QR guardada'); };
                            return <>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className={label}>Tamaño QR (px)</label><input type="number" className={field} value={qrLocal.size} onChange={e => setQrLocal({...qrLocal, size: parseInt(e.target.value) || 200})} /></div>
                                    <div><label className={label}>Correccion de Error</label><select className={field} value={qrLocal.correction} onChange={e => setQrLocal({...qrLocal, correction: e.target.value})}>
                                        <option value="L">L - Baja (7%)</option><option value="M">M - Media (15%)</option><option value="Q">Q - Alta (25%)</option><option value="H">H - Maxima (30% · Bodega)</option>
                                    </select></div>
                                    <div><label className={label}>Contenido del QR</label><select className={field} value={qrLocal.payload} onChange={e => setQrLocal({...qrLocal, payload: e.target.value})}>
                                        <option value="full">JSON completo (id, SKU, lote)</option><option value="id">Solo ID del lote</option><option value="url">URL a ficha del lote</option>
                                    </select></div>
                                </div>
                                <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={saveQr}><Save size={15} /> Guardar QR</button>
                            </>;
                        })()}
                    </Section>

                    {/* ── 8. IMPRESION DE ETIQUETAS (Ensayo 4 integrado) ── */}
                    <Section icon={Printer} title="Impresion de Etiquetas" subtitle="Perfiles, posicion libre de elementos y preview en vivo" open={openSec === 'print'} onToggle={() => toggle('print')}>
                        {(() => {
                            interface LabelConfig {
                                labelW: number; labelH: number; qrSize: number; qrX: number; qrY: number;
                                nameX: number; nameY: number; skuX: number; skuY: number;
                                loteX: number; loteY: number; venceX: number; venceY: number;
                                cols: number; gapX: number; gapY: number; examples: number;
                                nameFontSize: number; skuFontSize: number; loteFontSize: number; venceFontSize: number; barcodeSize: number; barcodeX: number; barcodeY: number;
                                showName: boolean; showSku: boolean; showLote: boolean; showVence: boolean;
                            }
                            const defaults: LabelConfig = { labelW: 250, labelH: 150, qrSize: 100, qrX: 75, qrY: 25, nameX: 10, nameY: 10, skuX: 10, skuY: 110, loteX: 130, loteY: 110, venceX: 10, venceY: 128, cols: 1, gapX: 10, gapY: 10, nameFontSize: 11, skuFontSize: 9, loteFontSize: 9, venceFontSize: 9, barcodeSize: 50, barcodeX: 75, barcodeY: 30, examples: 3, showName: true, showSku: true, showLote: true, showVence: true };
                            const personalizado1: LabelConfig = { labelW: 230, labelH: 200, qrSize: 135, qrX: 40, qrY: 25, nameX: 55, nameY: 10, skuX: 10, skuY: 180, loteX: 135, loteY: 180, venceX: 5, venceY: 168, cols: 2, gapX: 10, gapY: 10, nameFontSize: 11, skuFontSize: 9, loteFontSize: 9, venceFontSize: 9, barcodeSize: 50, barcodeX: 75, barcodeY: 30, examples: 3, showName: true, showSku: true, showLote: true, showVence: true };

                            const [profiles, setProfiles] = useState<{name:string;config:LabelConfig}[]>(() => {
                                try { const s = localStorage.getItem('ensayo4_profiles'); return s ? JSON.parse(s) : [{name:'Por Defecto',config:{...defaults}},{name:'Personalizado 1',config:{...personalizado1}}]; }
                                catch { return [{name:'Por Defecto',config:{...defaults}},{name:'Personalizado 1',config:{...personalizado1}}]; }
                            });
                            const [activeIdx, setActiveIdx] = useState<number>(() => parseInt(localStorage.getItem('ensayo4_activeProfile') || '0'));
                            const [newName, setNewName] = useState('');
                            const [previewType, setPreviewType] = useState<'QR' | 'CODE128'>('QR');

                            const active = profiles[activeIdx] || profiles[0];
                            const cfg = active?.config || defaults;

                            // Persist
                            React.useEffect(() => { localStorage.setItem('ensayo4_profiles', JSON.stringify(profiles)); }, [profiles]);
                            React.useEffect(() => { localStorage.setItem('ensayo4_activeProfile', String(activeIdx)); }, [activeIdx]);

                            const updateCfg = (key: keyof LabelConfig, value: number | boolean) => {
                                setProfiles(prev => { const c = [...prev]; c[activeIdx] = {...c[activeIdx], config: {...c[activeIdx].config, [key]: value}}; return c; });
                            };
                            const createProfile = () => {
                                const name = newName.trim() || 'Nuevo Perfil';
                                setProfiles(prev => [...prev, {name, config: {...active.config}}]);
                                setActiveIdx(profiles.length); setNewName('');
                                notify('Perfil creado: ' + name);
                            };
                            const duplicateProfile = () => {
                                setProfiles(prev => [...prev, {name: active.name + ' (copia)', config: {...active.config}}]);
                                setActiveIdx(profiles.length);
                                notify('Perfil duplicado');
                            };
                            const deleteProfile = (i: number) => {
                                if (profiles.length <= 1) return notify('Minimo 1 perfil');
                                setProfiles(prev => prev.filter((_, x) => x !== i));
                                if (activeIdx >= i) setActiveIdx(Math.max(0, activeIdx - 1));
                            };

                            return <>
                                {/* ── Perfiles ── */}
                                <div className="mb-6">
                                    <h3 className="font-bold text-sm mb-2">📋 Perfiles de Etiqueta</h3>
                                    <div className="space-y-1 mb-3 max-h-[200px] overflow-y-auto border border-[#111111]/10 rounded-lg">
                                        {profiles.map((p, i) => (
                                            <div key={i} className={`flex items-center gap-2 px-3 py-2 text-xs ${i === activeIdx ? 'bg-[#111111] text-[#F5F3EE]' : 'bg-white hover:bg-[#E8E4DD]/40'}`}>
                                                <button onClick={() => setActiveIdx(i)} className="flex-1 text-left font-bold">{p.name}</button>
                                                <button onClick={duplicateProfile} className="p-1 opacity-50 hover:opacity-100" title="Duplicar">📋</button>
                                                <button onClick={() => deleteProfile(i)} className="p-1 opacity-50 hover:opacity-100" title="Eliminar">🗑️</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input className={field} placeholder="Nombre..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProfile()} />
                                        <button className={`${btn} bg-[#111111] text-[#F5F3EE] text-xs`} onClick={createProfile}>+ Crear</button>
                                    </div>
                                </div>

                                {/* ── Config ── */}
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {(['labelW','labelH','qrSize','qrX','qrY','nameX','nameY','skuX','skuY','loteX','loteY','venceX','venceY','cols','gapX','gapY','nameFontSize','skuFontSize','loteFontSize','venceFontSize','barcodeSize','barcodeX','barcodeY','examples'] as (keyof LabelConfig)[]).map(key => (
                                        <div key={key}>
                                            <label className="text-[9px] font-bold uppercase text-[#595959]">{key}</label>
                                            <input type="number" className={field} value={cfg[key]} step="5" onChange={e => updateCfg(key, parseInt(e.target.value) || 0)} />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {(['showName','showSku','showLote','showVence'] as (keyof LabelConfig)[]).map(key => (
                                        <label key={key} className="flex items-center gap-1 text-xs cursor-pointer">
                                            <input type="checkbox" checked={!!cfg[key]} onChange={e => updateCfg(key, e.target.checked)} /> {key.replace('show','')}
                                        </label>
                                    ))}
                                </div>

                                {/* ── Preview ── */}
                                <div className="border border-[#111111]/10 rounded-lg p-4 bg-[#E8E4DD]/20 overflow-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#595959]">📐 Preview — {active.name}</h3>
                                        <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                                            <span className={previewType === 'QR' ? 'font-bold text-[#595959]' : 'text-[#aaa]'}>QR</span>
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${previewType === 'QR' ? 'bg-indigo-600' : 'bg-slate-600'}`} onClick={() => setPreviewType(prev => prev === 'QR' ? 'CODE128' : 'QR')}>
                                                <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${previewType === 'QR' ? 'left-0.5' : 'left-4'}`} />
                                            </div>
                                            <span className={previewType === 'CODE128' ? 'font-bold text-[#595959]' : 'text-[#aaa]'}>Barras</span>
                                        </label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cfg.cols}, ${cfg.labelW}px)`, gap: `${cfg.gapY}px ${cfg.gapX}px`, justifyContent: 'start' }}>
                                        {Array.from({ length: cfg.examples || 3 }, (_, k) => k + 1).map(i => (
                                            <div key={i} style={{ position: 'relative', width: cfg.labelW, height: cfg.labelH, background: '#fff', border: '1px solid rgba(17,17,17,.2)', borderRadius: 4, overflow: 'hidden' }}>
                                                {/* ── ORDEN = orden de dibujo del SVG. Ultimo va ENCIMA. ── */}
                                                {cfg.showName && <div style={{ position: 'absolute', left: cfg.nameX, top: cfg.nameY, fontSize: cfg.nameFontSize, fontWeight: 'bold', color: '#111', whiteSpace: 'nowrap' }}>MATERIAL {i}</div>}
                                                {previewType === 'QR' ? (
                                                    <div style={{ position: 'absolute', left: cfg.qrX, top: cfg.qrY, width: cfg.qrSize, height: cfg.qrSize, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: cfg.nameFontSize - 3, color: 'white', fontWeight: 'bold' }}>QR</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ position: 'absolute', left: cfg.barcodeX, top: cfg.barcodeY, width: cfg.qrSize, height: cfg.barcodeSize, background: '#fff', display: 'flex', alignItems: 'stretch', overflow: 'hidden', boxSizing: 'border-box', padding: '0 6px' }}>
                                                        {[2,1,1,2,1,4, 1,2,3,1,1,2, 3,1,1,1,2,2, 1,3,1,2,1,2, 2,1,2,1,3,1, 1,1,2,3,1,2, 1,2,1,1,4,1, 2,3,3,1,1,1,2].map((w, j) => (
                                                            <div key={j} style={{ flex: `${w} 0 0`, minWidth: 1, background: j % 2 === 0 ? '#111' : 'transparent' }} />
                                                        ))}
                                                    </div>
                                                )}
                                                {cfg.showSku && <div style={{ position: 'absolute', left: cfg.skuX, top: cfg.skuY, fontSize: cfg.skuFontSize, fontWeight: 'bold', color: '#111', whiteSpace: 'nowrap' }}>MAT-00{i}</div>}
                                                {cfg.showLote && <div style={{ position: 'absolute', left: cfg.loteX, top: cfg.loteY, fontSize: cfg.loteFontSize, color: '#595959', whiteSpace: 'nowrap' }}>Lote: L-2026-A{i}</div>}
                                                {cfg.showVence && <div style={{ position: 'absolute', left: cfg.venceX, top: cfg.venceY, fontSize: cfg.venceFontSize, color: '#C42A1E', whiteSpace: 'nowrap' }}>Vence: 2026-12-1{i}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={() => notify('Perfil activo: ' + active.name + ' — Los cambios se guardan automaticamente')}><Save size={15} /> Guardado Automatico</button>
                            </>;
                        })()}
                    </Section>
                </div>
            </main>
        </div>
    );
}
