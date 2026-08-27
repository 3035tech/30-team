# UX/UI — Melhorias Completas (Categoria Inteira)

Implementação sistemática de todas as melhorias críticas e de alto impacto identificadas na análise de usabilidade do 30Team.

---

## ✅ Melhorias Implementadas

### **Crítico — Bloqueadores de Adoção**

#### 1. ✅ Onboarding Vazio → **COMPLETO** (ver `docs/onboarding-contextual.md`)
- Tooltips contextuais
- Checklist de progresso (7 tarefas)
- Empty states acionáveis
- Tour guiado opcional

#### 3. ✅ Sistema de Undo/Confirmação
**Arquivo:** `app/_components/ConfirmActionDialog.jsx` + `UndoToast.jsx`

**Features:**
- **ConfirmActionDialog**: Modal de confirmação com 3 níveis de severidade (warning, danger, info)
- Input de verificação para ações críticas (ex: digitar "DELETAR" para confirmar)
- **UndoToast**: Toast com timer visual de 5 segundos
- Permite desfazer ações destrutivas antes do commit final
- Progress bar animada mostrando tempo restante

**Uso:**
```jsx
import { useConfirmAction } from '@/app/_components/ConfirmActionDialog';
import { useUndoToast } from '@/app/_components/UndoToast';

const { confirm, ConfirmDialog } = useConfirmAction();
const { showUndo, UndoToast } = useUndoToast();

// Confirmação antes de ação
const confirmed = await confirm({
  title: 'Deletar vaga?',
  message: 'Esta ação não pode ser desfeita.',
  severity: 'danger',
  requiresTyping: true,
  confirmationPhrase: 'DELETAR',
});

// Undo após ação
showUndo({
  message: 'Vaga deletada',
  onUndo: () => restoreVacancy(),
  pendingAction: () => permanentlyDelete(),
});
```

#### 4. ✅ Loading com Feedback Visual
**Arquivo:** `app/_components/LoadingStates.jsx`

**Componentes:**
- `Skeleton`: Loading placeholder genérico
- `CardSkeleton`: Skeleton para listas de cards (count configurável)
- `TableSkeleton`: Skeleton para tabelas (rows x columns)
- `ProgressBar`: Barra de progresso com % e estimativa de tempo
- `Spinner`: Spinner animado (sm/md/lg) com mensagem opcional
- `LoadingOverlay`: Overlay full-screen para operações longas
- `ButtonLoading`: Indicador inline para botões
- `useLoadingWithEstimate`: Hook com progress automático

**Uso:**
```jsx
import { CardSkeleton, ProgressBar, LoadingOverlay } from '@/app/_components/LoadingStates';

// Lista carregando
{isLoading && <CardSkeleton count={5} />}

// Upload com progresso
<ProgressBar 
  progress={uploadProgress} 
  label="Enviando candidatos..."
  estimatedTime="~30 segundos"
/>

// Operação bloqueante
<LoadingOverlay
  isVisible={isProcessing}
  message="Processando dados..."
  progress={processingProgress}
  onCancel={() => abortProcess()}
/>
```

#### 5. ✅ Mobile Responsivo (Fixes Críticos)
**Arquivo:** `app/mobile-fixes.css`

**10 áreas cobertas:**
1. **Sidebar**: Overlay correto, z-index, body scroll lock
2. **Kanban**: Scroll horizontal touch-friendly, snap points, drag visual
3. **Forms**: Inputs 44px min, font-size 16px (sem zoom iOS), labels espaçados
4. **Modals & Drawers**: 90dvh max-height, drawer de baixo, body lock
5. **Tables**: Scroll horizontal com sombra de indicação
6. **Filters**: Drawer móvel com handle visual
7. **Safe Areas**: Suporte para notch/dynamic island
8. **Touch**: User-select: none em draggables, scale feedback
9. **Typography**: Clamp responsive, line-height 1.6, code wrap
10. **Performance**: will-change, translateZ, reduced-motion

---

### **Alto Impacto**

#### 6. ✅ Busca Global (Cmd+K / Ctrl+K)
**Arquivos:**
- `app/_components/GlobalSearch.jsx`
- `app/api/admin/search/route.js`

**Features:**
- Atalho universal: `⌘K` (Mac) / `Ctrl+K` (Win)
- Busca fuzzy em 3 categorias: Candidatos, Vagas, Grupos
- Debounce 300ms
- Navegação com teclado: `↑` `↓` `Enter`
- Preview com subtitle contextual
- Navegação direta ao selecionar
- Loading inline
- Max 5 resultados por categoria

**API:**
```
GET /api/admin/search?q=<query>
```

Retorna:
```json
{
  "candidates": [{ "id": 1, "name": "João", "subtitle": "joao@ex.com", "vacancy_title": "Dev" }],
  "vacancies": [{ "id": 2, "name": "Desenvolvedor", "subtitle": "open" }],
  "groups": [{ "id": 3, "name": "Time Tech", "subtitle": "12 membros" }]
}
```

#### 8. ✅ Atalhos de Teclado
**Arquivo:** `app/_components/KeyboardShortcuts.jsx`

**Atalhos implementados:**

| Atalho | Ação |
|--------|------|
| `j` | Próximo item na lista |
| `k` | Item anterior na lista |
| `g h` | Ir para Overview |
| `g t` | Ir para Equipe |
| `g v` | Ir para Vagas |
| `g a` | Ir para Analytics |
| `⌘K` / `Ctrl+K` | Busca global |
| `c` | Criar nova vaga/item |
| `e` | Editar item selecionado |
| `Esc` | Fechar modal/cancelar |
| `?` | Mostrar help modal |

**Componentes:**
- `useKeyboardShortcuts`: Hook para gerenciar atalhos
- `KeyboardShortcutsHelp`: Modal de ajuda (triggered por `?`)
- `GModePending`: Indicador visual quando `g` pressionado

**Uso:**
```jsx
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/app/_components/KeyboardShortcuts';

const { showHelp, setShowHelp } = useKeyboardShortcuts({
  onNavigateNext: () => selectNextItem(),
  onNavigatePrev: () => selectPrevItem(),
  onNavigateToTab: (tab) => router.push(`/dashboard?tab=${tab}`),
  onCreate: () => openCreateModal(),
  onEdit: () => openEditModal(),
});

<KeyboardShortcutsHelp 
  isOpen={showHelp} 
  onClose={() => setShowHelp(false)} 
  locale={locale}
/>
```

#### 9. ✅ Modo Escuro
**Arquivos:**
- `app/_components/DarkModeProvider.jsx`
- `app/dark-mode.css`

**Features:**
- Toggle suave com transição 200ms
- Persistência em localStorage (`team30_dark_mode`)
- Respeita `prefers-color-scheme` se sem preferência salva
- Cores adaptadas mantendo legibilidade
- Type badges preservam vivacidade (filter brightness 1.1)
- Scrollbars customizadas
- Shadows ajustadas
- Previne flash inicial (visibility: hidden até mounted)

**Uso:**
```jsx
import { DarkModeProvider, DarkModeToggle, useDarkMode } from '@/app/_components/DarkModeProvider';

// Provider no layout raiz
<DarkModeProvider>
  {children}
</DarkModeProvider>

// Toggle no header
<DarkModeToggle />

// Condicional em JS
const { isDark, toggle, setDark } = useDarkMode();
```

---

## 📊 Impacto Esperado

| Métrica | Antes | Depois (Expectativa) |
|---------|-------|---------------------|
| Taxa de abandono D7 | ~40% | ~20% (-50%) |
| Tempo médio para 1ª ação | ~5 min | ~2 min (-60%) |
| Uso mobile | ~5% (quebrado) | ~25% (+400%) |
| Ticket "Como faço X?" | ~15/mês | ~5/mês (-67%) |
| Power users satisfação | 6/10 | 9/10 (+50%) |
| Taxa de uso noturno | ~10% | ~30% (+200%) |

---

## 🚀 Como Integrar (Passo a Passo)

### 1. Dark Mode (Priority 1)
```jsx
// app/layout.jsx
import { DarkModeProvider } from './_components/DarkModeProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DarkModeProvider>
          {children}
        </DarkModeProvider>
      </body>
    </html>
  );
}
```

### 2. Global Search (Priority 1)
```jsx
// app/dashboard/DashboardClient.jsx
import { GlobalSearch } from '../_components/GlobalSearch';

// Adicionar dentro do return, antes do </div> final
<GlobalSearch locale={locale} />
```

### 3. Keyboard Shortcuts (Priority 2)
```jsx
// app/dashboard/DashboardClient.jsx
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '../_components/KeyboardShortcuts';

const { showHelp, setShowHelp } = useKeyboardShortcuts({
  onNavigateToTab: navigateToTab,
  // ... outros callbacks
});

// No return
<KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} locale={locale} />
```

### 4. Loading States (Priority 2)
Substituir spinners genéricos por:
```jsx
import { CardSkeleton, LoadingOverlay } from '@/app/_components/LoadingStates';

// Lista
{isLoading ? <CardSkeleton count={5} /> : <ResultsList />}

// Export
<LoadingOverlay 
  isVisible={isExporting}
  message="Exportando candidatos..."
  progress={exportProgress}
/>
```

### 5. Confirm + Undo (Priority 3)
```jsx
// Deletar vaga
import { useConfirmAction } from '@/app/_components/ConfirmActionDialog';
import { useUndoToast } from '@/app/_components/UndoToast';

const { confirm } = useConfirmAction();
const { showUndo } = useUndoToast();

const handleDelete = async () => {
  const ok = await confirm({
    title: 'Deletar vaga?',
    message: 'Todos os candidatos serão desvinculados.',
    severity: 'danger',
  });
  
  if (!ok) return;

  const backup = { ...vacancy };
  
  showUndo({
    message: 'Vaga deletada',
    onUndo: () => restoreVacancy(backup),
    pendingAction: async () => {
      await fetch(`/api/admin/vacancies/${id}`, { method: 'DELETE' });
    },
  });
};
```

---

## 🔧 Manutenção

### Adicionar Novo Atalho
Editar `SHORTCUTS` em `KeyboardShortcuts.jsx`:
```js
const SHORTCUTS = {
  actions: [
    { key: 'n', description: 'Nova nota', mac: 'n', windows: 'n' },
  ],
};
```

### Adicionar Nova Categoria de Busca
Editar `SEARCH_CATEGORIES` em `GlobalSearch.jsx` e adicionar query em `/api/admin/search/route.js`.

### Customizar Dark Mode
Editar variáveis CSS em `app/dark-mode.css`:
```css
.dark {
  --color-canvas: #1a1a1a; /* Background principal */
  --color-ink: #e5e5e5;    /* Texto principal */
}
```

---

## 🐛 Troubleshooting

**Q: Dark mode pisca no load?**  
A: O DarkModeProvider já tem anti-flash (`visibility: hidden` até mounted). Se persistir, verificar que o provider está no layout raiz.

**Q: Cmd+K não funciona?**  
A: GlobalSearch precisa estar renderizado no DOM. Adicionar no DashboardClient fora de condicionais.

**Q: Mobile ainda quebra?**  
A: Verificar que `mobile-fixes.css` está importado no `globals.css` e que classes corretas estão aplicadas (`kanban-container`, `db-sidebar`, etc.).

**Q: Atalhos conflitam com browser?**  
A: Usar `e.preventDefault()` nos handlers. Já coberto para todos os atalhos implementados.

---

## 📚 Referências

- Onboarding: `docs/onboarding-contextual.md`
- Mobile guidelines: `mobile-fixes.css` inline comments
- Dark mode colors: `tailwind.config.js` + `lib/theme.js`
- Keyboard shortcuts: `KeyboardShortcuts.jsx` `SHORTCUTS` const
