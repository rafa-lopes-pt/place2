import {
  Text,
  Container,
  Button,
  Toast,
  ContextStore,
  AccordionItem,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
import { getByStatusesAndGestor, getByUUIDs } from '../../utils/initiatives-api.js';
import { getSharedWithMe } from '../../utils/shared-api.js';
import {
  STATUS,
  statusDescription,
} from '../../utils/status-helpers.js';
import {
  ownerName,
  mentorName,
  buildKpi,
  buildTableHeader,
} from '../../utils/format-helpers.js';
import { createPageLayout } from '../../utils/navbar.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';

export default defineRoute((config) => {
  config.setRouteTitle('Gestor');

  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');

  // -- state --

  let gestorPendentes = [];
  let gestorTracking = [];
  let sharedRecords = [];

  // -- layout containers --

  const ctaBanner = new Container([], { class: 'pace-cta' });
  const kpiRow = new Container([], { class: 'pace-kpi-row' });
  const trackingSection = new Container([], { class: 'pace-tracking-section' });
  const pendingSection = new Container([], { class: 'pace-pending-section' });
  const collabSection = new Container([], { class: 'pace-collab-section' });

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar iniciativas...');
    try {
      const [allGestorItems, sharedResult] = await Promise.all([
        getByStatusesAndGestor([
          STATUS.EM_EXECUCAO,
          STATUS.POR_VALIDAR,
          STATUS.VALIDADO_GESTOR,
          STATUS.VALIDADO_FINAL,
          STATUS.IMPLEMENTADO,
        ], currentEmail),
        getSharedWithMe(currentEmail),
      ]);
      gestorPendentes = allGestorItems.filter(i => i.Status === STATUS.POR_VALIDAR);
      gestorTracking = allGestorItems.filter(i => i.Status !== STATUS.POR_VALIDAR);
      sharedRecords = sharedResult;
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar iniciativas');
    }
  }

  // -- build UI --

  async function buildUI() {
    // CTA banner
    ctaBanner.children = [
      new Container(
        [
          new Text(`${gestorPendentes.length} savings aguardam validacao`, {
            type: 'span',
            class: 'pace-cta-text',
          }),
          new Text('Valide os savings declarados pelas equipas e acompanhe as iniciativas em curso.', {
            type: 'p',
            class: 'pace-cta-text',
          }),
        ],
        { as: 'div' }
      ),
      new Button('Validar', {
        variant: 'primary',
        onClickHandler: () => {
          if (pendingSection.isAlive && pendingSection.instance) {
            pendingSection.instance[0].scrollIntoView({ behavior: 'smooth' });
          }
        },
      }),
    ];

    // KPIs
    kpiRow.children = [
      buildKpi(String(gestorPendentes.length), 'Por Validar'),
      buildKpi(String(gestorTracking.length), 'Em Acompanhamento'),
    ];

    // Tracking table
    if (gestorTracking.length > 0) {
      const trackingRows = gestorTracking.map((item) => new Container(
        [
          new Container([
            new Button(item.Title || '-', {
              variant: 'secondary',
              isOutlined: true,
              onClickHandler: () => openInitiativeDetail(item, 'gestor', loadData, { canAct: false }),
              class: 'pace-table-link-btn',
            }),
            ...(item.Description ? [new Text(item.Description, { type: 'p', class: 'pace-table-description' })] : []),
          ], { class: 'pace-table-cell-stack' }),
          new Text(statusDescription(item.Status), { type: 'span' }),
          new Text(ownerName(item), { type: 'span' }),
          new Text(mentorName(item), { type: 'span' }),
        ],
        { class: 'pace-table-row' }
      ));
      trackingSection.children = new Container(
        [
          new Text('Iniciativas em Acompanhamento', { type: 'h2', class: 'pace-sec-title' }),
          new Container(
            [buildTableHeader(['Iniciativa', 'Estado', 'Proprietario', 'Mentor']), ...trackingRows],
            { class: 'pace-table-wrap pace-table--gestor' }
          ),
        ]
      );
    } else {
      trackingSection.children = [];
    }

    pendingSection.children = [
      new Text('Savings Por Validar', { type: 'h2', class: 'pace-sec-title' }),
      ...(gestorPendentes.length > 0
        ? gestorPendentes.map((item) => buildPendingItem(item))
        : [new Text('Sem savings pendentes.', { type: 'p', class: 'pace-empty' })]),
    ];

    // Colaboracoes Recebidas -- all shared initiatives, read-only
    const sharedByMap = new Map(sharedRecords.map((r) => [r.InitiativeUUID, r]));
    const allSharedUUIDs = sharedRecords.map((r) => r.InitiativeUUID);

    if (allSharedUUIDs.length > 0) {
      const assignedUUIDs = new Set([
        ...gestorPendentes.map((i) => i.UUID),
        ...gestorTracking.map((i) => i.UUID),
      ]);
      let sharedInitiatives = [];
      try {
        sharedInitiatives = await getByUUIDs(allSharedUUIDs);
      } catch (_) { /* non-critical */ }

      const uniqueShared = sharedInitiatives.filter((i) => !assignedUUIDs.has(i.UUID));

      if (uniqueShared.length > 0) {
        const sharedRows = uniqueShared.map((item) => {
          const sharedByName = sharedByMap.get(item.UUID)?.SharedBy?.displayName || '-';
          return new Container([
            new Button(item.Title || '-', {
              variant: 'secondary',
              onClickHandler: () => openInitiativeDetail(item, 'gestor', loadData, { canAct: false }),
              class: 'pace-table-link-btn',
            }),
            new Text(statusDescription(item.Status), { type: 'span' }),
            new Text(sharedByName, { type: 'span' }),
          ], { class: 'pace-table-row' });
        });

        const sharedTable = new Container(
          [buildTableHeader(['Iniciativa', 'Estado', 'Partilhado por']), ...sharedRows],
          { class: 'pace-table-wrap pace-table--gestor' }
        );

        collabSection.children = [new AccordionItem('Colaboracoes Recebidas', [sharedTable])];
      } else {
        collabSection.children = [];
      }
    } else {
      collabSection.children = [];
    }
  }

  function buildPendingItem(item, canAct = true, sharedByName = '') {
    const label = canAct ? 'Aprovar' : 'Ver';

    const metaChildren = [
      new Text(item.Title, {
        type: 'span',
        class: 'pace-pending-item-title',
      }),
      new Text(
        `${ownerName(item)} | ${item.ImpactedTeamOUID}`,
        { type: 'span', class: 'pace-pending-item-meta' }
      ),
    ];

    if (sharedByName) {
      metaChildren.push(
        new Text(`Partilhado por: ${sharedByName}`, {
          type: 'span',
          class: 'pace-pending-item-meta',
        })
      );
    }

    return new Container(
      [
        new Container(metaChildren, { as: 'div' }),
        new Button(label, {
          variant: 'secondary',
          onClickHandler: () => openInitiativeDetail(item, 'gestor', loadData, { canAct }),
        }),
      ],
      { class: 'pace-pending-item' }
    );
  }

  // -- init --

  loadData();

  return createPageLayout([ctaBanner, kpiRow, pendingSection, trackingSection, collabSection]);
});
