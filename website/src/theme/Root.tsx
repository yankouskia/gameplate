import { useEffect, useState, type ReactNode } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function ScrollProgress(): ReactNode {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = (): void => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 3,
        width: `${pct}%`,
        background: 'linear-gradient(90deg, #7c3aed, #ff5277, #f8b400)',
        zIndex: 9999,
        transition: 'width 0.08s linear',
        pointerEvents: 'none',
        boxShadow: '0 0 8px rgba(255,82,119,0.6)',
      }}
    />
  );
}

export default function Root({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <BrowserOnly>{(): ReactNode => <ScrollProgress />}</BrowserOnly>
      {children}
    </>
  );
}
