'use client';
import { useState, useEffect } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading } from '../../_components/AppLoading';
import { RichTextView } from '../../_components/RichTextView';
import { TagChips } from '../../_components/TagInput';
import { formatTagList, parseTagList } from '../../../lib/tag-list';
import { S } from '../dashboard-shared';

export function LearningResourcesAdminTab({ locale = 'pt-BR', companyId, isAdmin }) {
  const [resources, setResources] = useState([]);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTheme, setFilterTheme] = useState('');
  const [filterType, setFilterType] = useState('');
  const { confirm, promptForm, toast } = useAppFeedback();

  function t(key) {
    const messages = {
      'pt-BR': {
        title: 'Academy (Recursos de Aprendizagem)',
        subtitle: 'Catálogo leve de ações/trilhas para desenvolvimento',
        create: 'Novo Recurso',
        noResources: 'Nenhum recurso cadastrado',
        noResourcesDesc: 'Crie ações, cursos, trilhas que o PDI pode apontar',
        filterTheme: 'Filtrar por tema',
        allThemes: 'Todos os temas',
        filterType: 'Filtrar por tipo',
        allTypes: 'Todos os tipos',
        title_col: 'Título',
        theme_col: 'Temas',
        type_col: 'Tipo',
        duration_col: 'Duração',
        actions_col: 'Ações',
        edit: 'Editar',
        deactivate: 'Desativar',
        confirmDeactivate: 'Desativar este recurso?',
        course: 'Curso',
        article: 'Artigo',
        video: 'Vídeo',
        book: 'Livro',
        workshop: 'Workshop',
        mentoring: 'Mentoria',
        other: 'Outro',
        hours: 'h',
        formTitle: 'Recurso de Aprendizagem',
        formTitleLabel: 'Título',
        formDescLabel: 'Descrição',
        formThemeLabel: 'Temas',
        formThemeHelp: 'Digite e pressione Enter (ou vírgula). Cada tema vira uma tag removível.',
        formThemePh: 'Ex.: Liderança',
        formTypeLabel: 'Tipo',
        formUrlLabel: 'URL (opcional)',
        formDurationLabel: 'Duração (horas, opcional)',
        created: 'Recurso criado',
        updated: 'Recurso atualizado',
        deactivated: 'Recurso desativado',
        loadError: 'Erro ao carregar recursos',
        saveError: 'Erro ao salvar',
      },
      en: {
        title: 'Academy (Learning Resources)',
        subtitle: 'Lightweight catalog of actions/tracks for development',
        create: 'New Resource',
        noResources: 'No resources registered',
        noResourcesDesc: 'Create actions, courses, tracks that PDI can point to',
        filterTheme: 'Filter by theme',
        allThemes: 'All themes',
        filterType: 'Filter by type',
        allTypes: 'All types',
        title_col: 'Title',
        theme_col: 'Themes',
        type_col: 'Type',
        duration_col: 'Duration',
        actions_col: 'Actions',
        edit: 'Edit',
        deactivate: 'Deactivate',
        confirmDeactivate: 'Deactivate this resource?',
        course: 'Course',
        article: 'Article',
        video: 'Video',
        book: 'Book',
        workshop: 'Workshop',
        mentoring: 'Mentoring',
        other: 'Other',
        hours: 'h',
        formTitle: 'Learning Resource',
        formTitleLabel: 'Title',
        formDescLabel: 'Description',
        formThemeLabel: 'Themes',
        formThemeHelp: 'Type and press Enter (or comma). Each theme becomes a removable tag.',
        formThemePh: 'e.g. Leadership',
        formTypeLabel: 'Type',
        formUrlLabel: 'URL (optional)',
        formDurationLabel: 'Duration (hours, optional)',
        created: 'Resource created',
        updated: 'Resource updated',
        deactivated: 'Resource deactivated',
        loadError: 'Failed to load resources',
        saveError: 'Failed to save',
      },
    };
    return messages[locale]?.[key] || messages['pt-BR'][key] || key;
  }

  useEffect(() => {
    loadResources();
    loadThemes();
  }, [companyId, filterTheme, filterType]);

  async function loadResources() {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTheme) params.set('theme', filterTheme);
      if (filterType) params.set('resourceType', filterType);
      const url = params.toString()
        ? `/api/admin/learning-resources?${params.toString()}`
        : '/api/admin/learning-resources';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setResources(data.resources || []);
      else toast(t('loadError'), 'error');
    } catch {
      toast(t('loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadThemes() {
    if (!companyId) return;
    try {
      const res = await fetch('/api/admin/learning-resources?themes=true');
      const data = await res.json();
      if (data.ok) setThemes(data.themes || []);
    } catch (err) {
      console.error('Failed to load themes:', err);
    }
  }

  function resourceFields(resource) {
    return [
      {
        name: 'title',
        label: t('formTitleLabel'),
        type: 'text',
        required: true,
        value: resource?.title || '',
      },
      {
        name: 'description',
        label: t('formDescLabel'),
        type: 'richText',
        required: false,
        value: resource?.description || '',
        minHeight: 120,
      },
      {
        name: 'theme',
        label: t('formThemeLabel'),
        type: 'tags',
        required: false,
        value: parseTagList(resource?.theme),
        placeholder: t('formThemePh'),
        help: t('formThemeHelp'),
        suggestions: themes,
        maxTags: 10,
        tagMax: 40,
      },
      {
        name: 'resourceType',
        label: t('formTypeLabel'),
        type: 'select',
        required: false,
        value: resource?.resourceType || 'course',
        options: [
          { value: 'course', label: t('course') },
          { value: 'article', label: t('article') },
          { value: 'video', label: t('video') },
          { value: 'book', label: t('book') },
          { value: 'workshop', label: t('workshop') },
          { value: 'mentoring', label: t('mentoring') },
          { value: 'other', label: t('other') },
        ],
      },
      { name: 'url', label: t('formUrlLabel'), type: 'text', required: false, value: resource?.url || '' },
      {
        name: 'durationHours',
        label: t('formDurationLabel'),
        type: 'text',
        required: false,
        value: resource?.durationHours != null ? String(resource.durationHours) : '',
      },
    ];
  }

  function payloadFromForm(result) {
    return {
      title: result.title,
      description: result.description,
      theme: formatTagList(result.theme),
      resourceType: result.resourceType,
      url: result.url,
      durationHours: result.durationHours,
    };
  }

  async function handleCreate() {
    const result = await promptForm({
      title: t('formTitle'),
      fields: resourceFields(null),
    });
    if (!result) return;

    try {
      const res = await fetch('/api/admin/learning-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(result)),
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('created'), 'ok');
        loadResources();
        loadThemes();
      } else {
        toast(data.error || t('saveError'), 'error');
      }
    } catch {
      toast(t('saveError'), 'error');
    }
  }

  async function handleEdit(resource) {
    const result = await promptForm({
      title: t('formTitle'),
      fields: resourceFields(resource),
    });
    if (!result) return;

    try {
      const res = await fetch(`/api/admin/learning-resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(result)),
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('updated'), 'ok');
        loadResources();
        loadThemes();
      } else {
        toast(data.error || t('saveError'), 'error');
      }
    } catch {
      toast(t('saveError'), 'error');
    }
  }

  async function handleDeactivate(resource) {
    const ok = await confirm(t('confirmDeactivate'));
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/learning-resources/${resource.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        toast(t('deactivated'), 'ok');
        loadResources();
      } else {
        toast(data.error || t('saveError'), 'error');
      }
    } catch {
      toast(t('saveError'), 'error');
    }
  }

  if (loading) return <AppLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">{t('title')}</h2>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && (
          <button type="button" onClick={handleCreate} className={S.btnPrimary}>
            + {t('create')}
          </button>
        )}
        {themes.length > 0 && (
          <select
            value={filterTheme}
            onChange={(e) => setFilterTheme(e.target.value)}
            aria-label={t('filterTheme')}
            className={S.select}
          >
            <option value="">{t('allThemes')}</option>
            {themes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          aria-label={t('filterType')}
          className={S.select}
        >
          <option value="">{t('allTypes')}</option>
          <option value="course">{t('course')}</option>
          <option value="article">{t('article')}</option>
          <option value="video">{t('video')}</option>
          <option value="book">{t('book')}</option>
          <option value="workshop">{t('workshop')}</option>
          <option value="mentoring">{t('mentoring')}</option>
          <option value="other">{t('other')}</option>
        </select>
      </div>

      {resources.length === 0 ? (
        <EmptyState title={t('noResources')} description={t('noResourcesDesc')} icon="📚" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-ink/10 bg-white">
          <table className="w-full">
            <thead className="border-b border-ink/10 bg-canvas-alt">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('title_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('theme_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('type_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('duration_col')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('actions_col')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {resources.map((res) => (
                <tr key={res.id} className="hover:bg-canvas-alt/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-ink">{res.title}</p>
                    {res.description ? (
                      <RichTextView html={res.description} className="mt-0.5 text-xs text-ink-muted" />
                    ) : null}
                    {res.url ? (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-700"
                      >
                        Link →
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <TagChips tags={res.theme} />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">{t(res.resourceType)}</td>
                  <td className="px-4 py-3 text-sm text-ink-muted">
                    {res.durationHours ? `${res.durationHours}${t('hours')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(res)}
                        className="min-h-touch text-xs text-brand-600 hover:text-brand-700"
                      >
                        {t('edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(res)}
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
