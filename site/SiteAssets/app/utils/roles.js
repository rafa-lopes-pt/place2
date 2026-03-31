import { ContextStore } from '../libs/nofbiz/nofbiz.base.js';

export const TEAM_OPTIONS = [
  { label: 'COM-GOV - Commercial', value: 'COM-GOV' },
  { label: 'COM-BKP - Banking Partnerships', value: 'COM-BKP' },
  { label: 'COM-BRP - Broker Partnerships', value: 'COM-BRP' },
  { label: 'COM-DRC - Strategy & Planning DRC', value: 'COM-DRC' },
  { label: 'COM-MOB - Mobility OEM & Top Dealers', value: 'COM-MOB' },
  { label: 'COM-RMI - Relational Marketing & Insurance', value: 'COM-RMI' },
  { label: 'COM-STF - Stock Financing', value: 'COM-STF' },
  { label: 'FIN-GOV - Finance', value: 'FIN-GOV' },
  { label: 'FIN-CTB - Contabilidade e Tesouraria', value: 'FIN-CTB' },
  { label: 'FIN-GRF - Granting & Financing', value: 'FIN-GRF' },
  { label: 'ITD-GOV - IT & Digital', value: 'ITD-GOV' },
  { label: 'ITD-CGP - COE IT Governance', value: 'ITD-CGP' },
  { label: 'ITD-DAT - COE Data', value: 'ITD-DAT' },
  { label: 'ITD-ODD - TIBRO ODD', value: 'ITD-ODD' },
  { label: 'ITD-SRV - IT Service Delivery', value: 'ITD-SRV' },
  { label: 'LEG-JRI - Juridico e Relacoes Inst.', value: 'LEG-JRI' },
  { label: 'LEG-JUR - Juridico', value: 'LEG-JUR' },
  { label: 'OPS-GOV - Operations', value: 'OPS-GOV' },
  { label: 'OPS-BSP - Operations & Business Support', value: 'OPS-BSP' },
  { label: 'OPS-CCR - Customer Care & Rebound', value: 'OPS-CCR' },
  { label: 'OPS-COL - Operational Collections', value: 'OPS-COL' },
  { label: 'RSK-GOV - Risk & Compliance', value: 'RSK-GOV' },
  { label: 'RSK-ANA - Risk Analytics', value: 'RSK-ANA' },
  { label: 'RSK-REG - Risk Governance & Regulatory', value: 'RSK-REG' },
  { label: 'RSK-CCT - Conduct & Control', value: 'RSK-CCT' },
  { label: 'STR-GOV - Strategy & Transformation', value: 'STR-GOV' },
  { label: 'STR-AGI - Transformation & COE Agile', value: 'STR-AGI' },
  { label: 'STR-BRD - Brand Communication & Offer', value: 'STR-BRD' },
  { label: 'STR-COO - Direccao COO & Transformation', value: 'STR-COO' },
  { label: 'STR-MKT - Strategic Marketing & COE CX', value: 'STR-MKT' },
  { label: 'STR-SYN - Group Synergies', value: 'STR-SYN' },
];

export const TEAMS = TEAM_OPTIONS.map((t) => t.value);

export const ROLES = {
  COLABORADOR: 'colaborador',
  GESTOR: 'gestor',
  MENTOR: 'mentor',
  EXECUTIVO: 'executivo',
};

export const PERMISSION_MAP = {
  inicio: ['*'],
  instrucoes: ['*'],
  pessoal: ['colaborador', 'mentor'],
  equipa: ['colaborador', 'gestor', 'mentor'],
  mentoria: ['mentor'],
  gestor: ['gestor'],
  catalogo: ['*'],
  dashboard: ['mentor'],
  admin: ['mentor'],
  submeter: ['colaborador', 'mentor'],
  aprovar_projecto: ['mentor'],
  validar_savings_auto: ['gestor'],
  validar_savings_final: ['mentor'],
  solicitar_revisao: ['gestor', 'mentor'],
  rejeitar: ['gestor', 'mentor'],
  cancelar_proprio: ['colaborador', 'gestor', 'mentor'],
  editar: ['colaborador', 'gestor', 'mentor'],
  administracao: ['mentor'],
};

/**
 * Returns the current user's OUID from ContextStore (set during app init).
 * @returns {string}
 */
export function getUserOUID() {
  return ContextStore.get('userOUID') || '';
}

/**
 * Checks if the current user has a specific role.
 * @param {string} role
 * @returns {boolean}
 */
export function hasProfile(role) {
  const roles = ContextStore.get('userRoles') || [];
  return roles.includes(role);
}

/**
 * Checks if the current user has at least one of the given roles.
 * @param {string[]} roles
 * @returns {boolean}
 */
export function hasAnyProfile(roles) {
  const userRoles = ContextStore.get('userRoles') || [];
  return roles.some(r => userRoles.includes(r));
}

/**
 * Checks if the current user can access a given area based on PERMISSION_MAP.
 * @param {string} area
 * @returns {boolean}
 */
export function canAccess(area) {
  const perms = PERMISSION_MAP[area];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  const userRoles = ContextStore.get('userRoles') || [];
  return userRoles.some(r => perms.includes(r));
}

/**
 * Returns the current user's roles array.
 * @returns {string[]}
 */
export function getUserRoles() {
  return ContextStore.get('userRoles') || [];
}

/**
 * Checks if a user belongs to a specific SharePoint group.
 * @param {CurrentUser} user
 * @param {string} groupTitle
 * @returns {boolean}
 */
export function isInGroup(user, groupTitle) {
  const groups = user.get('groups') || [];
  return groups.some(g => g.Title === groupTitle);
}

/**
 * Returns the full team label for an OUID code, or the code itself as fallback.
 * @param {string} ouid
 * @returns {string}
 */
export function getTeamLabel(ouid) {
  return TEAM_OPTIONS.find(t => t.value === ouid)?.label || ouid;
}

export function getTeamName(ouid) {
  const label = getTeamLabel(ouid);
  return label?.split(' - ')[1] ?? label;
}
