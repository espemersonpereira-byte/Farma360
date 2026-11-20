import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  ExternalLink,
  ShieldAlert,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { SanitaryAlertRecord } from '../types/pharmacology.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  alerts: SanitaryAlertRecord[];
  onOpenFullAlertsPage: () => void;
}

interface PanelPosition {
  isMobile: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  width?: number;
  maxHeight: number;
}

export const NotificationsPortalPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  triggerRef,
  alerts,
  onOpenFullAlertsPage,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [position, setPosition] = useState<PanelPosition>({
    isMobile: false,
    top: 64,
    left: 16,
    width: 380,
    maxHeight: 480,
  });

  const computePosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;

    if (isMobile) {
      setPosition({
        isMobile: true,
        maxHeight: Math.floor(vh * 0.75),
      });
      return;
    }

    const desiredWidth = Math.min(390, vw - 24);
    const margin = 12;
    const triggerEl = triggerRef.current;

    if (!triggerEl) {
      setPosition({
        isMobile: false,
        top: 64,
        left: Math.max(margin, vw - desiredWidth - margin),
        width: desiredWidth,
        maxHeight: Math.min(520, vh - 88),
      });
      return;
    }

    const rect = triggerEl.getBoundingClientRect();

    // Horizontal alignment: align right edge with trigger if possible, otherwise shift left/right to stay 100% within [margin, vw - margin]
    let left = rect.right - desiredWidth;
    if (left + desiredWidth > vw - margin) {
      left = vw - desiredWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical alignment: prefer opening below the trigger button; if near bottom edge, open upward
    const gap = 8;
    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;

    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      const top = Math.max(margin, rect.bottom + gap);
      const maxHeight = Math.max(220, Math.min(520, vh - top - margin));
      setPosition({
        isMobile: false,
        top,
        left,
        width: desiredWidth,
        maxHeight,
      });
    } else {
      const bottom = Math.max(margin, vh - rect.top + gap);
      const maxHeight = Math.max(220, Math.min(520, rect.top - gap - margin));
      setPosition({
        isMobile: false,
        bottom,
        left,
        width: desiredWidth,
        maxHeight,
      });
    }
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    computePosition();

    const handleResizeOrScroll = () => {
      computePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, computePosition, onClose]);

  // Prevent background page scroll on mobile while panel is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    if (position.isMobile) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, position.isMobile]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const filteredAlerts =
    selectedType === 'Todos'
      ? alerts
      : alerts.filter((a) => a.alertType === selectedType);

  const alertTypes = [
    'Todos',
    ...Array.from(new Set(alerts.map((a) => a.alertType))),
  ];

  const panelContent = (
    <div
      className="fixed inset-0 z-[9998]"
      aria-modal="true"
      role="dialog"
      aria-label="Painel de Alertas Sanitários e Atualizações"
    >
      {/* Click-outside backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 transition-opacity ${
          position.isMobile
            ? 'bg-slate-900/45 backdrop-blur-[1px]'
            : 'bg-transparent'
        }`}
      />

      {/* Responsive Notification Container */}
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={
          position.isMobile
            ? {
                maxHeight: `${position.maxHeight}px`,
              }
            : {
                top: position.top !== undefined ? `${position.top}px` : undefined,
                bottom:
                  position.bottom !== undefined
                    ? `${position.bottom}px`
                    : undefined,
                left: `${position.left}px`,
                width: `${position.width}px`,
                maxHeight: `${position.maxHeight}px`,
              }
        }
        className={
          position.isMobile
            ? 'fixed left-3 right-3 bottom-3 z-[9999] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)]'
            : 'fixed z-[9999] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden'
        }
      >
        {/* Mobile grab handle */}
        {position.isMobile && (
          <div className="pt-2.5 pb-1 flex justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        )}

        {/* Sticky Header */}
        <div className="shrink-0 px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  Alertas Sanitários e Atualizações
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {alerts.length} comunicados oficiais com fonte documental
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel de notificações"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            {alertTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Independent Scrollable Notifications List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">
          {filteredAlerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhum alerta encontrado para o filtro selecionado.
            </div>
          ) : (
            filteredAlerts.map((al) => (
              <div
                key={al.id}
                className="p-4 text-xs space-y-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span>
                      {al.alertType} · {al.issuer}
                    </span>
                  </span>
                  <span className="font-mono text-slate-400 dark:text-slate-500">
                    {al.publishedDate}
                  </span>
                </div>

                <div className="font-bold text-slate-900 dark:text-white leading-snug">
                  {al.title}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <strong>Escopo:</strong> {al.affectedSubstanceOrProduct} ·{' '}
                  <span className="font-mono">{al.documentNumber}</span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  {al.summary}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Fonte Oficial</span>
                  </span>
                  <a
                    href={al.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Consultar documento</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullAlertsPage();
            }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Abrir central completa de alertas e diretrizes →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
};
