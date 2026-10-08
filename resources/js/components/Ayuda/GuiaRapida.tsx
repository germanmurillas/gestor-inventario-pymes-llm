import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CircleHelp, Lightbulb, X } from 'lucide-react';
import { TAREAS } from './contenido';

const CLAVE = 'pm-guia-rapida-oculta';
const leer = () => { try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; } };
const guardar = (oculta: boolean) => { try { localStorage.setItem(CLAVE, oculta ? '1' : '0'); } catch { /* sin almacenamiento: solo dura esta visita */ } };

/**
 * Guía rápida del Tablero: las tareas de todos los días paso a paso, con un botón para ir a la
 * pantalla. Se puede ocultar y volver a abrir; lo recuerda cada navegador.
 */
export default function GuiaRapida({ rol, onIr }: { rol: string; onIr: (vista: string) => void }) {
    const [oculta, setOculta] = useState(leer);
    const [abierta, setAbierta] = useState<string | null>(null);
    const tareas = TAREAS.filter((t) => !t.soloAdmin || rol === 'admin');

    if (oculta) {
        return (
            <button onClick={() => { setOculta(false); guardar(false); }}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                <CircleHelp size={16} aria-hidden="true" /> Mostrar la guía rápida
            </button>
        );
    }

    return (
        <section aria-labelledby="guia-rapida-titulo" className="mb-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <h2 id="guia-rapida-titulo" className="flex items-center gap-2 text-lg font-black text-white"><CircleHelp size={20} aria-hidden="true" /> Guía rápida</h2>
                    <p className="text-sm text-slate-400">¿Qué necesita hacer? Toque una tarea para ver los pasos. En cada pantalla, el botón «Ayuda» de arriba explica esa pantalla.</p>
                </div>
                <button onClick={() => { setOculta(true); guardar(true); }} aria-label="Ocultar la guía rápida"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button>
            </div>
            <ul className="grid items-start gap-2 lg:grid-cols-2">
                {tareas.map((t) => {
                    const abiertaEsta = abierta === t.id;
                    return (
                        <li key={t.id} className="rounded-xl border border-slate-700/40 bg-slate-900/40">
                            <button onClick={() => setAbierta(abiertaEsta ? null : t.id)} aria-expanded={abiertaEsta} aria-controls={`guia-${t.id}`}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                                {abiertaEsta ? <ChevronDown size={16} className="shrink-0 text-slate-400" aria-hidden="true" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />}
                                <span>
                                    <span className="block text-sm font-bold text-white">{t.titulo}</span>
                                    <span className="block text-xs text-slate-400">{t.cuando}</span>
                                </span>
                            </button>
                            {abiertaEsta && (
                                <div id={`guia-${t.id}`} className="border-t border-slate-700/40 px-4 pb-3 pt-2 text-sm">
                                    <ol className="list-decimal space-y-1 pl-5 text-slate-200">
                                        {t.pasos.map((p) => <li key={p}>{p}</li>)}
                                    </ol>
                                    {t.consejo && <p className="mt-2 flex gap-2 text-xs text-amber-200"><Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{t.consejo}</p>}
                                    <button onClick={() => onIr(t.vista)} className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">Ir a la pantalla</button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
