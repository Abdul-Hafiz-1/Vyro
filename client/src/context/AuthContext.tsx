import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserCapabilities, WorkspaceType } from '../types';
import { api } from '../api/client';
import { toast } from 'sonner';

export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  activeWorkspace: WorkspaceType;
  isBuyerWorkspace: boolean;
  isSellerWorkspace: boolean;
  hasBuyerCapability: boolean;
  hasSellerCapability: boolean;
  login: (email: string, password?: string) => Promise<User>;
  register: (payload: { email: string; password?: string; displayName: string; username?: string; capabilities?: UserCapabilities }) => Promise<User>;
  updateCapabilities: (capabilities: UserCapabilities) => Promise<User>;
  switchWorkspace: (workspace: WorkspaceType) => Promise<User>;
  updateOnboarding: (payload: any) => Promise<User>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const currentUser = await api.getMe();
      setUser(currentUser);
    } catch (err: any) {
      // 401 when not logged in is normal
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const loggedIn = await api.login(email, password);
      setUser(loggedIn);
      toast.success(`Signed in as ${loggedIn.displayName}`);
      return loggedIn;
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    email: string;
    password?: string;
    displayName: string;
    username?: string;
    capabilities?: UserCapabilities;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await api.register(payload);
      setUser(newUser);
      toast.success(`Account created: ${newUser.displayName}`);
      return newUser;
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCapabilities = async (capabilities: UserCapabilities): Promise<User> => {
    try {
      const updated = await api.updateCapabilities(capabilities);
      setUser(updated);
      toast.success('Capabilities updated');
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update capabilities');
      throw err;
    }
  };

  const switchWorkspace = async (workspace: WorkspaceType): Promise<User> => {
    try {
      const targetWorkspace = workspace === 'seller' ? 'seller' : 'buyer';
      if (user) {
        setUser({ ...user, activeWorkspace: targetWorkspace });
      }
      const updated = await api.updateWorkspace(targetWorkspace);
      setUser(updated);
      const label = targetWorkspace === 'seller' ? 'Selling Workspace' : 'Buying Workspace';
      toast.info(`Switched to ${label}`);
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch workspace');
      throw err;
    }
  };

  const updateOnboarding = async (payload: any): Promise<User> => {
    try {
      const updated = await api.updateOnboarding(payload);
      setUser(updated);
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Failed to update onboarding');
      throw err;
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchCurrentUser();
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    }
    setUser(null);
    window.location.href = '/login';
  };

  const activeWorkspace: WorkspaceType = (user?.activeWorkspace === 'seller' ? 'seller' : 'buyer');
  const isBuyerWorkspace = activeWorkspace === 'buyer';
  const isSellerWorkspace = activeWorkspace === 'seller';
  const hasBuyerCapability = user?.capabilities?.buying ?? true;
  const hasSellerCapability = user?.capabilities?.selling ?? true;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeWorkspace,
        isBuyerWorkspace,
        isSellerWorkspace,
        hasBuyerCapability,
        hasSellerCapability,
        login,
        register,
        updateCapabilities,
        switchWorkspace,
        updateOnboarding,
        refreshUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
