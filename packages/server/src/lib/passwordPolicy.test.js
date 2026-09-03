import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getPasswordPolicy, validatePassword } from './passwordPolicy.js';

describe('passwordPolicy local', () => {
  const prev = process.env.LDAP_ENABLED;

  before(() => {
    delete process.env.LDAP_ENABLED;
  });

  after(() => {
    if (prev == null) delete process.env.LDAP_ENABLED;
    else process.env.LDAP_ENABLED = prev;
  });

  it('allows 4+ chars when LDAP is off', () => {
    const policy = getPasswordPolicy();
    assert.equal(policy.ldapEnabled, false);
    assert.equal(policy.minLength, 4);
    assert.equal(validatePassword('1234'), null);
    assert.equal(validatePassword('abc'), 'PASSWORD_TOO_SHORT');
  });
});

describe('passwordPolicy ldap', () => {
  const prev = process.env.LDAP_ENABLED;

  before(() => {
    process.env.LDAP_ENABLED = 'true';
  });

  after(() => {
    if (prev == null) delete process.env.LDAP_ENABLED;
    else process.env.LDAP_ENABLED = prev;
  });

  it('enforces Synology policy', () => {
    const policy = getPasswordPolicy();
    assert.equal(policy.ldapEnabled, true);
    assert.equal(policy.minLength, 12);
    assert.equal(validatePassword('Emax1234!abc'), null);
    assert.equal(validatePassword('emax1234!abc'), 'PASSWORD_POLICY');
    assert.equal(validatePassword('EMAX1234!ABC'), 'PASSWORD_POLICY');
    assert.equal(validatePassword('Emaxabcdef!x'), 'PASSWORD_POLICY');
    assert.equal(validatePassword('Emax1234abcd'), 'PASSWORD_POLICY');
    assert.equal(validatePassword('Emax1!'), 'PASSWORD_TOO_SHORT');
  });
});
