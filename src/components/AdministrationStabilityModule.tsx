import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { MEDICATION_PRODUCTS } from '../data/pharmacologicalDatabase.ts';
import { ProvenanceBlock } from './ProvenanceBlock.tsx';

interface Props {
  onSelectMedication: (medId: string) => void;
}

export const AdministrationStabilityModule: React.FC<Props> = ({ onSelectMedication }) => {
  const productsWithPrep = MEDICATION_PRODUCTS.filter((m) =>
    m.presentations.some((p) => p.reconstitutionAndDilution)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            Farmácia Hospitalar & Terapia Infusional
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Administração, Reconstituição, Diluição e Estabilidade
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Parâmetros físico-químicos vinculados estritamente à apresentação comercial e ao fabricante detentor do registro ANVISA.
          </p>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Regra de Segurança Físico-Química:</strong> Não generalize dados de estabilidade ou compatibilidade em Y de um fabricante para outros produtos com o mesmo princípio ativo, devido a diferenças em excipientes, tampões de pH e processo de liofilização.
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {productsWithPrep.map((med) =>
          med.presentations
            .filter((p) => p.reconstitutionAndDilution)
            .map((pres) => {
              const guide = pres.reconstitutionAndDilution!;
              return (
                <div
                  key={pres.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs text-slate-500">
                        Produto: <strong className="text-slate-800 dark:text-slate-200">{med.commercialName}</strong> · Fabricante: {med.manufacturer} ({med.manufacturerCnpj}) · Reg. ANVISA <span className="font-mono">{med.anvisaRegistration}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {med.genericDesignation} — {pres.concentration} ({pres.dosageForm})
                      </h2>
                    </div>
                    <button
                      onClick={() => onSelectMedication(med.id)}
                      className="px-4 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors"
                    >
                      Abrir Ficha Farmacológica
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50/70 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        1. Reconstituição & Diluição
                      </div>
                      <div><strong>Diluente de Reconstituição:</strong> {guide.reconstitutionDiluent}</div>
                      <div><strong>Volume de Reconstituição:</strong> {guide.reconstitutionVolume}</div>
                      <div><strong>Diluentes de Infusão:</strong> {guide.compatibleDiluents.join(', ')}</div>
                      <div><strong>Concentração Final:</strong> {guide.finalConcentration}</div>
                    </div>

                    <div className="bg-slate-50/70 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        2. Estabilidade por Temperatura
                      </div>
                      <div><strong>Pós-Reconstituição:</strong> {guide.stabilityAfterReconstitution}</div>
                      <div><strong>Pós-Diluição:</strong> {guide.stabilityAfterDilution}</div>
                      <div><strong>Armazenamento Fechado:</strong> {guide.storageTemperature}</div>
                      <div>
                        <strong>Fotossensível:</strong> {guide.photosensitivity ? 'Sim' : 'Não'} ·{' '}
                        <strong>Termolábil:</strong> {guide.thermolability ? 'Sim' : 'Não'}
                      </div>
                    </div>

                    <div className="bg-slate-50/70 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        3. Velocidade & Conexão em Y
                      </div>
                      <div><strong>Tempo/Velocidade:</strong> {guide.infusionRate}</div>
                      <div className="text-emerald-700 dark:text-emerald-400">
                        <strong>● Compatível em Y:</strong> {guide.ySiteCompatibility.join(', ')}
                      </div>
                      <div className="text-rose-700 dark:text-rose-400">
                        <strong>✖ Incompatível em Y:</strong> {guide.ySiteIncompatibility.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <strong>Restrição Específica do Fabricante:</strong> {guide.manufacturerSpecificNotice}
                  </div>

                  <ProvenanceBlock provenance={guide.provenance} compact />
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};
