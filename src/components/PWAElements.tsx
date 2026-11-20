import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar App (PWA)
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar no iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Instalar Farma360 no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Toque no ícone de <strong>Compartilhar</strong> na barra do Safari.<br />
                2. Role a lista e selecione <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-md bg-slate-900 dark:bg-blue-600 py-2 text-xs font-medium text-white hover:opacity-90"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-md">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Offline — Utilizando base farmacológica em cache local.</span>
    </div>
  );
};
