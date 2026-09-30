# Etapa 2 — Árvore 1-12-144 e Metas/Lançamentos

Continua como demonstração, sem login nem servidor. Os dados ficam salvos no navegador.

## 1. Árvore hierárquica 1-12-144
- Nova aba "Rede" no painel do Líder: Líder Principal no topo, 12 discípulos diretos e os 12 de cada um (144 no total).
- Cada nome da rede mostra o resultado próprio e o total somado de quem está abaixo dele.
- Você pode abrir e fechar cada ramo, buscar por nome e ver a porcentagem da meta atingida (barra laranja).
- Ao clicar em alguém, abre um painel lateral com detalhes, histórico de lançamentos e a posição dele na rede.

## 2. Metas
- O Líder define metas mensais por indicador (ex.: membros na célula, visitantes, consolidados, encontros) para a rede toda ou para cada discípulo.
- As metas se dividem automaticamente pelos níveis de baixo, e o líder pode ajustar os valores.

## 3. Lançamentos
- No painel do Discípulo, um formulário rápido para registrar resultados: data, indicador, quantidade e observação.
- O discípulo vê seu histórico, pode editar ou excluir o que lançou e acompanha o progresso em relação à meta.
- Cada lançamento atualiza na hora os totais de toda a rede acima dele.
- O seletor de perfil permite escolher qual discípulo simular, para testar os lançamentos.

## Technical details
- O modelo de dados em árvore (pessoas, metas, lançamentos) vai para `src/lib/network.ts`, com somas recursivas guardadas em cache e com dados gerados de forma fixa para os 157 nomes.
- O estado fica em um store no cliente salvo no localStorage (lido depois da hidratação), com um botão para voltar aos dados de demonstração.
- Novos componentes: `network-tree.tsx`, `member-sheet.tsx`, `goals-editor.tsx`, `entry-form.tsx`; todos são ligados a `ministerial-dashboard.tsx`.
- Usar os tokens e a tipografia da Etapa 1. Formulários com validação feita com zod.
