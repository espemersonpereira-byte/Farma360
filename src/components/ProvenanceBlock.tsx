import React, { useState } from 'react';
import { ExternalLink, FileCheck2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { ProvenanceMetadata, ContentValidationStatus } from '../types/pharmacology.ts';

interface Props {
  provenance: ProvenanceMetadata;
  compact?: boolean;
}

export const REVIEW_STATUS_META: Record<
  ContentValidationStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  aprovado_publicacao: {
    label: 'Aprovado para publicação',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  verificado_documentalmente: {
    label: 'Verificado documentalmente',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-600',
  },
  em_revisao: {
    label: 'Em revisão científica',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  pendente_conferencia: {
    label: 'Pendente de conferência',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  importado: {
    label: 'Importado de base oficial',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-500',
  },
  desatualizado: {
    label: 'Desatualizado — Revisão necessária',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-600',
  },
  rejeitado: {
    label: 'Rejeitado na auditoria',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotClass: 'bg-rose-700',
  },
};

export const ProvenanceBlock: React.FC<Props> = ({ provenance, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);
  const statusInfo = REVIEW_STATUS_META[provenance.reviewStatus] || {
    label: provenance.reviewStatus,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
  };

  if (compact && !expanded) {
    return (
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${statusInfo.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>
          <span className="text-slate-600 font-medium">{provenance.institution}</span>
          <span aria-hidden="true">·</span>
          <span>{provenance.documentTitle}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-600">{provenance.sectionOrigin}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>Ver trecho e rastreabilidade</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-slate-50/90 border border-slate-200/90 rounded-lg p-4 text-xs text-slate-600">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-900 text-xs">
            Proveniência e Rastreabilidade Documental
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-medium ${statusInfo.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            {statusInfo.label}
          </span>
          {compact && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
              title="Recolher proveniência"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {provenance.supportingExcerpt && (
        <div className="mb-3 p-3 bg-white border-l-2 border-l-blue-600 border border-slate-200/80 rounded-r-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Trecho Documental de Suporte ({provenance.sectionOrigin})
          </div>
          <p className="text-slate-700 italic leading-relaxed">
            “{provenance.supportingExcerpt}”
          </p>
        </div>
      )}

      {provenance.divergenceNote && (
        <div className="mb-3 p-3 bg-amber-50/80 border border-amber-200 rounded-md flex items-start gap-2 text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Nota de Divergência entre Fontes: </span>
            <span>{provenance.divergenceNote}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Fonte & Instituição
          </div>
          <div className="font-medium text-slate-900 mt-0.5">{provenance.documentTitle}</div>
          <div className="text-slate-500 mt-0.5">
            {provenance.institution} ({provenance.sourceName})
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Seção & Método
          </div>
          <div className="font-medium text-slate-900 mt-0.5">{provenance.sectionOrigin}</div>
          <div className="text-slate-500 mt-0.5">{provenance.extractionMethod}</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">
            Identificador & Datas
          </div>
          <div className="font-mono text-slate-900 mt-0.5">
            {provenance.externalIdentifier} · {provenance.version}
          </div>
          <div className="font-mono text-slate-500 mt-0.5">
            Publicação: {provenance.publishedDate} · Consulta: {provenance.retrievedDate}
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">
              Responsável pela Revisão
            </div>
            <div className="font-medium text-slate-900 mt-0.5">{provenance.reviewedBy}</div>
          </div>
          <a
            href={provenance.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-medium mt-1.5"
          >
            <span>Abrir documento oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
