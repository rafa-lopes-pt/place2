import {
  Modal,
  Container,
  Text,
  NumberInput,
  ComboBox,
  FormField,
  FieldLabel,
  Button,
  Toast,
  ContextStore,
} from '../libs/nofbiz/nofbiz.base.js';

import { getByInitiative, create as createFinancials, update as updateFinancials } from './financials-api.js';
import { transitionStatus } from './initiatives-api.js';
import { createEvent } from './initiative-events-api.js';
import { createNotification } from './notifications-api.js';
import { annualizeSavings, deriveSavingType, EVENT_TYPES, SAVING_CATEGORIES, ANNUALIZATION_FACTORS } from './constants.js';
import { STATUS, canTransitionTo } from './status-helpers.js';

/**
 * Opens a modal for the mentor to review/edit estimated (Before) financial fields
 * before approving an initiative. On submit, saves financials, assigns mentor,
 * transitions status to VALIDADO_MENTOR, creates an audit event, and notifies the owner.
 *
 * @param {Object} initiative - The initiative data object
 * @param {() => void} [onSuccess] - Callback invoked after a successful approval
 */
export async function openEstimatedDataModal(initiative, onSuccess) {
  const loading = Toast.loading('A carregar dados financeiros...');
  let financials;
  try {
    financials = await getByInitiative(initiative.UUID);
  } catch (_) {
    loading.error('Erro ao carregar dados financeiros.');
    return;
  }
  loading.dismiss();

  // -- Helper: format number for display or show "-" --
  function displayValue(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toLocaleString('pt-PT');
  }

  // -- Helper: parse existing value as number or empty --
  function parseInitial(val) {
    if (val === null || val === undefined || val === '') return '';
    const num = parseFloat(val);
    return isNaN(num) ? '' : num;
  }

  // -- FormFields for Before values (pre-filled from existing financials) --
  const volumeField = new FormField({ value: parseInitial(financials?.VolumeBefore || financials?.VolumePropostasBefore) });
  const montanteField = new FormField({ value: parseInitial(financials?.MontanteMedioBefore) });
  const taxaField = new FormField({ value: parseInitial(financials?.TaxaTransformacaoBefore) });
  const volumesProcessadosField = new FormField({ value: parseInitial(financials?.VolumesProcessadosBefore) });
  const custoField = new FormField({ value: parseInitial(financials?.CustoUnitarioBefore) });
  const tempoField = new FormField({ value: parseInitial(financials?.TempoTratamentoBefore) });
  const fteField = new FormField({ value: parseInitial(financials?.FTEBefore) });
  const estimatedSavingsField = new FormField({ value: parseInitial(financials?.EstimatedSavings) });
  const implCostField = new FormField({ value: parseInitial(financials?.ImplementationCost) });
  const implMonthsField = new FormField({ value: parseInitial(financials?.ImplementationMonths) });

  // -- ComboBox fields for category and time period --
  const categoryOptions = SAVING_CATEGORIES.map(c => ({ label: c, value: c }));
  const existingCategory = financials?.SavingCategory || '';
  const categoryField = new FormField({
    value: existingCategory ? { label: existingCategory, value: existingCategory } : null,
  });

  const timePeriodOptions = Object.keys(ANNUALIZATION_FACTORS).map(k => ({ label: k, value: k }));
  const existingPeriod = financials?.TimePeriod || '';
  const timePeriodField = new FormField({
    value: existingPeriod ? { label: existingPeriod, value: existingPeriod } : null,
  });

  // -- Auto-calculated display components --
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

  const producaoFinalText = new Text(displayValue(calcProducaoFinal()), {
    type: 'span',
    class: 'pace-detail-value',
  });

  const annualizedEstimatedText = new Text(displayValue(calcAnnualizedEstimated()), {
    type: 'span',
    class: 'pace-detail-value',
  });

  const savingTypeText = new Text(deriveSavingType(getCategoryValue()), {
    type: 'span',
    class: 'pace-detail-value',
  });

  // -- Subscribe to field changes for auto-calculation --
  volumeField.subscribe(() => {
    producaoFinalText.children = displayValue(calcProducaoFinal());
  });
  montanteField.subscribe(() => {
    producaoFinalText.children = displayValue(calcProducaoFinal());
  });
  taxaField.subscribe(() => {
    producaoFinalText.children = displayValue(calcProducaoFinal());
  });
  estimatedSavingsField.subscribe(() => {
    annualizedEstimatedText.children = displayValue(calcAnnualizedEstimated());
  });
  timePeriodField.subscribe(() => {
    annualizedEstimatedText.children = displayValue(calcAnnualizedEstimated());
  });
  categoryField.subscribe(() => {
    savingTypeText.children = deriveSavingType(getCategoryValue());
  });

  // -- Helper: build a labeled editable field row --
  function buildEditableRow(label, input) {
    return new FieldLabel(label, input);
  }

  // -- Helper: build a labeled read-only row --
  function buildReadOnlyRow(label, valueComponent) {
    return new Container([
      new Text(label, { type: 'span', class: 'pace-detail-label' }),
      valueComponent,
    ], { class: 'pace-detail-row' });
  }

  // -- Editable info row at the top (full-width, above the 3-column grid) --
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

  // -- Section: Receita e Propostas --
  const revenueSection = new Container([
    new Text('Receita e Propostas', { type: 'h3', class: 'pace-sec-title' }),
    buildEditableRow('Volume propostas [unid./mes]', new NumberInput(volumeField, { placeholder: '0' })),
    buildEditableRow('Montante medio [EUR]', new NumberInput(montanteField, { placeholder: '0' })),
    buildEditableRow('Taxa de transformacao [%]', new NumberInput(taxaField, { placeholder: '0' })),
    buildReadOnlyRow('Producao final', producaoFinalText),
  ], { class: 'pace-effective-section' });

  // -- Section: Operacoes --
  const operationsSection = new Container([
    new Text('Operacoes', { type: 'h3', class: 'pace-sec-title' }),
    buildEditableRow('Volumes processados [unid.]', new NumberInput(volumesProcessadosField, { placeholder: '0' })),
    buildEditableRow('Custo unitario [EUR/mes]', new NumberInput(custoField, { placeholder: '0' })),
    buildEditableRow('Tempo de tratamento [min]', new NumberInput(tempoField, { placeholder: '0' })),
    buildEditableRow('FTE', new NumberInput(fteField, { placeholder: '0' })),
  ], { class: 'pace-effective-section' });

  // -- Section: Savings e Implementacao --
  const savingsSection = new Container([
    new Text('Savings e Implementacao', { type: 'h3', class: 'pace-sec-title' }),
    buildEditableRow('Saving estimado [EUR/periodo]', new NumberInput(estimatedSavingsField, { placeholder: '0' })),
    buildReadOnlyRow('Saving estimado anualizado [EUR]', annualizedEstimatedText),
    buildEditableRow('Custo implementacao [EUR]', new NumberInput(implCostField, { placeholder: '0' })),
    buildEditableRow('Meses implementacao', new NumberInput(implMonthsField, { placeholder: '0' })),
  ], { class: 'pace-effective-section' });

  // -- Footer buttons --
  const approveBtn = new Button('Aprovar', {
    variant: 'primary',
    onClickHandler: async () => {
      if (!canTransitionTo(initiative.Status, STATUS.VALIDADO_MENTOR)) {
        Toast.error('Transicao de estado invalida.');
        return;
      }

      approveBtn.isLoading = true;
      const savingToast = Toast.loading('A aprovar projecto...');
      try {
        // 1. Save updated Before fields to financials
        const selectedCategory = getCategoryValue();
        const selectedPeriod = getTimePeriodValue();
        const beforeFields = {
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
        if (financials) {
          await updateFinancials(financials.Id, beforeFields, financials['odata.etag']);
        } else {
          await createFinancials(initiative.UUID, beforeFields);
        }

        // 2. Assign current mentor and transition status
        const user = ContextStore.get('currentUser');
        const mentorIdentity = { email: user.get('email'), displayName: user.get('displayName') };
        await transitionStatus(initiative.Id, STATUS.VALIDADO_MENTOR, initiative['odata.etag'], {
          Mentor: mentorIdentity,
          MentorEmail: user.get('email'),
        });

        // 3. Create audit event
        await createEvent(initiative.UUID, EVENT_TYPES.MENTOR_APPROVAL, STATUS.SUBMETIDO, STATUS.VALIDADO_MENTOR);

        // 4. Send notification to initiative owner
        if (initiative.SubmittedByEmail) {
          await createNotification(
            initiative.UUID,
            initiative.SubmittedByEmail,
            'Sua iniciativa foi aprovada pelo mentor.',
            'state_change',
          );
        }

        savingToast.success('Projecto aprovado.');
        modal.close();
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
        savingToast.error('Erro ao aprovar projecto.');
      } finally {
        approveBtn.isLoading = false;
      }
    },
  });

  const cancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    onClickHandler: () => modal.close(),
  });

  // -- Modal --
  const modal = new Modal([
    new Text('Dados Estimados - ' + (initiative.Title || ''), { type: 'h2', class: 'pace-modal-title' }),
    infoRow,
    new Container([
      revenueSection,
      operationsSection,
      savingsSection,
    ], { class: 'pace-effective-content' }),
    new Container([approveBtn, cancelBtn], { class: 'pace-detail-footer' }),
  ], {
    closeOnFocusLoss: false,
    class: 'pace-estimated-modal',
    containerSelector: 'body',
    onCloseHandler: () => {
      categoryField.dispose();
      timePeriodField.dispose();
      volumeField.dispose();
      montanteField.dispose();
      taxaField.dispose();
      volumesProcessadosField.dispose();
      custoField.dispose();
      tempoField.dispose();
      fteField.dispose();
      estimatedSavingsField.dispose();
      implCostField.dispose();
      implMonthsField.dispose();
    },
  });

  modal.render();
  modal.open();
}
