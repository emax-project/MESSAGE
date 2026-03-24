import { commonKo } from './locales/ko/common';
import { dashboardKo } from './locales/ko/dashboard';

/** 현재 앱 기본 로케일 (향후 사용자 설정·브라우저 언어와 연동 가능) */
export type AppLocale = 'ko';

const locales = {
  ko: {
    common: commonKo,
    dashboard: dashboardKo,
  },
} as const;

export function getLocale(): AppLocale {
  return 'ko';
}

/** 대시보드 홈 문구 */
export function getDashboardMessages() {
  return locales[getLocale()].dashboard;
}

/** 공통 UI 문구 */
export function getCommonMessages() {
  return locales[getLocale()].common;
}

export { commonKo, dashboardKo };
