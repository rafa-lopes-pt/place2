import {
  SidePanel,
  Container,
  Text,
  Button,
  Toast,
  TextArea,
  FormField,
  ContextStore,
  UserIdentity,
  Loader,
  __dayjs,
} from '../libs/nofbiz/nofbiz.base.js';

import { STATUS, statusLabel, chipClass, getNextFlowStatus, STATUS_LABELS } from './status-helpers.js';
import { getTeamLabel, getTeamName } from './roles.js';
import { mentorName, gestorName } from './format-helpers.js';
import { getByInitiative as getFinancials } from './financials-api.js';
import { annualizeSavings, deriveSavingType, EVENT_TYPES, STATUS_DESCRIPTIONS } from './constants.js';
import {
  submitInitiative,
  resubmitInitiative,
  cancelInitiative,
  approveProject,
  rejectInitiative,
  requestRevision,
  startExecution,
  declareSavings,
  approveSavings,
  mentorFinalValidation,
  markAsImplemented,
  transferGestor,
  transferOwnership,
  shareInitiativeAction,
} from './workflow-actions.js';
import { openEditInitiativeModal, openReplicateInitiativeModal } from './new-initiative.js';
import { openEffectiveDataModal } from './effective-data-modal.js';
import { openEstimatedDataModal } from './estimated-data-modal.js';
import { openRevisionReviewModal } from './revision-review-modal.js';
import { isSharedWith } from './shared-api.js';
import { getByInitiative as getComments, createComment } from './comments-api.js';
import { createEvent, getByInitiative as getEvents } from './initiative-events-api.js';
import { createNotification } from './notifications-api.js';

/**
 * Builds and opens a SidePanel showing full detail for an initiative.
 * Fetches financials from the separate list for savings display.
 *
 * @param {Object} initiative - The initiative data object from the list
 * @param {string} context - The context from which the panel is opened ('pessoal', 'mentoria', 'gestor', 'catalogo')
 * @param {() => void} [onSuccess] - Callback invoked after a successful workflow action
 * @returns {Promise<SidePanel>} The panel instance (for cleanup in route teardown)
 */
export async function openInitiativeDetail(initiative, context, onSuccess, { canAct = true } = {}) {
  const overlayEl = document.createElement('div');
  overlayEl.className = 'pace-submission-overlay';
  overlayEl.id = 'pace-detail-loader';
  document.body.appendChild(overlayEl);
  const loader = new Loader([], { containerSelector: '#pace-detail-loader' });
  loader.render();

  try {

  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');
  const isOwner = initiative.SubmittedByEmail === currentEmail;
  const status = initiative.Status;

  // Fetch financials for savings display (non-critical)
  let financials = null;
  try {
    financials = await getFinancials(initiative.UUID);
  } catch (_) { /* non-critical */ }

  // -- Header chips --
  const headerChips = [
    new Text(statusLabel(status), { type: 'span', class: `pace-chip ${chipClass(status)}` }),
    new Text(getTeamName(initiative.ImpactedTeamOUID) || '', { type: 'span', class: 'pace-chip pace-chip--inactive' }),
  ];

  if (initiative.IsConfidential === true || initiative.IsConfidential === 'true') {
    headerChips.push(new Text('Confidencial', { type: 'span', class: 'pace-chip pace-chip--conf' }));
  }

  const header = new Container([
    new Container(headerChips, { class: 'pace-detail-chips' }),
    new Text(initiative.Title || 'Sem titulo', { type: 'h2', class: 'pace-detail-title' }),
  ], { class: 'pace-detail-header' });

  // -- Dados Gerais grid --
  const mentorDisplay = mentorName(initiative);
  const gestorDisplay = gestorName(initiative);

  const ownerIdentity = UserIdentity.fromField(initiative.SubmittedBy);
  const ownerDisplayName = ownerIdentity ? ownerIdentity.displayName : '-';

  const dadosPairs = [
    ['Colaborador', ownerDisplayName],
    ['Equipa', getTeamLabel(initiative.ImpactedTeamOUID) || '-'],
    ['Mentor Responsavel', mentorDisplay !== '---' ? mentorDisplay : 'Por atribuir'],
  ];
  if (gestorDisplay !== '---') {
    dadosPairs.push(['Gestor Validador', gestorDisplay]);
  }

  const dadosGerais = new Container([
    new Text('Dados Gerais', { type: 'h3', class: 'pace-sec-title' }),
    buildInfoGrid(dadosPairs),
  ]);

  // -- Description, Problem, Objective --
  const sections = [];
  if (initiative.Description) {
    sections.push(buildTextSection('Descricao', initiative.Description));
  }
  if (initiative.Problem) {
    sections.push(buildTextSection('Problema / Oportunidade', initiative.Problem));
  }
  if (initiative.Objective) {
    sections.push(buildTextSection('Objectivo', initiative.Objective));
  }

  // -- Financial details section (from financials list) --
  if (financials) {
    const savingType = financials.SavingType || deriveSavingType(financials.SavingCategory);
    const estimatedAnnual = financials.EstimatedSavingsAnnual || annualizeSavings(financials.EstimatedSavings || '0', financials.TimePeriod || '');
    const finPairs = [];

    // Savings classification
    if (financials.SavingCategory) {
      finPairs.push(['Categoria', financials.SavingCategory]);
    }
    finPairs.push(['Tipo Saving', savingType]);

    // Per-period and annualized savings
    if (financials.EstimatedSavings) {
      finPairs.push(['Saving Estimado (periodo)', `EUR ${parseFloat(financials.EstimatedSavings).toLocaleString('pt-PT')}`]);
    }
    if (estimatedAnnual > 0) {
      finPairs.push(['Saving Estimado (anual)', `EUR ${parseFloat(estimatedAnnual).toLocaleString('pt-PT')}`]);
    }
    if (financials.ValidatedSavings) {
      finPairs.push(['Saving Validado (periodo)', `EUR ${parseFloat(financials.ValidatedSavings).toLocaleString('pt-PT')}`]);
      const validatedAnnual = financials.ValidatedSavingsAnnual || annualizeSavings(financials.ValidatedSavings, financials.TimePeriod || '');
      if (parseFloat(validatedAnnual) > 0) {
        finPairs.push(['Saving Validado (anual)', `EUR ${parseFloat(validatedAnnual).toLocaleString('pt-PT')}`]);
      }
    }

    // Operational details
    if (financials.FTEBefore && financials.FTEBefore !== '0') {
      finPairs.push(['FTE (antes)', financials.FTEBefore]);
    }
    if (financials.FTEAfter && financials.FTEAfter !== '0') {
      finPairs.push(['FTE (depois)', financials.FTEAfter]);
    }
    if (financials.CustoOperacionalBefore && financials.CustoOperacionalBefore !== '0') {
      finPairs.push(['Custo Operacional (antes)', `EUR ${parseFloat(financials.CustoOperacionalBefore).toLocaleString('pt-PT')}`]);
    }
    if (financials.CustoOperacionalAfter && financials.CustoOperacionalAfter !== '0') {
      finPairs.push(['Custo Operacional (depois)', `EUR ${parseFloat(financials.CustoOperacionalAfter).toLocaleString('pt-PT')}`]);
    }

    // ROI fields
    if (financials.ImplementationCost && financials.ImplementationCost !== '0') {
      finPairs.push(['Custo Implementacao', `EUR ${parseFloat(financials.ImplementationCost).toLocaleString('pt-PT')}`]);
    }
    if (financials.ImplementationMonths && financials.ImplementationMonths !== '0') {
      finPairs.push(['Meses Implementacao', financials.ImplementationMonths]);
    }
    if (financials.TimePeriod) {
      finPairs.push(['Periodo', financials.TimePeriod]);
    }

    if (finPairs.length > 0) {
      sections.push(new Container([
        new Text('Dados Financeiros', { type: 'h3', class: 'pace-sec-title' }),
        buildInfoGrid(finPairs),
      ]));
    }

    // Effective (After) data -- shown when any After field has been filled
    const hasEffective = financials.VolumePropostasAfter || financials.MontanteMedioAfter
      || financials.TaxaTransformacaoAfter || financials.VolumesProcessadosAfter
      || financials.CustoUnitarioAfter || financials.TempoTratamentoAfter;

    if (hasEffective) {
      const fmtNum = (v) => {
        if (!v && v !== 0) return '-';
        const n = parseFloat(v);
        return isNaN(n) ? String(v) : n.toLocaleString('pt-PT');
      };
      const fmtEur = (v) => {
        if (!v && v !== 0) return '-';
        const n = parseFloat(v);
        return isNaN(n) ? '-' : `EUR ${n.toLocaleString('pt-PT')}`;
      };

      const efPairs = [
        ['Volume propostas efetivo [unid./mes]', fmtNum(financials.VolumePropostasAfter)],
        ['Montante medio efetivo [EUR]', fmtEur(financials.MontanteMedioAfter)],
        ['Taxa de transformacao efetiva [%]', fmtNum(financials.TaxaTransformacaoAfter)],
      ];
      if (financials.ProducaoFinalAfter) {
        efPairs.push(['Producao final efetiva', fmtEur(financials.ProducaoFinalAfter)]);
      }
      efPairs.push(
        ['Volumes processados efetivo [unid.]', fmtNum(financials.VolumesProcessadosAfter)],
        ['Custo unitario efetivo [EUR/mes]', fmtEur(financials.CustoUnitarioAfter)],
        ['Tempo de tratamento efetivo [min]', fmtNum(financials.TempoTratamentoAfter)],
      );

      sections.push(new Container([
        new Text('Dados Efetivos', { type: 'h3', class: 'pace-sec-title' }),
        buildInfoGrid(efPairs),
      ]));
    }
  }

  // -- Event type labels (used by progress timeline) --
  const EVENT_TYPE_LABELS = {
    Creation: 'Criado',
    Submission: 'Submetido',
    MentorApproval: 'Aprovado pelo Mentor',
    MentorRejection: 'Rejeitado pelo Mentor',
    ExecutionStart: 'Inicio de Execucao',
    SavingsSubmission: 'Savings Submetidos',
    BusinessValidation: 'Validado pelo Gestor',
    BusinessRejection: 'Rejeitado pelo Gestor',
    ReviewRequest: 'Revisao Solicitada',
    Resubmission: 'Re-submetido',
    Cancellation: 'Cancelado',
    Implementation: 'Implementado',
    MentorFinalValidation: 'Confirmacao Final Mentor',
    OwnerImplementation: 'Implementado pelo Proprietario',
    Comment: 'Comentario',
    Transfer: 'Transferido',
    Share: 'Partilhado',
  };

  const EVENT_TO_STATUS = {
    [EVENT_TYPES.CREATION]:                STATUS.RASCUNHO,
    [EVENT_TYPES.SUBMISSION]:              STATUS.SUBMETIDO,
    [EVENT_TYPES.RESUBMISSION]:            STATUS.SUBMETIDO,
    [EVENT_TYPES.MENTOR_APPROVAL]:         STATUS.VALIDADO_MENTOR,
    [EVENT_TYPES.MENTOR_REJECTION]:        STATUS.REJEITADO,
    [EVENT_TYPES.EXECUTION_START]:         STATUS.EM_EXECUCAO,
    [EVENT_TYPES.SAVINGS_SUBMISSION]:      STATUS.POR_VALIDAR,
    [EVENT_TYPES.BUSINESS_VALIDATION]:     STATUS.VALIDADO_GESTOR,
    [EVENT_TYPES.BUSINESS_REJECTION]:      STATUS.REJEITADO,
    [EVENT_TYPES.REVIEW_REQUEST]:          STATUS.EM_REVISAO,
    [EVENT_TYPES.CANCELLATION]:            STATUS.CANCELADO,
    [EVENT_TYPES.IMPLEMENTATION]:          STATUS.IMPLEMENTADO,
    [EVENT_TYPES.MENTOR_FINAL_VALIDATION]: STATUS.VALIDADO_FINAL,
    [EVENT_TYPES.OWNER_IMPLEMENTATION]:    STATUS.IMPLEMENTADO,
    // Comment, Transfer, Share have no status change -> no description shown
  };

  // -- Progress timeline and comments (skipped for catalogo -- archived items) --
  let progressSection = null;
  let commentsSection = null;

  if (context !== 'catalogo') {
    // -- Merged progress timeline (from events, excludes comments) --
    let events = [];
    try {
      events = await getEvents(initiative.UUID);
    } catch (_) { /* non-critical */ }

    events.sort((a, b) => (a.Date || '').localeCompare(b.Date || ''));

    const workflowEvents = events.filter(ev => ev.EventType !== 'Comment');
    const nextStatus = getNextFlowStatus(status);

    const flowStepNodes = workflowEvents.map((ev, i) => {
      const actorObj = typeof ev.Actor === 'string' ? JSON.parse(ev.Actor || '{}') : (ev.Actor || {});
      const actorName = actorObj.displayName || 'Sistema';
      const dateStr = ev.Date ? __dayjs(ev.Date).format('DD/MM/YYYY HH:mm') : '';
      const label = EVENT_TYPE_LABELS[ev.EventType] || ev.EventType;

      const stepContent = [
        new Container([
          new Text(label, { type: 'span', class: 'pace-flow-label' }),
          new Text(dateStr, { type: 'span', class: 'pace-flow-date' }),
        ], { class: 'pace-flow-step-header' }),
      ];

      const eventStatus = EVENT_TO_STATUS[ev.EventType];
      const eventDescription = eventStatus ? STATUS_DESCRIPTIONS[eventStatus] : null;
      if (eventDescription) {
        stepContent.push(new Text(eventDescription, { type: 'span', class: 'pace-flow-description' }));
      }

      if (actorName !== 'Sistema') {
        stepContent.push(new Text(actorName, { type: 'span', class: 'pace-flow-actor' }));
      }

      if (ev.Comment) {
        stepContent.push(new Text(ev.Comment, { type: 'p', class: 'pace-flow-comment' }));
      }

      const step = new Container([
        new Container([
          new Text(String(i + 1), { type: 'span' }),
        ], { class: 'pace-flow-dot pace-flow-dot--done' }),
        new Container(stepContent, { class: 'pace-flow-step-content' }),
      ], { class: 'pace-flow-step' });

      if (i < workflowEvents.length - 1 || nextStatus) {
        const connectorClass = (i < workflowEvents.length - 1)
          ? 'pace-flow-connector pace-flow-connector--done'
          : 'pace-flow-connector';
        return new Container([
          step,
          new Container([], { class: connectorClass }),
        ], { as: 'span', class: 'pace-flow-step-wrap' });
      }
      return step;
    });

    if (nextStatus) {
      flowStepNodes.push(
        new Container([
          new Container([], { class: 'pace-flow-dot pace-flow-dot--next' }),
          new Container([
            new Text(STATUS_LABELS[nextStatus], { type: 'span', class: 'pace-flow-label' }),
          ], { class: 'pace-flow-step-content' }),
        ], { class: 'pace-flow-step' })
      );
    }

    progressSection = workflowEvents.length > 0 || nextStatus
      ? new Container([
          new Text('Progresso', { type: 'h3', class: 'pace-sec-title' }),
          new Container(flowStepNodes, { class: 'pace-flow' }),
        ])
      : null;

    // -- Comments section --
    let comments = [];
    try {
      comments = await getComments(initiative.UUID);
    } catch (_) { /* non-critical */ }

    comments.sort((a, b) => (b.CommentDate || '').localeCompare(a.CommentDate || ''));

    const isMentor = currentEmail === initiative.MentorEmail;
    const isGestor = currentEmail === initiative.GestorValidatorEmail;
    const isSharedUser = await isSharedWith(initiative.UUID, currentEmail).catch(() => false);
    const canComment = isOwner || isMentor || isGestor || isSharedUser;

    const commentListContainer = new Container(
      buildCommentList(comments, currentEmail, isMentor, isGestor)
    );

    const commentsSectionChildren = [
      new Text('Comentarios', { type: 'h3', class: 'pace-sec-title' }),
      commentListContainer,
    ];

    if (canComment) {
      const commentField = new FormField({ value: '' });
      const commentTextArea = new TextArea(commentField, { placeholder: 'Escrever comentario...', rows: 2 });

      const sendBtn = new Button('Comentar', {
        variant: 'primary',
        onClickHandler: async () => {
          const body = commentField.value?.trim();
          if (!body) {
            Toast.error('Escreva um comentario antes de enviar.');
            return;
          }
          sendBtn.isLoading = true;
          const loading = Toast.loading('A enviar comentario...');
          try {
            await createComment(initiative.UUID, body, false, '');
            await createEvent(initiative.UUID, EVENT_TYPES.COMMENT, initiative.Status, initiative.Status);
            if (initiative.MentorEmail && initiative.MentorEmail !== currentEmail) {
              await createNotification(initiative.UUID, initiative.MentorEmail, user.get('displayName') + ' comentou ' + initiative.Title, 'comment');
            }
            if (initiative.SubmittedByEmail && initiative.SubmittedByEmail !== currentEmail) {
              await createNotification(initiative.UUID, initiative.SubmittedByEmail, user.get('displayName') + ' comentou ' + initiative.Title, 'comment');
            }
            loading.success('Comentario enviado.');
            commentField.value = '';
            // Re-fetch and rebuild comments display
            let updatedComments = [];
            try { updatedComments = await getComments(initiative.UUID); } catch (_) {}
            updatedComments.sort((a, b) => (b.CommentDate || '').localeCompare(a.CommentDate || ''));
            commentListContainer.children = buildCommentList(updatedComments, currentEmail, isMentor, isGestor);
          } catch (_) {
            loading.error('Erro ao enviar comentario.');
          } finally {
            sendBtn.isLoading = false;
          }
        },
      });

      commentsSectionChildren.push(
        new Container([commentTextArea, sendBtn], { class: 'pace-comment-form' })
      );
    }

    commentsSection = new Container(commentsSectionChildren, { class: 'pace-comments-section' });
  }

  // -- Content --
  const content = new Container([
    header,
    dadosGerais,
    ...sections,
    ...(progressSection ? [progressSection] : []),
    ...(commentsSection ? [commentsSection] : []),
  ], { class: 'pace-detail-content' });

  // -- Create panel with placeholder footer, then wire action buttons --
  const footerContainer = new Container([], { class: 'pace-detail-footer' });

  const panel = new SidePanel({
    title: initiative.Title || 'Detalhe da Iniciativa',
    content,
    footer: footerContainer,
    width: '540px',
    closeOnFocusLoss: true,
  });

  const footerButtons = buildActionButtons(initiative, context, isOwner, status, panel, onSuccess, canAct, currentEmail);
  if (footerButtons.length > 0) {
    footerContainer.children = footerButtons;
  }

  panel.render();
  panel.open();
  return panel;

  } finally {
    loader.remove();
    overlayEl.remove();
  }
}


// -- Helper: build visible comment list (DRY -- used for initial render and refresh) --
function buildCommentList(rawComments, currentEmail, isMentor, isGestor) {
  const visible = rawComments.filter(c => {
    if (c.IsConfidential !== 'true' && c.IsConfidential !== true) return true;
    const authorObj = typeof c.Author === 'string' ? JSON.parse(c.Author || '{}') : (c.Author || {});
    if (authorObj.email === currentEmail) return true;
    if (isMentor || isGestor) return true;
    return false;
  });
  function getInitials(name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return visible.map(c => {
    const authorObj = typeof c.Author === 'string' ? JSON.parse(c.Author || '{}') : (c.Author || {});
    const authorName = authorObj.displayName || 'Desconhecido';
    const dateStr = c.CommentDate ? __dayjs(c.CommentDate).format('DD/MM/YYYY') : '';
    const confidentialTag = (c.IsConfidential === 'true' || c.IsConfidential === true)
      ? ' [Confidencial]' : '';

    return new Container([
      new Container([
        new Text(getInitials(authorName), { type: 'span' }),
      ], { class: 'pace-comment-avatar' }),
      new Container([
        new Container([
          new Text(authorName, { type: 'span', class: 'pace-comment-author' }),
          new Text(dateStr + confidentialTag, { type: 'span', class: 'pace-comment-date' }),
        ], { class: 'pace-comment-header' }),
        new Text(c.Body, { type: 'p', class: 'pace-comment-body' }),
      ], { class: 'pace-comment-content' }),
    ], { class: 'pace-comment-item' });
  });
}

// -- Helper: info grid (key-value pairs) --
function buildInfoGrid(pairs) {
  const rows = pairs.map(([label, value]) =>
    new Container([
      new Text(label, { type: 'span', class: 'pace-detail-label' }),
      new Text(String(value), { type: 'span', class: 'pace-detail-value' }),
    ], { class: 'pace-detail-row' })
  );
  return new Container(rows, { class: 'pace-detail-grid' });
}

// -- Helper: text section --
function buildTextSection(title, text) {
  return new Container([
    new Text(title, { type: 'h3', class: 'pace-sec-title' }),
    new Text(text, { type: 'p', class: 'pace-detail-text' }),
  ]);
}

// -- Helper: context-sensitive action buttons --
function buildActionButtons(initiative, context, isOwner, status, panel, onSuccess, canAct, currentEmail) {
  const buttons = [];

  const handleSuccess = () => {
    panel.close();
    if (onSuccess) onSuccess();
  };

  if (context === 'pessoal' && isOwner) {
    if (status === STATUS.RASCUNHO) {
      const submitBtn = new Button('Submeter', {
        variant: 'primary',
        onClickHandler: () => submitInitiative(initiative, submitBtn, handleSuccess),
      });
      const editBtn = new Button('Editar', {
        variant: 'secondary',
        onClickHandler: () => {
          panel.close();
          openEditInitiativeModal(initiative, onSuccess);
        },
      });
      const cancelBtn = new Button('Cancelar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => cancelInitiative(initiative, cancelBtn, handleSuccess),
      });
      const transferBtn = new Button('Transferir', {
        variant: 'secondary',
        onClickHandler: () => transferOwnership(initiative, transferBtn, handleSuccess),
      });
      buttons.push(submitBtn, editBtn, cancelBtn, transferBtn);
    } else if (status === STATUS.SUBMETIDO) {
      if (!initiative.MentorEmail) {
        const transferBtn = new Button('Transferir', {
          variant: 'secondary',
          onClickHandler: () => transferOwnership(initiative, transferBtn, handleSuccess),
        });
        buttons.push(transferBtn);
      }
    } else if (status === STATUS.VALIDADO_MENTOR) {
      const startBtn = new Button('Declarar Inicio Execucao', {
        variant: 'primary',
        onClickHandler: () => startExecution(initiative, startBtn, handleSuccess),
      });
      const cancelBtn = new Button('Cancelar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => cancelInitiative(initiative, cancelBtn, handleSuccess),
      });
      buttons.push(startBtn, cancelBtn);
    } else if (status === STATUS.EM_EXECUCAO) {
      const savingsBtn = new Button('Solicitar Validacao', {
        variant: 'primary',
        onClickHandler: () => declareSavings(initiative, savingsBtn, handleSuccess),
      });
      const cancelBtn = new Button('Cancelar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => cancelInitiative(initiative, cancelBtn, handleSuccess),
      });
      buttons.push(savingsBtn, cancelBtn);
    } else if (status === STATUS.EM_REVISAO) {
      const reviewBtn = new Button('Rever', {
        variant: 'primary',
        onClickHandler: () => {
          panel.close();
          openRevisionReviewModal(initiative, onSuccess);
        },
      });
      const cancelBtn = new Button('Cancelar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => cancelInitiative(initiative, cancelBtn, handleSuccess),
      });
      buttons.push(reviewBtn, cancelBtn);
    } else if (status === STATUS.VALIDADO_FINAL) {
      const implBtn = new Button('Marcar como Implementado', {
        variant: 'primary',
        onClickHandler: () => markAsImplemented(initiative, implBtn, handleSuccess),
      });
      buttons.push(implBtn);
    }
  }

  if (context === 'mentoria' && canAct) {
    if (status === STATUS.SUBMETIDO) {
      const approveBtn = new Button('Aprovar', {
        variant: 'primary',
        onClickHandler: () => {
          panel.close();
          openEstimatedDataModal(initiative, onSuccess);
        },
      });
      const rejectBtn = new Button('Rejeitar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => rejectInitiative(initiative, rejectBtn, handleSuccess),
      });
      const revisionBtn = new Button('Solicitar Revisao', {
        variant: 'secondary',
        onClickHandler: () => requestRevision(initiative, revisionBtn, handleSuccess),
      });
      buttons.push(approveBtn, rejectBtn, revisionBtn);
    } else if (status === STATUS.VALIDADO_GESTOR) {
      const confirmBtn = new Button('Confirmar Savings', {
        variant: 'primary',
        onClickHandler: () => mentorFinalValidation(initiative, confirmBtn, handleSuccess),
      });
      const rejectBtn = new Button('Rejeitar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => rejectInitiative(initiative, rejectBtn, handleSuccess),
      });
      const revisionBtn = new Button('Solicitar Revisao', {
        variant: 'secondary',
        onClickHandler: () => requestRevision(initiative, revisionBtn, handleSuccess),
      });
      const effectiveBtn = new Button('Editar Dados Efetivos', {
        variant: 'secondary',
        onClickHandler: () => {
          panel.close();
          openEffectiveDataModal(initiative, onSuccess);
        },
      });
      buttons.push(confirmBtn, rejectBtn, revisionBtn, effectiveBtn);
    }
  }

  if (context === 'gestor' && canAct) {
    if (status === STATUS.POR_VALIDAR) {
      const approveBtn = new Button('Aprovar Savings', {
        variant: 'primary',
        onClickHandler: () => approveSavings(initiative, approveBtn, handleSuccess),
      });
      const rejectBtn = new Button('Rejeitar', {
        variant: 'danger',
        isOutlined: true,
        onClickHandler: () => rejectInitiative(initiative, rejectBtn, handleSuccess),
      });
      const revisionBtn = new Button('Solicitar Revisao', {
        variant: 'secondary',
        onClickHandler: () => requestRevision(initiative, revisionBtn, handleSuccess),
      });
      const transferBtn = new Button('Transferir', {
        variant: 'secondary',
        onClickHandler: () => transferGestor(initiative, transferBtn, handleSuccess),
      });
      buttons.push(approveBtn, rejectBtn, revisionBtn, transferBtn);
    }
  }

  if (context === 'catalogo') {
    const replicateBtn = new Button('Replicar', {
      variant: 'secondary',
      onClickHandler: () => {
        panel.close();
        openReplicateInitiativeModal(initiative, onSuccess);
      },
    });
    buttons.push(replicateBtn);
  }

  // Partilhar -- not relevant for archived items in catalogo
  if (context !== 'catalogo') {
    const shareBtn = new Button('Partilhar', {
      variant: 'secondary',
      isOutlined: true,
      onClickHandler: () => shareInitiativeAction(initiative, shareBtn, handleSuccess),
    });
    buttons.push(shareBtn);
  }

  return buttons;
}
