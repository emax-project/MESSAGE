import { isLdapEnabled } from './ldap.js';

const LOCAL_POLICY = {
  ldapEnabled: false,
  minLength: 4,
  requireUpper: false,
  requireLower: false,
  requireDigit: false,
  requireSpecial: false,
  hint: '4자 이상',
};

const LDAP_POLICY = {
  ldapEnabled: true,
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSpecial: true,
  hint: '최소 12자, 영문 대문자·소문자, 숫자, 특수문자 포함',
};

export function getPasswordPolicy() {
  return isLdapEnabled() ? { ...LDAP_POLICY } : { ...LOCAL_POLICY };
}

/**
 * @returns {string | null} 실패 시 에러 코드
 */
export function validatePassword(password) {
  const value = typeof password === 'string' ? password : '';
  const policy = getPasswordPolicy();
  if (value.length < policy.minLength) return 'PASSWORD_TOO_SHORT';
  if (policy.requireUpper && !/[A-Z]/.test(value)) return 'PASSWORD_POLICY';
  if (policy.requireLower && !/[a-z]/.test(value)) return 'PASSWORD_POLICY';
  if (policy.requireDigit && !/[0-9]/.test(value)) return 'PASSWORD_POLICY';
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(value)) return 'PASSWORD_POLICY';
  return null;
}
