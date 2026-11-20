import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  ExternalLink,
  FileText,
  ShieldAlert,
  ArrowLeft,
  GitCompare,
  Building2,
  FlaskConical,
  Package,
  Award,
  Copy,
  Layers,
} from 'lucide-react';
import { ActiveIngredient, MedicationProduct } from '../types/pharmacology.ts';
import { DRUG_INTERACTIONS } from '../data/pharmacologicalDatabase.ts';
import { ProvenanceBlock, REVIEW_STATUS_META } from './ProvenanceBlock.tsx';

interface SiblingMedicationSummary {
  id: string;
  commercialName: string;
  manufacturer: string;
  regulatoryCategory: string;
  regulatoryStatus: string;
  anvisaRegistration: string;
  presentationsCount: number;
}

interface Props {
  medication: MedicationProduct;
  ingredients: ActiveIngredient[];
  isFavorite: boolean;
  onToggleFavorite: (med: MedicationProduct) => void;
  onBack: () => void;
  onOpenComparatorWith: (medId: string) => void;
  onSelectMedicationById?: (medId: string) => void;
}

type FichaTab =
  | 'visao_geral'
  | 'apresentacoes'
  | 'indicacoes'
  | 'posologia'
  | 'farmacologia'
  | 'interacoes'
  | 'contraindicacoes'
  | 'reacoes_adversas'
  | 'administracao'
  | 'estabilidade'
  | 'evidencias'
  | 'bulas';

const TABS: { id: FichaTab; label: string }[] = [
  { id: 'visao_geral', label: 'Visão Geral & Registro' },
  { id: 'apresentacoes', label: 'Apresentações' },
  { id: 'indicacoes', label: 'Indicações e Linhas' },
  { id: 'posologia', label: 'Posologia e Ajustes' },
  { id: 'farmacologia', label: 'Farmacologia (PK/PD)' },
  { id: 'interacoes', label: 'Interações' },
  { id: 'contraindicacoes', label: 'Contraindicações' },
  { id: 'reacoes_adversas', label: 'Reações Adversas' },
  { id: 'administracao', label: 'Administração' },
  { id: 'estabilidade', label: 'Estabilidade' },
  { id: 'evidencias', label: 'Segurança e Evidências' },
  { id: 'bulas', label: 'Bulas e Equivalentes' },
];

export const MedicationFichaView: React.FC<Props> = ({
  medication,
  ingredients,
  isFavorite,
  onToggleFavorite,
  onBack,
  onOpenComparatorWith,
  onSelectMedicationById,
}) => {
  const [activeTab, setActiveTab] = useState<FichaTab>('visao_geral');
  const [selectedPopulation, setSelectedPopulation] = useState<string>('Todas');
  const [expandAllSections, setExpandAllSections] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [siblingMedications, setSiblingMedications] = useState<SiblingMedicationSummary[]>([]);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/catalog/medications/${encodeURIComponent(medication.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data.siblingMedications)) {
          setSiblingMedications(data.siblingMedications);
        }
      })
      .catch(() => {
        // ignore network error
      });
    return () => {
      active = false;
    };
  }, [medication.id]);

  const handleCopyTechnicalSummary = () => {
    const presList = medication.presentations
      .map((p) => `${p.concentration} (${p.dosageForm} — Via ${p.administrationRoute})`)
      .join('; ');
    const summaryText = [
      `FARMA360 — Ficha Farmacológica Técnica`,
      `Produto: ${medication.commercialName} (${medication.genericDesignation})`,
      `Categoria: ${medication.regulatoryCategory} | Situação Regulatória: ${medication.regulatoryStatus}`,
      `Registro ANVISA: ${medication.anvisaRegistration} | Vencimento: ${medication.registrationExpirationDate || 'Consultar ANVISA'} | Processo: ${medication.processNumber || 'N/D'}`,
      `Detentor: ${medication.manufacturer} (CNPJ ${medication.manufacturerCnpj})`,
      `Classe Terapêutica: ${medication.therapeuticClassAnvisa || 'Registrada'}`,
      `Apresentações (${medication.presentations.length}): ${presList}`,
      `Fonte Documental: ${medication.provenance.documentTitle} (${medication.provenance.sourceName} — ${medication.provenance.version})`,
    ].join('\n');
    navigator.clipboard?.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const primaryIngredient = ingredients[0];

  const populations = Array.from(
    new Set(medication.dosageRegimens.map((d) => d.population))
  );

  const filteredDosages =
    selectedPopulation === 'Todas'
      ? medication.dosageRegimens
      : medication.dosageRegimens.filter((d) => d.population === selectedPopulation);

  const relatedInteractions = DRUG_INTERACTIONS.filter(
    (inter) =>
      medication.activeIngredientIds.includes(inter.substanceAId) ||
      (inter.targetId && medication.activeIngredientIds.includes(inter.targetId))
  );

  const reviewMeta = REVIEW_STATUS_META[medication.validationStatus];

  return (
    <div className="space-y-6">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Medicamentos</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExpandAllSections((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              expandAllSections
                ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{expandAllSections ? 'Recolher em abas' : 'Expandir todas as seções'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTechnicalSummary}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copiedSummary ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{copiedSummary ? 'Resumo copiado' : 'Copiar resumo técnico'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComparatorWith(medication.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
            <span>Comparar</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(medication)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {isFavorite ? (
              <Check className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{isFavorite ? 'Favorito' : 'Favoritar'}</span>
          </button>
        </div>
      </div>

      {/* Section 6.4: Alert Banner for Suspended / Cancelled / Non-Active Registration */}
      {medication.regulatoryStatus !== 'Válido / Ativo' && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 rounded-xl p-5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-bold">
              ATENÇÃO REGULATÓRIA — REGISTRO {medication.regulatoryStatus.toUpperCase()} NA ANVISA
            </div>
            <p className="leading-relaxed">
              Este registro não se encontra regularmente comercializado ({medication.prescriptionRequirement}). Mantido no catálogo exclusivamente para rastreabilidade regulatória, farmacovigilância e consulta histórica (Seção 6.4).
            </p>
          </div>
        </div>
      )}

      {/* Monograph Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/80">
            {medication.regulatoryCategory}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-medium ${reviewMeta.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${reviewMeta.dotClass}`} />
            {reviewMeta.label}
          </span>
          <span className="font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
            ANVISA {medication.anvisaRegistration}
          </span>
          {primaryIngredient && (
            <>
              <span className="font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                ATC {primaryIngredient.atcCode}
              </span>
              {primaryIngredient.awareClass !== 'Não Aplicável' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                  OMS AWaRe: {primaryIngredient.awareClass}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {medication.commercialName}
            </h1>
            <p className="text-base text-slate-600">
              Princípio Ativo (DCB):{' '}
              <strong className="font-semibold text-slate-900">
                {medication.genericDesignation}
              </strong>
              {primaryIngredient &&
                ` (${primaryIngredient.dcbCode} · CAS ${primaryIngredient.casNumber})`}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
              <span>
                Fabricante / Detentor:{' '}
                <strong className="text-slate-700">{medication.manufacturer}</strong> (CNPJ{' '}
                {medication.manufacturerCnpj})
              </span>
              <span>·</span>
              <span>Prescrição: {medication.prescriptionRequirement}</span>
              {medication.referenceMedicationName && (
                <>
                  <span>·</span>
                  <span>Referência ANVISA: {medication.referenceMedicationName}</span>
                </>
              )}
            </div>
          </div>

          {medication.safetyAlerts.highAlert && (
            <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 lg:max-w-md shrink-0">
              <div className="flex items-center gap-2 font-semibold text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Medicamento de Alta Vigilância (ISMP Brasil)</span>
              </div>
              <p className="mt-1.5 leading-relaxed text-rose-800/90">
                Exige dupla checagem farmacêutica na prescrição e dispensação, além de monitoramento
                laboratorial ({medication.safetyAlerts.requiredLabMonitoring.join(', ')}).
              </p>
            </div>
          )}
        </div>

        {/* Monograph Section Tabs */}
        <div className="mt-7 pt-4 border-t border-slate-200 overflow-x-auto -mx-2 px-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setExpandAllSections(false);
                  setActiveTab(tab.id);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  !expandAllSections && activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xs space-y-10">
        {(expandAllSections || activeTab === 'visao_geral') && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Arquitetura Documental — Separação das 5 Entidades Farmacológicas
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                O Farma360 mantém isolamento estrutural entre princípio ativo, produto comercial,
                apresentação, fabricante e registro sanitário, impedindo mistura de dados entre
                produtos distintos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  <FlaskConical className="w-4 h-4" />
                  <span>1. Princípio Ativo</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {primaryIngredient?.name || medication.genericDesignation}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                  <div>
                    DCB:{' '}
                    <span className="font-mono">
                      {primaryIngredient?.dcbCode || 'Denominado na ANVISA'}
                    </span>
                  </div>
                  {primaryIngredient?.casNumber && (
                    <div>
                      CAS: <span className="font-mono">{primaryIngredient.casNumber}</span>
                    </div>
                  )}
                  {primaryIngredient?.atcCode && (
                    <div>
                      ATC: <span className="font-mono">{primaryIngredient.atcCode}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500">
                    Classe: {medication.therapeuticClassAnvisa || primaryIngredient?.therapeuticClasses?.[0] || 'Registrada'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  <FileText className="w-4 h-4" />
                  <span>2. Produto</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {medication.commercialName}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                  <div>Categoria: {medication.regulatoryCategory}</div>
                  <div>Associação: {medication.isCombination ? 'Sim' : 'Monofármaco'}</div>
                  <div>Tarja/Prescrição: {medication.prescriptionRequirement}</div>
                  {medication.referenceMedicationName && (
                    <div>Ref: {medication.referenceMedicationName}</div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  <Package className="w-4 h-4" />
                  <span>3. Apresentações</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {medication.presentations.length} registrada(s)
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                  {medication.presentations.slice(0, 6).map((p) => (
                    <div key={p.id} className="leading-snug">
                      • <strong>{p.concentration}</strong> — {p.dosageForm} ({p.administrationRoute})
                    </div>
                  ))}
                  {medication.presentations.length > 6 && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                      + {medication.presentations.length - 6} apresentações adicionais na aba Apresentações
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>4. Fabricante</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {medication.manufacturer}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                  <div>Detentor: {medication.registrationHolder}</div>
                  <div>
                    CNPJ: <span className="font-mono">{medication.manufacturerCnpj}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2">
                  <Award className="w-4 h-4" />
                  <span>5. Registro Sanitário</span>
                </div>
                <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  MS {medication.anvisaRegistration}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 space-y-1">
                  <div>
                    Situação:{' '}
                    <strong
                      className={
                        medication.regulatoryStatus === 'Válido / Ativo'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {medication.regulatoryStatus}
                    </strong>
                  </div>
                  <div>
                    Vencimento:{' '}
                    <span className="font-mono">
                      {medication.registrationExpirationDate || 'Consultar ANVISA'}
                    </span>
                  </div>
                  {medication.processNumber && (
                    <div>
                      Processo: <span className="font-mono">{medication.processNumber}</span>
                    </div>
                  )}
                  <div>
                    Última Sinc.:{' '}
                    <span className="font-mono">
                      {medication.lastSyncDate || medication.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {primaryIngredient?.antimicrobialProfile && (
              <div className="border border-blue-200/80 rounded-xl p-5 bg-blue-50/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Stewardship de Antimicrobianos e Classificação OMS AWaRe
                  </h3>
                  <span className="text-xs font-mono font-semibold text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-md">
                    OMS AWaRe: {primaryIngredient.antimicrobialProfile.awareCategory} (
                    {primaryIngredient.awareVersionConsulted})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div>
                    <div className="font-semibold text-slate-900 mb-1.5">
                      Espectro de Ação Documentado:
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      {primaryIngredient.antimicrobialProfile.spectrumOfAction.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 mb-1.5">
                      Mecanismos de Resistência Documentados:
                    </div>
                    <ul className="list-disc pl-4 space-y-1">
                      {primaryIngredient.antimicrobialProfile.resistanceMechanisms.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-slate-700 pt-2 border-t border-blue-200/60 leading-relaxed">
                  <strong>Diretriz de Uso Racional (Stewardship / CCIH):</strong>{' '}
                  {primaryIngredient.antimicrobialProfile.stewardshipGuidelines}
                </p>
              </div>
            )}

            <ProvenanceBlock provenance={medication.provenance} />
          </div>
        )}

        {(expandAllSections || activeTab === 'apresentacoes') && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Apresentações Comerciais Registradas ({medication.presentations.length})
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Cada apresentação possui concentração, forma farmacêutica, embalagem, via de
                administração e fator de gotejamento próprios.
              </p>
            </div>

            {/* Mobile Card View + Desktop Table */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {medication.presentations.map((pres) => (
                <div
                  key={pres.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {pres.concentration}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                      Via {pres.administrationRoute}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{pres.dosageForm}</div>
                  <div className="text-slate-600">{pres.packaging}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    Descrição ANVISA: {pres.commercialPresentation}
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap justify-between gap-2 font-mono text-slate-600">
                    <span>
                      Gotejador:{' '}
                      {pres.dropsPerMl ? `${pres.dropsPerMl} gotas/mL` : 'Não aplicável'}
                    </span>
                    <span>EAN: {pres.gtinEan || 'N/D'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-3.5 px-4 font-semibold">Concentração</th>
                    <th className="py-3.5 px-4 font-semibold">Forma Farmacêutica</th>
                    <th className="py-3.5 px-4 font-semibold">Descrição Oficial ANVISA</th>
                    <th className="py-3.5 px-4 font-semibold">Embalagem</th>
                    <th className="py-3.5 px-4 font-semibold">Via</th>
                    <th className="py-3.5 px-4 font-semibold">Equivalência / GTIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {medication.presentations.map((pres) => (
                    <tr key={pres.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {pres.concentration}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        {pres.dosageForm}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {pres.commercialPresentation}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{pres.packaging}</td>
                      <td className="py-3.5 px-4 text-slate-800">{pres.administrationRoute}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {pres.dropsPerMl ? `${pres.dropsPerMl} gotas/mL · ` : ''}
                        EAN: {pres.gtinEan || 'Não informado'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(expandAllSections || activeTab === 'indicacoes') && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Indicações Clínicas e Linhas de Tratamento Contextualizadas
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                A linha de tratamento nunca é absoluta: cada classificação é vinculada à indicação
                clínica, população, contexto assistencial e diretriz de referência.
              </p>
            </div>
            {medication.indications.length > 0 ? (
              <div className="space-y-4">
                {medication.indications.map((ind) => (
                  <div
                    key={ind.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {ind.condition}
                      </h3>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                        {ind.regulatoryApprovalType}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Contexto Clínico:</strong> {ind.clinicalContext}
                    </p>

                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Posicionamento e Linha de Tratamento Contextualizada:
                      </div>
                      {ind.treatmentLineContext}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300 pt-2">
                      <div>
                        <span className="text-slate-400 block">População Aplicável</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {ind.population}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Nível de Evidência</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {ind.evidenceLevel}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Diretriz / Documento de Origem</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {ind.referenceGuideline}
                        </strong>
                      </div>
                    </div>
                    <ProvenanceBlock provenance={ind.provenance} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  Classificação Terapêutica Oficial ANVISA: {medication.therapeuticClassAnvisa || 'Registrada na ANVISA'}
                </div>
                <p className="leading-relaxed">
                  Este registro foi sincronizado diretamente da base oficial de Dados Abertos da ANVISA (<code>DADOS_ABERTOS_MEDICAMENTOS.csv</code> · Registro MS {medication.anvisaRegistration}). Para conformidade científica estrita, o Farma360 não sintetiza indicações clínicas por inferência: consulte a seção <em>1. Indicações</em> na Bula Oficial do Profissional no Bulário Eletrônico da ANVISA.
                </p>
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'posologia') && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Posologia Estruturada por Indicação, População e Apresentação
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Nenhuma dose é gerada por IA. Todos os regimes posológicos estão vinculados à
                  apresentação específica e à fonte documental.
                </p>
              </div>
              {populations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setSelectedPopulation('Todas')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedPopulation === 'Todas'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    Todas ({medication.dosageRegimens.length})
                  </button>
                  {populations.map((pop) => (
                    <button
                      key={pop}
                      type="button"
                      onClick={() => setSelectedPopulation(pop)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        selectedPopulation === pop
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {pop}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredDosages.length > 0 ? (
              <div className="space-y-5">
                {filteredDosages.map((dos) => {
                  const linkedPres = medication.presentations.find(
                    (p) => p.id === dos.presentationId
                  );
                  const linkedInd = medication.indications.find((i) => i.id === dos.indicationId);
                  return (
                    <div
                      key={dos.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-white dark:bg-slate-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-xs font-semibold">
                            População: {dos.population}
                          </span>
                          <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                            Apresentação:{' '}
                            {linkedPres
                              ? `${linkedPres.concentration} — ${linkedPres.dosageForm}`
                              : dos.presentationId}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Fonte: {dos.sourceType}
                        </span>
                      </div>

                      {linkedInd && (
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Indicação Vinculada:</strong> {linkedInd.condition}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <div className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                            Dose Inicial & Usual
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            Inicial: {dos.initialDose}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            Habitual: {dos.usualDose}
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <div className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                            Dose Máxima & Intervalo
                          </div>
                          <div className="font-mono font-bold text-rose-700 dark:text-rose-400">
                            Teto: {dos.maxDose}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            Intervalo: {dos.interval} ({dos.frequency}) · Via: {dos.route}
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <div className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                            Duração & Dose Ponderal
                          </div>
                          <div className="text-slate-800 dark:text-slate-200">
                            Duração: {dos.duration}
                          </div>
                          {dos.weightBasedDose && (
                            <div className="font-mono text-blue-700 dark:text-blue-400 font-medium">
                              Ponderal: {dos.weightBasedDose}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700 dark:text-slate-300 pt-1">
                        <div className="space-y-1">
                          <strong className="text-slate-900 dark:text-white block">
                            Ajustes Documentados (Renal / Hepático / Idoso):
                          </strong>
                          <p className="leading-relaxed">{dos.adjustments}</p>
                        </div>
                        <div className="space-y-1">
                          <strong className="text-slate-900 dark:text-white block">
                            Cuidados de Administração:
                          </strong>
                          <p className="leading-relaxed">{dos.administrationCautions}</p>
                        </div>
                        <div className="space-y-1">
                          <strong className="text-slate-900 dark:text-white block">
                            Monitoramento Clínico e Laboratorial:
                          </strong>
                          <p className="leading-relaxed">{dos.monitoring}</p>
                        </div>
                      </div>

                      <ProvenanceBlock provenance={dos.provenance} compact />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  Posologia Específica do Fabricante ({medication.manufacturer})
                </div>
                <p className="leading-relaxed">
                  As apresentações registradas deste produto ({medication.presentations.map((p) => p.commercialPresentation).join(' | ')}) estão homologadas sob o Registro ANVISA nº <strong>{medication.anvisaRegistration}</strong>. Conforme diretriz de governança científica do Farma360, posologias não são extrapoladas sem extração literal da bula do detentor. Consulte a seção <em>8. Posologia e Modo de Usar</em> no Bulário Eletrônico da ANVISA.
                </p>
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'farmacologia') && (
          <div className="space-y-5">
            {primaryIngredient ? (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Farmacodinâmica e Farmacocinética Clínica — {primaryIngredient.name}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Parâmetros farmacológicos extraídos da seção de Características Farmacológicas da
                    bula profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Mecanismo de Ação e Alvos Moleculares
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                      {primaryIngredient.pharmacology.mechanismOfAction}
                    </p>
                    <div className="pt-2">
                      <strong className="text-slate-900 dark:text-white">
                        Receptores e Alvos Farmacológicos:
                      </strong>
                      <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
                        {primaryIngredient.pharmacology.receptorsAndTargets.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Farmacodinâmica e Tempo de Resposta
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                      {primaryIngredient.pharmacology.pharmacodynamics}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 pt-2">
                      <strong>Início e Duração de Ação:</strong>{' '}
                      {primaryIngredient.pharmacology.onsetAndDuration}
                    </p>
                    {primaryIngredient.pharmacology.pharmacogenetics && (
                      <p className="text-slate-700 dark:text-slate-300 pt-1">
                        <strong>Farmacogenética Documentada:</strong>{' '}
                        {primaryIngredient.pharmacology.pharmacogenetics}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Absorção & Biodisponibilidade
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {primaryIngredient.pharmacology.absorption}
                    </p>
                    <div className="pt-1 font-mono text-blue-700 dark:text-blue-400 font-semibold">
                      F: {primaryIngredient.pharmacology.bioavailability}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Distribuição & Ligação Proteica
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {primaryIngredient.pharmacology.distribution}
                    </p>
                    <div className="pt-1 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                      Ligação: {primaryIngredient.pharmacology.proteinBinding}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Metabolismo & Metabólitos
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {primaryIngredient.pharmacology.metabolism}
                    </p>
                    <div className="pt-1 text-slate-600 dark:text-slate-400">
                      Metabólitos: {primaryIngredient.pharmacology.metabolites}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Eliminação & Meia-Vida (t½)
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {primaryIngredient.pharmacology.elimination}
                    </p>
                    <div className="pt-1 font-mono text-slate-900 dark:text-white font-semibold">
                      t½: {primaryIngredient.pharmacology.halfLife}
                    </div>
                  </div>
                </div>

                <ProvenanceBlock provenance={primaryIngredient.pharmacology.provenance} />
              </>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">
                  Farmacologia Clínica — {medication.genericDesignation}
                </div>
                <p className="leading-relaxed">
                  Princípio ativo registrado na ANVISA dentro da classe terapêutica <strong>{medication.therapeuticClassAnvisa || 'Registrada'}</strong>. Consulte a seção <em>3. Características Farmacológicas</em> na Bula do Profissional da ANVISA para parâmetros farmacocinéticos e farmacodinâmicos específicos deste detentor ({medication.manufacturer}).
                </p>
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'interacoes') && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Interações Documentadas para {medication.genericDesignation} (
                {relatedInteractions.length})
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                A ausência de interação listada significa apenas ausência de interação registrada
                nas fontes consultadas até o momento, e não garantia de ausência de risco clínico.
              </p>
            </div>

            {relatedInteractions.length > 0 ? (
              <div className="space-y-4">
                {relatedInteractions.map((inter) => (
                  <div
                    key={inter.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {inter.substanceAName} × {inter.targetName}
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          inter.severity.includes('Evitar') ||
                          inter.severity.includes('Contraindicação')
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {inter.severity}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <strong>Mecanismo ({inter.interactionType}):</strong> {inter.mechanism}
                      </div>
                      <div>
                        <strong>Efeito Clínico Potencial:</strong> {inter.potentialConsequence}
                      </div>
                      <div>
                        <strong>Conduta Documentada:</strong> {inter.recommendedConduct}
                      </div>
                      <div>
                        <strong>População & Limitações:</strong> {inter.applicablePopulation} —{' '}
                        {inter.limitations}
                      </div>
                    </div>
                    <ProvenanceBlock provenance={inter.provenance} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                Não há interações específicas indexadas para este princípio ativo na visualização
                rápida. Consulte a seção <em>6. Interações Medicamentosas</em> da bula profissional completa ou o módulo de Interações.
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'contraindicacoes') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Contraindicações Absolutas, Relativas, Precauções e Gestação/Lactação
            </h2>
            {medication.contraindications.length > 0 ? (
              <div className="space-y-3">
                {medication.contraindications.map((ci) => (
                  <div
                    key={ci.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
                        {ci.type} — {ci.clinicalCondition}
                      </span>
                      {ci.riskCategory && (
                        <span className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                          Risco Gestacional: {ci.riskCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                      {ci.description}
                    </p>
                    <ProvenanceBlock provenance={ci.provenance} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                Hipersensibilidade conhecida ao princípio ativo (<strong>{medication.genericDesignation}</strong>) ou a qualquer excipiente da formulação registrada pelo fabricante (<strong>{medication.manufacturer}</strong>). Consulte as seções <em>4. Contraindicações</em> e <em>5. Advertências e Precauções</em> na Bula Oficial ANVISA.
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'reacoes_adversas') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Reações Adversas Documentadas por Frequência, Gravidade e Sistema Orgânico
            </h2>
            {medication.adverseReactions.length > 0 ? (
              <div className="space-y-3">
                {medication.adverseReactions.map((adv) => (
                  <div
                    key={adv.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5 bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {adv.organSystem}: {adv.description}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                          adv.severity.includes('Crítica') || adv.severity.includes('Grave')
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Gravidade: {adv.severity}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Frequência:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {adv.frequency}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Origem:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {adv.originType}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>Condições: {adv.occurrenceConditions}</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                      <strong>Conduta de Segurança Documentada:</strong> {adv.safetyGuidance}
                    </div>
                    <ProvenanceBlock provenance={adv.provenance} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                Consulte a seção <em>9. Reações Adversas</em> na Bula do Profissional no Bulário Eletrônico da ANVISA e o portal VigiMed / ANVISA para notificações de farmacovigilância referentes a <strong>{medication.commercialName}</strong> (Reg. MS {medication.anvisaRegistration}).
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'administracao' || activeTab === 'estabilidade') && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Preparo, Reconstituição, Diluição, Compatibilidade em Y e Estabilidade
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2 font-medium">
                Regra Obrigatória de Segurança Farmacotécnica: Estes parâmetros referem-se
                exclusivamente à apresentação do fabricante{' '}
                <strong>{medication.manufacturer}</strong> (Registro ANVISA{' '}
                {medication.anvisaRegistration}). Não extrapolar tempos de estabilidade para outros
                fabricantes sem consultar a respectiva bula.
              </p>
            </div>

            {medication.presentations.some((p) => p.reconstitutionAndDilution) ? (
              medication.presentations
                .filter((p) => p.reconstitutionAndDilution)
                .map((pres) => {
                  const guide = pres.reconstitutionAndDilution!;
                  return (
                    <div
                      key={pres.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-white dark:bg-slate-900"
                    >
                      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Apresentação: {pres.concentration} — {pres.dosageForm}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Via de Administração: {pres.administrationRoute} · Descrição ANVISA:{' '}
                          {pres.commercialPresentation}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            Reconstituição e Diluição
                          </div>
                          <div>
                            <strong>Diluente de Reconstituição:</strong>{' '}
                            {guide.reconstitutionDiluent}
                          </div>
                          <div>
                            <strong>Volume de Reconstituição:</strong> {guide.reconstitutionVolume}
                          </div>
                          <div>
                            <strong>Diluentes Compatíveis:</strong>{' '}
                            {guide.compatibleDiluents.join(', ')}
                          </div>
                          <div>
                            <strong>Concentração Final:</strong> {guide.finalConcentration}
                          </div>
                          <div>
                            <strong>Velocidade de Infusão / Administração:</strong>{' '}
                            {guide.infusionRate}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            Estabilidade e Conservação ({medication.manufacturer})
                          </div>
                          <div>
                            <strong>Temperatura de Armazenamento:</strong>{' '}
                            {guide.storageTemperature}
                          </div>
                          <div>
                            <strong>Estabilidade Após Reconstituição:</strong>{' '}
                            {guide.stabilityAfterReconstitution}
                          </div>
                          <div>
                            <strong>Estabilidade Após Diluição:</strong>{' '}
                            {guide.stabilityAfterDilution}
                          </div>
                          <div>
                            <strong>Fotossensibilidade:</strong>{' '}
                            {guide.photosensitivity ? 'Sim (Proteger da luz)' : 'Não documentada'} ·{' '}
                            <strong>Termolabilidade:</strong>{' '}
                            {guide.thermolability ? 'Sim (Sensível ao calor)' : 'Não'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-xl">
                          <div className="font-bold text-emerald-900 mb-1">
                            Compatibilidade em Y Documentada
                          </div>
                          <p className="text-emerald-800">{guide.ySiteCompatibility.join(', ')}</p>
                        </div>
                        <div className="border border-rose-200 bg-rose-50/40 p-4 rounded-xl">
                          <div className="font-bold text-rose-900 mb-1">
                            Incompatibilidades em Y / Mistura Proibida
                          </div>
                          <p className="text-rose-800">{guide.ySiteIncompatibility.join(', ')}</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <strong>Nota Específica do Fabricante:</strong>{' '}
                        {guide.manufacturerSpecificNotice}
                      </div>

                      <ProvenanceBlock provenance={guide.provenance} />
                    </div>
                  );
                })
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-sm text-slate-700 dark:text-slate-300 space-y-2 bg-slate-50/50 dark:bg-slate-950/50">
                <p>
                  <strong>Formas Farmacêuticas Registradas:</strong> As apresentações deste
                  produto ({medication.presentations.map((p) => `${p.dosageForm} [${p.administrationRoute}]`).join(', ')}) devem ser preparadas e conservadas estritamente conforme as seções <em>7. Cuidados de Armazenamento do Medicamento</em> e <em>8. Posologia e Modo de Usar</em> da Bula Oficial do fabricante <strong>{medication.manufacturer}</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {(expandAllSections || activeTab === 'evidencias') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Diretrizes Clínicas, Alertas de Segurança e Manejo de Superdosagem
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Risco na Superdosagem e Toxicidade Aguda
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {medication.safetyAlerts.overdoseRisk}
                </p>
                <div className="pt-2">
                  <strong className="text-slate-900 dark:text-white">
                    Antídoto e Conduta de Suporte:
                  </strong>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {medication.safetyAlerts.antidote}
                  </p>
                </div>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Monitoramento Laboratorial e Prevenção LASA
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                  {medication.safetyAlerts.requiredLabMonitoring.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
                {medication.safetyAlerts.lasaPair && (
                  <p className="pt-2 text-amber-800 dark:text-amber-300 font-medium">
                    Alerta LASA (Grafia/Som Semelhante): Atenção para não confundir com{' '}
                    {medication.safetyAlerts.lasaPair}.
                  </p>
                )}
              </div>
            </div>
            <ProvenanceBlock provenance={medication.provenance} />
          </div>
        )}

        {(expandAllSections || activeTab === 'bulas') && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bula Oficial do Profissional e Registro Regulatório ANVISA
              </h2>
              <div className="max-w-xl">
                <a
                  href={medication.bulaProfessionalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 hover:bg-blue-50/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Bula do Profissional de Saúde (ANVISA)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Bulário Eletrônico Oficial · Reg. MS {medication.anvisaRegistration} ·{' '}
                        {medication.manufacturer}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </a>
              </div>
            </div>

            {siblingMedications.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Outros Medicamentos Registrados na ANVISA com o Mesmo Princípio Ativo ({siblingMedications.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Múltiplos fabricantes, categorias regulatórias e apresentações vinculadas ao princípio ativo <strong>{medication.genericDesignation}</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {siblingMedications.map((sib) => (
                    <button
                      key={sib.id}
                      type="button"
                      onClick={() => onSelectMedicationById?.(sib.id)}
                      className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {sib.regulatoryCategory}
                        </span>
                        <span
                          className={`font-semibold ${
                            sib.regulatoryStatus === 'Válido / Ativo'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          ● {sib.regulatoryStatus}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {sib.commercialName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {sib.manufacturer}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        ANVISA {sib.anvisaRegistration} · {sib.presentationsCount} apres.
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ProvenanceBlock provenance={medication.provenance} />
          </div>
        )}
      </div>
    </div>
  );
};
