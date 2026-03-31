# Guia de Testes Manuais -- PACE (Plataforma de PDCAs)

Tabela plana de casos de teste para exportacao Excel. Cada linha e um caso de teste individual.

**Colunas pre-preenchidas:** ID, Area, Sub-area, Caso de Teste, Perfil, Prioridade.
**Colunas para preenchimento pelo testador:** Resultado (Passou/Falhou/Bloqueado), Observacoes, Data, Testado por.

---

| ID | Area | Sub-area | Caso de Teste | Perfil | Prioridade | Resultado | Observacoes | Data | Testado por |
|----|------|----------|---------------|--------|------------|-----------|-------------|------|-------------|
| | **Setup e Acesso** | | | | | | | | |
| TC-001 | Setup e Acesso | Derivacao de perfil | Colaborador sem AppRole override e com Category fora de Executive/Top Management/Management recebe perfil colaborador | Colaborador | Alta | | | | |
| TC-002 | Setup e Acesso | Derivacao de perfil | Empregado com Category = "Executive", "Top Management" ou "Management" recebe perfil gestor | Gestor | Alta | | | | |
| TC-003 | Setup e Acesso | Derivacao de perfil | Empregado com DeptCode = 'STR-AGI' recebe perfil mentor (via MENTOR_DEPT_OUIDS) | Mentor | Alta | | | | |
| TC-004 | Setup e Acesso | Derivacao de perfil | AppRole override "mentor" no OrgHierarchy prevalece sobre derivacao automatica | Mentor | Alta | | | | |
| TC-005 | Setup e Acesso | Derivacao de perfil | AppRole override "gestor" no OrgHierarchy prevalece sobre derivacao automatica | Gestor | Alta | | | | |
| TC-006 | Setup e Acesso | Visibilidade de rotas | Colaborador ve: pessoal, equipa, catalogo; NAO ve: mentoria, gestor, dashboard, admin | Colaborador | Alta | | | | |
| TC-007 | Setup e Acesso | Visibilidade de rotas | Gestor ve: equipa, gestor, catalogo; NAO ve: pessoal, mentoria, dashboard, admin | Gestor | Alta | | | | |
| TC-008 | Setup e Acesso | Visibilidade de rotas | Mentor ve: pessoal, equipa, mentoria, catalogo, admin; NAO ve: gestor | Mentor | Alta | | | | |
| TC-009 | Setup e Acesso | Nova iniciativa | Botao "+ Nova Iniciativa" no header visivel para colaborador e mentor; ausente para gestor | Todos | Alta | | | | |
| | **Pessoal** | | | | | | | | |
| TC-010 | Pessoal | KPIs | KPI "Submetidas" conta iniciativas do utilizador com status diferente de Rascunho | Colaborador | Media | | | | |
| TC-011 | Pessoal | KPIs | KPI "Em Curso" conta iniciativas nos status SUBMETIDO, VALIDADO_MENTOR, EM_EXECUCAO, POR_VALIDAR, VALIDADO_GESTOR, VALIDADO_FINAL, EM_REVISAO | Colaborador | Media | | | | |
| TC-012 | Pessoal | KPIs | KPI "Implementadas" conta iniciativas com status IMPLEMENTADO | Colaborador | Media | | | | |
| TC-013 | Pessoal | Seccao Em Curso | Seccao "Em Curso" mostra tabela quando existem iniciativas activas (VALIDADO_MENTOR, EM_EXECUCAO, POR_VALIDAR, VALIDADO_GESTOR, VALIDADO_FINAL) | Colaborador | Alta | | | | |
| TC-014 | Pessoal | Seccao Em Curso | Tabela "Em Curso" tem colunas: Iniciativa, Estado, Mentor, Gestor | Colaborador | Media | | | | |
| TC-015 | Pessoal | Colaboracoes | Acordeao "Colaboracoes Recebidas" visivel quando existem iniciativas partilhadas comigo | Colaborador | Alta | | | | |
| TC-016 | Pessoal | Colaboracoes | Tabela de colaboracoes tem colunas: Iniciativa, Estado, Partilhado por | Colaborador | Media | | | | |
| TC-017 | Pessoal | Em Revisao | Acordeao "Em Revisao" visivel quando existem iniciativas em EM_REVISAO | Colaborador | Alta | | | | |
| TC-018 | Pessoal | Em Revisao | Item em revisao mostra numero de dias desde modificacao; item com mais de 7 dias tem destaque de urgencia | Colaborador | Media | | | | |
| TC-019 | Pessoal | Em Revisao | Botao "Rever" no item em revisao abre modal de revisao directamente | Colaborador | Alta | | | | |
| TC-020 | Pessoal | Navegacao | Clicar no titulo de uma iniciativa abre o painel lateral com context = pessoal | Colaborador | Alta | | | | |
| | **Wizard Nova Iniciativa** | | | | | | | | |
| TC-021 | Wizard | Abertura | Modal de nova iniciativa abre ao clicar "+ Nova Iniciativa" | Colaborador | Alta | | | | |
| TC-022 | Wizard | Validacao passo 1 | Titulo obrigatorio -- formulario bloqueia avanco quando vazio | Colaborador | Alta | | | | |
| TC-023 | Wizard | Validacao passo 1 | Equipa obrigatoria -- formulario bloqueia avanco quando nao seleccionada | Colaborador | Alta | | | | |
| TC-024 | Wizard | Passo 1 | Campos opcionais (Descricao, Problema, Objectivo) nao bloqueiam avanco | Colaborador | Media | | | | |
| TC-025 | Wizard | Passo 1 | Checkbox Confidencial altera o campo IsConfidential na iniciativa criada | Colaborador | Alta | | | | |
| TC-026 | Wizard | Passo 2 | Passo 2 (dados financeiros) abre apos completar passo 1 | Colaborador | Alta | | | | |
| TC-027 | Wizard | Validacao passo 2 | SavingType obrigatorio no passo 2 | Colaborador | Alta | | | | |
| TC-028 | Wizard | Passo 2 | Saving estimado aceita valor numerico | Colaborador | Media | | | | |
| TC-029 | Wizard | Passo 2 | Seleccao de periodo (mensal/anual) determina calculo de anualizacao | Colaborador | Media | | | | |
| TC-030 | Wizard | Criacao | Completar wizard cria iniciativa com status Rascunho | Colaborador | Alta | | | | |
| TC-031 | Wizard | Criacao | Iniciativa criada aparece na seccao Rascunhos/Pessoal apos fechar modal | Colaborador | Alta | | | | |
| TC-032 | Wizard | Edicao | Editar (a partir de RASCUNHO): modal abre pre-preenchido com dados da iniciativa | Colaborador | Alta | | | | |
| TC-033 | Wizard | Edicao | Guardar edicao actualiza iniciativa existente sem criar nova | Colaborador | Alta | | | | |
| TC-034 | Wizard | Replicar | Replicar (catalogo): modal abre pre-preenchido com dados financeiros da iniciativa fonte | Todos | Alta | | | | |
| TC-035 | Wizard | Replicar | Replicar: iniciativa criada fica em RASCUNHO, sem herdar status da fonte | Todos | Alta | | | | |
| | **Painel Lateral -- Estrutura** | | | | | | | | |
| TC-036 | Painel | Estrutura | Painel lateral abre com header contendo chip de status e chip de equipa | Todos | Alta | | | | |
| TC-037 | Painel | Estrutura | Chip "Confidencial" aparece no header quando IsConfidential = true | Todos | Alta | | | | |
| TC-038 | Painel | Dados Gerais | Grid "Dados Gerais" mostra: Colaborador, Equipa, Mentor Responsavel | Todos | Alta | | | | |
| TC-039 | Painel | Dados Gerais | Campo "Gestor Validador" aparece no grid apenas quando gestor esta atribuido | Todos | Media | | | | |
| TC-040 | Painel | Dados Gerais | Quando nenhum mentor esta atribuido, "Mentor Responsavel" mostra "Por atribuir" | Todos | Media | | | | |
| TC-041 | Painel | Conteudo | Seccoes Descricao, Problema, Objectivo omitidas quando os campos estao vazios | Todos | Media | | | | |
| TC-042 | Painel | Financeiros | Seccao "Dados Financeiros" visivel quando a iniciativa tem financials associados | Todos | Alta | | | | |
| TC-043 | Painel | Financeiros | Seccao "Dados Efetivos" visivel apenas quando pelo menos um campo After esta preenchido | Todos | Media | | | | |
| TC-044 | Painel | Progresso | Timeline "Progresso" visivel em contextos pessoal, equipa, mentoria, gestor | Todos | Alta | | | | |
| TC-045 | Painel | Progresso | Timeline "Progresso" ausente em contexto catalogo | Todos | Alta | | | | |
| TC-046 | Painel | Progresso | Timeline mostra eventos cronologicamente com label, data e actor | Todos | Media | | | | |
| TC-047 | Painel | Comentarios | Seccao Comentarios visivel para contextos nao-catalogo | Todos | Alta | | | | |
| TC-048 | Painel | Comentarios | Seccao Comentarios ausente em contexto catalogo | Todos | Alta | | | | |
| | **Painel Lateral -- Botoes (Pessoal / Proprietario)** | | | | | | | | |
| TC-049 | Painel Botoes | Pessoal / RASCUNHO | Botoes visiveis: Submeter, Editar, Cancelar, Transferir | Colaborador | Alta | | | | |
| TC-050 | Painel Botoes | Pessoal / SUBMETIDO sem mentor | Transferir visivel; Cancelar e outros botoes de accao ausentes | Colaborador | Alta | | | | |
| TC-051 | Painel Botoes | Pessoal / SUBMETIDO com mentor | Nenhum botao de accao de proprietario (apenas Partilhar) | Colaborador | Alta | | | | |
| TC-052 | Painel Botoes | Pessoal / VALIDADO_MENTOR | Botoes visiveis: Declarar Inicio Execucao, Cancelar | Colaborador | Alta | | | | |
| TC-053 | Painel Botoes | Pessoal / EM_EXECUCAO | Botoes visiveis: Solicitar Validacao, Cancelar | Colaborador | Alta | | | | |
| TC-054 | Painel Botoes | Pessoal / EM_REVISAO | Botoes visiveis: Rever, Cancelar | Colaborador | Alta | | | | |
| TC-055 | Painel Botoes | Pessoal / VALIDADO_FINAL | Botao visivel: Marcar como Implementado; Cancelar ausente | Colaborador | Alta | | | | |
| TC-056 | Painel Botoes | Pessoal / POR_VALIDAR | Nenhum botao de accao de proprietario (apenas Partilhar) | Colaborador | Alta | | | | |
| TC-057 | Painel Botoes | Pessoal / VALIDADO_GESTOR | Nenhum botao de accao de proprietario (apenas Partilhar) | Colaborador | Alta | | | | |
| TC-058 | Painel Botoes | Pessoal / estados terminais | Nenhum botao de accao de proprietario para IMPLEMENTADO, REJEITADO, CANCELADO | Colaborador | Alta | | | | |
| TC-059 | Painel Botoes | Pessoal / nao-proprietario | Item partilhado (nao e owner): nenhum botao de accao de proprietario | Colaborador | Alta | | | | |
| TC-060 | Painel Botoes | Pessoal / Submeter | Botao Submeter: ativa isLoading, transiciona para SUBMETIDO apos sucesso | Colaborador | Alta | | | | |
| TC-061 | Painel Botoes | Pessoal / Editar | Botao Editar: fecha painel e abre modal de edicao | Colaborador | Alta | | | | |
| TC-062 | Painel Botoes | Pessoal / Cancelar | Botao Cancelar: pede confirmacao antes de transicionar para CANCELADO | Colaborador | Alta | | | | |
| TC-063 | Painel Botoes | Pessoal / Transferir | Botao Transferir (RASCUNHO): abre modal para seleccionar novo proprietario | Colaborador | Alta | | | | |
| TC-064 | Painel Botoes | Pessoal / Solicitar Validacao | Declarar Savings via "Solicitar Validacao": transiciona para POR_VALIDAR | Colaborador | Alta | | | | |
| TC-065 | Painel Botoes | Pessoal / Declarar Inicio | "Declarar Inicio Execucao": transiciona para EM_EXECUCAO | Colaborador | Alta | | | | |
| TC-066 | Painel Botoes | Pessoal / Rever | Botao Rever: fecha painel e abre modal de revisao | Colaborador | Alta | | | | |
| TC-067 | Painel Botoes | Pessoal / Implementado | "Marcar como Implementado": transiciona para IMPLEMENTADO | Colaborador | Alta | | | | |
| | **Painel Lateral -- Botoes (Mentoria)** | | | | | | | | |
| TC-068 | Painel Botoes | Mentoria / SUBMETIDO | canAct=true: botoes visiveis: Aprovar, Rejeitar, Solicitar Revisao | Mentor | Alta | | | | |
| TC-069 | Painel Botoes | Mentoria / SUBMETIDO / Aprovar | Aprovar fecha painel e abre modal Dados Estimados | Mentor | Alta | | | | |
| TC-070 | Painel Botoes | Mentoria / SUBMETIDO / Rejeitar | Rejeitar pede motivo e transiciona para REJEITADO | Mentor | Alta | | | | |
| TC-071 | Painel Botoes | Mentoria / SUBMETIDO / Solicitar Revisao | Solicitar Revisao pede motivo e transiciona para EM_REVISAO | Mentor | Alta | | | | |
| TC-072 | Painel Botoes | Mentoria / VALIDADO_GESTOR | canAct=true: botoes visiveis: Confirmar Savings, Rejeitar, Solicitar Revisao, Editar Dados Efetivos | Mentor | Alta | | | | |
| TC-073 | Painel Botoes | Mentoria / VALIDADO_GESTOR / Confirmar | Confirmar Savings transiciona para VALIDADO_FINAL | Mentor | Alta | | | | |
| TC-074 | Painel Botoes | Mentoria / VALIDADO_GESTOR / Editar | Editar Dados Efetivos fecha painel e abre modal de dados efetivos | Mentor | Alta | | | | |
| TC-075 | Painel Botoes | Mentoria / canAct=false | Item partilhado com canAct=false: nenhum botao de accao mentoria | Mentor | Alta | | | | |
| TC-076 | Painel Botoes | Mentoria / outros status | Nenhum botao de accao mentoria para status que nao sejam SUBMETIDO e VALIDADO_GESTOR | Mentor | Media | | | | |
| | **Painel Lateral -- Botoes (Gestor)** | | | | | | | | |
| TC-077 | Painel Botoes | Gestor / POR_VALIDAR | canAct=true: botoes visiveis: Aprovar Savings, Rejeitar, Solicitar Revisao, Transferir | Gestor | Alta | | | | |
| TC-078 | Painel Botoes | Gestor / POR_VALIDAR / Aprovar | Aprovar Savings transiciona para VALIDADO_GESTOR | Gestor | Alta | | | | |
| TC-079 | Painel Botoes | Gestor / POR_VALIDAR / Rejeitar | Rejeitar pede motivo e transiciona para REJEITADO | Gestor | Alta | | | | |
| TC-080 | Painel Botoes | Gestor / POR_VALIDAR / Solicitar Revisao | Solicitar Revisao pede motivo e transiciona para EM_REVISAO | Gestor | Alta | | | | |
| TC-081 | Painel Botoes | Gestor / POR_VALIDAR / Transferir | Transferir abre modal para seleccionar novo gestor validador | Gestor | Alta | | | | |
| TC-082 | Painel Botoes | Gestor / canAct=false | Item partilhado com canAct=false: nenhum botao de accao gestor | Gestor | Alta | | | | |
| TC-083 | Painel Botoes | Gestor / outros status | Nenhum botao de accao gestor para status que nao sejam POR_VALIDAR | Gestor | Media | | | | |
| | **Painel Lateral -- Botoes (Catalogo)** | | | | | | | | |
| TC-084 | Painel Botoes | Catalogo | Botao Replicar visivel em contexto catalogo | Todos | Alta | | | | |
| TC-085 | Painel Botoes | Catalogo | Botao Partilhar ausente em contexto catalogo | Todos | Alta | | | | |
| TC-086 | Painel Botoes | Catalogo / Replicar | Replicar fecha painel e abre modal pre-preenchido com dados financeiros | Todos | Alta | | | | |
| | **Painel Lateral -- Partilhar e Comentarios** | | | | | | | | |
| TC-087 | Painel | Partilhar | Botao Partilhar visivel em contextos pessoal, equipa, mentoria, gestor | Todos | Alta | | | | |
| TC-088 | Painel | Partilhar | Clicar Partilhar executa alert() com nome da iniciativa (funcionalidade placeholder) | Todos | Media | | | | |
| TC-089 | Painel | Comentarios | Proprietario da iniciativa pode escrever e enviar comentarios | Colaborador | Alta | | | | |
| TC-090 | Painel | Comentarios | Mentor atribuido pode escrever e enviar comentarios | Mentor | Alta | | | | |
| TC-091 | Painel | Comentarios | Gestor atribuido pode escrever e enviar comentarios | Gestor | Alta | | | | |
| TC-092 | Painel | Comentarios | Comentario confidencial visivel apenas ao autor, ao mentor e ao gestor | Todos | Alta | | | | |
| TC-093 | Painel | Comentarios | Utilizador sem permissao (nao owner, mentor, gestor, nem partilhado) nao ve campo de input de comentario | Todos | Media | | | | |
| TC-094 | Painel | Comentarios | Enviar comentario vazio mostra Toast.error ("Escreva um comentario antes de enviar") | Colaborador | Media | | | | |
| TC-095 | Painel | Comentarios | Apos envio bem-sucedido, lista de comentarios actualiza sem recarregar pagina | Colaborador | Media | | | | |
| | **Equipa** | | | | | | | | |
| TC-096 | Equipa | Erro OUID | Toast de erro mostrado quando OUID do utilizador nao esta definido | Todos | Alta | | | | |
| TC-097 | Equipa | KPIs | Chips de KPI mostrados para cada status com contagem > 0 | Todos | Media | | | | |
| TC-098 | Equipa | Tabela | Tabela tem colunas: Iniciativa, Estado, Mentor, Gestor, Submetido por | Todos | Alta | | | | |
| TC-099 | Equipa | Filtros | Filtro por status actualiza a tabela para mostrar apenas o status seleccionado | Todos | Alta | | | | |
| TC-100 | Equipa | Filtros | Filtro por tipo de saving actualiza a tabela | Todos | Media | | | | |
| TC-101 | Equipa | Filtros | Pesquisa por texto filtra por titulo, equipa e proprietario | Todos | Alta | | | | |
| TC-102 | Equipa | Filtros | Contador de resultados actualiza apos cada alteracao de filtro | Todos | Media | | | | |
| TC-103 | Equipa | Filtros | Empty state mostrado quando nenhum resultado corresponde ao filtro | Todos | Media | | | | |
| TC-104 | Equipa | Navegacao | Clicar no titulo da iniciativa abre painel lateral com context = equipa | Todos | Alta | | | | |
| TC-105 | Equipa | Painel | Painel aberto via equipa mostra Partilhar; nao mostra botoes de accao de proprietario, mentoria ou gestor | Todos | Alta | | | | |
| | **Mentoria** | | | | | | | | |
| TC-106 | Mentoria | Acesso | Rota mentoria exclusiva do perfil mentor; acesso bloqueado para gestor e colaborador | Todos | Alta | | | | |
| TC-107 | Mentoria | Pendentes | Seccao "Para Validar" mostra SUBMETIDO items: nao atribuidos + atribuidos a mim | Mentor | Alta | | | | |
| TC-108 | Mentoria | Pendentes | Item nao atribuido (sem MentorEmail) aparece na lista de pendentes | Mentor | Alta | | | | |
| TC-109 | Mentoria | Tracking | Seccao de tracking mostra VALIDADO_MENTOR, EM_EXECUCAO, POR_VALIDAR, VALIDADO_GESTOR, VALIDADO_FINAL atribuidos a mim | Mentor | Alta | | | | |
| TC-110 | Mentoria | Validar Savings | Seccao de validacao de savings mostra VALIDADO_GESTOR atribuidos a mim | Mentor | Alta | | | | |
| TC-111 | Mentoria | Colaboracoes | Seccao de colaboracoes mostra items partilhados comigo | Mentor | Media | | | | |
| TC-112 | Mentoria | canAct | Clicar item em "Para Validar" abre painel com canAct=true (botoes de accao visiveis) | Mentor | Alta | | | | |
| TC-113 | Mentoria | canAct | Clicar item partilhado abre painel com canAct=false (sem botoes de accao mentoria) | Mentor | Alta | | | | |
| | **Gestor** | | | | | | | | |
| TC-114 | Gestor | Acesso | Rota gestor exclusiva do perfil gestor; acesso bloqueado para mentor e colaborador | Todos | Alta | | | | |
| TC-115 | Gestor | Pendentes | Seccao pendentes mostra POR_VALIDAR items atribuidos a mim (GestorValidatorEmail) | Gestor | Alta | | | | |
| TC-116 | Gestor | Tracking | Seccao tracking mostra items do gestor em status nao-pendente (VALIDADO_GESTOR, VALIDADO_FINAL, IMPLEMENTADO, EM_EXECUCAO) | Gestor | Alta | | | | |
| TC-117 | Gestor | Colaboracoes | Seccao de colaboracoes mostra items partilhados comigo | Gestor | Media | | | | |
| TC-118 | Gestor | canAct | Clicar item nos pendentes abre painel com canAct=true (botoes de accao visiveis) | Gestor | Alta | | | | |
| TC-119 | Gestor | canAct | Clicar item partilhado abre painel com canAct=false (sem botoes de accao gestor) | Gestor | Alta | | | | |
| | **Catalogo** | | | | | | | | |
| TC-120 | Catalogo | Acesso | Rota catalogo acessivel para colaborador, gestor e mentor | Todos | Alta | | | | |
| TC-121 | Catalogo | Tabs | Tab activa por defeito: Implementados | Todos | Alta | | | | |
| TC-122 | Catalogo | Implementados | Tab Implementados mostra apenas itens com status IMPLEMENTADO | Todos | Alta | | | | |
| TC-123 | Catalogo | Implementados | Colunas: Iniciativa, Estado, Colaborador, Equipa, Mentor, Gestor, Saving, Valor, Implementado | Todos | Alta | | | | |
| TC-124 | Catalogo | Arquivo | Tab Arquivo mostra apenas itens com status CANCELADO ou REJEITADO | Todos | Alta | | | | |
| TC-125 | Catalogo | Arquivo | Colunas: Iniciativa, Estado, Colaborador, Equipa, Mentor, Gestor, Saving, Valor (sem coluna Implementado) | Todos | Alta | | | | |
| TC-126 | Catalogo | KPIs | KPIs em Implementados: Iniciativas Implementadas, Equipas Impactadas, Utilizadores Envolvidos | Todos | Media | | | | |
| TC-127 | Catalogo | KPIs | KPIs em Arquivo: Iniciativas em Arquivo; Equipas e Utilizadores mostram "-" | Todos | Media | | | | |
| TC-128 | Catalogo | KPIs | Mudar para tab Arquivo actualiza KPIs para reflectir arquivo | Todos | Media | | | | |
| TC-129 | Catalogo | Navegacao | Clicar no titulo de uma iniciativa abre painel lateral com context = catalogo | Todos | Alta | | | | |
| TC-130 | Catalogo | Exportar | Botao Exportar visivel e desactivado (placeholder, nao executa exportacao) | Todos | Baixa | | | | |
| | **Dashboard** | | | | | | | | |
| TC-131 | Dashboard | Acesso | Rota dashboard exclusiva do perfil mentor; acesso bloqueado para gestor e colaborador | Todos | Alta | | | | |
| | **Admin** | | | | | | | | |
| TC-132 | Admin | Acesso | Rota admin exclusiva do perfil mentor; acesso bloqueado para gestor e colaborador | Todos | Alta | | | | |
| TC-133 | Admin | Tabs | Admin mostra 3 tabs: Importar, Dados, Hierarquia | Mentor | Alta | | | | |
| TC-134 | Admin | Importar | KPI row na tab Importar mostra Colaboradores, Departamentos e Niveis actuais | Mentor | Alta | | | | |
| TC-135 | Admin | Importar | Botao "Selecionar ficheiro CSV" visivel no estado inicial | Mentor | Alta | | | | |
| TC-136 | Admin | Importar | Apos seleccionar ficheiro, mostra: nome do ficheiro, "Importar Hierarquia", "Cancelar" | Mentor | Alta | | | | |
| TC-137 | Admin | Importar | Clicar "Importar Hierarquia" abre Dialog de confirmacao (variante warning, closeOnFocusLoss=false) | Mentor | Alta | | | | |
| TC-138 | Admin | Importar | Confirmar importacao executa o import e mostra card de resultado com sucesso/falhas | Mentor | Alta | | | | |
| TC-139 | Admin | Importar | Cancelar no Dialog de confirmacao volta ao estado com ficheiro seleccionado sem fazer import | Mentor | Alta | | | | |
| TC-140 | Admin | Importar | Cancelar seleccao de ficheiro antes de importar volta ao estado inicial sem ficheiro | Mentor | Alta | | | | |
| TC-141 | Admin | Dados | Mudar para tab Dados carrega tabela de colaboradores | Mentor | Alta | | | | |
| TC-142 | Admin | Dados | Tabela de dados tem colunas: Nome, Perfil, Categoria, Departamento, Subdivisao, Manager | Mentor | Alta | | | | |
| TC-143 | Admin | Dados | Filtro de pesquisa por nome reduz resultados na tabela | Mentor | Alta | | | | |
| TC-144 | Admin | Dados | Filtro por Perfil mostra apenas colaboradores com esse perfil | Mentor | Alta | | | | |
| TC-145 | Admin | Dados | Clicar numa linha abre Dialog de alteracao de AppRole | Mentor | Alta | | | | |
| TC-146 | Admin | Dados | Dialog de AppRole: guardar nova role actualiza o colaborador e recarrega tabela | Mentor | Alta | | | | |
| TC-147 | Admin | Hierarquia | Mudar para tab Hierarquia carrega arvore organizacional com AccordionItems | Mentor | Alta | | | | |
| TC-148 | Admin | Hierarquia | Hierarquia mostra contagem de colaboradores e departamentos | Mentor | Media | | | | |
| | **Transicoes de Estado** | | | | | | | | |
| TC-149 | Transicoes | Submeter | RASCUNHO -> SUBMETIDO: cria evento Submission; estado actualizado | Colaborador | Alta | | | | |
| TC-150 | Transicoes | Aprovar Projecto | SUBMETIDO -> VALIDADO_MENTOR: mentor completa modal Dados Estimados; cria evento MentorApproval | Mentor | Alta | | | | |
| TC-151 | Transicoes | Rejeitar (mentor) | SUBMETIDO -> REJEITADO: requer motivo (campo obrigatorio no dialog) | Mentor | Alta | | | | |
| TC-152 | Transicoes | Solicitar Revisao (mentor de SUBMETIDO) | SUBMETIDO -> EM_REVISAO: requer motivo; cria evento ReviewRequest | Mentor | Alta | | | | |
| TC-153 | Transicoes | Inicio Execucao | VALIDADO_MENTOR -> EM_EXECUCAO: colaborador clica "Declarar Inicio Execucao"; cria evento ExecutionStart | Colaborador | Alta | | | | |
| TC-154 | Transicoes | Solicitar Validacao | EM_EXECUCAO -> POR_VALIDAR: colaborador clica "Solicitar Validacao"; cria evento SavingsSubmission | Colaborador | Alta | | | | |
| TC-155 | Transicoes | Aprovar Savings (gestor) | POR_VALIDAR -> VALIDADO_GESTOR: gestor aprova; cria evento BusinessValidation | Gestor | Alta | | | | |
| TC-156 | Transicoes | Rejeitar (gestor) | POR_VALIDAR -> REJEITADO: requer motivo; cria evento BusinessRejection | Gestor | Alta | | | | |
| TC-157 | Transicoes | Solicitar Revisao (gestor) | POR_VALIDAR -> EM_REVISAO: requer motivo; cria evento ReviewRequest | Gestor | Alta | | | | |
| TC-158 | Transicoes | Confirmar Savings (mentor) | VALIDADO_GESTOR -> VALIDADO_FINAL: mentor confirma; cria evento MentorFinalValidation | Mentor | Alta | | | | |
| TC-159 | Transicoes | Rejeitar (mentor de VALIDADO_GESTOR) | VALIDADO_GESTOR -> REJEITADO: requer motivo | Mentor | Alta | | | | |
| TC-160 | Transicoes | Solicitar Revisao (mentor de VALIDADO_GESTOR) | VALIDADO_GESTOR -> EM_REVISAO: requer motivo | Mentor | Alta | | | | |
| TC-161 | Transicoes | Marcar Implementado | VALIDADO_FINAL -> IMPLEMENTADO: colaborador clica "Marcar como Implementado"; cria evento OwnerImplementation | Colaborador | Alta | | | | |
| TC-162 | Transicoes | Rever (EM_REVISAO) | EM_REVISAO: modal de revisao determina status alvo (SUBMETIDO ou POR_VALIDAR) conforme contexto | Colaborador | Alta | | | | |
| TC-163 | Transicoes | Cancelar (RASCUNHO) | RASCUNHO -> CANCELADO: colaborador cancela via botao Cancelar com confirmacao | Colaborador | Alta | | | | |
| TC-164 | Transicoes | Cancelar (VALIDADO_MENTOR) | VALIDADO_MENTOR -> CANCELADO: Cancelar disponivel e funcional | Colaborador | Alta | | | | |
| TC-165 | Transicoes | Cancelar (EM_EXECUCAO) | EM_EXECUCAO -> CANCELADO: Cancelar disponivel e funcional | Colaborador | Alta | | | | |
| TC-166 | Transicoes | Cancelar (EM_REVISAO) | EM_REVISAO -> CANCELADO: Cancelar disponivel e funcional | Colaborador | Alta | | | | |
| TC-167 | Transicoes | Cancelar (SUBMETIDO) | SUBMETIDO: Cancelar NAO disponivel para o proprietario (botao ausente) | Colaborador | Alta | | | | |
| TC-168 | Transicoes | Cancelar (VALIDADO_FINAL) | VALIDADO_FINAL: Cancelar NAO disponivel (apenas Marcar como Implementado) | Colaborador | Alta | | | | |
| TC-169 | Transicoes | Terminal | IMPLEMENTADO: nenhuma transicao adicional disponivel | Colaborador | Alta | | | | |
| TC-170 | Transicoes | Terminal | REJEITADO: nenhuma transicao adicional disponivel | Todos | Alta | | | | |
| | **Transferencia** | | | | | | | | |
| TC-171 | Transferencia | Ownership / RASCUNHO | Transferir visivel e funcional para proprietario em RASCUNHO | Colaborador | Alta | | | | |
| TC-172 | Transferencia | Ownership / SUBMETIDO sem mentor | Transferir visivel em SUBMETIDO quando MentorEmail esta vazio | Colaborador | Alta | | | | |
| TC-173 | Transferencia | Ownership / SUBMETIDO com mentor | Transferir NAO visivel em SUBMETIDO quando MentorEmail esta preenchido | Colaborador | Alta | | | | |
| TC-174 | Transferencia | Ownership / resultado | Apos transferencia de ownership: SubmittedBy e SubmittedByEmail actualizados, evento Transfer criado | Colaborador | Alta | | | | |
| TC-175 | Transferencia | Ownership / notificacao | Transferencia de ownership envia notificacao ao novo proprietario e ao mentor | Colaborador | Alta | | | | |
| TC-176 | Transferencia | Gestor / POR_VALIDAR | Transferir visivel em contexto gestor quando status = POR_VALIDAR | Gestor | Alta | | | | |
| TC-177 | Transferencia | Gestor / resultado | Apos transferencia de gestor: GestorValidator e GestorValidatorEmail actualizados, evento Transfer criado | Gestor | Alta | | | | |
| TC-178 | Transferencia | Gestor / notificacao | Transferencia de gestor envia notificacao ao novo gestor e ao proprietario da iniciativa | Gestor | Alta | | | | |
| | **Funcionalidades Transversais** | | | | | | | | |
| TC-179 | Transversais | Loading | Botao que dispara accao assincrona mostra spinner (isLoading=true) durante a operacao | Todos | Alta | | | | |
| TC-180 | Transversais | Loading | Botao regressar ao estado normal (isLoading=false) no bloco finally apos conclusao ou erro | Todos | Alta | | | | |
| TC-181 | Transversais | Erro API | Erro em ListApi mostrado como Toast.error; NAO dispara BreakingErrorDialog | Todos | Alta | | | | |
| TC-182 | Transversais | Notificacoes | Apos aprovacao de projecto, notificacao enviada ao proprietario | Mentor | Alta | | | | |
| TC-183 | Transversais | Notificacoes | Apos rejeicao, notificacao enviada ao proprietario | Todos | Alta | | | | |
| TC-184 | Transversais | Confidencial | Iniciativa confidencial mostra chip "Confidencial" no painel lateral | Todos | Alta | | | | |
| TC-185 | Transversais | Dados Estimados | Modal Dados Estimados pre-preenchido com categoria/tipo de saving antes de submeter | Mentor | Alta | | | | |
| TC-186 | Transversais | Dados Efetivos | Modal Dados Efetivos pre-preenchido com valores After quando disponiveis | Mentor | Alta | | | | |
| | **Casos Limite** | | | | | | | | |
| TC-187 | Casos Limite | Double-submit | Clicar Submeter duas vezes rapidamente nao cria duas iniciativas (isLoading previne segundo click) | Colaborador | Alta | | | | |
| TC-188 | Casos Limite | Sem OrgHierarchy | Equipa sem items na hierarquia: estado vazio mostrado com mensagem (nao erro critico) | Todos | Media | | | | |
| TC-189 | Casos Limite | Catalogo vazio | Catalogo sem items: tabela mostra "Sem iniciativas nesta categoria." | Todos | Media | | | | |
| TC-190 | Casos Limite | Mentoria sem pendentes | Seccao para validar em mentoria mostra estado vazio quando nenhum SUBMETIDO existe | Mentor | Media | | | | |
| TC-191 | Casos Limite | Financials ausentes | Painel lateral nao lanca erro quando nenhum financials existe para a iniciativa | Todos | Alta | | | | |
| TC-192 | Casos Limite | Motivo obrigatorio | Dialog de rejeicao/revisao nao submete sem texto de motivo | Todos | Alta | | | | |
| TC-193 | Casos Limite | Etag conflict | Em caso de conflito de concorrencia (HTTP 412), erro ConcurrencyConflict com breaksFlow=false e mostrado como Toast (nao dialog bloqueante) | Todos | Alta | | | | |
| TC-194 | Casos Limite | Mentor nao atribuido | Iniciativa aprovada sem mentor explicitamente atribuido: campo fica "Por atribuir" no painel | Todos | Media | | | | |
| | **Cobertura** | | | | | | | | |
| | Cobertura | Setup e Acesso | Derivacao de perfil, AppRole override, guards de rota, visibilidade de navbar | | | | | | |
| | Cobertura | Pessoal | KPIs, seccoes dinamicas (Em Curso, Colaboracoes, Em Revisao), navegacao | | | | | | |
| | Cobertura | Wizard | Criar, editar, replicar; validacao de campos obrigatorios; criacao em RASCUNHO | | | | | | |
| | Cobertura | Painel lateral | Estrutura, dados gerais, financeiros, efetivos, progresso, comentarios | | | | | | |
| | Cobertura | Botoes painel | Matriz completa: pessoal (8 status), mentoria (2 status), gestor (1 status), catalogo | | | | | | |
| | Cobertura | Transferencia | Ownership (RASCUNHO, SUBMETIDO sem mentor), Gestor (POR_VALIDAR); resultado e notificacoes | | | | | | |
| | Cobertura | Equipa | Colunas, filtros, KPIs, navegacao para painel com equipa context | | | | | | |
| | Cobertura | Mentoria | Acesso exclusivo mentor; pendentes, tracking, validar savings, colaboracoes, canAct | | | | | | |
| | Cobertura | Gestor | Acesso exclusivo gestor; pendentes, tracking, colaboracoes, canAct | | | | | | |
| | Cobertura | Catalogo | Acesso universal; tabs, colunas, KPIs, context catalogo para Replicar | | | | | | |
| | Cobertura | Admin | Acesso mentor; importar CSV, dados com filtros e AppRole, hierarquia em arvore | | | | | | |
| | Cobertura | Transicoes | Todos os 11 passos do ciclo principal + EM_REVISAO + cancelamentos + terminais | | | | | | |
| | Cobertura | Transversais | Loading/finally, erros API como Toast, notificacoes, confidencial, etag conflict | | | | | | |
