# CLAUDE.md — Painel Recurso (Gestor de Glosas)

> **Regra permanente de interação:** ao responder ao Lucas, **comece sempre chamando-o pelo nome ("Lucas, ...")**, antes de qualquer outra coisa.

## Visão geral

Sistema de **gestão de glosas** da **Rede Hospital Casa**. Fluxo semanal:

1. Upload de um **CSV** de glosas (exportado do sistema de faturamento).
2. Cálculo automático do **prazo-limite de recurso** por operadora (`dataRecebimento + prazoDias`).
3. **Dashboard semáforo** de urgência: 🔴 Vencido / 🟡 Esta Semana / 🟢 Futuro.
4. **Acompanhamento semanal**: cruza a semana anterior (W1) com a atual (ATUAL) → Resolvido / Parcial / Pendente.
5. **Alertas por e-mail** dos casos urgentes.

Fonte de verdade detalhada da especificação: **`ARQUITETURA.md`** (na raiz).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** ORM → **Supabase Postgres**
- **NextAuth** (Credentials Provider, JWT) + **bcryptjs**
- **Tailwind CSS** (cores da marca em `tailwind.config.ts`)
- **Resend** (e-mail) · **lucide-react** (ícones) · **react-hot-toast** (feedback)

## Decisões / adaptações em relação ao ARQUITETURA.md

| Tema | Spec | Aqui |
|------|------|------|
| Banco | Postgres/Prisma | **Supabase** projeto `painel_recurso` (`vvrjfoxkxkcnwqdpulxc`), via Prisma + connection string |
| Storage de arquivo | AWS S3 | **Adiado** — `cloudPath` fica vazio; CSV é parseado direto. (Futuro: Supabase Storage) |
| E-mail | Abacus AI | **Resend** (`lib/email.ts`) |
| Admin master | Pedro Ambrosio (senha do doc) | **Lucas + Pedro**, senhas aleatórias do seed |
| Pacotes | Yarn | **npm** |

> ⚠️ O MCP do Supabase nesta máquina aponta para **outro** projeto (Prateleira RHC, `wynydyiatuoffrqrhege`). **Não** crie tabelas do Painel Recurso lá. Este projeto fala com o banco só via Prisma/connection string.

## Comandos

```bash
npm run dev                      # ambiente local (http://localhost:3000)
npm run build                    # build de produção
npx prisma generate              # gera o Prisma Client
npx prisma db push               # cria/atualiza as tabelas no Supabase (usa DIRECT_URL)
npx prisma studio                # inspeciona o banco
npx tsx scripts/safe-seed.ts     # seed: 2 admins (senha aleatória) + 20 operadoras
npx tsc --noEmit                 # checagem de tipos
```

## Variáveis de ambiente (`.env`)

```
DATABASE_URL   # Supabase pooler (porta 6543, ?pgbouncer=true) — runtime
DIRECT_URL     # Supabase direct (porta 5432) — migrations/db push
NEXTAUTH_SECRET
NEXTAUTH_URL   # http://localhost:3000 em dev
RESEND_API_KEY
RESEND_FROM    # "Painel Recurso <remetente@dominio-verificado>"
```

Pegue `DATABASE_URL`/`DIRECT_URL` em: Supabase → Connect → ORMs → Prisma.

## Estrutura

```
app/
  api/                 rotas (signup, usuarios, upload-csv, arquivos, prazos,
                       recalculate, dashboard[/evolucao /acompanhamento], filters, send-alerts)
  components/          header, kpi-card, multi-select, data-table
  dashboard/           dashboard + layout (Header)
  admin/               upload, prazos, usuarios, notificacoes (+ layout)
  login/ signup/       autenticação
lib/                   prisma, auth-options, session, csv-parser, prazo-calculator,
                       formatters, email, constants, recalc, utils
prisma/schema.prisma   User, PrazoOperadora, ArquivoCarregado, CasoGlosa
scripts/safe-seed.ts   seed idempotente
types/next-auth.d.ts   tipagem da sessão (id + permissões)
```

## Regras de negócio críticas (NÃO quebrar)

1. **Recalcular SÓ o slot ATUAL** (`lib/recalc.ts`). W1/W2/W3 são *snapshots congelados* da data do upload. Recalcular o histórico distorce a evolução.
2. **Normalizar operadora** antes de comparar (`normalizeOperadora`: sem acento/espaço, uppercase). "SUL AMERICA" == "SULAMERICA".
3. **Limite de 4 arquivos**; **1 arquivo por slot** (ATUAL/W1/W2/W3).
4. **CSV em latin1**, vírgula, 28 colunas (`lib/csv-parser.ts`).
5. **Aprovação obrigatória** de novos usuários (`aprovado`); 1º usuário vira admin aprovado. Login bloqueia não aprovados.
6. **Métrica central** "Glosa Inicial em Andamento" = `glosaNaoSubmetida + glosaNaoAnalisada` (`emAndamento` em `lib/constants.ts`).
7. Operadoras novas no CSV são auto-criadas com `prazoDias: null` (pendentes), exibidas em destaque.
8. Moeda sempre `pt-BR` / `R$` (`lib/formatters.ts`).

## Matriz de permissões

| Ação | Permissão |
|------|-----------|
| Ver dashboard | autenticado |
| Upload / slots | `isAdmin` ou `canUpload` |
| Recalcular | `isAdmin` ou `canUpload` ou `canEditPrazos` |
| Editar prazos | `isAdmin` ou `canEditPrazos` |
| Usuários / Notificações | `isAdmin` |

## Status atual

**Funcional** ✅ — `.env` configurado, tabelas criadas no Supabase (`prisma db push`), seed rodado
(2 admins + 20 operadoras), e fluxo validado ponta a ponta (login → upload → slot ATUAL → dashboard
com KPIs corretos). `build` + `tsc` limpos.

- **Região do Supabase**: `us-west-2`, shard pooler `aws-1` → host `aws-1-us-west-2.pooler.supabase.com`
  (a senha do banco tem chars especiais → vai **URL-encoded** no `.env`).
- **Resend**: `RESEND_FROM` = `alertas@painelrecurso.redehc.com.br` (confirmar verificação do domínio
  no Resend antes de usar a tela de Notificações em produção).
- **Publicado**: `https://www.redehc.com.br/painelrecurso` (portal HUB faz rewrite → alias estável
  `painelrecurso-vercel.vercel.app`). App roda sob **basePath `/painelrecurso`** (vale também local:
  `http://localhost:3000/painelrecurso`).
- Deploy: `vercel deploy --prod --token <VERCEL_TOKEN de ~/.credentials> --scope lucas-projects-f7f32df9`
  (projeto `painelrecurso-vercel`). Env vars de produção já configuradas na Vercel.
- **Performance**: função Vercel co-localizada com o Supabase via `vercel.json` → `regions: ["pdx1"]`
  (us-west-2). `DATABASE_URL` usa `&connection_limit=1` (serverless + pgbouncer). Rota `/api/prazos`
  faz as consultas em paralelo. Resultado: endpoints <0,6s (antes prazos chegava a 20s frio).
- **MCP Supabase do projeto**: `.mcp.json` registra o MCP apontando para `vvrjfoxkxkcnwqdpulxc`
  (project_ref correto). Requer autenticação interativa (`claude /mcp` → supabase → Authenticate).
- Subir local: `npm run dev` → http://localhost:3000/painelrecurso.
- **Red team (2026-06-28)**: revisão de segurança feita — modelo de autorização OK em todas as rotas,
  sem SQL raw/IDOR/segredos. Corrigido: escape de HTML nos e-mails de alerta (`send-alerts`).
- **Logo + basePath (gotcha)**: com `images.unoptimized`, o `next/image` NÃO prefixa o basePath em
  `src` string → logo quebrava. Solução: `<img src="/painelrecurso/logo-rede-casa.png">` (caminho
  já com o prefixo) no login/signup/header.
- **Hardening Supabase** (`scripts/supabase-hardening.mjs`): RLS ligado nas 4 tabelas; revogado
  EXECUTE de `public.rls_auto_enable()` de PUBLIC/anon/authenticated (resolve os 2 warnings do
  Security Advisor) e revogados os grants amplos de anon/authenticated nas tabelas (app só usa Prisma/postgres).
- Pode haver dados de **teste** (CSV de exemplo no slot ATUAL) — remova em `/admin/upload` se quiser começar limpo.
