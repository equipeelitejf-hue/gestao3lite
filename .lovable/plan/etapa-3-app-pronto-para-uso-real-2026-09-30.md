# Etapa 3 — App pronto para uso real

Remover todos os dados de exemplo (os 156 nomes, as metas e os lançamentos) e passar a salvar tudo com segurança no Lovable Cloud, com uma conta para cada pessoa.

## 1. Contas e acesso
- Tela de entrada com e-mail e senha, com opção de recuperar a senha.
- A primeira pessoa que criar conta vira o **Líder Principal**.
- Cada líder cadastra seus discípulos informando nome e e-mail, até 12 por líder. Quando o discípulo criar a conta com esse mesmo e-mail, ele entra automaticamente na posição certa da árvore.
- Cada pessoa vê apenas os próprios dados e os da rede abaixo dela. O Líder Principal vê tudo.
- O seletor de perfil de teste é removido e o painel exibido depende de quem entrou.

## 2. Cadastro de discípulos
- Na aba "Minha equipe": adicionar, editar nome e e-mail e remover discípulos.
- Cada discípulo aparece como "Aguardando cadastro" até criar a conta.
- Quem tem um discípulo abaixo também pode cadastrar os 12 dele, formando a rede 1 → 12 → 144.

## 3. Metas e lançamentos com dados reais
- As regras continuam as mesmas: Parceiro de Deus, arregimentação por culto e membresia (30% / 50% / 100%).
- O líder define as metas da própria equipe e só o Líder Principal define a meta geral.
- Cada pessoa lança e edita apenas os próprios resultados.
- Quando ainda não houver dados, as telas mostram mensagens de orientação no lugar dos exemplos, como "Cadastre seu primeiro discípulo" ou "Nenhum lançamento neste mês".
- O botão "Restaurar dados de demonstração" é removido.

## Technical details
- Ativar o Lovable Cloud com login por e-mail e senha.
- Tabelas:
  - `members` (id, user_id nulo até o cadastro, parent_id, name, email, level)
  - `entries` (member_id, date, month, kind, value, note)
  - `personal_goals` (member_id, month, value)
  - `team_goals` (month, value)
  - `user_roles` separada, com o papel `admin` para o Líder Principal
- Um gatilho no cadastro vincula o `user_id` ao `members` com o mesmo e-mail. Se não houver nenhum `members`, a pessoa vira a raiz e recebe o papel de admin.
- Regras de acesso (RLS) com funções de segurança `is_ancestor_or_self(member)` e `has_role`. Um limite de 12 filhos por membro é validado no banco.
- Adicionar grants em todas as tabelas.
- As leituras e gravações passam a ser feitas via TanStack Query + cliente do banco. As somas da árvore continuam calculadas no cliente sobre os dados que cada pessoa pode ver.
- `src/lib/network.ts` perde o seed e o localStorage. O cálculo da membresia e as somas da árvore são mantidos.
- Rotas: `/auth` pública e o painel sob `_authenticated`.
