export interface User {
  id: string;
  email?: string;
  dni?: string;
  nombres: string;
  apellidos: string;
  emailVerificado: boolean;
  telefonoVerificado?: boolean;
  telefono?: string;
  direccion?: string;
  rolGlobal?: string;
  photoUrl?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metodoPrincipalLogin?: string;
  requiereCambioPassword?: boolean;
  perfilCompleto?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  role: string;
  availableRoles?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface AvailableCompany {
  id: string;
  nombre: string;
  subdominio: string;
  logo?: string;
  roles: string[];
}

export interface ModeOption {
  type: 'marketplace' | 'management';
  label: string;
  description?: string;
  availableCompanies?: AvailableCompany[];
}

export interface AuthResponse {
  user: User;
  tenant?: Tenant;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  sessionId?: string;
  mode?: string;
  requiresSelection?: boolean;
  message?: string;
  options?: ModeOption[];
}

export interface AuthMethodsResponse {
  email: string;
  exists: boolean;
  methods: string[];
  authMethodsCount?: number;
}

export interface LoginRequest {
  credencial: string;
  password: string;
  subdominioEmpresa?: string;
  loginMode?: string;
}

export interface GoogleAuthRequest {
  idToken: string;
  subdominioEmpresa?: string;
  loginMode?: string;
}

export type AuthState =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'authenticated'; user: User; tenant: Tenant | null }
  | { status: 'unauthenticated' }
  | { status: 'mode-selection'; user: User; options: ModeOption[]; tokens?: AuthTokens };
