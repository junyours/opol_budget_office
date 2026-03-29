import { useState, useEffect } from 'react';

export function useScrollProgress(id: string) {
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollable(max > 4);
      setProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [id]);

  return { progress, scrollable };
}