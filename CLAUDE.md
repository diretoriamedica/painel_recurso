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
- **Prisma** ORM → **Google Cloud SQL for PostgreSQL** (instância `rhc-sistemas`, db `painelrecurso`)
- **NextAuth** (Credentials Provider, JWT) + **bcryptjs**
- **Tailwind CSS** (cores da marca em `tailwind.config.ts`)
- **Resend** (e-mail) · **lucide-react** (ícones) · **react-hot-toast** (feedback)

## Decisões / adaptações em relação ao ARQUITETURA.md

| Tema | Spec | Aqui |
|------|------|------|
| Banco | Postgres/Prisma | **Google Cloud SQL** (`corded-elevator-501121-q9:southamerica-east1:rhc-sistemas`, db `painelrecurso`), via Prisma + **driver adapter** (`@prisma/adapter-pg`) sobre o **Cloud SQL Connector** (mTLS por service account). Migrado do Supabase em 2026-07-17. |
| Storage de arquivo | AWS S3 | **Adiado** — `cloudPath` fica vazio; CSV é parseado direto. (Futuro: Supabase Storage) |
| E-mail | Abacus AI | **Resend** (`lib/email.ts`) |
| Admin master | Pedro Ambrosio (senha do doc) | **Lucas + Pedro**, senhas aleatórias do seed |
| Pacotes | Yarn | **npm** |

> ℹ️ Migrado do Supabase para o Cloud SQL em 2026-07-17. O projeto Supabase antigo
> (`painel_recurso` = `vvrjfoxkxkcnwqdpulxc`) foi mantido como **backup** até validação
> final — não é mais usado pelo app. O app fala com o Cloud SQL só via Prisma.

## Comandos

```bash
npm run dev                      # ambiente local (http://localhost:3000)
npm run build                    # build de produção
npx prisma generate              # gera o Prisma Client
npx prisma db push               # cria/atualiza tabelas (usa DIRECT_URL → Auth Proxy)
npx prisma studio                # inspeciona o banco
npx tsx scripts/safe-seed.ts     # seed: 2 admins (senha aleatória) + operadoras
npx tsc --noEmit                 # checagem de tipos

# Banco (Cloud SQL) — subir o Auth Proxy antes dos comandos de CLI/migração:
cloud-sql-proxy --gcloud-auth --port 5434 corded-elevator-501121-q9:southamerica-east1:rhc-sistemas
```

## Variáveis de ambiente (`.env`)

**Produção (Vercel)** — conexão via Cloud SQL Connector (não usa `DATABASE_URL`):
```
CLOUD_SQL_INSTANCE   # corded-elevator-501121-q9:southamerica-east1:rhc-sistemas
GCP_SA_KEY           # JSON da service account vercel-cloudsql (role Cloud SQL Client)
PGUSER               # painelrecurso
PGPASSWORD           # senha do usuário do banco
PGDATABASE           # painelrecurso
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
RESEND_FROM
```

**Local/CLI** — `DATABASE_URL`/`DIRECT_URL` apontam para o Cloud SQL Auth Proxy
(`127.0.0.1:5434`, `sslmode=disable`); ver `.env.example`. `lib/prisma.ts` usa o
connector quando `CLOUD_SQL_INSTANCE`+`GCP_SA_KEY` existem, senão cai no `DATABASE_URL`.

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

- **Banco (Cloud SQL)**: instância `rhc-sistemas` (PostgreSQL 18, edição ENTERPRISE,
  `db-custom-2-8192`, `southamerica-east1`, IP público + SSL enforced, **sem redes autorizadas** —
  só conexões autenticadas pela SA via connector). Database `painelrecurso`, usuário de baixo
  privilégio `painelrecurso` (dono do próprio db/schema, **não** superuser). Instância pensada para
  **consolidar** vários sistemas do ecossistema, um database por sistema.
- **Resend**: `RESEND_FROM` = `alertas@painelrecurso.redehc.com.br` (confirmar verificação do domínio
  no Resend antes de usar a tela de Notificações em produção).
- **Publicado**: `https://www.redehc.com.br/painelrecurso` (portal HUB faz rewrite → alias estável
  `painelrecurso-vercel.vercel.app`). App roda sob **basePath `/painelrecurso`** (vale também local:
  `http://localhost:3000/painelrecurso`).
- Deploy: `vercel deploy --prod --token <VERCEL_TOKEN de ~/.credentials> --scope lucas-projects-f7f32df9`
  (projeto `painelrecurso-vercel`). Env vars de produção já configuradas na Vercel.
- **Performance**: função Vercel co-localizada com o Cloud SQL via `vercel.json` → `regions: ["gru1"]`
  (São Paulo, mesma região da instância). Pool do connector com `max: 3` e `statement_timeout` 290s
  (`lib/prisma.ts`). Rota `/api/prazos` faz as consultas em paralelo.
- **Conexão Cloud SQL** (`lib/prisma.ts`): runtime usa `@google-cloud/cloud-sql-connector`
  (`IpAddressTypes.PUBLIC`, auth por `GCP_SA_KEY`) + `@prisma/adapter-pg`; init com top-level await
  cacheado, com guard de fase de build (`NEXT_PHASE`) para não chamar o GCP durante `next build`.
  `next.config.js`: `serverComponentsExternalPackages` (pg/adapter/connector) + `topLevelAwait`.
  A SA `vercel-cloudsql` tem `roles/cloudsql.client`; chave dedicada do Painel Recurso em `GCP_SA_KEY`.
- Subir local: rodar o Auth Proxy (ver Comandos) e `npm run dev` → http://localhost:3000/painelrecurso.
- **Red team (2026-06-28)**: revisão de segurança feita — modelo de autorização OK em todas as rotas,
  sem SQL raw/IDOR/segredos. Corrigido: escape de HTML nos e-mails de alerta (`send-alerts`).
- **basePath (gotcha importante)**: o Next só aplica o basePath em `<Link>`, `next/navigation` e
  `next/image` (este último **não** quando `unoptimized`). NÃO aplica em **`fetch()`** nem em `<img>`.
  Por isso: (a) o logo usa `<img src="/painelrecurso/logo-rede-casa.png">`; (b) **toda chamada de API
  no cliente usa `apiFetch()` de `lib/api.ts`** (prefixa `/painelrecurso`) — nunca `fetch('/api/...')`
  direto, senão a tela bate na raiz (404 no portal) e fica carregando infinitamente.
- **Hardening (Cloud SQL)**: instância sem redes autorizadas (só connector/SA), SSL enforced, usuário
  de app de baixo privilégio. O antigo `scripts/supabase-hardening.mjs` (roles `anon`/`authenticated`
  do Supabase) foi removido — não se aplica ao Cloud SQL. **Hardening futuro**: trocar a chave estática
  da SA por Workload Identity Federation (OIDC Vercel→GCP) para eliminar a chave de longa duração.
- Pode haver dados de **teste** (CSV de exemplo no slot ATUAL) — remova em `/admin/upload` se quiser começar limpo.
