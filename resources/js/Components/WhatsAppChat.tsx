import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentEvent {
  source: string;
  event: string;
  summary: string;
  ts: string;
  target?: string;
  id: string;
}

export default function WhatsAppChat({ events }: { events: AgentEvent[] }) {
  const uniqueAgents = [...new Set(events.map(e => e.source))];
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const filteredEvents = selectedAgent
    ? events.filter(e => e.source === selectedAgent || e.target === selectedAgent)
    : events;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-emerald-900/40 border-b border-emerald-700/30 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
          AB
        </div>
        <div>
          <div className="text-sm font-black text-white uppercase tracking-tight">Agent Bus</div>
          <div className="text-[9px] text-emerald-400 font-bold uppercase">
            {events.length} mensajes hoy
          </div>
        </div>
      </div>

      {/* Agent filter chips */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-slate-700/20 bg-slate-900/30">
        <button
          onClick={() => setSelectedAgent(null)}
          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
            !selectedAgent ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
          }`}
        >
          Todos
        </button>
        {uniqueAgents.map(a => (
          <button
            key={a}
            onClick={() => setSelectedAgent(a)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
              selectedAgent === a ? 'bg-emerald-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <AnimatePresence>
          {filteredEvents.slice().reverse().map((e, i) => {
            const hasTarget = e.event === 'handoff.created';
            const isCompleted = e.event === 'task.completed';
            return (
              <motion.div
                key={e.id || i}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="flex flex-col"
              >
                {/* Agent name + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-champan uppercase tracking-wider">
                    {e.source}
                  </span>
                  {hasTarget && (
                    <>
                      <span className="text-[7px] text-pink-400">→</span>
                      <span className="text-[9px] font-black text-pink-400 uppercase tracking-wider">
                        {e.target}
                      </span>
                    </>
                  )}
                  <span className="text-[8px] text-slate-600 ml-auto">
                    {e.ts ? new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                {/* Bubble */}
                <div className={`
                  rounded-2xl px-3.5 py-2.5 max-w-[90%] text-[10px] leading-relaxed
                  ${isCompleted ? 'bg-emerald-600/20 border border-emerald-500/20 text-emerald-100' :
                    hasTarget ? 'bg-pink-600/20 border border-pink-500/20 text-pink-100' :
                    'bg-slate-700/40 border border-slate-600/20 text-slate-200'}
                `}>
                  {isCompleted && '✅ '}
                  {hasTarget && '🤰 '}
                  {e.summary}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
