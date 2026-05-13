import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Magnetic hover — el card sigue el cursor con 3D tilt */
export function MagneticCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
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
  }, []);
  const handleLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
    });
  }, []);
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={style} className={className}>
      {children}
    </div>
  );
}

/** Text scramble — anima las letras al cambiar */
export function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  useEffect(() => {
    let frame = 0;
    const maxFrames = 8;
    const interval = setInterval(() => {
      frame++;
      if (frame >= maxFrames) {
        setDisplay(text);
        clearInterval(interval);
        return;
      }
      const progress = frame / maxFrames;
      setDisplay(
        text
          .split('')
          .map((ch, i) => (Math.random() > progress ? chars[Math.floor(Math.random() * chars.length)] : ch))
          .join('')
      );
    }, 40);
    return () => clearInterval(interval);
  }, [text]);
  return <span className={className}>{display}</span>;
}

/** Golden particles — partículas flotantes doradas */
export function GoldenParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-champan/40"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
