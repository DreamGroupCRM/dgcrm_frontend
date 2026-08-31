// ==========================================
// DREAM GROUP CRM - DEBOUNCED VALUE HOOK
// ==========================================
// Returns `value`, but only after it's stopped changing for `delayMs`.
// Used to stop a search input from firing a real backend request on every
// keystroke — the input itself stays fully responsive (it's bound to the
// raw state, not this hook's output); only the derived value used to
// trigger the API call is delayed.
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
