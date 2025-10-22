"use client";
import React from 'react';
import { ToastProvider } from './lib/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

