# 30Team
> Perfis e dinâmica de equipe (time interno e contratações) — Next.js + Postgres + Docker/K8s

---

## Arquitetura

```
Navegador (React) → Next.js (App Router) → Postgres
     cliente              servidor               banco
```

- **Frontend**: React com Next.js App Router
- **Backend**: API Routes + Server Components do Next.js
- **Banco de dados**: PostgreSQL 16
- **Autenticação**: usuários na tabela `users` + JWT em cookie httpOnly
- **Containers**: Docker + docker-compose
- **Configuração**: a app lê variáveis via `process.env` (K8s/Compose/Vercel/etc.)

---

## Estrutura do projeto

```
30Team/
├── app/
│   ├── layout.jsx                  ← Layout raiz
│   ├── page.jsx                    ← Home + Teste + Resultado (client)
│   ├── t/[token]/page.jsx          ← Entrada pública por empresa (client)
│   ├── login/page.jsx              ← Login do gestor (client)
│   ├── dashboard/
│   │   ├── page.jsx                ← Busca dados no banco (server)
│   │   └── DashboardClient.jsx     ← UI do dashboard (client)
│   └── api/
│       ├── results/route.js        ← GET /api/results, POST /api/results
│       ├── admin/
│       │   ├── companies/route.js  ← GET/POST empresas (admin)
│       │   ├── companies/[id]/link ← POST rotaciona token (admin)
│       │   ├── users/route.js      ← GET/POST lista/cria usuários (admin)
│       │   └── users/[userId]      ← DELETE exclui usuário (admin)
│       └── auth/
│           ├── login/route.js      ← POST /api/auth/login
│           └── logout/route.js     ← POST /api/auth/logout
├── lib/
│   ├── db.js                       ← Connection pool com Postgres (pg)
│   ├── auth.js                     ← JWT + bcrypt helpers
│   └── data.js                     ← 300 questões, tipos, matriz de compatibilidade
├── middleware.js                   ← Protege /dashboard com JWT
├── migrations/                     ← Schema do banco (aplicado via scripts/migrate.js)
├── scripts/migrate.js              ← Aplica migrations + bootstrap admin
├── scripts/seed-data.js            ← Popula dados fake (opcional)
├── scripts/clear-data.js           ← Limpa dados (dev)
├── init.sql                        ← Bootstrap do banco no Docker (cria DB/user se necessário)
├── Dockerfile                      ← Build multi-stage da aplicação
├── docker-compose.yml              ← Produção (app + postgres)
├── docker-compose.dev.yml          ← Dev com hot reload
└── .env.example                    ← Template de variáveis de ambiente
```

---

## Quickstart com Docker

### 1. Clonar e configurar

```bash
git clone <seu-repositorio>
cd 30Team

# Copiar e editar o .env
cp .env.example .env
```

Editar o `.env` com suas configurações:

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=enneagram
POSTGRES_USER=enneagram_user
POSTGRES_PASSWORD=troque_esta_senha_forte

BOOTSTRAP_ADMIN_EMAIL=admin@suaempresa.com
BOOTSTRAP_ADMIN_PASSWORD=sua_senha_do_dashboard

JWT_SECRET=gere_um_valor_longo_aqui

# URL externa usada para decidir cookie Secure em produção (HTTPS)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Para gerar um JWT_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Subir em produção

```bash
docker compose up -d
```

O docker-compose irá:
- Subir o container do **Postgres**
- Fazer o **build** da aplicação Next.js (com `output: 'standalone'`)
- Subir o container da **app** na porta 3000

Aguarde ~2 minutos no primeiro build. Após isso:
- **Teste (exige link por empresa)**: crie a empresa no dashboard e use `http://localhost:3000/t/<token>`
- **Dashboard**: http://localhost:3000/login

### 3. Desenvolvimento com hot reload

```bash
docker compose -f docker-compose.dev.yml up
```

As alterações nos arquivos são refletidas automaticamente (hot reload).

---

## Como funciona o fluxo de dados

### Funcionário responde o teste
```
1. Acessa o link da empresa: http://seu-dominio.com/t/<token>
2. Digite o nome → responde 54 questões (sorteadas do banco de 300)
3. Clica em uma opção → próxima questão automática
4. Ao final: React faz POST /api/results
5. API Route (servidor) salva no Postgres
6. Usuário vê o resultado
```

## Resetar a base (dev)
- Para zerar o banco (inclui companies/links), remova o volume do Postgres e suba novamente:

```bash
docker compose down -v
docker compose up -d
```

- Em dev (`docker-compose.dev.yml`), o comando é equivalente:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up
```

### Gestor acessa o dashboard
```
1. Acessa /login → digita a senha
2. POST /api/auth/login → servidor verifica senha, gera JWT, seta cookie httpOnly
3. Redirect para /dashboard
4. Next.js Server Component busca dados DIRETAMENTE no Postgres (sem API)
5. Página chega ao browser já com os dados renderizados
```

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Credenciais do banco | Só no servidor, nunca no browser |
| Autenticação | JWT em cookie httpOnly (inacessível ao JavaScript) |
| Proteção de rotas | Middleware verifica JWT em toda rota /dashboard |
| Senha do gestor | Verificada contra `users.password_hash` (bcrypt) |
| Brute force | Delay de 500ms em tentativas inválidas |
| Leitura de resultados | Só com JWT válido (apenas admin autenticado) |
| Escrita de resultados | Aberta (qualquer funcionário pode salvar) |

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `POSTGRES_HOST` | Host do Postgres (nome do service no docker-compose) | `postgres` |
| `POSTGRES_PORT` | Porta do Postgres | `5432` |
| `POSTGRES_DB` | Nome do banco | `enneagram` |
| `POSTGRES_USER` | Usuário do banco | `enneagram_user` |
| `POSTGRES_PASSWORD` | Senha do banco | `senha_forte_aqui` |
| `BOOTSTRAP_ADMIN_EMAIL` | Email do admin inicial (criado no primeiro `db:migrate`) | `admin@empresa.com` |
| `BOOTSTRAP_ADMIN_PASSWORD` | Senha do admin inicial (criado no primeiro `db:migrate`) | `minha_senha` |
| `JWT_SECRET` | Segredo para assinar os tokens JWT | `string_aleatoria_longa` |
| `NEXT_PUBLIC_APP_URL` | URL externa (define cookie Secure quando HTTPS) | `http://localhost:3000` |
| `COOKIE_SECURE` | Força cookie Secure (`true`/`false`) | `false` |
| `RETENTION_DAYS` | Retenção/LGPD (limpeza de dados antigos) | `180` |

---

## Deploy em produção (VPS ou EC2)

1. Instale Docker e Docker Compose na máquina
2. Clone o repositório
3. Configure o `.env`
4. Rode `docker compose up -d`
5. Configure um reverse proxy (Nginx ou Traefik) na porta 3000
6. Configure SSL com Certbot (Let's Encrypt)

### Exemplo de configuração Nginx

```nginx
server {
    listen 80;
    server_name enneagram.3035tech.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name enneagram.3035tech.com;

    ssl_certificate     /etc/letsencrypt/live/enneagram.3035tech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/enneagram.3035tech.com/privkey.pem;

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
# Rodar local sem Docker (precisa de Postgres rodando)
npm install
cp .env.example .env
npm run db:migrate
npm run dev

# Migrations / dados
npm run db:migrate
npm run db:seed
npm run db:clear

# Ver logs da aplicação
docker compose logs -f app

# Ver logs do banco
docker compose logs -f postgres

# Acessar o banco diretamente
docker compose exec postgres psql -U enneagram_user -d enneagram

# Ver todos os resultados no banco
docker compose exec postgres psql -U enneagram_user -d enneagram \
  -c "SELECT name, top_type, created_at FROM results ORDER BY created_at DESC;"

# Parar tudo
docker compose down

# Parar e apagar os dados do banco
docker compose down -v

# Rebuild após mudanças no código
docker compose up -d --build
```

---

## Suporte
contact@3035tech.com | +55 51 99644-2104
