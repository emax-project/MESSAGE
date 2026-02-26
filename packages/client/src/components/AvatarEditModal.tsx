import { useState, useRef, useCallback, useEffect } from 'react';
import { useThemeStore } from '../store';

const VIEW_SIZE = 200;
const CROP_SIZE = 256;

type Props = {
  file: File;
  onClose: () => void;
  onConfirm: (croppedFile: File) => Promise<void>;
};

/** 프로필 사진 업로드 전 미리보기 및 둥근 사각형 크롭 (카카오톡 스타일) */
export default function AvatarEditModal({ file, onClose, onConfirm }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) return;
    let url = '';
    try {
      url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (e) {
      console.warn('[AvatarEditModal] createObjectURL 실패:', e);
      setPreviewUrl('');
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(3, s + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const cropAndUpload = useCallback(async () => {
    if (!imgRef.current || !imgRef.current.complete) return;
    setSaving(true);
    setError(null);
    try {
      const img = imgRef.current;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const baseScale = Math.max(VIEW_SIZE / imgW, VIEW_SIZE / imgH);
      const drawScale = baseScale * scale;
      const drawW = imgW * drawScale;
      const drawH = imgH * drawScale;
      const dx = VIEW_SIZE / 2 - drawW / 2 + position.x;
      const dy = VIEW_SIZE / 2 - drawH / 2 + position.y;

      const tmp = document.createElement('canvas');
      tmp.width = VIEW_SIZE;
      tmp.height = VIEW_SIZE;
      const tmpCtx = tmp.getContext('2d');
      if (!tmpCtx) throw new Error('Canvas not available');
      tmpCtx.drawImage(img, 0, 0, imgW, imgH, dx, dy, drawW, drawH);

      const out = document.createElement('canvas');
      out.width = CROP_SIZE;
      out.height = CROP_SIZE;
      const outCtx = out.getContext('2d');
      if (!outCtx) throw new Error('Canvas not available');
      outCtx.drawImage(tmp, 0, 0, VIEW_SIZE, VIEW_SIZE, 0, 0, CROP_SIZE, CROP_SIZE);

      const blob = await new Promise<Blob>((resolve, reject) => {
        out.toBlob((b) => (b ? resolve(b) : reject(new Error('Blob failed'))), 'image/jpeg', 0.92);
      });
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'avatar.jpg', { type: 'image/jpeg' });
      await onConfirm(croppedFile);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '크롭 처리에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [position, scale, file.name, onConfirm, onClose]);

  const bg = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10005,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: bg,
          borderRadius: 16,
          padding: 24,
          maxWidth: 360,
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: text }}>프로필 사진 편집</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: muted }}>드래그하여 위치를 조정하고, 스크롤로 확대/축소할 수 있습니다.</p>
        <div
          style={{
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            margin: '0 auto 16px',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative' as const,
            background: isDark ? '#334155' : '#e2e8f0',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {previewUrl ? (
            <img
              ref={imgRef}
              src={previewUrl}
              alt="미리보기"
              onError={() => setError('이미지를 불러올 수 없습니다')}
              style={{
                position: 'absolute' as const,
                left: '50%',
                top: '50%',
                width: `${100 * scale}%`,
                height: `${100 * scale}%`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          ) : (
            <span style={{ fontSize: 13, color: muted }}>이미지 로딩 중...</span>
          )}
        </div>
        {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#ef4444' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 14, cursor: 'pointer' }}>
            취소
          </button>
          <button type="button" onClick={cropAndUpload} disabled={saving} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#171717', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '적용 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
}
