<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Pymetory</title>
<canvas id="particles" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none"></canvas>
<style>
:root{--blue:#00A0E0;--pop:#00c8ff;--gold:#C8A800;--purple:#8844cc;--green:#00c880}
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0a0f;color:#e8e8f0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
.card{position:relative;z-index:1;text-align:center;padding:3rem;max-width:40rem}
.glitch{font-family:ui-monospace,SFMono-Regular,monospace;font-size:8rem;font-weight:900;line-height:1;color:var(--blue);text-shadow:4px 4px 0 var(--purple),-4px -4px 0 var(--pop);animation:glitch 3s infinite}
@keyframes glitch{0%,100%{text-shadow:4px 4px 0 var(--purple),-4px -4px 0 var(--pop)}25%{text-shadow:-4px 4px 0 var(--pop),4px -4px 0 var(--purple)}50%{text-shadow:4px -4px 0 var(--purple),-4px 4px 0 var(--pop)}75%{text-shadow:-4px -4px 0 var(--pop),4px 4px 0 var(--gold)}}
.code{font-family:ui-monospace,monospace;font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin:0 0 .5rem;font-weight:700}
h1{font-size:1.5rem;margin:0 0 .5rem;font-weight:700;background:linear-gradient(135deg,var(--blue),var(--pop));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#8888a0;font-size:.95rem;line-height:1.6;margin:0 0 1.5rem}
a{display:inline-block;background:linear-gradient(135deg,var(--blue),var(--pop));color:#fff;text-decoration:none;padding:.75rem 1.8rem;border-radius:8px;font-family:ui-monospace,monospace;font-size:.8rem;font-weight:700;transition:transform .2s,box-shadow .2s}
a:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,160,224,.3)}
.sub{font-size:.7rem;color:var(--purple);margin-top:1.5rem;font-family:ui-monospace,monospace;opacity:.6}
</style>
</head>
<body>
<div class="card">
  <div class="code">Error 404</div>
  <div class="glitch">404</div>
  <h1>Pagina no encontrada</h1>
  <p>El lote que buscas no esta en este estante.<br>Quizas fue movido, consumido, o nunca existio.</p>
  <a href="https://app.pymetory.com">Volver al inventario</a>
  <div class="sub">Pymetory · Gestion de Inventarios con IA</div>
</div>
<script>
(function(){var c=document.getElementById('particles'),ctx=c.getContext('2d'),W,H,parts=[],dpr=window.devicePixelRatio||1;var cols=['#00A0E0','#00c880','#00c8ff','#8844cc','#C8A800','#e8e8f0'];function resize(){W=window.innerWidth;H=window.innerHeight;c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr)}function create(n){for(var i=0;i<n;i++)parts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.5,vy:-(Math.random()*.6+.2),r:Math.random()*2+.5,alpha:Math.random()*.6+.2,c:cols[Math.floor(Math.random()*cols.length)]})}resize();create(130);window.addEventListener('resize',function(){resize();parts=[];create(130)});function draw(){ctx.clearRect(0,0,W,H);for(var i=0;i<parts.length;i++){var p=parts[i];p.x+=p.vx;p.y+=p.vy;if(p.y<-10){p.y=H+10;p.x=Math.random()*W}if(p.x<0)p.x=W;if(p.x>W)p.x=0;ctx.save();ctx.globalAlpha=p.alpha;ctx.shadowColor=p.c;ctx.shadowBlur=p.r*4;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore()}requestAnimationFrame(draw)}draw()})();
</script>
</body>
</html>