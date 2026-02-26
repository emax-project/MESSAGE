/** 윈도우 태스크바 오버레이용 N 배지 이미지 생성 (32x32 PNG data URL) */
export function generateBadgeOverlayIcon(text: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, 2 * Math.PI, false);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(text, 16, 16);

  return canvas.toDataURL('image/png');
}
