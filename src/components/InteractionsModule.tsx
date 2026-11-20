import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  ACTIVE_INGREDIENTS,
  DRUG_INTERACTIONS,
  MEDICATION_PRODUCTS,
} from '../data/pharmacologicalDatabase.ts';
import { ProvenanceBlock } from './ProvenanceBlock.tsx';

const INTERACTION_TYPES = [
  'Todos os Tipos',
  'Medicamento vs Medicamento',
  'Medicamento vs Alimento',
  'Medicamento vs Bebida Alcoólica',
  'Medicamento vs Suplemento',
  'Medicamento vs Fitoterápico',
  'Medicamento vs Condição Clínica',
  'Medicamento vs Exame Laboratorial',
];

const SEVERITY_LEVELS = [
  'Todas as Gravidades',
  'Contraindicação Formal',
  'Associação a Evitar',
  'Interação Relevante (Exige Monitoramento)',
  'Interação de Menor Relevância',
];

export const InteractionsModule: React.FC = () => {
  const [selectedSubstanceId, setSelectedSubstanceId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('Todos os Tipos');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('Todas as Gravidades');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Multi-medication prescription list checker (Section 10)
  const [prescriptionIngredientIds, setPrescriptionIngredientIds] = useState<string[]>([
    ACTIVE_INGREDIENTS[0]?.id || 'ing_dipirona',
    ACTIVE_INGREDIENTS[3]?.id || 'ing_losartana',
  ]);
  const [ingredientToAdd, setIngredientToAdd] = useState<string>(
    ACTIVE_INGREDIENTS[1]?.id || 'ing_amoxicilina'
  );

  const handleAddIngredientToList = () => {
    if (!ingredientToAdd || prescriptionIngredientIds.includes(ingredientToAdd)) return;
    setPrescriptionIngredientIds((prev) => [...prev, ingredientToAdd]);
  };

  const handleRemoveIngredientFromList = (id: string) => {
    setPrescriptionIngredientIds((prev) => prev.filter((item) => item !== id));
  };

  // Evaluate all unique pairwise combinations in the multi-drug list
  const evaluatedPairs = useMemo(() => {
    const pairs: {
      ingAId: string;
      ingAName: string;
      ingBId: string;
      ingBName: string;
      matchedInteractions: typeof DRUG_INTERACTIONS;
    }[] = [];

    for (let i = 0; i < prescriptionIngredientIds.length; i++) {
      for (let j = i + 1; j < prescriptionIngredientIds.length; j++) {
        const idA = prescriptionIngredientIds[i];
        const idB = prescriptionIngredientIds[j];
        const ingA = ACTIVE_INGREDIENTS.find((ing) => ing.id === idA);
        const ingB = ACTIVE_INGREDIENTS.find((ing) => ing.id === idB);
        if (!ingA || !ingB) continue;

        const matches = DRUG_INTERACTIONS.filter(
          (inter) =>
            (inter.substanceAId === idA &&
              (inter.targetId === idB ||
                inter.targetName.toLowerCase().includes(ingB.name.split(' ')[0].toLowerCase()))) ||
            (inter.substanceAId === idB &&
              (inter.targetId === idA ||
                inter.targetName.toLowerCase().includes(ingA.name.split(' ')[0].toLowerCase())))
        );

        pairs.push({
          ingAId: idA,
          ingAName: ingA.name,
          ingBId: idB,
          ingBName: ingB.name,
          matchedInteractions: matches,
        });
      }
    }
    return pairs;
  }, [prescriptionIngredientIds]);

  // Non-drug interactions (Food, Alcohol, Clinical Condition, Lab Exam, Supplement, Herbal) for items in the prescription list
  const listContextualInteractions = useMemo(() => {
    return DRUG_INTERACTIONS.filter(
      (inter) =>
        prescriptionIngredientIds.includes(inter.substanceAId) &&
        inter.targetType !== 'Medicamento vs Medicamento'
    );
  }, [prescriptionIngredientIds]);

  const filteredInteractions = DRUG_INTERACTIONS.filter((item) => {
    const matchesSub =
      selectedSubstanceId === 'all' ||
      item.substanceAId === selectedSubstanceId ||
      item.targetId === selectedSubstanceId;
    const matchesType = selectedType === 'Todos os Tipos' || item.targetType === selectedType;
    const matchesSeverity =
      selectedSeverity === 'Todas as Gravidades' || item.severity === selectedSeverity;
    const q = searchTerm.trim().toLowerCase();
    const matchesText =
      !q ||
      item.substanceAName.toLowerCase().includes(q) ||
      item.targetName.toLowerCase().includes(q) ||
      item.mechanism.toLowerCase().includes(q) ||
      item.potentialConsequence.toLowerCase().includes(q) ||
      item.applicablePopulation.toLowerCase().includes(q);
    return matchesSub && matchesType && matchesSeverity && matchesText;
  });

  return (
    <div className="space-y-6">
      {/* Header & Mandatory Safety Notice */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Segurança Farmacoterapêutica
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Matriz de Interações Farmacológicas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Consulta estruturada em 7 categorias: Medicamento × Medicamento, Alimento, Bebida
            Alcoólica, Suplemento, Fitoterápico, Condição Clínica e Exame Laboratorial.
          </p>
        </div>

        {/* Mandatory Absence of Interaction Rule */}
        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Regra de Segurança Clínica:</strong> A ausência de interação identificada nesta
            consulta significa exclusivamente{' '}
            <em>ausência de interação documentada nas fontes consultadas até o momento</em>, e{' '}
            <strong>nunca</strong> deve ser interpretada como ausência de risco clínico.
          </div>
        </div>

        {/* Multi-Medication Prescription List Checker (Section 10) */}
        <div className="bg-slate-50/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Verificador Múltiplo de Prescrição (Análise Combinada de Pares)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Adicione dois ou mais princípios ativos/medicamentos para avaliar os pares combinados e alertas alimentares, clínicos e laboratoriais.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={ingredientToAdd}
              onChange={(e) => setIngredientToAdd(e.target.value)}
              className="flex-1 h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {ACTIVE_INGREDIENTS.map((ing) => {
                const relatedMeds = MEDICATION_PRODUCTS.filter((m) =>
                  m.activeIngredientIds.includes(ing.id)
                )
                  .map((m) => m.commercialName)
                  .join(', ');
                return (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.atcCode}) — Ex.: {relatedMeds}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={handleAddIngredientToList}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar à Lista de Verificação</span>
            </button>
          </div>

          {/* Active List Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {prescriptionIngredientIds.map((id) => {
              const ing = ACTIVE_INGREDIENTS.find((i) => i.id === id);
              if (!ing) return null;
              return (
                <div
                  key={id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>{ing.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">({ing.atcCode})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredientFromList(id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remover da lista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pairwise Evaluation Matrix */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Pares Medicamento × Medicamento Avaliados ({evaluatedPairs.length} combinação(ões)) e
              Interações Contextuais ({listContextualInteractions.length}):
            </div>

            {evaluatedPairs.length === 0 ? (
              <div className="text-slate-500">
                Selecione ao menos 2 substâncias na lista acima para avaliar combinações em pares.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {evaluatedPairs.map((pair) => (
                  <div
                    key={`${pair.ingAId}_${pair.ingBId}`}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {pair.ingAName} × {pair.ingBName}
                      </div>
                      {pair.matchedInteractions.length > 0 ? (
                        <div className="text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          ▲ {pair.matchedInteractions.length} interação(ões) direta(s) documentada(s)
                        </div>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          Sem interação direta registrada entre o par nas fontes consultadas (não
                          exclui risco clínico ou aditivo).
                        </div>
                      )}
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Princípio Ativo Envolvido
            </label>
            <select
              value={selectedSubstanceId}
              onChange={(e) => setSelectedSubstanceId(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              <option value="all">Todos os Princípios Ativos</option>
              {ACTIVE_INGREDIENTS.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.atcCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Modalidade da Interação
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              {INTERACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Classificação de Gravidade
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
            >
              {SEVERITY_LEVELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Buscar Alvo ou Mecanismo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex.: Valproato, Trinder, Potássio..."
                className="w-full h-11 pl-10 pr-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredInteractions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2.5 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Ausência de interação registrada nas fontes consultadas para os filtros selecionados
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            A ausência de registro nesta consulta indica apenas que não há interação documentada nas
            fontes indexadas até o momento para esta combinação específica, não constituindo
            garantia de ausência de risco clínico.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInteractions.map((inter) => {
            const isSevere =
              inter.severity === 'Contraindicação Formal' ||
              inter.severity === 'Associação a Evitar';
            return (
              <div
                key={inter.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {inter.targetType} · Natureza: {inter.interactionType}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {inter.substanceAName}{' '}
                      <span className="text-slate-400 font-normal">×</span> {inter.targetName}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-bold border ${
                      isSevere
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {inter.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-3">
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5 text-sm">
                        Mecanismo Farmacológico Documentado
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {inter.mechanism}
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5 text-sm">
                        Consequência Clínica Potencial
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {inter.potentialConsequence}
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5">
                        População Aplicável
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {inter.applicablePopulation}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5">
                        Conduta Documentada
                      </strong>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {inter.recommendedConduct}
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5">
                        Monitoramento Recomendado
                      </strong>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {inter.monitoringRequirement}
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white block mb-0.5">
                        Evidência Disponível & Limitações
                      </strong>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {inter.availableEvidence} · <em>Limitações:</em> {inter.limitations}
                      </p>
                    </div>
                  </div>
                </div>

                <ProvenanceBlock provenance={inter.provenance} compact />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
