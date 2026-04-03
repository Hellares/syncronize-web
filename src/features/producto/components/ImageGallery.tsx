'use client';

import { useState } from 'react';
import type { ProductoArchivo } from '@/core/types/producto';

interface Props {
  archivos?: ProductoArchivo[];
  imagenes?: string[];
  videoUrl?: string;
  alt?: string;
}

export default function ImageGallery({ archivos, imagenes, videoUrl, alt = 'Producto' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Build image list
  const images: Array<{ url: string; thumbnail?: string }> = [];
  if (archivos?.length) {
    archivos.forEach(a => { if (a.url) images.push({ url: a.url, thumbnail: a.urlThumbnail }); });
  } else if (imagenes?.length) {
    imagenes.forEach(url => images.push({ url }));
  }

  if (images.length === 0 && !videoUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const totalSlides = images.length + (videoUrl ? 1 : 0);
  const isVideoSlide = videoUrl && currentIndex === images.length;

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Main image/video */}
        <div className="relative bg-gray-50 cursor-pointer" onClick={() => !isVideoSlide && setFullscreen(true)}>
          {isVideoSlide ? (
            <div className="flex h-72 items-center justify-center bg-black">
              <iframe
                src={getEmbedUrl(videoUrl!)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : images[currentIndex] ? (
            <img
              src={images[currentIndex].url}
              alt={`${alt} ${currentIndex + 1}`}
              className="mx-auto h-72 object-contain"
            />
          ) : null}
        </div>

        {/* Navigation dots */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all ${
                  i === currentIndex
                    ? 'h-2 w-5 bg-[#437EFF]'
                    : 'h-2 w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-gray-100 px-3 py-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                  i === currentIndex ? 'border-[#437EFF]' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img.thumbnail || img.url} alt="" className="h-12 w-12 object-cover" />
              </button>
            ))}
            {videoUrl && (
              <button
                onClick={() => setCurrentIndex(images.length)}
                className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-lg border-2 bg-gray-100 ${
                  currentIndex === images.length ? 'border-[#437EFF]' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && images[currentIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30" onClick={() => setFullscreen(false)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={images[currentIndex].url} alt={alt} className="max-h-[90vh] max-w-[90vw] object-contain" onClick={e => e.stopPropagation()} />
          {totalSlides > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => (i - 1 + totalSlides) % totalSlides); }}
                className="absolute left-4 rounded-full bg-white/20 p-3 text-white hover:bg-white/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => (i + 1) % totalSlides); }}
                className="absolute right-4 rounded-full bg-white/20 p-3 text-white hover:bg-white/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1`;
  return url;
}
