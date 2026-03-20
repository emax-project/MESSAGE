import { useState } from 'react';
import { useThemeStore } from '../store';
import UIModal from './ui/UIModal';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import ModalFooter from './ui/ModalFooter';

type Props = {
  onClose: () => void;
  onCreate: (question: string, options: string[], isMultiple: boolean) => void;
};

export default function PollCreateModal({ onClose, onCreate }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultiple, setIsMultiple] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };
  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  };

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

  const textColor = isDark ? '#e2e8f0' : '#0f172a';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const borderColor = isDark ? '#475569' : '#e2e8f0';

  return (
    <UIModal onClose={onClose} title="투표 만들기" width={420} overlayPosition="absolute" zIndex={200}>
      <UITextInput
        type="text"
        placeholder="질문을 입력하세요"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ marginBottom: 12, padding: '10px 12px', background: inputBg, color: textColor }}
      />
      <div style={{ marginBottom: 10 }}>
        {options.map((opt, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <UITextInput
              type="text"
              placeholder={`선택지 ${idx + 1}`}
              value={opt}
              onChange={(e) => updateOption(idx, e.target.value)}
              style={{ flex: 1, padding: '8px 10px', fontSize: 13, background: inputBg, color: textColor }}
            />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(idx)} style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', fontSize: 16, padding: '4px 6px' }}>
                x
              </button>
            )}
          </div>
        ))}
      </div>
      {options.length < 10 && (
        <button type="button" onClick={addOption} style={{ border: `1px dashed ${borderColor}`, background: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', cursor: 'pointer', width: '100%', marginBottom: 12 }}>
          + 선택지 추가
        </button>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: textColor, marginBottom: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={isMultiple} onChange={(e) => setIsMultiple(e.target.checked)} />
        복수 선택 허용
      </label>
      <ModalFooter bordered={false}>
        <UIButton
          type="button"
          variant="primary"
          disabled={!canSubmit}
          onClick={() => {
            const filtered = options.filter((o) => o.trim());
            if (filtered.length >= 2 && question.trim()) {
              onCreate(question.trim(), filtered.map((o) => o.trim()), isMultiple);
            }
          }}
          style={{ flex: 1 }}
        >
          만들기
        </UIButton>
        <UIButton type="button" onClick={onClose}>
          취소
        </UIButton>
      </ModalFooter>
    </UIModal>
  );
}
