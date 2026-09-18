import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('mobile manager session contract', () => {
  it('uses purpose-bound short-lived tokens and live membership validation', () => {
    const session = source('lib/mobile-manager-session.js');
    assert.match(session, /mobile_access/);
    assert.match(session, /mobile_company_selection/);
    assert.match(session, /mobile_second_factor/);
    assert.match(session, /m\.active = TRUE/);
    assert.match(session, /m\.deleted = FALSE/);
    assert.match(session, /c\.active = TRUE/);
    assert.match(session, /c\.deleted = FALSE/);
    assert.match(session, /LIMIT \$2/);
    assert.doesNotMatch(session, /SELECT \*/);
  });

  it('exposes the versioned mobile session lifecycle', () => {
    const routes = [
      'app/api/mobile/v1/auth/login/route.js',
      'app/api/mobile/v1/auth/2fa/verify/route.js',
      'app/api/mobile/v1/session/route.js',
      'app/api/mobile/v1/session/company/select/route.js',
      'app/api/mobile/v1/session/company/switch/route.js',
      'app/api/mobile/v1/session/refresh/route.js',
      'app/api/mobile/v1/session/logout/route.js',
    ];
    for (const route of routes) {
      const code = source(route);
      assert.match(code, /Cache-Control/);
      assert.doesNotMatch(code, /team30_session/);
    }
  });

  it('stores only refresh token hashes and detects replay by family', () => {
    const refresh = source('lib/mobile-refresh-session.js');
    const migration = source('migrations/116_mobile_refresh_sessions.sql');
    assert.match(refresh, /createHash\('sha256'\)/);
    assert.match(refresh, /FOR UPDATE/);
    assert.match(refresh, /MOBILE_REFRESH_FAILURE\.REUSED/);
    assert.match(refresh, /revokeFamily/);
    assert.match(migration, /token_hash CHAR\(64\)/);
    assert.doesNotMatch(migration, /refresh_token\s+TEXT/i);
  });

  it('never authorizes a company id supplied by the client', () => {
    const select = source('app/api/mobile/v1/session/company/select/route.js');
    const switching = source('app/api/mobile/v1/session/company/switch/route.js');
    const selectInput = select.match(/const selectSchema = z\.object\(\{[\s\S]*?\}\);/)?.[0];
    const switchInput = switching.match(/const switchSchema = z\.object\(\{[\s\S]*?\}\);/)?.[0];
    assert.match(selectInput, /membershipId/);
    assert.match(switchInput, /membershipId/);
    assert.match(switchInput, /refreshToken/);
    assert.doesNotMatch(selectInput, /companyId/);
    assert.doesNotMatch(switchInput, /companyId/);
    assert.match(select, /activeMembership\.company\.id/);
    assert.match(switching, /activeMembership\.company\.id/);
  });
});
