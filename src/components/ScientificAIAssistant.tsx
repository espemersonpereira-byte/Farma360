import React, { useState } from 'react';
import {
  ExternalLink,
  Send,
  ShieldAlert,
  FileCheck2,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DocumentaryReference {
  chunkId: string;
  documentTitle: string;
  institution: string;
  externalIdentifier: string;
  sectionOrigin: string;
  supportingExcerpt: string;
  officialUrl: string;
}

interface RetrievedChunk {
  chunkId: string;
  evidenceCategory: string;
  title: string;
  documentTitle: string;
  institution: string;
  externalIdentifier: string;
  sectionOrigin: string;
  version: string;
  publishedDate: string;
  supportingExcerpt: string;
  structuredContent: string;
  officialUrl: string;
}

interface RagResponse {
  objectiveAnswer: string;
  pharmacologicalFoundation: string;
  availableEvidence: string;
  documentaryReferences: DocumentaryReference[];
  sourceDateOrVersion: string;
  limitations: string;
  safetyAlerts: string[];
  evidenceSufficiency: string;
  queriedAt?: string;
  retrievedChunksCount?: number;
  retrievedChunks?: RetrievedChunk[];
}

const REFERENCE_QUESTIONS = [
  'Qual a posologia pediátrica e o fator de gotejamento documentado em bula para Novalgina 500 mg/mL gotas?',
  'Qual o mecanismo e a conduta clínica para a interação entre Meropeném e Ácido Valproico?',
  'Qual a estabilidade após reconstituição e diluição do Meronem (Pfizer) e por que não pode ser generalizada?',
  'Quais são os ajustes renais da Amoxicilina segundo a bula ANVISA e sua classificação OMS AWaRe?',
  'Qual o efeito de alimentos ricos em Vitamina K e do Ginkgo biloba sobre a Varfarina Sódica (Marevan)?',
  'Existe posologia cadastrada na base validada do Farma360 para Semaglutida (Ozempic)?',
];

export const ScientificAIAssistant: React.FC = () => {
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<RagResponse | null>(null);
  const [showRawChunks, setShowRawChunks] = useState<boolean>(false);

  const handleQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;
    setQuestion(q);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/rag-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao processar consulta científica RAG.');
      } else {
        setResponse(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro de comunicação com o servidor RAG.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Assistente Científico com RAG Documental Real
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Recuperação estruturada de trechos documentais verificados (Bulas ANVISA, Diretrizes
              OMS AWaRe, RENAME e Matriz de Interações). Nenhuma informação clínica é gerada sem
              fonte verificável. O assistente é ferramenta de consulta e não substitui a avaliação profissional.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold">
            <Database className="w-3.5 h-3.5" />
            RAG Baseado em Trechos Documentais
          </span>
        </div>

        {/* Reference Test Questions */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Consultas Clínicas e Farmacológicas de Referência (incluindo teste de ausência na base):
          </div>
          <div className="flex flex-wrap gap-2">
            {REFERENCE_QUESTIONS.map((refQ, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuery(refQ)}
                className="text-left text-xs px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                {refQ}
              </button>
            ))}
          </div>
        </div>

        {/* Query Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleQuery(question);
          }}
          className="flex flex-col sm:flex-row gap-2.5 pt-1"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Digite sua pergunta farmacológica (ex.: posologia, ajuste renal, estabilidade, interação)..."
            className="flex-1 h-12 px-4 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={loading || question.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Recuperando trechos...' : 'Consultar Base Documental'}</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl p-5 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">Falha na Consulta ao Serviço RAG</strong>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Structured Part 7 Response */}
      {response && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Parecer Farmacológico Baseado em Evidência Documental
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold border ${
                  response.evidenceSufficiency.includes('Ausente')
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {response.evidenceSufficiency}
              </span>
              {response.retrievedChunksCount !== undefined && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                  {response.retrievedChunksCount} trechos analisados
                </span>
              )}
            </div>
          </div>

          {/* 1. Resposta Objetiva */}
          <div className="p-5 bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/70 rounded-xl space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
              1. Resposta Objetiva
            </div>
            <p className="text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed font-medium">
              {response.objectiveAnswer}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm">
            {/* 2. Fundamentação Farmacológica */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Fundamentação Farmacológica
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                {response.pharmacologicalFoundation}
              </p>
            </div>

            {/* 3. Evidência Disponível (Bula vs Diretriz vs Estudo vs Off-Label) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Evidência Disponível (Bula Oficial vs. Diretriz vs. Estudo Clínico)
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                {response.availableEvidence}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            {/* 5. Data ou Versão da Fonte */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">5. Data ou Versão da Fonte Consultada</div>
              <p className="font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                {response.sourceDateOrVersion}
              </p>
            </div>

            {/* 6. Limitações */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                6. Limitações Documentais e Restrições de Extrapolação
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{response.limitations}</p>
            </div>
          </div>

          {/* 7. Alertas de Segurança */}
          {response.safetyAlerts && response.safetyAlerts.length > 0 && (
            <div className="bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-xs space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>7. Alertas de Segurança Clínica</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-amber-900 dark:text-amber-200 leading-relaxed">
                {response.safetyAlerts.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Referências Documentais Verificáveis com Trecho de Suporte */}
          <div className="space-y-3">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              4. Referências Documentais e Trechos de Suporte ({response.documentaryReferences?.length || 0})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {response.documentaryReferences?.map((src, i) => (
                <div
                  key={i}
                  className="bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 dark:text-white">{src.documentTitle}</div>
                      <a
                        href={src.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold shrink-0"
                      >
                        <span>Fonte</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      {src.institution} · <strong>{src.sectionOrigin}</strong>
                    </div>
                    {src.supportingExcerpt && (
                      <div className="p-2.5 bg-white dark:bg-slate-900 border-l-2 border-l-blue-600 border border-slate-200 dark:border-slate-800 rounded-r text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        “{src.supportingExcerpt}”
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 pt-1">
                    ID: {src.externalIdentifier} · Chunk: {src.chunkId}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Retrieved Documentary Chunks Inspector */}
          {response.retrievedChunks && response.retrievedChunks.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRawChunks((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {showRawChunks
                    ? 'Ocultar Trechos Brutos Recuperados pelo Índice RAG'
                    : `Inspecionar Trechos Documentais Recuperados no Servidor (${response.retrievedChunks.length} chunks)`}
                </span>
                {showRawChunks ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showRawChunks && (
                <div className="mt-3 space-y-2.5">
                  {response.retrievedChunks.map((chunk) => (
                    <div
                      key={chunk.chunkId}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{chunk.title}</span>
                        <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                          {chunk.chunkId} · {chunk.evidenceCategory}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{chunk.structuredContent}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Trecho Literal: “{chunk.supportingExcerpt}” ({chunk.documentTitle} ·{' '}
                        {chunk.version})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
