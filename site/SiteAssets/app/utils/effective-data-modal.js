import {
  Modal,
  Container,
  Text,
  NumberInput,
  FormField,
  FieldLabel,
  Button,
  Toast,
  ContextStore,
} from '../libs/nofbiz/nofbiz.base.js';

import { getByInitiative, update as updateFinancials } from './financials-api.js';
import { annualizeSavings } from './constants.js';

/**
 * Opens a modal for editing effective (After) data on an initiative's financials.
 * Shows a two-column comparison: Before values (read-only) vs After values (editable).
 *
 * @param {Object} initiative - The initiative data object
 * @param {() => void} [onSuccess] - Callback invoked after a successful save
 */
export async function openEffectiveDataModal(initiative, onSuccess) {
  const loading = Toast.loading('A carregar dados financeiros...');
  let financials;
  try {
    financials = await getByInitiative(initiative.UUID);
  } catch (_) {
    loading.error('Erro ao carregar dados financeiros.');
    return;
  }
  loading.dismiss();

  if (!financials) {
    Toast.error('Dados financeiros nao encontrados.');
    return;
  }

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

  // -- FormFields for After values (pre-filled if previously saved) --
  const volumeField = new FormField({ value: parseInitial(financials.VolumePropostasAfter) });
  const montanteField = new FormField({ value: parseInitial(financials.MontanteMedioAfter) });
  const taxaField = new FormField({ value: parseInitial(financials.TaxaTransformacaoAfter) });
  const volumesProcessadosField = new FormField({ value: parseInitial(financials.VolumesProcessadosAfter) });
  const custoField = new FormField({ value: parseInitial(financials.CustoUnitarioAfter) });
  const tempoField = new FormField({ value: parseInitial(financials.TempoTratamentoAfter) });
  const validatedSavingsField = new FormField({ value: parseInitial(financials.ValidatedSavings) });

  // -- Auto-calculated display components --
  const producaoBeforeVal = parseFloat(financials.ProducaoFinalBefore) || 0;

  function calcProducaoAfter() {
    const v = parseFloat(volumeField.value) || 0;
    const m = parseFloat(montanteField.value) || 0;
    const t = parseFloat(taxaField.value) || 0;
    return v * m * (t / 100);
  }

  function calcAnnualizedValidated() {
    return annualizeSavings(validatedSavingsField.value || 0, financials.TimePeriod || '');
  }

  const producaoAfterText = new Text(displayValue(calcProducaoAfter()), {
    type: 'span',
    class: 'pace-detail-value',
  });

  const annualizedValidatedText = new Text(displayValue(calcAnnualizedValidated()), {
    type: 'span',
    class: 'pace-detail-value',
  });

  // -- Subscribe to field changes for auto-calculation --
  const unsubVolume = volumeField.subscribe(() => {
    producaoAfterText.value = displayValue(calcProducaoAfter());
  });
  const unsubMontante = montanteField.subscribe(() => {
    producaoAfterText.value = displayValue(calcProducaoAfter());
  });
  const unsubTaxa = taxaField.subscribe(() => {
    producaoAfterText.value = displayValue(calcProducaoAfter());
  });
  const unsubValidated = validatedSavingsField.subscribe(() => {
    annualizedValidatedText.value = displayValue(calcAnnualizedValidated());
  });

  // -- Helper: build a comparison row (before label+value | after label+input) --
  function buildComparisonRow(label, beforeVal, afterInput) {
    return new Container([
      new Container([
        new Text(label, { type: 'span', class: 'pace-detail-label' }),
        new Text(displayValue(beforeVal), { type: 'span', class: 'pace-detail-value' }),
      ], { class: 'pace-effective-col' }),
      new Container([
        new FieldLabel(label, afterInput),
      ], { class: 'pace-effective-col' }),
    ], { class: 'pace-effective-row' });
  }

  // -- Helper: build a comparison row with read-only after value --
  function buildReadOnlyRow(label, beforeVal, afterComponent) {
    return new Container([
      new Container([
        new Text(label, { type: 'span', class: 'pace-detail-label' }),
        new Text(displayValue(beforeVal), { type: 'span', class: 'pace-detail-value' }),
      ], { class: 'pace-effective-col' }),
      new Container([
        new Text(label, { type: 'span', class: 'pace-detail-label' }),
        afterComponent,
      ], { class: 'pace-effective-col' }),
    ], { class: 'pace-effective-row' });
  }

  // -- Helper: column header row (reused per section) --
  function buildColumnHeader() {
    return new Container([
      new Container([
        new Text('Antes', { type: 'span', class: 'pace-effective-col-header' }),
      ], { class: 'pace-effective-col' }),
      new Container([
        new Text('Depois (Efetivo)', { type: 'span', class: 'pace-effective-col-header' }),
      ], { class: 'pace-effective-col' }),
    ], { class: 'pace-effective-row pace-effective-row--header' });
  }

  // -- Section: Receita e Propostas --
  const revenueSection = new Container([
    new Text('Receita e Propostas', { type: 'h3', class: 'pace-sec-title' }),
    buildColumnHeader(),
    buildComparisonRow(
      'Volume propostas [unid./mes]',
      financials.VolumeBefore || financials.VolumePropostasBefore,
      new NumberInput(volumeField, { placeholder: '0' })
    ),
    buildComparisonRow(
      'Montante medio [EUR]',
      financials.MontanteMedioBefore,
      new NumberInput(montanteField, { placeholder: '0' })
    ),
    buildComparisonRow(
      'Taxa de transformacao [%]',
      financials.TaxaTransformacaoBefore,
      new NumberInput(taxaField, { placeholder: '0' })
    ),
    buildReadOnlyRow(
      'Producao final',
      producaoBeforeVal,
      producaoAfterText
    ),
  ], { class: 'pace-effective-section' });

  // -- Section: Operacoes --
  const operationsSection = new Container([
    new Text('Operacoes', { type: 'h3', class: 'pace-sec-title' }),
    buildColumnHeader(),
    buildComparisonRow(
      'Volumes processados [unid.]',
      financials.VolumesProcessadosBefore,
      new NumberInput(volumesProcessadosField, { placeholder: '0' })
    ),
    buildComparisonRow(
      'Custo unitario [EUR/mes]',
      financials.CustoUnitarioBefore,
      new NumberInput(custoField, { placeholder: '0' })
    ),
    buildComparisonRow(
      'Tempo de tratamento [min]',
      financials.TempoTratamentoBefore,
      new NumberInput(tempoField, { placeholder: '0' })
    ),
  ], { class: 'pace-effective-section' });

  // -- Section: Savings --
  const estimatedAnnual = financials.EstimatedSavingsAnnual
    || annualizeSavings(financials.EstimatedSavings || 0, financials.TimePeriod || '');

  const savingsSection = new Container([
    new Text('Savings', { type: 'h3', class: 'pace-sec-title' }),
    buildColumnHeader(),
    buildComparisonRow(
      'Saving estimado [EUR/periodo]',
      financials.EstimatedSavings,
      new NumberInput(validatedSavingsField, { placeholder: '0' })
    ),
    buildReadOnlyRow(
      'Saving anualizado [EUR]',
      estimatedAnnual,
      annualizedValidatedText
    ),
  ], { class: 'pace-effective-section' });

  // -- Footer buttons --
  const saveBtn = new Button('Guardar', {
    variant: 'primary',
    onClickHandler: async () => {
      saveBtn.isLoading = true;
      const savingToast = Toast.loading('A guardar dados efetivos...');
      try {
        const producaoAfter = calcProducaoAfter();
        const annualizedValidated = calcAnnualizedValidated();

        const afterFields = {
          VolumePropostasAfter: String(volumeField.value || ''),
          MontanteMedioAfter: String(montanteField.value || ''),
          TaxaTransformacaoAfter: String(taxaField.value || ''),
          VolumesProcessadosAfter: String(volumesProcessadosField.value || ''),
          CustoUnitarioAfter: String(custoField.value || ''),
          TempoTratamentoAfter: String(tempoField.value || ''),
          ProducaoFinalAfter: String(producaoAfter),
          ValidatedSavings: String(validatedSavingsField.value || ''),
          ValidatedSavingsAnnual: String(annualizedValidated),
        };

        await updateFinancials(financials.Id, afterFields, financials['odata.etag']);
        savingToast.success('Dados efetivos guardados.');
        modal.close();
        if (onSuccess) onSuccess();
      } catch (err) {
        savingToast.error('Erro ao guardar dados efetivos.');
      } finally {
        saveBtn.isLoading = false;
      }
    },
  });

  const cancelBtn = new Button('Cancelar', {
    variant: 'secondary',
    onClickHandler: () => modal.close(),
  });

  // -- Modal --
  const modal = new Modal([
    new Text('Dados Efetivos - ' + (initiative.Title || ''), { type: 'h2', class: 'pace-modal-title' }),
    new Container([
      revenueSection,
      operationsSection,
      savingsSection,
    ], { class: 'pace-effective-content' }),
    new Container([saveBtn, cancelBtn], { class: 'pace-detail-footer' }),
  ], {
    closeOnFocusLoss: false,
    class: 'pace-effective-modal',
    containerSelector: 'body',
    onCloseHandler: () => {
      volumeField.dispose();
      montanteField.dispose();
      taxaField.dispose();
      volumesProcessadosField.dispose();
      custoField.dispose();
      tempoField.dispose();
      validatedSavingsField.dispose();
    },
  });

  modal.render();
  modal.open();
}
