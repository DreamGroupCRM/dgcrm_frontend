// src/hooks/useAccordion.ts
// Shared by every Master list page that groups its tables into
// collapsible sections (Building, Action & Module, etc).

import { useCallback, useEffect, useRef, useState } from 'react';

export const useAccordion = (defaultOpen = true) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState<number | string>(defaultOpen ? 'auto' : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  const recalc = useCallback(() => {
    if (contentRef.current) {
      setContentHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  useEffect(() => { recalc(); }, [recalc]);

  const toggle = () => setIsOpen((p) => !p);

  return { isOpen, toggle, contentRef, contentHeight, recalc };
};
