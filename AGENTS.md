# ClubStrategyEDITION

Sistema de gestão de turmas e listas de espera das aulas do Clube Pirassununga (login simples `esporte`/`1928`).
Reestrutura independente do projeto original — este repositório NÃO usa Lovable. O backend é o Supabase próprio
`bwllxwukpynvuupjnxxh` (publishable key + RLS público, igual ao projeto antigo). Hospedagem: King Host (build estático/SPA).

## Contexto

- REPOSITÓRIO: `https://github.com/DevCLube/ClubStrategy.git` (branch `main`).
- O projeto NÃO pode quebrar: após qualquer mudança rode `bun x tsc --noEmit` (0 erros obrigatório) e `bun run lint`.
- Build estático (SPA): `vite.config.ts` usa `spa: { enabled: true, prerender: { outputPath: "index" } }` — o King Host
  serve `dist/client` sem servidor Node. O app lê/escreve no Supabase direto do navegador.
- `.env` NÃO é versionado (contém a service role key). As variáveis do Supabase devem ser configuradas no painel do
  King Host (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).

## Banco de dados (Supabase bwllxwukpynvuupjnxxh)

- Tabelas: `categorias`, `alunos`, `professores`, `turmas`, `matriculas`, `historico`, `professor_modalidade`.
- Schema em `supabase/migrations/`. Todas têm RLS público (anon/authenticated) + GRANTs, mesmo padrão do projeto original.
- Atingido estado novo? O banco novo começa vazio (o usuário optou por começar 100% do zero — nada foi migrado).

## Workflow padrão

1. Verifique o estado antes de editar: `git status`, `git log --oneline -8`, `git fetch origin`.
2. Implemente seguindo o padrão visual: cards com borda vermelha, botões vermelhos, selos de status coloridos.
3. Valide: `bun x tsc --noEmit` (0 erros) e `bun run lint`.
4. Commit e push: `git add . && git commit -m "feat(...): descrição" && git push origin main`.
5. Confirmar push: `git ls-remote origin HEAD`.
