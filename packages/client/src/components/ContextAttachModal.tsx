import { useState } from 'react';
import { useThemeStore } from '../store';
import UIModal from './ui/UIModal';
import UITextInput from './ui/UITextInput';
import UIButton from './ui/UIButton';

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

  const text = isDark ? '#f1f5f9' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <UIModal onClose={onClose} width={400} title="코드 위치 첨부 (컨텍스트 스택)" zIndex={10002}>
      <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>
        메시지에 코드 위치를 붙이면 상대방이 어디를 말하는지 바로 알 수 있습니다.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>파일 경로</label>
        <UITextInput
          type="text"
          placeholder="예: src/utils/auth.ts"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>라인 번호</label>
        <UITextInput
          type="text"
          inputMode="numeric"
          placeholder="예: 87"
          value={line}
          onChange={(e) => setLine(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>브랜치 (선택)</label>
        <UITextInput
          type="text"
          placeholder="예: feature/login"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <UIButton type="button" onClick={onClose}>
          취소
        </UIButton>
        <UIButton type="button" variant="primary" onClick={handleConfirm}>
          첨부
        </UIButton>
      </div>
    </UIModal>
  );
}
