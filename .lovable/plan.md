# Etapa 2 — Árvore 1-12-144 e Metas/Lançamentos

Continua como demonstração, sem login nem servidor. Os dados ficam salvos no navegador.

## 1. Árvore hierárquica 1-12-144
- Nova aba "Rede" no painel do Líder: Líder Principal no topo, 12 discípulos diretos e os 12 de cada um (144 no total).
- Cada nome da rede mostra o resultado próprio e o total somado de quem está abaixo dele.
- Você pode abrir e fechar cada ramo, buscar por nome e ver a porcentagem da meta atingida (barra laranja).
- Ao clicar em alguém, abre um painel lateral com detalhes, histórico de lançamentos e a posição dele na rede.

## 2. Metas (mensais)
Existem apenas estes indicadores:

**Parceiro de Deus (oferta financeira, em R$)**
- No início de cada mês, cada discípulo define sua meta junto com o líder direto dele, de acordo com a árvore (o líder aprova ou ajusta a meta de cada um dos seus 12).
- O Líder Principal define a meta mensal da equipe inteira.
- O painel mostra a meta da equipe, a soma das metas individuais e o valor realizado, para você comparar.

**Arregimentação (pessoas levadas ao culto)**
- É registrada separadamente em cada culto: Terça da Fé, Arena e Culto da Família.

**Membresia (calculada automaticamente, sem lançamento)**
- Membresia = 30% da Terça da Fé + 50% da Arena + 100% do Culto da Família.
- Exemplo: 10 + 10 + 10 dá 3 + 5 + 10 = 18 de membresia.

## 3. Lançamentos
- No painel do Discípulo, um formulário rápido com data, tipo (oferta Parceiro de Deus ou arregimentação por culto), valor/quantidade e observação.
- O discípulo vê seu histórico, pode editar ou excluir o que lançou e acompanha o progresso em relação à meta do mês.
- Cada lançamento atualiza na hora a membresia e os totais de toda a rede acima dele.
- O seletor de perfil permite escolher qual discípulo simular, para testar os lançamentos.
- Há um seletor de mês, para ver as metas e os resultados de meses anteriores.

## Technical details
- O modelo de dados em árvore (pessoas, metas, lançamentos) vai para `src/lib/network.ts`, com somas recursivas guardadas em cache e com dados gerados de forma fixa para os 157 nomes.
- O estado fica em um store no cliente salvo no localStorage (lido depois da hidratação), com um botão para voltar aos dados de demonstração.
- Novos componentes: `network-tree.tsx`, `member-sheet.tsx`, `goals-editor.tsx`, `entry-form.tsx`; todos são ligados a `ministerial-dashboard.tsx`.
- Usar os tokens e a tipografia da Etapa 1. Formulários com validação feita com zod.
