import React, { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { router } from '@inertiajs/react';

interface FigmaPhotoUploadProps {
  photoUrl?: string | null;
  uploadUrl: string;
  deleteUrl: string;
  label?: string;
}

const FigmaPhotoUpload = ({ photoUrl, uploadUrl, deleteUrl, label = 'Foto del Ítem' }: FigmaPhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('photo', file);

    setUploading(true);
    router.post(uploadUrl, formData, {
      forceFormData: true,
      onSuccess: () => {
        setUploading(false);
        window.location.reload();
      },
      onError: () => setUploading(false),
    });
  };

  const handleDelete = () => {
    router.delete(deleteUrl, {
      onFinish: () => window.location.reload(),
    });
  };

  const displayUrl = preview || photoUrl;

  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-200 uppercase tracking-tight">{label}</label>
        <div className="flex items-start gap-4">
          {/* Thumbnail / Placeholder */}
          <div
            onClick={() => displayUrl && setShowLightbox(true)}
            className={`relative w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group ${
              displayUrl
                ? 'border-indigo-500/40 cursor-zoom-in hover:border-indigo-500'
                : 'border-slate-300 cursor-pointer hover:border-indigo-400 bg-slate-800/50'
            }`}
          >
            {displayUrl ? (
              <>
                <img
                  src={displayUrl}
                  alt={label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-xl">
                    Ampliar
                  </span>
                </div>
              </>
            ) : (
              <div
                className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={28} />
                <span className="text-[9px] font-black uppercase tracking-widest">Subir foto</span>
              </div>
            )}
          </div>

          {/* Upload / Delete buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/15 transition-all border border-indigo-500/25 disabled:opacity-50"
            >
              <Camera size={14} />
              <span>{displayUrl ? 'Cambiar foto' : 'Subir foto'}</span>
            </button>
            {displayUrl && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/15 transition-all border border-red-500/25"
              >
                <Trash2 size={14} />
                <span>Eliminar</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && displayUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-8"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-6 right-6 w-12 h-12 bg-slate-900/80 backdrop-blur-xl/10 hover:bg-slate-900/80 backdrop-blur-xl/20 text-white rounded-2xl flex items-center justify-center transition-all"
          >
            <X size={24} />
          </button>
          <img
            src={displayUrl}
            alt={label}
            className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default FigmaPhotoUpload;
