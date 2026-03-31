import {
  Text,
  Container,
  Button,
  LinkButton,
  Toast,
  ContextStore,
  defineRoute,
  __dayjs,
} from '../libs/nofbiz/nofbiz.base.js';

import { getRecentForUser } from '../utils/notifications-api.js';
import { openNewInitiativeModal } from '../utils/new-initiative.js';
import { createPageLayout } from '../utils/navbar.js';

export default defineRoute(async (config) => {
  config.setRouteTitle('Inicio');

  const user = ContextStore.get('currentUser');
  const displayName = user.get('displayName') || 'Colaborador';
  const firstName = displayName.split(' ')[0];

  // -- Fetch recent notifications --
  let recentNotifications = [];
  try {
    recentNotifications = await getRecentForUser(user.get('email'), 14);
  } catch (error) {
    Toast.error('Erro ao carregar notificacoes.');
  }

  // Sort by date descending
  recentNotifications.sort((a, b) => (b.CreatedDate || '').localeCompare(a.CreatedDate || ''));

  // -- Hero welcome banner --
  const newInitiativeBtn = new Button('+ Nova Iniciativa', {
    variant: 'primary',
    onClickHandler: () => {
      openNewInitiativeModal(() => {
        Toast.success('Iniciativa criada. A pagina sera actualizada.');
      });
    },
  });

  const hero = new Container([
    new Container([
      new Text('PLACE - CETELEM PORTUGAL', { type: 'span', class: 'pace-hero-badge' }),
      new Text(`Ola, ${firstName}`, { type: 'h1' }),
      new Text('Bem-vindo a plataforma de melhoria continua. Submeta ideias, acompanhe o progresso e quantifique o impacto das suas iniciativas PDCA.', { type: 'p' }),
      new Container([
        newInitiativeBtn,
        new LinkButton('Ver as minhas iniciativas', 'pessoal', { variant: 'secondary', class: 'pace-hero-link-btn' }),
      ], { class: 'pace-hero__actions' }),
    ], { class: 'pace-hero__content' }),
  ], { class: 'pace-hero' });

  // -- Notifications (already date-filtered by CAML) --
  const formatRelativeTime = (dateStr) => {
    const days = __dayjs().diff(__dayjs(dateStr), 'day');
    if (days === 0) return 'hoje';
    if (days === 1) return 'ha 1 dia';
    if (days < 7) return `ha ${days} dias`;
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'ha 1 semana' : `ha ${weeks} semanas`;
  };

  const notifItems = recentNotifications.map((n) => {
    return new Container([
      new Container([], { class: 'pace-notif-icon' }),
      new Container([
        new Text(n.Title, { type: 'span' }),
        new Text(formatRelativeTime(n.CreatedDate), { type: 'span', class: 'pace-notif-date' }),
      ]),
    ], { class: 'pace-notif-item' });
  });

  const emptyNotif = recentNotifications.length === 0
    ? [new Text('Sem notificacoes recentes.', { type: 'p', class: 'pace-empty-msg' })]
    : [];

  const notificationsSection = new Container([
    new Text('Notificacoes (ultimas 2 semanas)', { type: 'h3', class: 'pace-sec-title pace-sec-title--plain' }),
    new Container([...notifItems, ...emptyNotif], { as: 'div', class: 'pace-notif-list' }),
  ], { class: 'pace-home-notifications' });

  const twoColGrid = new Container([
    notificationsSection,
  ], { class: 'pace-home-grid' });

  return createPageLayout([hero, twoColGrid]);
});
