'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { EmpresaContext, EmpresaPermissions, EmpresaInfo, Sede, EmpresaStatistics, UserRoleInfo } from '@/core/types/empresa';
import * as tokenService from '@/core/auth/token-service';
import * as empresaService from '@/features/empresa/services/empresa-service';

type EmpresaState =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'loaded'; context: EmpresaContext }
  | { status: 'error'; message: string };

type EmpresaAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_LOADED'; context: EmpresaContext }
  | { type: 'SET_ERROR'; message: string };

function empresaReducer(_state: EmpresaState, action: EmpresaAction): EmpresaState {
  switch (action.type) {
    case 'SET_LOADING':
      return { status: 'loading' };
    case 'SET_LOADED':
      return { status: 'loaded', context: action.context };
    case 'SET_ERROR':
      return { status: 'error', message: action.message };
  }
}

interface EmpresaContextType {
  state: EmpresaState;
  permissions: EmpresaPermissions | null;
  empresa: EmpresaInfo | null;
  sedes: Sede[];
  statistics: EmpresaStatistics | null;
  userRoles: UserRoleInfo[];
  reload: () => Promise<void>;
}

const DEFAULT_PERMISSIONS: EmpresaPermissions = {
  canViewUsers: false, canManageUsers: false,
  canViewProducts: false, canManageProducts: false,
  canViewServices: false, canManageServices: false,
  canViewClients: false, canManageClients: false,
  canViewDiscounts: false, canManageDiscounts: false, canAssignDiscounts: false,
  canViewCotizaciones: false, canManageCotizaciones: false,
  canViewVentas: false, canManageVentas: false,
  canViewDevoluciones: false, canManageDevoluciones: false,
  canViewProveedores: false, canManageProveedores: false,
  canViewCompras: false, canManageCompras: false, canApproveOrdenesCompra: false,
  canViewCaja: false, canManageCaja: false,
  canManageSedes: false, canViewReports: false, canManageInvoices: false,
  canManageOrders: false, canViewStatistics: false, canManageSettings: false,
  canManagePaymentMethods: false, canChangePlan: false,
  canViewEmpleados: false, canManageEmpleados: false,
  canViewAsistencia: false, canManageAsistencia: false,
  canViewPlanilla: false, canManagePlanilla: false,
  canApproveIncidencias: false, canApprovePlanilla: false,
  canViewReportesIncidencia: false, canManageReportesIncidencia: false,
};

const EmpresaCtx = createContext<EmpresaContextType | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(empresaReducer, { status: 'initial' });

  const loadContext = useCallback(async () => {
    const tenantId = tokenService.getTenantId();
    if (!tenantId) {
      dispatch({ type: 'SET_ERROR', message: 'No hay empresa seleccionada' });
      return;
    }

    dispatch({ type: 'SET_LOADING' });

    try {
      const context = await empresaService.getEmpresaContext(tenantId);
      dispatch({ type: 'SET_LOADED', context });
    } catch {
      dispatch({ type: 'SET_ERROR', message: 'Error al cargar datos de la empresa' });
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const permissions = state.status === 'loaded' ? state.context.permissions : null;
  const empresa = state.status === 'loaded' ? state.context.empresa : null;
  const sedes = state.status === 'loaded' ? state.context.sedes : [];
  const statistics = state.status === 'loaded' ? state.context.statistics : null;
  const userRoles = state.status === 'loaded' ? state.context.userRoles : [];

  return (
    <EmpresaCtx.Provider value={{ state, permissions, empresa, sedes, statistics, userRoles, reload: loadContext }}>
      {children}
    </EmpresaCtx.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaCtx);
  if (!context) {
    throw new Error('useEmpresa must be used within EmpresaProvider');
  }
  return context;
}

export function usePermissions(): EmpresaPermissions {
  const { permissions } = useEmpresa();
  return permissions || DEFAULT_PERMISSIONS;
}
