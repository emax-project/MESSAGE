import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeLdapFilterValue,
  buildUserSearchFilter,
  loginIdentifierToUid,
  isPwdResetTrue,
  isLocalExceptionEmail,
  isLdapEnabled,
  mapLdapError,
} from './ldap.js';

describe('ldap helpers', () => {
  it('escapes filter specials', () => {
    assert.equal(escapeLdapFilterValue('a(b)*c\\d'), 'a\\28b\\29\\2ac\\5cd');
  });

  it('builds search filter with escaped uid', () => {
    const filter = buildUserSearchFilter(
      'wt)kim',
      '(&(objectClass=posixAccount)(uid=%s)(!(shadowExpire=1)))',
    );
    assert.equal(filter, '(&(objectClass=posixAccount)(uid=wt\\29kim)(!(shadowExpire=1)))');
  });

  it('extracts uid from email or raw id', () => {
    assert.equal(loginIdentifierToUid('wtkim@csin.kr'), 'wtkim');
    assert.equal(loginIdentifierToUid('wtkim'), 'wtkim');
    assert.equal(loginIdentifierToUid('  wtkim2@CSIN.KR '), 'wtkim2');
    assert.equal(loginIdentifierToUid(''), '');
  });

  it('detects pwdReset values', () => {
    assert.equal(isPwdResetTrue('TRUE'), true);
    assert.equal(isPwdResetTrue('true'), true);
    assert.equal(isPwdResetTrue(['1']), true);
    assert.equal(isPwdResetTrue('FALSE'), false);
    assert.equal(isPwdResetTrue(null), false);
  });

  it('maps LDAP bind failures', () => {
    assert.equal(mapLdapError({ name: 'InvalidCredentialsError', code: 49 }), 'INVALID_CREDENTIALS');
    assert.equal(mapLdapError({ message: 'account locked' }), 'ACCOUNT_LOCKED');
    assert.equal(mapLdapError({ name: 'TimeoutError' }), 'LDAP_UNAVAILABLE');
    assert.equal(mapLdapError({ name: 'ConstraintViolationError', message: 'Password is too short' }), 'PASSWORD_POLICY');
  });
});

describe('ldap env flags', () => {
  const prev = {
    LDAP_ENABLED: process.env.LDAP_ENABLED,
    LDAP_LOCAL_EXCEPTIONS: process.env.LDAP_LOCAL_EXCEPTIONS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  };

  before(() => {
    process.env.LDAP_ENABLED = 'true';
    process.env.LDAP_LOCAL_EXCEPTIONS = 'ext@csin.kr';
    process.env.ADMIN_EMAIL = 'admin@csin.kr, other@csin.kr';
  });

  after(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v == null) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('reads LDAP_ENABLED at call time', () => {
    assert.equal(isLdapEnabled(), true);
  });

  it('treats admin and explicit exceptions as local', () => {
    assert.equal(isLocalExceptionEmail('admin@csin.kr'), true);
    assert.equal(isLocalExceptionEmail('OTHER@csin.kr'), true);
    assert.equal(isLocalExceptionEmail('ext@csin.kr'), true);
    assert.equal(isLocalExceptionEmail('wtkim@csin.kr'), false);
  });
});
