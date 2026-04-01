import LoginForm from '@/features/auth/components/LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión — Syncronize',
  description: 'Inicia sesión en tu cuenta de Syncronize para gestionar tu negocio.',
};

export default function LoginPage() {
  return <LoginForm />;
}
