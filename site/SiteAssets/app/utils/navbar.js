import { Container, Text, Button, LinkButton, ContextStore, Toast } from '../libs/nofbiz/nofbiz.base.js';
import { openNewInitiativeModal } from './new-initiative.js';
import { canAccess } from './roles.js';

const HEADER_ROUTES = ['instrucoes'];

const TAB_LABELS = {
  inicio: 'Inicio',
  instrucoes: 'Instrucoes',
  pessoal: 'Pessoal',
  equipa: 'Equipa',
  mentoria: 'Mentoria',
  gestor: 'Gestor',
  catalogo: 'Catalogo',
  dashboard: 'Dashboard',
  admin: 'Configuracao',
};

function createHeader() {
  const user = ContextStore.get('currentUser');
  const userRoles = ContextStore.get('userRoles') || ['colaborador'];
  const displayName = user.get('displayName');
  const rawRole = userRoles[0] || 'colaborador';
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  const roleLabel = ContextStore.has('isBootstrapMode')
    ? `${role} (Bootstrap)` : role;

  return new Container([
    new Container([
      new Text('Place', { type: 'span', class: 'pace-header__logo' }),
      new Text('Plataforma de PDCAs . Cetelem Portugal', { type: 'span', class: 'pace-header__subtitle' }),
    ], { class: 'pace-header__left' }),
    new Container([
      ...(canAccess('pessoal') ? [new Button('+ Nova Iniciativa', {
        class: 'pace-header__new-btn',
        onClickHandler: () => {
          openNewInitiativeModal(() => {
            Toast.success('Iniciativa criada. A pagina sera actualizada.');
          });
        },
      })] : []),
      new LinkButton('Ajuda', 'instrucoes', { class: 'pace-header__info-btn' }),
      new Container([
        new Text(displayName, { type: 'span', class: 'pace-header__user-name' }),
        new Text(roleLabel, { type: 'span', class: 'pace-header__user-role' }),
      ], { class: 'pace-header__user' }),
    ], { class: 'pace-header__right' }),
  ], { as: 'header', class: 'pace-header' });
}

function createTabBar() {
  const routes = ContextStore.get('routes');
  const allTabs = ['inicio', ...routes].filter((key) => !HEADER_ROUTES.includes(key) && key !== 'dashboard');

  const tabLinks = allTabs.map((key) => {
const path = key === 'inicio' ? '/' : key;
    return new LinkButton(TAB_LABELS[key], path, {
      class: `pace-tabs__tab pace-tab-${key}`,
    });
  });

  return new Container(tabLinks, { as: 'nav', class: 'pace-tabs' });
}

export function createPageLayout(content) {
  return [
    createHeader(),
    createTabBar(),
    new Container(content, { as: 'main', class: 'pace-content' }),
  ];
}
