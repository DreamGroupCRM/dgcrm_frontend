// ==========================================
// DREAM GROUP CRM — VIEW / EDIT / DELETE ROW ACTIONS
// ==========================================
// Shared row-actions trigger for every Master/Employee/Customer/Lead table
// row. V_23.0 — was a trio of separate icon buttons; now a single three-dot
// trigger opening components/common/RowActionMenu (icon + label per
// action), so every caller of this component got the app-wide 3-dot
// treatment for free with no per-page changes. The trigger button itself
// keeps the existing .master-icon-btn look (blue/white square icon button,
// see master.css) so it reads as the same control it always was.
import React from 'react';
import { MdVisibility, MdEdit, MdDelete, MdMoreVert } from 'react-icons/md';
import { useAppearanceTokens } from '../../styles/appearanceTokens';
import { RowActionMenu, RowMenuAction, useRowActionMenu } from '../common/RowActionMenu';

interface MasterIconButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: number;
}

const MasterIconButtons: React.FC<MasterIconButtonsProps> = ({ onView, onEdit, onDelete, size = 15 }) => {
  const { t } = useAppearanceTokens();
  // One MasterIconButtons instance per row, so a plain single-slot toggle
  // (no per-row id needed) is enough — each row's menu state is already
  // isolated by virtue of being a separate component instance.
  const menu = useRowActionMenu<'open'>();

  const actions: RowMenuAction[] = [];
  if (onView) actions.push({ key: 'view', label: 'View', icon: <MdVisibility size={size - 1} color="var(--brand-ink)" />, onClick: () => { menu.close(); onView(); } });
  if (onEdit) actions.push({ key: 'edit', label: 'Edit', icon: <MdEdit size={size - 1} color="var(--brand-ink)" />, onClick: () => { menu.close(); onEdit(); } });
  if (onDelete) actions.push({ key: 'delete', label: 'Delete', icon: <MdDelete size={size - 1} />, danger: true, onClick: () => { menu.close(); onDelete(); } });

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center justify-center">
      <button type="button" title="Actions" className="master-icon-btn"
        ref={menu.openId ? menu.buttonRef : undefined}
        onClick={menu.toggle('open', actions.length)}>
        <MdMoreVert size={size} />
      </button>
      {menu.openId && menu.pos && <RowActionMenu t={t} pos={menu.pos} actions={actions} />}
    </div>
  );
};

export default MasterIconButtons;
