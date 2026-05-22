'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMateriaStore, useSystemStore } from '@/lib/agnostic/store';
import { SYSTEM_NS } from '@/lib/agnostic/constants';
import { EmailPasswordStrategy } from '@/lib/agnostic/auth/EmailPasswordStrategy';
import type { AuthStrategy } from '@/lib/agnostic/auth/AuthStrategy';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  metadata?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { data } = useMateriaStore();
  const { setUser: syncUserToStore } = useSystemStore();

  // Swappable auth strategy — replace with GoogleOAuthStrategy etc. without touching this file
  const strategy: AuthStrategy = new EmailPasswordStrategy(
    () => data?.[SYSTEM_NS.USERS] || []
  );

  // Sync user identity to global system store
  useEffect(() => {
    syncUserToStore(user);
  }, [user, syncUserToStore]);

  useEffect(() => {
    const savedUser = localStorage.getItem('agnostic_session');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUserState(u);
      } catch (e) {
        localStorage.removeItem('agnostic_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    const authUser = await strategy.authenticate({ email, password: pass });
    if (!authUser) return false;
    setUserState(authUser as User);
    localStorage.setItem('agnostic_session', JSON.stringify(authUser));
    return true;
  }, [strategy]);

  const logout = useCallback(() => {
    setUserState(null);
    localStorage.removeItem('agnostic_session');
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
