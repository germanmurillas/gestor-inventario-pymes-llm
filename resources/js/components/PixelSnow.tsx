import { useEffect, useRef } from 'react';

interface PixelSnowProps {
  color?: string;
  flakeSize?: number;
  minFlakeSize?: number;
  pixelResolution?: number;
  speed?: number;
  depthFade?: number;
  farPlane?: number;
  brightness?: number;
  gamma?: number;
  density?: number;
  variant?: 'round' | 'square';
  direction?: number;
  style?: React.CSSProperties;
}

interface SnowFlake {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
}

export default function PixelSnow({
  color = '#ffc3c3',
  flakeSize = 0.011,
  minFlakeSize = 1,
  pixelResolution = 500,
  speed = 0.6,
  depthFade = 4,
  farPlane = 30,
  brightness = 3,
  gamma = 0.1,
  density = 0.3,
  variant = 'round',
  direction = 260,
  style,
}: PixelSnowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement!;
    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Scale down resolution for pixel effect
    const scale = Math.min(canvas.width, canvas.height) / pixelResolution;
    const scaledW = Math.floor(canvas.width / scale);
    const scaledH = Math.floor(canvas.height / scale);
    canvas.style.imageRendering = 'pixelated';

    const count = Math.floor((scaledW * scaledH) * density * 0.01);
    const flakes: SnowFlake[] = [];

    for (let i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * scaledW,
        y: Math.random() * scaledH,
        z: Math.random() * farPlane,
        speed: (Math.random() * 0.5 + 0.5) * speed,
        size: Math.random() * flakeSize * scaledW + minFlakeSize,
      });
    }

    const dirRad = ((direction - 180) * Math.PI) / 180;
    const windX = Math.cos(dirRad);
    const windY = Math.sin(dirRad);

    let animId: number;

    const render = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render at pixel resolution
      const offCanvas = document.createElement('canvas');
      offCanvas.width = scaledW;
      offCanvas.height = scaledH;
      const offCtx = offCanvas.getContext('2d')!;

      offCtx.fillStyle = 'rgba(0,0,0,1)';
      offCtx.fillRect(0, 0, scaledW, scaledH);

      for (const f of flakes) {
        f.y += f.speed * windY * 0.5;
        f.x += f.speed * windX * 0.3;

        if (f.y > scaledH + 10) { f.y = -10; f.x = Math.random() * scaledW; f.z = Math.random() * farPlane; }
        if (f.y < -10) { f.y = scaledH + 10; f.x = Math.random() * scaledW; }
        if (f.x > scaledW + 10) f.x = -10;
        if (f.x < -10) f.x = scaledW + 10;

        const depth = 1 - f.z / farPlane;
        const fade = Math.pow(depth, depthFade);
        const alpha = fade * brightness;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const gammaCorrect = (c: number) => Math.pow(c / 255, gamma) * 255;

        offCtx.fillStyle = `rgba(${gammaCorrect(r)},${gammaCorrect(g)},${gammaCorrect(b)},${alpha})`;
        const fs = f.size * fade;

        if (variant === 'round') {
          offCtx.beginPath();
          offCtx.arc(f.x, f.y, fs / 2, 0, Math.PI * 2);
          offCtx.fill();
        } else {
          offCtx.fillRect(f.x - fs / 2, f.y - fs / 2, fs, fs);
        }
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color, flakeSize, minFlakeSize, pixelResolution, speed, depthFade, farPlane, brightness, gamma, density, variant, direction]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
