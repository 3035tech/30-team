import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('vacancy list card layout', () => {
  const readSource = () => readFile(
    new URL('../../app/dashboard/tabs/VacanciesAdminTab.jsx', import.meta.url),
    'utf8'
  );

  it('renders the list as a paged table with secondary columns only on wide screens', async () => {
    const source = await readSource();

    assert.match(source, /<AdminTableShell/);
    assert.match(source, /<AdminListPager/);
    assert.match(source, /<RowActionsMenu/);
    assert.match(source, /className="hidden 2xl:table-cell"/);
    assert.match(source, /tabular-nums text-ink-muted 2xl:hidden/);
    assert.doesNotMatch(source, /\btext-(?:2xs|xs)\b|\btext-ink-faint\b/);
    assert.doesNotMatch(source, /AdminViewButton\s+asText/);
  });

  it('uses the vacancy detail width for actions and both public links', async () => {
    const source = await readSource();

    assert.match(source, /lg:flex-row lg:items-start lg:justify-between/);
    assert.match(source, /md:grid-cols-2/);
    assert.match(source, /!v \|\| error \|\| msg/);
    assert.doesNotMatch(source, /title=\{t\(locale, 'recruiting\.linkActionsTitle'\)\}/);
  });

  it('keeps the pipeline stages callback stable to prevent reload loops', async () => {
    const source = await readSource();

    assert.match(source, /const handlePipelineStagesChange = useCallback\(\(\) => \{/);
    assert.match(source, /onChange=\{handlePipelineStagesChange\}/);
    assert.doesNotMatch(
      source,
      /<PipelineStagesEditor[\s\S]*?onChange=\{\(\) => setPipelineRefresh/
    );
  });
});
