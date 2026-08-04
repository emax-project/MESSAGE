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
        'flex flex-col overflow-hidden rounded-[24px] w-full max-w-full shadow-2xl bg-white',
        className,
      )}
    >
      <div className="flex flex-col justify-center px-6 py-10 sm:px-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 mb-4 rounded-lg bg-brand-light/20 flex items-center justify-center">
            <img src={LOGO_SRC} alt="" className="w-10 h-10 object-contain" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-black">{title}</h1>
          <p className="mt-2 text-sm text-[#64748b]">{subtext}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
