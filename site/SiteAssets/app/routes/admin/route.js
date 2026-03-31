import {
  Text, Container, Button, Dialog, Toast, View, Loader, List,
  TabGroup, AccordionItem, FormField, TextInput, ComboBox, defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
import { createPageLayout } from '../../utils/navbar.js';
import { importFromCSV, getAllEmployees, deriveRoles, updateEmployeeRole } from '../../utils/org-hierarchy-api.js';
import { buildKpi } from '../../utils/format-helpers.js';

export default defineRoute((config) => {
  config.setRouteTitle('Admin');

  // -- helpers --

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function openFileDialog(accept = '.csv') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', async () => {
        const file = input.files[0];
        document.body.removeChild(input);
        if (!file) { reject(new Error('No file selected')); return; }
        try {
          const content = await file.text();
          resolve({ name: file.name, size: file.size, content });
        } catch (err) { reject(err); }
      });
      input.addEventListener('cancel', () => {
        document.body.removeChild(input);
        resolve(null);
      });
      input.click();
    });
  }

  const APP_ROLE_OPTIONS = [
    { label: 'Automatico (sem perfil manual)', value: '' },
    { label: 'Gestor', value: 'gestor' },
    { label: 'Mentor', value: 'mentor' },
  ];

  // -- shared employee cache --

  let employeeCache = null;
  let cacheStale = true;
  let dadosLoaded = false;
  let hierarquiaLoaded = false;

  async function getEmployees() {
    if (!cacheStale && employeeCache !== null) return employeeCache;
    employeeCache = await getAllEmployees();
    cacheStale = false;
    return employeeCache;
  }

  function invalidateCache() {
    cacheStale = true;
    employeeCache = null;
    dadosLoaded = false;
    hierarquiaLoaded = false;
  }

  // -- state --

  let selectedFile = null;
  let progressCurrent = 0;
  let progressTotal = 0;

  // -- Tab 1: Importar --

  const ctaBanner = new Container(
    [
      new Container(
        [
          new Text('Gestao de Hierarquia Organizacional', {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text(
            'Importar ficheiro CSV para actualizar a hierarquia organizacional. Esta operacao substitui todos os dados existentes.',
            { type: 'p', class: 'pace-cta-text' }
          ),
        ],
        { as: 'div' }
      ),
    ],
    { class: 'pace-cta' }
  );

  const statsRow = new Container(
    [new Loader([], {})],
    { class: 'pace-kpi-row' }
  );

  const selectFileButton = new Button('Selecionar ficheiro CSV', {
    variant: 'secondary',
    onClickHandler: handleSelectFile,
  });

  const uploadSection = new Container([]);

  const resultSection = new Container([]);

  const progressText = new Text(
    [() => progressTotal > 0
      ? `A importar... ${progressCurrent}/${progressTotal} colaboradores`
      : 'A preparar importacao...'],
    { type: 'p' }
  );

  // -- stats --

  async function refreshStats() {
    try {
      const employees = await getEmployees();
      const deptSet = new Set(employees.map(e => e.DeptCode).filter(Boolean));
      const maxDepth = Math.max(0, ...employees.map(e => parseInt(e.Depth, 10) || 0));
      statsRow.children = [
        buildKpi(String(employees.length), 'Colaboradores'),
        buildKpi(String(deptSet.size), 'Departamentos'),
        buildKpi(String(maxDepth), 'Niveis'),
      ];
    } catch (err) {
      statsRow.children = [
        new Text('Erro ao carregar estatisticas.', { type: 'p' }),
      ];
    }
  }

  // -- import result display --

  function showResult(result) {
    const children = [
      new Container([
        buildKpi(String(result.success), 'Importados'),
        buildKpi(String(result.failed), 'Falharam', result.failed > 0),
      ], { class: 'pace-kpi-row' }),
    ];

    if (result.errors && result.errors.length > 0) {
      children.push(
        new Text(`${result.errors.length} aviso(s):`, { type: 'p' }),
        ...result.errors.slice(0, 10).map(msg => new Text(`- ${msg}`, { type: 'p' })),
        ...(result.errors.length > 10
          ? [new Text(`... e mais ${result.errors.length - 10} erros.`, { type: 'p' })]
          : [])
      );
    }

    resultSection.children = [new Container(children, { class: 'admin-result-card' })];
  }

  // -- file selection handler --

  async function handleSelectFile() {
    try {
      const file = await openFileDialog('.csv');
      if (!file) return;
      selectedFile = file;
      showFileSelectedState();
    } catch (err) {
      Toast.error('Erro ao ler o ficheiro.');
    }
  }

  // -- UI state transitions --

  function showReadyState() {
    uploadSection.children = [selectFileButton];
  }

  function showFileSelectedState() {
    const importButton = new Button('Importar Hierarquia', {
      onClickHandler: () => showConfirmDialog(importButton),
    });

    const cancelButton = new Button('Cancelar', {
      variant: 'secondary',
      onClickHandler: () => {
        selectedFile = null;
        showReadyState();
      },
    });

    const fileInfo = new Text(
      `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
      { type: 'p' }
    );

    uploadSection.children = [fileInfo, importButton, cancelButton];
  }

  // -- confirmation dialog --

  function showConfirmDialog(importButton) {
    const cancelDialogBtn = new Button('Cancelar', {
      variant: 'secondary',
      onClickHandler: () => { confirmDialog.close(); confirmDialog.remove(); },
    });

    const confirmDialogBtn = new Button('Confirmar Importacao', {
      variant: 'danger',
      onClickHandler: () => {
        confirmDialog.close();
        confirmDialog.remove();
        runImport(importButton);
      },
    });

    const confirmDialog = new Dialog({
      title: 'Confirmar Importacao',
      content: new Text(
        'Esta accao ira substituir TODOS os dados da hierarquia organizacional. Esta operacao nao pode ser revertida. Tem a certeza?',
        { type: 'p' }
      ),
      footer: [cancelDialogBtn, confirmDialogBtn],
      variant: 'warning',
      closeOnFocusLoss: false,
      containerSelector: 'body',
    });

    confirmDialog.render();
    confirmDialog.open();
  }

  // -- import execution --

  async function runImport(importButton) {
    importButton.isLoading = true;
    progressCurrent = 0;
    progressTotal = 0;

    resultSection.children = [];
    uploadSection.children = [progressText];

    const loading = Toast.loading('A importar hierarquia...');

    try {
      const result = await importFromCSV(selectedFile.content, (current, total) => {
        progressCurrent = current;
        progressTotal = total;
        progressText._refresh();
      });

      loading.success(
        `Importacao concluida: ${result.success} colaboradores importados.`
      );

      invalidateCache();
      showResult(result);
      await refreshStats();
    } catch (err) {
      loading.error('Erro ao importar hierarquia.');
      resultSection.children = [
        new Container(
          [new Text(`Erro: ${err.message || 'Falha desconhecida'}`, { type: 'p' })],
          { class: 'admin-result-card admin-result-card--error' }
        ),
      ];
    } finally {
      selectedFile = null;
      showReadyState();
    }
  }

  // -- Tab views (declared early so loading functions can reference them) --

  const importView = new View(
    [ctaBanner, statsRow, uploadSection, resultSection],
    { showOnRender: true }
  );

  const dadosView = new View([], { showOnRender: true });

  const hierarquiaView = new View([], { showOnRender: true });

  // -- Tab 2: Dados (Employee Table) --

  const dadosList = new List({
    headers: ['Nome', 'Perfil', 'Categoria', 'Departamento', 'Subdivisao', 'Manager'],
    data: [],
    emptyListMessage: 'Sem dados. Importe um ficheiro CSV no separador Importar.',
    onItemSelectHandler: (rowData) => {
      const emp = displayedEmployees.find(e => (e.ShortName || e.FullName) === rowData[0]);
      if (emp) showRoleDialog(emp.Title);
    },
  });

  let allEmployeeRows = [];
  let displayedEmployees = [];
  const dadosCountText = new Text('', { type: 'p', class: 'pace-filter-count' });

  const searchField = new FormField('');
  const searchInput = new TextInput(searchField, { placeholder: 'Pesquisar por nome...' });

  const perfilField = new FormField(null);
  const perfilCombo = new ComboBox(perfilField, [], { placeholder: 'Perfil', allowFiltering: false });

  const catField = new FormField(null);
  const catCombo = new ComboBox(catField, [], { placeholder: 'Categoria', allowFiltering: true });

  const deptField = new FormField(null);
  const deptCombo = new ComboBox(deptField, [], { placeholder: 'Departamento', allowFiltering: true });

  const subDivField = new FormField(null);
  const subDivCombo = new ComboBox(subDivField, [], { placeholder: 'Subdivisao', allowFiltering: true });

  const filtersRow = new Container(
    [searchInput, perfilCombo, catCombo, deptCombo, subDivCombo],
    { class: 'admin-filters-row' }
  );

  function employeeToRow(emp) {
    const role = deriveRoles(emp)[0];
    const isOverride = emp.AppRole && emp.AppRole !== '';
    return [
      emp.ShortName || emp.FullName,
      isOverride ? `${role} (manual)` : role,
      emp.Category,
      emp.DeptName,
      emp.SubDivName || '',
      emp.ManagerName || '(raiz)',
    ];
  }

  function buildFilterOptions(values) {
    const unique = [...new Set(values.filter(Boolean))].sort();
    return [{ label: 'Todos', value: '' }, ...unique.map(v => ({ label: v, value: v }))];
  }

  function populateFilterOptions(employees) {
    perfilCombo.dataset = buildFilterOptions(employees.map(e => deriveRoles(e)[0]));
    catCombo.dataset = buildFilterOptions(employees.map(e => e.Category));
    deptCombo.dataset = buildFilterOptions(employees.map(e => e.DeptName));
    subDivCombo.dataset = buildFilterOptions(employees.map(e => e.SubDivName));
  }

  function applyDadosFilter() {
    const query = searchField.value.toLowerCase().trim();
    const perfilVal = perfilField.value ? perfilField.value.value : '';
    const catVal = catField.value ? catField.value.value : '';
    const deptVal = deptField.value ? deptField.value.value : '';
    const subDivVal = subDivField.value ? subDivField.value.value : '';

    let filtered = allEmployeeRows;

    if (query) {
      filtered = filtered.filter(emp => {
        const name = (emp.ShortName || emp.FullName || '').toLowerCase();
        const fullName = (emp.FullName || '').toLowerCase();
        return name.includes(query) || fullName.includes(query);
      });
    }
    if (perfilVal) filtered = filtered.filter(emp => deriveRoles(emp)[0] === perfilVal);
    if (catVal) filtered = filtered.filter(emp => emp.Category === catVal);
    if (deptVal) filtered = filtered.filter(emp => emp.DeptName === deptVal);
    if (subDivVal) filtered = filtered.filter(emp => emp.SubDivName === subDivVal);

    displayedEmployees = filtered;
    dadosList.data = filtered.map(employeeToRow);
    dadosCountText.children = [filtered.length === allEmployeeRows.length
      ? `${allEmployeeRows.length} colaboradores`
      : `${filtered.length} de ${allEmployeeRows.length} colaboradores`];
  }

  searchField.subscribe(applyDadosFilter);
  perfilField.subscribe(applyDadosFilter);
  catField.subscribe(applyDadosFilter);
  deptField.subscribe(applyDadosFilter);
  subDivField.subscribe(applyDadosFilter);

  function showRoleDialog(employeeId) {
    const emp = allEmployeeRows.find(e => e.Title === employeeId);
    if (!emp) return;

    const currentRole = deriveRoles(emp)[0];
    const currentAppRole = emp.AppRole || '';

    const roleField = new FormField(
      APP_ROLE_OPTIONS.find(o => o.value === currentAppRole) || APP_ROLE_OPTIONS[0]
    );
    const roleCombo = new ComboBox(roleField, APP_ROLE_OPTIONS, {
      placeholder: 'Selecionar perfil...',
      allowFiltering: false,
    });

    const cancelBtn = new Button('Cancelar', {
      variant: 'secondary',
      onClickHandler: () => { roleDialog.close(); roleDialog.remove(); },
    });

    const saveBtn = new Button('Guardar', {
      onClickHandler: async () => {
        const selected = roleField.value;
        const newAppRole = selected ? selected.value : '';

        if (newAppRole === currentAppRole) {
          roleDialog.close();
          roleDialog.remove();
          return;
        }

        saveBtn.isLoading = true;
        const loading = Toast.loading('A actualizar perfil...');
        try {
          await updateEmployeeRole(employeeId, newAppRole);
          loading.success('Perfil actualizado com sucesso.');
          roleDialog.close();
          roleDialog.remove();
          invalidateCache();
          await loadDadosTab();
        } catch (err) {
          loading.error('Erro ao actualizar perfil.');
        } finally {
          saveBtn.isLoading = false;
        }
      },
    });

    const roleDialog = new Dialog({
      title: 'Alterar Perfil',
      content: new Container([
        new Text(`${emp.ShortName || emp.FullName}`, { type: 'p' }),
        new Text(`Perfil actual: ${currentRole}${currentAppRole ? ' (manual)' : ''}`, { type: 'p' }),
        roleCombo,
      ], { class: 'admin-role-dialog__content' }),
      footer: [cancelBtn, saveBtn],
      variant: 'default',
      closeOnFocusLoss: true,
      containerSelector: 'body',
    });

    roleDialog.render();
    roleDialog.open();
  }

  async function loadDadosTab() {
    if (dadosLoaded && !cacheStale) return;
    dadosView.children = [new Loader([], {})];
    try {
      allEmployeeRows = await getEmployees();
      searchField.value = '';
      perfilField.value = null;
      catField.value = null;
      deptField.value = null;
      subDivField.value = null;
      populateFilterOptions(allEmployeeRows);
      applyDadosFilter();
      dadosView.children = [filtersRow, dadosCountText, dadosList];
      dadosLoaded = true;
    } catch (err) {
      dadosView.children = [new Text('Erro ao carregar dados.', { type: 'p' })];
    }
  }

  // -- Tab 3: Hierarquia (Org Tree with AccordionItems) --

  function buildChildrenMap(employees) {
    const map = new Map();
    for (const emp of employees) {
      const key = emp.ManagerId || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(emp);
    }
    return map;
  }

  function buildTreeNode(emp, childrenMap) {
    const reports = childrenMap.get(emp.Title) || [];
    const label = `${emp.ShortName || emp.FullName} -- ${emp.Category}`;

    if (reports.length === 0) {
      return new Container([
        new Text(label, { type: 'span', class: 'admin-tree-name' }),
        new Text(emp.DeptName, { type: 'span', class: 'admin-tree-dept' }),
      ], { class: 'admin-tree-leaf' });
    }

    const childNodes = reports.map(r => buildTreeNode(r, childrenMap));
    return new AccordionItem(
      `${label} [${reports.length}]`,
      new Container(childNodes, { class: 'admin-tree-children' }),
      { isInitialOpen: parseInt(emp.Depth, 10) < 2 }
    );
  }

  async function loadHierarquiaTab() {
    if (hierarquiaLoaded && !cacheStale) return;
    hierarquiaView.children = [new Loader([], {})];
    try {
      const employees = await getEmployees();
      if (employees.length === 0) {
        hierarquiaView.children = [
          new Text('Sem dados. Importe um ficheiro CSV no separador Importar.', {
            type: 'p',
            class: 'pace-empty',
          }),
        ];
        hierarquiaLoaded = true;
        return;
      }
      const childrenMap = buildChildrenMap(employees);
      const root = employees.find(e => !e.ManagerId);
      if (!root) {
        hierarquiaView.children = [
          new Text('Raiz da hierarquia nao encontrada.', { type: 'p' }),
        ];
        return;
      }
      const deptCount = new Set(employees.map(e => e.DeptCode).filter(Boolean)).size;
      hierarquiaView.children = [
        new Text(`${employees.length} colaboradores em ${deptCount} departamentos`, {
          type: 'p',
          class: 'pace-filter-count',
        }),
        buildTreeNode(root, childrenMap),
      ];
      hierarquiaLoaded = true;
    } catch (err) {
      hierarquiaView.children = [
        new Text('Erro ao carregar hierarquia.', { type: 'p' }),
      ];
    }
  }

  // -- Tab assembly --

  const tabs = new TabGroup([
    { key: 'importar', label: 'Importar', view: importView },
    { key: 'dados', label: 'Dados', view: dadosView },
    { key: 'hierarquia', label: 'Hierarquia', view: hierarquiaView },
  ], {
    selectedTabKey: 'importar',
    onTabChangeHandler: (tabConfig) => {
      if (tabConfig.key === 'dados') loadDadosTab();
      if (tabConfig.key === 'hierarquia') loadHierarquiaTab();
    },
  });

  // -- init --

  async function initialize() {
    await refreshStats();
    showReadyState();
  }

  initialize();

  return createPageLayout([tabs]);
});
