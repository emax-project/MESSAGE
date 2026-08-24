import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** 추천 목록. 목록에 없는 값도 자유롭게 입력할 수 있습니다. */
  options: string[];
  placeholder?: string;
  className?: string;
  isDark: boolean;
  disabled?: boolean;
};

const MAX_VISIBLE = 8;

/**
 * 입력과 선택을 함께 지원하는 콤보박스.
 * - 직접 타이핑 가능(목록에 없는 값 허용)
 * - 입력한 글자로 목록을 걸러 자동완성 제안
 * - ↑/↓ 이동, Enter 선택, Esc 닫기
 *
 * 목록은 입력창 기준 absolute로 붙입니다. 스크롤 추적을 브라우저에 맡겨야
 * 스크롤 이벤트나 rAF가 멈추는 상황(숨겨진 창 등)에서도 어긋나지 않습니다.
 * 아래 공간이 부족하면 위로 뒤집어 띄웁니다.
 */
export default function UIComboBox({
  value,
  onChange,
  options,
  placeholder,
  className,
  isDark,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [flip, setFlip] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const uniq = Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)));
    if (!q) return uniq;
    return uniq.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  /** 아래 공간이 부족하면 위로 뒤집는다. 열릴 때 한 번만 판단한다. */
  const decideFlip = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const listH = Math.min(filtered.length || 1, MAX_VISIBLE) * 34 + 8;
    // 입력창을 감싼 스크롤 컨테이너가 있으면 그 아래 경계를 기준으로
    let bottomLimit = window.innerHeight;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        bottomLimit = Math.min(bottomLimit, p.getBoundingClientRect().bottom);
        break;
      }
    }
    setFlip(r.bottom + listH > bottomLimit && r.top - listH > 0);
  };

  useLayoutEffect(() => {
    if (open) decideFlip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 활성 항목이 목록 밖으로 나가면 스크롤
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => (filtered.length === 0 ? -1 : (i + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return;
      setActiveIndex((i) => (filtered.length === 0 ? -1 : (i <= 0 ? filtered.length : i) - 1));
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        commit(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const showList = open && filtered.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {options.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="목록 열기"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 border-none bg-transparent px-1 text-[10px] leading-none cursor-pointer',
            isDark ? 'text-slate-400' : 'text-slate-400',
          )}
        >
          ▾
        </button>
      )}
      {showList && (
        <ul
          ref={listRef}
          role="listbox"
          style={{ maxHeight: MAX_VISIBLE * 34, zIndex: 60 }}
          className={cn(
            'absolute left-0 right-0 m-0 list-none overflow-auto rounded-lg border p-1 shadow-lg',
            flip ? 'bottom-full mb-1' : 'top-full mt-1',
            isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white',
          )}
        >
          {filtered.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(opt)}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                'cursor-pointer truncate rounded px-2 py-1.5 text-[13px]',
                i === activeIndex
                  ? isDark
                    ? 'bg-slate-700 text-slate-100'
                    : 'bg-slate-100 text-slate-900'
                  : isDark
                    ? 'text-slate-200'
                    : 'text-slate-700',
              )}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
