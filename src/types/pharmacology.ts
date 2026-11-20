export type ContentValidationStatus =
  | 'importado'
  | 'pendente_conferencia'
  | 'em_revisao'
  | 'verificado_documentalmente'
  | 'aprovado_publicacao'
  | 'desatualizado'
  | 'rejeitado';

export type RegulatoryCategory =
  | 'Referência'
  | 'Novo'
  | 'Genérico'
  | 'Similar'
  | 'Biológico'
  | 'Específico'
  | 'Fitoterápico'
  | 'Dinamizado'
  | 'Radiofármaco'
  | 'Baixo Risco'
  | 'Gases Medicinais'
  | 'Produto de Terapia Avançada'
  | 'Não Informado';

export type AwareClassification = 'Access' | 'Watch' | 'Reserve' | 'Não Aplicável';

export type HealthProfession =
  | 'Farmacêutico'
  | 'Médico'
  | 'Enfermeiro'
  | 'Técnico de enfermagem'
  | 'Cirurgião-dentista'
  | 'Nutricionista'
  | 'Biomédico'
  | 'Fisioterapeuta'
  | 'Médico-veterinário'
  | 'Outro profissional de saúde';

export type ProfessionalRole =
  | 'usuario_profissional'
  | 'revisor_cientifico'
  | 'editor_cientifico'
  | 'administrador';

export interface ProfessionalUserProfile {
  uid: string;
  fullName: string;
  email?: string;
  profession: HealthProfession;
  customProfession: string;
  specialty: string;
  council: string;
  registrationNumber: string;
  registrationUf: string;
  avatarUrl: string;
  role: ProfessionalRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProvenanceMetadata {
  sourceId: string;
  sourceName: string;
  institution: string;
  documentTitle: string;
  externalIdentifier: string;
  officialUrl: string;
  publishedDate: string;
  retrievedDate: string;
  version: string;
  sectionOrigin: string;
  supportingExcerpt: string;
  extractionMethod:
    | 'Extração Documental Verificada'
    | 'Curadoria Farmacêutica Manual'
    | 'Sincronização Oficial ANVISA';
  reviewStatus: ContentValidationStatus;
  reviewedBy: string;
  divergenceNote?: string;
}

export interface ActiveIngredient {
  id: string;
  name: string;
  dcbCode: string;
  casNumber: string;
  synonyms: string[];
  atcCode: string;
  atcDescription: string;
  atcVersionConsulted: string;
  awareClass: AwareClassification;
  awareVersionConsulted: string;
  therapeuticClasses: string[];
  pharmacologicalClasses: string[];
  highAlertMedication: boolean;
  lasaWarning?: string;
  pharmacology: {
    mechanismOfAction: string;
    receptorsAndTargets: string[];
    pharmacodynamics: string;
    absorption: string;
    distribution: string;
    proteinBinding: string;
    metabolism: string;
    metabolites: string;
    elimination: string;
    bioavailability: string;
    halfLife: string;
    onsetAndDuration: string;
    pharmacogenetics?: string;
    provenance: ProvenanceMetadata;
  };
  antimicrobialProfile?: {
    antimicrobialClass: string;
    awareCategory: AwareClassification;
    spectrumOfAction: string[];
    associatedMicroorganisms: string[];
    resistanceMechanisms: string[];
    stewardshipGuidelines: string;
    provenance: ProvenanceMetadata;
  };
}

export interface ProductPresentation {
  id: string;
  productId: string;
  concentration: string;
  dosageForm: string;
  commercialPresentation: string;
  packaging: string;
  administrationRoute: string;
  gtinEan?: string;
  dropsPerMl?: number; // Explicit per-product factor when documented in bula
  reconstitutionAndDilution?: {
    reconstitutionDiluent: string;
    reconstitutionVolume: string;
    compatibleDiluents: string[];
    finalConcentration: string;
    physicochemicalCompatibility: string;
    ySiteCompatibility: string[];
    ySiteIncompatibility: string[];
    stabilityAfterOpening: string;
    stabilityAfterReconstitution: string;
    stabilityAfterDilution: string;
    storageTemperature: string;
    photosensitivity: boolean;
    thermolability: boolean;
    infusionRate: string;
    administrationNotes: string;
    manufacturerSpecificNotice: string;
    provenance: ProvenanceMetadata;
  };
}

export interface ClinicalIndication {
  id: string;
  condition: string;
  clinicalContext: string;
  population: string;
  regulatoryApprovalType:
    | 'Uso Aprovado em Bula'
    | 'Uso Descrito em Diretriz (Off-Label Documentado)'
    | 'Evidência de Estudo Clínico';
  treatmentLineContext: string; // Bound to indication, population, clinical context, and reference guideline
  evidenceLevel: string;
  referenceGuideline: string;
  publicationDate: string;
  reviewDate: string;
  provenance: ProvenanceMetadata;
}

export interface DosageRegimen {
  id: string;
  indicationId: string;
  presentationId: string;
  population:
    | 'Adultos'
    | 'Crianças'
    | 'Neonatos'
    | 'Idosos'
    | 'Gestantes'
    | 'Lactantes'
    | 'Insuficiência Renal'
    | 'Insuficiência Hepática'
    | 'Diálise';
  sourceType: 'Posologia de Bula Oficial' | 'Recomendação de Diretriz Clínica';
  initialDose: string;
  usualDose: string;
  maxDose: string;
  weightBasedDose?: string;
  bsaBasedDose?: string;
  interval: string;
  frequency: string;
  duration: string;
  route: string;
  adjustments: string;
  administrationCautions: string;
  monitoring: string;
  provenance: ProvenanceMetadata;
}

export interface ContraindicationRecord {
  id: string;
  type:
    | 'Contraindicação Absoluta'
    | 'Contraindicação Relativa'
    | 'Precaução'
    | 'Advertência'
    | 'Alergia e Reação Cruzada'
    | 'Gestação'
    | 'Lactação'
    | 'Pediatria / Geriatria';
  description: string;
  clinicalCondition: string;
  riskCategory?: string;
  provenance: ProvenanceMetadata;
}

export interface AdverseReactionRecord {
  id: string;
  description: string;
  frequency:
    | 'Muito comum (≥ 1/10)'
    | 'Comum (≥ 1/100 e < 1/10)'
    | 'Incomum (≥ 1/1.000 e < 1/100)'
    | 'Rara (≥ 1/10.000 e < 1/1.000)'
    | 'Muito rara (< 1/10.000)'
    | 'Frequência desconhecida';
  severity: 'Leve a Moderada' | 'Grave' | 'Crítica / Risco à Vida';
  organSystem: string;
  originType: 'Descrita em Bula' | 'Notificação de Farmacovigilância' | 'Estudo Clínico';
  occurrenceConditions: string;
  safetyGuidance: string;
  provenance: ProvenanceMetadata;
}

export interface MedicationProduct {
  id: string;
  commercialName: string;
  genericDesignation: string;
  activeIngredientIds: string[];
  isCombination: boolean;
  manufacturer: string;
  manufacturerCnpj: string;
  registrationHolder: string;
  anvisaRegistration: string;
  processNumber?: string;
  registrationExpirationDate?: string;
  processFinalizationDate?: string;
  therapeuticClassAnvisa?: string;
  lastSyncDate?: string;
  hasCuratedClinicalMonograph?: boolean;
  regulatoryStatus: 'Válido / Ativo' | 'Suspenso' | 'Cancelado' | 'Em Renovação';
  regulatoryCategory: RegulatoryCategory;
  referenceMedicationName?: string;
  prescriptionRequirement: string;
  bulaProfessionalUrl: string;
  lastUpdated: string;
  validationStatus: ContentValidationStatus;
  completenessScore: number; // 0-100 factual completeness of structured fields
  presentations: ProductPresentation[];
  indications: ClinicalIndication[];
  dosageRegimens: DosageRegimen[];
  contraindications: ContraindicationRecord[];
  adverseReactions: AdverseReactionRecord[];
  safetyAlerts: {
    highAlert: boolean;
    lasaPair?: string;
    overdoseRisk: string;
    antidote: string;
    requiredLabMonitoring: string[];
  };
  provenance: ProvenanceMetadata;
}

export interface AnvisaCatalogStats {
  syncStatus: 'concluido' | 'em_sincronizacao' | 'erro';
  lastSyncDate: string;
  sourceUrl: string;
  presentationsSourceUrl: string;
  rawCsvRowsProcessed: number;
  duplicatesConsolidated: number;
  importErrors: number;
  totalUniqueMedications: number;
  activeMedicationsCount: number;
  inactiveOrCanceledMedicationsCount: number;
  totalPresentationsIdentified: number;
  uniqueActiveIngredientsCount: number;
  uniqueManufacturersCount: number;
  uniqueTherapeuticClassesCount: number;
  curatedClinicalMonographsLinked: number;
  categoryBreakdown: Record<string, number>;
  topTherapeuticClasses: Array<{ name: string; count: number }>;
  topManufacturers: Array<{ name: string; count: number }>;
}

export interface PaginatedCatalogResponse {
  items: MedicationProduct[];
  totalMatched: number;
  activeMatched: number;
  inactiveMatched: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs: number;
}

export interface DrugInteractionRecord {
  id: string;
  substanceAId: string;
  substanceAName: string;
  targetType:
    | 'Medicamento vs Medicamento'
    | 'Medicamento vs Alimento'
    | 'Medicamento vs Bebida Alcoólica'
    | 'Medicamento vs Suplemento'
    | 'Medicamento vs Fitoterápico'
    | 'Medicamento vs Condição Clínica'
    | 'Medicamento vs Exame Laboratorial';
  targetId?: string;
  targetName: string;
  severity:
    | 'Contraindicação Formal'
    | 'Associação a Evitar'
    | 'Interação Relevante (Exige Monitoramento)'
    | 'Interação de Menor Relevância';
  interactionType:
    | 'Farmacocinética'
    | 'Farmacodinâmica'
    | 'Físico-Química'
    | 'Interferência Analítica';
  mechanism: string;
  potentialConsequence: string;
  availableEvidence: string;
  recommendedConduct: string;
  monitoringRequirement: string;
  applicablePopulation: string;
  limitations: string;
  lastUpdated: string;
  provenance: ProvenanceMetadata;
}

export interface ScientificSourceRecord {
  id: string;
  name: string;
  institution: string;
  officialUrl: string;
  documentType: string;
  country: string;
  language: string;
  publishedDate: string;
  updatedDate: string;
  licenseTerms: string;
  retrievalMethod: string;
  updateFrequency: string;
  redistributionRestrictions: string;
}

export interface OfficialSourceIngestionSpec {
  id: string;
  sourceName: string;
  institution: string;
  officialEndpointOrPortal: string;
  accessFormat: string;
  licenseAndTerms: string;
  ingestionPipelineStage: string;
  validationRule: string;
  lastAuditDate: string;
}

export interface SanitaryAlertRecord {
  id: string;
  title: string;
  alertType:
    | 'Alerta de Farmacovigilância'
    | 'Recolhimento de Lote'
    | 'Suspensão Sanitária'
    | 'Atualização de Segurança de Bula';
  issuer: string;
  documentNumber: string;
  publishedDate: string;
  affectedSubstanceOrProduct: string;
  summary: string;
  clinicalActionRequired: string;
  officialUrl: string;
}
