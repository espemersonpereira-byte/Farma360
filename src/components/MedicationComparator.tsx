import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search } from 'lucide-react';
import {
  ACTIVE_INGREDIENTS,
  MEDICATION_PRODUCTS,
} from '../data/pharmacologicalDatabase.ts';
import { MedicationProduct } from '../types/pharmacology.ts';

interface Props {
  initialMedAId?: string;
}

export const MedicationComparator: React.FC<Props> = ({ initialMedAId }) => {
  const [catalogOptions, setCatalogOptions] = useState<MedicationProduct[]>(MEDICATION_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [medAId, setMedAId] = useState<string>(initialMedAId || MEDICATION_PRODUCTS[0].id);
  const [medBId, setMedBId] = useState<string>(MEDICATION_PRODUCTS[1].id);
  const [medAObj, setMedAObj] = useState<MedicationProduct>(
    MEDICATION_PRODUCTS.find((m) => m.id === initialMedAId) || MEDICATION_PRODUCTS[0]
  );
  const [medBObj, setMedBObj] = useState<MedicationProduct>(MEDICATION_PRODUCTS[1]);

  useEffect(() => {
    if (initialMedAId) {
      setMedAId(initialMedAId);
    }
  }, [initialMedAId]);

  useEffect(() => {
    const foundLocal = catalogOptions.find((m) => m.id === medAId);
    if (foundLocal) {
      setMedAObj(foundLocal);
      return;
    }
    fetch(`/api/catalog/medications/${encodeURIComponent(medAId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.medication) {
          setMedAObj(data.medication);
          setCatalogOptions((prev) =>
            prev.some((x) => x.id === data.medication.id) ? prev : [data.medication, ...prev]
          );
        }
      })
      .catch(() => {});
  }, [medAId, catalogOptions]);

  useEffect(() => {
    const foundLocal = catalogOptions.find((m) => m.id === medBId);
    if (foundLocal) {
      setMedBObj(foundLocal);
      return;
    }
    fetch(`/api/catalog/medications/${encodeURIComponent(medBId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.medication) {
          setMedBObj(data.medication);
          setCatalogOptions((prev) =>
            prev.some((x) => x.id === data.medication.id) ? prev : [data.medication, ...prev]
          );
        }
      })
      .catch(() => {});
  }, [medBId, catalogOptions]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(
        `/api/catalog/medications?q=${encodeURIComponent(q)}&page=1&pageSize=40&status=Todos`
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items)) {
            setCatalogOptions((prev) => {
              const map = new Map<string, MedicationProduct>();
              for (const item of prev) map.set(item.id, item);
              for (const item of data.items) map.set(item.id, item);
              return Array.from(map.values());
            });
          }
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const medA = medAObj;
  const medB = medBObj;

  const ingA = ACTIVE_INGREDIENTS.find((i) => i.id === medA.activeIngredientIds[0]);
  const ingB = ACTIVE_INGREDIENTS.find((i) => i.id === medB.activeIngredientIds[0]);

  const sameActiveIngredient =
    medA.genericDesignation.toLowerCase() === medB.genericDesignation.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Análise Comparativa Técnica · Base Completa ANVISA (36.564 medicamentos)
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Comparador de Medicamentos e Apresentações
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Pesquise qualquer medicamento registrado na ANVISA para adicionar à lista de comparação e compare lado a lado princípio ativo, fabricante, registro ANVISA, apresentações e perfil clínico.
          </p>
        </div>

        {/* Search across all 36,564 ANVISA records to populate selectors */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nos 36.564 medicamentos da ANVISA para incluir nas opções abaixo (ex.: dipirona, losartana, amoxicilina)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Medicamento A ({catalogOptions.length} opções carregadas)
            </label>
            <select
              value={medAId}
              onChange={(e) => setMedAId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {catalogOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.commercialName} ({m.genericDesignation} — {m.manufacturer} · {m.regulatoryCategory})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Medicamento B ({catalogOptions.length} opções carregadas)
            </label>
            <select
              value={medBId}
              onChange={(e) => setMedBId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {catalogOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.commercialName} ({m.genericDesignation} — {m.manufacturer} · {m.regulatoryCategory})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mandatory Equivalence Warning */}
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 leading-relaxed ${
            sameActiveIngredient
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            {sameActiveIngredient ? (
              <>
                <strong>Mesmo Princípio Ativo ({medA.genericDesignation}):</strong>{' '}
                Os dois produtos compartilham o mesmo fármaco. Contudo, <strong>não se deve presumir intercambialidade automática</strong> sem verificar forma farmacêutica, concentração, lista oficial de intercambialidade ANVISA (RDC 58/2014), dispositivo gotejador e excipientes específicos de cada fabricante.
              </>
            ) : (
              <>
                <strong>Princípios Ativos Distintos — Não Intercambiáveis:</strong>{' '}
                <strong>{medA.commercialName}</strong> ({medA.genericDesignation}) e{' '}
                <strong>{medB.commercialName}</strong> ({medB.genericDesignation}) possuem princípios ativos, mecanismos farmacológicos e perfis de segurança distintos.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Stacked Comparison Cards (shown on small screens) */}
      <div className="md:hidden space-y-4">
        {[
          {
            label: 'Princípio Ativo (DCB)',
            valA: `${medA.genericDesignation} (${ingA?.dcbCode})`,
            valB: `${medB.genericDesignation} (${ingB?.dcbCode})`,
          },
          {
            label: 'Fabricante, CNPJ & Registro ANVISA',
            valA: `${medA.manufacturer} (${medA.manufacturerCnpj}) · Reg. ${medA.anvisaRegistration}`,
            valB: `${medB.manufacturer} (${medB.manufacturerCnpj}) · Reg. ${medB.anvisaRegistration}`,
          },
          {
            label: 'Categoria Regulatória & Situação',
            valA: `${medA.regulatoryCategory} · ${medA.regulatoryStatus}`,
            valB: `${medB.regulatoryCategory} · ${medB.regulatoryStatus}`,
          },
          {
            label: 'Apresentações & Vias',
            valA: medA.presentations
              .map((p) => `${p.concentration} (${p.dosageForm} — Via ${p.administrationRoute})`)
              .join(' | '),
            valB: medB.presentations
              .map((p) => `${p.concentration} (${p.dosageForm} — Via ${p.administrationRoute})`)
              .join(' | '),
          },
          {
            label: 'Classificação ATC & OMS AWaRe',
            valA: `ATC ${ingA?.atcCode} · AWaRe: ${ingA?.awareClass}`,
            valB: `ATC ${ingB?.atcCode} · AWaRe: ${ingB?.awareClass}`,
          },
          {
            label: 'Posologia Adulto (Bula)',
            valA: `${medA.dosageRegimens[0]?.usualDose} (Máx: ${medA.dosageRegimens[0]?.maxDose})`,
            valB: `${medB.dosageRegimens[0]?.usualDose} (Máx: ${medB.dosageRegimens[0]?.maxDose})`,
          },
          {
            label: 'Contraindicações Documentadas',
            valA: medA.contraindications.map((c) => c.clinicalCondition).join('; '),
            valB: medB.contraindications.map((c) => c.clinicalCondition).join('; '),
          },
        ].map((row, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs"
          >
            <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5">
              {row.label}
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950">
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {medA.commercialName}
                </div>
                <div className="text-slate-700 dark:text-slate-300 mt-0.5">{row.valA}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950">
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {medB.commercialName}
                </div>
                <div className="text-slate-700 dark:text-slate-300 mt-0.5">{row.valB}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Side-by-Side Comparison Matrix */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <th className="py-4 px-5 font-semibold text-slate-500 w-1/4">
                Critério Farmacológico / Regulatório
              </th>
              <th className="py-4 px-5 font-bold text-slate-900 dark:text-white w-3/8">
                {medA.commercialName} ({medA.regulatoryCategory})
              </th>
              <th className="py-4 px-5 font-bold text-slate-900 dark:text-white w-3/8">
                {medB.commercialName} ({medB.regulatoryCategory})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Princípio Ativo (DCB)
              </td>
              <td className="py-3.5 px-5 text-slate-800 dark:text-slate-200">
                {medA.genericDesignation} ({ingA?.dcbCode})
              </td>
              <td className="py-3.5 px-5 text-slate-800 dark:text-slate-200">
                {medB.genericDesignation} ({ingB?.dcbCode})
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Detentor, CNPJ & Registro ANVISA
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700 dark:text-slate-300">
                {medA.manufacturer} ({medA.manufacturerCnpj}) · Reg. {medA.anvisaRegistration}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700 dark:text-slate-300">
                {medB.manufacturer} ({medB.manufacturerCnpj}) · Reg. {medB.anvisaRegistration}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Situação Regulatória & Categoria
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medA.regulatoryStatus} · {medA.regulatoryCategory}
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medB.regulatoryStatus} · {medB.regulatoryCategory}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Concentrações & Formas Farmacêuticas
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medA.presentations
                  .map((p) => `${p.concentration} (${p.dosageForm} — Via ${p.administrationRoute})`)
                  .join(' | ')}
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medB.presentations
                  .map((p) => `${p.concentration} (${p.dosageForm} — Via ${p.administrationRoute})`)
                  .join(' | ')}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Classificação ATC & OMS AWaRe
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700 dark:text-slate-300">
                ATC: {ingA?.atcCode} ({ingA?.atcVersionConsulted}) · AWaRe: {ingA?.awareClass}
              </td>
              <td className="py-3.5 px-5 font-mono text-slate-700 dark:text-slate-300">
                ATC: {ingB?.atcCode} ({ingB?.atcVersionConsulted}) · AWaRe: {ingB?.awareClass}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Mecanismo de Ação
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                {ingA?.pharmacology.mechanismOfAction}
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                {ingB?.pharmacology.mechanismOfAction}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Indicações & Contexto de Linha Terapêutica
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 space-y-1">
                {medA.indications.map((i) => (
                  <div key={i.id}>
                    <strong>{i.condition}:</strong> {i.treatmentLineContext}
                  </div>
                ))}
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 space-y-1">
                {medB.indications.map((i) => (
                  <div key={i.id}>
                    <strong>{i.condition}:</strong> {i.treatmentLineContext}
                  </div>
                ))}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Posologia Adulto (Bula)
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                {medA.dosageRegimens[0]?.usualDose} (Máx: {medA.dosageRegimens[0]?.maxDose})
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                {medB.dosageRegimens[0]?.usualDose} (Máx: {medB.dosageRegimens[0]?.maxDose})
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Contraindicações Principais
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                {medA.contraindications.map((c) => c.clinicalCondition).join('; ')}
              </td>
              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">
                {medB.contraindications.map((c) => c.clinicalCondition).join('; ')}
              </td>
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-semibold text-slate-700 dark:text-slate-300">
                Segurança do Paciente (Alta Vigilância)
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medA.safetyAlerts.highAlert
                  ? '✖ Medicamento de Alta Vigilância (MAV)'
                  : '● Vigilância Padrão'}{' '}
                · Antídoto: {medA.safetyAlerts.antidote}
              </td>
              <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300">
                {medB.safetyAlerts.highAlert
                  ? '✖ Medicamento de Alta Vigilância (MAV)'
                  : '● Vigilância Padrão'}{' '}
                · Antídoto: {medB.safetyAlerts.antidote}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
