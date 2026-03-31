import {
  Text,
  Container,
  Button,
  Toast,
  ContextStore,
  UserIdentity,
  defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
import { getUnassignedByStatuses, getByStatusesAndMentor, getByUUIDs } from '../../utils/initiatives-api.js';
import { getSharedWithMe } from '../../utils/shared-api.js';
import {
  STATUS,
  statusDescription,
} from '../../utils/status-helpers.js';
import {
  ownerName,
  mentorName,
  gestorName,
  daysPending,
  buildKpi,
  buildTableHeader,
} from '../../utils/format-helpers.js';
import { createPageLayout } from '../../utils/navbar.js';
import { openInitiativeDetail } from '../../utils/side-panel-detail.js';

export default defineRoute((config) => {
  config.setRouteTitle('Mentoria');

  const user = ContextStore.get('currentUser');
  const currentEmail = user.get('email');

  // -- state --

  let projectItems = [];
  let myValidadoGestor = [];
  let sharedRecords = [];
  let myTrackingItems = [];

  // -- layout containers (populated after data load) --

  const ctaBanner = new Container(
    [
      new Text('Mentoria', { type: 'h2', class: 'pace-cta-title' }),
      new Text(
        'Acompanhe as iniciativas da sua equipa, valide projectos submetidos e confirme savings implementados.',
        { type: 'p' }
      ),
    ],
    { class: 'pace-cta' }
  );
  const kpiRow = new Container([], { class: 'pace-kpi-row pace-kpi-row--spread' });
  const trackingSection = new Container([], { class: 'pace-tracking-section' });
  const validationGrid = new Container([], { class: 'pace-validation-grid' });
  const collabSection = new Container([], { class: 'pace-collab-section' });

  // -- data loading --

  async function loadData() {
    const loading = Toast.loading('A carregar iniciativas...');
    try {
      const [unassigned, myItems, shared] = await Promise.all([
        getUnassignedByStatuses([STATUS.SUBMETIDO]),
        getByStatusesAndMentor(
          [STATUS.SUBMETIDO, STATUS.VALIDADO_MENTOR, STATUS.EM_EXECUCAO, STATUS.POR_VALIDAR, STATUS.VALIDADO_GESTOR, STATUS.VALIDADO_FINAL],
          currentEmail
        ),
        getSharedWithMe(currentEmail),
      ]);
      const mySubmetidos = myItems.filter(i => i.Status === STATUS.SUBMETIDO);
      projectItems = [...unassigned, ...mySubmetidos];
      myValidadoGestor = myItems.filter(i => i.Status === STATUS.VALIDADO_GESTOR);
      myTrackingItems = myItems.filter(i =>
        i.Status === STATUS.VALIDADO_MENTOR ||
        i.Status === STATUS.EM_EXECUCAO ||
        i.Status === STATUS.POR_VALIDAR ||
        i.Status === STATUS.VALIDADO_GESTOR ||
        i.Status === STATUS.VALIDADO_FINAL
      );
      sharedRecords = shared;
      loading.dismiss();
      buildUI();
    } catch (error) {
      loading.error('Erro ao carregar iniciativas');
    }
  }

  // -- build UI after data load --

  function buildUI() {
    // KPIs
    kpiRow.children = [
      buildKpi(String(projectItems.length), 'Validacao Projecto'),
      buildKpi(String(myValidadoGestor.length), 'Confirmacao Final'),
      buildKpi(String(myTrackingItems.length), 'Em Acompanhamento'),
    ];

    // Tracking table
    if (myTrackingItems.length > 0) {
      const trackingRows = myTrackingItems.map((item) =>
        new Container([
          new Container([
            new Button(item.Title || '-', {
              variant: 'secondary',
              onClickHandler: () => openInitiativeDetail(item, 'mentoria', loadData),
              class: 'pace-table-link-btn',
            }),
          ], { class: 'pace-table-cell-stack' }),
          new Text(statusDescription(item.Status), { type: 'span' }),
          new Text(ownerName(item), { type: 'span' }),
          new Text(gestorName(item), { type: 'span' }),
        ], { class: 'pace-table-row' })
      );

      trackingSection.children = [
        new Text('Acompanhamento das minhas Iniciativas', { type: 'h2', class: 'pace-sec-title' }),
        new Container(
          [buildTableHeader(['Iniciativa', 'Estado', 'Proprietario', 'Gestor']), ...trackingRows],
          { class: 'pace-table-wrap pace-table--mentoria' }
        ),
      ];
    } else {
      trackingSection.children = [];
    }

    // Validation columns -- 2 columns
    validationGrid.children = [
      new Container(
        [
          new Text('Validacao de Projecto', { type: 'h3' }),
          ...projectItems.map((item) => buildPendingItem(item, 'projecto')),
          ...(projectItems.length === 0
            ? [new Text('Sem iniciativas pendentes de validacao.', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--project' }
      ),
      new Container(
        [
          new Text('Confirmacao Final', { type: 'h3' }),
          ...myValidadoGestor.map((item) => buildPendingItem(item, 'savings')),
          ...(myValidadoGestor.length === 0
            ? [new Text('Sem iniciativas pendentes de confirmacao final.', { type: 'p', class: 'pace-empty' })]
            : []),
        ],
        { class: 'pace-validation-col pace-validation-col--savings' }
      ),
    ];

    // Colaboracoes section -- fetch shared initiative data
    if (sharedRecords.length > 0) {
      const sharedUUIDs = sharedRecords.map(r => r.InitiativeUUID);
      const sharedByMap = new Map();
      for (const rec of sharedRecords) {
        sharedByMap.set(rec.InitiativeUUID, {
          sharedBy: rec.SharedBy,
          type: rec.Type,
        });
      }
      getByUUIDs(sharedUUIDs).then(sharedItems => {
        collabSection.children = [
          new Text('Colaboracoes Recebidas', { type: 'h3' }),
          ...sharedItems.map((item) => {
            const shared = sharedByMap.get(item.UUID);
            const isCollab = shared?.type === 'collaborate';
            const sharedByIdentity = UserIdentity.fromField(shared?.sharedBy);
            const sharedByName = sharedByIdentity ? sharedByIdentity.displayName : '';
            return buildPendingItem(item, item.Status === STATUS.SUBMETIDO ? 'projecto' : 'savings', isCollab, sharedByName);
          }),
        ];
      }).catch(() => {});
    } else {
      collabSection.children = [];
    }
  }

  function buildPendingItem(item, type, canAct = true, sharedByName = '') {
    const days = daysPending(item.Modified || item.Created);
    const urgent = days > 5;
    const cls = urgent
      ? 'pace-pending-item pace-pending-item--urgent'
      : 'pace-pending-item';

    const mentor = mentorName(item);
    const metaParts = [ownerName(item), item.ImpactedTeamOUID];
    if (type === 'projecto' && mentor !== '---') {
      metaParts.push(`Mentor: ${mentor}`);
    } else if (type === 'savings') {
      metaParts.push(`Gestor: ${gestorName(item)}`);
    }
    const metaText = metaParts.join(' | ');

    const rightInfo = `${days}d pendente`;

    const actionLabel = !canAct ? 'Ver'
      : item.Status === STATUS.SUBMETIDO ? 'Validar'
      : item.Status === STATUS.VALIDADO_GESTOR ? 'Confirmar'
      : 'Ver';

    const metaChildren = [
      new Text(item.Title, {
        type: 'span',
        class: 'pace-pending-item-title',
      }),
      new Text(metaText, {
        type: 'span',
        class: 'pace-pending-item-meta',
      }),
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
        new Container(
          [
            new Text(rightInfo, { type: 'span', class: 'pace-pending-item-meta' }),
            new Button(actionLabel, {
              variant: 'secondary',
              onClickHandler: () => openInitiativeDetail(item, 'mentoria', loadData, { canAct }),
            }),
          ],
          { class: 'pace-pending-item-actions' }
        ),
      ],
      { class: cls }
    );
  }

  // -- init --

  loadData();

  return createPageLayout([ctaBanner, kpiRow, trackingSection, validationGrid, collabSection]);
});
