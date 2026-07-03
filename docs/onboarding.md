# Onboarding Interativo

Este documento explica como usar, manter e testar o tour guiado do Meu Ponto CLT.

## Visão Geral

O onboarding fica em `components/onboarding/onboarding.jsx` e usa `driver.js` como motor do tour. A biblioteca cuida de spotlight, overlay, progresso, navegação por teclado e posicionamento responsivo.

A camada do app cuida de:

- mensagem de boas-vindas no primeiro acesso;
- troca automática entre Ponto, Relatório e Configurações;
- abertura da aba interna correta em Configurações;
- Central Primeiros passos;
- persistência do estado do tour no perfil do usuário.

## Como O Usuário Usa

No primeiro acesso, quando `users.onboarding_state = 0`, o app mostra uma mensagem de boas-vindas com:

- Começar tour;
- Pular por enquanto.

Durante o tour:

- as etapas destacam elementos reais da interface;
- o restante da tela fica escurecido;
- o progresso aparece como `Etapa X de Y`;
- as setas navegam entre etapas;
- `Esc` fecha o tour.

Depois do primeiro acesso, o usuário pode abrir novamente pelo card:

```text
Configurações > Perfil > Primeiros passos
```

Esse card abre a central com:

- iniciar novamente o tour;
- FAQ rápido;
- atalhos úteis;
- glossário e suporte.

## Persistência

A fonte de verdade é a coluna `users.onboarding_state`:

```sql
onboarding_state smallint NOT NULL DEFAULT 0
```

Valores:

- `0`: não fez ainda;
- `1`: concluiu;
- `2`: pulou.

Comportamento:

- se o valor for `0`, o tour abre automaticamente;
- ao concluir, o app salva `1`;
- ao pular ou fechar, o app salva `2`;
- se o cache do navegador for limpo, o app continua respeitando o estado salvo no banco;
- `localStorage` é usado apenas como cache/fallback rápido em `meu-ponto-clt:onboarding:{userId}`.

## Banco De Dados

A migration incremental fica em:

```text
supabase/migrations/20260703120000_add_user_onboarding_state.sql
```

A schema original também foi atualizada em:

```text
supabase/migrations/20260620103000_schema_atual_unico.sql
```

A constraint aceita somente `0`, `1` ou `2`:

```sql
CHECK (onboarding_state IN (0, 1, 2))
```

## Onde Fica Cada Parte

- `components/onboarding/onboarding.jsx`: etapas, provider, modal inicial, central e dicas contextuais.
- `components/app/app-shell.jsx`: conecta o provider à navegação e salva o estado no perfil.
- `lib/data/store.js`: lê `onboarding_state` como `user.onboardingState` e salva via `updateUser`.
- `components/settings/settings-view.jsx`: renderiza o card Primeiros passos.
- `app/globals.css`: estilos do `driver.js`, incluindo dark mode.

## Como Editar Textos

Edite o array `ONBOARDING_STEPS` em `components/onboarding/onboarding.jsx`.

Cada etapa possui:

- `id`: identificador interno;
- `area`: aba principal que deve estar visível (`ponto`, `relatorio` ou `config`);
- `settingsSection`: aba interna de Configurações, quando necessário (`perfil`, `justificar` ou `planilha`);
- `selector`: valor do atributo `data-tour-id` destacado;
- `title`: título da etapa;
- `description`: texto curto da explicação;
- `example`: exemplo de como usar, sem criar dados reais;
- `placement`: preferência de posição do painel (`top` ou `bottom`).

## Como Adicionar Uma Etapa

1. Adicione um `data-tour-id` ao elemento que será destacado.
2. Crie uma entrada em `ONBOARDING_STEPS`.
3. Defina `area` para o tour navegar até a tela certa.
4. Se a etapa estiver em Configurações, defina `settingsSection`.
5. Use exemplos instrutivos, por exemplo: “Exemplo: para corrigir uma saída, abra o dia na planilha, revise os horários e salve o ajuste.”

## Dicas Contextuais

Use `ContextualTip` para pequenas dicas fora do tour completo.

Exemplo:

```jsx
<ContextualTip>
  Use filtros para localizar registros mais rapidamente.
</ContextualTip>
```

## Como Testar

Para simular um usuário novo no banco:

```sql
UPDATE users
SET onboarding_state = 0
WHERE id = 'ID_DO_USUARIO';
```

Para marcar como concluído:

```sql
UPDATE users
SET onboarding_state = 1
WHERE id = 'ID_DO_USUARIO';
```

Para marcar como pulado:

```sql
UPDATE users
SET onboarding_state = 2
WHERE id = 'ID_DO_USUARIO';
```

Para limpar o cache local durante testes:

```js
localStorage.removeItem("meu-ponto-clt:onboarding:ID_DO_USUARIO")
```

Mesmo limpando o cache local, o banco continua sendo a fonte de verdade.

## Checklist De Qualidade

Antes de finalizar uma mudança no tour:

- testar em tema claro e escuro;
- testar em desktop e mobile;
- confirmar que o destaque aponta para o elemento certo;
- confirmar que a etapa navega para a aba correta;
- confirmar que concluir salva `onboarding_state = 1`;
- confirmar que pular/fechar salva `onboarding_state = 2`;
- confirmar que o tour não abre automaticamente quando o estado é `1` ou `2`.
