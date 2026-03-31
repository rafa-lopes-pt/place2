import {
  Modal,
  Container,
  Text,
  TextArea,
  NumberInput,
  ComboBox,
  CheckBox,
  FormField,
  FormSchema,
  FieldLabel,
  Button,
  Toast,
  fromFieldValue,
} from '../libs/nofbiz/nofbiz.base.js';

import { TEAM_OPTIONS } from './roles.js';
import { STATUS, canTransitionTo } from './status-helpers.js';
import { update } from './initiatives-api.js';
import {
  getByInitiative as getFinancials,
  update as updateFinancials,
} from './financials-api.js';
import {
  getByInitiativeAndType,
  createEvent,
} from './initiative-events-api.js';
import { createNotification } from './notifications-api.js';
import {
  EVENT_TYPES,
  INITIATIVE_TAGS,
  SAVING_CATEGORIES,
  ANNUALIZATION_FACTORS,
  annualizeSavings,
  deriveSavingType,
} from './constants.js';

/**
 * Opens a revision review modal for an EM_REVISAO initiative.
 * Allows the owner to edit basic info and (conditionally) financial data,
 * then re-submit to the appropriate status based on PreviousStatus.
 *
 * @param {Object} initiative - The initiative data object
 * @param {() => void} [onSuccess] - Callback invoked after a successful resubmission
 */
export async function openRevisionReviewModal(initiative, onSuccess) {
  const loading = Toast.loading('A carregar dados de revisao...');

  // -- Fetch financials and latest ReviewRequest event in parallel --
  let financials = null;
  let latestComment = '';

  try {
    const [finResult, eventsResult] = await Promise.allSettled([
      getFinancials(initiative.UUID),
      getByInitiativeAndType(initiative.UUID, EVENT_TYPES.REVIEW_REQUEST),
    ]);

    if (finResult.status === 'fulfilled') {
      financials = finResult.value;
    }

    if (eventsResult.status === 'fulfilled' && eventsResult.value.length > 0) {
      const sorted = eventsResult.value.sort((a, b) =>
        (b.Date || '').localeCompare(a.Date || '')
      );
      latestComment = sorted[0].Comment || '';
    }
  } catch (_) {
    loading.error('Erro ao carregar dados de revisao.');
    return;
  }
  loading.dismiss();

  // -- Helpers: display/parse values (DRY with estimated-data-modal) --
  function displayValue(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toLocaleString('pt-PT');
  }

  function parseInitial(val) {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(val);
    return isNaN(num) ? '' : num;
  }

  // -- Determine target status and financial editability --
  const target = initiative.PreviousStatus || STATUS.SUBMETIDO;
  const previousStatus = initiative.PreviousStatus || STATUS.SUBMETIDO;
  const estimatedEditable = previousStatus === STATUS.SUBMETIDO;
  const effectiveEditable = !estimatedEditable;

  // Check if After values exist (for effective section display)
  const hasEffective = financials && (
    financials.VolumePropostasAfter || financials.MontanteMedioAfter
    || financials.TaxaTransformacaoAfter || financials.VolumesProcessadosAfter
    || financials.CustoUnitarioAfter || financials.TempoTratamentoAfter
  );

  // -- Section 1: Revision Comment Banner --
  const bannerChildren = [];
  if (latestComment) {
    bannerChildren.push(
      new Container([
        new Text('Comentario de Revisao:', { type: 'span', class: 'pace-detail-label' }),
        new Text(latestComment, { type: 'p', class: 'pace-revision-comment' }),
      ], { class: 'pace-revision-banner' })
    );
  }

  // -- Section 2: Title (read-only) --
  const titleDisplay = new Container([
    new Text('Titulo', { type: 'span', class: 'pace-detail-label' }),
    new Text(initiative.Title || 'Sem titulo', { type: 'span', class: 'pace-detail-value' }),
  ], { class: 'pace-detail-row' });

  // -- Section 3: Basic Info (editable) --
  const descriptionField = new FormField({ value: initiative.Description || '' });

  const existingTeam = initiative.ImpactedTeamOUID || '';
  const teamOption = TEAM_OPTIONS.find(t => t.value === existingTeam);
  const teamField = new FormField({
    value: teamOption || null,
    validatorCallback: (v) => {
      const val = v && typeof v === 'object' ? v.value : v;
      return !!val && val.length > 0;
    },
  });

  const existingTags = initiative.Tags ? fromFieldValue(initiative.Tags) : [];
  const tagsField = new FormField({ value: existingTags });

  const problemField = new FormField({ value: initiative.Problem || '' });
  const objectiveField = new FormField({ value: initiative.Objective || '' });
  const confidentialField = new FormField({
    value: initiative.IsConfidential === true || initiative.IsConfidential === 'true',
  });

  const schema = new FormSchema({ team: teamField });

  const basicInfoSection = new Container([
    new Text('Informacao Basica', { type: 'h3', class: 'pace-sec-title' }),
    new FieldLabel('Descricao', new TextArea(descriptionField, { placeholder: 'Descreva a oportunidade...', rows: 3 })),
    new FieldLabel('Equipa *', new ComboBox(teamField, TEAM_OPTIONS, { placeholder: 'Seleccionar...' })),
    new FieldLabel('Tags', new ComboBox(tagsField, INITIATIVE_TAGS, { allowMultiple: true, placeholder: 'Seleccionar tags...' })),
    new FieldLabel('Problema / Oportunidade', new TextArea(problemField, { placeholder: 'Descreva o problema ou oportunidade...', rows: 3 })),
    new FieldLabel('Objectivo', new TextArea(objectiveField, { placeholder: 'Qual o objectivo esperado?', rows: 3 })),
    new Container([
      new CheckBox(confidentialField, { title: 'Confidencial' }),
      new Text('Marcar como confidencial', { type: 'span' }),
    ], { class: 'pace-checkbox-row' }),
  ], { class: 'pace-initiative-form' });

  // -- Section 4: Financial Section (conditional) --
  const financialComponents = [];
  const financialFields = [];

  if (financials) {
    // -- Estimated (Before) fields --
    if (estimatedEditable) {
      // Editable estimated fields (same layout as new-initiative Step 3)
      const volumeField = new FormField({ value: parseInitial(financials.VolumeBefore || financials.VolumePropostasBefore) });
      const montanteField = new FormField({ value: parseInitial(financials.MontanteMedioBefore) });
      const taxaField = new FormField({ value: parseInitial(financials.TaxaTransformacaoBefore) });
      const volumesProcessadosField = new FormField({ value: parseInitial(financials.VolumesProcessadosBefore) });
      const custoField = new FormField({ value: parseInitial(financials.CustoUnitarioBefore) });
      const tempoField = new FormField({ value: parseInitial(financials.TempoTratamentoBefore) });
      const fteField = new FormField({ value: parseInitial(financials.FTEBefore) });
      const estimatedSavingsField = new FormField({ value: parseInitial(financials.EstimatedSavings) });
      const implCostField = new FormField({ value: parseInitial(financials.ImplementationCost) });
      const implMonthsField = new FormField({ value: parseInitial(financials.ImplementationMonths) });

      const categoryOptions = SAVING_CATEGORIES.map(c => ({ label: c, value: c }));
      const existingCategory = financials.SavingCategory || '';
      const categoryField = new FormField({
        value: existingCategory ? { label: existingCategory, value: existingCategory } : null,
      });

      const timePeriodOptions = Object.keys(ANNUALIZATION_FACTORS).map(k => ({ label: k, value: k }));
      const existingPeriod = financials.TimePeriod || '';
      const timePeriodField = new FormField({
        value: existingPeriod ? { label: existingPeriod, value: existingPeriod } : null,
      });

      // Auto-calculated values
      function calcProducaoFinal() {
        const v = parseFloat(volumeField.value) || 0;
        const m = parseFloat(montanteField.value) || 0;
        const t = parseFloat(taxaField.value) || 0;
        return v * m * (t / 100);
      }

      function getTimePeriodValue() {
        const tp = timePeriodField.value;
        return (tp && typeof tp === 'object') ? tp.value : (tp || '');
      }

      function getCategoryValue() {
        const cat = categoryField.value;
        return (cat && typeof cat === 'object') ? cat.value : (cat || '');
      }

      function calcAnnualizedEstimated() {
        return annualizeSavings(estimatedSavingsField.value || 0, getTimePeriodValue());
      }

      const producaoFinalText = new Text(displayValue(calcProducaoFinal()), { type: 'span', class: 'pace-detail-value' });
      const annualizedEstimatedText = new Text(displayValue(calcAnnualizedEstimated()), { type: 'span', class: 'pace-detail-value' });
      const savingTypeText = new Text(deriveSavingType(getCategoryValue()), { type: 'span', class: 'pace-detail-value' });

      volumeField.subscribe(() => { producaoFinalText.children = displayValue(calcProducaoFinal()); });
      montanteField.subscribe(() => { producaoFinalText.children = displayValue(calcProducaoFinal()); });
      taxaField.subscribe(() => { producaoFinalText.children = displayValue(calcProducaoFinal()); });
      estimatedSavingsField.subscribe(() => { annualizedEstimatedText.children = displayValue(calcAnnualizedEstimated()); });
      timePeriodField.subscribe(() => { annualizedEstimatedText.children = displayValue(calcAnnualizedEstimated()); });
      categoryField.subscribe(() => { savingTypeText.children = deriveSavingType(getCategoryValue()); });

      function buildEditableRow(label, input) {
        return new FieldLabel(label, input);
      }

      function buildReadOnlyRow(label, valueComponent) {
        return new Container([
          new Text(label, { type: 'span', class: 'pace-detail-label' }),
          valueComponent,
        ], { class: 'pace-detail-row' });
      }

      const infoRow = new Container([
        new Container([
          new FieldLabel('Categoria', new ComboBox(categoryField, categoryOptions, { placeholder: 'Selecionar...' })),
        ], { class: 'pace-estimated-info-item' }),
        new Container([
          new Text('Tipo Saving', { type: 'span', class: 'pace-detail-label' }),
          savingTypeText,
        ], { class: 'pace-estimated-info-item' }),
        new Container([
          new FieldLabel('Periodo', new ComboBox(timePeriodField, timePeriodOptions, { placeholder: 'Selecionar...' })),
        ], { class: 'pace-estimated-info-item' }),
      ], { class: 'pace-estimated-info-row' });

      const revenueSection = new Container([
        new Text('Receita e Propostas', { type: 'h3', class: 'pace-sec-title' }),
        buildEditableRow('Volume propostas [unid./mes]', new NumberInput(volumeField, { placeholder: '0' })),
        buildEditableRow('Montante medio [EUR]', new NumberInput(montanteField, { placeholder: '0' })),
        buildEditableRow('Taxa de transformacao [%]', new NumberInput(taxaField, { placeholder: '0' })),
        buildReadOnlyRow('Producao final', producaoFinalText),
      ], { class: 'pace-effective-section' });

      const operationsSection = new Container([
        new Text('Operacoes', { type: 'h3', class: 'pace-sec-title' }),
        buildEditableRow('Volumes processados [unid.]', new NumberInput(volumesProcessadosField, { placeholder: '0' })),
        buildEditableRow('Custo unitario [EUR/mes]', new NumberInput(custoField, { placeholder: '0' })),
        buildEditableRow('Tempo de tratamento [min]', new NumberInput(tempoField, { placeholder: '0' })),
        buildEditableRow('FTE', new NumberInput(fteField, { placeholder: '0' })),
      ], { class: 'pace-effective-section' });

      const savingsSection = new Container([
        new Text('Savings e Implementacao', { type: 'h3', class: 'pace-sec-title' }),
        buildEditableRow('Saving estimado [EUR/periodo]', new NumberInput(estimatedSavingsField, { placeholder: '0' })),
        buildReadOnlyRow('Saving estimado anualizado [EUR]', annualizedEstimatedText),
        buildEditableRow('Custo implementacao [EUR]', new NumberInput(implCostField, { placeholder: '0' })),
        buildEditableRow('Meses implementacao', new NumberInput(implMonthsField, { placeholder: '0' })),
      ], { class: 'pace-effective-section' });

      financialComponents.push(
        new Text('Dados Estimados (Antes)', { type: 'h3', class: 'pace-sec-title' }),
        infoRow,
        new Container([revenueSection, operationsSection, savingsSection], { class: 'pace-effective-content' }),
      );

      // Store fields for cleanup and submit
      financialFields.push(
        volumeField, montanteField, taxaField, volumesProcessadosField,
        custoField, tempoField, fteField, estimatedSavingsField,
        implCostField, implMonthsField, categoryField, timePeriodField,
      );

      // Attach collector for submit
      financialComponents._collectEstimated = () => {
        const selectedCategory = getCategoryValue();
        const selectedPeriod = getTimePeriodValue();
        return {
          SavingCategory: selectedCategory,
          SavingType: deriveSavingType(selectedCategory),
          TimePeriod: selectedPeriod,
          VolumeBefore: String(volumeField.value || ''),
          VolumePropostasBefore: String(volumeField.value || ''),
          MontanteMedioBefore: String(montanteField.value || ''),
          TaxaTransformacaoBefore: String(taxaField.value || ''),
          ProducaoFinalBefore: String(calcProducaoFinal()),
          VolumesProcessadosBefore: String(volumesProcessadosField.value || ''),
          CustoUnitarioBefore: String(custoField.value || ''),
          TempoTratamentoBefore: String(tempoField.value || ''),
          FTEBefore: String(fteField.value || ''),
          EstimatedSavings: String(estimatedSavingsField.value || ''),
          EstimatedSavingsAnnual: String(calcAnnualizedEstimated()),
          ImplementationCost: String(implCostField.value || ''),
          ImplementationMonths: String(implMonthsField.value || ''),
        };
      };
    } else {
      // Read-only estimated fields
      const estPairs = [];
      if (financials.SavingCategory) estPairs.push(['Categoria', financials.SavingCategory]);
      estPairs.push(['Tipo Saving', financials.SavingType || deriveSavingType(financials.SavingCategory)]);
      if (financials.TimePeriod) estPairs.push(['Periodo', financials.TimePeriod]);
      if (financials.VolumePropostasBefore) estPairs.push(['Volume propostas [unid./mes]', displayValue(financials.VolumePropostasBefore)]);
      if (financials.MontanteMedioBefore) estPairs.push(['Montante medio [EUR]', displayValue(financials.MontanteMedioBefore)]);
      if (financials.TaxaTransformacaoBefore) estPairs.push(['Taxa de transformacao [%]', displayValue(financials.TaxaTransformacaoBefore)]);
      if (financials.ProducaoFinalBefore) estPairs.push(['Producao final', displayValue(financials.ProducaoFinalBefore)]);
      if (financials.VolumesProcessadosBefore) estPairs.push(['Volumes processados [unid.]', displayValue(financials.VolumesProcessadosBefore)]);
      if (financials.CustoUnitarioBefore) estPairs.push(['Custo unitario [EUR/mes]', displayValue(financials.CustoUnitarioBefore)]);
      if (financials.TempoTratamentoBefore) estPairs.push(['Tempo de tratamento [min]', displayValue(financials.TempoTratamentoBefore)]);
      if (financials.FTEBefore && financials.FTEBefore !== '0') estPairs.push(['FTE', displayValue(financials.FTEBefore)]);
      if (financials.EstimatedSavings) estPairs.push(['Saving estimado [EUR/periodo]', displayValue(financials.EstimatedSavings)]);
      if (financials.ImplementationCost && financials.ImplementationCost !== '0') estPairs.push(['Custo implementacao [EUR]', displayValue(financials.ImplementationCost)]);
      if (financials.ImplementationMonths && financials.ImplementationMonths !== '0') estPairs.push(['Meses implementacao', displayValue(financials.ImplementationMonths)]);

      if (estPairs.length > 0) {
        const estRows = estPairs.map(([label, value]) =>
          new Container([
            new Text(label, { type: 'span', class: 'pace-detail-label' }),
            new Text(String(value), { type: 'span', class: 'pace-detail-value' }),
          ], { class: 'pace-detail-row' })
        );

        financialComponents.push(
          new Text('Dados Estimados (Antes) - Apenas Leitura', { type: 'h3', class: 'pace-sec-title' }),
          new Container(estRows, { class: 'pace-detail-grid' }),
        );
      }
    }

    // -- Effective (After) fields --
    if (effectiveEditable && hasEffective) {
      const volAfterField = new FormField({ value: parseInitial(financials.VolumePropostasAfter) });
      const montAfterField = new FormField({ value: parseInitial(financials.MontanteMedioAfter) });
      const taxaAfterField = new FormField({ value: parseInitial(financials.TaxaTransformacaoAfter) });
      const volProcAfterField = new FormField({ value: parseInitial(financials.VolumesProcessadosAfter) });
      const custoAfterField = new FormField({ value: parseInitial(financials.CustoUnitarioAfter) });
      const tempoAfterField = new FormField({ value: parseInitial(financials.TempoTratamentoAfter) });
      const validatedSavingsField = new FormField({ value: parseInitial(financials.ValidatedSavings) });

      function calcProducaoAfter() {
        const v = parseFloat(volAfterField.value) || 0;
        const m = parseFloat(montAfterField.value) || 0;
        const t = parseFloat(taxaAfterField.value) || 0;
        return v * m * (t / 100);
      }

      function calcAnnualizedValidated() {
        return annualizeSavings(validatedSavingsField.value || 0, financials.TimePeriod || '');
      }

      const producaoAfterText = new Text(displayValue(calcProducaoAfter()), { type: 'span', class: 'pace-detail-value' });
      const annualizedValidatedText = new Text(displayValue(calcAnnualizedValidated()), { type: 'span', class: 'pace-detail-value' });

      volAfterField.subscribe(() => { producaoAfterText.children = displayValue(calcProducaoAfter()); });
      montAfterField.subscribe(() => { producaoAfterText.children = displayValue(calcProducaoAfter()); });
      taxaAfterField.subscribe(() => { producaoAfterText.children = displayValue(calcProducaoAfter()); });
      validatedSavingsField.subscribe(() => { annualizedValidatedText.children = displayValue(calcAnnualizedValidated()); });

      financialComponents.push(
        new Text('Dados Efetivos (Depois)', { type: 'h3', class: 'pace-sec-title' }),
        new FieldLabel('Volume propostas efetivo [unid./mes]', new NumberInput(volAfterField, { placeholder: '0' })),
        new FieldLabel('Montante medio efetivo [EUR]', new NumberInput(montAfterField, { placeholder: '0' })),
        new FieldLabel('Taxa de transformacao efetiva [%]', new NumberInput(taxaAfterField, { placeholder: '0' })),
        new Container([
          new Text('Producao final efetiva', { type: 'span', class: 'pace-detail-label' }),
          producaoAfterText,
        ], { class: 'pace-detail-row' }),
        new FieldLabel('Volumes processados efetivo [unid.]', new NumberInput(volProcAfterField, { placeholder: '0' })),
        new FieldLabel('Custo unitario efetivo [EUR/mes]', new NumberInput(custoAfterField, { placeholder: '0' })),
        new FieldLabel('Tempo de tratamento efetivo [min]', new NumberInput(tempoAfterField, { placeholder: '0' })),
        new FieldLabel('Saving validado [EUR/periodo]', new NumberInput(validatedSavingsField, { placeholder: '0' })),
        new Container([
          new Text('Saving validado anualizado [EUR]', { type: 'span', class: 'pace-detail-label' }),
          annualizedValidatedText,
        ], { class: 'pace-detail-row' }),
      );

      financialFields.push(
        volAfterField, montAfterField, taxaAfterField,
        volProcAfterField, custoAfterField, tempoAfterField, validatedSavingsField,
      );

      financialComponents._collectEffective = () => {
        return {
          VolumePropostasAfter: String(volAfterField.value || ''),
          MontanteMedioAfter: String(montAfterField.value || ''),
          TaxaTransformacaoAfter: String(taxaAfterField.value || ''),
          VolumesProcessadosAfter: String(volProcAfterField.value || ''),
          CustoUnitarioAfter: String(custoAfterField.value || ''),
          TempoTratamentoAfter: String(tempoAfterField.value || ''),
          ProducaoFinalAfter: String(calcProducaoAfter()),
          ValidatedSavings: String(validatedSavingsField.value || ''),
          ValidatedSavingsAnnual: String(calcAnnualizedValidated()),
        };
      };
    }
  }

  // -- Collect base fields helper --
  function collectBaseFields() {
    const teamVal = teamField.value;
    const impactedTeamOUID = teamVal && typeof teamVal === 'object' ? teamVal.value : (teamVal || '');
    const tagVal = tagsField.value;
    const tags = Array.isArray(tagVal)
      ? tagVal.map(t => typeof t === 'object' ? t.label : t)
      : [];
    return {
      Description: descriptionField.value,
      ImpactedTeamOUID: impactedTeamOUID,
      Tags: tags,
      Problem: problemField.value,
      Objective: objectiveField.value,
      IsConfidential: confidentialField.value,
    };
  }

  // -- Footer buttons --
  const submitBtn = new Button('Re-submeter', {
    variant: 'primary',
    onClickHandler: async () => {
      if (!canTransitionTo(STATUS.EM_REVISAO, target)) {
        Toast.error('Transicao de estado invalida.');
        return;
      }

      if (!schema.isValid) {
        schema.focusOnFirstInvalid();
        Toast.error('Preencha os campos obrigatorios.');
        return;
      }

      submitBtn.isLoading = true;
      const savingToast = Toast.loading('A re-submeter iniciativa...');
      try {
        // 1. Update initiative fields + status in a single call
        const baseFields = collectBaseFields();
        const mergedFields = { ...baseFields, Status: target, PreviousStatus: '' };
        await update(initiative.Id, mergedFields, initiative['odata.etag']);

        // 2. Update/create financials if editable section was shown
        if (financials && estimatedEditable && financialComponents._collectEstimated) {
          const estFields = financialComponents._collectEstimated();
          await updateFinancials(financials.Id, estFields, financials['odata.etag']);
        }
        if (financials && effectiveEditable && financialComponents._collectEffective) {
          const efFields = financialComponents._collectEffective();
          await updateFinancials(financials.Id, efFields, financials['odata.etag']);
        }

        // 3. Create resubmission event
        await createEvent(initiative.UUID, EVENT_TYPES.RESUBMISSION, STATUS.EM_REVISAO, target);

        // 4. Notify mentor if exists
        if (initiative.MentorEmail) {
          await createNotification(
            initiative.UUID,
            initiative.MentorEmail,
            initiative.Title + ' re-submetido.',
            'state_change',
          );
        }

        savingToast.success('Iniciativa re-submetida com sucesso.');
        modal.close();
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
        savingToast.error('Erro ao re-submeter iniciativa.');
      } finally {
        submitBtn.isLoading = false;
      }
    },
  });

  const cancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    onClickHandler: () => modal.close(),
  });

  // -- Build modal content --
  const modalChildren = [
    new Text('Revisao - ' + (initiative.Title || ''), { type: 'h2', class: 'pace-modal-title' }),
    ...bannerChildren,
    titleDisplay,
    basicInfoSection,
  ];

  if (financialComponents.length > 0) {
    modalChildren.push(...financialComponents);
  }

  modalChildren.push(
    new Container([cancelBtn, submitBtn], { class: 'pace-modal-footer' })
  );

  // -- All FormFields for cleanup --
  const allFields = [
    descriptionField, teamField, tagsField, problemField,
    objectiveField, confidentialField, ...financialFields,
  ];

  // -- Modal --
  const modal = new Modal(modalChildren, {
    closeOnFocusLoss: false,
    class: 'pace-estimated-modal',
    containerSelector: 'body',
    onCloseHandler: () => {
      for (const field of allFields) {
        field.dispose();
      }
    },
  });

  modal.render();
  modal.open();
}
