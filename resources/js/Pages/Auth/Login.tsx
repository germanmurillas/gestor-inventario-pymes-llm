import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Boxes, CalendarClock, Eye, EyeOff, Loader2, MessageSquareText, ScrollText } from 'lucide-react';

const PILARES = [
    { icon: CalendarClock, titulo: 'Despacho FEFO', texto: 'Sale primero el lote que vence primero, sin depender de la memoria.' },
    { icon: ScrollText, titulo: 'Kardex inmutable', texto: 'Cada movimiento queda con usuario, fecha y motivo.' },
    { icon: MessageSquareText, titulo: 'Pregúntale a tu inventario', texto: 'Respuestas en español construidas con tus datos reales.' },
];

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });
    const [verClave, setVerClave] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="pm-fixed-dark relative min-h-screen overflow-hidden bg-[#070B14] text-slate-100 font-sans">
            <Head title="Iniciar sesión | Pymetory" />

            {/* Fondo: bodega con flujo de datos */}
            <img
                src="/images/generated/login-side.webp"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover object-left-top opacity-45"
                loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070B14]/95 via-[#070B14]/70 to-[#070B14]/95" />
            <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[120px]" />

            <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-12 px-6 py-10 lg:grid-cols-2">
                {/* Marca y propuesta de valor */}
                <section className="hidden lg:block">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/50">
                            <Boxes size={22} />
                        </span>
                        <span className="text-2xl font-black tracking-tight">PYMETORY</span>
                    </Link>

                    <h1 className="mt-10 text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                        El inventario de tu PYME,
                        <span className="block bg-gradient-to-r from-indigo-300 via-sky-300 to-amber-200 bg-clip-text text-transparent">
                            claro y trazable.
                        </span>
                    </h1>
                    <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
                        Materia prima por lotes, vencimientos bajo control y un asistente que responde con los datos de tu bodega.
                    </p>

                    <ul className="mt-10 space-y-5">
                        {PILARES.map(({ icon: Icon, titulo, texto }) => (
                            <li key={titulo} className="flex items-start gap-4">
                                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-indigo-300">
                                    <Icon size={18} />
                                </span>
                                <div>
                                    <p className="font-bold">{titulo}</p>
                                    <p className="text-sm text-slate-400">{texto}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Formulario */}
                <section className="mx-auto w-full max-w-[420px]">
                    <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                            <Boxes size={20} />
                        </span>
                        <span className="text-xl font-black tracking-tight">PYMETORY</span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-10">
                        <h2 className="text-2xl font-black tracking-tight">Iniciar sesión</h2>
                        <p className="mt-1 text-sm text-slate-400">Ingresa con la cuenta que te asignó el administrador.</p>

                        <form onSubmit={submit} className="mt-8 space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-300">Correo electrónico</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    placeholder="nombre@empresa.com"
                                    required
                                    autoFocus
                                />
                                {errors.email && <p className="text-xs font-medium text-rose-400">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-300">Contraseña</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={verClave ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 pr-11 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setVerClave((v) => !v)}
                                        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-200"
                                        aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-xs font-medium text-rose-400">{errors.password}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 py-3 text-sm font-bold shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:opacity-60"
                            >
                                {processing && <Loader2 size={16} className="animate-spin" />}
                                Entrar
                            </button>
                        </form>

                        <p className="mt-6 text-center text-xs text-slate-500">
                            ¿No tienes acceso? Solicita una cuenta al administrador de tu empresa.
                        </p>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Trabajo de grado · Universidad del Valle, sede Tuluá
                    </p>
                </section>
            </div>
        </div>
    );
}
