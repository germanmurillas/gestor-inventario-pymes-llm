import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Printer, QrCode, Barcode, Search, Settings, ChevronDown, ChevronRight, Plus, Trash2, Save, Copy } from 'lucide-react';
import axios from 'axios';
import * as QRCodeLib from 'qrcode';
import JsBarcode from 'jsbarcode';

const CSRF = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
axios.defaults.headers.common['X-CSRF-TOKEN'] = CSRF;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// ── Tipos ──
interface Config { labelW: number; labelH: number; qrSize: number; qrX: number; qrY: number; nameX: number; nameY: number; skuX: number; skuY: number; loteX: number; loteY: number; venceX: number; venceY: number; cols: number; gapX: number; gapY: number; showName: boolean; showSku: boolean; showLote: boolean; showVence: boolean; }
interface Profile { name: string; config: Config; }
interface LoteItem { id: number; material_name: string; codigo: string; lote: string; vencimiento: string; cantidad: number; unit: string; }

const DEFAULTS: Config = { labelW: 250, labelH: 150, qrSize: 100, qrX: 75, qrY: 25, nameX: 10, nameY: 10, skuX: 10, skuY: 110, loteX: 130, loteY: 110, venceX: 10, venceY: 128, cols: 1, gapX: 10, gapY: 10, showName: true, showSku: true, showLote: true, showVence: true };
const PERSONALIZADO1: Config = { labelW: 230, labelH: 200, qrSize: 135, qrX: 40, qrY: 25, nameX: 55, nameY: 10, skuX: 10, skuY: 180, loteX: 135, loteY: 180, venceX: 5, venceY: 168, cols: 2, gapX: 10, gapY: 10, showName: true, showSku: true, showLote: true, showVence: true };

const INITIAL_PROFILES: Profile[] = [
  { name: 'Por Defecto', config: { ...DEFAULTS } },
  { name: 'Personalizado 1', config: { ...PERSONALIZADO1 } },
];

// ── Componente ──
export default function Ensayo4() {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try { const s = localStorage.getItem('ensayo4_profiles'); return s ? JSON.parse(s) : INITIAL_PROFILES; }
    catch { return INITIAL_PROFILES; }
  });
  const [activeIdx, setActiveIdx] = useState<number>(() => {
    const s = localStorage.getItem('ensayo4_activeProfile');
    return s ? parseInt(s) : 0;
  });
  const [labelType, setLabelType] = useState<'QR' | 'CODE128'>('QR');
  const [lotes, setLotes] = useState<LoteItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [showConfig, setShowConfig] = useState(true);
  const [showProfiles, setShowProfiles] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [flash, setFlash] = useState('');

  const activeProfile = profiles[activeIdx] || profiles[0];
  const config = activeProfile?.config || DEFAULTS;
  const notify = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 2000); };

  // Persist
  useEffect(() => { localStorage.setItem('ensayo4_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem('ensayo4_activeProfile', String(activeIdx)); }, [activeIdx]);

  // Cargar lotes
  useEffect(() => {
    axios.get('/inventory/lotes').then(r => { if (r.data?.lotes) setLotes(r.data.lotes); }).catch(() => {
      setLotes([{ id: 1, material_name: 'ACERO INOX 304', codigo: 'MAT-001', lote: 'L-A1', vencimiento: '2026-12-15', cantidad: 50, unit: 'kg' }, { id: 2, material_name: 'VALVULA 2"', codigo: 'MAT-002', lote: 'L-B2', vencimiento: '2026-08-20', cantidad: 12, unit: 'un' }]);
    });
  }, []);

  const filtered = lotes.filter(l => !search || l.material_name.toLowerCase().includes(search.toLowerCase()) || l.codigo.toLowerCase().includes(search.toLowerCase()));
  const selected = lotes.filter(l => selectedIds.has(l.id));
  const toggleSelect = (id: number) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  useEffect(() => {
    (async () => {
      const map: Record<number, string> = {};
      for (const l of selected) {
        if (labelType === 'QR') { map[l.id] = await QRCodeLib.toDataURL(JSON.stringify({ id: l.id, sku: l.codigo, batch: l.lote, v: '1.0' }), { width: config.qrSize, margin: 2, color: { dark: '#000', light: '#fff' } }); }
        else { const c = document.createElement('canvas'); JsBarcode(c, l.codigo + '-' + l.lote, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 8, background: '#fff', lineColor: '#000' }); map[l.id] = c.toDataURL('image/png'); }
      }
      setCodes(map);
    })();
  }, [selected, labelType, config.qrSize]);

  // ── Gestor de perfiles ──
  const updateConfig = (key: keyof Config, value: number | boolean) => {
    setProfiles(prev => {
      const copy = [...prev];
      copy[activeIdx] = { ...copy[activeIdx], config: { ...copy[activeIdx].config, [key]: value } };
      return copy;
    });
  };

  const createProfile = () => {
    const name = newProfileName.trim() || 'Nuevo Perfil';
    setProfiles(prev => [...prev, { name, config: { ...prev[activeIdx].config } }]);
    setActiveIdx(profiles.length);
    setNewProfileName('');
    notify('Perfil creado: ' + name);
  };

  const duplicateProfile = () => {
    setProfiles(prev => [...prev, { name: activeProfile.name + ' (copia)', config: { ...activeProfile.config } }]);
    setActiveIdx(profiles.length);
    notify('Perfil duplicado');
  };

  const deleteProfile = (idx: number) => {
    if (profiles.length <= 1) return notify('Necesitas al menos 1 perfil');
    setProfiles(prev => prev.filter((_, i) => i !== idx));
    if (activeIdx >= idx) setActiveIdx(Math.max(0, activeIdx - 1));
    notify('Perfil eliminado');
  };

  const renameProfile = () => {
    const name = prompt('Nuevo nombre:', activeProfile.name);
    if (!name?.trim()) return;
    setProfiles(prev => { const c = [...prev]; c[activeIdx] = { ...c[activeIdx], name: name.trim() }; return c; });
    notify('Renombrado: ' + name);
  };

  // ── Impresion ──
  const handlePrint = () => {
    if (selected.length === 0) return;
    const svgContent = selected.map((l, i) => `
      <g transform="translate(0,${i * config.labelH})">
        <rect width="${config.labelW}" height="${config.labelH}" fill="white" stroke="#ccc" stroke-width="1" rx="4"/>
        ${config.showName ? `<text x="${config.nameX}" y="${config.nameY + 12}" font-size="11" font-weight="bold" fill="#000">${l.material_name}</text>` : ''}
        <image href="${codes[l.id] || ''}" x="${config.qrX}" y="${config.qrY}" width="${config.qrSize}" height="${config.qrSize}"/>
        ${config.showSku ? `<text x="${config.skuX}" y="${config.skuY}" font-size="9" font-weight="bold" fill="#000">${l.codigo}</text>` : ''}
        ${config.showLote ? `<text x="${config.loteX}" y="${config.loteY}" font-size="9" fill="#000">Lote: ${l.lote}</text>` : ''}
        ${config.showVence ? `<text x="${config.venceX}" y="${config.venceY}" font-size="9" fill="#c00">Vence: ${l.vencimiento}</text>` : ''}
      </g>`).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${config.labelW}" height="${selected.length * config.labelH}">${svgContent}</svg>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeProfile.name}</title><style>body{margin:20px}@page{size:auto;margin:10mm}</style></head><body>${svg}<script>setTimeout(()=>window.print(),500)</script></body></html>`);
    w.document.close();
  };

  const field = 'w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white';
  const numConfigs: (keyof Config)[] = ['labelW','labelH','qrSize','qrX','qrY','nameX','nameY','skuX','skuY','loteX','loteY','venceX','venceY','cols','gapX','gapY'];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <Head title="Ensayo 4 — SVG" />
      {flash && <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold z-50">{flash}</div>}

      <h1 className="text-2xl font-bold mb-1">🧪 Ensayo 4 — SVG con Perfiles</h1>
      <p className="text-slate-400 text-sm mb-2">Perfil activo: <span className="text-indigo-400 font-bold">{activeProfile.name}</span></p>

      <div className="grid md:grid-cols-12 gap-6">
        {/* ── COL IZQ ── */}
        <div className="md:col-span-4 space-y-4">

          {/* ── PERFILES ── */}
          <div className="bg-slate-900 rounded-xl border border-indigo-500/30 overflow-hidden">
            <button onClick={() => setShowProfiles(!showProfiles)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-400">📋 Perfiles ({profiles.length})</span>
              {showProfiles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {showProfiles && (
              <div className="p-3 border-t border-slate-700 space-y-1 max-h-[250px] overflow-y-auto">
                {profiles.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${i === activeIdx ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-slate-800/30 hover:bg-slate-700/30'}`}>
                    <button onClick={() => setActiveIdx(i)} className="flex-1 text-left font-bold" title={p.name}>{p.name}</button>
                    <button onClick={() => renameProfile()} className="p-1 text-slate-400 hover:text-white" title="Renombrar"><Save size={12} /></button>
                    <button onClick={() => duplicateProfile()} className="p-1 text-slate-400 hover:text-white" title="Duplicar"><Copy size={12} /></button>
                    <button onClick={() => deleteProfile(i)} className="p-1 text-slate-400 hover:text-red-400" title="Eliminar"><Trash2 size={12} /></button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Nombre..." value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProfile()} />
                  <button onClick={createProfile} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold"><Plus size={12} className="inline mr-1"/>Crear</button>
                </div>
              </div>
            )}
          </div>

          {/* ── ITEMS ── */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3"><Search size={14} className="text-slate-400"/><input className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white outline-none" placeholder="Buscar lote..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            <div className="max-h-[150px] overflow-y-auto space-y-1">
              {filtered.map(l => (
                <button key={l.id} onClick={() => toggleSelect(l.id)} className={`w-full text-left px-3 py-1.5 rounded text-xs ${selectedIds.has(l.id) ? 'bg-indigo-600/30 border border-indigo-500/50' : 'bg-slate-800/50 border border-transparent'} hover:bg-slate-700/50 transition-colors`}>
                  <span className="font-bold">{l.material_name}</span> <span className="text-slate-400">{l.codigo}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── TIPO ── */}
          <div className="flex gap-2">
            <button onClick={() => setLabelType('QR')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${labelType==='QR'?'bg-indigo-600':'bg-slate-700'}`}><QrCode size={14} className="inline mr-1"/>QR</button>
            <button onClick={() => setLabelType('CODE128')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${labelType==='CODE128'?'bg-indigo-600':'bg-slate-700'}`}><Barcode size={14} className="inline mr-1"/>Barras</button>
          </div>

          {/* ── CONFIG ── */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            <button onClick={() => setShowConfig(!showConfig)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50"><span className="text-sm font-bold uppercase tracking-wider text-indigo-400"><Settings size={14} className="inline mr-2"/>Configuracion</span>{showConfig ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>
            {showConfig && (
              <div className="p-4 border-t border-slate-700 grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                {numConfigs.map(key => (
                  <div key={key}><label className="text-[8px] text-slate-400 uppercase">{key}</label><input type="number" className={field} value={config[key]} step="5" onChange={e => updateConfig(key, parseInt(e.target.value) || 0)} /></div>
                ))}
                <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer"><input type="checkbox" checked={config.showName} onChange={e => updateConfig('showName' as any, e.target.checked)} />Nombre</label>
                <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer"><input type="checkbox" checked={config.showSku} onChange={e => updateConfig('showSku' as any, e.target.checked)} />SKU</label>
                <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer"><input type="checkbox" checked={config.showLote} onChange={e => updateConfig('showLote' as any, e.target.checked)} />Lote</label>
                <label className="flex items-center gap-2 text-[9px] text-slate-400 cursor-pointer"><input type="checkbox" checked={config.showVence} onChange={e => updateConfig('showVence' as any, e.target.checked)} />Vence</label>
              </div>
            )}
          </div>

          <button onClick={handlePrint} disabled={selected.length === 0} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 rounded-xl font-bold uppercase text-sm tracking-wider"><Printer size={16} className="inline mr-2"/>Imprimir SVG ({selected.length})</button>
        </div>

        {/* ── PREVIEW ── */}
        <div className="md:col-span-8">
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 overflow-auto">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3">📐 {activeProfile.name} — {selected.length} etiquetas</h2>
            <div className="bg-white rounded-lg p-4 inline-flex flex-wrap gap-2 min-w-full" style={{ minHeight: 200 }}>
              {selected.length === 0 && <p className="text-slate-400 text-xs w-full text-center py-8">Selecciona lotes para ver el preview</p>}
              {selected.map(l => (
                <div key={l.id} className="relative border border-slate-200 rounded" style={{ width: config.labelW, height: config.labelH }}>
                  {config.showName && <div className="absolute text-[11px] font-bold text-black" style={{ left: config.nameX, top: config.nameY }}>{l.material_name}</div>}
                  {codes[l.id] && <img className="absolute" src={codes[l.id]} style={{ left: config.qrX, top: config.qrY, width: config.qrSize, height: config.qrSize }} alt="QR"/>}
                  {config.showSku && <div className="absolute text-[9px] font-bold text-black" style={{ left: config.skuX, top: config.skuY }}>{l.codigo}</div>}
                  {config.showLote && <div className="absolute text-[9px] text-black" style={{ left: config.loteX, top: config.loteY }}>Lote: {l.lote}</div>}
                  {config.showVence && <div className="absolute text-[9px] text-red-600" style={{ left: config.venceX, top: config.venceY }}>Vence: {l.vencimiento}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
