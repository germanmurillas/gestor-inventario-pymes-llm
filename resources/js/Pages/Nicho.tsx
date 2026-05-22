import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { TrendingUp, DollarSign, Clock, Shield, Zap, Lock, Star, ArrowUp, Target, Cpu, Globe, Server, Gamepad, Bot, BarChart3, PenTool, Store, GraduationCap, ChartLine, Radio } from 'lucide-react';
import PixelSnow from '../components/PixelSnow';

interface NichoData {
  id: string;
  emoji: string;
  name: string;
  category: string;
  trend: number; // 1-5 flames
  incomeMin: number;
  incomeMax: number;
  timeWeeks: { min: number; max: number };
  timeLabel: string;
  risk: number; // 1-5
  competition: number; // 1-5
  infraScore: number; // 1-5 how well DesktopTitan fits
  pros: string[];
  cons: string[];
  steps: string[];
  marketNote: string;
  keyInsight: string;
  icon: React.ElementType;
}

const NICHES: NichoData[] = [
  {
    id: 'ai-influencer', emoji: '🤖', name: 'AI Influencer', category: 'Contenido',
    trend: 5, incomeMin: 500, incomeMax: 5000, timeWeeks: { min: 4, max: 8 }, timeLabel: '1-2 meses',
    risk: 3, competition: 3, infraScore: 3,
    pros: ['Margen 80%+', 'LLM escribe guiones', 'Sin necesidad de cámara', 'Escala a múltiples cuentas'],
    cons: ['Necesita APIs de imagen/video ($200-500/mes)', 'Riesgo de detección por plataforma'],
    steps: ['1. Crear personaje con LLM (nombre, backstory, voz)', '2. Producir 10 posts/videos piloto con APIs', '3. Publicar 3x/día, iterar con métricas de engagement'],
    marketNote: 'Mercado de $4.2B en 2026. Crecimiento 41% anual. Casos: Yang Mun facturó $300K en 90 días.',
    keyInsight: 'El LLM como "director creativo" — escribe todo, APIs ejecutan lo visual.',
    icon: Bot,
  },
  {
    id: 'youtube-kids', emoji: '🎥', name: 'YouTube Kids Autónomo', category: 'Contenido',
    trend: 4, incomeMin: 1000, incomeMax: 10000, timeWeeks: { min: 8, max: 16 }, timeLabel: '2-4 meses',
    risk: 4, competition: 4, infraScore: 2,
    pros: ['CPM $2-8 en contenido infantil', 'Potencial viral masivo', 'Ingresos pasivos acumulativos'],
    cons: ['Saturación extrema en 2026', 'Regulaciones COPPA/Kids cada vez más estrictas', 'Requiere video generation (API costosa)'],
    steps: ['1. Definir nicho: nursery rhymes, learning, animations', '2. Usar LLM para guiones + Runway/Kling para video', '3. Publicar 5 videos/semana, optimizar thumbnails y SEO'],
    marketNote: 'Mercado de $28B en contenido infantil digital. Crecimiento 12% anual.',
    keyInsight: 'El LLM genera guiones educativos, pero necesitas APIs de video ($500-1000/mes inicial). Alto riesgo de saturación.',
    icon: Radio,
  },
  {
    id: 'minecraft-server', emoji: '⛏️', name: 'Minecraft Server (150+ players)', category: 'Gaming',
    trend: 3, incomeMin: 200, incomeMax: 2000, timeWeeks: { min: 1, max: 2 }, timeLabel: '1-2 semanas',
    risk: 2, competition: 3, infraScore: 5,
    pros: ['Java corre NATIVO en ARM', 'Ecosistema de monetización maduro', 'Setup rápido', 'Comunidad gigante y activa'],
    cons: ['Competencia alta en servers grandes', 'Necesitas construir comunidad desde cero'],
    steps: ['1. Instalar PaperMC + Geyser (cross-play)', '2. Configurar ranks VIP ($5-25/mes) + Tebex/BuyCraft', '3. Promocionar en PlanetMinecraft, Discord, TikTok'],
    marketNote: 'Minecraft 200M+ copias vendidas. Servidores top facturan $50K-500K/mes. Tú apuntas a nicho local/hispano.',
    keyInsight: '150-250 jugadores simultáneos con 24GB. Java nativo en ARM — cero emulación. Monetización inmediata con ranks.',
    icon: Server,
  },
  {
    id: 'rag-service', emoji: '📚', name: 'RAG as a Service', category: 'IA Empresarial',
    trend: 5, incomeMin: 1500, incomeMax: 5000, timeWeeks: { min: 2, max: 4 }, timeLabel: '2-4 semanas',
    risk: 2, competition: 2, infraScore: 5,
    pros: ['$300-800/mes por cliente', 'Documentos no salen del servidor (privacidad)', 'Nichos sin explotar: abogados, médicos, contadores'],
    cons: ['Requiere ventas B2B (no pasivo)', 'Onboarding por cliente'],
    steps: ['1. Identificar 3 nichos locales (ej: firmas de abogados)', '2. Crear demo con documentos reales de ese nicho', '3. Ofrecer prueba gratuita 7 días → $500/mes'],
    marketNote: 'Mercado RAG: $1.8B en 2026, creciendo a $12B en 2030. 90%+ de empresas sin esta capacidad.',
    keyInsight: 'Tu ventaja: "sus documentos nunca salen de este servidor". Privacidad + soberanía de datos como selling point.',
    icon: Shield,
  },
  {
    id: 'inference-api', emoji: '🔌', name: 'Inference API Service', category: 'IA Empresarial',
    trend: 4, incomeMin: 500, incomeMax: 3000, timeWeeks: { min: 2, max: 4 }, timeLabel: '2-4 semanas',
    risk: 2, competition: 4, infraScore: 4,
    pros: ['Modelo corre 24/7 — siempre disponible', 'Integración OpenAI-compatible fácil', 'Ideal para startups que no quieren pagar OpenAI'],
    cons: ['Race to the bottom en pricing ($0.03/1M tokens)', 'Compites con OpenRouter, Together, Groq', '24GB limita a modelos quantizados'],
    steps: ['1. Exponer endpoint OpenAI-compatible con LiteLLM', '2. Crear landing page con precios por token', '3. Promocionar en r/LocalLLaMA, Twitter AI, Discord'],
    marketNote: 'Inferencia como commodity. Diferenciación = privacidad + zero data logging como ventaja.',
    keyInsight: 'No compitas en precio. Compite en PRIVACIDAD: "tus datos nunca salen, zero logging, auto-hosted".',
    icon: Cpu,
  },
  {
    id: 'fine-tuning', emoji: '🔧', name: 'Fine-tuning Service', category: 'IA Empresarial',
    trend: 4, incomeMin: 1000, incomeMax: 5000, timeWeeks: { min: 4, max: 8 }, timeLabel: '1-2 meses',
    risk: 3, competition: 2, infraScore: 3,
    pros: ['LoRA cabe en 24GB para modelos 7-14B', 'Alto valor percibido', 'Clientes enterprise pagan bien', 'Pocos competidores en nicho hispano'],
    cons: ['Cada cliente requiere trabajo custom', '24GB limita tamaño de modelo fine-tuneable', 'Ciclo de venta B2B más largo'],
    steps: ['1. Especializarte en 2-3 industrias (legal, médica, e-commerce)', '2. Crear portfolio de 3 modelos fine-tuned demo', '3. Precio: $2K-5K por fine-tune + $200/mes hosting'],
    marketNote: 'Fine-tuning creciendo 67% YoY. Empresas pagan $5K-50K por modelos custom. Tú compites en precio con calidad.',
    keyInsight: 'Up-sell natural después de RAG. "Ya tienes tu knowledge base, ahora ten tu propio modelo entrenado en tus datos".',
    icon: PenTool,
  },
  {
    id: 'telegram-bots', emoji: '🤖', name: 'Telegram Bot Suite', category: 'Autónomo',
    trend: 3, incomeMin: 100, incomeMax: 1000, timeWeeks: { min: 1, max: 2 }, timeLabel: '1-2 semanas',
    risk: 1, competition: 3, infraScore: 5,
    pros: ['Cero costo de infraestructura', 'API de Telegram gratuita', 'Monetización: suscripción, ads, premium', 'Fácil de automatizar 100%'],
    cons: ['Ingreso por usuario bajo ($3-10/mes)', 'Alta competencia en bots genéricos', 'Necesitas nicho específico'],
    steps: ['1. Crear bot especializado (ej: traductor jurídico ES↔EN)', '2. Versión gratuita limitada → Premium $5/mes ilimitado', '3. Promocionar en grupos de Telegram del nicho'],
    marketNote: '900M+ usuarios de Telegram. Bots de nicho cobran $5-50/mes. El truco es la especialización extrema.',
    keyInsight: 'El bot más simple y rentable: asistente RAG para un gremio profesional específico con acceso a sus documentos.',
    icon: Globe,
  },
  {
    id: 'openrouter-node', emoji: '🌐', name: 'OpenRouter Node', category: 'IA Empresarial',
    trend: 4, incomeMin: 100, incomeMax: 1000, timeWeeks: { min: 1, max: 2 }, timeLabel: '1-2 semanas',
    risk: 1, competition: 3, infraScore: 5,
    pros: ['Setup mínimo (1-2 horas)', 'Ingreso pasivo 24/7', 'Sin atención al cliente', 'Tráfico orgánico de OpenRouter'],
    cons: ['Ingreso modesto ($0.02-0.05/request)', 'Dependes del tráfico de OpenRouter', '24GB limita modelos que puedes ofrecer'],
    steps: ['1. Configurar LiteLLM proxy → OpenRouter', '2. Registrar node con modelos disponibles', '3. Dejar correr — ingresos por uso'],
    marketNote: 'OpenRouter tiene 500K+ MAU. Los nodes más usados facturan $500-2K/mes con GPUs. En CPU/ARM será menos.',
    keyInsight: 'El ingreso más pasivo de todos. Setup en 1 hora, nunca más lo tocás. Pero el retorno es modesto.',
    icon: ChartLine,
  },
  {
    id: 'micro-saas', emoji: '💻', name: 'Micro-SaaS AI', category: 'Autónomo',
    trend: 5, incomeMin: 1000, incomeMax: 5000, timeWeeks: { min: 4, max: 8 }, timeLabel: '1-2 meses',
    risk: 3, competition: 3, infraScore: 5,
    pros: ['80% margen bruto', 'Infraestructura $0 = ventaja masiva', 'Escala sin costo adicional', 'Mercado de nicho enorme sin explotar'],
    cons: ['Necesitas encontrar product-market fit', 'Desarrollo inicial', 'Marketing y distribución'],
    steps: ['1. Identificar problema de nicho (ej: generador de contratos legales)', '2. Construir MVP con LLM como backend', '3. Precio: $10-50/mes, free tier limitado'],
    marketNote: 'Indie hackers con AI SaaS facturan $1K-50K/mes. El 95% son rentables en 12 meses. Sin infraestructura, tu margen es 80%+.',
    keyInsight: 'La ventaja REAL: tus competidores pagan $500-2000/mes en APIs. Tú pagas $0. Eso es pura ganancia.',
    icon: Zap,
  },
  {
    id: 'ecommerce-ai', emoji: '🛒', name: 'E-commerce AI', category: 'Autónomo',
    trend: 4, incomeMin: 500, incomeMax: 2000, timeWeeks: { min: 4, max: 8 }, timeLabel: '1-2 meses',
    risk: 3, competition: 3, infraScore: 4,
    pros: ['Automatización de descripciones, SEO, atención', 'Print-on-demand = sin inventario', 'Mercado enorme y creciente'],
    cons: ['Competencia en marketplaces', 'Necesitas diseño + logística', 'Márgenes variables según producto'],
    steps: ['1. Investigar productos trending en Etsy/Amazon', '2. LLM genera descripciones SEO + keywords', '3. Automatizar customer service con chatbot IA'],
    marketNote: 'E-commerce global: $6.3T en 2026. Print-on-demand: $7.6B. AI automation reduce trabajo manual 80%.',
    keyInsight: 'LLM + Printful/Printify API = tienda completamente automatizada. Genera listings, responde dudas, optimiza precios.',
    icon: Store,
  },
  {
    id: 'ai-tutor', emoji: '🎓', name: 'AI Tutor Educativo', category: 'Autónomo',
    trend: 4, incomeMin: 500, incomeMax: 2000, timeWeeks: { min: 8, max: 12 }, timeLabel: '2-3 meses',
    risk: 2, competition: 2, infraScore: 5,
    pros: ['Mercado EdTech: $400B para 2028', 'Crecimiento 19.3% CAGR', 'Sesiones ilimitadas a costo $0', 'Nicho: español-inglés para LatAm'],
    cons: ['Desarrollo de currículum', 'Adopción lenta en sector educativo', 'Competencia: Duolingo Max, Khan Academy AI'],
    steps: ['1. Elegir nicho: inglés profesional, coding, preparación exámenes', '2. Crear plan de estudios + ejercicios generados por LLM', '3. Suscripción $15-30/mes con sesiones ilimitadas'],
    marketNote: 'Duolingo Max cobra $30/mes con límite de uso. Tú ofreces ILIMITADO a menor precio. Ventaja competitiva directa.',
    keyInsight: 'El LLM puede generar ejercicios personalizados, corregir respuestas, y adaptar dificultad en tiempo real. Infinitamente escalable.',
    icon: GraduationCap,
  },
  {
    id: 'seo-tools', emoji: '📝', name: 'SEO Tools & Content', category: 'Autónomo',
    trend: 2, incomeMin: 500, incomeMax: 3000, timeWeeks: { min: 4, max: 8 }, timeLabel: '1-2 meses',
    risk: 3, competition: 4, infraScore: 4,
    pros: ['Alto tráfico potencial', 'Modelos de negocio probados', 'LLM ideal para research + escritura'],
    cons: ['Google penaliza AI puro (2024 update)', 'Competencia feroz en SEO tools', 'Tráfico orgánico toma 6-12 meses'],
    steps: ['1. Construir herramienta (calculadora, generador, directorio)', '2. LLM genera contenido de soporte + SEO', '3. Monetizar: ads + premium features'],
    marketNote: 'Google penaliza "AI content farms". Pero herramientas útiles + AI generan tráfico masivo. Enfócate en UTILIDAD, no volumen.',
    keyInsight: 'NO hagas blogs AI. Haz HERRAMIENTAS que usen AI. El LLM potencia la herramienta, no reemplaza el valor.',
    icon: Target,
  },
  {
    id: 'trading-bot', emoji: '📈', name: 'Trading Bot / Señales', category: 'Autónomo',
    trend: 3, incomeMin: 0, incomeMax: 10000, timeWeeks: { min: 4, max: 12 }, timeLabel: '1-3 meses',
    risk: 5, competition: 3, infraScore: 3,
    pros: ['Potencial de ingreso alto', 'LLM puede analizar noticias en tiempo real', 'Mercado crypto 24/7 activo'],
    cons: ['43/50 canales pierden dinero', 'Riesgo legal en varios países', '99% de señales son scam', 'Reputación tóxica'],
    steps: ['1. Construir sistema de análisis de noticias con LLM', '2. Backtesting riguroso (>1 año de datos)', '3. Transparencia total: publicar histórico de señales'],
    marketNote: 'Mercado de señales crypto: $500M+. Pero 99% son scams. La transparencia TOTAL es tu diferenciador si entras.',
    keyInsight: 'ALTO RIESGO. Solo recomendado si construyes reputación con transparencia absoluta. La mayoría fracasa.',
    icon: BarChart3,
  },
  {
    id: 'game-hosting', emoji: '🎮', name: 'Game Server Hosting', category: 'Gaming',
    trend: 3, incomeMin: 100, incomeMax: 500, timeWeeks: { min: 2, max: 4 }, timeLabel: '2-4 semanas',
    risk: 2, competition: 4, infraScore: 3,
    pros: ['Infraestructura ya lista', 'Baja inversión inicial', 'Demanda constante en gaming'],
    cons: ['ARM64 limita juegos compatibles', 'Competidores grandes (Apex, Nitrado)', 'Márgenes bajos ($5-10/slot)'],
    steps: ['1. Identificar juegos que corren en ARM (7DTD, Valheim)', '2. Crear panel de control simple', '3. Precio: $5-15/mes por slot, vender en Discord/Reddit'],
    marketNote: 'Mercado de game hosting: $3.2B. Diferenciación: servidores en Latinoamérica (menor latencia para la región).',
    keyInsight: 'Diferenciate por REGIÓN. Pocos hosts buenos en Sudamérica. Latencia baja = ventaja competitiva real.',
    icon: Gamepad,
  },
];

function TrendBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`h-2 w-3 rounded-sm ${i <= level ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-slate-700/30'}`} />
      ))}
    </div>
  );
}

function ScoreDot({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({length: max}, (_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < score ? (score <= 2 ? 'bg-emerald-500' : score <= 3 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-slate-700/30'}`} />
      ))}
    </div>
  );
}

export default function Nicho() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('nicho_unlocked') === '***REMOVED***');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (pass === '***REMOVED***') {
      sessionStorage.setItem('nicho_unlocked', '***REMOVED***');
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-obsidiana flex items-center justify-center p-8">
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-12 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <Lock size={32} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase">Nicho</h1>
            <p className="text-xs text-slate-500 font-bold mt-2">Hub de Oportunidades con IA · Acceso restringido</p>
          </div>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError(false); }} onKeyDown={e => e.key === 'Enter' && handleUnlock()} className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl px-6 py-4 text-center text-xl font-black text-white tracking-widest outline-none focus:border-purple-500 transition-colors" autoFocus />
          {error && <p className="text-red-400 text-xs font-bold uppercase">Código incorrecto</p>}
          <button onClick={handleUnlock} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black uppercase rounded-2xl transition-all active:scale-95">Acceder</button>
        </div>
      </div>
    );
  }

  const topPicks = NICHES.filter(n => n.trend >= 4 && n.infraScore >= 4);
  const quickWins = NICHES.filter(n => n.timeWeeks.max <= 4 && n.risk <= 2);
  const longPlays = NICHES.filter(n => n.timeWeeks.min >= 4 && n.trend >= 4);

  return (
    <div className="min-h-screen bg-obsidiana text-white pb-20 relative">
      <Head title="Nicho | Oportunidades" />
      <PixelSnow color="#c084fc" flakeSize={0.008} minFlakeSize={1} pixelResolution={500} speed={0.4} depthFade={4} farPlane={30} brightness={2} gamma={0.08} density={0.2} variant="round" direction={250} style={{ position: 'fixed' }} />

      <div className="sticky top-0 z-40 bg-obsidiana/80 backdrop-blur-xl border-b border-slate-700/30 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center"><DollarSign size={16} /></div>
            <h1 className="text-lg font-black uppercase tracking-tight">Nicho</h1>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Hub de Oportunidades</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase">
            <span>{NICHES.length} nichos</span>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-purple-400">DesktopTitan 24GB</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-12 relative z-10">

        {/* INFRA SUMMARY */}
        <div className="bg-slate-800/40 border border-purple-500/20 rounded-3xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Cómputo', value: '4 OCPU ARM', sub: 'Equivalente a ~2 vCPU x86', icon: Cpu },
              { label: 'RAM Disponible', value: '16 GB libres', sub: 'Modelo 19GB cabe holgado', icon: Server },
              { label: 'Red', value: 'Oracle Backbone', sub: 'Ancho de banda empresarial', icon: Globe },
              { label: 'Costo Mensual', value: '$0.00 USD', sub: 'Oracle Always Free Tier', icon: DollarSign },
            ].map(s => (
              <div key={s.label} className="text-center">
                <s.icon size={24} className="mx-auto mb-2 text-purple-400" />
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
                <div className="text-lg font-black text-white mt-1">{s.value}</div>
                <div className="text-[9px] text-slate-600 font-bold">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP PICKS */}
        <div>
          <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-yellow-500/10 rounded-xl"><Star size={20} className="text-yellow-400" /></div><h2 className="text-xl font-black uppercase">Top Picks</h2><span className="text-[10px] font-bold text-yellow-500/70">Mayor retorno con DesktopTitan</span></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {topPicks.map(n => (
              <div key={n.id} className="bg-gradient-to-br from-slate-800/50 to-purple-900/20 border border-yellow-500/20 rounded-2xl p-6 hover:border-yellow-500/40 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><n.icon size={18} className="text-yellow-400" /><span className="text-sm font-black">{n.emoji} {n.name}</span></div>
                  <TrendBar level={n.trend} />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-[10px]"><span className="text-slate-500 uppercase">Ingreso mensual</span><span className="text-emerald-400 font-bold">${n.incomeMin.toLocaleString()} - ${n.incomeMax.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-slate-500 uppercase">Tiempo</span><span className="text-white font-bold">{n.timeLabel}</span></div>
                  <div className="flex justify-between text-[10px]"><span className="text-slate-500 uppercase">Riesgo</span><ScoreDot score={n.risk} /></div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">"{n.keyInsight}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* ALL NICHES */}
        <div>
          <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-500/10 rounded-xl"><Target size={20} className="text-purple-400" /></div><h2 className="text-xl font-black uppercase">Todos los Nichos</h2><span className="text-[10px] font-bold text-slate-500">{NICHES.length} oportunidades analizadas</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NICHES.map(n => (
              <div key={n.id} className={`bg-slate-800/30 border rounded-2xl p-6 transition-all ${n.trend >= 4 ? 'border-purple-500/20 hover:border-purple-500/40' : 'border-slate-700/20 hover:border-slate-600/30'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><n.icon size={16} className={n.trend >= 4 ? 'text-purple-400' : 'text-slate-500'} /><span className="text-sm font-black">{n.emoji} {n.name}</span></div>
                  <TrendBar level={n.trend} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <div className="text-[8px] font-black text-slate-500 uppercase">Ingreso / mes</div>
                    <div className="text-sm font-black text-emerald-400">${n.incomeMin.toLocaleString()}-${n.incomeMax.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                    <div className="text-[8px] font-black text-slate-500 uppercase">Tiempo inicial</div>
                    <div className="text-sm font-black text-white">{n.timeLabel}</div>
                  </div>
                </div>

                <div className="flex gap-4 mb-4 text-[9px]">
                  <div className="flex-1"><span className="text-slate-500 uppercase block mb-1">Riesgo</span><ScoreDot score={n.risk} /></div>
                  <div className="flex-1"><span className="text-slate-500 uppercase block mb-1">Competencia</span><ScoreDot score={n.competition} /></div>
                  <div className="flex-1"><span className="text-slate-500 uppercase block mb-1">Infra Fit</span><ScoreDot score={n.infraScore} /></div>
                </div>

                <details className="group">
                  <summary className="text-[10px] font-bold text-purple-400 cursor-pointer hover:text-purple-300 uppercase">+ Detalles y pasos</summary>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-emerald-400 uppercase">Ventajas</div>
                      {n.pros.map(p => <div key={p} className="text-[10px] text-slate-400 flex items-center gap-1"><span className="text-emerald-500">+</span> {p}</div>)}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-red-400 uppercase">Desventajas</div>
                      {n.cons.map(c => <div key={c} className="text-[10px] text-slate-400 flex items-center gap-1"><span className="text-red-500">-</span> {c}</div>)}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-purple-400 uppercase">Cómo empezar</div>
                      {n.steps.map(s => <div key={s} className="text-[10px] text-slate-300">{s}</div>)}
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3">
                      <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Análisis de mercado</div>
                      <div className="text-[10px] text-slate-400 leading-relaxed">{n.marketNote}</div>
                    </div>
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
                      <div className="text-[8px] font-black text-purple-400 uppercase mb-1">Insight clave</div>
                      <div className="text-[10px] text-purple-300 leading-relaxed italic">"{n.keyInsight}"</div>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK WINS vs LONG PLAYS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-emerald-500/10 rounded-xl"><Zap size={20} className="text-emerald-400" /></div><h2 className="text-lg font-black uppercase">Quick Wins</h2><span className="text-[10px] font-bold text-slate-500">Ingreso en menos de 1 mes</span></div>
            <div className="space-y-3">
              {quickWins.map(n => (
                <div key={n.id} className="flex items-center gap-3 p-4 bg-slate-800/30 border border-emerald-500/10 rounded-xl">
                  <n.icon size={16} className="text-emerald-400 shrink-0" />
                  <div className="flex-1"><div className="text-sm font-bold text-white">{n.emoji} {n.name}</div><div className="text-[9px] text-slate-500">${n.incomeMin}-${n.incomeMax}/mes · {n.timeLabel}</div></div>
                  <ScoreDot score={n.risk} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-500/10 rounded-xl"><TrendingUp size={20} className="text-blue-400" /></div><h2 className="text-lg font-black uppercase">Long Plays</h2><span className="text-[10px] font-bold text-slate-500">Mayor retorno a largo plazo</span></div>
            <div className="space-y-3">
              {longPlays.map(n => (
                <div key={n.id} className="flex items-center gap-3 p-4 bg-slate-800/30 border border-blue-500/10 rounded-xl">
                  <n.icon size={16} className="text-blue-400 shrink-0" />
                  <div className="flex-1"><div className="text-sm font-bold text-white">{n.emoji} {n.name}</div><div className="text-[9px] text-slate-500">${n.incomeMin}-${n.incomeMax}/mes · {n.timeLabel}</div></div>
                  <TrendBar level={n.trend} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20 rounded-3xl p-8 text-center">
          <h2 className="text-lg font-black uppercase mb-4">🏆 Mejor Oportunidad Global</h2>
          <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">RAG as a Service → Micro-SaaS AI</div>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Comenzar con RAG para 2-3 clientes locales ($500-800/mes c/u, 2-4 semanas). Con ese flujo de caja, construir un Micro-SaaS vertical usando el mismo LLM como backend. De $1,500/mes a $5,000-8,000/mes en 12 meses. Todo con infraestructura $0. El camino más seguro y escalable.
          </p>
        </div>

      </div>
    </div>
  );
}
