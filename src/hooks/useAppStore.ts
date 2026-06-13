import { useState, useCallback } from 'react';
import type { Page, User } from '../types';
import { demoUser } from '../data/mockData';

export function useAppStore() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [user, setUser] = useState<User | null>(null);

  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
  }, []);

  const login = useCallback(() => {
    setUser(demoUser);
    setCurrentPage('dashboard');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCurrentPage('landing');
  }, []);

  return { currentPage, user, navigate, login, logout };
}
