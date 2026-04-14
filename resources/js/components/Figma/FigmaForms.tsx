import React from 'react';
import { ArrowLeft, Save, Info, Package, DollarSign, Calendar, Tag } from 'lucide-react';

const FigmaForms = ({ onBack }: { onBack: () => void }) => {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
            {/* Header (Mockup 14 Top) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Registro de Nuevo Producto</h2>
                </div>
                <button className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-lg shadow-md font-bold text-sm hover:opacity-90 transition-opacity">
                    <Save size={18} />
                    <span>Guardar Producto</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-10 shadow-sm space-y-10">
                {/* Form Sections (Mockup 14) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* General Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                            <Info size={14} />
                            <span>Información General</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Nombre del Producto</label>
                                <input type="text" placeholder="Ej: Polímero Industrial" className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Categoría / Carpeta</label>
                                <select className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none">
                                    <option>Inventario Disponible</option>
                                    <option>Bodega 1</option>
                                    <option>Bodega 2</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Descripción Corta</label>
                                <textarea placeholder="Opcional..." className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none h-24 resize-none" />
                            </div>
                        </div>
                    </div>

                    {/* Stock & Finance */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                            <Package size={14} />
                            <span>Cantidades y Costos</span>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Stock Inicial</label>
                                    <div className="relative">
                                        <input type="number" placeholder="0" className="w-full bg-white border border-gray-200 rounded-lg pl-4 pr-10 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KG</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-700">Costo Unitario</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input type="number" placeholder="0.00" className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Fecha de Vencimiento</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="date" className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">Etiquetas Relacionadas</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {['Químico', 'Frágil', 'Crítico'].map(tag => (
                                        <div key={tag} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            <Tag size={10} /> {tag}
                                        </div>
                                    ))}
                                    <button className="flex items-center gap-1 bg-white border border-dashed border-gray-300 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:border-gray-500 hover:text-gray-500 transition-colors">
                                        + Agregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-white">
                            <Info size={12} />
                        </div>
                        Los campos marcados son obligatorios para la auditoría posterior.
                    </div>
                    <button className="text-sm font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                        Cancelar Registro
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FigmaForms;
