'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useEmpresa } from '@/features/empresa/context/empresa-context';
import * as productoService from '@/features/producto/services/producto-service';

type Step = 1 | 2 | 3;

interface UploadResult {
  totalFilas: number;
  creados: number;
  errores: number;
  detalleErrores: Array<{ fila: number; columna: string; valor?: string; mensaje: string }>;
  productosCreados: Array<{ id: string; nombre: string; codigoEmpresa: string }>;
}

const STEPS = ['Archivo', 'Subir', 'Resultado'];

export default function BulkUploadPage() {
  const { sedes } = useEmpresa();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedSedes, setSelectedSedes] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await productoService.downloadBulkTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_productos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Error al descargar la plantilla');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setStep(2);
    setIsUploading(true);
    setError(null);
    try {
      const res = await productoService.uploadBulkFile(file, selectedSedes.length > 0 ? selectedSedes : undefined);
      setResult(res);
      setStep(3);
    } catch {
      setError('Error al subir el archivo');
      setStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setResult(null); setError(null); setSelectedSedes([]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/dashboard/productos" className="text-sm text-gray-500 hover:text-[#437EFF]">&larr; Productos</Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Carga Masiva de Productos</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-[#004A94] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-px w-12 ${step > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: File Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Instrucciones</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700">
              <li>Descarga la plantilla Excel con el formato correcto</li>
              <li>Llena los datos de tus productos (nombre es obligatorio)</li>
              <li>Selecciona el archivo y las sedes donde crear los productos</li>
              <li>Sube el archivo y revisa los resultados</li>
            </ol>
            <button onClick={handleDownloadTemplate} disabled={isDownloading}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isDownloading ? 'Descargando...' : 'Descargar Plantilla Excel'}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Seleccionar Archivo</h3>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-8 text-center hover:border-[#437EFF] hover:bg-[#437EFF]/5 transition-colors">
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Click para seleccionar archivo Excel</p>
                </div>
              )}
            </button>
          </div>

          {/* Sedes */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Sedes (opcional)</h3>
            <p className="text-xs text-gray-500 mb-3">Selecciona las sedes donde se creará stock para los productos</p>
            <div className="space-y-2">
              {sedes.filter(s => s.isActive).map(sede => (
                <label key={sede.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedSedes.includes(sede.id)}
                    onChange={e => setSelectedSedes(e.target.checked ? [...selectedSedes, sede.id] : selectedSedes.filter(id => id !== sede.id))}
                    className="rounded border-gray-300 text-[#437EFF] focus:ring-[#437EFF]" />
                  {sede.nombre}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleUpload} disabled={!file}
              className="rounded-lg bg-[#004A94] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#003570] disabled:opacity-50">
              Subir Archivo
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Uploading */}
      {step === 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#437EFF]" />
          <p className="mt-4 text-sm font-medium text-gray-900">Procesando archivo...</p>
          <p className="text-xs text-gray-500">{file?.name}</p>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{result.totalFilas}</p>
              <p className="text-xs text-gray-500">Filas Procesadas</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.creados}</p>
              <p className="text-xs text-green-600">Creados</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${result.errores > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className={`text-2xl font-bold ${result.errores > 0 ? 'text-red-600' : 'text-gray-900'}`}>{result.errores}</p>
              <p className={`text-xs ${result.errores > 0 ? 'text-red-600' : 'text-gray-500'}`}>Errores</p>
            </div>
          </div>

          {/* Error Details */}
          {result.detalleErrores.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
              <div className="bg-red-50 px-5 py-3 border-b border-red-200">
                <h3 className="text-sm font-semibold text-red-900">Detalle de Errores ({result.detalleErrores.length})</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-medium uppercase text-gray-500">
                      <th className="px-4 py-2">Fila</th>
                      <th className="px-4 py-2">Columna</th>
                      <th className="px-4 py-2">Valor</th>
                      <th className="px-4 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detalleErrores.map((err, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-900 font-mono">{err.fila}</td>
                        <td className="px-4 py-2 text-gray-600">{err.columna}</td>
                        <td className="px-4 py-2 text-gray-500 truncate max-w-[100px]">{err.valor || '-'}</td>
                        <td className="px-4 py-2 text-red-600 text-xs">{err.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Created Products */}
          {result.productosCreados.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-white overflow-hidden">
              <div className="bg-green-50 px-5 py-3 border-b border-green-200">
                <h3 className="text-sm font-semibold text-green-900">Productos Creados ({result.productosCreados.length})</h3>
              </div>
              <div className="max-h-48 overflow-y-auto p-3 space-y-1">
                {result.productosCreados.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                    <span className="font-medium text-gray-900">{p.nombre}</span>
                    <span className="text-gray-500 font-mono">{p.codigoEmpresa}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={reset} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Subir Otro Archivo
            </button>
            <Link href="/dashboard/productos" className="rounded-lg bg-[#004A94] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003570]">
              Ir a Productos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
