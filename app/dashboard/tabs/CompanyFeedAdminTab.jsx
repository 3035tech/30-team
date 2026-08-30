'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppFeedback } from '../../_components/AppFeedback';
import { EmptyState } from '../../_components/EmptyState';
import { AppLoading, ContentEnter } from '../../_components/AppLoading';
import { CollapsibleBlock } from '../../_components/CollapsibleBlock';
import { AdminListFilters } from '../../_components/AdminListFilters';
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
  AdminTh,
  AdminViewButton,
  S,
} from '../dashboard-shared';
import { t } from '../../../lib/i18n';
import { formatDisplayDateTime } from '../../../lib/format-display-date';

/**
 * B-2712 posts + B-2716 kudos moderation (one tab).
 */
export function CompanyFeedAdminTab({ locale = 'pt-BR', companyId }) {
  const { confirm, notice, promptForm, toast } = useAppFeedback();
  const [posts, setPosts] = useState([]);
  const [kudos, setKudos] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [kudosTotal, setKudosTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kudosPage, setKudosPage] = useState(1);
  const [q, setQ] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const pageSize = 20;

  const companyQs = companyId ? `companyId=${companyId}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const qsBase = companyQs ? `${companyQs}&` : '';
      const qParam = q ? `q=${encodeURIComponent(q)}&` : '';
      const [pr, kr] = await Promise.all([
        fetch(`/api/admin/company-feed/posts?${qsBase}${qParam}page=${page}&pageSize=${pageSize}`),
        fetch(`/api/admin/company-feed/kudos?${qsBase}page=${kudosPage}&pageSize=${pageSize}`),
      ]);
      const pj = await pr.json().catch(() => ({}));
      const kj = await kr.json().catch(() => ({}));
      let failed = false;
      if (pr.ok && pj.ok) {
        setPosts(pj.posts || []);
        setPostsTotal(pj.total || 0);
      } else {
        failed = true;
      }
      if (kr.ok && kj.ok) {
        setKudos(kj.kudos || []);
        setKudosTotal(kj.total || 0);
      } else {
        failed = true;
      }
      setLoadError(failed);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [companyQs, page, kudosPage, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function createPost() {
    const values = await promptForm({
      title: t(locale, 'panel.companyFeed.createPost'),
      fields: [
        { name: 'title', label: t(locale, 'panel.companyFeed.fieldTitle'), required: true, maxLength: 200 },
        { name: 'bodyHtml', label: t(locale, 'panel.companyFeed.fieldBody'), type: 'richText' },
      ],
      confirmLabel: t(locale, 'panel.companyFeed.publish'),
    });
    if (!values) return;
    const res = await fetch('/api/admin/company-feed/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyId || undefined,
        title: values.title,
        bodyHtml: values.bodyHtml || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast(t(locale, 'panel.companyFeed.saveError'), 'error');
      return;
    }
    toast(t(locale, 'panel.companyFeed.postCreated'), 'ok');
    setQ('');
    setQDraft('');
    if (page === 1) load();
    else setPage(1);
  }

  async function editPost(post) {
    const values = await promptForm({
      title: t(locale, 'panel.companyFeed.editPost'),
      fields: [
        {
          name: 'title',
          label: t(locale, 'panel.companyFeed.fieldTitle'),
          required: true,
          maxLength: 200,
          defaultValue: post.title,
        },
        {
          name: 'bodyHtml',
          label: t(locale, 'panel.companyFeed.fieldBody'),
          type: 'richText',
          defaultValue: post.bodyHtml || '',
        },
      ],
      confirmLabel: t(locale, 'panel.common.save'),
    });
    if (!values) return;
    const res = await fetch(`/api/admin/company-feed/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyId || undefined,
        title: values.title,
        bodyHtml: values.bodyHtml || '',
      }),
    });
    if (!res.ok) {
      toast(t(locale, 'panel.companyFeed.saveError'), 'error');
      return;
    }
    toast(t(locale, 'panel.companyFeed.postUpdated'), 'ok');
    load();
  }

  async function viewPost(post) {
    const plain = String(post.bodyHtml || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    await notice({
      title: post.title,
      message: plain || t(locale, 'panel.companyFeed.emptyBody'),
      tone: 'info',
    });
  }

  async function viewKudo(row) {
    await notice({
      title: `${row.fromName} → ${row.toName}`,
      message: row.message || t(locale, 'panel.companyFeed.emptyBody'),
      tone: 'info',
    });
  }

  async function removePost(post) {
    const ok = await confirm({
      title: t(locale, 'panel.companyFeed.confirmDeletePost'),
      message: post.title,
      danger: true,
    });
    if (!ok) return;
    const qs = companyId ? `?companyId=${companyId}` : '';
    const res = await fetch(`/api/admin/company-feed/posts/${post.id}${qs}`, { method: 'DELETE' });
    if (!res.ok) {
      toast(t(locale, 'panel.companyFeed.saveError'), 'error');
      return;
    }
    toast(t(locale, 'panel.companyFeed.postDeleted'), 'ok');
    if (posts.length <= 1 && page > 1) setPage((p) => Math.max(1, p - 1));
    else load();
  }

  async function removeKudo(row) {
    const ok = await confirm({
      title: t(locale, 'panel.companyFeed.confirmDeleteKudo'),
      message: `${row.fromName} → ${row.toName}`,
      danger: true,
    });
    if (!ok) return;
    const qs = companyId ? `?companyId=${companyId}` : '';
    const res = await fetch(`/api/admin/company-feed/kudos/${row.id}${qs}`, { method: 'DELETE' });
    if (!res.ok) {
      toast(t(locale, 'panel.companyFeed.saveError'), 'error');
      return;
    }
    toast(t(locale, 'panel.companyFeed.kudoDeleted'), 'ok');
    if (kudos.length <= 1 && kudosPage > 1) setKudosPage((p) => Math.max(1, p - 1));
    else load();
  }

  if (loading && posts.length === 0 && kudos.length === 0 && !loadError) {
    return <AppLoading variant="panel" label={t(locale, 'panel.common.loading')} />;
  }

  return (
    <ContentEnter>
      <AdminPageHeader
        title={t(locale, 'dashboard.companyFeed')}
        subtitle={t(locale, 'panel.companyFeed.subtitle')}
        actions={
          <AdminCreateButton onClick={createPost}>{t(locale, 'panel.companyFeed.createPost')}</AdminCreateButton>
        }
      />

      {loadError ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className={`${S.faint} m-0 text-danger`}>{t(locale, 'panel.companyFeed.loadError')}</p>
          <button type="button" className={S.btnGhost} onClick={load}>
            {t(locale, 'panel.companyFeed.retry')}
          </button>
        </div>
      ) : null}

      <h3 className={S.label}>{t(locale, 'panel.companyFeed.postsHeading')}</h3>
      <AdminListFilters
        locale={locale}
        aria-label={t(locale, 'panel.companyFeed.postsHeading')}
        onClear={() => {
          setQDraft('');
          setQ('');
          setPage(1);
        }}
        clearEnabled={Boolean(q || qDraft)}
      >
        <AdminListSearch
          value={qDraft}
          onChange={setQDraft}
          onSubmit={(v) => {
            const next = String(v ?? qDraft).trim();
            setQDraft(next);
            setQ(next);
            setPage(1);
          }}
          placeholder={t(locale, 'panel.companyFeed.searchPh')}
          locale={locale}
        />
      </AdminListFilters>

      {posts.length === 0 ? (
        <EmptyState
          title={t(locale, 'panel.companyFeed.noPosts')}
          message={
            q
              ? t(locale, 'panel.companyFeed.noPostsSearch')
              : t(locale, 'panel.companyFeed.noPostsHint')
          }
          actionLabel={q ? undefined : t(locale, 'panel.companyFeed.createPost')}
          onAction={q ? undefined : createPost}
        />
      ) : (
        <>
          <AdminTableShell animKey={`posts-${page}-${postsTotal}-${q}`}>
            <thead>
              <tr>
                <AdminTh>{t(locale, 'panel.companyFeed.colTitle')}</AdminTh>
                <AdminTh>{t(locale, 'panel.companyFeed.colAuthor')}</AdminTh>
                <AdminTh>{t(locale, 'panel.companyFeed.colWhen')}</AdminTh>
                <AdminActionsTh />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="font-ui text-sm text-ink">{p.title}</td>
                  <td className="font-mono text-prose text-ink-muted">{p.authorName || '—'}</td>
                  <td className="font-mono text-2xs text-ink-faint">
                    {formatDisplayDateTime(p.createdAt, locale)}
                  </td>
                  <AdminActionsCell>
                    <AdminViewButton onClick={() => viewPost(p)} />
                    <AdminEditButton onClick={() => editPost(p)} />
                    <AdminDeleteButton onClick={() => removePost(p)} />
                  </AdminActionsCell>
                </tr>
              ))}
            </tbody>
          </AdminTableShell>
          <AdminListPager
            page={page}
            pageSize={pageSize}
            total={postsTotal}
            onPageChange={setPage}
            locale={locale}
          />
        </>
      )}

      <div className="mt-8">
        <CollapsibleBlock
          locale={locale}
          variant="panel"
          title={t(locale, 'panel.companyFeed.kudosHeading')}
          count={kudosTotal || null}
          defaultOpen={kudosTotal > 0}
          collapsedHint={t(locale, 'panel.companyFeed.kudosHint')}
        >
          <p className={`${S.faint} mb-3`}>{t(locale, 'panel.companyFeed.kudosHint')}</p>
          {kudos.length === 0 ? (
            <EmptyState
              title={t(locale, 'panel.companyFeed.noKudos')}
              message={t(locale, 'panel.companyFeed.noKudosHint')}
            />
          ) : (
            <>
              <AdminTableShell animKey={`kudos-${kudosPage}-${kudosTotal}`}>
                <thead>
                  <tr>
                    <AdminTh>{t(locale, 'panel.companyFeed.colFrom')}</AdminTh>
                    <AdminTh>{t(locale, 'panel.companyFeed.colTo')}</AdminTh>
                    <AdminTh>{t(locale, 'panel.companyFeed.colMessage')}</AdminTh>
                    <AdminTh>{t(locale, 'panel.companyFeed.colWhen')}</AdminTh>
                    <AdminActionsTh />
                  </tr>
                </thead>
                <tbody>
                  {kudos.map((k) => (
                    <tr key={k.id}>
                      <td className="font-ui text-sm text-ink">{k.fromName}</td>
                      <td className="font-ui text-sm text-ink">{k.toName}</td>
                      <td className="max-w-xs truncate font-ui text-prose text-ink-muted" title={k.message}>
                        {k.message}
                      </td>
                      <td className="font-mono text-2xs text-ink-faint whitespace-nowrap">
                        {formatDisplayDateTime(k.createdAt, locale)}
                      </td>
                      <AdminActionsCell>
                        <AdminViewButton onClick={() => viewKudo(k)} />
                        <AdminDeleteButton onClick={() => removeKudo(k)} />
                      </AdminActionsCell>
                    </tr>
                  ))}
                </tbody>
              </AdminTableShell>
              <AdminListPager
                page={kudosPage}
                pageSize={pageSize}
                total={kudosTotal}
                onPageChange={setKudosPage}
                locale={locale}
              />
            </>
          )}
        </CollapsibleBlock>
      </div>
    </ContentEnter>
  );
}
