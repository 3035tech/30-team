# Onboarding Contextual — Melhoria #1 (Sprint Quick Wins)

**Objetivo:** Reduzir abandono early-stage com ajuda contextual, progresso visível e tour guiado.

## Componentes Implementados

### 1. Sistema de Tooltips Contextuais

**Arquivo:** `app/_components/ContextualTooltip.jsx`

- Tooltips dismissíveis com tracking em `localStorage`
- Suporta "Não mostrar novamente"
- 4 posições: `top`, `bottom`, `left`, `right`
- Hook `useTooltipManager()` para gerenciamento avançado

**Uso:**

```jsx
import { ContextualTooltip } from '@/app/_components/ContextualTooltip';

<ContextualTooltip
  id="first-vacancy"
  title="Primeira vaga"
  message="Crie sua primeira vaga para começar a avaliar candidatos."
  position="bottom"
>
  <button>Criar Vaga</button>
</ContextualTooltip>
```

### 2. Checklist de Progresso

**Arquivos:**
- `app/_components/OnboardingChecklist.jsx` (UI)
- `lib/onboarding-progress.js` (lógica de tracking)

**7 tarefas críticas:**
1. Criar primeira vaga (20%)
2. Enviar assessment (20%)
3. Ver resultado (15%)
4. Mover no pipeline (15%)
5. Criar pesquisa de clima (10%)
6. Explorar Analytics (10%)
7. Convidar gestor (10%)

**Integração:**
- Aparece automaticamente no Overview quando progresso < 100%
- Colapsável e dismissível
- Clique na tarefa navega para a tab correspondente

**SQL:** Verifica automaticamente conclusão via queries existentes (assessments, vacancies, climate_surveys, users, etc.)

### 3. Empty States Acionáveis

**Arquivo:** `app/_components/EmptyStateActionable.jsx`

**3 pré-configurados:**
- `EmptyVacancies` — CTA "Criar primeira vaga" + tips
- `EmptyCandidates` — CTA "Convidar pessoas" + tips
- `EmptyAnalytics` — Explicação de aguardando dados + preview

**Uso:**

```jsx
import { EmptyVacancies } from '@/app/_components/EmptyStateActionable';

{vacancies.length === 0 && (
  <EmptyVacancies
    onCreateVacancy={() => openVacancyDrawer()}
    onViewHelp={() => navigateTo('help')}
  />
)}
```

### 4. Tour Guiado Opcional

**Arquivo:** `app/_components/OnboardingTour.jsx`

**5 steps:**
1. Overview — resumo do que precisa atenção
2. Vagas — pipeline kanban + rubricas
3. Equipe — perfis + compatibilidade + PDI
4. Analytics — métricas e alertas
5. Ajuda — guia completo

**Flow:**
1. Modal de boas-vindas (auto após 1s no primeiro acesso)
2. Usuário escolhe "Fazer tour" ou "Pular"
3. Tour com navegação automática entre tabs
4. Progress bar + spotlight simulado (overlay)
5. Marca como completo em `localStorage`

**Admin:** `resetTour()` para limpar estado (testing)

## Integração no Dashboard

**`app/dashboard/load-dashboard-data.js`:**
- Busca `onboardingProgress` quando `needOverview && !isAdmin && companyId`
- Adiciona ao retorno → `DashboardClient` → `OverviewTab`

**`app/dashboard/DashboardClient.jsx`:**
- Prop `onboardingProgress` passada para `OverviewTab`
- `<OnboardingTour />` renderizado no root quando progresso < 100%
- IDs `#overview-tab`, `#vagas-tab`, etc. adicionados aos `NavLink` para tour spotlight

**`app/dashboard/tabs/OverviewTab.jsx`:**
- `<OnboardingChecklist />` aparece antes do `TeamBehavioralIntelBlock` quando progresso < 100%

## Performance

- Checklist: 7 queries paralelas (EXISTS), rápidas (índices existentes)
- Tour: sem overhead, localStorage puro
- Tooltips: localStorage, zero network
- Onboarding progress é calculado **apenas** no SSR do Overview (não em toda tab)

## UX Guidelines

1. **Tooltips:** usar em CTAs críticos da primeira sessão (ex: "Criar primeira vaga", "Enviar convite")
2. **Checklist:** não esconder manualmente — apenas quando 100% completo
3. **Empty states:** substituir mensagens genéricas por CTAs claros
4. **Tour:** não forçar; sempre opcional; usuário pode refazer via Ajuda

## Métricas Esperadas

- ↓ Taxa de abandono early-stage (< 7 dias sem ação)
- ↑ Conclusão das 7 tarefas críticas
- ↑ Retenção D7 / D30
- ↓ Tickets de suporte "Como faço X?"

## Próximos Passos (Opcionais)

- [ ] A/B test: tour automático vs. opt-in
- [ ] Analytics: tracking de step do tour (onde param?)
- [ ] Gamification: badges ao completar checklist
- [ ] Tooltips com vídeos inline (embed Loom/YouTube)
