import {
  Text,
  Container,
  Button,
  View,
  Toast,
  defineRoute,
  __dayjs,
} from '../../libs/nofbiz/nofbiz.base.js';
import { getByStatuses } from '../../utils/initiatives-api.js';
import {
  STATUS,
  statusDescription,
} from '../../utils/status-helpers.js';
import {
  parseSaving,
  ownerName,
  mentorName,
  gestorName,
  buildKpi,
  buildTableHeader,
} from '../../utils/format-helpers.js';
import { createPageLayout } from '../../utils/navbar.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';

export default defineRoute((config) => {
  config.setRouteTitle('Catalogo');

  // -- state --

  let allItems = [];
  let activeTab = 'implementados';
  let implementados = [];
  let arquivo = [];
  let uniqueTeams = 0;
  let involvedUsers = 0;

  // -- layout containers --

  const kpiRow = new Container([], { class: 'pace-kpi-row' });
  const toggleContainer = new Container([], { class: 'pace-toggle-wrapper' });
  const implementadosView = new View([], { showOnRender: true });
  const arquivoView = new View([], { showOnRender: false });

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar catalogo...');
    try {
      allItems = await getByStatuses([STATUS.IMPLEMENTADO, STATUS.CANCELADO, STATUS.REJEITADO]);
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar catalogo');
    }
  }

  // -- build UI --

  function rebuildKpis() {
    if (activeTab === 'implementados') {
      kpiRow.children = [
        buildKpi(String(implementados.length), 'Iniciativas Implementadas'),
        buildKpi(String(uniqueTeams), 'Equipas Impactadas'),
        buildKpi(String(involvedUsers), 'Utilizadores Envolvidos', true),
      ];
    } else {
      kpiRow.children = [
        buildKpi(String(arquivo.length), 'Iniciativas em Arquivo'),
        buildKpi('-', 'Equipas Impactadas'),
        buildKpi('-', 'Utilizadores Envolvidos', true),
      ];
    }
  }

  function buildUI() {
    implementados = allItems.filter((i) => i.Status === STATUS.IMPLEMENTADO);
    arquivo = allItems.filter(
      (i) => i.Status === STATUS.CANCELADO || i.Status === STATUS.REJEITADO
    );

    uniqueTeams = new Set(implementados.map((i) => i.ImpactedTeamOUID).filter(Boolean)).size;

    const allEmails = [
      ...implementados.map((i) => i.SubmittedByEmail),
      ...implementados.map((i) => i.MentorEmail),
      ...implementados.map((i) => i.GestorValidatorEmail),
    ].filter(Boolean);
    involvedUsers = new Set(allEmails).size;

    // KPIs
    rebuildKpis();

    // Toggle buttons
    rebuildToggle();

    // Table content
    implementadosView.children = buildTable(implementados, true);
    arquivoView.children = buildTable(arquivo, false);
  }

  function rebuildToggle() {
    toggleContainer.children = [
      new Container(
        [
          new Button('Implementados', {
            variant: activeTab === 'implementados' ? 'primary' : 'secondary',
            class: activeTab === 'implementados' ? 'pace-toggle-btn pace-toggle-btn--active' : 'pace-toggle-btn',
            onClickHandler: () => switchTab('implementados'),
          }),
          new Button('Arquivo', {
            variant: activeTab === 'arquivo' ? 'primary' : 'secondary',
            class: activeTab === 'arquivo' ? 'pace-toggle-btn pace-toggle-btn--active' : 'pace-toggle-btn',
            onClickHandler: () => switchTab('arquivo'),
          }),
        ],
        { class: 'pace-toggle' }
      ),
      new Button('Exportar', {
        variant: 'secondary',
        isDisabled: true,
        onClickHandler: () => {
          alert('Exportar CSV (placeholder)');
        },
      }),
    ];
  }

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'implementados') {
      implementadosView.show();
      arquivoView.hide();
    } else {
      implementadosView.hide();
      arquivoView.show();
    }
    rebuildKpis();
    rebuildToggle();
  }

  function buildTable(items, showDate) {
    const headerCols = ['Iniciativa', 'Estado', 'Colaborador', 'Equipa', 'Mentor', 'Gestor', 'Saving', 'Valor'];
    if (showDate) headerCols.push('Implementado');

    const rows = items.map((item) => {
      const saving = parseSaving(item.SavingValidated || item.SavingsValue);
      const cells = [
        new Container([
          new Button(item.Title || '-', {
            variant: 'secondary',
            onClickHandler: () => openInitiativeDetail(item, 'catalogo', loadData),
            class: 'pace-table-link-btn',
          }),
          ...(item.Description ? [new Text(item.Description, { type: 'p', class: 'pace-table-description' })] : []),
        ], { class: 'pace-table-cell-stack' }),
        new Text(statusDescription(item.Status), { type: 'span' }),
        new Text(ownerName(item), { type: 'span' }),
        new Text(item.Team, { type: 'span' }),
        new Text(mentorName(item), { type: 'span' }),
        new Text(gestorName(item), { type: 'span' }),
        new Text(item.SavingType || '---', { type: 'span' }),
        new Text(saving ? `EUR ${saving.toLocaleString()}` : '---', { type: 'span' }),
      ];

      if (showDate) {
        cells.push(
          new Text(
            item.ImplementedDate
              ? __dayjs(item.ImplementedDate).format('DD/MM/YYYY')
              : '---',
            { type: 'span' }
          )
        );
      }

      return new Container(cells, { class: 'pace-table-row' });
    });

    if (items.length === 0) {
      return [
        buildTableHeader(headerCols),
        new Text('Sem iniciativas nesta categoria.', { type: 'p', class: 'pace-empty' }),
      ];
    }

    const tableClass = showDate ? 'pace-table-wrap pace-table--catalogo' : 'pace-table-wrap pace-table--arquivo';
    return [new Container([buildTableHeader(headerCols), ...rows], { class: tableClass })];
  }

  // -- init --

  loadData();

  return createPageLayout([kpiRow, toggleContainer, implementadosView, arquivoView]);
});
