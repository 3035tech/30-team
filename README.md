# 30Team

> Perfis e dinâmica de equipe (time interno e contratações) — Next.js + Postgres + Docker/K8s

Avaliação baseada no **modelo do Eneagrama** (tipos **T1–T9**): mapa de perfil de trabalho para triagem, comparativos e conversas — **não** substitui entrevista técnica nem é diagnóstico clínico.

Também há fluxo de **Motivadores** (Assessment Engine). Rubrica por vaga: [`docs/rubrica-por-vaga.md`](docs/rubrica-por-vaga.md). LGPD interno: [`docs/privacidade-lgpd-interno.md`](docs/privacidade-lgpd-interno.md).

---

## Arquitetura

```
Navegador (React) → Next.js (App Router) → PostgreSQL 16
```

| Camada | Detalhe |
|--------|---------|
| Frontend | React + Next.js App Router |
| Backend | API Routes + Server Components |
| Auth | Tabela `users` + JWT em cookie httpOnly (`session_version` revoga sessões) |
| Roles | `admin`, `direction`, `hr` |
| Config | `process.env` (Compose / K8s / Vercel / etc.) |

---

## Estrutura do projeto

```
30Team/
├── app/
│   ├── page.jsx                 ← Landing / teste (client)
│   ├── t/[token]/               ← Entrada pública por empresa (assessment)
│   ├── v/[token]/               ← Entrada pública por vaga (assessment; noindex)
│   ├── j/                       ← Índice + página SEO `/j/{slug}-{id}`
│   ├── c/[companySlug]/         ← Perfil público da empresa (opt-in)
│   ├── a/unsubscribe/           ← Cancelar alerta de vagas
│   ├── vagas/                   ← Legado → redirect 308 para `/j/…`
│   ├── empresas/                ← Legado → redirect 308 para `/c/…`
│   ├── vaga/[company]/[slug]/   ← Legado → redirect para `/j/{slug}-{id}`
│   ├── r/[token]/               ← Relatório cliente (shortlist)
│   ├── assessment/              ← Fluxos de avaliação (eneagrama / AE)
│   ├── login/                   ← Login do painel
│   ├── dashboard/               ← Painel (SSR + tabs; Guia = HelpTab)
│   └── api/                     ← results, auth, admin, ae, public, cron…
├── lib/                         ← DB, auth, i18n, pipeline, métricas, scoring…
├── migrations/                  ← Schema versionado (fonte canônica)
├── test/                        ← Provas (DTOV + Playwright) — ver test/README.md
│   ├── dtov/                    ← Postgres efêmero, fixtures, SQL/HTTP smoke
│   └── e2e/                     ← Browser (Chromium)
├── scripts/                     ← migrate, seeds, ops (não harness de teste)
├── docs/                        ← Rubrica, LGPD
├── playwright.config.js
├── init.sql                     ← Stub Docker only (vazio de propósito)
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

**SQL:** na raiz só `init.sql` (montagem Docker). Schema e deltas ficam em `migrations/` e `scripts/`. Ver [`migrations/README.md`](migrations/README.md).

**Provas / regressão:** [`test/README.md`](test/README.md) — `npm run dtov:full-app` (SQL + HTTP + browser).

---

## Banco de dados

| Arquivo / comando | Quando usar |
|-------------------|-------------|
| `npm run db:migrate` | Ambiente já existente — aplica `migrations/*.sql` pendentes |
| `scripts/rds-bootstrap-completo.sql` | Postgres novo (RDS / local) — schema completo de uma vez |
| `scripts/scripts-banco-pendentes.sql` | pgAdmin — bundle das migrações recentes (idempotente) |

```bash
# Migrações incrementais
npm run db:migrate

# Bootstrap completo (psql / pgAdmin)
psql "$DATABASE_URL" -f scripts/rds-bootstrap-completo.sql
```

---

## Quickstart

### 1. Configurar

```bash
cp .env.example .env
# Editar senhas, JWT_SECRET, BOOTSTRAP_ADMIN_*
```

Gerar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Produção (Docker)

```bash
docker compose up -d
```

- App: http://localhost:3000  
- Login: http://localhost:3000/login  
- Teste público: criar empresa no dashboard → link `/t/<token>`

### 3. Desenvolvimento (hot reload)

```bash
docker compose -f docker-compose.dev.yml up
```

### 4. Local sem Docker (Postgres já rodando)

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

---

## Fluxos principais

### Candidato / colaborador

```
1. Assessment: abre /t/<token> (empresa) ou /v/<token> (vaga) → responde o teste
2. Página pública SEO (opcional): /j/<slug>-<id> → lê a vaga → CTA para o /v/…
3. Índice: /j lista vagas públicas abertas (/vagas redireciona)
4. POST /api/results → grava no Postgres; vê o resultado na tela
```

### Gestor no dashboard

```
1. /login → JWT em cookie httpOnly (claim `sv` = `users.session_version`)
2. Logout / troca de senha / desativação incrementam `session_version` e invalidam JWTs antigos
3. APIs admin e SSR do painel revalidam usuário live (active, role, company) a cada request
4. /dashboard → auth leve pinta o shell (sidebar); queries da aba em Suspense (`load-dashboard-data.js`)
5. Abas: visão geral, equipe, compatibilidade, vagas, motivadores, Guia (Ajuda), etc.
6. Em Vagas: link /v/… (teste) e, se habilitado, página /j/{slug}-{id} (divulgação/SEO)
```

---

## Página pública da vaga (`/j/{slug}-{id}`)

- URL canônica indexável: `/j/{slug}-{id}` (id = `vacancies.id`; JobPosting JSON-LD, Open Graph / Twitter com imagem da marca).
- Legado `/vaga/{companySlug}/{vacancySlug}` redireciona (308) para a canônica — bookmarks antigos continuam válidos; se o slug mudar, o id na URL corrige com redirect.
- O link `/v/{token}` continua sendo o **assessment** (noindex; token pode rotacionar).
- Flags na vaga: página pública, permitir indexação, mostrar empresa, mostrar salário.
- Perfil da empresa (admin → Empresas): `website`, texto “sobre” e flag **página pública de carreiras** (`public_profile_enabled`). Canônica: `/c/{slug}` (neutra pt/en); legado `/empresas/{slug}` → 308. Sem opt-in → 404.
- Índice `/j`: busca, filtro de contrato, paginação; rodapé com **alerta de vagas** (`POST /api/public/job-alerts`). Cancelar: `/a/unsubscribe?token=…`. Ao publicar página pública (create ou ligar flag), dispara e-mail aos alertas ativos que casam com filtros — exige SMTP; sem SMTP é no-op e não bloqueia o save.
- Conteúdo exibido quando existir: título, empresa, tipo de contrato, salário (flag), datas (publicação / `target_date`), descrição, CTA, share.
- Sem campos no schema hoje (omitidos de propósito): localização, modalidade remoto/híbrido, logo empresa, senioridade, skills/benefícios separados.
- Encerrada ou `target_date` passado: agradecimento + relacionadas + `/j`; sem JobPosting / noindex / sem CTA de apply.
- SEO: `robots.txt` + `sitemap.xml` (só vagas `open`, indexáveis e prazo ok).
- Google Indexing API (opcional): `GOOGLE_INDEXING_ENABLED=true` + service account — push ao criar/atualizar/fechar página pública indexável (`lib/job-indexing.js`). Desligado por padrão; falha não bloqueia o save da vaga.
- Atribuição / funil: query `utm_*` e `?ref=` → cookie httpOnly `team30_job_attr` (7 dias, sem PII). Persistido em `assessments.attr_*` no submit da vaga; eventos em `job_funnel_events`. Analytics: `GET /api/admin/vacancies/[id]/analytics`.
- Referral (indicação): tabela `referral_codes`; APIs admin + **aba Indicação** no detalhe da vaga (criar, copiar `/j/…?ref=`, desativar, métricas). Analytics: `GET /api/admin/referral-codes/analytics`.

Migration: `migrations/030_company_profile_public_vacancy_page.sql` (+ `031` default indexável; `032` atribuição/funil; `033` referral; `035` job alerts; `036` `companies.public_profile_enabled`).

Doc técnica (arquitetura, envs, Indexing, funil, IA, checklist LGPD): [`docs/job-seo-and-distribution.md`](./docs/job-seo-and-distribution.md). Guia do painel: aba **Ajuda**.

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Credenciais do banco | Só no servidor |
| Autenticação | JWT httpOnly |
| Rotas do painel | Middleware + roles `admin` / `direction` / `hr` |
| Senha | `users.password_hash` (bcrypt) |
| Escrita do teste | Endpoints públicos de resultado / convite (com token de link) |
| SEO / funil | Sem candidato em sitemap/JSON-LD; analytics só autenticado — ver checklist em `docs/job-seo-and-distribution.md` |

---

## Variáveis de ambiente

Principais (lista completa em `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_*` | Conexão ao banco |
| `POSTGRES_READ_HOST` | Réplica só-leitura (opcional) |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | Admin inicial |
| `JWT_SECRET` | Assinatura do JWT (≥32 chars em produção) |
| `NEXT_PUBLIC_APP_URL` | URL pública (links de e-mail, Indexing, share) |
| `COOKIE_SECURE` | Força Secure (`true`/`false`) |
| `SMTP_HOST` + `MAIL_FROM` | E-mail (convites **e** job alerts ao publicar `/j`; sem SMTP = alerts no-op) |
| `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Detalhe SMTP |
| `OPENAI_API_KEY` | IA (rubrica, descrição de vaga, parecer `/r`) — opcional |
| `OPENAI_RUBRIC_MODEL` | Modelo (default `gpt-4o-mini`) |
| `GOOGLE_INDEXING_ENABLED` | `true` liga push Google Indexing (default off) |
| `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` | JSON inline ou path da service account |
| `GOOGLE_INDEXING_MOCK` | `1` = não chama Google (DTOV já mocka com `DTOV=1`) |
| `RETENTION_DAYS` | Retenção / LGPD |
| `CRON_SECRET` | Crons (lembretes, prazos, retenção de notificações) |

---

## Deploy (VPS / EC2)

1. Docker + Compose na máquina  
2. Clone + `.env`  
3. `docker compose up -d`  
4. Reverse proxy (Nginx/Traefik) → porta 3000 + SSL  

Exemplo Nginx:

```nginx
server {
    listen 443 ssl;
    server_name app.exemplo.com;
    ssl_certificate     /etc/letsencrypt/live/app.exemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.exemplo.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Comandos úteis

```bash
# Dados de desenvolvimento
npm run db:seed
npm run db:clear

# Provas (Postgres efêmero DTOV + HTTP + browser) — ver test/README.md
npm run dtov:reset
npm run dtov:full-app
DTOV_SKIP_BROWSER=1 npm run dtov:full-app
npm run dtov:down

# Logs
docker compose logs -f app
docker compose logs -f postgres

# psql no container
docker compose exec postgres psql -U enneagram_user -d enneagram

# Últimas avaliações
docker compose exec postgres psql -U enneagram_user -d enneagram -c \
  "SELECT c.full_name, a.top_type, a.created_at
   FROM assessments a
   JOIN candidates c ON c.id = a.candidate_id
   ORDER BY a.created_at DESC
   LIMIT 20;"

# Reset volume (dev)
docker compose down -v && docker compose up -d

# Rebuild
docker compose up -d --build
```

---

## Suporte

contact@3035tech.com · +55 51 99644-2104
