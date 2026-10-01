import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import {
    ArrowRight, BellRing, Boxes, CalendarClock, ChevronDown, FileSpreadsheet, GraduationCap, MessageSquareText,
    PackageCheck, Play, QrCode, ScrollText, ShieldCheck, Warehouse, X,
} from 'lucide-react';
import '../../css/landing.css';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/* Secuencia generada con Seedance 2.0 (1080p, 8 s) y reducida a 97 fotogramas WebP. */
const FRAMES = 97;
const frameUrl = (dir: string, i: number) => `/images/hero-seq/${dir}/f${String(i).padStart(3, '0')}.webp`;

const PASOS = [
    { icon: PackageCheck, titulo: 'Recibe', texto: 'Registra cada ingreso con lote, costo y fecha de vencimiento. Queda en el Kardex con el usuario y la hora.' },
    { icon: QrCode, titulo: 'Etiqueta', texto: 'Genera etiquetas QR y de código de barras por lote, y léelas con la cámara del celular en la bodega.' },
    { icon: CalendarClock, titulo: 'Despacha', texto: 'Al consumir, el sistema toma primero el lote que vence primero. Nadie tiene que recordarlo.' },
    { icon: MessageSquareText, titulo: 'Pregunta', texto: 'El asistente consulta la base de datos real antes de responder, en español y sin inventar cifras.' },
];

const MODULOS = [
    { icon: ScrollText, titulo: 'Kardex inmutable', texto: 'Ningún movimiento se edita ni se borra. Las correcciones son ajustes con motivo y responsable.', span: 'md:col-span-2' },
    { icon: ShieldCheck, titulo: 'Roles', texto: 'Administrador y operario: cada uno ve y hace solo lo que le corresponde.', span: '' },
    { icon: BellRing, titulo: 'Alertas', texto: 'Stock bajo y lotes por vencer, revisados cada hora.', span: '' },
    { icon: FileSpreadsheet, titulo: 'Reportes', texto: 'Inventario, movimientos, FEFO, consumo y valorización en PDF y CSV.', span: '' },
    { icon: Warehouse, titulo: 'Bodegas y conciliación', texto: 'Ocupación por bodega, transferencias entre bodegas y ajuste del conteo físico contra el sistema.', span: 'md:col-span-2' },
];

/* Respuestas reales del asistente en producción sobre los datos de demostración (25-sep-2026). */
const CHAT = [
    { rol: 'user', texto: '¿Cuánta harina de trigo hay?' },
    { rol: 'bot', texto: 'Hay 5772 kg de harina de trigo en total.' },
    { rol: 'user', texto: '¿Qué lotes vencen pronto?' },
    { rol: 'bot', texto: 'Levadura fresca · LEV-2609-A · 01/10/2026\nLevadura fresca · LEV-2609-B · 21/10/2026\nGrasa vegetal panadera · GRA-2609-A · 04/12/2026' },
    { rol: 'user', texto: '¿Cuánta mantequilla hay?' },
    { rol: 'bot', texto: 'La mantequilla no está registrada en el inventario. Materiales registrados: ajonjolí, azúcar, bolsas, grasa vegetal, harina, levadura, mejoradores y sal.' },
];

const CIFRAS = [
    { valor: 18, sufijo: '', texto: 'requerimientos funcionales levantados con una PYME real' },
    { valor: 74, sufijo: '', texto: 'pruebas automatizadas en verde antes de cada despliegue' },
    { valor: 4, sufijo: '', texto: 'reglas de negocio: FEFO, Kardex inmutable, roles y RAG' },
    { valor: 0, sufijo: ' $', texto: 'en licencias: software libre e infraestructura gratuita' },
];

const prefiereMenosMovimiento = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Welcome() {
    const navRef = useRef<HTMLElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLSpanElement>(null);
    const stepsRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const [chatPaso, setChatPaso] = useState(0);
    const [estatico] = useState(prefiereMenosMovimiento);
    const smootherRef = useRef<ScrollSmoother | null>(null);
    const [videoAbierto, setVideoAbierto] = useState(false);
    const cerrarVideoRef = useRef<HTMLButtonElement>(null);

    // Comercial en ventana: pausa el scroll suave mientras está abierto y se cierra con Escape.
    useEffect(() => {
        if (!videoAbierto) return;
        smootherRef.current?.paused(true);
        cerrarVideoRef.current?.focus();
        const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideoAbierto(false); };
        window.addEventListener('keydown', alTeclear);
        return () => { window.removeEventListener('keydown', alTeclear); smootherRef.current?.paused(false); };
    }, [videoAbierto]);

    // ── Secuencia de fotogramas en canvas ─────────────────────────────────
    useEffect(() => {
        if (estatico) return;
        const canvas = canvasRef.current!;
        const ctx2d = canvas.getContext('2d')!;
        const dir = window.innerWidth < 900 ? 'w800' : 'w1600';
        const imgs: (HTMLImageElement | null)[] = new Array(FRAMES).fill(null);
        let actual = 0;
        let vivo = true;

        const ajustar = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            dibujar(actual);
        };
        const dibujar = (i: number) => {
            // Fotograma cargado más cercano al pedido
            let img: HTMLImageElement | null = null;
            for (let d = 0; d < FRAMES && !img; d++) img = imgs[i - d] ?? imgs[i + d] ?? null;
            if (!img) return;
            const { width: cw, height: ch } = canvas;
            const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
            const w = img.naturalWidth * s, h = img.naturalHeight * s;
            ctx2d.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        };
        // Carga progresiva: 1 de cada 8, luego 4, 2 y 1 para que el scroll sea usable enseguida
        const orden: number[] = [];
        for (const paso of [8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += paso) if (!orden.includes(i)) orden.push(i);
        let cursor = 0;
        const cargarSiguiente = () => {
            if (!vivo || cursor >= orden.length) return;
            const i = orden[cursor++];
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => { imgs[i] = img; if (i === 0 || Math.abs(i - actual) < 3) dibujar(actual); cargarSiguiente(); };
            img.onerror = cargarSiguiente;
            img.src = frameUrl(dir, i);
        };
        for (let k = 0; k < 4; k++) cargarSiguiente();

        (canvas as any).__pintar = (i: number) => { actual = i; dibujar(i); };
        ajustar();
        window.addEventListener('resize', ajustar);
        return () => { vivo = false; window.removeEventListener('resize', ajustar); };
    }, [estatico]);

    // ── Animaciones con scroll ────────────────────────────────────────────
    useEffect(() => {
        if (estatico) return;
        const conMouse = window.matchMedia('(pointer: fine)').matches;
        if (conMouse) {
            smootherRef.current = ScrollSmoother.create({ wrapper: '#lx-wrapper', content: '#lx-content', smooth: 1.1, effects: true });
        }

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 80, end: 'max',
                onToggle: (self) => navRef.current?.classList.toggle('is-scrolled', self.isActive),
            });

            // Hero: fotogramas + tres actos de texto en una sola línea de tiempo fijada
            const pintar = (canvasRef.current as any).__pintar as (i: number) => void;
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: heroRef.current, start: 'top top', end: '+=320%', pin: true, scrub: 0.6,
                    onUpdate: (self) => {
                        pintar(Math.round(Math.min(1, self.progress / 0.9) * (FRAMES - 1)));
                        if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
                    },
                },
            });
            tl.to('[data-act="1"]', { autoAlpha: 0, y: -60, duration: 0.1 }, 0.2)
              .fromTo('[data-act="2"]', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.32)
              .to('[data-act="2"]', { autoAlpha: 0, y: -60, duration: 0.1 }, 0.56)
              .fromTo('[data-act="3"]', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.68)
              .to('[data-cue]', { autoAlpha: 0, duration: 0.05 }, 0.05)
              .to({}, { duration: 0.22 }, 0.78);

            // Entrada del primer acto
            gsap.from('[data-act="1"] > *', { autoAlpha: 0, y: 40, duration: 1.1, stagger: 0.12, ease: 'power3.out', delay: 0.15 });

            // Paralaje y brillo que siguen al mouse
            if (conMouse) {
                const cx = gsap.quickTo(canvasRef.current, 'x', { duration: 1.2, ease: 'power3.out' });
                const cy = gsap.quickTo(canvasRef.current, 'y', { duration: 1.2, ease: 'power3.out' });
                const gx = gsap.quickTo(glowRef.current, 'left', { duration: 0.6, ease: 'power3.out' });
                const gy = gsap.quickTo(glowRef.current, 'top', { duration: 0.6, ease: 'power3.out' });
                heroRef.current!.addEventListener('pointermove', (e) => {
                    const r = heroRef.current!.getBoundingClientRect();
                    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
                    cx(-nx * 26); cy(-ny * 16); gx(e.clientX - r.left); gy(e.clientY - r.top);
                });
            }

            // Pasos en recorrido horizontal
            const distancia = () => Math.max(0, trackRef.current!.scrollWidth - window.innerWidth + 48);
            gsap.to(trackRef.current, {
                x: () => -distancia(), ease: 'none',
                scrollTrigger: { trigger: stepsRef.current, start: 'top top', end: () => `+=${distancia()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
            });

            // Revelado de bloques
            ScrollTrigger.batch('[data-reveal]', {
                start: 'top 85%', once: true,
                onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }),
            });

            // Cifras
            gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
                const fin = Number(el.dataset.count);
                const obj = { v: 0 };
                ScrollTrigger.create({
                    trigger: el, start: 'top 90%', once: true,
                    onEnter: () => gsap.to(obj, { v: fin, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = String(Math.round(obj.v)); } }),
                });
            });

            // Conversación de demostración
            ScrollTrigger.create({ trigger: chatRef.current, start: 'top 70%', once: true, onEnter: () => setChatPaso(1) });
        });

        return () => { ctx.revert(); smootherRef.current?.kill(); smootherRef.current = null; };
    }, [estatico]);

    // Avance del chat mensaje a mensaje
    useEffect(() => {
        if (chatPaso === 0 || chatPaso > CHAT.length) return;
        const espera = CHAT[chatPaso - 1].rol === 'user' ? 1100 : 900;
        const t = setTimeout(() => setChatPaso((p) => p + 1), espera);
        return () => clearTimeout(t);
    }, [chatPaso]);

    const irA = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        if (smootherRef.current) smootherRef.current.scrollTo(id, true, 'top top');
        else document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const spotlight = (e: React.PointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
    };

    const mensajes = estatico ? CHAT : CHAT.slice(0, Math.max(0, chatPaso - 1));
    const escribiendo = !estatico && chatPaso > 0 && chatPaso <= CHAT.length && CHAT[chatPaso - 1].rol === 'bot';

    return (
        <div className="lx-root min-h-screen">
            <Head title="Pymetory · Inventario para PYMEs, trazable y con asistente">
                <meta name="description" content="Gestión de inventarios de materia prima para PYMEs: lotes, FEFO, Kardex inmutable y un asistente que responde con los datos reales de tu bodega." />
            </Head>

            {/* Navegación */}
            <nav ref={navRef} className="lx-nav fixed inset-x-0 top-0 z-50">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <a href="#inicio" onClick={irA('#inicio')} className="flex items-center gap-2.5">
                        <span className="lx-logo grid h-9 w-9 place-items-center rounded-xl"><Boxes size={18} /></span>
                        <span className="lx-display lx-text text-lg font-extrabold">Pymetory</span>
                    </a>
                    <div className="hidden items-center gap-8 text-sm font-semibold md:flex">
                        <a href="#como" onClick={irA('#como')} className="lx-link">Cómo funciona</a>
                        <a href="#modulos" onClick={irA('#modulos')} className="lx-link">Módulos</a>
                        <a href="#asistente" onClick={irA('#asistente')} className="lx-link">Asistente</a>
                        <a href="#proyecto" onClick={irA('#proyecto')} className="lx-link">Proyecto</a>
                    </div>
                    <a href="/login" className="lx-btn lx-btn-primary !px-5 !py-2.5">Entrar <ArrowRight size={16} /></a>
                </div>
            </nav>

            <div id="lx-wrapper">
                <div id="lx-content">
                    {/* ── Hero ───────────────────────────────────────── */}
                    <section id="inicio" ref={heroRef} className="lx-hero">
                        {estatico
                            ? <img src="/images/hero-seq/poster.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
                            : <canvas ref={canvasRef} aria-hidden="true" />}
                        <div ref={glowRef} className="lx-glow" style={{ left: '70%', top: '40%' }} />
                        <div className="lx-hero-shade" />

                        <div className="relative mx-auto h-full max-w-7xl px-5 sm:px-8">
                            <div data-act="1" className="lx-act px-5 sm:px-8">
                                <p className="lx-eyebrow">Inventario de materia prima para PYMEs</p>
                                <h1 className="lx-display mt-5 max-w-2xl text-5xl font-extrabold leading-[0.95] sm:text-7xl">
                                    Tu bodega, <span className="lx-grad">tal como es.</span>
                                </h1>
                                <p className="lx-muted mt-6 max-w-md text-lg leading-relaxed">
                                    Harina en bultos, levadura en cajas, semillas en bolsas. Pymetory lo lleva todo en kilos y por lote.
                                </p>
                                <div className="mt-9 flex flex-wrap gap-3">
                                    {estatico && <a href="/login" className="lx-btn lx-btn-primary">Entrar a la demo <ArrowRight size={16} /></a>}
                                    <button type="button" onClick={() => setVideoAbierto(true)} className="lx-btn lx-btn-ghost"><Play size={16} /> Ver el video (45 s)</button>
                                </div>
                            </div>
                            {!estatico && (
                                <>
                                    <div data-act="2" className="lx-act invisible px-5 sm:px-8">
                                        <p className="lx-eyebrow">Trazabilidad por lote</p>
                                        <h2 className="lx-display mt-5 max-w-2xl text-5xl font-extrabold leading-[0.95] sm:text-7xl">
                                            Cada lote, <span className="lx-grad">identificado.</span>
                                        </h2>
                                        <p className="lx-muted mt-6 max-w-md text-lg leading-relaxed">
                                            Etiquetas QR por lote, fecha de vencimiento obligatoria y despacho FEFO: sale primero lo que vence primero.
                                        </p>
                                    </div>
                                    <div data-act="3" className="lx-act invisible px-5 sm:px-8">
                                        <p className="lx-eyebrow">Asistente con datos reales</p>
                                        <h2 className="lx-display mt-5 max-w-2xl text-5xl font-extrabold leading-[0.95] sm:text-7xl">
                                            Un inventario <span className="lx-grad">que responde.</span>
                                        </h2>
                                        <p className="lx-muted mt-6 max-w-md text-lg leading-relaxed">
                                            Pregúntale en español cuánto queda o qué vence primero. Responde con lo que hay en tu bodega.
                                        </p>
                                        <div className="mt-9 flex flex-wrap gap-3">
                                            <a href="/login" className="lx-btn lx-btn-primary">Entrar a la demo <ArrowRight size={16} /></a>
                                            <a href="#como" onClick={irA('#como')} className="lx-btn lx-btn-ghost">Cómo funciona</a>
                                            <button type="button" onClick={() => setVideoAbierto(true)} className="lx-btn lx-btn-ghost"><Play size={16} /> Ver el video (45 s)</button>
                                        </div>
                                    </div>
                                    <div data-cue className="lx-dim absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-semibold tracking-widest">
                                        DESLIZA <ChevronDown size={18} className="lx-scroll-cue" />
                                    </div>
                                    <div className="lx-progress"><span ref={barRef} /></div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* ── Cómo funciona (recorrido horizontal) ───────── */}
                    <section id="como" ref={stepsRef} className="relative flex min-h-screen flex-col justify-center overflow-hidden py-24">
                        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
                            <p className="lx-eyebrow">Cómo funciona</p>
                            <h2 className="lx-display mt-4 max-w-3xl text-4xl font-extrabold sm:text-6xl">Del bulto que llega al dato que decide.</h2>
                        </div>
                        <div className="mt-14 pl-5 sm:pl-8 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                            <div ref={trackRef} className="lx-steps-track pr-8">
                                {PASOS.map(({ icon: Icon, titulo, texto }, i) => (
                                    <article key={titulo} onPointerMove={spotlight} className="lx-card lx-step p-8 sm:p-10">
                                        <div className="flex items-start justify-between">
                                            <span className="lx-icon"><Icon size={20} /></span>
                                            <span className="lx-display lx-step-num">0{i + 1}</span>
                                        </div>
                                        <h3 className="lx-display mt-10 text-3xl font-bold">{titulo}</h3>
                                        <p className="lx-muted mt-3 text-base leading-relaxed">{texto}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Módulos ────────────────────────────────────── */}
                    <section id="modulos" className="mx-auto max-w-7xl px-5 py-28 sm:px-8">
                        <div data-reveal className="max-w-2xl">
                            <p className="lx-eyebrow">Módulos</p>
                            <h2 className="lx-display mt-4 text-4xl font-extrabold sm:text-6xl">Reglas claras, sin depender de la memoria de nadie.</h2>
                        </div>
                        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
                            {MODULOS.map(({ icon: Icon, titulo, texto, span }) => (
                                <article key={titulo} data-reveal onPointerMove={spotlight} className={`lx-card p-8 ${span}`}>
                                    <span className="lx-icon"><Icon size={20} /></span>
                                    <h3 className="lx-display mt-8 text-2xl font-bold">{titulo}</h3>
                                    <p className="lx-muted mt-2 leading-relaxed">{texto}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    {/* ── Asistente ──────────────────────────────────── */}
                    <section id="asistente" className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 py-28 sm:px-8 lg:grid-cols-2">
                        <div data-reveal>
                            <p className="lx-eyebrow">Asistente RAG</p>
                            <h2 className="lx-display mt-4 text-4xl font-extrabold sm:text-6xl">Pregunta como le preguntarías a tu bodeguero.</h2>
                            <p className="lx-muted mt-6 max-w-lg text-lg leading-relaxed">
                                Antes de responder, el asistente clasifica la pregunta y consulta la base de datos. Si un material no existe, lo dice en lugar de inventar.
                            </p>
                            <p className="lx-dim mt-4 text-sm">Respuestas reales del sistema sobre los datos de demostración.</p>
                        </div>
                        <div ref={chatRef} data-reveal className="lx-chat p-5 sm:p-7">
                            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#f5b25c]" />
                                <span className="lx-muted text-sm font-semibold">Asistente de inventario</span>
                            </div>
                            <div className="flex min-h-[22rem] flex-col gap-3 pt-5">
                                {mensajes.map((m, i) => (
                                    <p key={i} className={`max-w-[85%] whitespace-pre-line px-4 py-3 text-sm leading-relaxed ${m.rol === 'user' ? 'lx-msg-user' : 'lx-msg-bot'}`}>{m.texto}</p>
                                ))}
                                {escribiendo && <p className="lx-msg-bot lx-typing px-4 py-3"><span /><span /><span /></p>}
                            </div>
                        </div>
                    </section>

                    {/* ── Cifras ─────────────────────────────────────── */}
                    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
                        <div className="lx-divider" />
                        <div className="grid grid-cols-2 gap-10 py-16 lg:grid-cols-4">
                            {CIFRAS.map(({ valor, sufijo, texto }) => (
                                <div key={texto} data-reveal>
                                    <p className="lx-display text-5xl font-extrabold sm:text-6xl">
                                        {sufijo.trim() === '$' && <span className="lx-amber">$</span>}
                                        <span data-count={valor}>{estatico ? valor : 0}</span>
                                    </p>
                                    <p className="lx-muted mt-3 text-sm leading-relaxed">{texto}</p>
                                </div>
                            ))}
                        </div>
                        <div className="lx-divider" />
                    </section>

                    {/* ── Proyecto académico ─────────────────────────── */}
                    <section id="proyecto" className="mx-auto max-w-7xl px-5 py-28 sm:px-8">
                        <div data-reveal onPointerMove={spotlight} className="lx-card grid grid-cols-1 gap-10 p-8 sm:p-14 lg:grid-cols-[1.4fr_1fr]">
                            <div>
                                <span className="lx-icon"><GraduationCap size={20} /></span>
                                <h2 className="lx-display mt-8 text-3xl font-extrabold sm:text-5xl">Un trabajo de grado con una empresa real detrás.</h2>
                                <p className="lx-muted mt-5 max-w-xl leading-relaxed">
                                    Pymetory nace de la entrevista con la administradora de una panificadora del Valle del Cauca y se desarrolla como trabajo de grado de Ingeniería de Sistemas en la Universidad del Valle, sede Tuluá.
                                </p>
                            </div>
                            <div className="flex flex-col justify-end gap-3">
                                <a href="https://tesis.pymetory.com" className="lx-btn lx-btn-ghost justify-between">Documento de tesis <ArrowRight size={16} /></a>
                                <a href="https://reuniones.pymetory.com" className="lx-btn lx-btn-ghost justify-between">Bitácora de reuniones <ArrowRight size={16} /></a>
                                <a href="/login" className="lx-btn lx-btn-primary justify-between">Entrar a la demo <ArrowRight size={16} /></a>
                            </div>
                        </div>
                    </section>

                    <footer className="border-t border-white/5 px-5 py-10 sm:px-8">
                        <div className="lx-dim mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm sm:flex-row">
                            <span>© {new Date().getFullYear()} Pymetory · Germán David Murillas Mondragón</span>
                            <span>Universidad del Valle · Ingeniería de Sistemas</span>
                        </div>
                    </footer>
                </div>
            </div>

            {videoAbierto && (
                <div role="dialog" aria-modal="true" aria-label="Comercial de Pymetory" onClick={() => setVideoAbierto(false)}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-10">
                    <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
                        <button ref={cerrarVideoRef} type="button" onClick={() => setVideoAbierto(false)} aria-label="Cerrar el video"
                            className="absolute -top-12 right-0 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                            Cerrar <X size={18} />
                        </button>
                        <video className="aspect-video w-full rounded-2xl bg-black shadow-2xl" controls autoPlay playsInline preload="metadata"
                            poster="/video/pymetory-comercial-poster.jpg"
                            src={typeof window !== 'undefined' && window.innerWidth < 900 ? '/video/pymetory-comercial-720.mp4' : '/video/pymetory-comercial-1080.mp4'}>
                            Tu navegador no puede reproducir el video.
                        </video>
                    </div>
                </div>
            )}
        </div>
    );
}
