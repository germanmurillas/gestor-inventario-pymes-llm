import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Carbon pearlescent glass — perlado semi-transparente carbono */
const carbonPearl = `
  bg-slate-900/40 backdrop-blur-2xl
  border border-white/[0.06]
  shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.3)]
  before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)] before:pointer-events-none
  after:absolute after:inset-0 after:rounded-2xl after:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.04)_45%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.04)_55%,transparent_60%)] after:pointer-events-none
  overflow-hidden
`;

/** Magnetic hover — 3D tilt following cursor */
export function MagneticCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glow, setGlow] = useState<React.CSSProperties>({});
  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setStyle({
      transform: `perspective(800px) rotateX(${(y - cy) / 18}deg) rotateY(${(cx - x) / 18}deg) scale3d(1.02,1.02,1.02)`,
      transition: 'transform 0.1s ease-out',
    });
    setGlow({
      background: `radial-gradient(600px circle at ${x}px ${y}px, rgba(201,168,76,0.08), transparent 40%)`,
      opacity: 1,
    });
  }, []);
  const handleLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
    });
    setGlow({ opacity: 0, transition: 'opacity 0.4s ease' });
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={style} className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 transition-opacity" style={glow} />
      {children}
    </div>
  );
}

/** Text scramble — letras revueltas al cambiar */
export function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  useEffect(() => {
    let frame = 0;
    const maxFrames = 8;
    const interval = setInterval(() => {
      frame++;
      if (frame >= maxFrames) { setDisplay(text); clearInterval(interval); return; }
      const progress = frame / maxFrames;
      setDisplay(text.split('').map((ch, i) => (Math.random() > progress ? chars[Math.floor(Math.random() * chars.length)] : ch)).join(''));
    }, 40);
    return () => clearInterval(interval);
  }, [text]);
  return <span className={className}>{display}</span>;
}

/** Golden particles — partículas doradas flotantes con paleta Midnight Luxe */
export function GoldenParticles() {
  const palette = [
    '#C9A84C', // champán
    '#C9A84C', // champán (doble peso)
    '#D4AF37', // dorado metálico
    '#E8C547', // dorado claro
    '#6366f1', // índigo
    '#6366f1', // índigo
    '#10b981', // esmeralda
    '#f59e0b', // ámbar
    '#fbbf24', // ámbar claro
    '#ec4899', // rosa
    '#8b5cf6', // violeta
    '#06b6d4', // cian
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Partículas pequeñas — brillo ambiental */}
      {[...Array(50)].map((_, i) => {
        const size = 1 + Math.random() * 3;
        const color = palette[i % palette.length];
        return (
          <motion.div
            key={`ambient-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: `0 0 ${2 + Math.random() * 4}px ${color}`,
            }}
            animate={{
              y: [0, -60 - Math.random() * 80, 0],
              x: [0, (Math.random() - 0.5) * 40, 0],
              opacity: [0, 0.3 + Math.random() * 0.4, 0],
              scale: [0, 1 + Math.random(), 0],
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 6,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Partículas medianas — dorado principal */}
      {[...Array(30)].map((_, i) => {
        const size = 2 + Math.random() * 5;
        const isGold = i < 18;
        const color = isGold
          ? ['#C9A84C', '#D4AF37', '#E8C547', '#F5D76E'][i % 4]
          : palette[8 + (i % 4)];
        return (
          <motion.div
            key={`gold-${i}`}
            className="absolute rounded-full blur-[0.5px]"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              width: size,
              height: size,
              background: color,
              boxShadow: isGold
                ? `0 0 ${4 + Math.random() * 8}px ${color}, 0 0 ${8 + Math.random() * 12}px ${color}66`
                : `0 0 ${2 + Math.random() * 4}px ${color}`,
            }}
            animate={{
              y: [0, -30 - Math.random() * 60, 0],
              x: [0, (Math.random() - 0.5) * 50, 0],
              opacity: [0, 0.4 + Math.random() * 0.4, 0],
              scale: [0, 1 + Math.random() * 1.5, 0],
            }}
            transition={{
              duration: 3.5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 7,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Partículas grandes — sparkles ocasionales */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            width: 3 + Math.random() * 4,
            height: 3 + Math.random() * 4,
            background: '#C9A84C',
            boxShadow: '0 0 10px #C9A84C, 0 0 20px #C9A84C88, 0 0 40px #C9A84C44',
          }}
          animate={{
            y: [0, -20 - Math.random() * 30, 0],
            x: [0, (Math.random() - 0.5) * 20, 0],
            opacity: [0, 0.7, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 6,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
}

/** Water ripple on click */
export function useRipple(ref: React.RefObject<HTMLElement>) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  let nextId = useRef(0);
  const handleClick = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el) el.addEventListener('click', handleClick);
    return () => { if (el) el.removeEventListener('click', handleClick); };
  }, [ref, handleClick]);
  return ripples.map(r => (
    <motion.div
      key={r.id}
      className="absolute rounded-full border border-white/20 pointer-events-none z-30"
      initial={{ width: 0, height: 0, x: r.x, y: r.y, opacity: 0.4 }}
      animate={{ width: 120, height: 120, x: r.x - 60, y: r.y - 60, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  ));
}

/** Animated gradient border */
export function GradientBorder({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl ${className}`}>
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-champan/20 via-indigo-500/20 to-emerald-500/20 animate-gradient-x opacity-50 blur-[2px]" />
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-champan/10 via-transparent to-champan/10" />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Shine sweep effect */
export function ShineSweep({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <div className="absolute inset-0 pointer-events-none shine-sweep" />
    </div>
  );
}

/** Carbon Pearl Card — contenedor base con efecto perlado carbono */
export function CarbonCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${carbonPearl} ${className}`}>
      {children}
    </div>
  );
}

/** Floating orb — orbe de luz flotante */
export function FloatingOrb({ color = 'champan', size = 300, className = '', delay = 0 }: { color?: string; size?: number; className?: string; delay?: number }) {
  const colors: Record<string, string> = {
    champan: 'rgba(201,168,76,0.12)',
    indigo: 'rgba(99,102,241,0.08)',
    emerald: 'rgba(16,185,129,0.08)',
    pink: 'rgba(236,72,153,0.06)',
  };
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ width: size, height: size, background: `radial-gradient(circle,${colors[color]}_0%,transparent_70%)` }}
      animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}
