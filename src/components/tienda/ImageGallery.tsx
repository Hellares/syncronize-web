'use client';

import { useState } from 'react';
import { TiendaColors, DEFAULT_COLORS } from '@/lib/colors';
import { detectVideoType, getYoutubeEmbedUrl, getVimeoEmbedUrl } from '@/lib/video';

interface MediaItem {
  id: string;
  url: string;
  thumbnail?: string;
  type: 'image' | 'video';
}

interface Props {
  imagenes: { id: string; url: string; thumbnail?: string }[];
  nombre: string;
  colors?: TiendaColors;
  videoUrl?: string;
}

export function ImageGallery({ imagenes, nombre, colors = DEFAULT_COLORS, videoUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Construir array de media: video primero, luego imágenes
  const media: MediaItem[] = [];
  if (videoUrl) {
    media.push({ id: 'video-main', url: videoUrl, type: 'video' });
  }
  imagenes.forEach((img) => {
    media.push({ id: img.id, url: img.url, thumbnail: img.thumbnail, type: 'image' });
  });

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md aspect-square flex items-center justify-center text-gray-300">
        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const totalItems = media.length;
  const current = media[activeIndex];

  return (
    <div className="space-y-3">
      {/* Media principal */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden aspect-square relative group">
        {current.type === 'video' ? (
          <VideoPlayer url={current.url} />
        ) : (
          <img
            src={current.url}
            alt={nombre}
            className="w-full h-full object-contain transition-opacity duration-300"
          />
        )}

        {/* Flechas */}
        {totalItems > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setActiveIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicadores */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {media.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-4' : 'w-2 bg-gray-300'}`}
                  style={i === activeIndex ? { backgroundColor: colors.primario } : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {totalItems > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {media.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all border-2 ${
                i === activeIndex
                  ? 'shadow-sm'
                  : 'border-transparent opacity-50 hover:opacity-80 hover:border-gray-300'
              }`}
              style={i === activeIndex ? { borderColor: colors.primario } : undefined}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : (
                <img src={item.thumbnail || item.url} alt="" className="w-full h-full object-cover rounded-md" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renderiza el video según su tipo */
function VideoPlayer({ url }: { url: string }) {
  const type = detectVideoType(url);

  if (type === 'youtube') {
    const embedUrl = getYoutubeEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      );
    }
  }

  if (type === 'vimeo') {
    const embedUrl = getVimeoEmbedUrl(url);
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      );
    }
  }

  if (type === 'direct') {
    return (
      <video
        src={url}
        controls
        playsInline
        className="w-full h-full object-contain bg-black"
        preload="metadata"
      />
    );
  }

  // Facebook, TikTok, u otros — iframe genérico
  return (
    <iframe
      src={url}
      className="w-full h-full"
      allowFullScreen
      title="Video"
    />
  );
}
