import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Farma360:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold">Exceção de Segurança ou Integridade Detectada</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              O sistema interrompeu a operação para proteger a integridade dos dados farmacológicos.
            </p>
            <pre className="text-xs font-mono bg-slate-100 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto text-slate-700 dark:text-slate-300 mb-4">
              {this.state.errorMessage}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recarregar Plataforma
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
