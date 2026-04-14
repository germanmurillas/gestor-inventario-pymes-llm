import React from 'react';
import { Bell, Clock, Package, AlertTriangle, CheckCircle, Search } from 'lucide-react';

const FigmaNotifications = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell size={24} className="opacity-50" />
                    <h2 className="text-xl font-bold uppercase tracking-tight">Notificaciones</h2>
                </div>
                <button className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest border-b border-transparent hover:border-black transition-all">
                    Marcar todo como leído
                </button>
            </div>

            <div className="space-y-4">
                {/* Notification Group 1: Recientes */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Hoy</h3>
                    
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`bg-white border border-gray-200 rounded-lg p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${i === 1 ? 'border-l-4 border-l-red-400' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${i === 1 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                                {i === 1 ? <AlertTriangle size={18} /> : i === 2 ? <Package size={18} /> : <CheckCircle size={18} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div className="text-sm font-bold">
                                        {i === 1 ? 'Lote #8492 Próximo a vencer' : i === 2 ? 'Ingreso de mercancía: Bodega 1' : 'Auditoría mensual completada'}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">9:41 AM</div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {i === 1 
                                        ? 'El lote de Polímeros 4A tiene menos de 48 horas de vigencia. Por favor considere procesarlo inmediatamente.' 
                                        : 'Se ha registrado el ingreso de 500 bultos de Materia Prima X.'}
                                </p>
                                <div className="flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest">
                                    <button className="text-black hover:opacity-70 transition-opacity">Ver Detalles</button>
                                    <button className="text-gray-400 hover:text-black transition-colors">Descartar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Notification Group 2: Ayer */}
                <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Ayer</h3>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-start gap-4 shadow-sm opacity-60 grayscale">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-50 text-gray-400">
                            <Clock size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div className="text-sm font-bold text-gray-700">Actualización de Sistema V.2.0</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ayer - 6:30 PM</div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Se han aplicado parches de seguridad y mejoras en el módulo de reportes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaNotifications;
