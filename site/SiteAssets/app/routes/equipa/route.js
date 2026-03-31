import {
  Text,
  Container,
  Button,
  Toast,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';

import { getByTeamScope } from '../../utils/initiatives-api.js';
import { getUserOUID } from '../../utils/roles.js';
import { getTeamMembers, getTeamScope } from '../../utils/org-hierarchy-api.js';
import { STATUS, STATUS_FLOW, statusLabel, statusDescription } from '../../utils/status-helpers.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';
import { createFilterBar } from '../../utils/filters.js';
import { createPageLayout } from '../../utils/navbar.js';
import { buildTableHeader, buildKpi, mentorName, gestorName, ownerName } from '../../utils/format-helpers.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Equipa');

  const userOUID = getUserOUID();

  // -- Resolve team scope --
  let deptName = userOUID;
  let teamItems = [];

  if (!userOUID) {
    Toast.error('OUID do utilizador nao definido.');
    return createPageLayout([
      new Text('Erro: Sem equipa associada ao utilizador.', { type: 'p', class: 'pace-empty-msg' }),
    ]);
  }

  try {
    // Get all employees in user's dept to find the dept's ancestor path
    const deptMembers = await getTeamMembers(userOUID);
    if (deptMembers.length > 0) {
      deptName = deptMembers[0].DeptName || userOUID;
      // Find a member whose DeptAncestorPath ends with the deptCode (not a subdivision)
      const deptMember = deptMembers.find(m => m.DeptAncestorPath.endsWith(userOUID)) || deptMembers[0];
      const deptAncestorPath = deptMember.DeptAncestorPath.endsWith(userOUID)
        ? deptMember.DeptAncestorPath
        : deptMember.DeptAncestorPath.split('|').slice(0, -1).join('|'); // strip subdivision
      const scope = await getTeamScope(deptAncestorPath);
      teamItems = await getByTeamScope(scope);
    } else {
      teamItems = await getByTeamScope([userOUID]);
    }
  } catch (error) {
    Toast.error('Erro ao carregar iniciativas da equipa.');
  }

  // -- Status KPI counts --
  const statusCounts = new Map();
  for (const item of teamItems) {
    statusCounts.set(item.Status, (statusCounts.get(item.Status) || 0) + 1);
  }
  const kpiOrder = [...STATUS_FLOW, STATUS.EM_REVISAO, STATUS.REJEITADO, STATUS.CANCELADO];
  const kpiChips = kpiOrder
    .filter(s => statusCounts.get(s) > 0)
    .map(s => buildKpi(String(statusCounts.get(s)), statusLabel(s)));
  const kpiRow = kpiChips.length > 0
    ? new Container(kpiChips, { class: 'pace-kpi-row' })
    : null;

  // -- Team header --
  const scopeCount = teamItems.length;
  const teamHeader = new Container([
    new Container([
      new Text(deptName, { type: 'h2', class: 'pace-cta-text' }),

      new Text(userOUID, { type: 'span', class: 'pace-chip pace-chip--inactive' }),
      new Text(`${scopeCount} iniciativa${scopeCount !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-chip pace-chip--active' }),

    ], { class: 'pace-cta-left' }),
  ], { class: 'pace-cta' });

  // -- Filterable table --
  let filteredItems = [...teamItems];
  const tableContainer = new Container([], { class: 'pace-open-table-container' });

  const renderTable = () => {
    if (filteredItems.length === 0) {
      tableContainer.children = new Text('Sem iniciativas encontradas.', { type: 'p', class: 'pace-empty-msg' });
      return;
    }

    const rows = filteredItems.map((item) => new Container(
      [
        new Container([
          new Button(item.Title || '-', {
            variant: 'secondary',
            isOutlined: true,
            onClickHandler: () => openInitiativeDetail(item, 'equipa'),
            class: 'pace-table-link-btn',
          }),
          ...(item.Description ? [new Text(item.Description, { type: 'p', class: 'pace-table-description' })] : []),
        ], { class: 'pace-table-cell-stack' }),
        new Text(statusDescription(item.Status), { type: 'span' }),
        new Text(mentorName(item), { type: 'span' }),
        new Text(gestorName(item), { type: 'span' }),
        new Text(ownerName(item), { type: 'span' }),
      ],
      { class: 'pace-table-row' }
    ));

    tableContainer.children = new Container(
      [buildTableHeader(['Iniciativa', 'Estado', 'Mentor', 'Gestor', 'Submetido por']), ...rows],
      { class: 'pace-table-wrap pace-table--pessoal' }
    );
  };

  const statusOptions = [
    STATUS.RASCUNHO,
    STATUS.SUBMETIDO,
    STATUS.VALIDADO_MENTOR,
    STATUS.EM_EXECUCAO,
    STATUS.POR_VALIDAR,
    STATUS.VALIDADO_GESTOR,
    STATUS.VALIDADO_FINAL,
    STATUS.IMPLEMENTADO,
    STATUS.EM_REVISAO,
    STATUS.REJEITADO,
    STATUS.CANCELADO,
  ];

  const savingOptions = ['Sem saving', 'Hard Saving', 'Soft Saving'];

  const filterBar = createFilterBar({
    statusOptions,
    savingOptions,
    searchPlaceholder: 'Pesquisar iniciativas da equipa...',
    onFilterChange: (filters) => {
      filteredItems = teamItems.filter((item) => {
        if (filters.status && statusLabel(item.Status) !== filters.status && item.Status !== filters.status) {
          return false;
        }
        if (filters.savingType && (item.SavingType || 'Sem saving') !== filters.savingType) {
          return false;
        }
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          const searchable = [
            item.Title, item.ImpactedTeamOUID, item.CreatedByName,
          ].filter(Boolean).join(' ').toLowerCase();
          if (!searchable.includes(query)) return false;
        }
        return true;
      });
      filterBar.setCount(filteredItems.length);
      renderTable();
    },
  });

  filterBar.setCount(filteredItems.length);
  renderTable();

  const tableSection = new Container([
    new Text('Iniciativas da Equipa', { type: 'h2', class: 'pace-sec-title' }),
    filterBar.container,
    tableContainer,
  ]);

  return createPageLayout([teamHeader, ...(kpiRow ? [kpiRow] : []), tableSection]);
});
