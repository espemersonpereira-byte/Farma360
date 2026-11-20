export interface CalculatorField {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string;
  options?: { value: string; label: string }[];
  helperText?: string;
}

export interface CalculatorTestSpec {
  name: string;
  category: 'normal' | 'minimo' | 'maximo' | 'invalido' | 'vazio' | 'limite';
  inputs: Record<string, number | string>;
  expectSuccess: boolean;
  expectedPrimaryValue?: string;
  expectedErrorSubstring?: string;
}

export interface ExecutedCalculatorTestResult {
  calculatorId: string;
  calculatorNumber: number;
  calculatorName: string;
  testName: string;
  category: CalculatorTestSpec['category'];
  inputs: Record<string, number | string>;
  expectSuccess: boolean;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
}

export interface CalculatorDefinition {
  id: string;
  number: number;
  name: string;
  category:
    | 'Posologia e Gotejamento'
    | 'Preparo, Reconstituição e Infusão'
    | 'Unidades e Físico-Química'
    | 'Função Orgânica e Superfície Corporal';
  purpose: string;
  formulaExpression: string;
  premises: string[];
  limitations: string[];
  safetyWarnings: string[];
  sourceReference: string;
  decimalPlaces: number;
  fields: CalculatorField[];
  testSpecs: CalculatorTestSpec[];
}

export interface CalculationResult {
  calculatorId: string;
  success: boolean;
  primaryValue?: string;
  primaryUnit?: string;
  secondaryResults?: { label: string; value: string }[];
  interpretation?: string;
  safetyAlerts: string[];
  error?: string;
}

export const CALCULATOR_DEFINITIONS: CalculatorDefinition[] = [
  {
    id: 'calc_1_gotas_para_ml',
    number: 1,
    name: 'Conversão de Gotas para mL',
    category: 'Posologia e Gotejamento',
    purpose:
      'Converter um número prescrito de gotas para o volume correspondente em mililitros (mL) com base no fator de gotejamento específico do produto/frasco.',
    formulaExpression: 'Volume (mL) = Número de Gotas / Fator de Gotejamento do Produto (gotas/mL)',
    premises: [
      'O fator de gotejamento depende da tensão superficial, densidade da solução e geometria do gotejador do fabricante específico.',
    ],
    limitations: [
      'Proibido assumir 20 gotas/mL universalmente sem conferir a bula do fabricante específico.',
    ],
    safetyWarnings: [
      'Não presumir que todos os medicamentos possuem 20 gotas por mL. Confira sempre a seção "Posologia e Modo de Usar" da bula do fabricante.',
    ],
    sourceReference:
      'Farmacopeia Brasileira 6ª Edição (ANVISA) — Determinação de Volume e Gotejamento',
    decimalPlaces: 2,
    fields: [
      {
        key: 'drops',
        label: 'Quantidade de Gotas',
        unit: 'gotas',
        type: 'number',
        min: 1,
        max: 5000,
        step: 1,
        defaultValue: 30,
      },
      {
        key: 'dropsPerMl',
        label: 'Fator do Gotejador (Conforme Bula do Produto)',
        unit: 'gotas/mL',
        type: 'number',
        min: 5,
        max: 60,
        step: 1,
        defaultValue: 20,
        helperText:
          'Ex.: Novalgina 500 mg/mL (Sanofi) = 20 gotas/mL. Informe o fator exato da bula.',
      },
    ],
    testSpecs: [
      {
        name: 'Caso normal (30 gotas com fator 20 gotas/mL)',
        category: 'normal',
        inputs: { drops: 30, dropsPerMl: 20 },
        expectSuccess: true,
        expectedPrimaryValue: '1.50',
      },
      {
        name: 'Caso limite (solução 35 gotas/mL — 70 gotas)',
        category: 'limite',
        inputs: { drops: 70, dropsPerMl: 35 },
        expectSuccess: true,
        expectedPrimaryValue: '2.00',
      },
      {
        name: 'Entrada inválida (fator zero bloqueado)',
        category: 'invalido',
        inputs: { drops: 20, dropsPerMl: 0 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
      {
        name: 'Campo vazio (bloqueio de segurança)',
        category: 'vazio',
        inputs: { drops: '', dropsPerMl: 20 },
        expectSuccess: false,
        expectedErrorSubstring: 'Valor ausente',
      },
    ],
  },
  {
    id: 'calc_2_ml_para_gotas',
    number: 2,
    name: 'Conversão de mL para Gotas',
    category: 'Posologia e Gotejamento',
    purpose:
      'Converter um volume em mililitros (mL) para o número exato de gotas utilizando o fator de equivalência documentado na bula do produto.',
    formulaExpression: 'Gotas = Volume (mL) × Fator de Gotejamento do Produto (gotas/mL)',
    premises: ['Utiliza exclusivamente o fator gotas/mL declarado pelo detentor do registro.'],
    limitations: ['Frasco mantido na posição exigida pela bula (geralmente vertical a 90°).'],
    safetyWarnings: [
      'Variações na inclinação do frasco gotejador podem alterar o volume da gota em até 25%.',
    ],
    sourceReference: 'Farmacopeia Brasileira 6ª Edição (ANVISA)',
    decimalPlaces: 1,
    fields: [
      {
        key: 'volumeMl',
        label: 'Volume a Converter',
        unit: 'mL',
        type: 'number',
        min: 0.05,
        max: 200,
        step: 0.05,
        defaultValue: 1.5,
      },
      {
        key: 'dropsPerMl',
        label: 'Fator do Gotejador da Bula',
        unit: 'gotas/mL',
        type: 'number',
        min: 5,
        max: 60,
        step: 1,
        defaultValue: 20,
      },
    ],
    testSpecs: [
      {
        name: 'Caso normal (1.5 mL a 20 gotas/mL)',
        category: 'normal',
        inputs: { volumeMl: 1.5, dropsPerMl: 20 },
        expectSuccess: true,
        expectedPrimaryValue: '30.0',
      },
      {
        name: 'Caso fracionário (0.33 mL a 20 gotas/mL)',
        category: 'limite',
        inputs: { volumeMl: 0.33, dropsPerMl: 20 },
        expectSuccess: true,
        expectedPrimaryValue: '6.6',
      },
      {
        name: 'Volume negativo inválido',
        category: 'invalido',
        inputs: { volumeMl: -1, dropsPerMl: 20 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_3_dose_por_peso',
    number: 3,
    name: 'Dose por Peso Corporal',
    category: 'Posologia e Gotejamento',
    purpose:
      'Calcular a dose individual e a dose diária total (em mg) com base no peso corporal aferido do paciente e verificar o teto máximo documentado.',
    formulaExpression: 'Dose (mg) = Peso Corporal (kg) × Dose Prescrita (mg/kg)',
    premises: ['Peso corporal real ou ajustado conforme diretriz clínica do fármaco.'],
    limitations: [
      'Em pacientes obesos ou crianças > 40-50 kg, a dose calculada por kg nunca deve ultrapassar a dose máxima de adulto sem justificativa específica.',
    ],
    safetyWarnings: [
      'Trava de segurança ativa: se a dose calculada exceder o teto máximo informado, o sistema sinaliza alerta crítico de sobredose.',
    ],
    sourceReference: 'Formulário Terapêutico Nacional (MS) & Diretrizes ISMP Brasil',
    decimalPlaces: 2,
    fields: [
      {
        key: 'weightKg',
        label: 'Peso Corporal',
        unit: 'kg',
        type: 'number',
        min: 0.5,
        max: 300,
        step: 0.1,
        defaultValue: 70,
      },
      {
        key: 'doseMgPerKg',
        label: 'Dose Referencial',
        unit: 'mg/kg/dose',
        type: 'number',
        min: 0.01,
        max: 500,
        step: 0.1,
        defaultValue: 15,
      },
      {
        key: 'dosesPerDay',
        label: 'Frequência Diária',
        unit: 'doses/dia',
        type: 'number',
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 4,
      },
      {
        key: 'maxSingleDoseMg',
        label: 'Teto Máximo por Dose (Bula)',
        unit: 'mg',
        type: 'number',
        min: 1,
        max: 10000,
        step: 10,
        defaultValue: 1000,
      },
    ],
    testSpecs: [
      {
        name: 'Caso normal (70 kg × 15 mg/kg)',
        category: 'normal',
        inputs: { weightKg: 70, doseMgPerKg: 15, dosesPerDay: 4, maxSingleDoseMg: 1000 },
        expectSuccess: true,
        expectedPrimaryValue: '1050.00',
      },
      {
        name: 'Caso mínimo neonatal (2 kg × 10 mg/kg)',
        category: 'minimo',
        inputs: { weightKg: 2, doseMgPerKg: 10, dosesPerDay: 3, maxSingleDoseMg: 500 },
        expectSuccess: true,
        expectedPrimaryValue: '20.00',
      },
      {
        name: 'Peso acima do limite máximo (400 kg)',
        category: 'invalido',
        inputs: { weightKg: 400, doseMgPerKg: 15, dosesPerDay: 4, maxSingleDoseMg: 1000 },
        expectSuccess: false,
        expectedErrorSubstring: 'excede o limite máximo',
      },
    ],
  },
  {
    id: 'calc_4_dose_pediatrica',
    number: 4,
    name: 'Dose Pediátrica e Volume de Suspensão Oral',
    category: 'Posologia e Gotejamento',
    purpose:
      'Calcular a dose diária pediátrica (mg/kg/dia), a dose por tomada (mg) e o volume exato em mL a aspirar na seringa dosadora conforme concentração específica da suspensão.',
    formulaExpression:
      'Volume por Tomada (mL) = [ (Peso kg × Dose mg/kg/dia) / Nº de Tomadas Diárias ] / Concentração (mg/mL)',
    premises: [
      'Não presume que todos os frascos possuem a mesma concentração; exige entrada explícita em mg/mL (ex.: 250 mg/5 mL = 50 mg/mL).',
    ],
    limitations: ['Não substitui tabelas específicas de prematuridade ou ajuste renal neonatal.'],
    safetyWarnings: [
      'Atenção a suspensões pediátricas com múltiplas concentrações comerciais (ex.: Amoxicilina 250 mg/5 mL vs 400 mg/5 mL).',
    ],
    sourceReference:
      'Sociedade Brasileira de Pediatria (SBP) & ISMP Brasil — Erros de Medicação em Pediatria',
    decimalPlaces: 2,
    fields: [
      {
        key: 'weightKg',
        label: 'Peso da Criança',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 80,
        step: 0.1,
        defaultValue: 15,
      },
      {
        key: 'dailyDoseMgKg',
        label: 'Regime Posológico Diário',
        unit: 'mg/kg/dia',
        type: 'number',
        min: 1,
        max: 200,
        step: 1,
        defaultValue: 50,
      },
      {
        key: 'dosesPerDay',
        label: 'Divisão Diária (ex.: 3x para 8/8h)',
        unit: 'tomadas/dia',
        type: 'number',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
      },
      {
        key: 'concentrationMgMl',
        label: 'Concentração da Suspensão Reconstituída',
        unit: 'mg/mL',
        type: 'number',
        min: 1,
        max: 500,
        step: 1,
        defaultValue: 50,
        helperText: 'Ex.: 250 mg/5 mL equivale a 50 mg/mL',
      },
    ],
    testSpecs: [
      {
        name: 'Amoxicilina 15 kg a 50 mg/kg/dia de 8/8h em suspensão 50 mg/mL',
        category: 'normal',
        inputs: { weightKg: 15, dailyDoseMgKg: 50, dosesPerDay: 3, concentrationMgMl: 50 },
        expectSuccess: true,
        expectedPrimaryValue: '5.00',
      },
      {
        name: 'Dose alta OMA (12 kg a 90 mg/kg/dia 12/12h em 80 mg/mL)',
        category: 'limite',
        inputs: { weightKg: 12, dailyDoseMgKg: 90, dosesPerDay: 2, concentrationMgMl: 80 },
        expectSuccess: true,
        expectedPrimaryValue: '6.75',
      },
      {
        name: 'Concentração inválida zero',
        category: 'invalido',
        inputs: { weightKg: 15, dailyDoseMgKg: 50, dosesPerDay: 3, concentrationMgMl: 0 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_5_volume_administrar',
    number: 5,
    name: 'Volume a Administrar (Soluções e Injetáveis)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Determinar o volume exato (mL) a ser aspirado de uma ampola, frasco-ampola reconstituído ou solução oral a partir da dose prescrita e da concentração disponível.',
    formulaExpression:
      'Volume a Aspirar (mL) = Dose Prescrita (mg) / Concentração da Solução Disponível (mg/mL)',
    premises: ['Ambas as grandezas devem estar na mesma unidade de massa (mg e mg/mL).'],
    limitations: ['Considerar volume morto da seringa/agulha em volumes inferiores a 0,2 mL.'],
    safetyWarnings: [
      'Conferir se a concentração informada no rótulo da ampola está expressa por mL ou pelo volume total da ampola.',
    ],
    sourceReference:
      'Boas Práticas de Preparo e Administração de Medicamentos (COREN / CFF / ISMP)',
    decimalPlaces: 2,
    fields: [
      {
        key: 'prescribedDoseMg',
        label: 'Dose Prescrita',
        unit: 'mg',
        type: 'number',
        min: 0.01,
        max: 10000,
        step: 1,
        defaultValue: 750,
      },
      {
        key: 'availableConcMgMl',
        label: 'Concentração Disponível',
        unit: 'mg/mL',
        type: 'number',
        min: 0.01,
        max: 1000,
        step: 1,
        defaultValue: 50,
      },
    ],
    testSpecs: [
      {
        name: 'Aspirar 750 mg de solução a 50 mg/mL',
        category: 'normal',
        inputs: { prescribedDoseMg: 750, availableConcMgMl: 50 },
        expectSuccess: true,
        expectedPrimaryValue: '15.00',
      },
      {
        name: 'Microdose 2 mg em solução 10 mg/mL',
        category: 'minimo',
        inputs: { prescribedDoseMg: 2, availableConcMgMl: 10 },
        expectSuccess: true,
        expectedPrimaryValue: '0.20',
      },
      {
        name: 'Campo dose vazio',
        category: 'vazio',
        inputs: { prescribedDoseMg: '', availableConcMgMl: 50 },
        expectSuccess: false,
        expectedErrorSubstring: 'Valor ausente',
      },
    ],
  },
  {
    id: 'calc_6_reconstituicao',
    number: 6,
    name: 'Reconstituição de Pó Liofilizado (Frasco-Ampola)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Calcular a concentração obtida após reconstituição de um frasco-ampola liofilizado (considerando o volume de diluente adicionado e o volume de deslocamento do pó quando aplicável) e o volume necessário para a dose.',
    formulaExpression:
      'Concentração Reconstituída (mg/mL) = Massa do Frasco (mg) / [Volume de Diluente (mL) + Volume de Deslocamento do Pó (mL)]',
    premises: [
      'O volume de deslocamento do pó pode variar entre fabricantes; se desconhecido ou desprezível segundo a bula, informar 0 mL.',
    ],
    limitations: [
      'Consulte sempre na aba Administração/Estabilidade da ficha se o diluente (Água para Injetáveis vs SF 0,9%) é compatível com o fabricante específico.',
    ],
    safetyWarnings: [
      'Em neonatologia e pediatria, ignorar o volume de deslocamento de pós com alto volume pode gerar subdosagem de até 10-15%.',
    ],
    sourceReference:
      'Manual de Diluição e Administração de Medicamentos Injetáveis & Bulário ANVISA',
    decimalPlaces: 2,
    fields: [
      {
        key: 'vialMassMg',
        label: 'Quantidade Total no Frasco-Ampola',
        unit: 'mg',
        type: 'number',
        min: 1,
        max: 10000,
        step: 50,
        defaultValue: 1000,
      },
      {
        key: 'diluentVolumeMl',
        label: 'Volume de Diluente Adicionado',
        unit: 'mL',
        type: 'number',
        min: 0.5,
        max: 500,
        step: 0.5,
        defaultValue: 20,
      },
      {
        key: 'displacementVolumeMl',
        label: 'Volume de Deslocamento do Pó',
        unit: 'mL',
        type: 'number',
        min: 0,
        max: 20,
        step: 0.1,
        defaultValue: 0,
      },
      {
        key: 'desiredDoseMg',
        label: 'Dose Prescrita a Retirar',
        unit: 'mg',
        type: 'number',
        min: 1,
        max: 10000,
        step: 50,
        defaultValue: 500,
      },
    ],
    testSpecs: [
      {
        name: 'Meropeném 1000 mg reconstituído em 20 mL para dose de 500 mg',
        category: 'normal',
        inputs: {
          vialMassMg: 1000,
          diluentVolumeMl: 20,
          displacementVolumeMl: 0,
          desiredDoseMg: 500,
        },
        expectSuccess: true,
        expectedPrimaryValue: '50.00',
      },
      {
        name: 'Reconstituição com deslocamento de pó de 0.8 mL (1000 mg + 9.2 mL)',
        category: 'limite',
        inputs: {
          vialMassMg: 1000,
          diluentVolumeMl: 9.2,
          displacementVolumeMl: 0.8,
          desiredDoseMg: 250,
        },
        expectSuccess: true,
        expectedPrimaryValue: '100.00',
      },
      {
        name: 'Volume de diluente inválido (0 mL)',
        category: 'invalido',
        inputs: {
          vialMassMg: 1000,
          diluentVolumeMl: 0,
          displacementVolumeMl: 0,
          desiredDoseMg: 500,
        },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_7_diluicao',
    number: 7,
    name: 'Diluição de Soluções (C1 × V1 = C2 × V2)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Determinar o volume de solução estoque concentrada (V1) e o volume de veículo diluente necessários para preparar um volume final (V2) na concentração desejada (C2).',
    formulaExpression: 'V1 (mL) = (C2 × V2) / C1   |   Volume de Diluente (mL) = V2 − V1',
    premises: [
      'C1 e C2 expressas na mesma unidade de concentração (mg/mL ou %). C1 deve ser estritamente maior que C2.',
    ],
    limitations: [
      'Não valida compatibilidade físico-química do diluente escolhido; verificar na ficha do medicamento.',
    ],
    safetyWarnings: [
      'Se C2 >= C1, não é possível realizar diluição simples (bloqueio matemático ativo).',
    ],
    sourceReference: 'Farmacotécnica Hospitalar & Farmacopeia Brasileira',
    decimalPlaces: 2,
    fields: [
      {
        key: 'c1',
        label: 'Concentração Estoque Inicial (C1)',
        unit: 'mg/mL',
        type: 'number',
        min: 0.1,
        max: 2000,
        step: 1,
        defaultValue: 50,
      },
      {
        key: 'c2',
        label: 'Concentração Final Desejada (C2)',
        unit: 'mg/mL',
        type: 'number',
        min: 0.01,
        max: 1000,
        step: 0.5,
        defaultValue: 10,
      },
      {
        key: 'v2',
        label: 'Volume Final Desejado da Bolsa/Seringa (V2)',
        unit: 'mL',
        type: 'number',
        min: 1,
        max: 2000,
        step: 5,
        defaultValue: 100,
      },
    ],
    testSpecs: [
      {
        name: 'Diluir estoque 50 mg/mL para 100 mL a 10 mg/mL',
        category: 'normal',
        inputs: { c1: 50, c2: 10, v2: 100 },
        expectSuccess: true,
        expectedPrimaryValue: '20.00',
      },
      {
        name: 'Bloqueio quando C2 >= C1 (impossível diluir)',
        category: 'invalido',
        inputs: { c1: 10, c2: 20, v2: 100 },
        expectSuccess: false,
        expectedErrorSubstring: 'Impossível diluir',
      },
    ],
  },
  {
    id: 'calc_8_concentracao_final',
    number: 8,
    name: 'Concentração Final para Infusão Venosa',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Verificar a concentração final (mg/mL) de uma solução preparada para infusão intravenosa e checar se permanece dentro da faixa máxima tolerada para acesso periférico ou central.',
    formulaExpression:
      'Concentração Final (mg/mL) = Dose Adicionada (mg) / Volume Total Final da Solução (mL)',
    premises: [
      'O volume total final inclui o volume da bolsa de diluente somado ao volume da alíquota reconstituída adicionada.',
    ],
    limitations: [
      'O limite máximo de concentração periférica varia por princípio ativo (ex.: Meropeném diluição 1 a 20 mg/mL).',
    ],
    safetyWarnings: [
      'Concentrações acima do limite documentado em bula aumentam o risco de flebite química, tromboflebite e precipitação.',
    ],
    sourceReference: 'Diretrizes INS (Infusion Nurses Society) & Bulário Eletrônico ANVISA',
    decimalPlaces: 2,
    fields: [
      {
        key: 'totalDoseMg',
        label: 'Dose Total do Fármaco na Bolsa',
        unit: 'mg',
        type: 'number',
        min: 1,
        max: 20000,
        step: 50,
        defaultValue: 1000,
      },
      {
        key: 'totalVolumeMl',
        label: 'Volume Total Final (Diluente + Fármaco)',
        unit: 'mL',
        type: 'number',
        min: 5,
        max: 2000,
        step: 10,
        defaultValue: 100,
      },
      {
        key: 'maxAllowedConcMgMl',
        label: 'Limite Máximo Documentado em Bula',
        unit: 'mg/mL',
        type: 'number',
        min: 0.1,
        max: 500,
        step: 1,
        defaultValue: 20,
      },
    ],
    testSpecs: [
      {
        name: '1000 mg em 100 mL com limite de 20 mg/mL',
        category: 'normal',
        inputs: { totalDoseMg: 1000, totalVolumeMl: 100, maxAllowedConcMgMl: 20 },
        expectSuccess: true,
        expectedPrimaryValue: '10.00',
      },
      {
        name: '2000 mg em 50 mL (40 mg/mL — aciona alerta de concentração)',
        category: 'limite',
        inputs: { totalDoseMg: 2000, totalVolumeMl: 50, maxAllowedConcMgMl: 20 },
        expectSuccess: true,
        expectedPrimaryValue: '40.00',
      },
      {
        name: 'Volume abaixo do mínimo operacional (< 5 mL)',
        category: 'invalido',
        inputs: { totalDoseMg: 100, totalVolumeMl: 1, maxAllowedConcMgMl: 20 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_9_velocidade_infusao',
    number: 9,
    name: 'Velocidade de Infusão em Bomba (mL/h)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Calcular a vazão em mL/hora para programação de Bomba de Infusão Contínua (BIC) a partir do volume total e do tempo prescrito.',
    formulaExpression: 'Velocidade (mL/h) = [ Volume Total (mL) / Tempo de Infusão (minutos) ] × 60',
    premises: ['Infusão em velocidade constante programada em bomba volumétrica calibrada.'],
    limitations: [
      'Para drogas vasoativas tituladas por mcg/kg/min, verificar também a dose ponderal por minuto.',
    ],
    safetyWarnings: [
      'Em medicamentos de alta vigilância, realizar dupla checagem independente da programação da bomba de infusão.',
    ],
    sourceReference: 'ISMP Brasil — Uso Seguro de Bombas de Infusão',
    decimalPlaces: 1,
    fields: [
      {
        key: 'volumeMl',
        label: 'Volume Total a Infundir',
        unit: 'mL',
        type: 'number',
        min: 1,
        max: 5000,
        step: 5,
        defaultValue: 100,
      },
      {
        key: 'durationMinutes',
        label: 'Tempo de Infusão Prescrito',
        unit: 'minutos',
        type: 'number',
        min: 1,
        max: 2880,
        step: 5,
        defaultValue: 30,
      },
    ],
    testSpecs: [
      {
        name: '100 mL em 30 minutos',
        category: 'normal',
        inputs: { volumeMl: 100, durationMinutes: 30 },
        expectSuccess: true,
        expectedPrimaryValue: '200.0',
      },
      {
        name: 'Infusão estendida de Meropeném (100 mL em 180 min)',
        category: 'limite',
        inputs: { volumeMl: 100, durationMinutes: 180 },
        expectSuccess: true,
        expectedPrimaryValue: '33.3',
      },
      {
        name: 'Tempo zero inválido',
        category: 'invalido',
        inputs: { volumeMl: 100, durationMinutes: 0 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_10_gotas_por_minuto',
    number: 10,
    name: 'Gotejamento Macrogotas por Minuto (gotas/min)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Calcular o gotejamento gravitacional em equipo de macrogotas padrão (20 macrogotas/mL).',
    formulaExpression:
      'Macrogotas/min = [ Volume (mL) × Fator do Equipo (20 gotas/mL) ] / Tempo (minutos)',
    premises: [
      'Equipo gravitacional macrogotas padrão ABNT NBR ISO 8536-4 (20 gotas de água destilada = 1 mL ± 0,1 mL).',
    ],
    limitations: [
      'Soluções de alta viscosidade alteram o tamanho da gota; medicamentos de alta vigilância devem usar Bomba de Infusão (BIC), não gotejamento gravitacional livre.',
    ],
    safetyWarnings: [
      'Arredondar para o número inteiro de gotas/min mais próximo na contagem visual do gotejamento.',
    ],
    sourceReference: 'ABNT NBR ISO 8536-4 (Equipos de Infusão) & Manual de Enfermagem COREN',
    decimalPlaces: 1,
    fields: [
      {
        key: 'volumeMl',
        label: 'Volume da Solução',
        unit: 'mL',
        type: 'number',
        min: 10,
        max: 5000,
        step: 10,
        defaultValue: 500,
      },
      {
        key: 'durationMinutes',
        label: 'Tempo Total de Infusão',
        unit: 'minutos',
        type: 'number',
        min: 5,
        max: 2880,
        step: 15,
        defaultValue: 360,
      },
    ],
    testSpecs: [
      {
        name: '500 mL em 360 minutos (6 horas)',
        category: 'normal',
        inputs: { volumeMl: 500, durationMinutes: 360 },
        expectSuccess: true,
        expectedPrimaryValue: '27.8',
      },
      {
        name: '1000 mL em 480 minutos (8 horas)',
        category: 'maximo',
        inputs: { volumeMl: 1000, durationMinutes: 480 },
        expectSuccess: true,
        expectedPrimaryValue: '41.7',
      },
      {
        name: 'Tempo menor que 5 minutos inválido',
        category: 'invalido',
        inputs: { volumeMl: 500, durationMinutes: 2 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_11_microgotas_por_minuto',
    number: 11,
    name: 'Gotejamento Microgotas por Minuto (microgotas/min)',
    category: 'Preparo, Reconstituição e Infusão',
    purpose: 'Calcular o gotejamento em equipo de microgotas padrão (60 microgotas = 1 mL).',
    formulaExpression:
      'Microgotas/min = [ Volume (mL) × 60 ] / Tempo (minutos)  (Equivalente numericamente à vazão em mL/h)',
    premises: ['Equipo de microgotas calibrado a 60 microgotas/mL.'],
    limitations: [
      'Para infusões pediátricas/neonatais críticas, priorizar bomba de infusão de seringa ou volumétrica.',
    ],
    safetyWarnings: [
      'Conferir visualmente se a câmara gotejadora possui o capilar metálico/plástico de microgotas (60 mgt/mL).',
    ],
    sourceReference: 'ABNT NBR ISO 8536-4 & Manual de Cálculo de Medicamentos COREN',
    decimalPlaces: 1,
    fields: [
      {
        key: 'volumeMl',
        label: 'Volume Total',
        unit: 'mL',
        type: 'number',
        min: 1,
        max: 2000,
        step: 5,
        defaultValue: 100,
      },
      {
        key: 'durationMinutes',
        label: 'Tempo de Infusão',
        unit: 'minutos',
        type: 'number',
        min: 5,
        max: 1440,
        step: 10,
        defaultValue: 120,
      },
    ],
    testSpecs: [
      {
        name: '100 mL em 120 minutos (2 horas)',
        category: 'normal',
        inputs: { volumeMl: 100, durationMinutes: 120 },
        expectSuccess: true,
        expectedPrimaryValue: '50.0',
      },
      {
        name: '250 mL em 300 minutos (5 horas)',
        category: 'normal',
        inputs: { volumeMl: 250, durationMinutes: 300 },
        expectSuccess: true,
        expectedPrimaryValue: '50.0',
      },
      {
        name: 'Volume inválido negativo',
        category: 'invalido',
        inputs: { volumeMl: -50, durationMinutes: 60 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_12_duracao_infusao',
    number: 12,
    name: 'Duração Estimada de Infusão',
    category: 'Preparo, Reconstituição e Infusão',
    purpose:
      'Estimar o tempo total de duração (em horas e minutos) de uma bolsa ou seringa de infusão a partir do volume disponível e da vazão programada (mL/h).',
    formulaExpression: 'Tempo (horas) = Volume Restante (mL) / Velocidade de Infusão (mL/h)',
    premises: [
      'Útil para verificar se o tempo de infusão não ultrapassa o prazo máximo de estabilidade físico-química após diluição em temperatura ambiente.',
    ],
    limitations: ['Não desconta o volume residual do equipo se a bolsa não for lavada ao final.'],
    safetyWarnings: [
      'Compare sempre a duração calculada com o limite de estabilidade em temperatura ambiente (ex.: Meropeném em SF 0,9% tem estabilidade de 3h entre 15-25 °C).',
    ],
    sourceReference: 'Farmácia Clínica e Atenção Farmacêutica em UTI',
    decimalPlaces: 2,
    fields: [
      {
        key: 'volumeMl',
        label: 'Volume na Bolsa / Seringa',
        unit: 'mL',
        type: 'number',
        min: 1,
        max: 5000,
        step: 10,
        defaultValue: 250,
      },
      {
        key: 'rateMlPerHour',
        label: 'Vazão Programada',
        unit: 'mL/h',
        type: 'number',
        min: 0.5,
        max: 1000,
        step: 5,
        defaultValue: 83.33,
      },
    ],
    testSpecs: [
      {
        name: '250 mL a 83.33 mL/h',
        category: 'normal',
        inputs: { volumeMl: 250, rateMlPerHour: 83.33 },
        expectSuccess: true,
        expectedPrimaryValue: '3h 0min',
      },
      {
        name: '500 mL a 125 mL/h',
        category: 'normal',
        inputs: { volumeMl: 500, rateMlPerHour: 125 },
        expectSuccess: true,
        expectedPrimaryValue: '4h 0min',
      },
      {
        name: 'Vazão zero bloqueada',
        category: 'invalido',
        inputs: { volumeMl: 250, rateMlPerHour: 0 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_13_superficie_corporal',
    number: 13,
    name: 'Superfície Corporal (Fórmula de Mosteller e DuBois)',
    category: 'Função Orgânica e Superfície Corporal',
    purpose:
      'Calcular a Área de Superfície Corporal (ASC / BSA em m²) a partir do peso e estatura para validação de protocolos oncológicos, imunossupressores e pediátricos.',
    formulaExpression:
      'Mosteller: ASC (m²) = √[ (Altura cm × Peso kg) / 3600 ]   |   DuBois: 0,007184 × Altura^0,725 × Peso^0,425',
    premises: [
      'Estatura em centímetros (cm) e peso em quilogramas (kg) aferidos recentemente.',
    ],
    limitations: [
      'Em pacientes com obesidade grau III ou ascite volumosa, verificar diretriz específica do protocolo antineoplásico sobre truncamento (cap) em 2,0 m² ou uso do peso real.',
    ],
    safetyWarnings: [
      'Erros de inversão entre peso (kg) e altura (cm) alteram a superfície corporal; a calculadora valida faixas antropométricas plausíveis.',
    ],
    sourceReference:
      'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.',
    decimalPlaces: 2,
    fields: [
      {
        key: 'weightKg',
        label: 'Peso Corporal',
        unit: 'kg',
        type: 'number',
        min: 1,
        max: 300,
        step: 0.5,
        defaultValue: 70,
      },
      {
        key: 'heightCm',
        label: 'Estatura / Comprimento',
        unit: 'cm',
        type: 'number',
        min: 30,
        max: 240,
        step: 1,
        defaultValue: 172,
      },
    ],
    testSpecs: [
      {
        name: 'Adulto padrão (70 kg, 172 cm)',
        category: 'normal',
        inputs: { weightKg: 70, heightCm: 172 },
        expectSuccess: true,
        expectedPrimaryValue: '1.83',
      },
      {
        name: 'Criança (18 kg, 100 cm)',
        category: 'minimo',
        inputs: { weightKg: 18, heightCm: 100 },
        expectSuccess: true,
        expectedPrimaryValue: '0.71',
      },
      {
        name: 'Altura em metros em vez de cm (1.72 cm bloqueado)',
        category: 'invalido',
        inputs: { weightKg: 70, heightCm: 1.72 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_14_conversao_concentracao_percentual',
    number: 14,
    name: 'Conversão de Unidades de Concentração (% p/v para mg/mL)',
    category: 'Unidades e Físico-Química',
    purpose:
      'Converter concentrações farmacêuticas expressas em porcentagem peso/volume (% p/v, g/100 mL) para miligramas por mililitro (mg/mL) e determinar a massa total na ampola.',
    formulaExpression:
      'Concentração (mg/mL) = Concentração (% p/v) × 10   |   Massa Total (mg) = Concentração (mg/mL) × Volume (mL)',
    premises: [
      'Por definição farmacopeica (% p/v), 1% equivale a 1 g de soluto em 100 mL de solução (1.000 mg / 100 mL = 10 mg/mL).',
    ],
    limitations: ['Válido para soluções peso/volume (% p/v).'],
    safetyWarnings: [
      'Crítico no preparo de eletrólitos concentrados (ex.: NaCl 20% = 200 mg/mL; KCl 19,1% = 191 mg/mL; Glicose 50% = 500 mg/mL).',
    ],
    sourceReference: 'Farmacopeia Brasileira 6ª Edição — Expressão de Concentrações',
    decimalPlaces: 2,
    fields: [
      {
        key: 'percentWv',
        label: 'Concentração em Porcentagem (% p/v)',
        unit: '%',
        type: 'number',
        min: 0.01,
        max: 100,
        step: 0.1,
        defaultValue: 0.9,
      },
      {
        key: 'ampouleVolumeMl',
        label: 'Volume da Ampola ou Frasco',
        unit: 'mL',
        type: 'number',
        min: 0.5,
        max: 2000,
        step: 1,
        defaultValue: 10,
      },
    ],
    testSpecs: [
      {
        name: 'Cloreto de Sódio 0,9% em 10 mL',
        category: 'normal',
        inputs: { percentWv: 0.9, ampouleVolumeMl: 10 },
        expectSuccess: true,
        expectedPrimaryValue: '9.00',
      },
      {
        name: 'Cloreto de Sódio Hipertônico 20% em 10 mL',
        category: 'maximo',
        inputs: { percentWv: 20, ampouleVolumeMl: 10 },
        expectSuccess: true,
        expectedPrimaryValue: '200.00',
      },
      {
        name: 'Porcentagem acima de 100% inválida',
        category: 'invalido',
        inputs: { percentWv: 120, ampouleVolumeMl: 10 },
        expectSuccess: false,
        expectedErrorSubstring: 'excede o limite máximo',
      },
    ],
  },
  {
    id: 'calc_15_conversao_massa_g_mg_mcg',
    number: 15,
    name: 'Conversão de Massa (g, mg e mcg)',
    category: 'Unidades e Físico-Química',
    purpose:
      'Realizar conversão exata entre gramas (g), miligramas (mg) e microgramas (mcg / μg) com prevenção de erros de fator 1.000.',
    formulaExpression: '1 g = 1.000 mg = 1.000.000 mcg   |   1 mg = 1.000 mcg',
    premises: ['Sistema Internacional de Unidades (SI) aplicado à prescrição farmacêutica.'],
    limitations: [
      'Evitar abreviação manuscrita "µg" sem clareza tipográfica; utilizar "mcg" conforme recomendação ISMP Brasil.',
    ],
    safetyWarnings: [
      'Erros de fator 10 ou 1.000 entre mg e mcg são uma das principais causas de toxicidade grave com digoxina, fentanila, levotiroxina e aminas vasoativas.',
    ],
    sourceReference: 'ISMP Brasil — Prevenção de Erros Relacionados a Abreviações e Unidades',
    decimalPlaces: 4,
    fields: [
      {
        key: 'value',
        label: 'Valor Numérico da Massa',
        unit: 'valor',
        type: 'number',
        min: 0.0001,
        max: 1000000,
        step: 0.1,
        defaultValue: 0.25,
      },
      {
        key: 'fromUnit',
        label: 'Unidade de Origem',
        unit: 'unidade',
        type: 'select',
        defaultValue: 'mg',
        options: [
          { value: 'g', label: 'Gramas (g)' },
          { value: 'mg', label: 'Miligramas (mg)' },
          { value: 'mcg', label: 'Microgramas (mcg)' },
        ],
      },
    ],
    testSpecs: [
      {
        name: '0.25 mg (Digoxina) para mg e mcg',
        category: 'normal',
        inputs: { value: 0.25, fromUnit: 'mg' },
        expectSuccess: true,
        expectedPrimaryValue: '0.2500 mg',
      },
      {
        name: '1.5 g para mg',
        category: 'maximo',
        inputs: { value: 1.5, fromUnit: 'g' },
        expectSuccess: true,
        expectedPrimaryValue: '1500.0000 mg',
      },
      {
        name: 'Valor nulo/zero inválido',
        category: 'invalido',
        inputs: { value: 0, fromUnit: 'mg' },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_16_unidades_internacionais_ui',
    number: 16,
    name: 'Unidades Internacionais (UI) e Volume de Administração',
    category: 'Unidades e Físico-Química',
    purpose:
      'Calcular o volume (mL) a administrar para medicamentos padronizados por atividade biológica em Unidades Internacionais (UI/mL), como Heparina, Insulinas e Penicilinas, sem usar conversões universais inválidas.',
    formulaExpression:
      'Volume (mL) = Dose Prescrita (UI) / Concentração Biológica do Produto (UI/mL)',
    premises: [
      'A equivalência entre UI e mg depende exclusivamente do padrão biológico de cada substância (ex.: Insulina Humana 100 UI/mL vs Heparina Sódica 5.000 UI/mL). Não existe fator universal UI -> mg entre substâncias distintas.',
    ],
    limitations: [
      'Para insulinas U-100, utilizar exclusivamente seringas graduadas para 100 UI/mL ou canetas específicas.',
    ],
    safetyWarnings: [
      'Medicamentos expressos em UI (Insulina e Heparina) são Medicamentos de Alta Vigilância (MAV). Nunca abreviar "UI" como "U" (risco de leitura como zero extra).',
    ],
    sourceReference: 'ISMP Brasil — Medicamentos Potencialmente Perigosos & Farmacopeia Brasileira',
    decimalPlaces: 2,
    fields: [
      {
        key: 'prescribedUi',
        label: 'Dose Prescrita em Unidades Internacionais',
        unit: 'UI',
        type: 'number',
        min: 1,
        max: 5000000,
        step: 100,
        defaultValue: 5000,
      },
      {
        key: 'concentrationUiMl',
        label: 'Concentração do Frasco/Ampola (Conforme Bula)',
        unit: 'UI/mL',
        type: 'number',
        min: 10,
        max: 1000000,
        step: 100,
        defaultValue: 5000,
      },
    ],
    testSpecs: [
      {
        name: 'Heparina 5.000 UI em apresentação de 5.000 UI/mL',
        category: 'normal',
        inputs: { prescribedUi: 5000, concentrationUiMl: 5000 },
        expectSuccess: true,
        expectedPrimaryValue: '1.00',
      },
      {
        name: 'Insulina Regular 12 UI em frasco U-100 (100 UI/mL)',
        category: 'minimo',
        inputs: { prescribedUi: 12, concentrationUiMl: 100 },
        expectSuccess: true,
        expectedPrimaryValue: '0.12',
      },
      {
        name: 'Concentração UI/mL ausente',
        category: 'vazio',
        inputs: { prescribedUi: 5000, concentrationUiMl: '' },
        expectSuccess: false,
        expectedErrorSubstring: 'Valor ausente',
      },
    ],
  },
  {
    id: 'calc_17_meq_e_mmol',
    number: 17,
    name: 'Conversão Eletrólitos (mg, mmol e mEq)',
    category: 'Unidades e Físico-Química',
    purpose:
      'Converter entre miligramas (mg), milimols (mmol) e miliequivalentes (mEq) a partir da massa molar (g/mol) do sal ou íon e de sua valência iônica.',
    formulaExpression:
      'mmol = Massa (mg) / Massa Molar (mg/mmol)   |   mEq = mmol × Valência (|z|)',
    premises: [
      'Informar a massa molar correta do sal pesado (ex.: NaCl = 58,44 mg/mmol, valência = 1; KCl = 74,55 mg/mmol, valência = 1; MgSO4·7H2O = 246,47 mg/mmol, valência Mg2+ = 2).',
    ],
    limitations: [
      'Verificar sempre na ampola de eletrólito concentrado o teor de mEq/mL impresso pelo fabricante.',
    ],
    safetyWarnings: [
      'Eletrólitos concentrados (KCl 19,1%, NaCl 20%, Sulfato de Magnésio 50%) são Medicamentos de Alta Vigilância e jamais devem ser administrados em bolus puro sem diluição adequada.',
    ],
    sourceReference:
      'Farmacopeia Brasileira & Diretrizes de Terapia Nutricional Parenteral (BRASPEN)',
    decimalPlaces: 2,
    fields: [
      {
        key: 'massMg',
        label: 'Massa do Sal / Eletrólito',
        unit: 'mg',
        type: 'number',
        min: 1,
        max: 100000,
        step: 10,
        defaultValue: 1910,
      },
      {
        key: 'molarMass',
        label: 'Massa Molar do Composto',
        unit: 'g/mol (mg/mmol)',
        type: 'number',
        min: 1,
        max: 1000,
        step: 0.01,
        defaultValue: 74.55,
        helperText: 'Ex.: KCl = 74.55 | NaCl = 58.44 | MgSO4·7H2O = 246.47',
      },
      {
        key: 'valence',
        label: 'Valência do Íon (|z|)',
        unit: 'valência',
        type: 'number',
        min: 1,
        max: 4,
        step: 1,
        defaultValue: 1,
      },
    ],
    testSpecs: [
      {
        name: 'Ampola 10 mL de KCl 19,1% (1.910 mg, MM 74.55, valência 1)',
        category: 'normal',
        inputs: { massMg: 1910, molarMass: 74.55, valence: 1 },
        expectSuccess: true,
        expectedPrimaryValue: '25.62',
      },
      {
        name: 'Sulfato de Magnésio Hepta-hidratado 1000 mg (MM 246.47, valência 2)',
        category: 'limite',
        inputs: { massMg: 1000, molarMass: 246.47, valence: 2 },
        expectSuccess: true,
        expectedPrimaryValue: '8.11',
      },
      {
        name: 'Valência inválida (> 4)',
        category: 'invalido',
        inputs: { massMg: 1000, molarMass: 74.55, valence: 6 },
        expectSuccess: false,
        expectedErrorSubstring: 'excede o limite máximo',
      },
    ],
  },
  {
    id: 'calc_18_osmolaridade',
    number: 18,
    name: 'Osmolaridade Teórica de Solução Parenteral (mOsm/L)',
    category: 'Unidades e Físico-Química',
    purpose:
      'Calcular a osmolaridade teórica (mOsm/L) de uma solução intravenosa e avaliar a viabilidade de administração por acesso venoso periférico versus acesso venoso central.',
    formulaExpression:
      'Osmolaridade (mOsm/L) = [ Massa de Soluto (g/L) / Massa Molar (g/mol) ] × Nº de Espécies Dissociadas (i) × 1000',
    premises: ['Calcula a osmolaridade teórica ideal baseada na dissociação estequiométrica (i).'],
    limitations: [
      'Em misturas complexas de Nutrição Parenteral Total (NPT), somar a contribuição osmolar de aminoácidos, glicose e cada eletrólito.',
    ],
    safetyWarnings: [
      'Soluções com osmolaridade > 900 mOsm/L (ou > 600-850 mOsm/L conforme protocolo institucional) causam flebite química grave e necrose tecidual em veia periférica, exigindo Acesso Venoso Central.',
    ],
    sourceReference:
      'Portaria MS/SVS nº 272/1998 (Terapia de Nutrição Parenteral) & Diretrizes INS/BRASPEN',
    decimalPlaces: 1,
    fields: [
      {
        key: 'soluteGramsPerLiter',
        label: 'Concentração do Soluto',
        unit: 'g/L',
        type: 'number',
        min: 0.1,
        max: 1000,
        step: 1,
        defaultValue: 9,
      },
      {
        key: 'molarMass',
        label: 'Massa Molar do Soluto',
        unit: 'g/mol',
        type: 'number',
        min: 10,
        max: 1000,
        step: 0.01,
        defaultValue: 58.44,
        helperText: 'Ex.: NaCl = 58.44 (i=2) | Glicose anidra = 180.16 (i=1)',
      },
      {
        key: 'dissociationParticles',
        label: 'Partículas Dissociadas em Solução (i)',
        unit: 'íons/molécula',
        type: 'number',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 2,
      },
    ],
    testSpecs: [
      {
        name: 'Cloreto de Sódio 0,9% (9 g/L, MM 58.44, i=2)',
        category: 'normal',
        inputs: { soluteGramsPerLiter: 9, molarMass: 58.44, dissociationParticles: 2 },
        expectSuccess: true,
        expectedPrimaryValue: '308.0',
      },
      {
        name: 'Glicose Hipertônica 20% (200 g/L, MM 180.16, i=1 — Exige Acesso Central)',
        category: 'maximo',
        inputs: { soluteGramsPerLiter: 200, molarMass: 180.16, dissociationParticles: 1 },
        expectSuccess: true,
        expectedPrimaryValue: '1110.1',
      },
      {
        name: 'Massa molar inválida (< 10)',
        category: 'invalido',
        inputs: { soluteGramsPerLiter: 9, molarMass: 2, dissociationParticles: 2 },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_19_funcao_renal_cockcroft_gault',
    number: 19,
    name: 'Estimativa de Função Renal (Clearance de Creatinina — Cockcroft-Gault)',
    category: 'Função Orgânica e Superfície Corporal',
    purpose:
      'Estimar a Depuração de Creatinina (ClCr em mL/min) pela equação de Cockcroft-Gault, padrão referencial utilizado na maioria das bulas aprovadas pela ANVISA para ajuste posológico renal (ex.: Amoxicilina, Meropeném).',
    formulaExpression:
      'ClCr (mL/min) = [ (140 − Idade anos) × Peso (kg) ] / (72 × Creatinina Sérica mg/dL)  [× 0,85 se Sexo Feminino]',
    premises: ['Creatinina sérica em estado de equilíbrio estável (steady-state).'],
    limitations: [
      'Não aplicável em Injúria Renal Aguda (IRA) com creatinina em rápida ascensão, crianças (utilizar Schwartz), gestantes ou amputados/caquéticos extremos.',
    ],
    safetyWarnings: [
      'A maioria das tabelas de ajuste renal em bulas de antimicrobianos expressa limiares em mL/min calculados por Cockcroft-Gault.',
    ],
    sourceReference:
      'Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron. 1976;16(1):31-41.',
    decimalPlaces: 1,
    fields: [
      {
        key: 'ageYears',
        label: 'Idade (Adultos ≥ 18 anos)',
        unit: 'anos',
        type: 'number',
        min: 18,
        max: 120,
        step: 1,
        defaultValue: 68,
      },
      {
        key: 'weightKg',
        label: 'Peso Corporal',
        unit: 'kg',
        type: 'number',
        min: 25,
        max: 250,
        step: 0.5,
        defaultValue: 65,
      },
      {
        key: 'serumCreatinineMgDl',
        label: 'Creatinina Sérica',
        unit: 'mg/dL',
        type: 'number',
        min: 0.2,
        max: 20,
        step: 0.1,
        defaultValue: 1.8,
      },
      {
        key: 'sex',
        label: 'Sexo Biológico (Fator de Massa Muscular Equação C-G)',
        unit: 'fator',
        type: 'select',
        defaultValue: 'F',
        options: [
          { value: 'F', label: 'Feminino (× 0,85)' },
          { value: 'M', label: 'Masculino (× 1,00)' },
        ],
      },
    ],
    testSpecs: [
      {
        name: 'Idosa 68 anos, 65 kg, Cr 1.8 mg/dL (Feminino)',
        category: 'normal',
        inputs: { ageYears: 68, weightKg: 65, serumCreatinineMgDl: 1.8, sex: 'F' },
        expectSuccess: true,
        expectedPrimaryValue: '30.7',
      },
      {
        name: 'Adulto 40 anos, 72 kg, Cr 1.0 mg/dL (Masculino)',
        category: 'normal',
        inputs: { ageYears: 40, weightKg: 72, serumCreatinineMgDl: 1.0, sex: 'M' },
        expectSuccess: true,
        expectedPrimaryValue: '100.0',
      },
      {
        name: 'Idade pediátrica (< 18 anos bloqueado em Cockcroft-Gault)',
        category: 'invalido',
        inputs: { ageYears: 8, weightKg: 25, serumCreatinineMgDl: 0.6, sex: 'M' },
        expectSuccess: false,
        expectedErrorSubstring: 'abaixo do limite mínimo',
      },
    ],
  },
  {
    id: 'calc_20_avaliacao_hepatica_child_pugh',
    number: 20,
    name: 'Estratificação de Função Hepática (Escore de Child-Pugh)',
    category: 'Função Orgânica e Superfície Corporal',
    purpose:
      'Calcular a pontuação (5 a 15 pontos) e a classe funcional de Child-Pugh (Classe A, B ou C), utilizada nas bulas oficiais para determinar necessidade de redução de dose ou contraindicação na insuficiência hepática.',
    formulaExpression:
      'Pontuação Total = Bilirrubina (1-3) + Albumina (1-3) + RNI/INR (1-3) + Ascite (1-3) + Encefalopatia (1-3)',
    premises: [
      'Classificação: Classe A (5 a 6 pontos — compensada), Classe B (7 a 9 pontos — comprometimento funcional significativo), Classe C (10 a 15 pontos — descompensada).',
    ],
    limitations: [
      'Se o paciente estiver em uso de anticoagulante cumarínico (ex.: varfarina), o RNI reflete o efeito farmacológico e não apenas a síntese hepática basal.',
    ],
    safetyWarnings: [
      'Muitos medicamentos metabolizados pelo fígado são contraindicados em Child-Pugh Classe C ou exigem redução de 50% da dose inicial (ex.: Losartana iniciar com 25 mg na hepatopatia).',
    ],
    sourceReference:
      'Pugh RN et al. Transection of the oesophagus for bleeding oesophageal varices. Br J Surg. 1973;60(8):646-9.',
    decimalPlaces: 0,
    fields: [
      {
        key: 'bilirubinMgDl',
        label: 'Bilirrubina Total Sérica',
        unit: 'mg/dL',
        type: 'number',
        min: 0.1,
        max: 40,
        step: 0.1,
        defaultValue: 2.4,
      },
      {
        key: 'albuminGDl',
        label: 'Albumina Sérica',
        unit: 'g/dL',
        type: 'number',
        min: 1.0,
        max: 6.0,
        step: 0.1,
        defaultValue: 3.1,
      },
      {
        key: 'inr',
        label: 'RNI (INR)',
        unit: 'RNI',
        type: 'number',
        min: 0.8,
        max: 10,
        step: 0.1,
        defaultValue: 1.8,
      },
      {
        key: 'ascites',
        label: 'Grau de Ascite',
        unit: 'pts',
        type: 'select',
        defaultValue: '2',
        options: [
          { value: '1', label: 'Ausente (1 ponto)' },
          { value: '2', label: 'Leve / Controlada com diuréticos (2 pontos)' },
          { value: '3', label: 'Moderada a Grave / Refratária (3 pontos)' },
        ],
      },
      {
        key: 'encephalopathy',
        label: 'Encefalopatia Hepática',
        unit: 'pts',
        type: 'select',
        defaultValue: '1',
        options: [
          { value: '1', label: 'Ausente (1 ponto)' },
          { value: '2', label: 'Grau I a II (2 pontos)' },
          { value: '3', label: 'Grau III a IV (3 pontos)' },
        ],
      },
    ],
    testSpecs: [
      {
        name: 'Child-Pugh Classe B (Bili 2.4, Alb 3.1, INR 1.8, Ascite 2pt, Encef 1pt)',
        category: 'normal',
        inputs: {
          bilirubinMgDl: 2.4,
          albuminGDl: 3.1,
          inr: 1.8,
          ascites: '2',
          encephalopathy: '1',
        },
        expectSuccess: true,
        expectedPrimaryValue: '9 pontos',
      },
      {
        name: 'Child-Pugh Classe A Compensada (5 pontos)',
        category: 'minimo',
        inputs: {
          bilirubinMgDl: 1.0,
          albuminGDl: 4.0,
          inr: 1.1,
          ascites: '1',
          encephalopathy: '1',
        },
        expectSuccess: true,
        expectedPrimaryValue: '5 pontos',
      },
      {
        name: 'Child-Pugh Classe C Descompensada (14 pontos)',
        category: 'maximo',
        inputs: {
          bilirubinMgDl: 4.5,
          albuminGDl: 2.2,
          inr: 2.8,
          ascites: '3',
          encephalopathy: '2',
        },
        expectSuccess: true,
        expectedPrimaryValue: '14 pontos',
      },
    ],
  },
];

export function executeValidatedCalculation(
  calculatorId: string,
  inputs: Record<string, number | string>
): CalculationResult {
  const def = CALCULATOR_DEFINITIONS.find((c) => c.id === calculatorId);
  if (!def) {
    return {
      calculatorId,
      success: false,
      safetyAlerts: [],
      error: 'Calculadora não encontrada no catálogo validado.',
    };
  }

  for (const field of def.fields) {
    const rawVal = inputs[field.key];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      return {
        calculatorId,
        success: false,
        safetyAlerts: [],
        error: `Valor ausente para o campo obrigatório: "${field.label}".`,
      };
    }
    if (field.type === 'number') {
      const numVal = Number(rawVal);
      if (Number.isNaN(numVal) || !Number.isFinite(numVal)) {
        return {
          calculatorId,
          success: false,
          safetyAlerts: [],
          error: `Entrada numérica inválida em "${field.label}".`,
        };
      }
      if (field.min !== undefined && numVal < field.min) {
        return {
          calculatorId,
          success: false,
          safetyAlerts: [],
          error: `O valor de "${field.label}" (${numVal} ${field.unit}) está abaixo do limite mínimo de segurança (${field.min} ${field.unit}).`,
        };
      }
      if (field.max !== undefined && numVal > field.max) {
        return {
          calculatorId,
          success: false,
          safetyAlerts: [],
          error: `O valor de "${field.label}" (${numVal} ${field.unit}) excede o limite máximo operacional (${field.max} ${field.unit}).`,
        };
      }
    }
  }

  const safetyAlerts: string[] = [...def.safetyWarnings];

  switch (calculatorId) {
    case 'calc_1_gotas_para_ml': {
      const drops = Number(inputs.drops);
      const dropsPerMl = Number(inputs.dropsPerMl);
      const ml = drops / dropsPerMl;
      return {
        calculatorId,
        success: true,
        primaryValue: ml.toFixed(2),
        primaryUnit: 'mL',
        secondaryResults: [
          { label: 'Fator Aplicado (Específico da Bula)', value: `${dropsPerMl} gotas = 1 mL` },
          { label: 'Gotas Informadas', value: `${drops} gotas` },
        ],
        interpretation: `Para um gotejador calibrado em ${dropsPerMl} gotas/mL, ${drops} gotas correspondem a ${ml.toFixed(2)} mL.`,
        safetyAlerts,
      };
    }

    case 'calc_2_ml_para_gotas': {
      const volumeMl = Number(inputs.volumeMl);
      const dropsPerMl = Number(inputs.dropsPerMl);
      const drops = volumeMl * dropsPerMl;
      return {
        calculatorId,
        success: true,
        primaryValue: drops.toFixed(1),
        primaryUnit: 'gotas',
        secondaryResults: [
          { label: 'Gotas Arredondadas (Inteiro mais próximo)', value: `${Math.round(drops)} gotas` },
          { label: 'Fator da Bula', value: `${dropsPerMl} gotas/mL` },
        ],
        interpretation: `${volumeMl} mL correspondem a ${drops.toFixed(1)} gotas (aprox. ${Math.round(drops)} gotas) para este produto específico.`,
        safetyAlerts,
      };
    }

    case 'calc_3_dose_por_peso': {
      const weightKg = Number(inputs.weightKg);
      const doseMgPerKg = Number(inputs.doseMgPerKg);
      const dosesPerDay = Number(inputs.dosesPerDay);
      const maxSingleDoseMg = Number(inputs.maxSingleDoseMg);
      const singleDose = weightKg * doseMgPerKg;
      const dailyDose = singleDose * dosesPerDay;
      if (singleDose > maxSingleDoseMg) {
        safetyAlerts.unshift(
          `ALERTA CRÍTICO DE TETO POSOLÓGICO: A dose calculada por peso (${singleDose.toFixed(2)} mg) ULTRAPASSA o teto máximo por dose informado (${maxSingleDoseMg.toFixed(2)} mg). Aplicar o limite máximo documentado em bula.`
        );
      }
      return {
        calculatorId,
        success: true,
        primaryValue: singleDose.toFixed(2),
        primaryUnit: 'mg / tomada',
        secondaryResults: [
          {
            label: 'Dose Diária Total Calculada',
            value: `${dailyDose.toFixed(2)} mg/dia (${dosesPerDay}x/dia)`,
          },
          {
            label: 'Dose Efetiva Limitada pelo Teto de Bula',
            value: `${Math.min(singleDose, maxSingleDoseMg).toFixed(2)} mg / tomada`,
          },
        ],
        interpretation:
          singleDose > maxSingleDoseMg
            ? `Cálculo bruto: ${singleDose.toFixed(2)} mg. Limitado pelo teto máximo de bula a ${maxSingleDoseMg.toFixed(2)} mg por dose.`
            : `Dose dentro do limite máximo por tomada informado (${maxSingleDoseMg} mg).`,
        safetyAlerts,
      };
    }

    case 'calc_4_dose_pediatrica': {
      const weightKg = Number(inputs.weightKg);
      const dailyDoseMgKg = Number(inputs.dailyDoseMgKg);
      const dosesPerDay = Number(inputs.dosesPerDay);
      const concentrationMgMl = Number(inputs.concentrationMgMl);
      const totalDailyMg = weightKg * dailyDoseMgKg;
      const singleDoseMg = totalDailyMg / dosesPerDay;
      const singleDoseMl = singleDoseMg / concentrationMgMl;
      return {
        calculatorId,
        success: true,
        primaryValue: singleDoseMl.toFixed(2),
        primaryUnit: 'mL / tomada',
        secondaryResults: [
          { label: 'Massa de Princípio Ativo por Tomada', value: `${singleDoseMg.toFixed(1)} mg` },
          {
            label: 'Dose Total Diária',
            value: `${totalDailyMg.toFixed(1)} mg/dia divididos em ${dosesPerDay} tomadas`,
          },
          {
            label: 'Volume Total Diário',
            value: `${(singleDoseMl * dosesPerDay).toFixed(2)} mL/dia`,
          },
        ],
        interpretation: `Aspirar ${singleDoseMl.toFixed(2)} mL (${singleDoseMg.toFixed(1)} mg) a cada ${Math.round(24 / dosesPerDay)} horas utilizando suspensão de ${concentrationMgMl} mg/mL.`,
        safetyAlerts,
      };
    }

    case 'calc_5_volume_administrar': {
      const prescribedDoseMg = Number(inputs.prescribedDoseMg);
      const availableConcMgMl = Number(inputs.availableConcMgMl);
      const volMl = prescribedDoseMg / availableConcMgMl;
      return {
        calculatorId,
        success: true,
        primaryValue: volMl.toFixed(2),
        primaryUnit: 'mL',
        secondaryResults: [
          { label: 'Dose Prescrita', value: `${prescribedDoseMg} mg` },
          { label: 'Concentração da Apresentação', value: `${availableConcMgMl} mg/mL` },
        ],
        interpretation: `Para administrar ${prescribedDoseMg} mg a partir de uma solução de ${availableConcMgMl} mg/mL, aspirar ${volMl.toFixed(2)} mL.`,
        safetyAlerts,
      };
    }

    case 'calc_6_reconstituicao': {
      const vialMassMg = Number(inputs.vialMassMg);
      const diluentVolumeMl = Number(inputs.diluentVolumeMl);
      const displacementVolumeMl = Number(inputs.displacementVolumeMl);
      const desiredDoseMg = Number(inputs.desiredDoseMg);
      const totalReconstitutedVol = diluentVolumeMl + displacementVolumeMl;
      const finalConc = vialMassMg / totalReconstitutedVol;
      const volumeToWithdraw = desiredDoseMg / finalConc;
      if (desiredDoseMg > vialMassMg) {
        safetyAlerts.unshift(
          `ATENÇÃO: A dose prescrita (${desiredDoseMg} mg) é superior ao conteúdo de 1 frasco-ampola (${vialMassMg} mg). Serão necessários ${Math.ceil(desiredDoseMg / vialMassMg)} frascos-ampola.`
        );
      }
      return {
        calculatorId,
        success: true,
        primaryValue: finalConc.toFixed(2),
        primaryUnit: 'mg/mL (Concentração Reconstituída)',
        secondaryResults: [
          {
            label: 'Volume Total Resultante por Frasco',
            value: `${totalReconstitutedVol.toFixed(2)} mL`,
          },
          {
            label: 'Volume a Aspirar para a Dose Prescrita',
            value: `${volumeToWithdraw.toFixed(2)} mL (para ${desiredDoseMg} mg)`,
          },
        ],
        interpretation: `Após reconstituição, a concentração é de ${finalConc.toFixed(2)} mg/mL. Para obter ${desiredDoseMg} mg, aspirar ${volumeToWithdraw.toFixed(2)} mL.`,
        safetyAlerts,
      };
    }

    case 'calc_7_diluicao': {
      const c1 = Number(inputs.c1);
      const c2 = Number(inputs.c2);
      const v2 = Number(inputs.v2);
      if (c2 >= c1) {
        return {
          calculatorId,
          success: false,
          safetyAlerts,
          error: `Impossível diluir: a concentração final desejada C2 (${c2} mg/mL) deve ser menor que a concentração estoque inicial C1 (${c1} mg/mL).`,
        };
      }
      const v1 = (c2 * v2) / c1;
      const diluentVol = v2 - v1;
      return {
        calculatorId,
        success: true,
        primaryValue: v1.toFixed(2),
        primaryUnit: 'mL da solução estoque (V1)',
        secondaryResults: [
          { label: 'Volume de Veículo Diluente a Adicionar', value: `${diluentVol.toFixed(2)} mL` },
          { label: 'Volume Total Final (V2)', value: `${v2.toFixed(2)} mL a ${c2} mg/mL` },
        ],
        interpretation: `Tomar ${v1.toFixed(2)} mL da solução estoque (${c1} mg/mL) e completar com ${diluentVol.toFixed(2)} mL de diluente compatível para obter ${v2.toFixed(2)} mL a ${c2} mg/mL.`,
        safetyAlerts,
      };
    }

    case 'calc_8_concentracao_final': {
      const totalDoseMg = Number(inputs.totalDoseMg);
      const totalVolumeMl = Number(inputs.totalVolumeMl);
      const maxAllowedConcMgMl = Number(inputs.maxAllowedConcMgMl);
      const finalConc = totalDoseMg / totalVolumeMl;
      if (finalConc > maxAllowedConcMgMl) {
        safetyAlerts.unshift(
          `ALERTA DE CONCENTRAÇÃO MÁXIMA EXCEDIDA: A concentração final (${finalConc.toFixed(2)} mg/mL) excede o limite máximo documentado (${maxAllowedConcMgMl.toFixed(2)} mg/mL). Aumente o volume de diluente compatível.`
        );
      }
      return {
        calculatorId,
        success: true,
        primaryValue: finalConc.toFixed(2),
        primaryUnit: 'mg/mL',
        secondaryResults: [
          { label: 'Limite Máximo Documentado', value: `${maxAllowedConcMgMl.toFixed(2)} mg/mL` },
          {
            label: 'Status de Conformidade',
            value:
              finalConc <= maxAllowedConcMgMl
                ? 'Conforme limite informado'
                : 'ACIMA DO LIMITE MÁXIMO',
          },
        ],
        interpretation: `Concentração final na bolsa/seringa: ${finalConc.toFixed(2)} mg/mL.`,
        safetyAlerts,
      };
    }

    case 'calc_9_velocidade_infusao': {
      const volumeMl = Number(inputs.volumeMl);
      const durationMinutes = Number(inputs.durationMinutes);
      const mlPerHour = (volumeMl / durationMinutes) * 60;
      const mlPerMin = volumeMl / durationMinutes;
      return {
        calculatorId,
        success: true,
        primaryValue: mlPerHour.toFixed(1),
        primaryUnit: 'mL/h',
        secondaryResults: [
          { label: 'Vazão por Minuto', value: `${mlPerMin.toFixed(2)} mL/min` },
          {
            label: 'Tempo Total',
            value: `${durationMinutes} min (${(durationMinutes / 60).toFixed(2)} h)`,
          },
        ],
        interpretation: `Programar a bomba de infusão (BIC) em ${mlPerHour.toFixed(1)} mL/h para infundir ${volumeMl} mL ao longo de ${durationMinutes} minutos.`,
        safetyAlerts,
      };
    }

    case 'calc_10_gotas_por_minuto': {
      const volumeMl = Number(inputs.volumeMl);
      const durationMinutes = Number(inputs.durationMinutes);
      const macroDropsMin = (volumeMl * 20) / durationMinutes;
      return {
        calculatorId,
        success: true,
        primaryValue: macroDropsMin.toFixed(1),
        primaryUnit: 'macrogotas/min',
        secondaryResults: [
          { label: 'Contagem Prática Arredondada', value: `${Math.round(macroDropsMin)} gotas/min` },
          {
            label: 'Vazão Equivalente',
            value: `${((volumeMl / durationMinutes) * 60).toFixed(1)} mL/h`,
          },
        ],
        interpretation: `Ajustar gotejamento para aproximadamente ${Math.round(macroDropsMin)} macrogotas/minuto (equipo padrão 20 gotas/mL).`,
        safetyAlerts,
      };
    }

    case 'calc_11_microgotas_por_minuto': {
      const volumeMl = Number(inputs.volumeMl);
      const durationMinutes = Number(inputs.durationMinutes);
      const microDropsMin = (volumeMl * 60) / durationMinutes;
      return {
        calculatorId,
        success: true,
        primaryValue: microDropsMin.toFixed(1),
        primaryUnit: 'microgotas/min',
        secondaryResults: [
          {
            label: 'Contagem Prática Arredondada',
            value: `${Math.round(microDropsMin)} microgotas/min`,
          },
          { label: 'Equivalência em Bomba (mL/h)', value: `${microDropsMin.toFixed(1)} mL/h` },
        ],
        interpretation: `Ajustar equipo de microgotas (60 mgt/mL) para ${Math.round(microDropsMin)} microgotas/minuto.`,
        safetyAlerts,
      };
    }

    case 'calc_12_duracao_infusao': {
      const volumeMl = Number(inputs.volumeMl);
      const rateMlPerHour = Number(inputs.rateMlPerHour);
      const totalHours = volumeMl / rateMlPerHour;
      const wholeHours = Math.floor(totalHours);
      const remainingMinutes = Math.round((totalHours - wholeHours) * 60);
      return {
        calculatorId,
        success: true,
        primaryValue: `${wholeHours}h ${remainingMinutes}min`,
        primaryUnit: `(${totalHours.toFixed(2)} horas)`,
        secondaryResults: [
          { label: 'Duração Total em Minutos', value: `${Math.round(totalHours * 60)} minutos` },
        ],
        interpretation: `Um volume de ${volumeMl} mL infundido a ${rateMlPerHour} mL/h terá duração estimada de ${wholeHours} horas e ${remainingMinutes} minutos.`,
        safetyAlerts,
      };
    }

    case 'calc_13_superficie_corporal': {
      const weightKg = Number(inputs.weightKg);
      const heightCm = Number(inputs.heightCm);
      const mosteller = Math.sqrt((heightCm * weightKg) / 3600);
      const dubois = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425);
      return {
        calculatorId,
        success: true,
        primaryValue: mosteller.toFixed(2),
        primaryUnit: 'm² (Mosteller)',
        secondaryResults: [
          { label: 'Fórmula de DuBois & DuBois', value: `${dubois.toFixed(2)} m²` },
          {
            label: 'Índice de Massa Corporal (IMC Associado)',
            value: `${(weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)} kg/m²`,
          },
        ],
        interpretation: `Superfície corporal calculada: ${mosteller.toFixed(2)} m² (Mosteller) e ${dubois.toFixed(2)} m² (DuBois).`,
        safetyAlerts,
      };
    }

    case 'calc_14_conversao_concentracao_percentual': {
      const percentWv = Number(inputs.percentWv);
      const ampouleVolumeMl = Number(inputs.ampouleVolumeMl);
      const mgPerMl = percentWv * 10;
      const totalMassMg = mgPerMl * ampouleVolumeMl;
      const totalMassG = totalMassMg / 1000;
      return {
        calculatorId,
        success: true,
        primaryValue: mgPerMl.toFixed(2),
        primaryUnit: 'mg/mL',
        secondaryResults: [
          {
            label: `Massa Total na Ampola/Frasco (${ampouleVolumeMl} mL)`,
            value: `${totalMassMg.toFixed(1)} mg (${totalMassG.toFixed(3)} g)`,
          },
          { label: 'Concentração em mcg/mL', value: `${(mgPerMl * 1000).toFixed(0)} mcg/mL` },
        ],
        interpretation: `Uma solução a ${percentWv}% (p/v) contém ${mgPerMl.toFixed(2)} mg/mL, totalizando ${totalMassMg.toFixed(1)} mg em ${ampouleVolumeMl} mL.`,
        safetyAlerts,
      };
    }

    case 'calc_15_conversao_massa_g_mg_mcg': {
      const value = Number(inputs.value);
      const fromUnit = String(inputs.fromUnit);
      let inMg = value;
      if (fromUnit === 'g') inMg = value * 1000;
      if (fromUnit === 'mcg') inMg = value / 1000;
      const inG = inMg / 1000;
      const inMcg = inMg * 1000;
      return {
        calculatorId,
        success: true,
        primaryValue: `${inMg.toFixed(4)} mg`,
        primaryUnit: `= ${inMcg.toFixed(2)} mcg`,
        secondaryResults: [
          { label: 'Em Gramas (g)', value: `${inG.toFixed(6)} g` },
          { label: 'Em Miligramas (mg)', value: `${inMg.toFixed(4)} mg` },
          { label: 'Em Microgramas (mcg)', value: `${inMcg.toFixed(2)} mcg` },
        ],
        interpretation: `Conversão exata SI: ${inG} g = ${inMg} mg = ${inMcg} mcg.`,
        safetyAlerts,
      };
    }

    case 'calc_16_unidades_internacionais_ui': {
      const prescribedUi = Number(inputs.prescribedUi);
      const concentrationUiMl = Number(inputs.concentrationUiMl);
      const volMl = prescribedUi / concentrationUiMl;
      return {
        calculatorId,
        success: true,
        primaryValue: volMl.toFixed(2),
        primaryUnit: 'mL',
        secondaryResults: [
          {
            label: 'Dose Biológica Prescrita',
            value: `${prescribedUi.toLocaleString('pt-BR')} UI`,
          },
          {
            label: 'Potência da Apresentação',
            value: `${concentrationUiMl.toLocaleString('pt-BR')} UI/mL`,
          },
        ],
        interpretation: `Aspirar ${volMl.toFixed(2)} mL da apresentação de ${concentrationUiMl.toLocaleString('pt-BR')} UI/mL para administrar ${prescribedUi.toLocaleString('pt-BR')} UI.`,
        safetyAlerts,
      };
    }

    case 'calc_17_meq_e_mmol': {
      const massMg = Number(inputs.massMg);
      const molarMass = Number(inputs.molarMass);
      const valence = Number(inputs.valence);
      const mmol = massMg / molarMass;
      const meq = mmol * valence;
      return {
        calculatorId,
        success: true,
        primaryValue: meq.toFixed(2),
        primaryUnit: 'mEq',
        secondaryResults: [
          { label: 'Quantidade de Matéria (mmol)', value: `${mmol.toFixed(2)} mmol` },
          {
            label: 'Massa Informada',
            value: `${massMg.toFixed(1)} mg (MM: ${molarMass} g/mol, Valência: ${valence})`,
          },
        ],
        interpretation: `${massMg} mg do composto (MM ${molarMass} g/mol, valência ${valence}) fornecem ${mmol.toFixed(2)} mmol e ${meq.toFixed(2)} mEq.`,
        safetyAlerts,
      };
    }

    case 'calc_18_osmolaridade': {
      const soluteGramsPerLiter = Number(inputs.soluteGramsPerLiter);
      const molarMass = Number(inputs.molarMass);
      const dissociationParticles = Number(inputs.dissociationParticles);
      const mOsmL = (soluteGramsPerLiter / molarMass) * dissociationParticles * 1000;
      const routeWarning =
        mOsmL > 900
          ? 'ACESSO VENOSO CENTRAL OBRIGATÓRIO (> 900 mOsm/L — Alto risco de flebite/necrose periférica)'
          : mOsmL > 600
          ? 'Cautela em acesso periférico (600 a 900 mOsm/L — Monitorar flebite e considerar acesso central em infusão prolongada)'
          : 'Compatível com acesso venoso periférico (< 600 mOsm/L)';
      if (mOsmL > 900) {
        safetyAlerts.unshift(
          `ALERTA CRÍTICO DE OSMOLARIDADE (${mOsmL.toFixed(1)} mOsm/L): Excede o limite de 900 mOsm/L para veia periférica.`
        );
      }
      return {
        calculatorId,
        success: true,
        primaryValue: mOsmL.toFixed(1),
        primaryUnit: 'mOsm/L',
        secondaryResults: [{ label: 'Classificação de Via Venosa', value: routeWarning }],
        interpretation: `Osmolaridade teórica estimada: ${mOsmL.toFixed(1)} mOsm/L (${routeWarning}).`,
        safetyAlerts,
      };
    }

    case 'calc_19_funcao_renal_cockcroft_gault': {
      const ageYears = Number(inputs.ageYears);
      const weightKg = Number(inputs.weightKg);
      const serumCreatinineMgDl = Number(inputs.serumCreatinineMgDl);
      const sex = String(inputs.sex);
      let clcr = ((140 - ageYears) * weightKg) / (72 * serumCreatinineMgDl);
      if (sex === 'F') {
        clcr *= 0.85;
      }
      let stage = 'Função renal preservada / Disfunção leve (> 50 mL/min)';
      if (clcr < 10) {
        stage =
          'Falência Renal (< 10 mL/min) — Exige ajuste posológico rigoroso na maioria dos fármacos de excreção renal';
      } else if (clcr <= 30) {
        stage =
          'Disfunção Renal Moderada a Grave (10 a 30 mL/min) — Verificar ajuste de dose/intervalo na aba Posologia da bula';
      } else if (clcr <= 50) {
        stage =
          'Disfunção Renal Moderada (30 a 50 mL/min) — Verificar limiar específico do medicamento (ex.: Meropeném ajusta se ≤ 50 mL/min)';
      }
      return {
        calculatorId,
        success: true,
        primaryValue: clcr.toFixed(1),
        primaryUnit: 'mL/min',
        secondaryResults: [
          { label: 'Classificação para Ajuste de Bula', value: stage },
          {
            label: 'Fator de Sexo Aplicado',
            value: sex === 'F' ? '0,85 (Feminino)' : '1,00 (Masculino)',
          },
        ],
        interpretation: `Clearance de Creatinina estimado (Cockcroft-Gault): ${clcr.toFixed(1)} mL/min. ${stage}.`,
        safetyAlerts,
      };
    }

    case 'calc_20_avaliacao_hepatica_child_pugh': {
      const bili = Number(inputs.bilirubinMgDl);
      const alb = Number(inputs.albuminGDl);
      const inr = Number(inputs.inr);
      const ascPts = Number(inputs.ascites);
      const encPts = Number(inputs.encephalopathy);

      const biliPts = bili < 2.0 ? 1 : bili <= 3.0 ? 2 : 3;
      const albPts = alb > 3.5 ? 1 : alb >= 2.8 ? 2 : 3;
      const inrPts = inr < 1.7 ? 1 : inr <= 2.3 ? 2 : 3;

      const totalScore = biliPts + albPts + inrPts + ascPts + encPts;
      const childClass =
        totalScore <= 6
          ? 'Classe A (5 a 6 pontos — Disfunção Hepática Leve / Compensada)'
          : totalScore <= 9
          ? 'Classe B (7 a 9 pontos — Disfunção Hepática Moderada)'
          : 'Classe C (10 a 15 pontos — Disfunção Hepática Grave / Descompensada)';

      return {
        calculatorId,
        success: true,
        primaryValue: `${totalScore} pontos`,
        primaryUnit: childClass.split(' (')[0],
        secondaryResults: [
          { label: 'Classificação Funcional', value: childClass },
          {
            label: 'Detalhamento da Pontuação',
            value: `Bilirrubina: ${biliPts}pt | Albumina: ${albPts}pt | RNI: ${inrPts}pt | Ascite: ${ascPts}pt | Encefalopatia: ${encPts}pt`,
          },
        ],
        interpretation: `Escore Child-Pugh = ${totalScore} pontos (${childClass}). Consulte na aba Posologia da ficha os ajustes documentados para insuficiência hepática.`,
        safetyAlerts,
      };
    }

    default:
      return {
        calculatorId,
        success: false,
        safetyAlerts: [],
        error: 'Fórmula não implementada.',
      };
  }
}

/**
 * Executa os testes automatizados reais das 20 calculadoras,
 * chamando executeValidatedCalculation(id, inputs) em tempo de execução
 * e comparando o resultado obtido com o resultado esperado.
 */
export function runAutomatedCalculatorTestSuite(
  targetCalculatorId?: string
): ExecutedCalculatorTestResult[] {
  const results: ExecutedCalculatorTestResult[] = [];
  const definitions = targetCalculatorId
    ? CALCULATOR_DEFINITIONS.filter((c) => c.id === targetCalculatorId)
    : CALCULATOR_DEFINITIONS;

  for (const calc of definitions) {
    for (const spec of calc.testSpecs) {
      const actual = executeValidatedCalculation(calc.id, spec.inputs);
      let passed = false;
      let expectedOutput = '';
      let actualOutput = '';

      if (spec.expectSuccess) {
        expectedOutput = `${spec.expectedPrimaryValue}`;
        actualOutput = actual.success
          ? `${actual.primaryValue}`
          : `ERRO: ${actual.error || 'Falha inesperada'}`;
        passed =
          actual.success === true && actual.primaryValue === spec.expectedPrimaryValue;
      } else {
        expectedOutput = `Bloqueio esperado contendo: "${spec.expectedErrorSubstring || 'erro'}"`;
        actualOutput = actual.success
          ? `SUCESSO INDEVIDO (${actual.primaryValue})`
          : `Bloqueado com segurança: ${actual.error}`;
        passed =
          actual.success === false &&
          Boolean(actual.error) &&
          (!spec.expectedErrorSubstring ||
            actual.error!.toLowerCase().includes(spec.expectedErrorSubstring.toLowerCase()));
      }

      results.push({
        calculatorId: calc.id,
        calculatorNumber: calc.number,
        calculatorName: calc.name,
        testName: spec.name,
        category: spec.category,
        inputs: spec.inputs,
        expectSuccess: spec.expectSuccess,
        expectedOutput,
        actualOutput,
        passed,
      });
    }
  }

  return results;
}
