/**
 * Conteudo legal exibido nas paginas publicas.
 *
 * Mantido como dados estruturados para separar texto juridico do layout React.
 */
export const legalUpdatedAt = "29 de junho de 2026"

export const privacySections = [
  {
    title: "1. Quem somos e escopo",
    body: [
      "O Meu Ponto CLT e uma aplicacao para registro e acompanhamento de jornada de trabalho, banco de horas, importacao de planilhas e gestao basica de perfis profissionais.",
      "Esta Politica de Privacidade explica como os dados pessoais sao tratados no uso do sistema, em alinhamento com a Lei Geral de Protecao de Dados Pessoais, Lei nº 13.709/2018.",
    ],
  },
  {
    title: "2. Dados pessoais tratados",
    body: [
      "Dados de conta: nome, e-mail, senha criptografada pelo provedor de autenticacao, status de conta e data de criacao.",
      "Dados de perfil profissional: data de nascimento, empresa, funcao, avatar escolhido e jornada semanal configurada.",
      "Dados de jornada: datas, horarios de entrada, pausa, retorno, saida, ajustes, importacoes de planilha, justificativas de ausencia, tipo da justificativa e motivo informado.",
      "Dados tecnicos e de seguranca: identificadores de usuario, sessoes de autenticacao e metadados necessarios para auditoria e suporte.",
    ],
  },
  {
    title: "3. Finalidades do tratamento",
    body: [
      "Criar, autenticar e proteger contas de usuario.",
      "Registrar, calcular, exibir e exportar informacoes de jornada e banco de horas.",
      "Permitir que o proprio usuario gerencie seu perfil, escalas e registros vinculados.",
      "Cumprir obrigacoes legais ou regulatorias aplicaveis a controle de jornada, auditoria, seguranca da informacao e atendimento a solicitacoes de titulares.",
      "Prevenir abuso, fraude, acesso indevido e diagnosticar falhas tecnicas do sistema.",
    ],
  },
  {
    title: "4. Bases legais LGPD",
    body: [
      "Execucao de contrato ou procedimentos preliminares: para criar conta, autenticar usuario e prestar as funcionalidades solicitadas.",
      "Cumprimento de obrigacao legal ou regulatoria: quando os registros de jornada forem usados para atender exigencias trabalhistas, fiscais, contabeis ou auditorias.",
      "Legitimo interesse: para seguranca, prevencao a fraude, melhoria operacional e suporte, sempre com avaliacao de impacto e respeito aos direitos dos titulares.",
      "Consentimento: quando alguma funcionalidade opcional exigir autorizacao especifica, destacada e revogavel.",
      "Exercicio regular de direitos: para preservar evidencias em processos administrativos, judiciais ou arbitrais, quando aplicavel.",
    ],
  },
  {
    title: "5. Compartilhamento e operadores",
    body: [
      "Os dados podem ser tratados por fornecedores de infraestrutura, autenticacao, banco de dados, hospedagem, analytics e monitoramento estritamente necessarios para operar o sistema.",
      "O projeto usa Supabase para autenticacao e banco de dados e pode usar Vercel Analytics em producao. Esses terceiros devem atuar conforme contrato, controles de seguranca e instrucoes do controlador.",
      "Dados nao sao vendidos. Compartilhamentos com empregador, autoridades ou terceiros so devem ocorrer quando houver autorizacao, obrigacao legal, protecao de direitos ou necessidade operacional legitima.",
    ],
  },
  {
    title: "6. Direitos dos titulares",
    body: [
      "Nos termos da LGPD, o titular pode solicitar confirmacao de tratamento, acesso, correcao, anonimizacao, bloqueio, eliminacao, portabilidade, informacoes sobre compartilhamento e revisao de decisoes automatizadas, quando aplicavel.",
      "O titular tambem pode revogar consentimentos e se opor a tratamentos baseados em legitimo interesse, observadas as hipoteses legais de retencao.",
      "Solicitacoes devem ser respondidas em prazo razoavel e registradas para fins de governanca e auditoria.",
    ],
  },
  {
    title: "7. Retencao e eliminacao",
    body: [
      "Dados de conta e perfil sao mantidos enquanto a conta estiver ativa ou enquanto forem necessarios para cumprir obrigacoes legais, contratuais, auditorias e defesa de direitos.",
      "Registros de jornada, justificativas e relatorios podem exigir retencao por prazos trabalhistas, fiscais ou contabeis definidos pelo controlador.",
      "Encerrada a finalidade e inexistindo obrigacao de preservacao, os dados devem ser eliminados, anonimizados ou bloqueados de forma segura.",
    ],
  },
  {
    title: "8. Seguranca",
    body: [
      "O sistema aplica autenticacao por e-mail e senha, politicas de seguranca no banco de dados e restricao de leitura e escrita ao usuario autenticado dono dos dados.",
      "Usuarios devem manter credenciais protegidas e comunicar incidentes de seguranca pelos canais definidos pelo controlador.",
      "Nenhum sistema e absolutamente imune a riscos. Incidentes relevantes devem ser avaliados, mitigados e comunicados quando a LGPD ou a ANPD exigirem.",
    ],
  },
  {
    title: "9. Encarregado e contato",
    body: [
      "O controlador deve indicar um canal de contato do encarregado ou responsavel por privacidade antes da publicacao em producao.",
      "Sugestao de campo a preencher: privacidade@seudominio.com.br.",
    ],
  },
]

export const termsSections = [
  {
    title: "1. Aceite",
    body: [
      "Ao acessar ou usar o Meu Ponto CLT, o usuario declara que leu e concorda com estes Termos de Uso e com a Politica de Privacidade.",
      "Caso utilize o sistema em nome de uma empresa, o usuario declara possuir autorizacao para registrar informacoes vinculadas a essa organizacao.",
    ],
  },
  {
    title: "2. Uso permitido",
    body: [
      "O sistema deve ser usado para controle pessoal ou organizacional de jornada, registro de horarios, justificativas, relatorios e configuracoes de perfil.",
      "O usuario e responsavel pela veracidade dos registros inseridos, importados ou ajustados, bem como pela guarda de suas credenciais.",
      "E proibido tentar burlar autenticacao, acessar dados de terceiros sem autorizacao, inserir conteudo ilegal, interferir na operacao do sistema ou usar a aplicacao para finalidade fraudulenta.",
    ],
  },
  {
    title: "3. Contas e responsabilidades",
    body: [
      "Cada conta pode visualizar e gerenciar seus proprios dados, conforme permissoes do sistema.",
      "O usuario e responsavel por manter seus dados atualizados e por usar a aplicacao de acordo com a finalidade declarada.",
      "A empresa ou responsavel controlador deve definir orientacoes internas para uso correto dos registros, quando aplicavel.",
    ],
  },
  {
    title: "4. Registros de ponto e relatorios",
    body: [
      "Os calculos, relatorios e importacoes sao ferramentas de apoio e devem ser conferidos pelo usuario ou responsavel antes de qualquer uso trabalhista, financeiro, disciplinar ou contabil.",
      "A aplicacao nao substitui assessoria juridica, contabil, trabalhista ou decisao oficial do empregador sobre jornada, compensacao, horas extras ou banco de horas.",
    ],
  },
  {
    title: "5. Disponibilidade e alteracoes",
    body: [
      "O sistema pode passar por manutencoes, atualizacoes, indisponibilidades temporarias ou ajustes de funcionalidades.",
      "Termos, politicas e recursos podem ser alterados para refletir mudancas legais, tecnicas ou operacionais. A versao vigente deve indicar a data de ultima atualizacao.",
    ],
  },
  {
    title: "6. Propriedade intelectual",
    body: [
      "Codigo, marca, interface, textos, fluxos e elementos visuais do Meu Ponto CLT pertencem aos respectivos titulares, exceto componentes de terceiros usados conforme suas licencas.",
      "O uso do sistema nao concede ao usuario direitos sobre o software alem da permissao limitada de acesso e uso conforme estes Termos.",
    ],
  },
  {
    title: "7. Limitacao de responsabilidade",
    body: [
      "Na maxima extensao permitida por lei, o Meu Ponto CLT nao se responsabiliza por perdas decorrentes de dados incorretos informados pelo usuario, uso indevido, credenciais compartilhadas, falhas de terceiros ou decisoes tomadas sem conferencia dos relatorios.",
      "Nada nestes Termos limita direitos indisponiveis do consumidor, do trabalhador ou do titular de dados previstos na legislacao aplicavel.",
    ],
  },
  {
    title: "8. Encerramento",
    body: [
      "O acesso pode ser suspenso ou encerrado em caso de violacao destes Termos, risco de seguranca, ordem legal ou encerramento da relacao contratual aplicavel.",
      "O encerramento nao elimina automaticamente dados que precisem ser preservados por obrigacao legal, auditoria, exercicio regular de direitos ou outra base legal valida.",
    ],
  },
]

export const complianceSections = [
  {
    title: "1. Papeis LGPD",
    body: [
      "Controlador: pessoa fisica ou juridica que decide as finalidades e meios de tratamento dos dados no uso do Meu Ponto CLT.",
      "Operador: fornecedor que trata dados pessoais em nome do controlador, como hospedagem, banco de dados, autenticacao, analytics, suporte e monitoramento.",
      "Encarregado: pessoa indicada para atuar como canal entre controlador, titulares e ANPD, quando aplicavel.",
    ],
  },
  {
    title: "2. Inventario minimo de dados",
    body: [
      "Manter registro atualizado de categorias de dados tratados: conta, perfil, jornada, justificativas e relatorios.",
      "Mapear origem dos dados, finalidade, base legal, usuarios com acesso, operadores envolvidos, prazo de retencao e medidas de seguranca.",
    ],
  },
  {
    title: "3. Controles tecnicos ja previstos no projeto",
    body: [
      "Autenticacao via Supabase Auth.",
      "Row Level Security no banco para limitar acesso ao usuario autenticado dono dos dados.",
      "Separacao entre dados de autenticacao, perfil, jornada e justificativas.",
      "Desativacao de contas sem excluir historico imediatamente.",
    ],
  },
  {
    title: "4. Controles operacionais recomendados",
    body: [
      "Nomear responsavel por privacidade e publicar canal de atendimento ao titular.",
      "Revisar periodicamente usuarios ativos.",
      "Definir politica de retencao para registros de jornada, justificativas e contas inativas.",
      "Formalizar contratos com operadores, incluindo confidencialidade, seguranca, suboperadores e tratamento internacional, se houver.",
      "Registrar incidentes, avaliar risco aos titulares e comunicar ANPD/titulares quando exigido.",
      "Manter backup, plano de restauracao, revisao de acessos e orientacoes internas de uso correto.",
    ],
  },
  {
    title: "5. Atendimento aos titulares",
    body: [
      "Criar fluxo para receber, validar identidade, classificar, responder e registrar pedidos de titulares.",
      "Antes de excluir ou anonimizar dados, verificar obrigacoes legais trabalhistas, contabeis, fiscais, contratuais ou necessidade de defesa de direitos.",
    ],
  },
  {
    title: "6. Pontos a preencher antes de producao",
    body: [
      "Razao social, CNPJ/CPF e endereco do controlador.",
      "E-mail do encarregado ou canal de privacidade.",
      "Prazos oficiais de retencao por categoria de dado.",
      "Lista final de operadores e paises envolvidos em eventual transferencia internacional.",
      "Procedimento interno de resposta a incidentes e solicitacoes de titulares.",
    ],
  },
]
