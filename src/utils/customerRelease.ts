// V_29.0 (E4) — the Admin's preview before a change that takes customers /
// refund cases off an employee (demotion, department change, made inactive,
// deleted). Returns true when the Admin goes ahead.
import { showAlert } from './index';
import type { CustomerReleaseImpact } from '../services/employeeDetailsService';

export async function confirmCustomerRelease(impact: CustomerReleaseImpact): Promise<boolean> {
  const label = (c: { customer_code: string | null; name: string }) => `${c.customer_code ? `${c.customer_code} · ` : ''}${c.name}`;
  const items = [
    ...impact.customers.map((c) => `Customer: ${label(c)}`),
    ...impact.refund_cases.map((c) => `Refund case: ${label(c)}`),
  ];
  const notes = [
    impact.pending_requests ? `${impact.pending_requests} request(s) they sent are still waiting for approval — they stay for you to approve or reject.` : '',
    impact.open_tasks ? `${impact.open_tasks} open task(s) are assigned to them — they are not changed.` : '',
  ].filter(Boolean).join(' ');
  const ok = await showAlert.confirmWithList(
    `This employee ${impact.reason}. The items below will be taken off them and become Unassigned (the customer's department stays; other employees on the same customer are not changed).${notes ? ` ${notes}` : ''}`,
    'Customers will become Unassigned',
    items,
  );
  return ok.isConfirmed;
}
