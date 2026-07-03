# Onboarding Interativo

O onboarding do app autenticado fica em `components/onboarding/onboarding.jsx`.

O motor do tour guiado usa `driver.js`, escolhido por ser leve, sem dependências externas e focado em spotlight, overlay, progresso, teclado e posicionamento responsivo. A camada do app continua responsável por boas-vindas, central de ajuda, persistência e troca automática de abas.

## Onde editar textos

Edite o array `ONBOARDING_STEPS`. Cada etapa possui:

- `id`: identificador interno;
- `area`: aba principal que deve estar visível (`ponto`, `relatorio` ou `config`);
- `settingsSection`: aba interna de Configurações, quando necessário (`perfil`, `justificar` ou `planilha`);
- `selector`: valor do atributo `data-tour-id` que será destacado;
- `title`, `description` e `example`: textos exibidos no painel;
- `placement`: preferência de posição do painel (`top` ou `bottom`).

Os exemplos devem mostrar como realizar uma ação e não devem pedir para o usuário criar dados reais.

## Como adicionar uma nova etapa

1. Adicione `data-tour-id="nome-do-alvo"` no elemento da interface que deve ser destacado.
2. Inclua uma nova entrada em `ONBOARDING_STEPS` usando `selector: "nome-do-alvo"`.
3. Se o alvo estiver em outra aba, informe `area`. Se estiver em Configurações, informe também `settingsSection`.

## Central de ajuda

O acesso permanente fica em um card da aba Perfil de Configurações, usando `OnboardingHelpCard` em `components/settings/settings-view.jsx`.

A central exibe:

- reinício do tour;
- FAQ rápido;
- atalhos úteis;
- glossário e contato de suporte operacional.

## Dicas contextuais

Use `ContextualTip` em pontos onde a explicação ajuda o fluxo sem abrir o tour completo.

Exemplo:

```jsx
<ContextualTip>
  Use filtros para localizar registros mais rapidamente.
</ContextualTip>
```

## Persistência

O status principal fica no banco, na coluna `users.onboarding_state`:

```sql
onboarding_state smallint NOT NULL DEFAULT 0
```

Valores usados:

- `0`: não fez ainda;
- `1`: concluído;
- `2`: pulou por enquanto.

Quando o valor é `0`, a mensagem de boas-vindas aparece no primeiro acesso. Depois que o usuário conclui ou pula, o provider salva `1` ou `2` no perfil e não abre o tour automaticamente de novo para a mesma conta, mesmo se o cache local for limpo.

O `localStorage` (`meu-ponto-clt:onboarding:{userId}`) fica apenas como cache/fallback rápido. A fonte de verdade é o banco.

Para reiniciar manualmente, use o card Primeiros passos em Configurações. Reiniciar pelo card não muda o estado para `0`; ao fechar ou concluir novamente, o estado volta a ser persistido como `2` ou `1`.
