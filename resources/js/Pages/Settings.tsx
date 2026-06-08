import React, { useState, useEffect, useCallback } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ChevronDown, ChevronRight, Save, Plus, Trash2, KeyRound, Users as UsersIcon,
    Cpu, SlidersHorizontal, RefreshCw, ShieldCheck, User as UserIcon, Power,
    Bell, Pencil, Shield,
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
    const [editingId, setEditingId] = useState<number|null>(null);
    const loadKeys = useCallback(async () => { const { data } = await axios.get('/api/api-keys'); setApiKeys(data.api_keys ?? []); }, []);
    const saveKey = async () => {
        if (!nk.nombre) return notify('Nombre requerido.');
        if (editingId) {
            await axios.put(`/api/api-keys/${editingId}`, { nombre: nk.nombre, key: nk.key || undefined, base_url: nk.base_url, model_name: nk.model_name, tipo: nk.tipo });
            setEditingId(null);
            notify('API Key actualizada.');
        } else {
            if (!nk.key) return notify('Key requerida para crear.');
            await axios.post('/api/api-keys', nk);
            notify('API Key creada.');
        }
        setNk({ nombre: '', key: '', base_url: '', model_name: '', tipo: 'opencode', activo: true });
        await loadKeys();
    };
    const editKey = (k: ApiKey) => { setEditingId(k.id); setNk({ nombre: k.nombre, key: '', base_url: k.base_url || '', model_name: k.model_name || '', tipo: k.tipo, activo: k.activo }); };
    const cancelEdit = () => { setEditingId(null); setNk({ nombre: '', key: '', base_url: '', model_name: '', tipo: 'opencode', activo: true }); };
    const toggleKey = async (k: ApiKey) => { await axios.put(`/api/api-keys/${k.id}`, { activo: !k.activo }); await loadKeys(); };
    const deleteKey = async (id: number) => { if (!confirm('¿Eliminar?')) return; await axios.delete(`/api/api-keys/${id}`); await loadKeys(); notify('Eliminada.'); };

    // ── Users ──
    const [users, setUsers] = useState<UserRow[]>([]);
    const [nu, setNu] = useState<any>({ name: '', email: '', password: '', role: 'operario' });
    const loadUsers = useCallback(async () => { const { data } = await axios.get('/api/users'); setUsers(data.users ?? []); }, []);
    const createUser = async () => { if (!nu.name || !nu.email || nu.password.length < 8) return notify('Nombre, email y contraseña (min 8).'); await axios.post('/api/users', nu); setNu({ name: '', email: '', password: '', role: 'operario' }); await loadUsers(); notify('Usuario creado.'); };
    const changeRole = async (u: UserRow, role: string) => { await axios.put(`/api/users/${u.id}`, { role }); await loadUsers(); };
    const resetPass = async (u: UserRow) => { const pw = prompt(`Nueva contraseña para ${u.name} (min 8):`); if (!pw || pw.length < 8) return notify('Minimo 8 caracteres.'); await axios.post(`/api/users/${u.id}/reset-password`, { password: pw }); notify('Reset OK.'); };
    const deleteUser = async (u: UserRow) => { if (!confirm(`¿Eliminar a ${u.name}?`)) return; try { await axios.delete(`/api/users/${u.id}`); await loadUsers(); notify('Eliminado.'); } catch (e: any) { notify(e?.response?.data?.message ?? 'Error.'); } };

    useEffect(() => { loadSettings(); loadOllama(); loadKeys(); loadUsers(); }, [loadSettings, loadOllama, loadKeys, loadUsers]);

    return (
        <div className="flex h-screen bg-[#F5F3EE] text-[#111111] overflow-hidden">
            <Head title="Configuración" />
            <Sidebar sidebarOpen={sidebarOpen} mobileOpen={mobileOpen} user={user} activeView="CONFIGURACION" mode="dashboard" onMobileClose={() => setMobileOpen(false)} />
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

                    {/* ── 2. NUCLEO IA ── */}
                    <Section icon={Cpu} title="Nucleo IA / LLM" subtitle="Motor RAG, modelo, origen y parametros de inferencia" open={openSec === 'llm'} onToggle={() => toggle('llm')}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div><label className={label}>Origen (source)</label>
                                <select className={field} value={settings.llm_source ?? 'local'} onChange={e => setVal('llm_source', e.target.value)}>
                                    <option value="local">local (Ollama)</option><option value="opencode">opencode</option><option value="external">external (OpenAI)</option>
                                </select></div>
                            <div><label className={label}>Activo</label>
                                <select className={field} value={settings.llm_activo ?? 'true'} onChange={e => setVal('llm_activo', e.target.value)}><option value="true">Activado</option><option value="false">Desactivado</option></select></div>
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1"><label className={`${label} mb-0`}>Modelo</label><button onClick={loadOllama} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[#E63B2E] hover:underline"><RefreshCw size={11} /> Refrescar</button></div>
                                <select className={field} value={settings.llm_modelo ?? ''} onChange={e => setVal('llm_modelo', e.target.value)}>
                                    <option value="">— Seleccionar modelo —</option>
                                    {ollamaModels.length > 0 && <optgroup label="▸ Ollama Local (Titan)">
                                        {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </optgroup>}
                                    {apiKeys.filter(k => k.activo && k.model_name).length > 0 && <optgroup label="▸ API Keys Registradas">
                                        {apiKeys.filter(k => k.activo && k.model_name).map(k => <option key={`api-${k.id}`} value={k.model_name!}>{k.model_name} [{k.nombre} · {k.tipo}]</option>)}
                                    </optgroup>}
                                    <optgroup label="▸ OpenCode Cloud (gratis)">
                                        <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                                        <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                                        <option value="qwen3.7-max">qwen3.7-max</option>
                                        <option value="glm-5.1">glm-5.1</option>
                                        <option value="minimax-m3">minimax-m3</option>
                                        <option value="kimi-k2.6">kimi-k2.6</option>
                                        <option value="mimo-v2-pro">mimo-v2-pro</option>
                                    </optgroup>
                                </select>
                                <p className="font-mono text-[10px] text-[#4A4A4A] mt-1">
                                    {ollamaModels.length > 0 && <span>{ollamaModels.length} local(es) · </span>}
                                    {apiKeys.filter(k => k.activo).length} API key(s) activa(s)
                                </p>
                            </div>
                            <div><label className={label}>Temperatura</label><input type="number" step="0.1" min="0" max="1" className={field} value={settings.llm_temperatura ?? ''} onChange={e => setVal('llm_temperatura', e.target.value)} /></div>
                            <div><label className={label}>Max Tokens</label><input type="number" className={field} value={settings.llm_max_tokens ?? ''} onChange={e => setVal('llm_max_tokens', e.target.value)} /></div>
                            <div><label className={label}>Contexto Lotes</label><input type="number" className={field} value={settings.llm_contexto_lotes ?? ''} onChange={e => setVal('llm_contexto_lotes', e.target.value)} /></div>
                        </div>
                        <button className={`${btn} mt-4 bg-[#111111] text-[#F5F3EE]`} onClick={() => saveSettings(['llm_source','llm_activo','llm_modelo','llm_temperatura','llm_max_tokens','llm_contexto_lotes','llm_external_key'])}><Save size={15} /> Guardar IA</button>
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
                        <div className="space-y-2 mb-5">
                            {apiKeys.map(k => (
                                <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#111111]/10 bg-white">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><span className="font-sans font-bold text-sm truncate">{k.nombre}</span><span className="px-1.5 py-0.5 rounded bg-[#E8E4DD] font-mono text-[10px] uppercase">{k.tipo}</span></div>
                                        <p className="font-mono text-[11px] text-[#4A4A4A] truncate">{k.key_masked} · {k.model_name || 'sin modelo'} · {k.base_url || 'sin url'}</p>
                                    </div>
                                    <button onClick={() => toggleKey(k)} className={`p-2 rounded-lg ${k.activo ? 'text-green-600 bg-green-50' : 'text-[#111111]/30 bg-[#E8E4DD]'}`}><Power size={15} /></button>
                                    <button onClick={() => editKey(k)} className="p-2 rounded-lg text-[#595959] hover:bg-[#E8E4DD]" title="Editar"><Pencil size={15} /></button>
                                    <button onClick={() => deleteKey(k.id)} className="p-2 rounded-lg text-[#E63B2E] hover:bg-[#E63B2E]/10"><Trash2 size={15} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-3 p-4 rounded-lg bg-[#E8E4DD]/40 border border-[#111111]/10">
                            <input className={field} placeholder="Nombre *" value={nk.nombre} onChange={e => setNk({...nk, nombre: e.target.value})} />
                            <input className={field} placeholder={editingId ? 'API Key (dejar vacio = no cambiar)' : 'API Key * (secreta)'} value={nk.key} onChange={e => setNk({...nk, key: e.target.value})} />
                            <input className={field} placeholder="Base URL" value={nk.base_url} onChange={e => setNk({...nk, base_url: e.target.value})} />
                            <input className={field} placeholder="Model Name" value={nk.model_name} onChange={e => setNk({...nk, model_name: e.target.value})} />
                            <select className={field} value={nk.tipo} onChange={e => setNk({...nk, tipo: e.target.value})}>
                                <option value="opencode">opencode</option><option value="openai">openai</option><option value="ollama">ollama</option>
                            </select>
                            <button className={`${btn} bg-[#E63B2E] text-white justify-center`} onClick={saveKey}>
                                {editingId ? <><Save size={15} /> Actualizar Key</> : <><Plus size={15} /> Agregar Key</>}
                            </button>
                            {editingId && <button className={`${btn} bg-[#111111]/10 text-[#111111] justify-center`} onClick={cancelEdit}>Cancelar</button>}
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
                </div>
            </main>
        </div>
    );
}
