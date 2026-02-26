/** undefined/null일 때 .length 접근으로 인한 TypeError 방지 */
export function safeLength<T>(arr: T[] | undefined | null): number {
  return Array.isArray(arr) ? arr.length : 0;
}

/** undefined/null일 때 빈 배열 반환 (map, forEach 등에 사용) */
export function ensureArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}
