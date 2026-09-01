# Análise Crítica do Código — 30Team (Set/2026)

Avaliação técnica completa após implementação de UX/UI e Analytics avançado.

---

## 📊 **Métricas do Projeto**

| Métrica | Valor | Status |
|---------|-------|--------|
| **Linhas de código** | ~51.6k | 📈 Grande |
| - `app/` | ~34.4k | |
| - `lib/` | ~17.2k | |
| **Arquivos JS/JSX** | 742 | 📈 Alto |
| **Componentes React** | 108 | ✅ Modular |
| **Migrations SQL** | ~75 | ✅ Versionado |
| **Funções exportadas (lib)** | ~600+ | 📈 Complexo |
| **Console logs** | 240+ | ⚠️ Muitos |
| **TODOs/FIXMEs** | 27 | ⚠️ Dívida |

---

## ⭐ **Pontos Fortes**

### 1. **Arquitetura Bem Definida**
- ✅ Separação clara `app/` (UI) vs `lib/` (lógica)
- ✅ API Routes finas, regras no `lib/`
- ✅ Multi-tenant por `company_id` (isolamento)
- ✅ Migrations versionadas e idempotentes
- ✅ Uso consistente de `query`/`queryRead` (primário/réplica)

### 2. **Pool PG Robusto**
```js
// lib/db.js
const poolMax = parsePoolMax(); // Cap em 500
max: poolMax,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000,
```
- ✅ Logging de erros
- ✅ Configurável via `PG_POOL_MAX`
- ✅ Global singleton (sem leak)

### 3. **Segurança Implementada**
- ✅ JWT httpOnly cookies (`team30_session`, `team30_employee_session`)
- ✅ bcrypt para senhas
- ✅ Middleware de auth em `/dashboard`
- ✅ Rate limiting em analytics (`lib/analytics-rate-limit.js`)
- ✅ SQL parametrizado (`$1`, `$2`) na maioria das queries
- ✅ TOTP 2FA (`lib/totp.js`)
- ✅ Sanitização HTML (`lib/sanitize-html.js`)
- ✅ Helmet.js + CSP (`lib/security-csp.js`)

### 4. **UX/UI Moderno (Novo)**
- ✅ Dark mode com persist (`DarkModeProvider`)
- ✅ Busca global Cmd+K (`GlobalSearch`)
- ✅ Atalhos de teclado (`KeyboardShortcuts`)
- ✅ Loading states ricos (`Skeleton`, `ProgressBar`, `Spinner`)
- ✅ Confirmações + Undo (`ConfirmActionDialog`, `UndoToast`)
- ✅ Mobile responsivo (`mobile-fixes.css`)
- ✅ Onboarding contextual (tooltips, checklist, tour)
- ✅ Empty states acionáveis

### 5. **Analytics Avançado (Epic B-1100)**
- ✅ Métricas de efetividade (hiring ROI)
- ✅ Tendências temporais (time series)
- ✅ Comparativos (área, período, rubrica)
- ✅ Alertas e anomalias
- ✅ Export estruturado (JSON/Excel)
- ✅ API para integrações (`/api/admin/analytics/*`)
- ✅ Relatórios agendados (email HTML)
- ✅ Rate limiting (in-memory, 100 req/15min/user)

### 6. **Monitoramento**
- ✅ Health check (`/api/health`)
- ✅ Logger estruturado (`lib/monitoring.js`)
- ✅ Sentry integration (`@sentry/nextjs`)
- ✅ Slow query tracking (`slowThresholdMs`)
- ✅ Pool metrics (`/api/health/metrics`)

### 7. **i18n Completo**
- ✅ pt-BR e en em `lib/i18n.js` (12.9k linhas!)
- ✅ Hook `useLocale` para client
- ✅ Função `t(locale, key)` para server
- ✅ Tipos T1–T9 traduzidos (`lib/type-en.js`)

### 8. **Testes Estruturados**
- ✅ DTOV (ephemeral Postgres) em `test/dtov/`
- ✅ Playwright E2E em `test/e2e/`
- ✅ Unit tests em `test/unit/`
- ✅ Harness automatizado (`npm run dtov:full`)
- ✅ Documentação em `test/README.md`

---

## 🔴 **Problemas Críticos**

### 1. **Console Logs Excessivos** (240+)
⚠️ **Impacto:** Performance em produção, vazamento de dados sensíveis

**Onde:**
- Scripts de seed (32 em `seed-demo-todos-os-dados.js`)
- APIs (`/api/employee/*`, `/api/admin/*`)
- Lib (`lib/hire.js`, `lib/monitoring.js`, `lib/overview-metrics.js`)

**Solução:**
```js
// ❌ Evitar
console.log('User logged in', userId);

// ✅ Usar logger estruturado
import { logger } from './monitoring.js';
logger.info('User logged in', { userId, ip });
```

**Ação:**
- [ ] Substituir `console.log` por `logger.info/debug`
- [ ] Remover logs em hot paths (DB queries, loops)
- [ ] Redact secrets (`lib/redact-secrets.js`)

---

### 2. **TODOs/FIXMEs Não Resolvidos** (27)
⚠️ **Impacto:** Dívida técnica, funcionalidades incompletas

**Top 5:**
- `lib/people/development-plans.js` (4 TODOs)
- `lib/performance-reviews.js` (1 FIXME)
- `lib/turnover-radar.js` (2 TODOs)
- `app/employee/EmployeeHomeClient.jsx` (2 TODOs)
- `app/dashboard/tabs/SuccessionAdminTab.jsx` (8 TODOs!)

**Ação:**
- [ ] Revisar cada TODO
- [ ] Criar issues/tasks ou resolver
- [ ] Remover TODOs obsoletos

---

### 3. **Arquivos Gigantes**
⚠️ **Impacto:** Manutenibilidade, code smells

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `lib/i18n.js` | 12.9k | ❌ Monolito de i18n |
| `lib/people/employee-dp.js` | 2k | ❌ God module |
| `app/dashboard/tabs/TeamTab.jsx` | 1.9k | ❌ Componente obeso |
| `app/dashboard/tabs/VacanciesAdminTab.jsx` | 1.7k | ❌ Muito denso |
| `app/dashboard/DashboardClient.jsx` | 1.7k | ❌ Shell + lógica misturados |

**Soluções:**

**`lib/i18n.js`:**
```js
// Dividir em chunks
lib/i18n/pt-BR.js
lib/i18n/en.js
lib/i18n/index.js (loader)
```

**`employee-dp.js`:**
```js
// Extrair por domínio
lib/people/dp/leave.js
lib/people/dp/documents.js
lib/people/dp/balance.js
```

**Tabs grandes:**
```jsx
// Extrair blocos para componentes
TeamTab.jsx
├─ TeamFilters.jsx
├─ TeamTable.jsx
├─ TeamActions.jsx
└─ TeamModals.jsx
```

---

### 4. **SELECT * em Queries**
⚠️ **Impacto:** Performance, over-fetching

**Encontrado em:**
- `lib/vacancy-ranking.js` (1 ocorrência)

**Solução:**
```sql
-- ❌ Evitar
SELECT * FROM candidates WHERE id = $1

-- ✅ Especificar colunas
SELECT id, name, email, top_type, created_at 
FROM candidates WHERE id = $1
```

---

### 5. **SQL com Template Strings** (Injeção Potencial)
⚠️ **Impacto:** Segurança — SQL injection se input malicioso

**Onde:** 15+ arquivos em `lib/people/*`, `lib/vacancy-*.js`

**Exemplo problemático:**
```js
// ⚠️ Se ${EMPLOYMENT_STATUS.EMPLOYEE} vier de input
const sql = `WHERE employment_status = '${EMPLOYMENT_STATUS.EMPLOYEE}'`;
```

**Contexto:** Maioria são **constantes do código** (OK), mas misturar pode confundir.

**Solução:**
- Sempre usar `$1`, `$2` para **input do usuário**
- Template strings apenas para **constantes** (status, enums)
- Adicionar lint rule para flagrar `WHERE.*=.*${` com input

---

### 6. **React no `lib/`** (Mistura de Concerns)
⚠️ **Impacto:** Impossível reusar em CLI/cron, quebra SSR

**Arquivos:**
- `lib/useLocale.js` (hook)
- `lib/manager-login-session.js` (hook)
- `lib/employee-session.js` (hook)
- `lib/api-error.js` (hook `useApiError` — se houver)

**Solução:**
```
lib/                     # Puro JS (Node + Edge)
app/_hooks/              # React hooks
  ├─ useLocale.js
  ├─ useSession.js
  └─ useApiError.js
```

---

### 7. **Sem Paginação Universal**
⚠️ **Impacto:** OOM com empresas grandes

**Onde:**
- Compat sem `LIMIT` explícito (cap existe mas não enforced)
- Groups members sem página
- Algumas listagens admin sem pager

**Solução:**
- Enforcar `pageSize` max (50 ou 100) em **todas** listagens
- Criar helper `paginateQuery(sql, page, pageSize)`

---

## ⚠️ **Problemas de Alto Impacto**

### 8. **Process.env em App Router**
⚠️ **Impacto:** Pode vazar secrets no bundle cliente

**Onde:** 21 ocorrências em `app/`

**Solução:**
- Usar `NEXT_PUBLIC_*` apenas para variáveis públicas
- Server-side vars só em API Routes / Server Components
- Nunca `process.env.SECRET` em Client Component

---

### 9. **Falta de Rate Limiting Global**
⚠️ **Impacto:** DoS fácil em signup, login, APIs públicas

**O que tem:**
- ✅ Analytics API (`lib/analytics-rate-limit.js`)

**O que falta:**
- ❌ Signup (`/api/auth/signup`)
- ❌ Login (`/api/auth/login`)
- ❌ Forgot password
- ❌ Assessment submit (`/api/results`)
- ❌ Motivators submit (`/api/ae/submit`)

**Solução:**
```js
// lib/rate-limit.js (já existe, estender)
export async function checkSignupRateLimit(ip) {
  return checkRateLimit(`signup:${ip}`, 5, 900000); // 5 por 15min
}
```

---

### 10. **Sem Índices em Filtros Novos**
⚠️ **Impacto:** Full table scans em produção

**Verificar:**
- Busca global (`/api/admin/search`) → precisa GIN index em `name`?
- Analytics temporal (`analytics-trends.js`) → index em `created_at`?
- Notificações não-lidas → index em `(user_id, read_at)`?

**Ação:**
```sql
-- migrations/NNN_ux_search_indexes.sql
CREATE INDEX CONCURRENTLY idx_candidates_name_gin
  ON candidates USING gin (name gin_trgm_ops)
  WHERE deleted = FALSE;

CREATE INDEX CONCURRENTLY idx_vacancies_name_gin
  ON vacancies USING gin (name gin_trgm_ops)
  WHERE deleted = FALSE;
```

---

### 11. **Bundle Size Desconhecido**
⚠️ **Impacto:** FCP >3s?, hydration lenta?

**Problema:**
- Sem análise de bundle (`.next/` não existe localmente)
- Sem code splitting explícito além do Next.js default
- Imports pesados (Recharts, React Icons, Signature Pad)

**Solução:**
```bash
npm run build
npx @next/bundle-analyzer
```

**Otimizar:**
```js
// next.config.js
experimental: {
  optimizePackageImports: ['react-icons', 'recharts'],
},

// Dynamic imports
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  loading: () => <Skeleton />,
});
```

---

### 12. **Cache HR Score Volátil**
⚠️ **Impacto:** Recalcula sempre após restart do servidor

**O que tem:**
- `lib/hr-score-cache.js` (in-memory Map)

**Problema:**
- Restart = cache perdido
- Múltiplas instâncias = caches diferentes

**Solução:**
- Redis (`ioredis` já é dep!) com TTL
- OU: PostgreSQL `hr_score_cache` table
- OU: S3 JSON (cache frio mas persist)

---

## 💡 **Oportunidades de Melhoria**

### 13. **Dead Code / Unused Exports**
📊 **Impacto:** Bundle size, confusão

**Como detectar:**
```bash
npx knip
# OU
npx depcheck
```

---

### 14. **Duplicação de Lógica**
📊 **Impacto:** Manutenção 2x, bugs inconsistentes

**Suspeitas:**
- Filtros de área/vaga em múltiplas tabs
- Empty states custom por tab (agora tem `EmptyStateActionable`)
- Loading spinners ad hoc (agora tem `LoadingStates`)

**Ação:**
- [ ] Grep por padrões duplicados
- [ ] Extrair para `dashboard-shared.jsx` ou `lib/`

---

### 15. **Testes de Componentes UX Faltando**
📊 **Impacto:** Regressão em dark mode, search, shortcuts

**O que falta:**
- [ ] E2E Playwright para Cmd+K
- [ ] E2E para dark mode toggle
- [ ] E2E para atalhos `g+tecla`
- [ ] Unit test para `useKeyboardShortcuts`

**Criar:**
```js
// test/e2e/ux-smoke.spec.js
test('Dark mode toggle', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[aria-label*="modo escuro"]');
  await expect(page.locator('html')).toHaveClass(/dark/);
});
```

---

### 16. **Sem APM (Application Performance Monitoring)**
📊 **Impacto:** Bottlenecks invisíveis em produção

**Opções:**
- New Relic
- Datadog
- Vercel Analytics (se deploy na Vercel)

**O que medir:**
- API latency (p50, p95, p99)
- SQL query time
- Redis hit rate (quando implementar)
- Bundle load time

---

### 17. **Logs Não-Estruturados**
📊 **Impacto:** Debug difícil, impossível agregar

**Problema:**
```js
console.log('User action', user, action); // ❌ Plain text
```

**Solução:**
```js
logger.info('User action', { userId, action, timestamp }); // ✅ JSON
```

**Parsear:**
```bash
cat logs.json | jq 'select(.action == "delete_candidate")'
```

---

### 18. **Sem Retry em Emails**
📊 **Impacto:** Falhas silenciosas em SMTP transiente

**O que falta:**
```js
// lib/mail.js
import pRetry from 'p-retry';

export async function sendTransactionalMailWithRetry(opts) {
  return pRetry(
    () => sendTransactionalMail(opts),
    { retries: 3, minTimeout: 1000 }
  );
}
```

---

### 19. **Sem CDN para Assets**
📊 **Impacto:** Latência global, custo de banda

**Solução:**
```js
// next.config.js
assetPrefix: process.env.CDN_URL || '',
images: {
  loader: 'custom',
  domains: ['cdn.30team.com'],
},
```

**Deploy:** Cloudflare Pages, Vercel Edge, S3 + CloudFront

---

### 20. **Sem Cache HTTP**
📊 **Impacto:** Revalida sempre, server load alto

**Solução:**
```js
// app/api/admin/vacancies/route.js
return new Response(JSON.stringify(data), {
  headers: {
    'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
  },
});
```

---

## 🎯 **Priorização (MoSCoW)**

### **Must Have (P0)**
1. ✅ **Remover console.logs sensíveis** (segurança)
2. ✅ **Rate limit signup/login** (DoS protection)
3. ✅ **Resolver TODOs críticos** (funcionalidades incompletas)
4. ✅ **Índices para busca global** (performance)
5. ✅ **Cache HR Score persistente** (Redis ou PG)

### **Should Have (P1)**
6. **Dividir `i18n.js`** (manutenibilidade)
7. **Extrair blocos de tabs grandes** (code quality)
8. **Testes E2E para UX** (qualidade)
9. **Bundle analysis + code split** (FCP)
10. **Retry em emails** (reliability)

### **Could Have (P2)**
11. Dead code removal
12. APM integration
13. Logs estruturados completos
14. CDN assets
15. Cache HTTP

### **Won't Have (Agora)**
16. Refactor completo de arquitetura
17. Migrar para TypeScript
18. Segundo design system

---

## 📈 **Evolução do Código**

### **Antes (Ago/2026)**
- Epic B-1000 (GP sem DP) — 100%
- Epic B-1100 (Analytics) — iniciando

### **Agora (Set/2026)**
- Epic B-1100 — ✅ 100%
- UX/UI categoria — ✅ Completa
- 108 componentes (+9 novos)
- 51.6k linhas (+~2k com UX)
- Dark mode, Busca global, Atalhos
- Mobile responsivo
- Onboarding contextual

### **Próximos (Out/2026+)**
- Epic B-400 (Empacotar perfil)
- Epic B-500 (PDI + Clima)
- Sprint 1 Técnico (P-1001 a P-1005)
- Categorias Segurança e Integrações

---

## 🏆 **Nota Geral: B+ (8.5/10)**

### **Pontos Fortes (+):**
- Arquitetura sólida
- Segurança básica OK
- Analytics robusto
- UX moderna
- Testes estruturados

### **Pontos de Melhoria (−):**
- Logs excessivos
- Arquivos gigantes
- Rate limiting parcial
- Cache volátil
- Bundle size desconhecido

---

## 🚀 **Recomendação Imediata**

**Ordem de execução:**

1. **Semana 1 (Sprint Técnico 1):**
   - P-1005 (Health check) — já tem
   - P-1001 (Rate limit signup/login)
   - P-1004 (Enforcar pool max) — já tem
   - P-1003 (Fix N+1 compat) — se houver

2. **Semana 2 (Limpeza):**
   - Substituir console.logs
   - Resolver TODOs top 5
   - Índices busca global
   - Testes E2E UX

3. **Semana 3 (Performance):**
   - Cache HR Score Redis
   - Bundle analysis
   - Code splitting
   - Retry emails

4. **Semana 4 (Refactor):**
   - Dividir `i18n.js`
   - Extrair tabs grandes
   - Dead code removal

---

## 📚 **Referências**

- Plano Técnico: `docs/technical-improvements-plan.md`
- Guia de Testes: `docs/ux-testing-guide.md`
- UX/UI Improvements: `docs/ux-ui-improvements.md`
- Performance Hot Paths: `docs/performance-hotpaths.md`
- AGENTS.md: fonte de verdade do projeto
