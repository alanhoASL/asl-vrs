import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ACCOUNTS } from '../data/catalog';
import { recordSession } from '../data/store';
import type { Account } from '../data/types';

const SESSION_KEY = 'asl-vrs-prototype-session';

interface AuthValue {
  account: Account | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): Account | null {
  const id = localStorage.getItem(SESSION_KEY);
  return ACCOUNTS.find((a) => a.id === id) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(readSession);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setAccount(readSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const match = ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password);
    if (!match) return false;
    localStorage.setItem(SESSION_KEY, match.id);
    setAccount(match);
    recordSession(match, 'Sign in');
    return true;
  }, []);

  const logout = useCallback(() => {
    if (account) recordSession(account, 'Sign out');
    localStorage.removeItem(SESSION_KEY);
    setAccount(null);
  }, [account]);

  const value = useMemo(() => ({ account, login, logout }), [account, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** For portal pages, which are only rendered behind RequireAuth. */
export function useAccount(): Account {
  const { account } = useAuth();
  if (!account) throw new Error('useAccount used without a signed-in account');
  return account;
}
