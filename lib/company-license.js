/** Commercial metadata only. Never use license state to authorize access. */
export const COMPANY_LICENSE = Object.freeze({
  PLAN: 'early_access',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  NUMBER_PREFIX: '30T-EA-',
  NUMBER_DIGITS: 6,
});

export function companyLicenseSummary(row) {
  if (row.licenseNumber == null) return null;
  return {
    number: COMPANY_LICENSE.NUMBER_PREFIX + String(row.licenseNumber).padStart(COMPANY_LICENSE.NUMBER_DIGITS, '0'),
    plan: COMPANY_LICENSE.PLAN,
    startsAt: row.licenseStartsAt,
    expiresAt: row.licenseExpiresAt,
    status: row.licenseExpired ? COMPANY_LICENSE.EXPIRED : COMPANY_LICENSE.ACTIVE,
  };
}
