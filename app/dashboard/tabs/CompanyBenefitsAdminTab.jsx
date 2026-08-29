'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';
import { BENEFIT_TYPES } from '../../../lib/domain-status.js';
import { PAGE_SIZE_OPTIONS } from '../../../lib/assessment-filters';
import {
  AdminActionsCell,
  AdminActionsTh,
  AdminCreateButton,
  AdminDeleteButton,
  AdminEditButton,
  AdminListPager,
  AdminListSearch,
  AdminPageHeader,
  AdminTableShell,
  AdminViewButton,
  S,
  SortableTh,
  clientSortNextDir,
} from '../dashboard-shared';

export function CompanyBenefitsAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [benefits, setBenefits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [nameQ, setNameQ] = useState('');
  const { confirm, notice, promptForm, toast } = useAppFeedback();

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
        searchNamePh: 'Buscar por nome…',
        noBenefitsDesc: 'Cadastre categorias e depois os benefícios oferecidos pela empresa',
        ctaExit: 'Ver Análise Demissional',
        ctaHelp: 'Ver Guia (Benefícios)',
        noCategories: 'Nenhuma categoria ainda. Crie uma antes de classificar benefícios.',
        filterCategory: 'Filtrar por categoria',
        allCategories: 'Todas as categorias',
        name_col: 'Nome',
        category_col: 'Categoria',
        type_col: 'Tipo',
        actions_col: 'Ações',
        edit: 'Editar',
        view: 'Ver',
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
        mental_health: 'Saúde mental / terapia',
        life_insurance: 'Seguro de Vida',
        retirement: 'Previdência Privada',
        profit_sharing: 'Participação nos lucros (PLR)',
        equity: 'Equity / stock options',
        vacation: 'Férias Estendidas',
        parental_leave: 'Licença parental estendida',
        sabbatical: 'Sabático',
        flexible_hours: 'Horário Flexível',
        remote_work: 'Trabalho Remoto',
        home_office_allowance: 'Ajuda de custo home office',
        gym: 'Academia',
        wellness: 'Bem-estar / wellness',
        meal_voucher: 'Vale Refeição',
        food_basket: 'Cesta básica',
        transport_voucher: 'Vale Transporte',
        parking: 'Estacionamento',
        mobility: 'Mobilidade / frota',
        phone: 'Plano de celular',
        education: 'Educação/Cursos',
        language: 'Idiomas',
        daycare: 'Creche',
        legal_aid: 'Assistência jurídica',
        uniform: 'Uniforme / vestuário',
        pet: 'Pet / assistência animal',
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
        searchNamePh: 'Search by name…',
        noBenefitsDesc: 'Create categories, then register benefits offered by the company',
        ctaExit: 'Open Exit Analysis',
        ctaHelp: 'Open Help (Benefits)',
        noCategories: 'No categories yet. Create one before classifying benefits.',
        filterCategory: 'Filter by category',
        allCategories: 'All categories',
        name_col: 'Name',
        category_col: 'Category',
        type_col: 'Type',
        actions_col: 'Actions',
        edit: 'Edit',
        view: 'View',
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
        mental_health: 'Mental health / therapy',
        life_insurance: 'Life Insurance',
        retirement: 'Retirement Plan',
        profit_sharing: 'Profit sharing',
        equity: 'Equity / stock options',
        vacation: 'Extended Vacation',
        parental_leave: 'Extended parental leave',
        sabbatical: 'Sabbatical',
        flexible_hours: 'Flexible Hours',
        remote_work: 'Remote Work',
        home_office_allowance: 'Home-office allowance',
        gym: 'Gym',
        wellness: 'Wellness',
        meal_voucher: 'Meal Voucher',
        food_basket: 'Food basket',
        transport_voucher: 'Transport Voucher',
        parking: 'Parking',
        mobility: 'Mobility / fleet',
        phone: 'Phone plan',
        education: 'Education/Courses',
        language: 'Language courses',
        daycare: 'Daycare',
        legal_aid: 'Legal aid',
        uniform: 'Uniform / workwear',
        pet: 'Pet benefit',
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

  const typeOptions = BENEFIT_TYPES.map((value) => ({ value, label: t(value) }));

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

  useEffect(() => {
    setPage(1);
  }, [filterCategoryId]);

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

  const sortedBenefits = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    const q = String(nameQ || '').trim().toLowerCase();
    const rows = [...benefits].filter((row) => {
      if (!q) return true;
      return String(row.name || '').toLowerCase().includes(q);
    });
    const collator = locale === 'en' ? 'en' : 'pt-BR';
    rows.sort((a, b) => {
      const key = sort === 'category' ? 'category' : sort === 'benefitType' ? 'benefitType' : 'name';
      const av = key === 'benefitType' ? t(a.benefitType) : a?.[key];
      const bv = key === 'benefitType' ? t(b.benefitType) : b?.[key];
      return String(av || '').localeCompare(String(bv || ''), collator) * dirMul;
    });
    return rows;
  }, [benefits, sort, sortDir, locale, nameQ]);

  const total = sortedBenefits.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedBenefits.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (columnKey) => {
    const nextDir = clientSortNextDir(columnKey, sort, sortDir);
    setSort(columnKey);
    setSortDir(nextDir);
    setPage(1);
  };

  if (loading && benefits.length === 0) return <AppLoading variant="panel" />;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* Categories first — list before linking to benefits */}
      <section className={S.cardTight}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{t('manageCategories')}</h3>
          {isAdmin && (
            <AdminCreateButton label={t('newCategory')} onClick={handleCreateCategory} />
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noCategories')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="inline-flex items-center gap-1 rounded-control border border-ink/10 bg-canvas px-2 py-1 text-sm text-ink"
              >
                <span className="px-1">{cat.name}</span>
                {isAdmin && (
                  <AdminActionsCell>
                    <AdminViewButton
                      label={t('view')}
                      onClick={() => notice({ title: cat.name, message: cat.name })}
                    />
                    <AdminEditButton label={t('edit')} onClick={() => handleEditCategory(cat)} />
                    <AdminDeleteButton
                      label={t('deactivate')}
                      onClick={() => handleDeactivateCategory(cat)}
                    />
                  </AdminActionsCell>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <AdminListSearch
          locale={locale}
          value={nameQ}
          onChange={(v) => {
            setNameQ(v);
            setPage(1);
          }}
          placeholder={t('searchNamePh')}
          showButton={false}
        />
        {isAdmin && (
          <AdminCreateButton label={t('create')} onClick={handleCreate} />
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
        <div className="flex flex-col gap-3">
          <EmptyState
            title={t('noBenefits')}
            message={t('noBenefitsDesc')}
            actionLabel={isAdmin ? t('create') : undefined}
            onAction={isAdmin ? handleCreate : undefined}
          />
          <div className="flex flex-wrap gap-3 px-1">
            <Link href="/dashboard?tab=exit-analysis" className="font-mono text-xs text-brand-600 hover:underline">
              {t('ctaExit')} →
            </Link>
            <Link href="/dashboard?tab=help" className="font-mono text-xs text-brand-600 hover:underline">
              {t('ctaHelp')} →
            </Link>
          </div>
        </div>
      ) : (
        <>
        <AdminTableShell minWidth="560px">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <SortableTh columnKey="name" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('name_col')}
                </SortableTh>
                <SortableTh columnKey="category" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('category_col')}
                </SortableTh>
                <SortableTh columnKey="benefitType" sortKey={sort} dir={sortDir} onSort={toggleSort}>
                  {t('type_col')}
                </SortableTh>
                <AdminActionsTh>{t('actions_col')}</AdminActionsTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {pageRows.map((ben) => (
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
                  <td className="px-4 py-3 text-right">
                    <AdminActionsCell>
                      <AdminViewButton
                        label={t('view')}
                        onClick={() =>
                          notice({
                            title: ben.name,
                            message: [
                              ben.category ? `${t('category_col')}: ${ben.category}` : null,
                              `${t('type_col')}: ${t(ben.benefitType)}`,
                              ben.description ? String(ben.description).replace(/<[^>]+>/g, ' ').trim() : null,
                            ]
                              .filter(Boolean)
                              .join('\n'),
                          })
                        }
                      />
                      <AdminEditButton label={t('edit')} onClick={() => handleEdit(ben)} />
                      <AdminDeleteButton label={t('deactivate')} onClick={() => handleDeactivate(ben)} />
                    </AdminActionsCell>
                  </td>
                </tr>
              ))}
            </tbody>
        </AdminTableShell>
          <AdminListPager
            locale={locale}
            page={safePage}
            pageSize={pageSize}
            total={total}
            loading={loading}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
