import {
  Text,
  Container,
  Button,
  AccordionGroup,
  AccordionItem,
  defineRoute,
  Router,
} from '../../libs/nofbiz/nofbiz.base.js';

import { openNewInitiativeModal } from '../../utils/new-initiative.js';
import { createPageLayout } from '../../utils/navbar.js';

export default defineRoute((config) => {
  config.setRouteTitle('Instrucoes');

  // -- Helpers (scoped inside defineRoute) --

  const buildProfileCard = (initial, title, subtitle, responsibilities, colorClass) => {
    const respItems = responsibilities.map((r) =>
      new Text(r, { type: 'p', class: 'pace-profile-resp' })
    );
    return new Container([
      new Container([new Text(initial, { type: 'span' })], { class: `pace-profile-avatar ${colorClass}` }),
      new Text(title, { type: 'h3', class: 'pace-profile-name' }),
      new Text(subtitle, { type: 'p', class: 'pace-profile-role' }),
      new Container(respItems, { class: 'pace-profile-resp-list' }),
    ], { class: 'pace-profile-card' });
  };

  const buildNumberedSteps = (steps) => {
    const items = steps.map((step, i) =>
      new Container([
        new Text(String(i + 1), { type: 'span', class: 'pace-step-num' }),
        new Text(step, { type: 'span', class: 'pace-step-text' }),
      ], { class: 'pace-step-item' })
    );
    return new Container(items, { class: 'pace-steps-list' });
  };

  // -- CTA Banner --
  const ctaBanner = new Container([
    new Container([
      new Text('Como funciona o Place', { type: 'h2' }),
      new Text('Conhece os perfis, as accoes disponiveis e o fluxo completo das iniciativas PDCA.', { type: 'p' }),
    ]),
    new Button('Submeter Agora', {
      variant: 'primary',
      onClickHandler: () => {
        openNewInitiativeModal(() => {
          Router.navigateTo('pessoal');
        });
      },
    }),
  ], { class: 'pace-cta' });

  // -- Profile cards --
  const profileCards = new Container([
    new Text('Perfis e Responsabilidades', { type: 'h2', class: 'pace-sec-title' }),
    new Container([
      buildProfileCard('C', 'Colaborador', 'Quem submete e acompanha', [
        'Submeter iniciativas PDCA',
        'Acompanhar o estado da iniciativa',
        'Editar rascunhos e re-submeter',
        'Declarar implementacao',
        'Cancelar iniciativas proprias',
      ], 'pace-profile--green'),
      buildProfileCard('M', 'Mentor', 'Quem valida e acompanha', [
        'Validar projectos submetidos',
        'Solicitar revisao ao colaborador',
        'Confirmar savings declarados',
        'Rejeitar iniciativas inadequadas',
        'Pedir parecer a outros mentores',
      ], 'pace-profile--dark-green'),
      buildProfileCard('G', 'Gestor', 'Quem aprova savings', [
        'Aprovar savings declarados',
        'Solicitar revisao quando necessario',
        'Rejeitar savings incorrectos',
        'Pedir parecer adicional',
        'Validar valores financeiros',
      ], 'pace-profile--darker-green'),
    ], { class: 'pace-profile-grid' }),
  ]);

  // -- Action guide data --
  const guides = [
    {
      title: '1. Submeter uma iniciativa',
      who: 'Colaborador',
      colorClass: 'pace-guide--green',
      steps: [
        'Clicar em "+ Nova Iniciativa" no ecra Inicio ou Pessoal.',
        'Preencher o titulo, equipa e descricao da iniciativa.',
        'Seleccionar o tipo de saving (se aplicavel) e o valor estimado.',
        'Clicar em "Submeter" para enviar para validacao do mentor.',
        'Tambem pode guardar como rascunho para completar mais tarde.',
      ],
      tip: 'Pode guardar como rascunho e voltar a editar antes de submeter.',
    },
    {
      title: '2. Editar um rascunho',
      who: 'Colaborador',
      colorClass: 'pace-guide--green',
      steps: [
        'Aceder ao ecra "Pessoal" e localizar o rascunho na seccao Rascunhos.',
        'Clicar em "Editar" no rascunho pretendido.',
        'Actualizar os campos necessarios.',
        'Guardar novamente como rascunho ou submeter directamente.',
      ],
      tip: 'Rascunhos nao sao visiveis para mentores ou gestores ate serem submetidos.',
    },
    {
      title: '3. Validar um projecto',
      who: 'Mentor',
      colorClass: 'pace-guide--dark-green',
      steps: [
        'Aceder ao ecra "Mentoria" para ver iniciativas pendentes.',
        'Clicar numa iniciativa para ver os detalhes completos.',
        'Avaliar se o projecto esta correctamente formulado e alinhado.',
        'Clicar em "Aprovar" para validar ou "Solicitar Revisao" para pedir alteracoes.',
        'Em caso de rejeicao, clicar em "Rejeitar" e indicar o motivo.',
      ],
      tip: 'Pode solicitar revisao com comentarios especificos para ajudar o colaborador.',
    },
    {
      title: '4. Aprovar savings',
      who: 'Gestor',
      colorClass: 'pace-guide--darker-green',
      steps: [
        'Aceder ao ecra "Gestor" para ver savings pendentes de validacao.',
        'Verificar o tipo de saving e o valor estimado.',
        'Confirmar se os valores estao correctos e devidamente justificados.',
        'Clicar em "Aprovar Savings" para validar.',
        'Se necessario, solicitar revisao ao colaborador.',
      ],
      tip: 'Savings >= 10.000 EUR ou Hard Savings sao encaminhados para o Gestor RF.',
    },
    {
      title: '5. Cancelar uma iniciativa',
      who: 'Colaborador',
      colorClass: 'pace-guide--green',
      steps: [
        'Aceder ao ecra "Pessoal" e localizar a iniciativa.',
        'Abrir o detalhe da iniciativa.',
        'Clicar em "Cancelar" nas accoes disponiveis.',
        'Confirmar o cancelamento na janela de dialogo.',
      ],
      tip: 'Iniciativas implementadas, rejeitadas ou ja canceladas nao podem ser canceladas novamente.',
    },
    {
      title: '6. Comentar uma iniciativa',
      who: 'Todos os perfis',
      colorClass: 'pace-guide--gray',
      steps: [
        'Abrir o detalhe de qualquer iniciativa.',
        'Navegar ate a seccao de comentarios.',
        'Escrever o comentario e clicar em enviar.',
        'O autor da iniciativa sera notificado.',
      ],
      tip: 'Comentarios sao visiveis para todos os participantes da iniciativa.',
    },
    {
      title: '7. Pedir colaboracao',
      who: 'Colaborador / RE / Mentor / Gestor',
      colorClass: 'pace-guide--green',
      steps: [
        'Abrir o detalhe da iniciativa.',
        'Clicar em "Pedir Colaboracao" no menu de accoes.',
        'Seleccionar o destinatario e escrever a mensagem.',
        'O destinatario recebera uma notificacao.',
      ],
      tip: 'Util para envolver colegas de outras equipas na resolucao do problema.',
    },
    {
      title: '8. Pedir parecer',
      who: 'Mentor / Gestor',
      colorClass: 'pace-guide--dark-green',
      steps: [
        'Abrir o detalhe da iniciativa em validacao.',
        'Clicar em "Pedir Parecer" no menu de accoes.',
        'Seleccionar outro mentor ou gestor para consulta.',
        'Aguardar a resposta antes de tomar a decisao final.',
      ],
      tip: 'O parecer e consultivo e nao altera o estado da iniciativa.',
    },
    {
      title: '9. Transferir uma iniciativa',
      who: 'Colaborador / Owner',
      colorClass: 'pace-guide--green',
      steps: [
        'Abrir o detalhe da iniciativa propria.',
        'Clicar em "Transferir" no menu de accoes.',
        'Seleccionar o novo responsavel usando o seletor de pessoas.',
        'Confirmar a transferencia.',
        'A iniciativa passa para o ecra Pessoal do novo responsavel.',
      ],
      tip: 'Apenas o autor actual pode transferir a iniciativa.',
    },
    {
      title: '10. Solicitar revisao',
      who: 'Mentor / Gestor',
      colorClass: 'pace-guide--dark-green',
      steps: [
        'Abrir o detalhe da iniciativa pendente.',
        'Clicar em "Solicitar Revisao".',
        'Adicionar comentarios com as alteracoes necessarias.',
        'A iniciativa volta para o estado "Em Revisao".',
        'O colaborador recebera uma notificacao para rever e re-submeter.',
      ],
      tip: 'Inclua indicacoes claras para facilitar a revisao do colaborador.',
    },
    {
      title: '11. Rever e re-submeter',
      who: 'Colaborador',
      colorClass: 'pace-guide--red',
      steps: [
        'Verificar as notificacoes de revisao no ecra Pessoal.',
        'Ler os comentarios do mentor/gestor na seccao de revisao.',
        'Clicar em "Editar" para actualizar a iniciativa.',
        'Fazer as alteracoes solicitadas.',
        'Clicar em "Re-submeter" para enviar novamente para validacao.',
      ],
      tip: 'A justificacao da revisao e visivel no detalhe da iniciativa para referencia.',
    },
  ];

  const guideAccordionItems = guides.map((guide) =>
    new AccordionItem(guide.title, [
      new Container([
        new Text(guide.who, { type: 'span', class: 'pace-guide-who' }),
        buildNumberedSteps(guide.steps),
        guide.tip
          ? new Container([
              new Text('Dica: ' + guide.tip, { type: 'p', class: 'pace-guide-tip' }),
            ], { class: 'pace-guide-tip-box' })
          : new Text('', { type: 'span' }),
      ], { class: 'pace-guide-body' }),
    ], { class: `pace-action-card ${guide.colorClass}` })
  );

  const actionGuides = new Container([
    new Text('Guia de Accoes', { type: 'h2', class: 'pace-sec-title' }),
    new AccordionGroup(guideAccordionItems, { allowMultipleOpen: true }),
  ]);

  // -- Process flow --
  const flowSteps = [
    { num: '1', label: 'Submissao' },
    { num: '2', label: 'Validacao' },
    { num: '3', label: 'Execucao' },
    { num: '4', label: 'Savings' },
    { num: '5', label: 'Implementado' },
  ];

  const flowElements = [];
  flowSteps.forEach((step, i) => {
    flowElements.push(new Container([
      new Container([new Text(step.num, { type: 'span' })], { class: 'pace-flow-dot pace-flow-dot--active' }),
      new Text(step.label, { type: 'span', class: 'pace-flow-label' }),
    ], { class: 'pace-flow-step' }));

    if (i < flowSteps.length - 1) {
      flowElements.push(new Container([], { class: 'pace-flow-connector pace-flow-connector--done' }));
    }
  });

  const processFlow = new Container([
    new Text('Fluxo do Processo', { type: 'h2', class: 'pace-sec-title' }),
    new Container(flowElements, { class: 'pace-flow' }),
  ]);

  // -- FAQ accordion --
  const faqData = [
    {
      question: 'O que e uma iniciativa PDCA?',
      answer: 'Uma iniciativa PDCA e uma proposta de melhoria continua baseada no ciclo Plan-Do-Check-Act. Qualquer colaborador pode submeter uma iniciativa para melhorar processos, reduzir custos ou aumentar a eficiencia.',
    },
    {
      question: 'Quem pode submeter iniciativas?',
      answer: 'Todos os colaboradores com acesso ao Place podem submeter iniciativas. Nao e necessario ter um perfil especial -- basta estar autenticado na plataforma.',
    },
    {
      question: 'O que acontece depois de submeter?',
      answer: 'A iniciativa e encaminhada automaticamente para o mentor responsavel da sua equipa. O mentor analisa e decide se aprova, solicita revisao ou rejeita o projecto.',
    },
    {
      question: 'Como funcionam os savings?',
      answer: 'Existem dois tipos: Hard Saving (reducao directa de custos comprovavel) e Soft Saving (ganhos de eficiencia ou produtividade). Savings acima de 10.000 EUR ou Hard Savings sao encaminhados para o Gestor RF.',
    },
    {
      question: 'Posso editar uma iniciativa apos submissao?',
      answer: 'Nao directamente. Uma vez submetida, a iniciativa segue o fluxo de validacao. Se o mentor solicitar revisao, a iniciativa volta ao estado "Em Revisao" e pode ser editada e re-submetida.',
    },
    {
      question: 'Como cancelo uma iniciativa?',
      answer: 'Pode cancelar qualquer iniciativa propria que nao esteja num estado terminal (Implementado, Rejeitado ou Cancelado). Aceda ao detalhe da iniciativa e clique em "Cancelar".',
    },
    {
      question: 'O que e o routing automatico?',
      answer: 'O Place encaminha automaticamente cada iniciativa para o mentor e gestor correctos com base na equipa, tipo de saving e valor estimado. Nao precisa de seleccionar manualmente os validadores.',
    },
    {
      question: 'Onde vejo o estado das minhas iniciativas?',
      answer: 'No ecra "Pessoal" encontra todas as suas iniciativas organizadas por estado: rascunhos, pendentes de validacao, em execucao e historico completo.',
    },
  ];

  const faqItems = faqData.map((faq) =>
    new AccordionItem(faq.question, [
      new Text(faq.answer, { type: 'p', class: 'pace-faq-answer' }),
    ], { class: 'pace-faq-item' })
  );

  const faqSection = new Container([
    new Text('Perguntas Frequentes', { type: 'h2', class: 'pace-sec-title' }),
    new AccordionGroup(faqItems),
  ], { class: 'pace-faq' });

  return createPageLayout([ctaBanner, profileCards, actionGuides, processFlow, faqSection]);
});
