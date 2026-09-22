// ==========================================
// DREAM GROUP CRM - GENERIC ROW ACTION MENU
// ==========================================
// V_23.0 — a shared three-dot ("⋮") action menu for any table row, so
// Payment Received/Approval (and any future table) don't each hand-roll
// their own icon-button row. Rendered via a document.body portal at
// `position: fixed`, mirroring CustomerDetailsListPage.tsx's own
// RowActionMenu pattern: this is what keeps the dropdown drawing ABOVE
// the table and never clipped by a scrolling ancestor (most of these
// tables sit inside a `.master-table-scroll` div with overflow:auto — an
// absolutely-positioned dropdown nested inside that would get cut off at
// its edge; a fixed-position portal escapes it entirely).
import React from 'react';
import { createPortal } from 'react-dom';
import { AppTheme } from '../../styles/theme';

export interface RowMenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean; // red text — e.g. Delete
  // Overrides the button's tooltip — for a disabled action that needs to
  // explain WHY (e.g. "The Super Admin account is protected") rather than
  // just showing its own label back as a no-op tooltip.
  title?: string;
}

export const ROW_MENU_WIDTH = 200;

// Fixed per-row height estimate (borders + padding), same approach as
// CustomerDetailsListPage's CUSTOMER_MENU_HEIGHT — good enough to keep the
// menu from running off the bottom of the viewport; it doesn't need to be
// exact since it only decides whether the menu opens above or below.
const ROW_HEIGHT_PX = 34;

export const computeRowMenuPos = (rect: DOMRect, actionCount: number): { top: number; left: number } => {
  const menuHeight = actionCount * ROW_HEIGHT_PX + 8;
  const spaceRight = window.innerWidth - rect.right;
  const left = spaceRight >= ROW_MENU_WIDTH + 8
    ? rect.right - ROW_MENU_WIDTH
    : Math.max(8, rect.left - ROW_MENU_WIDTH - 4);
  const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8));
  return { top, left };
};

export const RowActionMenu: React.FC<{
  t: AppTheme; pos: { top: number; left: number }; actions: RowMenuAction[];
}> = ({ t, pos, actions }) => createPortal(
  <div
    data-row-action-menu
    style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 100, minWidth: ROW_MENU_WIDTH,
      background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 8,
      boxShadow: '0 6px 16px rgba(0,0,0,0.16)', overflow: 'hidden',
    }}
  >
    {actions.map((a, i) => (
      <button key={a.key} type="button" title={a.title ?? a.label} onClick={a.onClick} disabled={a.disabled}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs whitespace-nowrap"
        style={{
          background: 'transparent', border: 'none',
          borderBottom: i < actions.length - 1 ? `1px solid ${t.divider}` : 'none',
          cursor: a.disabled ? 'not-allowed' : 'pointer',
          color: a.danger ? '#dc2626' : t.textPrimary, fontFamily: t.fontFamily,
        }}>
        {a.icon} {a.label}
      </button>
    ))}
  </div>,
  document.body
);

// Shared click-away hook — closes whichever row's menu is open on any
// mousedown outside both the trigger button (buttonRef) and the portaled
// menu itself (tagged data-row-action-menu, since it lives outside the
// component tree once portaled).
export function useRowActionMenu<T extends string | number>() {
  const [openId, setOpenId] = React.useState<T | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (buttonRef.current?.contains(target)) return;
      if (target.closest?.('[data-row-action-menu]')) return;
      setOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: T, actionCount: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (openId === id) { setOpenId(null); setPos(null); return; }
    setPos(computeRowMenuPos(e.currentTarget.getBoundingClientRect(), actionCount));
    setOpenId(id);
  };

  const close = () => { setOpenId(null); setPos(null); };

  return { openId, pos, buttonRef, toggle, close };
}
