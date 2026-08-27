'use client';
import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';

export function CompanyBenefitsAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [benefits, setBenefits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const { confirm, promptForm, toast } = useAppFeedback();

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Benefícios da Empresa',
        subtitle: 'Catálogo para contexto de retenção e ofertas',
        create: 'Novo Benefício',
        noBenefits: 'Nenhum benefício cadastrado',
        noBenefitsDesc: 'Registre os benefícios oferecidos pela empresa',
        filterCategory: 'Filtrar por categoria',
        allCategories: 'Todas as categorias',
        name_col: 'Nome',
        category_col: 'Categoria',
        type_col: 'Tipo',
        actions_col: 'Ações',
        edit: 'Editar',
        deactivate: 'Desativar',
        confirmDeactivate: 'Desativar este benefício?',
        // Benefit types
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
        // Form
        formTitle: 'Benefício da Empresa',
        formNameLabel: 'Nome',
        formDescLabel: 'Descrição',
        formCategoryLabel: 'Categoria (ex: Saúde, Financeiro)',
        formTypeLabel: 'Tipo',
      },
      en: {
        title: 'Company Benefits',
        subtitle: 'Catalog for retention and offer context',
        create: 'New Benefit',
        noBenefits: 'No benefits registered',
        noBenefitsDesc: 'Register benefits offered by the company',
        filterCategory: 'Filter by category',
        allCategories: 'All categories',
        name_col: 'Name',
        category_col: 'Category',
        type_col: 'Type',
        actions_col: 'Actions',
        edit: 'Edit',
        deactivate: 'Deactivate',
        confirmDeactivate: 'Deactivate this benefit?',
        // Benefit types
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
        // Form
        formTitle: 'Company Benefit',
        formNameLabel: 'Name',
        formDescLabel: 'Description',
        formCategoryLabel: 'Category (e.g., Health, Financial)',
        formTypeLabel: 'Type',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadBenefits();
    loadCategories();
  }, [companyId, filterCategory]);

  async function loadBenefits() {
    if (!companyId) return;
    setLoading(true);
    try {
      const url = filterCategory
        ? `/api/admin/company-benefits?category=${encodeURIComponent(filterCategory)}`
        : '/api/admin/company-benefits';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setBenefits(data.benefits || []);
    } catch (err) {
      toast('error', 'Erro ao carregar benefícios');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    if (!companyId) return;
    try {
      const res = await fetch('/api/admin/company-benefits?categories=true');
      const data = await res.json();
      if (data.ok) setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function handleCreate() {
    const result = await promptForm({
      title: t('formTitle'),
      fields: [
        { name: 'name', label: t('formNameLabel'), type: 'text', required: true },
        { name: 'description', label: t('formDescLabel'), type: 'textarea', required: false },
        { name: 'category', label: t('formCategoryLabel'), type: 'text', required: false },
        {
          name: 'benefitType',
          label: t('formTypeLabel'),
          type: 'select',
          required: false,
          options: [
            { value: 'health', label: t('health') },
            { value: 'dental', label: t('dental') },
            { value: 'vision', label: t('vision') },
            { value: 'life_insurance', label: t('life_insurance') },
            { value: 'retirement', label: t('retirement') },
            { value: 'vacation', label: t('vacation') },
            { value: 'flexible_hours', label: t('flexible_hours') },
            { value: 'remote_work', label: t('remote_work') },
            { value: 'gym', label: t('gym') },
            { value: 'meal_voucher', label: t('meal_voucher') },
            { value: 'transport_voucher', label: t('transport_voucher') },
            { value: 'education', label: t('education') },
            { value: 'daycare', label: t('daycare') },
            { value: 'other', label: t('other') },
          ],
        },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch('/api/admin/company-benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', 'Benefício criado');
        loadBenefits();
        loadCategories();
      } else {
        toast('error', 'Erro ao criar benefício');
      }
    } catch (err) {
      toast('error', 'Erro ao criar benefício');
    }
  }

  async function handleEdit(benefit) {
    const result = await promptForm({
      title: t('formTitle'),
      fields: [
        { name: 'name', label: t('formNameLabel'), type: 'text', required: true, value: benefit.name },
        { name: 'description', label: t('formDescLabel'), type: 'textarea', required: false, value: benefit.description },
        { name: 'category', label: t('formCategoryLabel'), type: 'text', required: false, value: benefit.category },
        {
          name: 'benefitType',
          label: t('formTypeLabel'),
          type: 'select',
          required: false,
          value: benefit.benefitType,
          options: [
            { value: 'health', label: t('health') },
            { value: 'dental', label: t('dental') },
            { value: 'vision', label: t('vision') },
            { value: 'life_insurance', label: t('life_insurance') },
            { value: 'retirement', label: t('retirement') },
            { value: 'vacation', label: t('vacation') },
            { value: 'flexible_hours', label: t('flexible_hours') },
            { value: 'remote_work', label: t('remote_work') },
            { value: 'gym', label: t('gym') },
            { value: 'meal_voucher', label: t('meal_voucher') },
            { value: 'transport_voucher', label: t('transport_voucher') },
            { value: 'education', label: t('education') },
            { value: 'daycare', label: t('daycare') },
            { value: 'other', label: t('other') },
          ],
        },
      ],
    });
    if (!result) return;

    try {
      const res = await fetch(`/api/admin/company-benefits/${benefit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.ok) {
        toast('success', 'Benefício atualizado');
        loadBenefits();
        loadCategories();
      } else {
        toast('error', 'Erro ao atualizar benefício');
      }
    } catch (err) {
      toast('error', 'Erro ao atualizar benefício');
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
        toast('success', 'Benefício desativado');
        loadBenefits();
      } else {
        toast('error', 'Erro ao desativar benefício');
      }
    } catch (err) {
      toast('error', 'Erro ao desativar benefício');
    }
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 items-center flex-wrap">
        {isAdmin && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-control bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
          >
            + {t('create')}
          </button>
        )}
        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-control border border-ink/20 bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {benefits.length === 0 ? (
        <EmptyState
          title={t('noBenefits')}
          description={t('noBenefitsDesc')}
          icon="🎁"
        />
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
                    {ben.description && (
                      <p className="text-xs text-ink-muted mt-0.5">{ben.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{ben.category || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{t(ben.benefitType)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(ben)}
                        className="text-xs text-brand-600 hover:text-brand-700"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDeactivate(ben)}
                        className="text-xs text-danger hover:text-danger/80"
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
