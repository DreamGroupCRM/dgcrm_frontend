// ==========================================
// DREAM GROUP CRM — CRUD SECTION ACCORDION
// ==========================================
// Wraps a CRUD form section (Personal Details, Bank Details, ...) with a
// collapsible header (item 2.1) — same gradient header bar every CRUD
// page already uses, now clickable with a chevron. Each section's
// open/closed state is owned by the caller (a simple Record<key,
// boolean>) rather than local state here, so a parent page can force a
// section open — e.g. item 2.2's "auto-expand the section containing a
// validation error" — from outside.
import React from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';

export interface AccordionTheme {
  surfaceBg: string;
  surfaceBorder: string;
}

interface AccordionSectionProps {
  theme: AccordionTheme;
  icon: React.ReactNode;
  title: string;
  gradient: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  // Forwarded to the outer card so a parent can scrollIntoView() it (or,
  // more precisely, scroll to a field inside it) once it's been forced open.
  sectionRef?: React.Ref<HTMLDivElement>;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ theme, icon, title, gradient, open, onToggle, children, sectionRef }) => (
  <div ref={sectionRef} className="rounded-2xl mb-5 overflow-hidden" style={{ background: theme.surfaceBg, border: `1px solid ${theme.surfaceBorder}` }}>
    <button
      type="button" onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-5 sm:px-6 py-3.5"
      style={{ background: gradient, border: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.22)' }}>
        {icon}
      </span>
      <h2 className="flex-1" style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h2>
      <MdKeyboardArrowDown
        size={20}
        style={{ color: '#fff', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      />
    </button>
    {open && <div className="p-5 sm:p-6">{children}</div>}
  </div>
);

export default AccordionSection;
