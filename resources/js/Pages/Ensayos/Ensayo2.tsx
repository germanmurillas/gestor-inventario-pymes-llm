import React from 'react';
import { Head } from '@inertiajs/react';

export default function Ensayo2() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <Head title="Ensayo 2 — TCPDF Server" />
      <h1 className="text-2xl font-bold mb-2">🧪 Ensayo 2 — PDF Server-side con coordenadas</h1>
      <p className="text-slate-400 text-sm mb-6">TCPDF genera PDF en el servidor con posicion absoluta X/Y en mm. Ideal industrial.</p>
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
        <p>⚠️ Requiere composer require tecnickcom/tcpdf y un endpoint POST. Pendiente de implementar.</p>
      </div>
    </div>
  );
}
