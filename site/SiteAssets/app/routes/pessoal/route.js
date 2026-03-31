import {
  Text,
  Container,
  Button,
  Toast,
  ContextStore,
  defineRoute,
  __dayjs,
  AccordionItem,
} from '../../libs/nofbiz/nofbiz.base.js';

import { getPersonalAndShared } from '../../utils/initiatives-api.js';
import { getSharedWithMe } from '../../utils/shared-api.js';
import { STATUS, statusLabel, statusDescription } from '../../utils/status-helpers.js';
import { openNewInitiativeModal } from '../../utils/new-initiative.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';
import { openRevisionReviewModal } from '../../utils/revision-review-modal.js';
import { createPageLayout } from '../../utils/navbar.js';
import { buildTableHeader, mentorName, gestorName, buildKpi } from '../../utils/format-helpers.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Pessoal');

  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');

  const content = new Container([]);

  // -- Helper: Build a pending item card --
  const buildPendingItem = (item, actionLabel) => {
    const daysSince = __dayjs().diff(__dayjs(item.Modified || item.Created), 'day');
    const urgent = daysSince > 7;
    const itemClass = urgent ? 'pace-pending-item pace-pending-item--urgent' : 'pace-pending-item';

    const meta = [item.ImpactedTeamOUID || '', statusLabel(item.Status)];

    const container = new Container([
      new Container([
        new Text(item.Title || 'Sem titulo', { type: 'span', class: 'pace-pending-item-title' }),
      ]),
      new Text(meta.join(' | '), { type: 'p', class: 'pace-pending-item-meta' }),
      new Container([
        new Text(`${daysSince} dia${daysSince !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-pending-item-meta' }),
        new Button(actionLabel, {
          variant: 'secondary',
          onClickHandler: (e) => {
            e.stopPropagation();
            openInitiativeDetail(item, 'pessoal', loadData);
          },
        }),
      ], { class: 'pace-pending-item-actions' }),
    ], { class: itemClass });

    container.setEventHandler('click', () => openInitiativeDetail(item, 'pessoal', loadData));
    return container;
  };

  async function loadData() {
    // -- Fetch shared records first to get UUIDs --
    let sharedRecords = [];
    try {
      sharedRecords = await getSharedWithMe(currentEmail);
    } catch (error) {
      // Non-critical, continue without shared items
    }

    // -- Single combined query for personal + shared initiatives --
    let allResults = [];
    const sharedUUIDs = sharedRecords.map((r) => r.InitiativeUUID);
    try {
      allResults = await getPersonalAndShared(currentEmail, sharedUUIDs);
    } catch (error) {
      Toast.error('Erro ao carregar iniciativas pessoais.');
    }

    // -- Partition into personal vs shared --
    const personalItems = [];
    const sharedItems = [];
    const sharedUUIDSet = new Set(sharedUUIDs);
    for (const item of allResults) {
      if (item.SubmittedByEmail === currentEmail) {
        personalItems.push(item);
      }
      if (sharedUUIDSet.has(item.UUID)) {
        sharedItems.push(item);
      }
    }

    // -- Merge and deduplicate --
    const seenUUIDs = new Set(personalItems.map((i) => i.UUID));
    const allMyItems = [...personalItems];
    for (const item of sharedItems) {
      if (!seenUUIDs.has(item.UUID)) {
        allMyItems.push(item);
        seenUUIDs.add(item.UUID);
      }
    }

    // -- Categorize personal items --
    const drafts = allMyItems.filter((item) => item.Status === STATUS.RASCUNHO);
    const pendingValidation = allMyItems.filter((item) =>
      item.Status === STATUS.SUBMETIDO || item.Status === STATUS.POR_VALIDAR
    );
    const revisionItems = allMyItems.filter((item) => item.Status === STATUS.EM_REVISAO);
    const activeStatuses = [STATUS.EM_EXECUCAO, STATUS.POR_VALIDAR, STATUS.VALIDADO_GESTOR, STATUS.VALIDADO_MENTOR, STATUS.VALIDADO_FINAL];
    const activeItems = allMyItems.filter((item) => activeStatuses.includes(item.Status));

    // -- KPI row: 3 summary metrics --
    const submitted = allMyItems.filter((i) => i.Status !== STATUS.RASCUNHO).length;
    const inProgress = allMyItems.filter((i) =>
      [STATUS.SUBMETIDO, STATUS.VALIDADO_MENTOR, STATUS.EM_EXECUCAO, STATUS.POR_VALIDAR,
       STATUS.VALIDADO_GESTOR, STATUS.VALIDADO_FINAL, STATUS.EM_REVISAO].includes(i.Status)
    ).length;
    const implemented = allMyItems.filter((i) => i.Status === STATUS.IMPLEMENTADO).length;

    const kpiRow = new Container([
      buildKpi(String(submitted), 'Submetidas'),
      buildKpi(String(inProgress), 'Em Curso'),
      buildKpi(String(implemented), 'Implementadas'),
    ], { class: 'pace-kpi-row pace-kpi-row--compact' });

    const components = [kpiRow];

    // Em Curso -- unchanged, not an accordion (exception per spec)
    if (activeItems.length > 0) {
      const activeRows = activeItems.map((item) =>
        new Container([
          new Container([
            new Button(item.Title || '-', {
              variant: 'secondary',
              onClickHandler: () => openInitiativeDetail(item, 'pessoal', loadData),
              class: 'pace-table-link-btn',
            }),
            ...(item.Description ? [new Text(item.Description, { type: 'p', class: 'pace-table-description' })] : []),
          ], { class: 'pace-table-cell-stack' }),
          new Text(statusDescription(item.Status), { type: 'span' }),
          new Text(mentorName(item), { type: 'span' }),
          new Text(gestorName(item), { type: 'span' }),
        ], { class: 'pace-table-row' })
      );

      const activeTable = new Container(
        [buildTableHeader(['Iniciativa', 'Estado', 'Mentor', 'Gestor']), ...activeRows],
        { class: 'pace-table-wrap pace-table--pessoal' }
      );

      components.push(new Container([
        new Text('Em Curso', { type: 'h2', class: 'pace-sec-title' }),
        activeTable,
      ]));
    }

    // Colaboracoes Recebidas -- accordion, hidden when empty
    if (sharedItems.length > 0) {
      const sharedByMap = new Map(sharedRecords.map((r) => [r.InitiativeUUID, r]));
      const sharedRows = sharedItems.map((item) => {
        const sharedByName = sharedByMap.get(item.UUID)?.SharedBy?.displayName || '-';
        return new Container([
          new Button(item.Title || '-', {
            variant: 'secondary',
            onClickHandler: () => openInitiativeDetail(item, 'pessoal', loadData),
            class: 'pace-table-link-btn',
          }),
          new Text(statusDescription(item.Status), { type: 'span' }),
          new Text(sharedByName, { type: 'span' }),
        ], { class: 'pace-table-row' });
      });

      const sharedTable = new Container(
        [buildTableHeader(['Iniciativa', 'Estado', 'Partilhado por']), ...sharedRows],
        { class: 'pace-table-wrap pace-table--pessoal' }
      );

      components.push(new AccordionItem('Colaboracoes Recebidas', [sharedTable]));
    }

    // Em Revisao -- accordion, hidden when empty
    if (revisionItems.length > 0) {
      const revCards = revisionItems.map((item) => {
        const daysSince = __dayjs().diff(__dayjs(item.Modified || item.Created), 'day');
        const urgent = daysSince > 7;
        const itemClass = urgent
          ? 'pace-pending-item pace-pending-item--urgent pace-revision-item'
          : 'pace-pending-item pace-revision-item';

        const container = new Container([
          new Container([
            new Text(item.Title || 'Sem titulo', { type: 'span', class: 'pace-pending-item-title' }),
          ]),
          new Text('Revisao solicitada pelo mentor/gestor.', { type: 'p', class: 'pace-pending-item-meta' }),
          new Container([
            new Text(`${daysSince} dia${daysSince !== 1 ? 's' : ''}`, { type: 'span', class: 'pace-pending-item-meta' }),
            new Button('Rever', {
              variant: 'secondary',
              onClickHandler: (e) => {
                e.stopPropagation();
                openRevisionReviewModal(item, loadData);
              },
            }),
          ], { class: 'pace-pending-item-actions' }),
        ], { class: itemClass });

        container.setEventHandler('click', () => openInitiativeDetail(item, 'pessoal', loadData));
        return container;
      });

      components.push(new AccordionItem('Em Revisao', revCards));
    }

    // A Aguardar Validacao -- accordion, hidden when empty
    if (pendingValidation.length > 0) {
      const pendingCards = pendingValidation.map((item) => buildPendingItem(item, 'Ver'));
      components.push(new AccordionItem('A Aguardar Validacao', pendingCards));
    }

    // Rascunhos -- accordion, hidden when empty
    if (drafts.length > 0) {
      const draftCards = drafts.map((item) => buildPendingItem(item, 'Editar'));
      components.push(new AccordionItem('Rascunhos', draftCards));
    }

    content.children = components;
  }

  await loadData();

  return createPageLayout([content]);
});
