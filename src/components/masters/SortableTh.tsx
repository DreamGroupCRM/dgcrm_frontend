// ==========================================
// DREAM GROUP CRM — SORTABLE COLUMN HEADER
// ==========================================
// Shared <th> for every Master/Employee/Customer table column that can be
// sorted ascending/descending. Styling lives in master.css
// (.master-th-sort / .master-sort-arrows); this component only owns the
// up/down arrow markup and the click-to-toggle behavior.
import React from 'react';
import { MdArrowDropUp, MdArrowDropDown } from 'react-icons/md';

export type SortDir = 'asc' | 'desc';

interface SortableThProps {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  style?: React.CSSProperties;
}

const SortableTh: React.FC<SortableThProps> = ({ label, active, dir, onClick, style }) => (
  <th className="master-table-th" style={style}>
    <button type="button" className="master-th-sort" onClick={onClick}>
      {label}
      <span className="master-sort-arrows">
        <MdArrowDropUp size={14} className={active && dir === 'asc' ? 'active' : ''} style={{ marginBottom: -6 }} />
        <MdArrowDropDown size={14} className={active && dir === 'desc' ? 'active' : ''} />
      </span>
    </button>
  </th>
);

export default SortableTh;
