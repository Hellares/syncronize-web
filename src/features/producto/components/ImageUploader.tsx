'use client';

import { useState, useRef, useCallback } from 'react';
import * as storageService from '@/features/storage/services/storage-service';
import type { ArchivoResponse } from '@/features/storage/services/storage-service';

interface ImageItem {
  id: string;
  url: string;
  urlThumbnail?: string;
  isLocal?: boolean;
  isUploading?: boolean;
  progress?: number;
  error?: string;
  file?: File;
}

interface InitialImage {
  id: string;
  url: string;
  urlThumbnail?: string;
}

interface Props {
  empresaId: string;
  productoId?: string;
  initialImages?: InitialImage[];
  maxImages?: number;
  onChange?: (images: ArchivoResponse[]) => void;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function ImageUploader({ empresaId, productoId, initialImages = [], maxImages = 10, onChange }: Props) {
  const [images, setImages] = useState<ImageItem[]>(
    initialImages.map((img) => ({ id: img.id, url: img.url, urlThumbnail: img.urlThumbnail }))
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateImage = useCallback((id: string, updates: Partial<ImageItem>) => {
    setImages((prev) => prev.map((img) => img.id === id ? { ...img, ...updates } : img));
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError('La imagen no debe superar los 10MB');
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const localUrl = URL.createObjectURL(file);

    const newImage: ImageItem = {
      id: tempId,
      url: localUrl,
      isLocal: true,
      isUploading: true,
      progress: 0,
      file,
    };

    setImages((prev) => [...prev, newImage]);
    setError(null);

    try {
      const result = await storageService.uploadFile({
        file,
        empresaId,
        entidadTipo: 'PRODUCTO',
        entidadId: productoId,
        categoria: 'GALERIA',
        onProgress: (progress) => updateImage(tempId, { progress }),
      });

      URL.revokeObjectURL(localUrl);
      setImages((prev) => {
        const updated = prev.map((img) =>
          img.id === tempId
            ? { id: result.id, url: result.url, urlThumbnail: result.urlThumbnail, isLocal: false, isUploading: false }
            : img
        );
        onChange?.(updated.filter((i) => !i.isLocal && !i.isUploading).map((i) => ({
          id: i.id, url: i.url, urlThumbnail: i.urlThumbnail,
          empresaId, nombreOriginal: '', tipoArchivo: 'IMAGEN', mimeType: '', extension: '', tamanoBytes: 0, creadoEn: '',
        })));
        return updated;
      });
    } catch {
      updateImage(tempId, { isUploading: false, error: 'Error al subir imagen' });
    }
  }, [empresaId, productoId, updateImage, onChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxImages - images.length;

    if (remaining <= 0) {
      setError(`Máximo ${maxImages} imágenes`);
      return;
    }

    files.slice(0, remaining).forEach(handleUpload);
    if (inputRef.current) inputRef.current.value = '';
  }, [images.length, maxImages, handleUpload]);

  const handleDelete = useCallback(async (imageId: string) => {
    const image = images.find((i) => i.id === imageId);
    if (!image) return;

    if (image.isLocal) {
      if (image.url) URL.revokeObjectURL(image.url);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      return;
    }

    try {
      await storageService.deleteFile(imageId, empresaId);
      setImages((prev) => {
        const updated = prev.filter((i) => i.id !== imageId);
        onChange?.(updated.filter((i) => !i.isLocal).map((i) => ({
          id: i.id, url: i.url, urlThumbnail: i.urlThumbnail,
          empresaId, nombreOriginal: '', tipoArchivo: 'IMAGEN', mimeType: '', extension: '', tamanoBytes: 0, creadoEn: '',
        })));
        return updated;
      });
    } catch {
      setError('Error al eliminar imagen');
    }
  }, [images, empresaId, onChange]);

  const handleRetry = useCallback((imageId: string) => {
    const image = images.find((i) => i.id === imageId);
    if (!image?.file) return;
    setImages((prev) => prev.filter((i) => i.id !== imageId));
    handleUpload(image.file);
  }, [images, handleUpload]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Image grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((image) => (
          <div key={image.id} className="group relative aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            <img
              src={image.urlThumbnail || image.url}
              alt=""
              className={`h-full w-full object-cover ${image.isUploading ? 'opacity-50' : ''}`}
            />

            {/* Upload progress */}
            {image.isUploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                {image.progress != null && (
                  <span className="mt-1.5 text-xs font-medium text-white">{image.progress}%</span>
                )}
              </div>
            )}

            {/* Error overlay */}
            {image.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500/80">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <button onClick={() => handleRetry(image.id)} className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-white/30">
                  Reintentar
                </button>
              </div>
            )}

            {/* Delete button */}
            {!image.isUploading && !image.error && (
              <button
                onClick={() => handleDelete(image.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Add button */}
        {images.length < maxImages && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#437EFF] hover:bg-[#437EFF]/[0.03]"
          >
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-[10px] font-medium text-gray-400">Agregar</span>
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        {images.length}/{maxImages} imágenes · JPG, PNG, WebP · Máx 10MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
