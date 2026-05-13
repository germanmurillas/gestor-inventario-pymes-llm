import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentCard from '../Components/AgentCard';
import WhatsAppChat from '../Components/WhatsAppChat';
import AgentChart from '../Components/AgentChart';
import { GoldenParticles, ScrambleText, MagneticCard } from '../Components/PremiumEffects';
import { Activity, MessageCircle, Wifi, WifiOff, RefreshCw, Zap, BarChart3 } from 'lucide-react';

const API_URL = '/api/agent-bus';

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
}

interface BusData {
  agents: Record<string, AgentData>;
  events: any[];
  count: number;
}

export default function StatusMaster() {
  const [data, setData] = useState<BusData>({ agents: {}, events: [], count: 0 });
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'chat' | 'charts'>('grid');

  const fetchData = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setConnected(true);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(`HTTP ${res.status}`);
        setConnected(false);
      }
    } catch (e) {
      setError('API offline');
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500); // poll cada 2.5s
    return () => clearInterval(interval);
  }, []);

  const agents = Object.values(data.agents);
  const events = data.events || [];

  return (
    <div className="min-h-screen bg-obsidiana text-white font-sans relative overflow-hidden">
      <Head title="Status Master | Pymetory" />

      {/* Aurora Background + Golden Particles */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.12)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.10)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '3s' }} />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.08)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '5s' }} />
      </div>
      <GoldenParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-white uppercase tracking-tight font-display"
            >
              <Zap size={20} className="inline text-champan mr-2" />
              <span className="text-champan">Status</span>{' '}
              <ScrambleText text="Master" className="text-white" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1"
            >
              Agent Bus Monitor · DesktopTitan · {agents.length} agentes activos
            </motion.p>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 border border-slate-700/30 rounded-full">
              {connected ? (
                <Wifi size={14} className="text-emerald-400" />
              ) : (
                <WifiOff size={14} className="text-red-400" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-wider ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                {connected ? 'Conectado' : error || 'Desconectado'}
              </span>
            </div>

            {/* View toggle */}
            <div className="flex bg-slate-800/40 border border-slate-700/30 rounded-full p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  view === 'grid' ? 'bg-champan/20 text-champan' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity size={14} className="inline mr-1" />
                Grid
              </button>
              <button
                onClick={() => setView('chat')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  view === 'chat' ? 'bg-champan/20 text-champan' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageCircle size={14} className="inline mr-1" />
                Chat
              </button>
              <button
                onClick={() => setView('charts')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  view === 'charts' ? 'bg-champan/20 text-champan' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 size={14} className="inline mr-1" />
                Charts
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchData}
              className="p-2 bg-slate-800/40 border border-slate-700/30 rounded-full hover:bg-slate-700/40 transition-colors"
            >
              <RefreshCw size={16} className="text-slate-400" />
            </button>

            {/* Last update */}
            {lastUpdate && (
              <span className="text-[9px] text-slate-600 font-bold uppercase">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {view === 'grid' ? (
          /* Grid de agentes */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {agents.length > 0 ? (
                agents.map(agent => (
                  <MagneticCard key={agent.name}>
                    <AgentCard agent={agent} />
                  </MagneticCard>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 text-slate-600"
                >
                  <Activity size={48} className="mb-4 opacity-30" />
                    <div className="text-sm font-black uppercase tracking-[0.3em]">
                      {connected ? 'Esperando eventos del Agent Bus...' : 'Conectando con DesktopTitan...'}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : view === 'charts' ? (
          /* Charts View */
          <div className="max-w-4xl mx-auto">
            <AgentChart agents={agents} events={events} />
          </div>
        ) : (
          /* WhatsApp Chat View */
          <div className="h-[calc(100vh-12rem)] max-w-lg mx-auto">
            <WhatsAppChat events={events} />
          </div>
        )}

        {/* Footer stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-6 text-[9px] text-slate-600 font-bold uppercase"
        >
          <span>Eventos hoy: {data.count}</span>
          <span>Agentes: {agents.length}</span>
          <span>API: /api/agent-bus</span>
          <span>Poll: 2.5s</span>
        </motion.div>
      </div>
    </div>
  );
}
