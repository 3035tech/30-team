# Self-Service Signup — 30Team

Implementado nas migrations `051_self_service_signup.sql` e `052_analytics_tracking.sql`.

## Fluxo

1. **Landpage** (`/`) → CTA "Quero early access gratuito" → `/signup`
2. **Signup** (`/signup`) → formulário:
   - Nome completo
   - E-mail
   - Nome da empresa
   - Cargo (opcional)
   - Tamanho do time (opcional)
   - Principal desafio de RH (opcional)
3. **Criação de conta**:
   - User pendente: `signup_pending = TRUE`, `active = FALSE`, role `direction`
   - Company nova: `signup_auto_created = TRUE` (ou associa a existente se `SIGNUP_DOMAIN_MATCH=true`)
   - Token de ativação (72h): enviado por e-mail via `password_setup_token`
4. **Confirmação** → `/a/set-password?token=...`:
   - Define senha
   - `signup_pending = FALSE`, `active = TRUE`
   - Bump `session_version`
   - Redireciona `/login`
5. **Primeiro acesso** → Dashboard com trial limits ativos

## Env Vars

```bash
# Domain match: associar a company existente se email @domain já cadastrado
SIGNUP_DOMAIN_MATCH=true  # default: false

# Trial limits (soft caps)
TRIAL_MAX_VACANCIES=2
TRIAL_MAX_CANDIDATES=50
TRIAL_MAX_USERS=3
TRIAL_MAX_MOTIVATORS=10
TRIAL_MAX_CLIMATE_SURVEYS=2
```

## Trial Limits

Companies criadas via signup (`signup_auto_created = TRUE`) têm soft limits:

| Recurso | Limit Default | Checado em |
|---------|---------------|------------|
| Vagas | 2 | Criar vaga |
| Candidatos | 50 | Submit de assessment |
| Usuários | 3 | Criar user na aba Usuários |
| Convites Motivadores | 10 | Criar convite AE |
| Pesquisas de Clima | 2 | Criar climate survey |

Limites são ajustáveis via env sem deploy.

**Promover company** (remover limits):

```sql
UPDATE companies
SET signup_auto_created = FALSE
WHERE id = <company_id>;
```

Ou adicionar campo futuro `subscription_active = TRUE` quando implementar payment.

## Analytics

Tabela `landing_analytics`:

| Coluna | Descrição |
|--------|-----------|
| `event_type` | pageview, cta_click, signup_start, signup_complete, login |
| `session_id` | UUID gerado client-side (sessionStorage) |
| `referrer` | document.referrer |
| `utm_source`, `utm_medium`, `utm_campaign` | Query params |
| `user_agent` | Request header |
| `ip_hash` | SHA256(IP) para LGPD |
| `metadata` | JSONB (path, search, userId, companyId, etc.) |

**API pública:** `POST /api/analytics/landing`

**Client hook:** `<LandingAnalytics />` na landpage (rastreia pageview automaticamente)

## Schema Changes

### Migration 051

```sql
ALTER TABLE users
  ADD COLUMN signup_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN signup_source TEXT,
  ADD COLUMN signup_metadata JSONB;

CREATE INDEX idx_users_signup_pending
  ON users (signup_pending)
  WHERE signup_pending = TRUE AND deleted = FALSE;

ALTER TABLE companies
  ADD COLUMN signup_auto_created BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN signup_creator_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_companies_signup_auto
  ON companies (signup_auto_created)
  WHERE signup_auto_created = TRUE AND deleted = FALSE;
```

### Migration 052

```sql
CREATE TABLE landing_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_landing_analytics_created ON landing_analytics (created_at DESC);
CREATE INDEX idx_landing_analytics_event ON landing_analytics (event_type, created_at DESC);
CREATE INDEX idx_landing_analytics_session ON landing_analytics (session_id) WHERE session_id IS NOT NULL;
```

## Helpers

| Arquivo | Função |
|---------|--------|
| `lib/landing-analytics.js` | `trackLandingEvent()` |
| `lib/trial-limits.js` | `isTrialCompany()`, `checkTrialLimit()` |
| `lib/slugify.js` | `generateUniqueCompanySlug()` |

## Segurança

- Rate limit: TODO (implementar via redis ou in-memory cache)
- Email obrigatório + confirmação (72h token)
- Signup pendente não permite login
- Domain match opt-in (evita takeover acidental)
- Trial limits impedem abuso de recursos

## Próximos Passos (Futuro)

1. **Payment gate**: adicionar step após confirmação ou ao atingir trial limit
2. **Onboarding wizard**: `?onboarding=1` após primeiro login (passos: convite time, primeira vaga, primeiro convite)
3. **Admin dashboard analytics**: `/dashboard/analytics` (funnel signup, conversão, trial → paid)
4. **Rate limiting**: implementar com redis/upstash
5. **CAPTCHA**: adicionar hCaptcha ou Turnstile no signup se houver spam
