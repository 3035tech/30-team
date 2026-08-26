# Guia de Componentes — Epic B-1000

Componentes visuais criados para HR Score, Turnover Radar e Job Roles.

## HrScoreBadge

Badge compacto para mostrar score ou risco de turnover.

### Props

```jsx
{
  score: number,      // Score 0-100 (opcional)
  risk: string,       // 'low' | 'medium' | 'high' (opcional)
  size: string        // 'xs' | 'sm' | 'md' (default: 'sm')
}
```

### Uso

**Score numérico:**
```jsx
import { HrScoreBadge } from '../_components/HrScoreBadge';

<HrScoreBadge score={85} size="sm" />
// Resultado: Badge verde com "85"
```

**Risco de turnover:**
```jsx
<HrScoreBadge risk="high" size="sm" />    // ⚠ vermelho
<HrScoreBadge risk="medium" size="sm" />  // ⚡ amarelo
<HrScoreBadge risk="low" size="sm" />     // ✓ verde
```

### Cores

- **Score ≥ 80:** success (verde)
- **Score 60-79:** info (azul)
- **Score 40-59:** warning (amarelo)
- **Score < 40:** danger (vermelho)

### Exemplo: Lista da Equipe

```jsx
// app/dashboard/tabs/TeamTab.jsx
import { HrScoreBadge } from '../../_components/HrScoreBadge';

{people.map(person => (
  <div key={person.id} className="flex items-center gap-2">
    <span>{person.name}</span>
    
    {/* Score */}
    {person.hrScore && (
      <HrScoreBadge score={person.hrScore} size="sm" />
    )}
    
    {/* Risk */}
    {person.turnoverRisk && (
      <HrScoreBadge risk={person.turnoverRisk} size="sm" />
    )}
  </div>
))}
```

---

## RubricEditor

Editor visual de rubrica T1-T9 com sliders e validação.

### Props

```jsx
{
  value: object,      // { T1: 20, T2: 30, ... }
  onChange: function, // (newValue) => void
  locale: string,     // 'pt-BR' | 'en'
  compact: boolean    // Modo compacto (read-only)
}
```

### Uso

**Modo completo (edição):**
```jsx
import { RubricEditor } from '../_components/RubricEditor';
import { useState } from 'react';

const [rubric, setRubric] = useState({ T1: 20, T2: 30, T7: 50 });

<RubricEditor
  value={rubric}
  onChange={setRubric}
  locale={locale}
/>
```

**Modo compacto (visualização):**
```jsx
<RubricEditor
  value={rubric}
  compact
  locale={locale}
/>
// Resultado: Chips horizontais coloridos (T1 20%, T2 30%, T7 50%)
```

### Validação

- ✅ Total ≤ 100%: verde
- ⚠️ Total > 100%: vermelho + alerta

### Exemplo: Editar Cargo

```jsx
// app/dashboard/tabs/JobRolesAdminTab.jsx
import { RubricEditor } from '../../_components/RubricEditor';
import { AdminRichFormDrawer } from '../../_components/AdminRichFormDrawer';

const [editingRole, setEditingRole] = useState(null);
const [rubric, setRubric] = useState({});

<AdminRichFormDrawer
  open={!!editingRole}
  title="Editar Cargo"
  onClose={() => setEditingRole(null)}
  locale={locale}
>
  <div className="flex flex-col gap-4">
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Nome do cargo"
    />
    
    <div>
      <label className="mb-2 block text-sm font-medium">
        Competências (T1-T9)
      </label>
      <RubricEditor
        value={rubric}
        onChange={setRubric}
        locale={locale}
      />
    </div>
  </div>
</AdminRichFormDrawer>
```

---

## Integração nas APIs

### HR Score + Turnover Risk

Para exibir badges na Equipe, a API de listagem deve incluir os dados:

```javascript
// app/api/admin/people/route.js (exemplo)
const people = await db.query(`
  SELECT 
    c.id,
    c.full_name,
    hs.score AS "hrScore",
    hs.turnover_risk AS "turnoverRisk"
  FROM candidates c
  LEFT JOIN hr_scores hs ON hs.candidate_id = c.id
  WHERE c.company_id = $1
    AND c.employee = TRUE
`, [companyId]);
```

### Job Roles com Rubrica

```javascript
// app/api/admin/job-roles/[id]/route.js
const role = await getJobRole(id);

// role.rubric já está em formato JSON: { T1: 20, T2: 30, ... }
// Pronto para usar no RubricEditor
```

---

## Checklist de Integração

### TeamTab (Lista de Pessoas):

- [ ] Modificar API para incluir `hrScore` e `turnoverRisk`
- [ ] Importar `HrScoreBadge`
- [ ] Adicionar badges ao lado do nome na lista
- [ ] Testar responsivo (mobile/desktop)

### JobRolesAdminTab (Editar Cargo):

- [ ] Substituir `promptForm` por `AdminRichFormDrawer`
- [ ] Importar `RubricEditor`
- [ ] Estado local para `rubric`
- [ ] Salvar via `PATCH /api/admin/job-roles/:id`
- [ ] Modo compact na listagem

### VacanciesAdminTab (Criar/Editar Vaga):

- [ ] Adicionar `RubricEditor` na seção de rubrica
- [ ] Pré-preencher com rubrica do cargo se `jobRoleId` selecionado
- [ ] Permitir override manual
- [ ] Salvar `rubric` no payload

---

## Troubleshooting

### Badge não aparece
- Verificar se `score` ou `risk` têm valor
- Checar console por erros de import

### RubricEditor não salva
- Garantir que `onChange` está sendo chamado
- Verificar payload no network tab
- Rubrica deve ser objeto `{ T1: number, T2: number, ... }`

### Cores não aparecem
- `TYPE_DATA` deve estar importado
- Tailwind deve compilar cores customizadas

---

## Próximos Passos

1. **TeamTab:** Integrar badges na lista principal
2. **JobRolesAdminTab:** Drawer com RubricEditor
3. **VacanciesAdminTab:** RubricEditor com pré-fill de cargo
4. **Storybook:** Documentar variações e estados

---

## Referências

- `app/_components/HrScoreBadge.jsx`
- `app/_components/RubricEditor.jsx`
- `lib/data.js` — TYPE_DATA
- `lib/theme.js` — cores semânticas
