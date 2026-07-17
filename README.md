# Painel Recurso — Gestor de Glosas

Sistema de **gestão de glosas** da **Rede Hospital Casa**. Centraliza o controle dos prazos de
recurso por operadora, com um dashboard semáforo de urgência e acompanhamento semanal da resolução.

🔗 **Produção:** https://www.redehc.com.br/painelrecurso

---

## ✨ Funcionalidades

- **Upload semanal de CSV** de glosas (exportado do faturamento), com detecção automática de operadoras novas.
- **Cálculo automático do prazo-limite** de recurso por operadora (`dataRecebimento + prazoDias`).
- **Dashboard semáforo**: 🔴 Vencido · 🟡 Esta Semana · 🟢 Futuro, com KPIs e filtros por operadora/unidade.
- **Acompanhamento semanal**: cruza a semana anterior (W1) com a atual (ATUAL) para mostrar
  Resolvido / Parcial / Pendente.
- **Tabelas Por Unidade e Por Operadora** (ordenação, paginação, totais) e painel de evolução.
- **Alertas por e-mail** (Resend) dos casos vencidos ou vencendo em até 5 dias.
- **Autenticação** com aprovação de novos usuários e permissões granulares (admin, upload, prazos, notificações).

## 🧱 Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL ([Google Cloud SQL](https://cloud.google.com/sql), via Cloud SQL Connector)
- [NextAuth.js](https://next-auth.js.org/) (Credentials + JWT) + bcryptjs
- [Tailwind CSS](https://tailwindcss.com/) · [Resend](https://resend.com/) · lucide-react

## 🚀 Rodando localmente

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env   # e preencha os valores (Cloud SQL, NextAuth, Resend)

# 3. Banco de dados (Cloud SQL) — subir o Auth Proxy antes dos comandos de CLI
cloud-sql-proxy --gcloud-auth --port 5434 corded-elevator-501121-q9:southamerica-east1:rhc-sistemas &
npx prisma generate
npx prisma db push                 # cria as tabelas (via Auth Proxy)
npx tsx scripts/safe-seed.ts       # cria admins (senha aleatória) + operadoras

# 4. Desenvolvimento
npm run dev                        # http://localhost:3000/painelrecurso
```

> O app roda sob o **basePath `/painelrecurso`** (em produção e local).

### Variáveis de ambiente

Veja [`.env.example`](./.env.example):

| Variável | Descrição |
|----------|-----------|
| `CLOUD_SQL_INSTANCE` / `GCP_SA_KEY` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | Conexão de runtime (Vercel) ao Cloud SQL via connector + service account |
| `DATABASE_URL` / `DIRECT_URL` | Conexão local/CLI ao Cloud SQL via Auth Proxy (`127.0.0.1:5434`) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Configuração do NextAuth |
| `RESEND_API_KEY` / `RESEND_FROM` | Envio de e-mails de alerta |

## ☁️ Deploy (Vercel)

```bash
vercel deploy --prod
```

Publicado no projeto Vercel `painelrecurso-vercel`. O portal `www.redehc.com.br` encaminha
`/painelrecurso` para este app via rewrite. A função roda na região `gru1` (São Paulo, mesma do
Cloud SQL) para baixa latência.

## 📁 Estrutura

```
app/
  api/            rotas (upload-csv, prazos, dashboard, usuarios, send-alerts, ...)
  dashboard/      dashboard principal
  admin/          upload, prazos, usuarios, notificacoes
  login/ signup/  autenticação
  components/     header, kpi-card, multi-select, data-table
lib/              prisma, auth-options, csv-parser, prazo-calculator, recalc, email, ...
prisma/           schema.prisma
scripts/          safe-seed.ts (seed), import-prazos, recompute-snapshots, reset-password
```

## ⚙️ Regras de negócio

1. O recálculo de status afeta **apenas o slot ATUAL**; W1/W2/W3 são *snapshots* congelados.
2. Nomes de operadora são **normalizados** (sem acento/espaço, uppercase) antes de comparar.
3. Limite de **4 arquivos**; **1 arquivo por slot** (ATUAL / W1 / W2 / W3).
4. CSV em **latin1**, separado por vírgula, 28 colunas.
5. Métrica central "Glosa Inicial em Andamento" = `glosaNaoSubmetida + glosaNaoAnalisada`.

Detalhes completos da arquitetura em [`ARQUITETURA.md`](./ARQUITETURA.md); notas de
desenvolvimento/operação em [`CLAUDE.md`](./CLAUDE.md).

---

© Rede Hospital Casa — uso interno.
