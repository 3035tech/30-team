'use client';
import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';
import { S } from '../dashboard-shared';

const BENEFIT_TYPE_KEYS = [
  'health',
  'dental',
  'vision',
  'life_insurance',
  'retirement',
  'vacation',
  'flexible_hours',
  'remote_work',
  'gym',
  'meal_voucher',
  'transport_voucher',
  'education',
  'daycare',
  'other',
];

export function CompanyBenefitsAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [benefits, setBenefits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const { confirm, promptForm, toast } = useAppFeedback();

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Benefícios da Empresa',
        subtitle: 'Catálogo para contexto de retenção e ofertas',
        create: 'Novo benefício',
        manageCategories: 'Categorias',
        newCategory: 'Nova categoria',
        editCategory: 'Editar categoria',
        noBenefits: 'Nenhum benefício cadastrado',
        noBenefitsDesc: 'Cadastre categorias e depois os benefícios oferecidos pela empresa',
        noCategories: 'Nenhuma categoria ainda. Crie uma antes de classificar benefícios.',
        filterCategory: 'Filtrar por categoria',
        allCategories: 'Todas as categorias',
        name_col: 'Nome',
        category_col: 'Categoria',
        type_col: 'Tipo',
        actions_col: 'Ações',
        edit: 'Editar',
        deactivate: 'Desativar',
        confirmDeactivate: 'Desativar este benefício?',
        confirmDeactivateCategory: 'Desativar esta categoria? Benefícios vinculados mantêm o vínculo.',
        categoryCreated: 'Categoria criada',
        categoryUpdated: 'Categoria atualizada',
        categoryDeactivated: 'Categoria desativada',
        benefitCreated: 'Benefício criado',
        benefitUpdated: 'Benefício atualizado',
        benefitDeactivated: 'Benefício desativado',
        loadError: 'Erro ao carregar',
        saveError: 'Erro ao salvar',
        health: 'Plano de Saúde',
        dental: 'Plano Odontológico',
        vision: 'Plano de Visão',
        life_insurance: 'Seguro de Vida',
        retirement: 'Previdência Privada',
        vacation: 'Férias Estendidas',
        flexible_hours: 'Horário Flexível',
        remote_work: 'Trabalho Remoto',
        gym: 'Academia',
        meal_voucher: 'Vale Refeição',
        transport_voucher: 'Vale Transporte',
        education: 'Educação/Cursos',
        daycare: 'Creche',
        other: 'Outro',
        formTitle: 'Benefício da Empresa',
        formNameLabel: 'Nome',
        formDescLabel: 'Descrição',
        formCategoryLabel: 'Categoria',
        formCategoryNone: 'Sem categoria',
        formTypeLabel: 'Tipo',
        formCategoryNameLabel: 'Nome da categoria',
      },
      en: {
        title: 'Company Benefits',
        subtitle: 'Catalog for retention and offer context',
        create: 'New benefit',
        manageCategories: 'Categories',
        newCategory: 'New category',
        editCategory: 'Edit category',
        noBenefits: 'No benefits registered',
        noBenefitsDesc: 'Create categories, then register benefits offered by the company',
        noCategories: 'No categories yet. Create one before classifying benefits.',
        filterCategory: 'Filter by category',
        allCategories: 'All categories',
        name_col: 'Name',
        category_col: 'Category',
        type_col: 'Type',
        actions_col: 'Actions',
        edit: 'Edit',
        deactivate: 'Deactivate',
        confirmDeactivate: 'Deactivate this benefit?',
        confirmDeactivateCategory: 'Deactivate this category? Linked benefits keep the link.',
        categoryCreated: 'Category created',
        categoryUpdated: 'Category updated',
        categoryDeactivated: 'Category deactivated',
        benefitCreated: 'Benefit created',
        benefitUpdated: 'Benefit updated',
        benefitDeactivated: 'Benefit deactivated',
        loadError: 'Failed to load',
        saveError: 'Failed to save',
        health: 'Health Insurance',
        dental: 'Dental Insurance',
        vision: 'Vision Insurance',
        life_insurance: 'Life Insurance',
        retirement: 'Retirement Plan',
        vacation: 'Extended Vacation',
        flexible_hours: 'Flexible Hours',
        remote_work: 'Remote Work',
        gym: 'Gym',
        meal_voucher: 'Meal Voucher',
        transport_voucher: 'Transport Voucher',
        education: 'Education/Courses',
        daycare: 'Daycare',
        other: 'Other',
        formTitle: 'Company Benefit',
        formNameLabel: 'Name',
        formDescLabel: 'Description',
        formCategoryLabel: 'Category',
        formCategoryNone: 'No category',
        formTypeLabel: 'Type',
        formCategoryNameLabel: 'Category name',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  const typeOptions = BENEFIT_TYPE_KEYS.map((value) => ({ value, label: t(value) }));

  const categorySelectOptions = [
    { value: '', label: t('formCategoryNone') },
    ...categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
  ];

  useEffect(() => {
    loadCategories();
  }, [companyId]);

  useEffect(() => {
    loadBenefits();
  }, [companyId, filterCategoryId]);

  async function loadBenefits() {
    if (!companyId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterCategoryId) qs.set('categoryId', filterCategoryId);
      const url = qs.toString()
        ? `/api/admin/company-benefits?${qs}`
        : '/api/admin/company-benefits';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setBenefits(data.benefits || []);
      else toast('error', t('loadError'));
    } catch {
      toast('error', t('loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    if (!companyId) return;
    try {
      const res = await fetch('/api/admin/benefit-categories');
      const data = await res.json();
      if (data.ok) setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load benefit categories:', err);
    }
  }

  function benefitFormFields(benefit) {
    return [
      {
        name: 'name',
        label: t('formNameLabel'),
        type: 'text',
        required: true,
        value: benefit?.name || '',
      },
      {
        name: 'description',
        label: t('formDescLabel'),
        type: 'richText',
        required: false,
        value: benefit?.description || '',
        minHeight: 120,
      },
      {
        name: 'categoryId',
        label: t('formCategoryLabel'),
        type: 'select',
        required: false,
        value: benefit?.categoryId != null ? String(benefit.categoryId) : '',
        options: categorySelectOptions,
      },
      {
        name: 'benefitType',
        label: t('formTypeLabel'),
        type: 'select',
        required: false,
        value: benefit?.benefitType || 'other',
        options: typeOptions,
      },
    ];
  }

  function parseCategoryId(raw) {
    if (raw === '' || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function handleCreateCategory() {
    const result = await promptForm({
      title: t('newCategory'),
      fields: [
        {
          name: 'name',
          label: t('formCategoryNameLabel'),
          type: 'text',
          required: true,
        },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch('/api/admin/benefit-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: result.name }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('categoryCreated'));
        await loadCategories();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  async function handleEditCategory(cat) {
    const result = await promptForm({
      title: t('editCategory'),
      fields: [
        {
          name: 'name',
          label: t('formCategoryNameLabel'),
          type: 'text',
          required: true,
          value: cat.name,
        },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch(`/api/admin/benefit-categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: result.name }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('categoryUpdated'));
        await loadCategories();
        loadBenefits();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  async function handleDeactivateCategory(cat) {
    const ok = await confirm(t('confirmDeactivateCategory'));
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/benefit-categories/${cat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('categoryDeactivated'));
        if (String(filterCategoryId) === String(cat.id)) setFilterCategoryId('');
        await loadCategories();
        loadBenefits();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  async function handleCreate() {
    if (categories.length === 0) {
      toast('info', t('noCategories'));
    }
    const result = await promptForm({
      title: t('formTitle'),
      fields: benefitFormFields(null),
    });
    if (!result) return;

    try {
      const res = await fetch('/api/admin/company-benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          description: result.description,
          categoryId: parseCategoryId(result.categoryId),
          benefitType: result.benefitType,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('benefitCreated'));
        loadBenefits();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  async function handleEdit(benefit) {
    const result = await promptForm({
      title: t('formTitle'),
      fields: benefitFormFields(benefit),
    });
    if (!result) return;

    try {
      const res = await fetch(`/api/admin/company-benefits/${benefit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          description: result.description,
          categoryId: parseCategoryId(result.categoryId),
          benefitType: result.benefitType,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('benefitUpdated'));
        loadBenefits();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  async function handleDeactivate(benefit) {
    const ok = await confirm(t('confirmDeactivate'));
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/company-benefits/${benefit.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', t('benefitDeactivated'));
        loadBenefits();
      } else {
        toast('error', data.error || t('saveError'));
      }
    } catch {
      toast('error', t('saveError'));
    }
  }

  if (loading && benefits.length === 0) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Categories first — list before linking to benefits */}
      <section className={S.cardTight}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{t('manageCategories')}</h3>
          {isAdmin && (
            <button type="button" onClick={handleCreateCategory} className={S.btnBrandSoft}>
              + {t('newCategory')}
            </button>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noCategories')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-control border border-ink/10 bg-canvas px-3 py-1.5 text-sm text-ink"
              >
                <span>{cat.name}</span>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditCategory(cat)}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivateCategory(cat)}
                      className="text-xs text-danger hover:text-danger/80"
                    >
                      {t('deactivate')}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && (
          <button type="button" onClick={handleCreate} className={S.btnPrimary}>
            + {t('create')}
          </button>
        )}
        {categories.length > 0 && (
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            aria-label={t('filterCategory')}
            className={S.select}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {benefits.length === 0 ? (
        <EmptyState title={t('noBenefits')} description={t('noBenefitsDesc')} icon="🎁" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-white">
          <table className="w-full">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('name_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('category_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('type_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('actions_col')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {benefits.map((ben) => (
                <tr key={ben.id} className="hover:bg-canvas-alt/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">{ben.name}</p>
                    {ben.description ? (
                      <RichTextView
                        html={ben.description}
                        className="mt-0.5 text-xs text-ink-muted"
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{ben.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{t(ben.benefitType)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(ben)}
                        className="min-h-touch text-xs text-brand-600 hover:text-brand-700"
                      >
                        {t('edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(ben)}
                        className="min-h-touch text-xs text-danger hover:text-danger/80"
                      >
                        {t('deactivate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
