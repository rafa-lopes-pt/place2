import {
  Dialog,
  Toast,
  TextArea,
  FormField,
  Container,
  Text,
  Button,
  ContextStore,
  ComboBox,
  FieldLabel,
  extractComboBoxValue,
  UserIdentity,
  PeoplePicker,
} from '../libs/nofbiz/nofbiz.base.js';

import { STATUS, canTransitionTo } from './status-helpers.js';
import { transitionStatus, update } from './initiatives-api.js';
import { createEvent } from './initiative-events-api.js';
import { createNotification } from './notifications-api.js';
import { EVENT_TYPES, annualizeSavings, deriveSavingType } from './constants.js';
import { getAssignedGestor } from './routing-rules.js';
import { getByInitiative as getFinancials } from './financials-api.js';
import { getAllEmployees, deriveRoles } from './org-hierarchy-api.js';
import { shareInitiative } from './shared-api.js';

// -- Confirmation helpers (DRY) --

/**
 * Shows a simple confirmation Dialog and returns a Promise<boolean>.
 * @param {string} title
 * @param {string} message
 * @param {{ confirmLabel?: string, cancelLabel?: string, variant?: 'info'|'warning'|'error' }} [opts]
 * @returns {Promise<boolean>}
 */
function confirm(title, message, opts = {}) {
  const {
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'warning',
  } = opts;

  return new Promise((resolve) => {
    const dialog = new Dialog({
      title,
      variant,
      content: new Text(message, { type: 'p' }),
      backdrop: true,
      closeOnFocusLoss: false,
      containerSelector: 'body',
      footer: new Container([
        new Button(cancelLabel, {
          variant: 'secondary',
          onClickHandler: () => {
            dialog.close();
            dialog.remove();
            resolve(false);
          },
        }),
        new Button(confirmLabel, {
          variant: variant === 'error' ? 'danger' : 'primary',
          onClickHandler: () => {
            dialog.close();
            dialog.remove();
            resolve(true);
          },
        }),
      ]),
    });
    dialog.render();
    dialog.open();
  });
}

/**
 * Shows a confirmation Dialog with a mandatory comment TextArea.
 * Returns the comment string on confirm, or null on cancel/empty comment.
 * @param {string} title
 * @param {string} message
 * @param {{ confirmLabel?: string, cancelLabel?: string, variant?: 'info'|'warning'|'error', placeholder?: string }} [opts]
 * @returns {Promise<string|null>}
 */
function confirmWithComment(title, message, opts = {}) {
  const {
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'error',
    placeholder = 'Comentario (obrigatorio)...',
  } = opts;

  const commentField = new FormField({ value: '' });
  const commentInput = new TextArea(commentField, { placeholder, rows: 3 });

  return new Promise((resolve) => {
    const dialog = new Dialog({
      title,
      variant,
      content: new Container([
        new Text(message, { type: 'p' }),
        commentInput,
      ]),
      backdrop: true,
      closeOnFocusLoss: false,
      containerSelector: 'body',
      footer: new Container([
        new Button(cancelLabel, {
          variant: 'secondary',
          onClickHandler: () => {
            dialog.close();
            dialog.remove();
            commentField.dispose();
            resolve(null);
          },
        }),
        new Button(confirmLabel, {
          variant: 'danger',
          onClickHandler: () => {
            const comment = commentField.value?.trim() || '';
            dialog.close();
            dialog.remove();
            commentField.dispose();
            if (!comment) {
              Toast.error('O comentario e obrigatorio.');
              resolve(null);
              return;
            }
            resolve(comment);
          },
        }),
      ]),
    });
    dialog.render();
    dialog.open();
  });
}

/**
 * Shows a confirmation Dialog with a ComboBox (from pre-built options) and optional comment TextArea.
 * Returns { person, comment } on confirm, or null on cancel/empty selection.
 * @param {string} title
 * @param {string} message
 * @param {Array<{label: string, value: any}>} options - Pre-built ComboBox options
 * @returns {Promise<{ person: any, comment: string } | null>}
 */
function confirmWithEmployeeComboBox(title, message, options) {
  const personField = new FormField({ value: null });
  const commentField = new FormField({ value: '' });

  const personCombo = new ComboBox(personField, options, { placeholder: 'Selecionar...' });
  const commentInput = new TextArea(commentField, { placeholder: 'Comentario (opcional)...', rows: 3 });

  return new Promise((resolve) => {
    const dialog = new Dialog({
      title,
      variant: 'info',
      content: new Container([
        new Text(message, { type: 'p' }),
        new FieldLabel('Pessoa', personCombo),
        personCombo,
        new FieldLabel('Comentario', commentInput),
        commentInput,
      ]),
      backdrop: true,
      closeOnFocusLoss: false,
      containerSelector: 'body',
      footer: new Container([
        new Button('Cancelar', {
          variant: 'secondary',
          onClickHandler: () => {
            dialog.close();
            dialog.remove();
            personField.dispose();
            commentField.dispose();
            resolve(null);
          },
        }),
        new Button('Confirmar', {
          variant: 'primary',
          onClickHandler: () => {
            if (!personField.value) {
              Toast.error('Selecione uma pessoa.');
              return;
            }
            const person = personField.value;
            const comment = commentField.value?.trim() || '';
            dialog.close();
            dialog.remove();
            personField.dispose();
            commentField.dispose();
            resolve({ person, comment });
          },
        }),
      ]),
    });
    dialog.render();
    dialog.open();
  });
}

/**
 * Shows a confirmation Dialog with a PeoplePicker, access type ComboBox, and optional comment TextArea.
 * Returns { person: UserIdentity, type: string, comment: string } on confirm, or null on cancel.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<{ person: UserIdentity, type: string, comment: string } | null>}
 */
function confirmWithPeoplePicker(title, message) {
  const personField = new FormField({ value: null });
  const typeField = new FormField({ value: null });
  const commentField = new FormField({ value: '' });

  const personPicker = new PeoplePicker(personField, { placeholder: 'Pesquisar pessoa...' });
  const typeCombo = new ComboBox(typeField, [
    { label: 'Leitura', value: 'read' },
    { label: 'Colaboracao', value: 'collaborate' },
  ], { placeholder: 'Selecionar...' });
  const commentInput = new TextArea(commentField, { placeholder: 'Comentario (opcional)...', rows: 3 });

  return new Promise((resolve) => {
    const dialog = new Dialog({
      title,
      variant: 'info',
      content: new Container([
        new Text(message, { type: 'p' }),
        new FieldLabel('Pessoa', personPicker),
        personPicker,
        new FieldLabel('Tipo de Acesso', typeCombo),
        typeCombo,
        new FieldLabel('Comentario', commentInput),
        commentInput,
      ]),
      backdrop: true,
      closeOnFocusLoss: false,
      containerSelector: 'body',
      footer: new Container([
        new Button('Cancelar', {
          variant: 'secondary',
          onClickHandler: () => {
            dialog.close();
            dialog.remove();
            personField.dispose();
            typeField.dispose();
            commentField.dispose();
            resolve(null);
          },
        }),
        new Button('Confirmar', {
          variant: 'primary',
          onClickHandler: () => {
            if (!personField.value) {
              Toast.error('Selecione uma pessoa.');
              return;
            }
            if (!typeField.value) {
              Toast.error('Selecione o tipo de acesso.');
              return;
            }
            const extracted = extractComboBoxValue(personField.value);
            const person = new UserIdentity(extracted.email, extracted.displayName);
            const type = extractComboBoxValue(typeField.value);
            const comment = commentField.value?.trim() || '';
            dialog.close();
            dialog.remove();
            personField.dispose();
            typeField.dispose();
            commentField.dispose();
            resolve({ person, type, comment });
          },
        }),
      ]),
    });
    dialog.render();
    dialog.open();
  });
}

// -- Workflow actions --

/**
 * Submit: RASCUNHO -> SUBMETIDO
 */
export async function submitInitiative(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.SUBMETIDO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Confirmar Submissao',
    'Tem a certeza que deseja submeter esta iniciativa?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A submeter iniciativa...');
  try {
    await transitionStatus(initiative.Id, STATUS.SUBMETIDO, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.SUBMISSION, STATUS.RASCUNHO, STATUS.SUBMETIDO);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        initiative.Title + ' submetido para validacao.',
        'state_change',
      );
    }
    loading.success('Iniciativa submetida com sucesso.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao submeter iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Re-submit: EM_REVISAO -> PreviousStatus (or SUBMETIDO)
 */
export async function resubmitInitiative(initiative, button, onSuccess) {
  const target = initiative.PreviousStatus || STATUS.SUBMETIDO;

  if (!canTransitionTo(STATUS.EM_REVISAO, target)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Confirmar Re-submissao',
    'Tem a certeza que deseja re-submeter esta iniciativa?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A re-submeter iniciativa...');
  try {
    await transitionStatus(initiative.Id, target, initiative['odata.etag'], { PreviousStatus: '' });
    await createEvent(initiative.UUID, EVENT_TYPES.RESUBMISSION, STATUS.EM_REVISAO, target);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        initiative.Title + ' re-submetido.',
        'state_change',
      );
    }
    loading.success('Iniciativa re-submetida com sucesso.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao re-submeter iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Cancel: any non-terminal -> CANCELADO
 * Comment is optional for cancellation.
 */
export async function cancelInitiative(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.CANCELADO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Cancelar Iniciativa',
    'Tem a certeza que deseja cancelar esta iniciativa? Esta accao e irreversivel.',
    { confirmLabel: 'Cancelar Iniciativa', variant: 'error' },
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A cancelar iniciativa...');
  try {
    await transitionStatus(initiative.Id, STATUS.CANCELADO, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.CANCELLATION, initiative.Status, STATUS.CANCELADO);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        initiative.Title + ' foi cancelado.',
        'state_change',
      );
    }
    loading.success('Iniciativa cancelada.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao cancelar iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Approve project: SUBMETIDO -> VALIDADO_MENTOR
 */
export async function approveProject(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.VALIDADO_MENTOR)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Aprovar Projecto',
    'Tem a certeza que deseja aprovar este projecto?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A aprovar projecto...');
  try {
    const user = ContextStore.get('currentUser');
    const mentorIdentity = { email: user.get('email'), displayName: user.get('displayName') };
    await transitionStatus(initiative.Id, STATUS.VALIDADO_MENTOR, initiative['odata.etag'], {
      Mentor: mentorIdentity,
      MentorEmail: user.get('email'),
    });
    await createEvent(initiative.UUID, EVENT_TYPES.MENTOR_APPROVAL, STATUS.SUBMETIDO, STATUS.VALIDADO_MENTOR);
    if (initiative.SubmittedByEmail) {
      await createNotification(
        initiative.UUID,
        initiative.SubmittedByEmail,
        'Sua iniciativa foi aprovada pelo mentor.',
        'state_change',
      );
    }
    loading.success('Projecto aprovado.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao aprovar projecto.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Reject: SUBMETIDO/POR_VALIDAR/VALIDADO_GESTOR -> REJEITADO
 * Requires mandatory comment.
 */
export async function rejectInitiative(initiative, button, onSuccess) {
  const currentStatus = initiative.Status;

  if (!canTransitionTo(currentStatus, STATUS.REJEITADO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const comment = await confirmWithComment(
    'Rejeitar Iniciativa',
    'Tem a certeza que deseja rejeitar esta iniciativa?',
    { confirmLabel: 'Rejeitar', placeholder: 'Motivo da rejeicao (obrigatorio)...' },
  );
  if (!comment) return;

  const eventType = currentStatus === STATUS.SUBMETIDO
    ? EVENT_TYPES.MENTOR_REJECTION
    : EVENT_TYPES.BUSINESS_REJECTION;

  button.isLoading = true;
  const loading = Toast.loading('A rejeitar iniciativa...');
  try {
    await transitionStatus(initiative.Id, STATUS.REJEITADO, initiative['odata.etag']);
    await createEvent(initiative.UUID, eventType, currentStatus, STATUS.REJEITADO, comment);
    if (initiative.SubmittedByEmail) {
      await createNotification(
        initiative.UUID,
        initiative.SubmittedByEmail,
        initiative.Title + ' foi rejeitado.',
        'state_change',
      );
    }
    loading.success('Iniciativa rejeitada.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao rejeitar iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Request revision: SUBMETIDO/POR_VALIDAR/VALIDADO_GESTOR -> EM_REVISAO
 * Sets PreviousStatus so resubmission returns to the right place.
 * Requires mandatory comment.
 */
export async function requestRevision(initiative, button, onSuccess) {
  const currentStatus = initiative.Status;

  if (!canTransitionTo(currentStatus, STATUS.EM_REVISAO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const comment = await confirmWithComment(
    'Solicitar Revisao',
    'Tem a certeza que deseja solicitar revisao desta iniciativa?',
    { confirmLabel: 'Solicitar Revisao', placeholder: 'Motivo do pedido de revisao (obrigatorio)...' },
  );
  if (!comment) return;

  button.isLoading = true;
  const loading = Toast.loading('A solicitar revisao...');
  try {
    await transitionStatus(initiative.Id, STATUS.EM_REVISAO, initiative['odata.etag'], {
      PreviousStatus: currentStatus,
    });
    await createEvent(initiative.UUID, EVENT_TYPES.REVIEW_REQUEST, currentStatus, STATUS.EM_REVISAO, comment);
    if (initiative.SubmittedByEmail) {
      await createNotification(
        initiative.UUID,
        initiative.SubmittedByEmail,
        initiative.Title + ' requer revisao.',
        'state_change',
      );
    }
    loading.success('Pedido de revisao enviado.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao solicitar revisao.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Start execution: VALIDADO_MENTOR -> EM_EXECUCAO
 */
export async function startExecution(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.EM_EXECUCAO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Iniciar Execucao',
    'Tem a certeza que deseja declarar o inicio da execucao?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A iniciar execucao...');
  try {
    await transitionStatus(initiative.Id, STATUS.EM_EXECUCAO, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.EXECUTION_START, STATUS.VALIDADO_MENTOR, STATUS.EM_EXECUCAO);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        initiative.Title + ' iniciou execucao.',
        'state_change',
      );
    }
    loading.success('Execucao iniciada.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao iniciar execucao.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Declare savings / request validation: EM_EXECUCAO -> POR_VALIDAR
 * Auto-assigns GestorValidator via routing rules.
 */
export async function declareSavings(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.POR_VALIDAR)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Solicitar Validacao de Savings',
    'Tem a certeza que deseja solicitar a validacao dos savings?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A solicitar validacao...');
  try {
    // Resolve gestor via routing rules
    let financials = null;
    try { financials = await getFinancials(initiative.UUID); } catch (_) { /* non-critical */ }
    const savingType = financials?.SavingType || deriveSavingType(financials?.SavingCategory);
    const annualVal = financials?.EstimatedSavingsAnnual
      || annualizeSavings(financials?.EstimatedSavings || '0', financials?.TimePeriod || '');
    const gestor = getAssignedGestor(savingType, String(annualVal), initiative.ImpactedTeamOUID);

    const extraFields = {};
    if (gestor) {
      extraFields.GestorValidator = { email: gestor.email, displayName: gestor.displayName };
      extraFields.GestorValidatorEmail = gestor.email;
    }

    await transitionStatus(initiative.Id, STATUS.POR_VALIDAR, initiative['odata.etag'], extraFields);
    await createEvent(initiative.UUID, EVENT_TYPES.SAVINGS_SUBMISSION, STATUS.EM_EXECUCAO, STATUS.POR_VALIDAR);
    if (gestor) {
      await createNotification(
        initiative.UUID,
        gestor.email,
        initiative.Title + ' requer validacao de savings.',
        'state_change',
      );
    }
    loading.success('Pedido de validacao enviado.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao solicitar validacao.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Approve savings: POR_VALIDAR -> VALIDADO_GESTOR
 */
export async function approveSavings(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.VALIDADO_GESTOR)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Aprovar Savings',
    'Tem a certeza que deseja aprovar os savings desta iniciativa?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A aprovar savings...');
  try {
    await transitionStatus(initiative.Id, STATUS.VALIDADO_GESTOR, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.BUSINESS_VALIDATION, STATUS.POR_VALIDAR, STATUS.VALIDADO_GESTOR);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        initiative.Title + ' - savings aprovados. Confirmacao final pendente.',
        'state_change',
      );
    }
    loading.success('Savings aprovados.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao aprovar savings.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Mentor final validation: VALIDADO_GESTOR -> VALIDADO_FINAL
 */
export async function mentorFinalValidation(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.VALIDADO_FINAL)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Confirmar Savings',
    'Tem a certeza que deseja confirmar os savings desta iniciativa?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A confirmar savings...');
  try {
    await transitionStatus(initiative.Id, STATUS.VALIDADO_FINAL, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.MENTOR_FINAL_VALIDATION, STATUS.VALIDADO_GESTOR, STATUS.VALIDADO_FINAL);
    if (initiative.SubmittedByEmail) {
      await createNotification(
        initiative.UUID,
        initiative.SubmittedByEmail,
        'Savings validados pelo mentor. Pode marcar a iniciativa como implementada.',
        'state_change',
      );
    }
    loading.success('Savings confirmados.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao confirmar savings.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Owner marks as implemented: VALIDADO_FINAL -> IMPLEMENTADO
 */
export async function markAsImplemented(initiative, button, onSuccess) {
  if (!canTransitionTo(initiative.Status, STATUS.IMPLEMENTADO)) {
    Toast.error('Transicao de estado invalida.');
    return;
  }

  const confirmed = await confirm(
    'Marcar como Implementado',
    'Tem a certeza que deseja marcar esta iniciativa como implementada?',
  );
  if (!confirmed) return;

  button.isLoading = true;
  const loading = Toast.loading('A marcar como implementado...');
  try {
    await transitionStatus(initiative.Id, STATUS.IMPLEMENTADO, initiative['odata.etag']);
    await createEvent(initiative.UUID, EVENT_TYPES.OWNER_IMPLEMENTATION, STATUS.VALIDADO_FINAL, STATUS.IMPLEMENTADO);
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        'Iniciativa marcada como implementada pelo proprietario.',
        'state_change',
      );
    }
    loading.success('Iniciativa implementada.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao marcar como implementado.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Transfer: Gestor reassigns a POR_VALIDAR initiative to another gestor.
 * Status stays POR_VALIDAR; GestorValidator and GestorValidatorEmail are updated.
 */
export async function transferGestor(initiative, button, onSuccess) {
  const allEmployees = await getAllEmployees();
  const options = allEmployees
    .filter(emp => deriveRoles(emp).includes('gestor') && emp.Email !== initiative.GestorValidatorEmail)
    .map(emp => ({
      label: emp.FullName || emp.ShortName,
      value: new UserIdentity(emp.Email, emp.FullName || emp.ShortName),
    }));

  const result = await confirmWithEmployeeComboBox(
    'Transferir Iniciativa',
    'Selecione o novo gestor validador. A iniciativa sera transferida e o novo gestor ficara responsavel pela validacao.',
    options,
  );

  if (!result) return;

  button.isLoading = true;
  const loading = Toast.loading('A transferir iniciativa...');
  try {
    const extracted = extractComboBoxValue(result.person);
    const newIdentity = new UserIdentity(extracted.email, extracted.displayName);
    const transferComment = 'Transferido para ' + newIdentity.displayName + (result.comment ? '. ' + result.comment : '');

    await update(initiative.Id, {
      GestorValidator: newIdentity,
      GestorValidatorEmail: newIdentity.email,
    }, initiative['odata.etag']);

    await createEvent(initiative.UUID, EVENT_TYPES.TRANSFER, STATUS.POR_VALIDAR, STATUS.POR_VALIDAR, transferComment);

    // Notify new gestor
    await createNotification(
      initiative.UUID,
      newIdentity.email,
      initiative.Title + ' transferido para si para validacao.',
      'state_change',
    );

    // Notify initiative owner
    if (initiative.SubmittedByEmail) {
      await createNotification(
        initiative.UUID,
        initiative.SubmittedByEmail,
        'O gestor de ' + initiative.Title + ' foi alterado.',
        'state_change',
      );
    }

    loading.success('Iniciativa transferida com sucesso.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao transferir iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Transfer ownership: colaborador transfers initiative to another person.
 * Updates SubmittedBy and SubmittedByEmail.
 */
export async function transferOwnership(initiative, button, onSuccess) {
  const allEmployees = await getAllEmployees();
  const currentEmail = ContextStore.get('currentUser').get('email');
  const options = allEmployees
    .filter(emp => deriveRoles(emp).includes('colaborador') && emp.Email !== currentEmail)
    .map(emp => ({
      label: emp.FullName || emp.ShortName,
      value: new UserIdentity(emp.Email, emp.FullName || emp.ShortName),
    }));

  const result = await confirmWithEmployeeComboBox(
    'Transferir Iniciativa',
    'Selecione o novo proprietario. A iniciativa sera transferida e deixara de aparecer nas suas iniciativas.',
    options,
  );

  if (!result) return;

  button.isLoading = true;
  const loading = Toast.loading('A transferir iniciativa...');
  try {
    const extracted = extractComboBoxValue(result.person);
    const newIdentity = new UserIdentity(extracted.email, extracted.displayName);
    const transferComment = 'Transferido para ' + newIdentity.displayName + (result.comment ? '. ' + result.comment : '');

    await update(initiative.Id, {
      SubmittedBy: newIdentity,
      SubmittedByEmail: newIdentity.email,
    }, initiative['odata.etag']);

    await createEvent(initiative.UUID, EVENT_TYPES.TRANSFER, initiative.Status, initiative.Status, transferComment);

    // Notify new owner
    await createNotification(
      initiative.UUID,
      newIdentity.email,
      initiative.Title + ' transferido para si.',
      'state_change',
    );

    // Notify mentor if exists
    if (initiative.MentorEmail) {
      await createNotification(
        initiative.UUID,
        initiative.MentorEmail,
        'O proprietario de ' + initiative.Title + ' foi alterado.',
        'state_change',
      );
    }

    loading.success('Iniciativa transferida com sucesso.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao transferir iniciativa.');
  } finally {
    button.isLoading = false;
  }
}

/**
 * Share: opens a PeoplePicker dialog and creates a shared access record.
 */
export async function shareInitiativeAction(initiative, button, onSuccess) {
  const result = await confirmWithPeoplePicker(
    'Partilhar Iniciativa',
    'Selecione a pessoa com quem pretende partilhar e o tipo de acesso.',
  );
  if (!result) return;

  button.isLoading = true;
  const loading = Toast.loading('A partilhar iniciativa...');
  try {
    const user = ContextStore.get('currentUser');
    const sharedBy = new UserIdentity(user.get('email'), user.get('displayName'));
    const sharedWith = result.person;

    await shareInitiative(initiative.UUID, sharedWith, sharedBy, result.type);

    const typeLabel = result.type === 'collaborate' ? 'Colaboracao' : 'Leitura';
    const shareComment = 'Partilhado com ' + sharedWith.displayName + ' (' + typeLabel + ')' + (result.comment ? '. ' + result.comment : '');

    await createEvent(initiative.UUID, EVENT_TYPES.SHARE, initiative.Status, initiative.Status, shareComment);

    await createNotification(
      initiative.UUID,
      sharedWith.email,
      user.get('displayName') + ' partilhou ' + initiative.Title + ' consigo.',
      'share',
    );

    loading.success('Iniciativa partilhada com sucesso.');
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error(error);
    loading.error('Erro ao partilhar iniciativa.');
  } finally {
    button.isLoading = false;
  }
}
