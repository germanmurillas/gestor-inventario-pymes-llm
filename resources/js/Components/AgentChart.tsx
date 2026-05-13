import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { BarChart3, PieChartIcon, Activity } from 'lucide-react';

const COLORS = ['#C9A84C', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

interface AgentData {
  name: string;
  status: string;
  icon: string;
  last_event: string;
  last_summary: string;
  last_ts: string;
}

export default function AgentChart({ agents, events }: { agents: AgentData[]; events: any[] }) {
  // Bar: eventos por agente
  const barData = [...agents]
    .sort((a, b) => Number(b.last_ts) - Number(a.last_ts))
    .slice(0, 9)
    .map((a, i) => ({
      name: a.name,
      eventos: events.filter(e => e.source === a.name).length,
      fill: COLORS[i % COLORS.length],
    }));

  // Pie: estados actuales
  const statusCounts: Record<string, number> = {};
  agents.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // Area: actividad en el tiempo (eventos agrupados por minuto)
  const timeBuckets: Record<string, number> = {};
  events.forEach(e => {
    if (e.ts) {
      const min = e.ts.substring(11, 16); // HH:MM
      timeBuckets[min] = (timeBuckets[min] || 0) + 1;
    }
  });
  const areaData = Object.entries(timeBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([time, count]) => ({ time, eventos: count }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Bar Chart — eventos por agente */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-champan" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
            Eventos por Agente
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }}
              labelStyle={{ color: '#C9A84C', fontWeight: 700 }}
            />
            <Bar dataKey="eventos" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {barData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart — distribución de estados */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} className="text-champan" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              Estados Actuales
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 9, color: '#94a3b8' }}
                iconType="circle"
                iconSize={6}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart — actividad en el tiempo */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-champan" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
              Actividad (últimos 12 min)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }}
                labelStyle={{ color: '#C9A84C', fontWeight: 700 }}
              />
              <Area
                type="monotone"
                dataKey="eventos"
                stroke="#C9A84C"
                strokeWidth={2}
                fill="url(#colorEvents)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
