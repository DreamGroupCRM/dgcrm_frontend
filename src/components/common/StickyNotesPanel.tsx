// ==========================================
// DREAM GROUP CRM - STICKY NOTES PANEL v2
// ==========================================
// Path: src/components/layout/StickyNotesPanel.tsx
//
// NEW IN v2:
//   • Edit note inline (pencil icon below delete icon)
//   • Save / Cancel edit buttons
//   • Drag-and-drop reordering (priority sorting)
//   • Scrollable list — fixed height, scrollbar appears after 6 notes

import React, { useState, useEffect, useRef } from 'react';
import { BsStickies, BsStickyFill } from 'react-icons/bs';
import { MdClose, MdDeleteOutline, MdDragIndicator } from 'react-icons/md';
import { HiPlus } from 'react-icons/hi';
import { FiCheck, FiX } from 'react-icons/fi';

// ── Types ──────────────────────────────────────────────────────────────────
interface StickyNote {
  id: string;
  text: string;
  color: string;
  createdAt: string;
}

interface StickyNotesPanelProps {
  isDark: boolean;
  userId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  // ── 3 Light ──
  { bg: '#fef9c3', border: '#fbbf24', label: 'Yellow'  }, // classic sticky yellow
  { bg: '#dcfce7', border: '#4ade80', label: 'Mint'    }, // fresh mint green
  { bg: '#e0f2fe', border: '#38bdf8', label: 'Sky'     }, // light sky blue
  // ── 3 Dark ──
  { bg: '#1e293b', border: '#475569', label: 'Slate'   }, // dark slate
  { bg: '#1a1a2e', border: '#6366f1', label: 'Indigo'  }, // deep indigo night
  { bg: '#1c1917', border: '#d97706', label: 'Amber'   }, // dark amber/espresso
];
const DEFAULT_COLOR = NOTE_COLORS[0];

// Approx height of one note card (px) — used to compute scroll threshold
const NOTE_CARD_HEIGHT = 90;
const SCROLL_AFTER     = 4; // show scrollbar after this many notes

// ── Helpers ───────────────────────────────────────────────────────────────
const storageKey = (uid: string) => `dgcrm_sticky_notes_${uid}`;
const loadNotes  = (uid: string): StickyNote[] => {
  try { return JSON.parse(localStorage.getItem(storageKey(uid)) ?? '[]'); }
  catch { return []; }
};
const saveNotes = (uid: string, notes: StickyNote[]) =>
  localStorage.setItem(storageKey(uid), JSON.stringify(notes));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const DARK_NOTE_BG = ['#1e293b', '#1a1a2e', '#1c1917'];
const noteTextColor = (bg: string) => DARK_NOTE_BG.includes(bg) ? '#f1f5f9' : '#1f2937';
const noteDateColor = (bg: string) => DARK_NOTE_BG.includes(bg) ? '#94a3b8' : '#6b7280';

// ── Component ─────────────────────────────────────────────────────────────
const StickyNotesPanel: React.FC<StickyNotesPanelProps> = ({ isDark, userId }) => {
  const [open, setOpen]             = useState(false);
  const [notes, setNotes]           = useState<StickyNote[]>([]);

  // New-note compose
  const [composing, setComposing]   = useState(false);
  const [draft, setDraft]           = useState('');
  const [draftColor, setDraftColor] = useState(DEFAULT_COLOR);

  // Inline edit
  const [editId, setEditId]         = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [editColor, setEditColor]   = useState(DEFAULT_COLOR);

  // Delete confirm
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  // Drag-and-drop refs
  const dragIndex  = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const panelRef    = useRef<HTMLDivElement>(null);
  const newTextRef  = useRef<HTMLTextAreaElement>(null);
  const editTextRef = useRef<HTMLTextAreaElement>(null);

  // ── Load / persist ───────────────────────────────────────────────────────
  useEffect(() => { setNotes(loadNotes(userId)); }, [userId]);
  useEffect(() => { saveNotes(userId, notes); }, [notes, userId]);

  // ── Auto-focus ───────────────────────────────────────────────────────────
  useEffect(() => { if (composing) newTextRef.current?.focus(); }, [composing]);
  useEffect(() => { if (editId) editTextRef.current?.focus(); }, [editId]);

  // ── Outside click closes panel ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false); setComposing(false); setDraft('');
        setEditId(null); setDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── New note ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setNotes(prev => [{
      id: crypto.randomUUID(),
      text: trimmed,
      color: draftColor.bg,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setDraft(''); setDraftColor(DEFAULT_COLOR); setComposing(false);
  };

  const handleCancel = () => {
    setDraft(''); setDraftColor(DEFAULT_COLOR); setComposing(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    setDeleteId(null);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (note: StickyNote) => {
    setDeleteId(null);
    setEditId(note.id);
    setEditText(note.text);
    setEditColor(NOTE_COLORS.find(c => c.bg === note.color) ?? DEFAULT_COLOR);
  };

  const handleEditSave = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setNotes(prev =>
      prev.map(n => n.id === id ? { ...n, text: trimmed, color: editColor.bg } : n)
    );
    setEditId(null);
  };

  const handleEditCancel = () => setEditId(null);

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image handled by browser default
  };

  const onDragEnter = (index: number) => {
    dragOverIndex.current = index;
  };

  const onDragEnd = () => {
    const from = dragIndex.current;
    const to   = dragOverIndex.current;
    if (from === null || to === null || from === to) {
      dragIndex.current = null; dragOverIndex.current = null; return;
    }
    setNotes(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    dragIndex.current = null; dragOverIndex.current = null;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const noteCount   = notes.length;
  const listMaxH    = `${SCROLL_AFTER * NOTE_CARD_HEIGHT}px`; // ~540px

  const panelStyle = {
    background: isDark ? '#111827' : '#ffffff',
    border    : isDark ? '1px solid #374151' : '1px solid #e5e7eb',
    boxShadow : isDark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 60px rgba(0,0,0,0.15)',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={panelRef}>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-lg transition-all ${
          isDark
            ? open ? 'text-yellow-400 bg-gray-800' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
            : open ? 'text-amber-500 bg-amber-50'  : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50'
        }`}
        title="Sticky Notes"
      >
        {open ? <BsStickyFill size={18} /> : <BsStickies size={18} />}
        {noteCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ background: '#d97706' }}
          >
            {noteCount > 99 ? '99+' : noteCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-12 z-50 rounded-2xl flex flex-col overflow-hidden"
          style={{ ...panelStyle, width: 'min(360px, calc(100vw - 24px))' }}
        >

          {/* ── Panel header ── */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f3f4f6',
              background  : isDark ? '#0f172a' : '#fafafa',
            }}
          >
            <div className="flex items-center gap-2">
              <BsStickyFill size={16} style={{ color: '#d97706' }} />
              <span className="font-semibold text-sm" style={{ color: isDark ? '#f9fafb' : '#111827' }}>
                Sticky Notes
              </span>
              {noteCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: isDark ? '#292524' : '#fef3c7', color: '#d97706' }}
                >
                  {noteCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!composing && (
                <button
                  onClick={() => { setEditId(null); setDeleteId(null); setComposing(true); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: 'linear-gradient(135deg, #1a5c38, #d97706)', color: '#fff' }}
                >
                  <HiPlus size={14} /><span>New</span>
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setComposing(false); setDraft(''); setEditId(null); setDeleteId(null); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                         : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MdClose size={15} />
              </button>
            </div>
          </div>

          {/* ── Compose area (new note) ── */}
          {composing && (
            <div
              className="p-3 flex-shrink-0"
              style={{
                borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f3f4f6',
                background  : isDark ? '#0f172a' : '#fffbeb',
              }}
            >
              <ColorPicker selected={draftColor} onSelect={setDraftColor} isDark={isDark} />
              <textarea
                ref={newTextRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                placeholder="Write your note… (Ctrl+Enter to save)"
                rows={4}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                style={{
                  background: draftColor.bg,
                  border    : `1.5px solid ${draftColor.border}`,
                  color     : noteTextColor(draftColor.bg),
                  fontFamily: '"DM Sans", sans-serif',
                }}
              />
              <div className="flex justify-end gap-2 mt-2">
                <ActionBtn onClick={handleCancel} isDark={isDark} variant="ghost">Cancel</ActionBtn>
                <ActionBtn onClick={handleSave} isDark={isDark} variant="primary" disabled={!draft.trim()}>
                  Save Note
                </ActionBtn>
              </div>
            </div>
          )}

          {/* ── Notes list (scrollable) ── */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: listMaxH,
              // custom thin scrollbar
              scrollbarWidth: 'thin',
              scrollbarColor: isDark ? '#374151 transparent' : '#d1d5db transparent',
            }}
          >
            {notes.length === 0 && !composing ? (
              <EmptyState isDark={isDark} />
            ) : (
              <div className="p-3 flex flex-col gap-2.5">
                {notes.map((note, index) => (
                  <div
                    key={note.id}
                    draggable={editId !== note.id}
                    onDragStart={e => onDragStart(e, index)}
                    onDragEnter={() => onDragEnter(index)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                    onDoubleClick={() => { if (editId !== note.id && deleteId !== note.id) startEdit(note); }}
                    className="rounded-xl px-3 pt-2.5 pb-2 relative group transition-shadow hover:shadow-md"
                    style={{
                      background: note.color,
                      border    : `1.5px solid ${NOTE_COLORS.find(c => c.bg === note.color)?.border ?? '#e5e7eb'}`,
                      cursor    : editId === note.id ? 'default' : 'grab',
                    }}
                  >
                    {/* Drag handle — left centre, decorative only */}
                    {editId !== note.id && deleteId !== note.id && (
                      <span
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity"
                        style={{ color: '#6b7280', cursor: 'grab', pointerEvents: 'none' }}
                      >
                        <MdDragIndicator size={16} />
                      </span>
                    )}

                    {/* Delete icon — right centre, large hit area */}
                    {editId !== note.id && deleteId !== note.id && (
                      <button
                        onClick={() => { setEditId(null); setDeleteId(note.id); }}
                        onDragStart={e => e.preventDefault()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg hover:bg-black/10"
                        style={{ cursor: 'pointer', width: 30, height: 30, zIndex: 10 }}
                        title="Delete note"
                      >
                        <MdDeleteOutline size={19} style={{ color: '#6b7280', pointerEvents: 'none' }} />
                      </button>
                    )}

                    {/* ── Delete confirm ── */}
                    {deleteId === note.id && (
                      <div className="text-center py-1">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Delete this note?</p>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setDeleteId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-white/60 text-gray-600 hover:bg-white/80"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Edit mode ── */}
                    {editId === note.id && (
                      <div>
                        <ColorPicker selected={editColor} onSelect={setEditColor} isDark={isDark} />
                        <textarea
                          ref={editTextRef}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditSave(note.id);
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                          rows={4}
                          className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
                          style={{
                            background: editColor.bg,
                            border    : `1.5px solid ${editColor.border}`,
                            color     : noteTextColor(editColor.bg),
                            fontFamily: '"DM Sans", sans-serif',
                          }}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleEditCancel}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/60 text-gray-600 hover:bg-white/80"
                          >
                            <FiX size={12} /> Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(note.id)}
                            disabled={!editText.trim()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #1a5c38, #d97706)' }}
                          >
                            <FiCheck size={12} /> Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Normal view ── */}
                    {editId !== note.id && deleteId !== note.id && (
                      <>
                        <p
                          className="text-sm pl-3 pr-7 whitespace-pre-wrap break-words leading-relaxed"
                          style={{ color: noteTextColor(note.color), fontFamily: '"DM Sans", sans-serif' }}
                        >
                          {note.text}
                        </p>
                        <p className="text-[10px] mt-1.5 pl-3 font-medium" style={{ color: noteDateColor(note.color) }}>
                          {formatDate(note.createdAt)}
                          <span className="ml-2 opacity-50">· double-click to edit</span>
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {noteCount > 0 && (
            <div
              className="px-4 py-2 flex-shrink-0 flex items-center justify-between"
              style={{
                borderTop : isDark ? '1px solid #1f2937' : '1px solid #f3f4f6',
                background: isDark ? '#0f172a' : '#fafafa',
              }}
            >
              <span className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                {noteCount} note{noteCount !== 1 ? 's' : ''}
                {noteCount > SCROLL_AFTER && (
                  <span className="ml-1 opacity-60">· scroll to see all</span>
                )}
              </span>
              <button
                onClick={() => { if (window.confirm('Clear all sticky notes?')) setNotes([]); }}
                className="text-xs font-medium"
                style={{ color: isDark ? '#ef4444' : '#dc2626' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const ColorPicker: React.FC<{
  selected: typeof NOTE_COLORS[0];
  onSelect: (c: typeof NOTE_COLORS[0]) => void;
  isDark: boolean;
}> = ({ selected, onSelect, isDark }) => (
  <div className="flex items-center gap-1.5 mb-2">
    <span className="text-xs font-medium mr-1" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
      Color:
    </span>
    {NOTE_COLORS.map(c => (
      <button
        key={c.label}
        onClick={() => onSelect(c)}
        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
        style={{
          background  : c.bg,
          borderColor : selected.label === c.label ? c.border : 'transparent',
          outline     : selected.label === c.label ? `2px solid ${c.border}` : 'none',
          outlineOffset: 1,
        }}
        title={c.label}
      />
    ))}
  </div>
);

const ActionBtn: React.FC<{
  onClick: () => void;
  isDark: boolean;
  variant: 'primary' | 'ghost';
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, isDark, variant, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    style={
      variant === 'primary'
        ? { background: disabled ? (isDark ? '#374151' : '#e5e7eb') : 'linear-gradient(135deg, #1a5c38, #d97706)', color: '#fff' }
        : { background: isDark ? '#1f2937' : '#f3f4f6', color: isDark ? '#9ca3af' : '#6b7280' }
    }
  >
    {children}
  </button>
);

const EmptyState: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
      style={{ background: isDark ? '#1f2937' : '#fef3c7' }}
    >
      <BsStickies size={26} style={{ color: '#d97706' }} />
    </div>
    <p className="text-sm font-semibold mb-1" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
      No notes yet
    </p>
    <p className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
      Click <strong>+ New</strong> to add your first sticky note
    </p>
  </div>
);

export default StickyNotesPanel;
