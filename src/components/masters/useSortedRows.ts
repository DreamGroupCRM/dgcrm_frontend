// ==========================================
// DREAM GROUP CRM — SHARED TABLE SORT HOOK
// ==========================================
// Generic ascending/descending column sort for Master/Employee/Customer
// list tables (item 2). Defaults to "newest first" (by created_at) so a
// freshly-added row always appears at the top of the table until the user
// picks a different column to sort by — same default across every master.
import { useMemo, useState } from 'react';
import { SortDir } from './SortableTh';

export function useSortedRows<T, K extends string>(
  rows: T[],
  getValue: (row: T, key: K) => string | number,
  defaultKey: K,
  defaultDir: SortDir = 'desc'
) {
  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggleSort = (key: K) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir, getValue]);

  return { sorted, sortKey, sortDir, toggleSort };
}
