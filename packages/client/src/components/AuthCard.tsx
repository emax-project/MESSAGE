import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

const LOGO_SRC = `${import.meta.env.BASE_URL}emax-logo.svg`;

type Props = {
  children: ReactNode;
  title: string;
  subtext: ReactNode;
  className?: string;
};

export function AuthCard({ children, title, subtext, className }: Props) {
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-[32px] w-full max-w-[880px] min-h-[520px] shadow-2xl',
        className,
      )}
    >
      {/* Left: visual area */}
      <div className="hidden sm:flex flex-[1.2] min-w-0 items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#1a365d] to-[#0f2744] p-12">
        <img
          src={LOGO_SRC}
          alt=""
          className="w-[220px] h-[220px] object-contain opacity-95"
          aria-hidden
        />
      </div>
      {/* Right: form */}
      <div className="flex-1 min-w-[340px] flex flex-col justify-center bg-white px-10 sm:px-14 py-12">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-10 h-10 mb-4 rounded-lg bg-[#7CA5FF]/20 flex items-center justify-center">
            <img src={LOGO_SRC} alt="" className="w-6 h-6 object-contain" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-black">{title}</h1>
          <p className="mt-2 text-sm text-[#64748b]">{subtext}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
