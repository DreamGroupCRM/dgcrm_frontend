// V_25.0 — a Head's "My Data / Team Data" switch. Stored per browser and
// sent with every API call as X-Data-Scope; the server narrows a Head's
// lists (Customer Details, Payment Due, Payment Received, follow-ups,
// Leads) to their own records when it is 'mine'. Permission checks on the
// server ignore it, so it only ever narrows what is shown.
export type DataScope = 'mine' | 'team';
const KEY = 'dgcrm:data-scope';

export function getDataScope(): DataScope {
  try { return localStorage.getItem(KEY) === 'mine' ? 'mine' : 'team'; } catch { return 'team'; }
}

export function setDataScope(scope: DataScope): void {
  try { localStorage.setItem(KEY, scope); } catch { /* storage blocked: stays Team Data */ }
}
