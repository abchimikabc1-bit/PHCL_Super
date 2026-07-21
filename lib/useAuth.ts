import { useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  piUsername?: string;
  createdAt: Date;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithPi: (piUsername: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'phcl_user';
const TOKEN_KEY = 'phcl_auth_token';

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.log('[v0] Error parsing stored user:', error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call - in production, call your backend
      if (!email || !password) throw new Error('Email and password required');
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        createdAt: new Date(),
      };

      const token = `token_${Date.now()}`;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, token);
      setUser(newUser);
      
      console.log('[v0] User logged in:', newUser);
    } catch (error) {
      console.log('[v0] Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      if (!email || !password || !name) throw new Error('All fields required');
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        createdAt: new Date(),
      };

      const token = `token_${Date.now()}`;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, token);
      setUser(newUser);
      
      console.log('[v0] User signed up:', newUser);
    } catch (error) {
      console.log('[v0] Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithPi = useCallback(async (piUsername: string) => {
    setIsLoading(true);
    try {
      if (!piUsername) throw new Error('Pi username required');
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: `${piUsername}@pi.network`,
        name: piUsername,
        piUsername,
        createdAt: new Date(),
      };

      const token = `pi_token_${Date.now()}`;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, token);
      setUser(newUser);
      
      console.log('[v0] User logged in with Pi Network:', newUser);
    } catch (error) {
      console.log('[v0] Pi login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    console.log('[v0] User logged out');
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    loginWithPi,
    logout,
  };
};
