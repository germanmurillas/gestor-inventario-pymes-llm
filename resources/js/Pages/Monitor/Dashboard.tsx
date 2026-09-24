import { useEffect, useMemo, useRef, useState } from 'react';

/* ───────── helpers ───────── */
const fmtBytes = (b: number, d = 1) => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(b) / Math.log(1024)); return `${(b / 1024 ** i).toFixed(d)} ${u[i]}`; };
const fmtRate = (b: number) => `${fmtBytes(b, 1)}/s`;
const MAXLEN = 30;

type Svc = { name: string; active: boolean; state: string };
type Proc = { pid: number; name: string; mem: number; cpu: number };
type Stats = {
    cpu: number; mem: { total: number; used: number; free: number; pct: number };
    disk: { total: number; used: number; free: number; pct: number };
    net: { down: number; up: number }; uptime: { label: string };
    processes: Proc[]; proc_cpu: Proc[]; proc_disk: Proc[];
    services: Svc[]; logs: string; ts: string; time: string; tz: string;
};

/* ───────── Sparkline SVG ───────── */
function Sparkline({ data, color, h = 56, w = 240 }: { data: number[]; color: string; h?: number; w?: number }) {
    if (data.length < 2) return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} />;
    const step = w / (data.length - 1);
    const maxVal = Math.max(...data, 1);
    const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / maxVal) * h).toFixed(1)}`).join(' ');
    const area = `0,${h} ${pts} ${w},${h}`;
    return (<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block"><polygon points={area} fill={color} opacity={0.13} /><polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" /></svg>);
}

const trendArrow = (arr: number[]) => { if (arr.length < 2) return '→'; const d = arr[arr.length - 1] - arr[arr.length - 2]; return d > 1 ? '↑' : d < -1 ? '↓' : '→'; };
const trendColor = (arr: number[]) => { if (arr.length < 2) return 'text-slate-500'; const d = arr[arr.length - 1] - arr[arr.length - 2]; return d > 1 ? 'text-red-400' : d < -1 ? 'text-emerald-400' : 'text-slate-500'; };

function HistoryRow({ d }: { d: Draw }) {
    const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-green-500','bg-blue-500','bg-purple-500','bg-pink-500','bg-indigo-500','bg-teal-500','bg-cyan-500'];
    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 transition-colors">
            <span className="text-[10px] font-mono text-slate-500 w-12 shrink-0">#{d.sorteo_id}</span>
            <span className="text-[11px] text-slate-400 w-24 shrink-0">{d.fecha}</span>
            <div className="flex gap-1.5">{d.numeros.map((n, i) => (<span key={i} className={`w-6 h-6 rounded-full ${colors[n % colors.length]} flex items-center justify-center text-[10px] font-black text-white shadow-sm`}>{n}</span>))}</div>
        </div>
    );
}

function ProcessTable({ title, data }: { title: string; data: Proc[] }) {
    return (
        <div className="rounded-3xl p-5 border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">{title} (top 10)</h2>
            <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-xs">
                    <thead className="text-slate-500 sticky top-0 bg-slate-900"><tr className="text-left"><th className="py-1.5">PID</th><th>Proceso</th><th className="text-right">RAM%</th><th className="text-right">CPU%</th></tr></thead>
                    <tbody className="font-mono">{data.map(p => (
                        <tr key={p.pid} className="border-t border-slate-800/60 hover:bg-slate-800/30">
                            <td className="py-1.5 text-slate-500">{p.pid}</td><td className="text-slate-200 truncate max-w-[140px]">{p.name}</td>
                            <td className="text-right text-cyan-300">{p.mem.toFixed(1)}</td><td className="text-right text-indigo-300">{p.cpu.toFixed(1)}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
}

const SVC_LABEL: Record<string, string> = { nginx: 'Nginx', mysql: 'MySQL', ollama: 'Ollama', cloudflared: 'Tunnel', 'php8.3-fpm': 'PHP-FPM', cron: 'Cron', docker: 'Docker' };

export default function MonitorDashboard() {
    const [s, setS] = useState<Stats | null>(null);
    const [err, setErr] = useState(false);
    const [pulsing, setPulsing] = useState(false);
    const [pulseMsg, setPulseMsg] = useState('');
    const [clock, setClock] = useState('--:--:--');
    const cpuH = useRef<number[]>([]); const ramH = useRef<number[]>([]); const diskH = useRef<number[]>([]); const netH = useRef<{d:number,u:number}[]>([]);
    const netMax = useRef(1); const offset = useRef(0); const logRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        const tick = async () => {
            try {
                const r = await fetch('/api/monitor/stats', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                if (!r.ok) throw new Error();
                const d: Stats = await r.json();
                cpuH.current = [...cpuH.current, d.cpu].slice(-MAXLEN);
                ramH.current = [...ramH.current, d.mem.pct].slice(-MAXLEN);
                diskH.current = [...diskH.current, d.disk.pct].slice(-MAXLEN);
                netH.current = [...netH.current, {d:d.net.down,u:d.net.up}].slice(-MAXLEN);
                netMax.current = Math.max(netMax.current * 0.95, d.net.down, d.net.up, 1);
                offset.current = new Date(d.ts).getTime() - Date.now();
                setS(d); setErr(false);
            } catch { setErr(true); }
        };
        tick(); const id = window.setInterval(tick, 2000); return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const id = window.setInterval(() => {
            if (!s) return;
            try { setClock(new Intl.DateTimeFormat('es-CO', { timeZone: s.tz || 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(Date.now() + offset.current))); }
            catch { setClock(new Date().toLocaleTimeString('es-CO')); }
        }, 1000); return () => window.clearInterval(id);
    }, [s]);

    const doPulse = async () => {
        setPulsing(true); setPulseMsg('');
        try { const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''; const r = await fetch('/api/monitor/pulse', { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' } }); setPulseMsg(r.ok ? '✓ Pulso enviado' : '✗ Error'); }
        catch { setPulseMsg('✗ Error'); }
        setTimeout(() => { setPulsing(false); setPulseMsg(''); }, 3000);
    };

    const ramAlert = (s?.mem.pct ?? 0) > 80; const diskAlert = (s?.disk.pct ?? 0) > 90;
    const alerts = useMemo(() => { const a: string[] = []; if (ramAlert) a.push(`RAM critica: ${s!.mem.pct}%`); if (diskAlert) a.push(`Disco critico: ${s!.disk.pct}%`); return a; }, [s, ramAlert, diskAlert]);

    return (
        <div className="min-h-screen bg-[#0f1117] text-slate-200 p-4 md:p-8 relative overflow-hidden">
            <div className="pointer-events-none fixed -top-48 -right-48 w-[560px] h-[560px] rounded-full bg-indigo-600/10 blur-3xl" />
            <div className="pointer-events-none fixed bottom-0 left-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/8 blur-3xl" />

            <div className="relative max-w-[1800px] mx-auto space-y-5">
                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">MONITOR · TITAN</h1>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mt-1">Oracle ARM · 4 OCPU · 24 GB · Ubuntu</p>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="text-right"><div className="text-2xl font-black tabular-nums text-white">{clock}</div><div className="text-[9px] uppercase tracking-widest text-slate-500">{s?.tz ?? ''} · {s?.uptime.label ?? '—'}</div></div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/40">
                            <span className={`h-2.5 w-2.5 rounded-full ${err ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'}`} /><span className="text-xs font-bold text-slate-300">{err ? 'Sin conexion' : 'En vivo'}</span>
                        </div>
                    </div>
                </header>

                {alerts.length > 0 && (<div className="rounded-2xl border border-red-500/60 bg-red-950/40 px-5 py-3 flex items-center gap-3 animate-[pulse_1.5s_ease-in-out_infinite]"><span className="text-xl">⚠️</span><span className="text-sm font-bold text-red-200">{alerts.join('  ·  ')}</span></div>)}

                {!s ? (<div className="text-center py-32 text-slate-500">Cargando metricas...</div>) : (<>
                    {/* Gauges + Sparklines */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[{t:'CPU',v:s.cpu,u:'%',h:cpuH.current,c:'#818cf8'},{t:'RAM',v:s.mem.pct,u:'%',h:ramH.current,c:'#22d3ee',a:ramAlert},{t:'Disco',v:s.disk.pct,u:'%',h:diskH.current,c:'#a78bfa',a:diskAlert}].map(m => (
                            <div key={m.t} className={`rounded-3xl p-5 border backdrop-blur-xl shadow-2xl ${m.a ? 'border-red-500/60 bg-red-950/30 animate-[pulse_1.5s_ease-in-out_infinite]' : 'border-slate-700/40 bg-slate-900/60'}`}>
                                <div className="flex justify-between items-start"><span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{m.t}</span><span className={`text-xs font-black ${trendColor(m.h)}`}>{trendArrow(m.h)}</span></div>
                                <div className="mt-1 flex items-baseline gap-1"><span className={`text-4xl font-black tabular-nums ${m.a ? 'text-red-400' : 'text-white'}`}>{m.v.toFixed(m.v < 10 ? 1 : 0)}</span><span className="text-sm font-bold text-slate-500">{m.u}</span></div>
                                <div className="mt-2"><Sparkline data={m.h} color={m.c} /></div>
                            </div>
                        ))}
                        {/* Red dual-line chart */}
                        <div className="rounded-3xl p-5 border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Red</span>
                            <div className="mt-2 space-y-2">
                                {([['↓ Descarga',s.net.down,'#34d399'],['↑ Subida',s.net.up,'#818cf8']] as const).map(([label,val,c],i) => (
                                    <div key={i}><div className="flex justify-between text-xs mb-1"><span style={{color:c}}>{label}</span><span className="font-mono text-slate-300">{fmtRate(val)}</span></div>
                                    <div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.min(100,(val/netMax.current)*100)}%`,background:c}}/></div></div>
                                ))}
                            </div>
                            <div className="mt-3" style={{position:'relative',height:40}}>
                                <svg width="100%" height="40" viewBox="0 0 240 40" preserveAspectRatio="none" className="block">
                                    {netH.current.length >= 2 && (()=>{
                                        const step = 240/(netH.current.length-1);
                                        const dMax = Math.max(...netH.current.map(x=>x.d),1);
                                        const uMax = Math.max(...netH.current.map(x=>x.u),1);
                                        const dPts = netH.current.map((x,i)=>`${(i*step).toFixed(1)},${(40-(x.d/dMax)*35).toFixed(1)}`).join(' ');
                                        const uPts = netH.current.map((x,i)=>`${(i*step).toFixed(1)},${(40-(x.u/uMax)*35).toFixed(1)}`).join(' ');
                                        return <><polyline points={dPts} fill="none" stroke="#34d399" strokeWidth="2" vectorEffect="non-scaling-stroke"/><polyline points={uPts} fill="none" stroke="#818cf8" strokeWidth="2" vectorEffect="non-scaling-stroke"/></>;
                                    })()}
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Servicios */}
                    <div className="rounded-3xl p-5 border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Servicios</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            {s.services.map(svc => (<div key={svc.name} className={`rounded-2xl px-3 py-3 border flex flex-col items-center gap-2 transition-all ${svc.active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}`}><span className={`h-3 w-3 rounded-full ${svc.active ? 'bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,.6)]' : 'bg-red-500 animate-pulse'}`} /><span className="text-[11px] font-bold text-slate-200">{SVC_LABEL[svc.name] ?? svc.name}</span><span className={`text-[8px] uppercase tracking-wider ${svc.active ? 'text-emerald-400' : 'text-red-400'}`}>{svc.state}</span></div>))}
                        </div>
                    </div>

                    {/* 3 listas de procesos */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ProcessTable title="Procesos por RAM" data={s.processes} />
                        <ProcessTable title="Procesos por CPU" data={s.proc_cpu || s.processes} />
                        <ProcessTable title="Procesos por Disco" data={s.proc_disk && s.proc_disk.length > 0 ? s.proc_disk : s.processes.map(p=>({...p,name:p.name+''}))} />
                    </div>

                    {/* Logs */}
                    <div className="rounded-3xl p-5 border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Log del sistema (vivo)</h2>
                        <pre ref={logRef} className="text-[10px] leading-relaxed font-mono text-slate-400 bg-black/50 rounded-xl p-3 overflow-auto max-h-[300px] whitespace-pre-wrap">{s.logs}</pre>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-8">
                        <button onClick={doPulse} disabled={pulsing} className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 active:scale-95">{pulsing ? (pulseMsg || 'Enviando pulso...') : '⚡ Anti-Reclaim (pulso manual)'}</button>
                        <span className="text-[10px] font-mono text-slate-600">Refresco 2s · {new Date(s.ts).toLocaleTimeString('es-CO')}</span>
                    </div>
                </>)}
            </div>
        </div>
    );
}