import {
  Modal,
  Container,
  Text,
  TextInput,
  TextArea,
  ComboBox,
  CheckBox,
  Button,
  FormField,
  FormSchema,
  FieldLabel,
  Toast,
  Loader,
  View,
  ViewSwitcher,
  NumberInput,
  ContextStore,
  fromFieldValue,
  generateUUIDv4,
  __zod,
} from '../libs/nofbiz/nofbiz.base.js';

import { TEAM_OPTIONS } from './roles.js';
import { INITIATIVE_TAGS, EVENT_TYPES, SAVING_CATEGORIES, SAVING_CATEGORY_GUIDANCE, deriveSavingType, annualizeSavings } from './constants.js';
import { create, update } from './initiatives-api.js';
import { STATUS } from './status-helpers.js';
import { create as createFinancials, getByInitiative as getFinancials, update as updateFinancials } from './financials-api.js';
import { createEvent } from './initiative-events-api.js';

/**
 * Opens a Modal form for creating a new initiative.
 * @param {() => void} onSuccess - Callback invoked after successful save/submit
 * @returns {Modal} The modal instance
 */
export function openNewInitiativeModal(onSuccess) {
  return buildInitiativeModal(null, null, onSuccess);
}

/**
 * Opens a Modal form for editing an existing initiative.
 * Fetches financials for pre-fill before opening the modal.
 * @param {Object} initiative - The initiative data to pre-fill
 * @param {() => void} onSuccess - Callback invoked after successful save/submit
 * @returns {Promise<Modal>} The modal instance
 */
export async function openEditInitiativeModal(initiative, onSuccess) {
  let financials = null;
  if (initiative.UUID) {
    try {
      financials = await getFinancials(initiative.UUID);
    } catch (_) { /* non-critical -- proceed without financials */ }
  }
  return buildInitiativeModal(initiative, financials, onSuccess);
}

/**
 * Opens a Modal form for creating a new initiative pre-populated from an existing one.
 * Copies content fields only -- ownership/workflow metadata is not replicated.
 * @param {Object} sourceInitiative - The initiative to replicate from
 * @param {() => void} onSuccess - Callback invoked after successful save/submit
 * @returns {Promise<Modal>} The modal instance
 */
export async function openReplicateInitiativeModal(sourceInitiative, onSuccess) {
  let financials = null;
  if (sourceInitiative.UUID) {
    try {
      financials = await getFinancials(sourceInitiative.UUID);
    } catch (_) { /* non-critical -- proceed without financials */ }
  }
  return buildInitiativeModal(null, financials, onSuccess, sourceInitiative);
}

function buildInitiativeModal(initiative, financials, onSuccess, prefillData = null) {
  const isEdit = !!initiative;
  const source = initiative || prefillData;
  const z = __zod;

  // -- Step 1 form fields --
  const titleField = new FormField({
    value: source?.Title || '',
    validatorCallback: (v) => z.string().min(1).safeParse(v).success,
  });

  const descriptionField = new FormField({ value: source?.Description || '' });

  const teamField = new FormField({
    value: source?.ImpactedTeamOUID || '',
    validatorCallback: (v) => {
      const val = v && typeof v === 'object' ? v.value : v;
      return z.string().min(1).safeParse(val).success;
    },
  });

  const existingTags = source?.Tags ? fromFieldValue(source.Tags) : [];
  const tagsField = new FormField({ value: existingTags });

  const problemField = new FormField({ value: source?.Problem || '' });
  const objectiveField = new FormField({ value: source?.Objective || '' });
  const confidentialField = new FormField({ value: source?.IsConfidential === true || source?.IsConfidential === 'true' });

  const schema = new FormSchema({ title: titleField, team: teamField });

  // -- Step 3 form fields (pre-fill from financials, not from initiative) --
  const TIME_PERIOD_OPTIONS = ['Diario', 'Mensal', 'Trimestral', 'Semestral', 'Anual'];
  const timePeriodField = new FormField({ value: financials?.TimePeriod || '' });

  const volumePropostasField = new FormField({ value: parseFloat(financials?.VolumePropostasBefore) || 0 });
  const montanteMedioField = new FormField({ value: parseFloat(financials?.MontanteMedioBefore) || 0 });
  const taxaTransformacaoField = new FormField({ value: parseFloat(financials?.TaxaTransformacaoBefore) || 0 });
  const custoUnitarioField = new FormField({ value: parseFloat(financials?.CustoUnitarioBefore) || 0 });
  const volumesProcessadosField = new FormField({ value: parseFloat(financials?.VolumesProcessadosBefore) || 0 });
  const tempoTratamentoField = new FormField({ value: parseFloat(financials?.TempoTratamentoBefore) || 0 });
  const fteField = new FormField({ value: parseFloat(financials?.FTEBefore) || 0 });
  const volumeBeforeField = new FormField({ value: parseFloat(financials?.VolumeBefore) || 0 });
  const implementationCostField = new FormField({ value: parseFloat(financials?.ImplementationCost) || 0 });
  const implementationMonthsField = new FormField({ value: parseFloat(financials?.ImplementationMonths) || 0 });
  const savingCategoryField = new FormField({ value: financials?.SavingCategory || '' });
  const estimatedSavingsField = new FormField({ value: parseFloat(financials?.EstimatedSavings) || 0 });

  // -- Reactive saving type display for Step 3 --
  const getCategoryLabel = () => {
    const v = savingCategoryField.value;
    return v && typeof v === 'object' ? v.label : (v || '');
  };
  const savingTypeText = new Text(deriveSavingType(getCategoryLabel()), {
    type: 'span',
    class: 'pace-detail-value',
  });
  savingCategoryField.subscribe(() => {
    savingTypeText.children = deriveSavingType(getCategoryLabel());
  });

  // -- Shared helpers (DRY) --

  const collectBaseFields = () => {
    const teamVal = teamField.value;
    const impactedTeamOUID = teamVal && typeof teamVal === 'object' ? teamVal.value : (teamVal || '');
    const tagVal = tagsField.value;
    const tags = Array.isArray(tagVal)
      ? tagVal.map(t => typeof t === 'object' ? t.label : t)
      : [];
    return {
      Title: titleField.value,
      Description: descriptionField.value,
      ImpactedTeamOUID: impactedTeamOUID,
      Tags: tags,
      Problem: problemField.value,
      Objective: objectiveField.value,
      IsConfidential: confidentialField.value,
      Mentor: '',
      MentorEmail: '',
      GestorValidator: '',
      GestorValidatorEmail: '',
    };
  };

  const collectFinancialFields = () => {
    const pf = (volumePropostasField.value || 0) * (montanteMedioField.value || 0) * ((taxaTransformacaoField.value || 0) / 100);
    const custoOp = (volumesProcessadosField.value || 0) * (custoUnitarioField.value || 0);
    const v = timePeriodField.value;
    const timePeriod = v && typeof v === 'object' ? v.label : (v || '');
    const catVal = savingCategoryField.value;
    const category = catVal && typeof catVal === 'object' ? catVal.label : (catVal || '');
    const savingType = deriveSavingType(category);
    const estimated = estimatedSavingsField.value || 0;
    const estimatedAnnual = annualizeSavings(estimated, timePeriod);
    return {
      TimePeriod: timePeriod,
      VolumePropostasBefore: String(volumePropostasField.value || 0),
      MontanteMedioBefore: String(montanteMedioField.value || 0),
      TaxaTransformacaoBefore: String(taxaTransformacaoField.value || 0),
      CustoUnitarioBefore: String(custoUnitarioField.value || 0),
      VolumesProcessadosBefore: String(volumesProcessadosField.value || 0),
      TempoTratamentoBefore: String(tempoTratamentoField.value || 0),
      ProducaoFinalBefore: String(pf),
      CustoOperacionalBefore: String(custoOp),
      FTEBefore: String(fteField.value || 0),
      VolumeBefore: String(volumeBeforeField.value || 0),
      SavingCategory: category,
      SavingType: savingType,
      EstimatedSavings: String(estimated),
      EstimatedSavingsAnnual: String(estimatedAnnual),
      ImplementationCost: String(implementationCostField.value || 0),
      ImplementationMonths: String(implementationMonthsField.value || 0),
    };
  };

  const overlay = new Container(
    [new Loader(new Text('A processar...', { type: 'p' }), { animation: 'pulse' })],
    { class: 'pace-submission-overlay', containerSelector: 'body' }
  );
  const showOverlay = () => overlay.render();
  const hideOverlay = () => { if (overlay.isAlive) overlay.remove(); };

  const saveAsDraft = async (btn, hasFinancials = false) => {
    if (!schema.isValid) {
      schema.focusOnFirstInvalid();
      Toast.error('Preencha o titulo e seleccione a equipa.');
      return;
    }
    showOverlay();
    const loading = Toast.loading('A guardar rascunho...');
    try {
      const baseFields = collectBaseFields();
      const fields = { ...baseFields, Status: STATUS.RASCUNHO };

      if (isEdit) {
        await update(initiative.ID, fields, initiative['odata.etag']);
        if (hasFinancials) {
          const finFields = collectFinancialFields();
          if (financials) {
            await updateFinancials(financials.ID, finFields, financials['odata.etag']);
          } else {
            await createFinancials(initiative.UUID, finFields);
          }
        }
      } else {
        const currentUser = ContextStore.get('currentUser');
        const identity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
        const uuid = generateUUIDv4();
        await create({
          ...fields,
          UUID: uuid,
          SubmittedBy: identity,
          SubmittedByEmail: currentUser.get('email'),
        });
        await createEvent(uuid, EVENT_TYPES.CREATION, '', STATUS.RASCUNHO);
        if (hasFinancials) {
          await createFinancials(uuid, collectFinancialFields());
        }
      }
      loading.success('Rascunho guardado com sucesso');
      modal.close();
      if (onSuccess) onSuccess();
    } catch (error) {
      loading.error('Erro ao guardar rascunho');
    } finally {
      hideOverlay();
    }
  };

  const submitInitiative = async (btn, hasFinancials = false) => {
    if (!schema.isValid) {
      schema.focusOnFirstInvalid();
      Toast.error('Preencha o titulo e seleccione a equipa.');
      return;
    }
    showOverlay();
    const loading = Toast.loading('A submeter iniciativa...');
    try {
      const currentUser = ContextStore.get('currentUser');
      const identity = { email: currentUser.get('email'), displayName: currentUser.get('displayName') };
      const baseFields = collectBaseFields();
      const fields = {
        ...baseFields,
        Status: STATUS.SUBMETIDO,
        SubmittedBy: identity,
        SubmittedByEmail: currentUser.get('email'),
      };

      if (isEdit) {
        await update(initiative.ID, fields, initiative['odata.etag']);
        await createEvent(initiative.UUID, EVENT_TYPES.SUBMISSION, initiative.Status, STATUS.SUBMETIDO);
        if (hasFinancials) {
          const finFields = collectFinancialFields();
          if (financials) {
            await updateFinancials(financials.ID, finFields, financials['odata.etag']);
          } else {
            await createFinancials(initiative.UUID, finFields);
          }
        }
      } else {
        const uuid = generateUUIDv4();
        await create({
          ...fields,
          UUID: uuid,
          SubmittedBy: identity,
          SubmittedByEmail: currentUser.get('email'),
        });
        await createEvent(uuid, EVENT_TYPES.CREATION, '', STATUS.RASCUNHO);
        await createEvent(uuid, EVENT_TYPES.SUBMISSION, STATUS.RASCUNHO, STATUS.SUBMETIDO);
        if (hasFinancials) {
          await createFinancials(uuid, collectFinancialFields());
        }
      }
      loading.success('Iniciativa submetida com sucesso');
      modal.close();
      if (onSuccess) onSuccess();
    } catch (error) {
      loading.error('Erro ao submeter iniciativa');
    } finally {
      hideOverlay();
    }
  };

  // ===== STEP 1 -- Basic Info =====

  const titleInput = new FieldLabel('Titulo *', new TextInput(titleField, { placeholder: 'Ex: Reducao do tempo de...' }));
  const descInput = new FieldLabel('Descricao', new TextArea(descriptionField, { placeholder: 'Descreva a oportunidade...', rows: 3 }));
  const teamCombo = new FieldLabel('Equipa *', new ComboBox(teamField, TEAM_OPTIONS, { placeholder: 'Seleccionar...' }));
  const tagsCombo = new FieldLabel('Tags', new ComboBox(tagsField, INITIATIVE_TAGS, {
    allowMultiple: true,
    placeholder: 'Seleccionar tags...',
  }));
  const problemInput = new FieldLabel('Problema / Oportunidade', new TextArea(problemField, { placeholder: 'Descreva o problema ou oportunidade...', rows: 3 }));
  const objectiveInput = new FieldLabel('Objectivo', new TextArea(objectiveField, { placeholder: 'Qual o objectivo esperado?', rows: 3 }));
  const confidentialCheck = new Container([
    new CheckBox(confidentialField, { title: 'Confidencial' }),
    new Text('Marcar como confidencial', { type: 'span' }),
  ], { class: 'pace-checkbox-row' });

  const step1DraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step1DraftBtn),
  });

  const step1ContinueBtn = new Button('Continuar', {
    variant: 'primary',
    onClickHandler: () => {
      if (!schema.isValid) {
        schema.focusOnFirstInvalid();
        Toast.error('Preencha o titulo e seleccione a equipa.');
        return;
      }
      wizard.setView('step2');
    },
  });

  const step1CancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => modal.close(),
  });

  const step1View = new View([
    new Container([
      titleInput,
      descInput,
      teamCombo,
      tagsCombo,
      problemInput,
      objectiveInput,
      confidentialCheck,
    ], { class: 'pace-initiative-form' }),
    new Container([step1CancelBtn, step1DraftBtn, step1ContinueBtn], { class: 'pace-modal-footer' }),
  ]);

  // ===== STEP 2 -- Quantification Question =====

  const step2NaoDraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step2NaoDraftBtn, false),
  });

  const step2NaoSubmitBtn = new Button('Submeter', {
    variant: 'primary',
    onClickHandler: () => submitInitiative(step2NaoSubmitBtn, false),
  });

  const step2BackBtn = new Button('Voltar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => wizard.setView('step1'),
  });

  const naoSection = new View([
    new Text('Sem problema -- o seu mentor ira ajuda-lo a quantificar a iniciativa apos submissao.', { type: 'p', class: 'pace-wizard-hint' }),
    new Container([step2BackBtn, step2NaoDraftBtn, step2NaoSubmitBtn], { class: 'pace-modal-footer' }),
  ], { showOnRender: isEdit && !financials });

  const step2SimBtn = new Button('Sim', {
    variant: 'primary',
    onClickHandler: () => wizard.setView('step3'),
  });

  const step2NaoBtn = new Button('Nao', {
    variant: 'secondary',
    onClickHandler: () => naoSection.show(150),
  });

  const step2View = new View([
    new Container([
      new Text('Consegue quantificar/tipificar a iniciativa?', { type: 'h3' }),
      new Text('Esta informacao ajuda a medir o impacto da sua iniciativa.', { type: 'p' }),
      new Container([step2SimBtn, step2NaoBtn], { class: 'pace-wizard-choice' }),
      naoSection,
    ], { class: 'pace-wizard-question' }),
  ]);

  // ===== STEP 3 -- Impact Metrics (ANTES) =====

  const step3BackBtn = new Button('Voltar', {
    variant: 'secondary',
    isOutlined: true,
    onClickHandler: () => wizard.setView('step2'),
  });

  const step3DraftBtn = new Button('Gravar Rascunho', {
    variant: 'secondary',
    onClickHandler: () => saveAsDraft(step3DraftBtn, true),
  });

  const step3SubmitBtn = new Button('Submeter', {
    variant: 'primary',
    onClickHandler: () => submitInitiative(step3SubmitBtn, true),
  });

  const step3View = new View([
    new Container([
      new Text('Contabilizacao de Ganhos/Impacto', { type: 'h3' }),
      new Text('Estes sao valores esperados/estimados.', { type: 'p' }),
      new FieldLabel('Periodo de tempo medido', new ComboBox(timePeriodField, TIME_PERIOD_OPTIONS, { placeholder: 'Seleccionar...' })),
      new Text('Receita e Propostas', { type: 'p', class: 'pace-form-section-title' }),
      new Container([
        new FieldLabel('Volume propostas enviados [unid./mes]', new NumberInput(volumePropostasField, { min: 0, step: 1 })),
        new FieldLabel('Montante medio, cada proposta [EUR]', new NumberInput(montanteMedioField, { min: 0, step: 1 })),
      ], { class: 'pace-form-row' }),
      new Container([
        new FieldLabel('Taxa de Transformacao [%]', new NumberInput(taxaTransformacaoField, { min: 0, max: 100, step: 0.1 })),
        new FieldLabel('Volume de producao [unid.]', new NumberInput(volumeBeforeField, { min: 0, step: 1 })),
      ], { class: 'pace-form-row' }),
      new Text('Operacoes', { type: 'p', class: 'pace-form-section-title' }),
      new Container([
        new FieldLabel('Volumes processados, mensal [unid.]', new NumberInput(volumesProcessadosField, { min: 0, step: 1 })),
        new FieldLabel('Custo unitario [EUR/mes]', new NumberInput(custoUnitarioField, { min: 0, step: 0.01 })),
      ], { class: 'pace-form-row' }),
      new Container([
        new FieldLabel('Tempo de tratamento unitario [min]', new NumberInput(tempoTratamentoField, { min: 0, step: 0.1 })),
        new FieldLabel('FTE [headcount]', new NumberInput(fteField, { min: 0, step: 0.1 })),
      ], { class: 'pace-form-row' }),
      new Text('Savings e Implementacao', { type: 'p', class: 'pace-form-section-title' }),
      new Container([
        new FieldLabel('Categoria de Saving', new ComboBox(savingCategoryField, SAVING_CATEGORIES, { placeholder: 'Seleccionar...' })),
        new Container([
          new Text('Tipo Saving', { type: 'span', class: 'pace-detail-label' }),
          savingTypeText,
        ], { class: 'pace-saving-type-display' }),
      ], { class: 'pace-form-row' }),
      new Container([
        new FieldLabel('Saving estimado [EUR/periodo]', new NumberInput(estimatedSavingsField, { min: 0, step: 0.01 })),
        new FieldLabel('Custo de implementacao [EUR]', new NumberInput(implementationCostField, { min: 0, step: 0.01 })),
      ], { class: 'pace-form-row' }),
      new Container([
        new FieldLabel('Meses de implementacao', new NumberInput(implementationMonthsField, { min: 0, step: 1 })),
      ], { class: 'pace-form-row' }),
    ], { class: 'pace-initiative-form' }),
    new Container([step3BackBtn, step3DraftBtn, step3SubmitBtn], { class: 'pace-modal-footer' }),
  ]);

  // ===== ViewSwitcher Wizard =====

  const wizard = new ViewSwitcher([
    ['step1', step1View],
    ['step2', step2View],
    ['step3', step3View],
  ]);

  // ===== Modal =====

  const modal = new Modal([
    new Text(isEdit ? 'Editar Iniciativa PDCA' : 'Nova Iniciativa PDCA', { type: 'h2', class: 'pace-modal-title' }),
    wizard,
  ], {
    closeOnFocusLoss: false,
    class: 'pace-initiative-modal',
    containerSelector: 'body',
    onCloseHandler: () => {
      hideOverlay();
      volumePropostasField.dispose();
      montanteMedioField.dispose();
      taxaTransformacaoField.dispose();
      timePeriodField.dispose();
      custoUnitarioField.dispose();
      volumesProcessadosField.dispose();
      tempoTratamentoField.dispose();
      fteField.dispose();
      volumeBeforeField.dispose();
      implementationCostField.dispose();
      implementationMonthsField.dispose();
      savingCategoryField.dispose();
      estimatedSavingsField.dispose();
      titleField.dispose();
      descriptionField.dispose();
      teamField.dispose();
      tagsField.dispose();
      problemField.dispose();
      objectiveField.dispose();
      confidentialField.dispose();
    },
  });

  modal.render();
  modal.open();
  return modal;
}
