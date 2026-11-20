import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  LayoutGrid,
  Play,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  CALCULATOR_DEFINITIONS,
  CalculationResult,
  CalculatorDefinition,
  executeValidatedCalculation,
  runAutomatedCalculatorTestSuite,
} from '../services/calculatorEngine.ts';

function buildCalculationMemory(
  calc: CalculatorDefinition,
  inputs: Record<string, number | string>,
  result: CalculationResult | null
): string[] {
  const steps: string[] = [];
  steps.push(`1. Fórmula de referência: ${calc.formulaExpression}`);
  const paramSummary = calc.fields
    .map((f) => `${f.label} = ${inputs[f.key] ?? '—'} ${f.unit}`)
    .join(' | ');
  steps.push(`2. Parâmetros informados: ${paramSummary}`);
  if (result && result.success) {
    steps.push(
      `3. Substituição e cálculo (${calc.decimalPlaces} casa(s) decimal(is)): Resultado principal = ${result.primaryValue} ${result.primaryUnit}`
    );
    if (result.secondaryResults && result.secondaryResults.length > 0) {
      result.secondaryResults.forEach((sec, idx) => {
        steps.push(`4.${idx + 1}. Parâmetro derivado — ${sec.label}: ${sec.value}`);
      });
    }
  } else if (result && !result.success) {
    steps.push(`3. Validação de segurança interrompeu o cálculo: ${result.error}`);
  }
  return steps;
}

export const CalculatorsModule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedCalcId, setSelectedCalcId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showTestCases, setShowTestCases] = useState(false);

  const activeCalc: CalculatorDefinition =
    CALCULATOR_DEFINITIONS.find((c) => c.id === selectedCalcId) || CALCULATOR_DEFINITIONS[0];

  // Execute real automated test suite dynamically in memory
  const allExecutedTests = useMemo(() => runAutomatedCalculatorTestSuite(), []);
  const activeCalcExecutedTests = useMemo(
    () => runAutomatedCalculatorTestSuite(activeCalc.id),
    [activeCalc.id]
  );

  const totalTestsCount = allExecutedTests.length;
  const totalPassedCount = allExecutedTests.filter((t) => t.passed).length;

  useEffect(() => {
    const defaults: Record<string, number | string> = {};
    for (const f of activeCalc.fields) {
      defaults[f.key] = f.defaultValue;
    }
    setInputs(defaults);
    const initialRes = executeValidatedCalculation(activeCalc.id, defaults);
    setResult(initialRes);
  }, [activeCalc.id]);

  const categories = [
    'Todas',
    'Posologia e Gotejamento',
    'Preparo, Reconstituição e Infusão',
    'Unidades e Físico-Química',
    'Função Orgânica e Superfície Corporal',
  ];

  const filteredCalculators =
    selectedCategory === 'Todas'
      ? CALCULATOR_DEFINITIONS
      : CALCULATOR_DEFINITIONS.filter((c) => c.category === selectedCategory);

  const calculationMemorySteps = useMemo(
    () => buildCalculationMemory(activeCalc, inputs, result),
    [activeCalc, inputs, result]
  );

  const handleRunCalculation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    try {
      const response = await fetch('/api/calculators/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculatorId: activeCalc.id, inputs }),
      });
      if (response.ok) {
        const data: CalculationResult = await response.json();
        setResult(data);
      } else {
        const localFallback = executeValidatedCalculation(activeCalc.id, inputs);
        setResult(localFallback);
      }
    } catch {
      const localFallback = executeValidatedCalculation(activeCalc.id, inputs);
      setResult(localFallback);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleLoadTestCase = (tcInputs: Record<string, number | string>) => {
    setInputs(tcInputs);
    const res = executeValidatedCalculation(activeCalc.id, tcInputs);
    setResult(res);
  };

  // Dedicated Individual Calculator Page View (Sections 11 & 20 #9)
  if (selectedCalcId) {
    return (
      <div className="space-y-6">
        {/* Top Back Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedCalcId(null)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Central de Calculadoras</span>
          </button>

          <div className="flex items-center gap-2">
            <select
              value={activeCalc.id}
              onChange={(e) => setSelectedCalcId(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            >
              {CALCULATOR_DEFINITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {String(c.number).padStart(2, '0')}. {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowTestCases((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100/70 transition-colors"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>
                {showTestCases
                  ? 'Ocultar Testes'
                  : `Testes Executados (${
                      activeCalcExecutedTests.filter((t) => t.passed).length
                    }/${activeCalcExecutedTests.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Dedicated Calculator Console */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                Calculadora #{String(activeCalc.number).padStart(2, '0')} · {activeCalc.category}
              </span>
              <span className="font-mono">
                Precisão: {activeCalc.decimalPlaces} casa(s) decimal(is)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {activeCalc.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {activeCalc.purpose}
            </p>
          </div>

          {/* Explicit Mathematical Formula Box */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Fórmula Matemática Explícita & Referência Metodológica
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1.5 break-words">
              {activeCalc.formulaExpression}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Fonte: {activeCalc.sourceReference}
            </div>
          </div>

          {/* Parameter Inputs Form */}
          <form onSubmit={handleRunCalculation} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCalc.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {field.label}{' '}
                    <span className="font-mono text-slate-400 font-normal">({field.unit})</span>
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={String(inputs[field.key] ?? field.defaultValue)}
                      onChange={(e) => {
                        const updated = { ...inputs, [field.key]: e.target.value };
                        setInputs(updated);
                        setResult(executeValidatedCalculation(activeCalc.id, updated));
                      }}
                      className="w-full h-11 px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        step={field.step ?? 'any'}
                        value={inputs[field.key] ?? ''}
                        onChange={(e) => {
                          const updated = {
                            ...inputs,
                            [field.key]: e.target.value === '' ? '' : Number(e.target.value),
                          };
                          setInputs(updated);
                          setResult(executeValidatedCalculation(activeCalc.id, updated));
                        }}
                        className="w-full h-11 px-3.5 pr-16 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                        {field.unit}
                      </span>
                    </div>
                  )}
                  {field.helperText && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {field.helperText}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isCalculating}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {isCalculating
                    ? 'Processando no servidor...'
                    : 'Executar e Conferir no Servidor'}
                </span>
              </button>
            </div>
          </form>

          {/* Result Readout */}
          {result && (
            <div
              className={`border rounded-xl p-5 space-y-4 ${
                result.success
                  ? 'bg-slate-50/90 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
              }`}
            >
              {result.success ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Resultado Calculado
                      </div>
                      <div className="mt-1 flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {result.primaryValue}
                        </span>
                        <span className="text-sm font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          {result.primaryUnit}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Limites e unidades verificados
                    </span>
                  </div>

                  {result.secondaryResults && result.secondaryResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {result.secondaryResults.map((sec, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-lg"
                        >
                          <div className="text-slate-400">{sec.label}</div>
                          <div className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
                            {sec.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.interpretation && (
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {result.interpretation}
                    </p>
                  )}

                  {/* Step-by-step Calculation Memory (Section 11) */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Memória de Cálculo Passo a Passo
                    </div>
                    <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {calculationMemorySteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {result.safetyAlerts.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Advertências e Cuidados Clínicos:
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {result.safetyAlerts.map((alert, i) => (
                          <li key={i}>{alert}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-sm">
                      Bloqueio de Segurança na Validação de Entrada
                    </strong>
                    <span className="mt-0.5 block leading-relaxed">{result.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Premises and Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-1.5">
                Premissas da Fórmula
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeCalc.premises.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white mb-1.5">
                Limitações Clínicas e Operacionais
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeCalc.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Real Executed Automated Test Cases Drawer */}
          {showTestCases && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Execução de Testes Automatizados Independentes — {activeCalc.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cada caso abaixo executa a função matemática em tempo real e compara o resultado
                    calculado com o valor esperado independente.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeCalcExecutedTests.map((tc, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {tc.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">
                          [{tc.category.toUpperCase()}] {tc.testName}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                        Esperado: <strong>{tc.expectedOutput}</strong> · Calculado:{' '}
                        <strong
                          className={
                            tc.passed
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {tc.actualOutput}
                        </strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadTestCase(tc.inputs)}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 rounded-lg transition-colors self-start sm:self-center shrink-0"
                    >
                      Carregar Parâmetros
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default Hub View: Organized by Categories (Sections 11 & 20 #8-9)
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Central de Cálculos Farmacêuticos
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Calculadoras Farmacêuticas e Clínicas ({CALCULATOR_DEFINITIONS.length} Ferramentas)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Selecione uma categoria ou calculadora para abrir sua página própria com fórmula,
              memória de cálculo, unidades, limitações e testes automatizados.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Testes Executados: {totalPassedCount}/{totalTestsCount} aprovados
            </span>
          </div>
        </div>

        <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Aviso de Segurança Clínica (RDC ANVISA nº 657/2022):</strong> Estas ferramentas
            apoiam o cálculo matemático e a conferência posológica. Nunca utilize fatores
            universais quando a equivalência depender da bula específica do fabricante (ex.:
            gotas/mL ou estabilidade após reconstituição).
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Calculators Grid Organized by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCalculators.map((calc) => {
          const calcTests = allExecutedTests.filter((t) => t.calculatorId === calc.id);
          const passed = calcTests.filter((t) => t.passed).length;
          return (
            <button
              key={calc.id}
              type="button"
              onClick={() => setSelectedCalcId(calc.id)}
              className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-xl p-5 transition-all shadow-xs flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    #{String(calc.number).padStart(2, '0')} · {calc.category}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {calc.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {calc.purpose}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
                <div className="font-mono text-slate-500 dark:text-slate-400 truncate">
                  {calc.formulaExpression}
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    ● {passed}/{calcTests.length} testes executados
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Abrir calculadora →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
