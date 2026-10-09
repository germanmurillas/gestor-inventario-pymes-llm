import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';
import { Check, Settings, X } from 'lucide-react';
import { THEMES, applyTheme, currentTheme } from '../lib/theme';
import { pedir } from '../lib/http';
import { avisar } from './Avisos';

/**
 * Preferencias del usuario, junto al botón «Ayuda» (pedido de la empresa, 8-oct-2026): el tema de
 * color es de cada persona y se guarda en su cuenta. Los ajustes del sistema quedan para el administrador.
 */
export default function Preferencias({ rol }: { rol: string }) {
    const [abierto, setAbierto] = useState(false);
    const [tema, setTema] = useState(currentTheme());
    const cerrar = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!abierto) return;
        cerrar.current?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        window.addEventListener('keydown', tecla);
        return () => window.removeEventListener('keydown', tecla);
    }, [abierto]);

    const elegir = async (id: string) => {
        const anterior = tema;
        setTema(id); applyTheme(id);
        try { await pedir('/perfil/tema', { method: 'PUT', body: { theme: id } }); }
        catch (e: any) { setTema(anterior); applyTheme(anterior); avisar('error', e.message); }
    };

    return (
        <>
            <button onClick={() => setAbierto(true)} aria-haspopup="dialog" aria-label="Preferencias"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/50 px-2.5 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                <Settings size={16} aria-hidden="true" />
            </button>
            {abierto && createPortal(
                <div className="fixed inset-0 z-[130] flex items-end justify-center bg-obsidiana/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setAbierto(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="pref-titulo" onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-t-2xl border border-slate-700/50 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="pref-titulo" className="text-xl font-black text-white">Mis preferencias</h2>
                                <p className="text-sm text-slate-300">El color es solo para usted; los demás conservan el suyo.</p>
                            </div>
                            <button ref={cerrar} onClick={() => setAbierto(false)} aria-label="Cerrar preferencias" className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-800"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Tema de color">
                            {THEMES.map((t) => (
                                <button key={t.id} onClick={() => elegir(t.id)} aria-pressed={tema === t.id}
                                    className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold text-slate-200 ${tema === t.id ? 'border-indigo-400' : 'border-slate-700/50'}`}>
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/20" style={{ background: t.bg }}>
                                        <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                                    </span>
                                    <span className="flex-1">{t.name}</span>
                                    {tema === t.id && <Check size={14} aria-hidden="true" />}
                                </button>
                            ))}
                        </div>
                        {rol === 'admin' && (
                            <Link href="/settings-page" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:underline">
                                <Settings size={15} aria-hidden="true" /> Ajustes del sistema (usuarios, asistente, alertas)
                            </Link>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
