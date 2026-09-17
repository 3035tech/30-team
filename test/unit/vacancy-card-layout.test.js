import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('vacancy list card layout', () => {
  it('places row actions beside vacancy information on desktop', async () => {
    const source = await readFile(
      new URL('../../app/dashboard/tabs/VacanciesAdminTab.jsx', import.meta.url),
      'utf8'
    );

    assert.match(source, /md:grid-cols-\[minmax\(0,1fr\)_auto\]/);
    assert.match(source, /md:border-t-0 md:pt-0/);
    assert.match(source, /AdminActionsCell className="justify-start md:justify-end"/);
  });
});
