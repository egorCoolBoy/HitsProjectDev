import type { ReactNode } from 'react';

type FixedBottomBarProps = {
  children: ReactNode;
};

export function FixedBottomBar({ children }: FixedBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  );
}
