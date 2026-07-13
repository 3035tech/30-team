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
| Auth | Tabela `users` + JWT em cookie httpOnly |
| Roles | `admin`, `direction`, `hr` |
| Config | `process.env` (Compose / K8s / Vercel / etc.) |

---

## Estrutura do projeto

```
30Team/
├── app/
│   ├── page.jsx                 ← Landing / teste (client)
│   ├── t/[token]/               ← Entrada pública por empresa
│   ├── v/[token]/               ← Entrada pública por vaga
│   ├── assessment/              ← Fluxos de avaliação (eneagrama / AE)
│   ├── login/                   ← Login do painel
│   ├── dashboard/               ← Painel (SSR + tabs: overview, equipe, vagas…)
│   └── api/                     ← results, auth, admin, ae, public, cron…
├── lib/                         ← DB, auth, i18n, pipeline, métricas, scoring…
├── migrations/                  ← Schema versionado (fonte canônica)
├── scripts/
│   ├── migrate.js               ← npm run db:migrate
│   ├── rds-bootstrap-completo.sql
│   ├── scripts-banco-pendentes.sql
│   └── seed-*.js / clear-data.js
├── docs/                        ← Rubrica, LGPD
├── init.sql                     ← Stub Docker only (vazio de propósito)
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

**SQL:** na raiz só `init.sql` (montagem Docker). Schema e deltas ficam em `migrations/` e `scripts/`. Ver [`migrations/README.md`](migrations/README.md).

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
1. Abre /t/<token> (empresa) ou /v/<token> (vaga)
2. Informa dados → responde questões do eneagrama (54, sorteadas)
3. POST /api/results → grava no Postgres
4. Vê o resultado na tela
```

### Gestor no dashboard

```
1. /login → JWT em cookie httpOnly
2. /dashboard → Server Component lê o Postgres (dados por aba)
3. Abas: visão geral, equipe, compatibilidade, vagas, motivadores, etc.
```

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Credenciais do banco | Só no servidor |
| Autenticação | JWT httpOnly |
| Rotas do painel | Middleware + roles `admin` / `direction` / `hr` |
| Senha | `users.password_hash` (bcrypt) |
| Escrita do teste | Endpoints públicos de resultado / convite (com token de link) |

---

## Variáveis de ambiente

Principais (lista completa em `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_*` | Conexão ao banco |
| `POSTGRES_READ_HOST` | Réplica só-leitura (opcional) |
| `BOOTSTRAP_ADMIN_EMAIL` / `_PASSWORD` | Admin inicial |
| `JWT_SECRET` | Assinatura do JWT (≥32 chars em produção) |
| `NEXT_PUBLIC_APP_URL` | URL pública (cookie Secure em HTTPS) |
| `COOKIE_SECURE` | Força Secure (`true`/`false`) |
| `RETENTION_DAYS` | Retenção / LGPD |

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
