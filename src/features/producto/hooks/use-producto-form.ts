'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateProductoDto, UpdateProductoDto, Producto } from '@/core/types/producto';
import * as productoService from '../services/producto-service';
import { AxiosError } from 'axios';

interface FormState {
  nombre: string;
  descripcion: string;
  sku: string;
  codigoBarras: string;
  peso: string;
  videoUrl: string;
  impuestoPorcentaje: string;
  descuentoMaximo: string;
  visibleMarketplace: boolean;
  destacado: boolean;
  tieneVariantes: boolean;
  esCombo: boolean;
  tipoPrecioCombo: string;
  empresaCategoriaId: string;
  empresaMarcaId: string;
  unidadMedidaId: string;
  sedesIds: string[];
  dimensiones: Record<string, number> | null;
  atributos: Record<string, string>;
  configuracionPrecioId: string;
}

const INITIAL_STATE: FormState = {
  nombre: '',
  descripcion: '',
  sku: '',
  codigoBarras: '',
  peso: '',
  videoUrl: '',
  impuestoPorcentaje: '',
  descuentoMaximo: '',
  visibleMarketplace: true,
  destacado: false,
  tieneVariantes: false,
  esCombo: false,
  tipoPrecioCombo: 'FIJO',
  empresaCategoriaId: '',
  empresaMarcaId: '',
  unidadMedidaId: '',
  sedesIds: [],
  dimensiones: null,
  atributos: {},
  configuracionPrecioId: '',
};

export function useProductoForm(empresaId: string, producto?: Producto | null) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(() => {
    if (!producto) return INITIAL_STATE;
    return {
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      sku: producto.sku || '',
      codigoBarras: producto.codigoBarras || '',
      peso: producto.peso?.toString() || '',
      videoUrl: producto.videoUrl || '',
      impuestoPorcentaje: producto.impuestoPorcentaje?.toString() || '',
      descuentoMaximo: producto.descuentoMaximo?.toString() || '',
      visibleMarketplace: producto.visibleMarketplace ?? true,
      destacado: producto.destacado ?? false,
      tieneVariantes: producto.tieneVariantes ?? false,
      esCombo: producto.esCombo ?? false,
      tipoPrecioCombo: producto.tipoPrecioCombo || 'FIJO',
      empresaCategoriaId: producto.categoria?.id || '',
      empresaMarcaId: producto.marca?.id || '',
      unidadMedidaId: producto.unidadMedida?.id || '',
      sedesIds: producto.stocksPorSede?.map((s) => s.sedeId) || [],
      dimensiones: producto.dimensiones || null,
      configuracionPrecioId: producto.configuracionPrecioId || '',
      atributos: (() => {
        const map: Record<string, string> = {};
        producto.atributosValores?.forEach(av => { map[av.atributoId] = av.valor; });
        return map;
      })(),
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const buildDto = useCallback((): CreateProductoDto | UpdateProductoDto => {
    const dto: CreateProductoDto = {
      empresaId,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      sku: form.sku.trim() || undefined,
      codigoBarras: form.codigoBarras.trim() || undefined,
      peso: form.peso ? parseFloat(form.peso) : undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      impuestoPorcentaje: form.impuestoPorcentaje ? parseFloat(form.impuestoPorcentaje) : undefined,
      descuentoMaximo: form.descuentoMaximo ? parseFloat(form.descuentoMaximo) : undefined,
      visibleMarketplace: form.visibleMarketplace,
      destacado: form.destacado,
      tieneVariantes: form.tieneVariantes,
      esCombo: form.esCombo,
      tipoPrecioCombo: form.esCombo ? (form.tipoPrecioCombo as CreateProductoDto['tipoPrecioCombo']) : undefined,
      empresaCategoriaId: form.empresaCategoriaId || undefined,
      empresaMarcaId: form.empresaMarcaId || undefined,
      unidadMedidaId: form.unidadMedidaId || undefined,
      sedesIds: form.sedesIds.length > 0 ? form.sedesIds : undefined,
      dimensiones: form.dimensiones && Object.values(form.dimensiones).some(v => v) ? form.dimensiones : undefined,
      configuracionPrecioId: form.configuracionPrecioId || undefined,
      atributosEstructurados: (() => {
        const entries = Object.entries(form.atributos).filter(([, v]) => v.trim());
        return entries.length > 0 ? entries.map(([atributoId, valor]) => ({ atributoId, valor: valor.trim() })) : undefined;
      })(),
    };
    return dto;
  }, [form, empresaId]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dto = buildDto();
      if (producto) {
        const { empresaId: _, sedesIds: __, ...updateDto } = dto as CreateProductoDto;
        await productoService.updateProducto(producto.id, updateDto);
      } else {
        await productoService.createProducto(dto as CreateProductoDto);
      }
      router.push('/dashboard/productos');
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : undefined;
      setError(msg || 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, buildDto, producto, router]);

  return {
    form,
    updateField,
    isSubmitting,
    error,
    errors,
    handleSubmit,
    isEditing: !!producto,
  };
}
