import { useState } from 'react';
import { useThemeStore } from '../store';

export type MessageContext = {
  filePath: string;
  line: number;
  branch: string;
};

type Props = {
  initialContext: MessageContext | null;
  onClose: () => void;
  onConfirm: (ctx: MessageContext) => void;
};

export default function ContextAttachModal({ initialContext, onClose, onConfirm }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [filePath, setFilePath] = useState(initialContext?.filePath ?? '');
  const [line, setLine] = useState(initialContext?.line ? String(initialContext.line) : '');
  const [branch, setBranch] = useState(initialContext?.branch ?? '');

  const handleConfirm = () => {
    const trimmedPath = filePath.trim();
    const lineNum = line.trim() ? parseInt(line.trim(), 10) : 0;
    const trimmedBranch = branch.trim();
    if (!trimmedPath && !trimmedBranch) {
      onClose();
      return;
    }
    onConfirm({
      filePath: trimmedPath,
      line: lineNum > 0 ? lineNum : 0,
      branch: trimmedBranch,
    });
    onClose();
  };

  const bg = isDark ? '#1e293b' : '#fff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div
        style={{ background: bg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: `1px solid ${border}`, width: 400, maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: text }}>코드 위치 첨부 (컨텍스트 스택)</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: muted, fontSize: 18 }} aria-label="닫기">×</button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>
            메시지에 코드 위치를 붙이면 상대방이 어디를 말하는지 바로 알 수 있습니다.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>파일 경로</label>
            <input
              type="text"
              placeholder="예: src/utils/auth.ts"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f172a' : '#f8fafc', color: text, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>라인 번호</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 87"
              value={line}
              onChange={(e) => setLine(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f172a' : '#f8fafc', color: text, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>브랜치 (선택)</label>
            <input
              type="text"
              placeholder="예: feature/login"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#0f172a' : '#f8fafc', color: text, fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 14, cursor: 'pointer' }}>
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#171717', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              첨부
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
