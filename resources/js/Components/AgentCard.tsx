import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_MAP: Record<string, { label: string; icon: string; color: string }> = {
  durmiendo:     { label: 'Durmiendo',    icon: '🛏️', color: 'text-slate-600' },
  leyendo:       { label: 'Leyendo',      icon: '📖', color: 'text-blue-400' },
  buscando:      { label: 'Buscando',     icon: '🔍', color: 'text-amber-400' },
  consultando:   { label: 'Consultando',  icon: '🗃️', color: 'text-violet-400' },
  escribiendo:   { label: 'Escribiendo',  icon: '✍️', color: 'text-emerald-400' },
  esperando:     { label: 'Esperando',    icon: '⏳', color: 'text-orange-400' },
  gestando:      { label: 'Gestando',     icon: '🤰', color: 'text-pink-400' },
  activo:        { label: 'Activo',       icon: '🟢', color: 'text-green-400' },
  error_sintax:  { label: 'Error Sintax', icon: '⚠️', color: 'text-yellow-400' },
  crash:         { label: 'Crasheado',    icon: '❌', color: 'text-red-500' },
};

interface AgentData {
  name: string;
  hostname: string;
  status: string;
  icon: string;
  last_event: string;
  last_summary: string;
  last_ts: string;
  target?: string;
  event_id: string;
  path?: string;
  file?: string;
  command?: string;
  args?: string;
}

interface Props {
  agent: AgentAgent;
}

export default function AgentCard({ agent }: Props) {
  const statusInfo = STATUS_MAP[agent.status] || STATUS_MAP.activo;
  const isGestating = agent.status === 'gestando';
  const isCrashed = agent.status === 'crash';
  const isActive = agent.status === 'activo';

  const displayPath = agent.path || '—';
  const displayFile = agent.file || (agent.last_event ? `${agent.last_event}.jsonl` : '—');
  const displayArgs = agent.args || (agent.target ? `target: ${agent.target}` : '—');
  const displayCommand = agent.command || agent.last_summary || '—';
  const displayRawLog = JSON.stringify({
    source: agent.name,
    event: agent.last_event,
    status: agent.status,
    ts: agent.last_ts,
    summary: agent.last_summary,
    hostname: agent.hostname,
    target: agent.target,
    path: agent.path,
    file: agent.file,
    command: agent.command,
    args: agent.args,
  }, null, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`
        relative bg-slate-900/70 backdrop-blur-xl border rounded-2xl p-4
        transition-colors duration-500 overflow-hidden
        ${isCrashed ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
          isGestating ? 'border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)]' :
          isActive ? 'border-emerald-500/20' :
          'border-slate-700/30'}
      `}
    >
      {/* Crash shake */}
      {isCrashed && (
        <motion.div
          className="absolute inset-0 bg-red-500/5 z-0"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Gestating pulse */}
      {isGestating && (
        <motion.div
          className="absolute inset-0 bg-pink-500/5 z-0 rounded-2xl"
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Active green glow */}
      {isActive && (
        <motion.div
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-400 z-10"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10">
        {/* Header: icono + nombre a la DERECHA */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.span
              className={`text-2xl ${statusInfo.color}`}
              animate={isCrashed ? { rotate: [0, -5, 5, -3, 0] } : {}}
              transition={{ duration: 0.5, repeat: isCrashed ? Infinity : 0 }}
            >
              {statusInfo.icon}
            </motion.span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {statusInfo.label}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-white uppercase tracking-tight">
              {agent.name}
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase">
              {agent.hostname}
            </div>
          </div>
        </div>

        {/* 5 CAJONES apilados */}
        <div className="space-y-1.5">
          {/* Cajón 1: Rutas (últimos 3 paths) */}
          <motion.div
            layout
            className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/20"
          >
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
              📂 Ruta
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={agent.event_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-[10px] text-slate-300 font-mono truncate"
              >
                {displayPath}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Cajón 2: Archivo */}
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
              📄 Archivo
            </div>
            <div className="text-[10px] text-slate-300 font-mono truncate">
              {displayFile}
            </div>
          </div>

          {/* Cajón 3: Argumentos */}
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
              ⚙️ Argumentos
            </div>
            <div className="text-[10px] text-slate-300 font-mono truncate">
              {displayArgs}
            </div>
          </div>

          {/* Cajón 4: Comando */}
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/20">
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
              ⚡ Comando
            </div>
            <div className="text-[10px] text-slate-300 font-mono truncate">
              {displayCommand}
            </div>
          </div>

          {/* Cajón 5: Log crudo */}
          <AnimatePresence mode="wait">
            <motion.div
              key={agent.event_id + '-log'}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-950/60 rounded-lg px-3 py-2 border border-slate-700/20 overflow-hidden"
            >
              <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
                📋 Log Crudo
              </div>
              <motion.pre
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[9px] text-emerald-400/80 font-mono leading-relaxed max-h-20 overflow-y-auto"
              >
{displayRawLog}
              </motion.pre>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Timestamp footer */}
        <div className="mt-3 pt-2 border-t border-slate-700/20 flex justify-between items-center">
          <span className="text-[8px] text-slate-600 font-bold uppercase">
            {agent.last_ts ? new Date(agent.last_ts).toLocaleTimeString() : '—'}
          </span>
          <span className="text-[8px] text-slate-600 font-bold uppercase">
            {agent.event_id.slice(0, 8)}...
          </span>
        </div>
      </div>
    </motion.div>
  );
}
