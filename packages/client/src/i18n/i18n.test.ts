import { describe, expect, it } from 'vitest';
import { getCommonMessages, getDashboardMessages, getLocale } from './index';

describe('i18n', () => {
  it('defaults to ko locale', () => {
    expect(getLocale()).toBe('ko');
  });

  it('dashboard messages match expected Korean strings', () => {
    const t = getDashboardMessages();
    expect(t.welcome('테스트')).toBe('안녕하세요, 테스트님');
    expect(t.moreEvents(3)).toBe('외 3건 더보기');
    expect(t.unreadStatAria(5, 2)).toContain('읽지 않음 5건');
    expect(t.unreadStatAria(5, 0)).not.toContain('멘션');
  });

  it('common messages include loading', () => {
    expect(getCommonMessages().loading).toBe('불러오는 중…');
  });
});
