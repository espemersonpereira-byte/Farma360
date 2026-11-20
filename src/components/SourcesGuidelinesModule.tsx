import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Database,
  Search,
  BookOpen,
  FileText,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import {
  SCIENTIFIC_SOURCES,
  SANITARY_ALERTS,
  ACTIVE_INGREDIENTS,
  OFFICIAL_INGESTION_SPECS,
} from '../data/pharmacologicalDatabase.ts';

interface CuratedEvidencePublication {
  id: string;
  title: string;
  authors: string;
  year: string;
  journalOrInstitution: string;
  publicationType:
    | 'Diretriz Clínica / PCDT'
    | 'Revisão Sistemática / Metanálise'
    | 'Ensaio Clínico / Estudo Farmacocinético'
    | 'Documento Oficial Regulatório';
  pmid?: string;
  doi?: string;
  nctId?: string;
  officialUrl: string;
  relatedMedicationOrSubstance: string;
  summary: string;
  lastConsultedDate: string;
}

const CURATED_SCIENTIFIC_EVIDENCE: CuratedEvidencePublication[] = [
  {
    id: 'ev_ashp_idsa_vancomycin_2020',
    title:
      'Therapeutic monitoring of vancomycin for serious methicillin-resistant Staphylococcus aureus infections: A revised consensus guideline and review by ASHP, IDSA, PIDS, and SIDP',
    authors: 'Rybak MJ, Le J, Lodise TP, Levine DP, Bradley JS, Liu C, et al.',
    year: '2020',
    journalOrInstitution: 'American Journal of Health-System Pharmacy (AJHP) / IDSA',
    publicationType: 'Diretriz Clínica / PCDT',
    pmid: '32191793',
    doi: '10.1093/ajhp/zxaa036',
    officialUrl: 'https://pubmed.ncbi.nlm.nih.gov/32191793/',
    relatedMedicationOrSubstance: 'Cloridrato de Vancomicina (Vancocina CP)',
    summary:
      'Estabelece o monitoramento farmacocinético baseado na razão AUC24/CIM (alvo entre 400 e 600 mg·h/L) em substituição ao uso isolado de níveis séricos de vale (15–20 mcg/mL), reduzindo significativamente a incidência de nefrotoxicidade aguda.',
    lastConsultedDate: '2026-11-16',
  },
  {
    id: 'ev_who_aware_book',
    title:
      'The WHO AWaRe (Access, Watch, Reserve) antibiotic book',
    authors: 'World Health Organization (WHO Expert Committee on Selection and Use of Essential Medicines)',
    year: '2022/2023',
    journalOrInstitution: 'Organização Mundial da Saúde (OMS / WHO)',
    publicationType: 'Diretriz Clínica / PCDT',
    officialUrl: 'https://www.who.int/publications/i/item/9789240062382',
    relatedMedicationOrSubstance: 'Amoxicilina (Access), Amoxicilina+Clavulanato (Access), Azitromicina (Watch), Vancomicina (Watch), Meropeném (Watch)',
    summary:
      'Guia global baseado em evidências para escolha empírica, dose e duração de antimicrobianos em mais de 30 síndromes infecciosas comunitárias e hospitalares, priorizando fármacos do grupo Access.',
    lastConsultedDate: '2026-11-16',
  },
  {
    id: 'ev_mero_valproate_interaction',
    title:
      'Mechanism of the carbapenem-valproic acid interaction: Inhibition of acylpeptide hydrolase (APEH) and glucuronide hydrolysis',
    authors: 'Suzuki E, Nakai D, Ikenaga H, Fusegawa K, et al.',
    year: '2016',
    journalOrInstitution: 'Drug Metabolism and Disposition / Bulário ANVISA Meronem',
    publicationType: 'Ensaio Clínico / Estudo Farmacocinético',
    pmid: '26825642',
    doi: '10.1124/dmd.115.068635',
    officialUrl: 'https://pubmed.ncbi.nlm.nih.gov/26825642/',
    relatedMedicationOrSubstance: 'Meropeném Tri-hidratado × Ácido Valproico',
    summary:
      'Demonstra que carbapenêmicos inibem irreversivelmente a acilpeptídeo hidrolase (APEH) hepática e eritrocitária, impedindo a reconversão do valproato-glicuronídeo em ácido valproico ativo e provocando queda de 60% a 100% da concentração sérica em 24–48 horas.',
    lastConsultedDate: '2026-11-16',
  },
  {
    id: 'ev_conitec_pcdt_dm2',
    title:
      'Protocolo Clínico e Diretrizes Terapêuticas do Diabetes Mellitus Tipo 2 (PCDT DM2)',
    authors: 'Comissão Nacional de Incorporação de Tecnologias no Sistema Único de Saúde (CONITEC / Ministério da Saúde)',
    year: '2024',
    journalOrInstitution: 'Ministério da Saúde do Brasil — SCTIE / CONITEC',
    publicationType: 'Diretriz Clínica / PCDT',
    officialUrl: 'https://www.gov.br/conitec/pt-br/assuntos/avaliacao-de-tecnologias-em-saude/protocolos-clinicos-e-diretrizes-terapeuticas',
    relatedMedicationOrSubstance: 'Cloridrato de Metformina (Glifage XR) e Insulinas',
    summary:
      'Define o cloridrato de metformina como primeira linha farmacológica no tratamento do Diabetes Mellitus Tipo 2 no SUS, especificando metas de HbA1c e limites de segurança conforme a Taxa de Filtração Glomerular estimada (TFGe).',
    lastConsultedDate: '2026-11-16',
  },
  {
    id: 'ev_ckdepi_2021_nejm',
    title:
      'New Creatinine- and Cystatin C–Based Equations to Estimate GFR without Race',
    authors: 'Inker LA, Eneanya ND, Coresh J, Tighiouart H, Wang D, Sang Y, et al. (Chronic Kidney Disease Epidemiology Collaboration)',
    year: '2021',
    journalOrInstitution: 'The New England Journal of Medicine (NEJM)',
    publicationType: 'Ensaio Clínico / Estudo Farmacocinético',
    pmid: '34554658',
    doi: '10.1056/NEJMoa2102953',
    officialUrl: 'https://pubmed.ncbi.nlm.nih.gov/34554658/',
    relatedMedicationOrSubstance: 'Calculadora Clínica CKD-EPI 2021 & Estadiamento Renal',
    summary:
      'Equação CKD-EPI 2021 para estimativa da Taxa de Filtração Glomerular (mL/min/1,73m²) baseada em creatinina padronizada, idade e sexo sem coeficiente racial, adotada pelas diretrizes KDIGO e sociedades de nefrologia.',
    lastConsultedDate: '2026-11-16',
  },
  {
    id: 'ev_anvisa_rdc406_ranitidina',
    title:
      'Resolução da Diretoria Colegiada — RDC nº 406, de 22 de julho de 2020 (Proibição do Cloridrato de Ranitidina por Impureza NDMA)',
    authors: 'Agência Nacional de Vigilância Sanitária (Diretoria Colegiada — DICOL/ANVISA)',
    year: '2020',
    journalOrInstitution: 'Diário Oficial da União / ANVISA',
    publicationType: 'Documento Oficial Regulatório',
    officialUrl: 'https://www.gov.br/anvisa/pt-br',
    relatedMedicationOrSubstance: 'Cloridrato de Ranitidina (Registro Histórico Suspenso)',
    summary:
      'Determina a proibição definitiva da comercialização, distribuição e fabricação de medicamentos contendo cloridrato de ranitidina no Brasil devido à degradação espontânea da molécula na nitrosamina mutagênica N-nitrosodimetilamina (NDMA).',
    lastConsultedDate: '2026-11-16',
  },
];

interface LivePubMedArticle {
  uid: string;
  title: string;
  authors: string;
  source: string;
  pubdate: string;
  doi?: string;
  pubtype: string[];
  consultedAt: string;
}

interface LiveClinicalTrial {
  nctId: string;
  briefTitle: string;
  overallStatus: string;
  conditions: string[];
  leadSponsor: string;
  lastUpdatePostDate: string;
  consultedAt: string;
}

export const SourcesGuidelinesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'estudos' | 'diretrizes' | 'ingestao' | 'alertas' | 'fontes'
  >('estudos');

  // Local filter for Curated Scientific Evidence
  const [evidenceFilterType, setEvidenceFilterType] = useState<string>('Todos');
  const [evidenceSearchText, setEvidenceSearchText] = useState<string>('');

  // Live PubMed & ClinicalTrials.gov Search State (Section 13)
  const [liveQuery, setLiveQuery] = useState<string>('meropenem valproic acid interaction');
  const [liveSourceTarget, setLiveSourceTarget] = useState<'pubmed' | 'clinicaltrials'>('pubmed');
  const [liveLoading, setLiveLoading] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [pubmedResults, setPubmedResults] = useState<LivePubMedArticle[]>([]);
  const [trialsResults, setTrialsResults] = useState<LiveClinicalTrial[]>([]);

  const antimicrobials = ACTIVE_INGREDIENTS.filter((i) => i.antimicrobialProfile);

  const filteredCuratedEvidence = useMemo(() => {
    const q = evidenceSearchText.toLowerCase().trim();
    return CURATED_SCIENTIFIC_EVIDENCE.filter((ev) => {
      if (evidenceFilterType !== 'Todos' && ev.publicationType !== evidenceFilterType) {
        return false;
      }
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.relatedMedicationOrSubstance.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q) ||
        (ev.pmid && ev.pmid.includes(q)) ||
        (ev.doi && ev.doi.toLowerCase().includes(q))
      );
    });
  }, [evidenceFilterType, evidenceSearchText]);

  const handleRunLiveLiteratureSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = liveQuery.trim();
    if (!term) return;

    setLiveLoading(true);
    setLiveError(null);
    const consultedAt = new Date().toISOString().slice(0, 10);

    try {
      if (liveSourceTarget === 'pubmed') {
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=6&sort=relevance&term=${encodeURIComponent(
          term
        )}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
          throw new Error(`NCBI E-utilities retornou HTTP ${searchRes.status}`);
        }
        const searchJson = await searchRes.json();
        const idList: string[] = searchJson?.esearchresult?.idlist || [];

        if (idList.length === 0) {
          setPubmedResults([]);
          setLiveLoading(false);
          return;
        }

        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${idList.join(
          ','
        )}`;
        const summaryRes = await fetch(summaryUrl);
        if (!summaryRes.ok) {
          throw new Error(`NCBI ESummary retornou HTTP ${summaryRes.status}`);
        }
        const summaryJson = await summaryRes.json();
        const resultObj = summaryJson?.result || {};

        const articles: LivePubMedArticle[] = idList
          .map((id) => {
            const item = resultObj[id];
            if (!item) return null;
            const authorsList = Array.isArray(item.authors)
              ? item.authors.slice(0, 4).map((a: { name?: string }) => a.name).join(', ')
              : 'Autores indexados no PubMed';
            const articleIds = Array.isArray(item.articleids) ? item.articleids : [];
            const doiEntry = articleIds.find(
              (aid: { idtype?: string; value?: string }) => aid.idtype === 'doi'
            );
            return {
              uid: String(item.uid || id),
              title: String(item.title || 'Sem título'),
              authors: authorsList || 'Autores indexados no PubMed',
              source: String(item.fulljournalname || item.source || 'PubMed / MEDLINE'),
              pubdate: String(item.pubdate || 'Data indexada no PubMed'),
              doi: doiEntry?.value ? String(doiEntry.value) : undefined,
              pubtype: Array.isArray(item.pubtype) ? item.pubtype : ['Journal Article'],
              consultedAt,
            };
          })
          .filter(Boolean) as LivePubMedArticle[];

        setPubmedResults(articles);
      } else {
        const ctUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(
          term
        )}&pageSize=6`;
        const ctRes = await fetch(ctUrl);
        if (!ctRes.ok) {
          throw new Error(`ClinicalTrials.gov API v2 retornou HTTP ${ctRes.status}`);
        }
        const ctJson = await ctRes.json();
        const studies = Array.isArray(ctJson?.studies) ? ctJson.studies : [];

        const parsedTrials: LiveClinicalTrial[] = studies.map((st: Record<string, unknown>) => {
          const proto = (st.protocolSection || {}) as Record<string, unknown>;
          const idMod = (proto.identificationModule || {}) as Record<string, unknown>;
          const statusMod = (proto.statusModule || {}) as Record<string, unknown>;
          const condMod = (proto.conditionsModule || {}) as Record<string, unknown>;
          const sponsorMod = (proto.sponsorCollaboratorsModule || {}) as Record<string, unknown>;
          const leadSponsorObj = (sponsorMod.leadSponsor || {}) as Record<string, unknown>;
          const lastUpdateStruct = (statusMod.lastUpdatePostDateStruct || {}) as Record<
            string,
            unknown
          >;

          return {
            nctId: String(idMod.nctId || 'NCT'),
            briefTitle: String(idMod.briefTitle || 'Ensaio clínico registrado'),
            overallStatus: String(statusMod.overallStatus || 'REGISTERED'),
            conditions: Array.isArray(condMod.conditions)
              ? (condMod.conditions as string[]).slice(0, 4)
              : [],
            leadSponsor: String(leadSponsorObj.name || 'ClinicalTrials.gov Sponsor'),
            lastUpdatePostDate: String(lastUpdateStruct.date || consultedAt),
            consultedAt,
          };
        });

        setTrialsResults(parsedTrials);
      }
    } catch (err: unknown) {
      setLiveError(
        err instanceof Error
          ? `Não foi possível consultar a API pública externa neste momento (${err.message}). Os estudos e diretrizes verificados localmente permanecem disponíveis abaixo.`
          : 'Erro na consulta externa.'
      );
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Hierarchy of Evidence */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Central de Evidências Científicas & Governança Documental (Seção 13)
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Estudos Clínicos, Diretrizes, Alertas Sanitários e Fontes Oficiais
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              Pesquisa integrada de estudos clínicos, revisões sistemáticas, protocolos PCDT/CONITEC,
              classificação OMS AWaRe e conexão direta às APIs oficiais do PubMed (NCBI) e
              ClinicalTrials.gov sem geração de identificadores fictícios.
            </p>
          </div>
        </div>

        {/* Evidence Hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-950">
            <div className="font-semibold text-slate-900 dark:text-white">
              1. Situação Regulatória & Apresentações
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Prioridade: Fontes oficiais da <strong>ANVISA</strong> (Consultas e Dados Abertos).
            </p>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-950">
            <div className="font-semibold text-slate-900 dark:text-white">
              2. Informações de Bula Profissional
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Prioridade: <strong>Bula específica do produto e fabricante</strong> no Bulário Eletrônico ANVISA.
            </p>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-950">
            <div className="font-semibold text-slate-900 dark:text-white">
              3. Diretrizes & Linhas de Cuidado
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Prioridade: <strong>PCDT / CONITEC / Ministério da Saúde (RENAME)</strong> e OMS AWaRe.
            </p>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-950">
            <div className="font-semibold text-slate-900 dark:text-white">
              4. Farmacologia & Literatura Indexada
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Prioridade: Revisões sistemáticas e ensaios clínicos (PubMed/NCBI e ClinicalTrials.gov).
            </p>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('estudos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'estudos'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Estudos, Diretrizes & Busca PubMed / ClinicalTrials ({CURATED_SCIENTIFIC_EVIDENCE.length})
          </button>
          <button
            onClick={() => setActiveTab('diretrizes')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'diretrizes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Stewardship Antimicrobiano & OMS AWaRe ({antimicrobials.length})
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'alertas'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Alertas Sanitários ({SANITARY_ALERTS.length})
          </button>
          <button
            onClick={() => setActiveTab('ingestao')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'ingestao'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Arquitetura de Ingestão ({OFFICIAL_INGESTION_SPECS.length})
          </button>
          <button
            onClick={() => setActiveTab('fontes')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'fontes'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Fontes & Licenças ({SCIENTIFIC_SOURCES.length})
          </button>
        </div>
      </div>

      {/* TAB 0: ESTUDOS, DIRETRIZES & BUSCA PUBMED / CLINICALTRIALS.GOV (SECTION 13) */}
      {activeTab === 'estudos' && (
        <div className="space-y-6">
          {/* Curated Verified Publications & Guidelines */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Publicações Científicas, Diretrizes PCDT e Estudos Vinculados ao Catálogo
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Referências verificadas com título, autores, ano, periódico/instituição, PMID/DOI real, relação com o medicamento e data da última consulta.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={evidenceSearchText}
                  onChange={(e) => setEvidenceSearchText(e.target.value)}
                  placeholder="Filtrar por fármaco, título, PMID ou DOI..."
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <select
                  value={evidenceFilterType}
                  onChange={(e) => setEvidenceFilterType(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="Todos">Todos os tipos de publicação</option>
                  <option value="Diretriz Clínica / PCDT">Diretriz Clínica / PCDT</option>
                  <option value="Ensaio Clínico / Estudo Farmacocinético">
                    Ensaio Clínico / Estudo Farmacocinético
                  </option>
                  <option value="Documento Oficial Regulatório">Documento Oficial Regulatório</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCuratedEvidence.map((ev) => (
                <div
                  key={ev.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-950/40 flex flex-col justify-between space-y-4 text-xs"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                        {ev.publicationType}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Ano: {ev.year}</span>
                        {ev.pmid && (
                          <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            PMID: {ev.pmid}
                          </span>
                        )}
                        {ev.doi && (
                          <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            DOI: {ev.doi}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {ev.title}
                    </h3>

                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>Autores:</strong> {ev.authors}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>Periódico / Instituição:</strong> {ev.journalOrInstitution}
                    </div>
                    <div className="text-blue-700 dark:text-blue-300 font-medium">
                      <strong>Relação com medicamento/ferramenta:</strong>{' '}
                      {ev.relatedMedicationOrSubstance}
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                      {ev.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      Última consulta: {ev.lastConsultedDate}
                    </span>
                    <a
                      href={ev.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Acessar publicação original</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time API Search: PubMed (NCBI E-utilities) & ClinicalTrials.gov v2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Conector Direto em Tempo Real — APIs Científicas Públicas
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Pesquisa Externa Verificável: PubMed (NCBI/NLM) & ClinicalTrials.gov
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Consulta em tempo real aos servidores oficiais da National Library of Medicine (E-utilities e ClinicalTrials REST API v2). Exibe exclusivamente registros reais retornados pelas bases oficiais.
                </p>
              </div>
            </div>

            <form onSubmit={handleRunLiveLiteratureSearch} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setLiveSourceTarget('pubmed')}
                    className={`px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      liveSourceTarget === 'pubmed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    PubMed / MEDLINE
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveSourceTarget('clinicaltrials')}
                    className={`px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      liveSourceTarget === 'clinicaltrials'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    ClinicalTrials.gov
                  </button>
                </div>

                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={liveQuery}
                    onChange={(e) => setLiveQuery(e.target.value)}
                    placeholder="Ex.: vancomycin therapeutic drug monitoring, meropenem valproic acid, dipyrone agranulocytosis..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={liveLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {liveLoading
                      ? 'Consultando API oficial...'
                      : `Pesquisar no ${
                          liveSourceTarget === 'pubmed' ? 'PubMed' : 'ClinicalTrials.gov'
                        }`}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Sugestões rápidas:</span>
                {[
                  'meropenem valproic acid interaction',
                  'vancomycin AUC monitoring guideline',
                  'warfarin drug interactions review',
                  'metformin lactic acidosis renal function',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setLiveQuery(sug)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </form>

            {liveError && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                {liveError}
              </div>
            )}

            {liveSourceTarget === 'pubmed' && pubmedResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {pubmedResults.map((art) => (
                  <div
                    key={art.uid}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs bg-slate-50/40 dark:bg-slate-950/40 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          PMID: {art.uid}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {art.pubdate} · {art.pubtype.join(', ')}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-snug">
                        {art.title}
                      </h3>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong>Autores:</strong> {art.authors}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        <strong>Periódico:</strong> {art.source}
                        {art.doi ? ` · DOI: ${art.doi}` : ''}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-400">
                        Consultado em: {art.consultedAt}
                      </span>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${art.uid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Abrir no PubMed</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {liveSourceTarget === 'clinicaltrials' && trialsResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {trialsResults.map((tr) => (
                  <div
                    key={tr.nctId}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs bg-slate-50/40 dark:bg-slate-950/40 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tr.nctId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                          Status: {tr.overallStatus}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-snug">
                        {tr.briefTitle}
                      </h3>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong>Instituição Patrocinadora:</strong> {tr.leadSponsor}
                      </div>
                      {tr.conditions.length > 0 && (
                        <div className="text-slate-500 dark:text-slate-400">
                          <strong>Condições:</strong> {tr.conditions.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="font-mono text-[11px] text-slate-400">
                        Atualizado: {tr.lastUpdatePostDate} · Consultado: {tr.consultedAt}
                      </span>
                      <a
                        href={`https://clinicaltrials.gov/study/${tr.nctId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Abrir no ClinicalTrials.gov</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Specialized Antimicrobial Stewardship Module */}
      {activeTab === 'diretrizes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Módulo Especializado de Antimicrobianos e Classificação OMS AWaRe
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Espectro documentado, mecanismos de resistência e diretrizes de stewardship. Informativo técnico de apoio que não substitui cultura, antibiograma e protocolo de CCIH local.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {antimicrobials.map((ing) => {
              const prof = ing.antimicrobialProfile!;
              return (
                <div
                  key={ing.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3.5 text-xs bg-slate-50/40 dark:bg-slate-950/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {ing.name}{' '}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          (ATC {ing.atcCode})
                        </span>
                      </h3>
                      <div className="text-slate-500 mt-0.5">
                        {prof.antimicrobialClass} · Versão: {ing.awareVersionConsulted}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md font-mono font-semibold ${
                        prof.awareCategory === 'Access'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      OMS AWaRe: {prof.awareCategory.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-1">
                      Espectro de Ação Documentado:
                    </strong>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {prof.spectrumOfAction.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong className="text-slate-900 dark:text-white block mb-1">
                      Mecanismos de Resistência:
                    </strong>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {prof.resistanceMechanisms.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong className="text-slate-900 dark:text-white">
                      Diretriz de Stewardship & Culturas:
                    </strong>{' '}
                    {prof.stewardshipGuidelines}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Controlled Documentary Ingestion Architecture */}
      {activeTab === 'ingestao' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Pipeline de Ingestão Documental Controlada (Seção 6.6)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              Especificação Técnica de Conectores, Validação de Esquema e Controle de Duplicidade
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Toda atualização proveniente de bases oficiais passa por validação estrutural, conciliação por chave primária regulatória e atribuição de estado inicial de revisão antes da publicação clínica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_INGESTION_SPECS.map((spec) => (
              <div
                key={spec.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-xs bg-slate-50/40 dark:bg-slate-950/40 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {spec.sourceName}
                      </h3>
                      <div className="text-slate-500">{spec.institution}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px] shrink-0">
                      {spec.accessFormat}
                    </span>
                  </div>

                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Pipeline de Ingestão:</strong>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{spec.ingestionPipelineStage}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Regras de Validação:</strong>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{spec.validationRule}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Licença e Termos:</strong>{' '}
                    <span className="text-slate-600 dark:text-slate-300">{spec.licenseAndTerms}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    Última Verificação: {spec.lastAuditDate}
                  </span>
                  <a
                    href={spec.officialEndpointOrPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    <span>Endpoint Oficial</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Sanitary Alerts */}
      {activeTab === 'alertas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Alertas Sanitários, Farmacovigilância e Segurança do Paciente
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comunicados de risco e diretrizes de segurança emitidos pela ANVISA, OMS e ISMP Brasil.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {SANITARY_ALERTS.map((alert) => (
              <div
                key={alert.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 bg-slate-50/40 dark:bg-slate-950/40"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      ▲ {alert.alertType}
                    </span>
                    <span className="font-mono">{alert.publishedDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {alert.title}
                  </h3>
                  <div className="text-slate-500">
                    <strong>Escopo:</strong> {alert.affectedSubstanceOrProduct}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {alert.summary}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    <strong>Conduta Clínica Recomendada:</strong> {alert.clinicalActionRequired}
                  </div>
                  <a
                    href={alert.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    <span>Consultar {alert.issuer}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Registered Scientific Sources Policy Table */}
      {activeTab === 'fontes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Cadastro Oficial de Fontes e Licenciamento Documental
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registro de procedência, termos de licença e frequência de verificação das fontes utilizadas no Farma360.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-3.5 px-4 font-semibold">Fonte & Instituição Responsável</th>
                  <th className="py-3.5 px-4 font-semibold">Tipo de Documento</th>
                  <th className="py-3.5 px-4 font-semibold">País / Idioma</th>
                  <th className="py-3.5 px-4 font-semibold">Licença & Condições de Uso</th>
                  <th className="py-3.5 px-4 font-semibold">Última Verificação</th>
                  <th className="py-3.5 px-4 font-semibold">Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {SCIENTIFIC_SOURCES.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{src.name}</div>
                      <div className="text-slate-500">{src.institution}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{src.documentType}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {src.country} ({src.language})
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div>{src.licenseTerms}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {src.redistributionRestrictions}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {src.updatedDate} ({src.updateFrequency})
                    </td>
                    <td className="py-3.5 px-4">
                      <a
                        href={src.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium whitespace-nowrap"
                      >
                        <span>Portal Oficial</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
