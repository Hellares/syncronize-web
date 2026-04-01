'use client';

import { useState } from 'react';

interface Props {
  title: string;
  subtitle: string;
  activeTab: 'activas' | 'disponibles';
  onTabChange: (tab: 'activas' | 'disponibles') => void;
  search: string;
  onSearchChange: (value: string) => void;
  onCreateCustom: () => void;
  isLoading: boolean;
  error: string | null;
  onDismissError: () => void;
  children: React.ReactNode;
  extraFilters?: React.ReactNode;
}

export default function CatalogoPage({
  title, subtitle, activeTab, onTabChange, search, onSearchChange,
  onCreateCustom, isLoading, error, onDismissError, children, extraFilters,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <button
          onClick={onCreateCustom}
          className="rounded-lg bg-[#004A94] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003570] transition-colors"
        >
          + Crear Personalizada
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={onDismissError} className="text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-[#437EFF] focus:ring-1 focus:ring-[#437EFF]/20"
          />
        </div>

        <div className="flex items-center gap-2">
          {extraFilters}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => onTabChange('activas')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'activas' ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => onTabChange('disponibles')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'disponibles' ? 'bg-white text-[#004A94] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Disponibles
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#437EFF] border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
