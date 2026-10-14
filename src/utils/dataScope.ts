// V_25.0 — a Head's "My Data / Team Data" choice, now on the Payment Due
// page only (no longer a global Header switch). Kept in memory, not in
// storage: the Payment Due page sets it and puts it back to 'team' when it
// unmounts, so every other page always shows the Head's whole team. While
// it is 'mine', API calls carry X-Data-Scope: mine and the server narrows a
// Head's lists to their own records. Permission checks on the server ignore
// it, so it only ever narrows what is shown.
export type DataScope = 'mine' | 'team';
let current: DataScope = 'team';

// Older builds stored the choice in localStorage; drop it so it can't stick.
try { localStorage.removeItem('dgcrm:data-scope'); } catch { /* storage blocked */ }

export function getDataScope(): DataScope {
  return current;
}

export function setDataScope(scope: DataScope): void {
  current = scope;
}
