"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface UserContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (name: string, email: string, phone?: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("phcl_user");
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (name: string, email: string, phone?: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      phone,
    };
    setUser(newUser);
    setIsLoggedIn(true);
    localStorage.setItem("phcl_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("phcl_user");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("phcl_user", JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
