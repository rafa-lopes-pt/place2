export const EVENT_TYPES = {
  CREATION: 'Creation',
  SUBMISSION: 'Submission',
  MENTOR_APPROVAL: 'MentorApproval',
  MENTOR_REJECTION: 'MentorRejection',
  EXECUTION_START: 'ExecutionStart',
  SAVINGS_SUBMISSION: 'SavingsSubmission',
  BUSINESS_VALIDATION: 'BusinessValidation',
  BUSINESS_REJECTION: 'BusinessRejection',
  REVIEW_REQUEST: 'ReviewRequest',
  RESUBMISSION: 'Resubmission',
  CANCELLATION: 'Cancellation',
  IMPLEMENTATION: 'Implementation',
  TRANSFER: 'Transfer',
  MENTOR_FINAL_VALIDATION: 'MentorFinalValidation',
  OWNER_IMPLEMENTATION: 'OwnerImplementation',
  COMMENT: 'Comment',
  SHARE: 'Share',
};

// OrgHierarchy DeptCode (OUID) values that grant mentor role by default
export const MENTOR_DEPT_OUIDS = ['STR-AGI'];

// OrgHierarchy Category values that grant gestor role
export const GESTOR_CATEGORIES = ['Executive', 'Top Management', 'Management'];

// SharePoint group that grants bootstrap admin access when OrgHierarchy is empty
export const BOOTSTRAP_ADMIN_GROUP = 'PACE Owners';

// -- Saving Categories (client matrix) --

export const SAVING_CATEGORIES = [
  'Sem Savings',
  'Reducao de custos',
  'Aumento de receita',
  'Reducao de risco',
  'Custos e riscos evitados',
  'Melhoria de qualidade',
];

export const HARD_CATEGORIES = ['Reducao de custos', 'Aumento de receita', 'Reducao de risco'];
export const SOFT_CATEGORIES = ['Custos e riscos evitados', 'Melhoria de qualidade'];

export const SAVING_CATEGORY_GUIDANCE = {
  'Sem Savings': 'Iniciativa sem impacto financeiro directo.',
  'Reducao de custos': 'Reducao de FTE, contratos temporarios, despesas de prestadores, horas extra, material de escritorio. Comparacao com custos N-1 ou orcamento do Ano N.',
  'Aumento de receita': 'Aumento de PNB via crescimento de vendas. Creditos, seguros, produtos complementares.',
  'Reducao de risco': 'Melhoria de eficiencia de cobranca, reducao de taxa de reincidencia.',
  'Custos e riscos evitados': 'Recrutamento evitado, coimas/penalizacoes/custos evitados, riscos evitados. Despesas previstas, nao orcamentadas e nao incorridas.',
  'Melhoria de qualidade': 'Aumento de satisfacao do cliente. Fidelizacao e imagem.',
};

/**
 * Derives SavingType from SavingCategory.
 * @param {string} category
 * @returns {'Sem saving' | 'Hard Saving' | 'Soft Saving'}
 */
export function deriveSavingType(category) {
  if (!category) return 'Sem saving';
  if (HARD_CATEGORIES.includes(category)) return 'Hard Saving';
  if (SOFT_CATEGORIES.includes(category)) return 'Soft Saving';
  return 'Sem saving';
}

// -- Annualization --

export const ANNUALIZATION_FACTORS = {
  'Diario': 252,
  'Mensal': 12,
  'Trimestral': 4,
  'Semestral': 2,
  'Anual': 1,
};

/**
 * Annualizes a per-period savings value.
 * @param {string|number} value - The per-period value
 * @param {string} timePeriod - One of: Diario, Mensal, Trimestral, Semestral, Anual
 * @returns {number} Annualized value (0 if inputs are invalid)
 */
export function annualizeSavings(value, timePeriod) {
  const num = parseFloat(String(value).replace(/[^\d.]/g, '')) || 0;
  const factor = ANNUALIZATION_FACTORS[timePeriod] || 0;
  return num * factor;
}

export const STATUS_DESCRIPTIONS = {
  'Rascunho':        'Iniciativa em elaboracao, ainda nao submetida para validacao.',
  'Submetido':       'Aguarda validacao pelo mentor de projecto.',
  'Validado Mentor': 'Projecto aprovado pelo mentor e em fase de execucao.',
  'Em Execucao':     'Iniciativa em execucao activa.',
  'Por Validar':     'Savings submetidos, aguarda validacao pelo gestor.',
  'Validado Gestor': 'Savings validados pelo gestor, aguarda confirmacao final.',
  'Validado Final':  'Validacao final concluida, pronta para implementacao.',
  'Implementado':    'Iniciativa implementada e concluida com sucesso.',
  'Em Revisao':      'Devolvida para revisao antes de nova submissao.',
  'Rejeitado':       'Iniciativa rejeitada pelo avaliador.',
  'Cancelado':       'Iniciativa cancelada.',
};

export const INITIATIVE_TAGS = [
  'Business Automation',
  'Controls',
  'Data Management',
  'Error Reduction',
  'Excel',
  'Incident Management',
  'Knowledge & Training',
  'KPIs & Performance Management',
  'Organisation',
  'PDF',
  'People & Culture',
  'Power BI',
  'Procedures',
  'Reputation & Client Satisfaction',
  'Risk Management',
  'Standardisation',
  'Templates',
  'VBA Macro',
  'Voice of the Customer',
  'Wellbeing',
];
