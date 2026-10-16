import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import type { Role } from '../data/types';

interface Props {
  children: ReactNode;
  role?: Role;
}

export function RequireAuth({ children, role }: Props) {
  const { account } = useAuth();
  const location = useLocation();

  if (!account) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && account.role !== role) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}
