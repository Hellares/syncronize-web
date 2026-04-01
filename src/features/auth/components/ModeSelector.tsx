'use client';

import type { ModeOption, AvailableCompany } from '@/core/types/auth';
import { useState } from 'react';

interface Props {
  options: ModeOption[];
  message?: string;
  onSelect: (loginMode: string, subdominioEmpresa?: string) => void;
  isLoading: boolean;
}

export default function ModeSelector({ options, message, onSelect, isLoading }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<AvailableCompany | null>(null);
  const [expandedMode, setExpandedMode] = useState<string | null>(null);

  const handleSelect = (option: ModeOption) => {
    if (option.type === 'management' && option.availableCompanies?.length) {
      setExpandedMode(expandedMode === option.type ? null : option.type);
      return;
    }
    onSelect(option.type);
  };

  const handleCompanySelect = (company: AvailableCompany) => {
    setSelectedCompany(company);
    onSelect('management', company.subdominio);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">
          {message || '¿Cómo deseas ingresar?'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Selecciona el modo de acceso
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.type}>
            <button
              onClick={() => handleSelect(option)}
              disabled={isLoading}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                expandedMode === option.type
                  ? 'border-[#437EFF] bg-blue-50/50'
                  : 'border-gray-200 hover:border-[#437EFF]/30'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  option.type === 'marketplace'
                    ? 'bg-[#06b6d4]/10 text-[#06b6d4]'
                    : 'bg-[#004A94]/10 text-[#004A94]'
                }`}>
                  {option.type === 'marketplace' ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{option.label}</p>
                  {option.description && (
                    <p className="text-sm text-gray-500">{option.description}</p>
                  )}
                </div>
                {option.type === 'management' && option.availableCompanies?.length && (
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedMode === option.type ? 'rotate-180' : ''
                    }`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </button>

            {/* Company list */}
            {expandedMode === option.type && option.availableCompanies?.length && (
              <div className="mt-2 ml-4 space-y-2">
                {option.availableCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanySelect(company)}
                    disabled={isLoading}
                    className={`w-full rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                      selectedCompany?.id === company.id
                        ? 'border-[#437EFF] bg-blue-50'
                        : 'border-gray-100 hover:border-gray-300'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {company.logo ? (
                        <img src={company.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004A94]/10 text-xs font-bold text-[#004A94]">
                          {company.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{company.nombre}</p>
                        <p className="text-xs text-gray-500">{company.roles.join(', ')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#437EFF] border-t-transparent" />
        </div>
      )}
    </div>
  );
}
