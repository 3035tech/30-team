import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('vacancy list card layout', () => {
  const readSource = () => readFile(
    new URL('../../app/dashboard/tabs/VacanciesAdminTab.jsx', import.meta.url),
    'utf8'
  );

  it('places row actions beside vacancy information on desktop', async () => {
    const source = await readSource();

    assert.match(source, /md:grid-cols-\[minmax\(0,1fr\)_auto\]/);
    assert.match(source, /md:border-t-0 md:pt-0/);
    assert.match(source, /AdminActionsCell className="justify-start md:justify-end"/);
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
