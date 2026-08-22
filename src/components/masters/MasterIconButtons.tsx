// ==========================================
// DREAM GROUP CRM — VIEW / EDIT / DELETE ROW ACTIONS
// ==========================================
// Shared action-icon trio for every Master/Employee/Customer table row.
// Styling (blue+blue border in light theme, white+white border in dark
// theme, tight icon-sized padding) lives entirely in master.css's
// .master-icon-btn — see that file's comment for why. Any of the three
// handlers can be omitted to hide that button (e.g. view-only rows).
import React from 'react';
import { MdVisibility, MdEdit, MdDelete } from 'react-icons/md';

interface MasterIconButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: number;
}

const MasterIconButtons: React.FC<MasterIconButtonsProps> = ({ onView, onEdit, onDelete, size = 15 }) => (
  <div className="flex items-center justify-center gap-1">
    {onView && (
      <button type="button" title="View" className="master-icon-btn" onClick={onView}>
        <MdVisibility size={size} />
      </button>
    )}
    {onEdit && (
      <button type="button" title="Edit" className="master-icon-btn" onClick={onEdit}>
        <MdEdit size={size} />
      </button>
    )}
    {onDelete && (
      <button type="button" title="Delete" className="master-icon-btn" onClick={onDelete}>
        <MdDelete size={size} />
      </button>
    )}
  </div>
);

export default MasterIconButtons;
