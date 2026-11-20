import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

interface Props {
  authReady: boolean;
}

export const Farma360SplashScreen: React.FC<Props> = ({ authReady }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const alreadyShown = window.sessionStorage.getItem('farma360_session_splash_v2');
      return !alreadyShown;
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const minTimer = setTimeout(() => {
      setFadingOut(true);
      try {
        window.sessionStorage.setItem('farma360_session_splash_v2', '1');
      } catch {
        // Ignore sessionStorage restrictions
      }
      setTimeout(() => {
        setVisible(false);
      }, 260);
    }, authReady ? 650 : 950);

    return () => clearTimeout(minTimer);
  }, [visible, authReady]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Iniciando FARMA360"
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-gradient-to-b from-[#F8FAFC] to-white dark:from-slate-950 dark:to-slate-900 px-6 py-10 transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div />

      {/* Central Official Emblem & Brand Identity */}
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md border border-blue-500/20">
          <svg
            className="w-9 h-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16M4 12h16" />
            <circle cx="12" cy="12" r="9" strokeOpacity="0.35" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            FARMA360
          </div>
          <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            Plataforma Brasileira de Informação Farmacológica
          </div>
        </div>

        {/* Subtle loading indicator */}
        <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Inicializando catálogo e módulos científicos...</span>
        </div>

        {isOffline && (
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Modo contingência offline ativo — carregando base local em cache.</span>
          </div>
        )}
      </div>

      {/* Footer note + Skip button so user is never trapped */}
      <div className="flex flex-col items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <span>Uso Profissional em Saúde · Brasil</span>
        <button
          type="button"
          onClick={() => {
            try {
              window.sessionStorage.setItem('farma360_session_splash_v2', '1');
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Entrar imediatamente →
        </button>
      </div>
    </div>
  );
};
