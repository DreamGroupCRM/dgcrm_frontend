// ==========================================
// DGCRM — QUICK VIEW (shared document viewer)
// ==========================================
// One modal, used everywhere an uploaded document is shown: Employee
// documents, Customer documents, and the customer portal's own document
// tiles. Replaces the previous behaviour, which was a plain
// <a target="_blank"> that dropped the user out of the application onto a
// raw file URL — and, on formats the browser will not render, straight
// into a download they did not ask for.
//
// ── How the file is fetched ──
// Through the ordinary authenticated axios instance (services/
// documentService.ts), NOT by pointing an <img>/<iframe> at a public URL.
// The session token goes up as a header, the server applies the same
// authorization it applies to every other request, and the bytes come back
// over that authenticated channel. Nothing is made publicly readable to
// make Quick View work, and the viewer cannot show a document the caller
// would not already be allowed to fetch.
//
// ── What can actually be previewed ──
//   images (JPG/JPEG/PNG/GIF/WEBP)  — rendered inline
//   PDF                             — the browser's own viewer, inline
//   DOC/DOCX/XLS/XLSX/PPT/PPTX      — NOT previewable in a browser.
//                                     Shown as a document info card with
//                                     Download, rather than pretending.
// Rendering Office formats would mean shipping a converter or handing the
// file to an external viewer service (Google/Microsoft), which would mean
// uploading customers' ID documents to a third party. That is not a
// trade-off to make silently, so the honest fallback is used instead.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { MdClose, MdDownload, MdDescription, MdErrorOutline } from 'react-icons/md';
import { AppTheme } from '../../styles/theme';
import {
  fetchDocument, saveBlob, previewKindFor, extensionLabel, formatBytes, downloadNameFor,
  PreviewKind,
} from '../../services/documentService';

export interface DocumentViewerModalProps {
  t: AppTheme;
  /** Human label — the modal title, and the basis for the saved filename. */
  label: string;
  /** Served path from resolveFileUrl(). */
  url: string;
  onClose: () => void;
}

type State =
  | { phase: 'loading' }
  | { phase: 'ready'; objectUrl: string; blob: Blob; size: number }
  | { phase: 'error'; message: string };

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ t, label, url, onClose }) => {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const kind: PreviewKind = previewKindFor(url);
  const ext = extensionLabel(url);
  // Held in a ref as well as in state so cleanup can revoke it without
  // having to re-run the effect when state changes.
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setState({ phase: 'loading' });

    fetchDocument(url, controller.signal)
      .then(({ objectUrl, blob, size }) => {
        if (cancelled) { URL.revokeObjectURL(objectUrl); return; }
        objectUrlRef.current = objectUrl;
        setState({ phase: 'ready', objectUrl, blob, size });
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        setState({
          phase: 'error',
          message:
            status === 404 ? 'This file is no longer available. It may have been removed.'
            : status === 401 || status === 403 ? 'You do not have permission to view this document.'
            : 'This document could not be loaded. Please try again, or use Download.',
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
      // Release the blob so reopening the same document does not leak one
      // object URL per open.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url]);

  // Escape closes, matching the app's other modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = useCallback(() => {
    if (state.phase !== 'ready') return;
    saveBlob(state.blob, downloadNameFor(label, url));
  }, [state, label, url]);

  const body = () => {
    if (state.phase === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 320 }}>
          <CircularProgress size={30} sx={{ color: t.accentText }} />
          <span style={{ fontSize: 12.5, color: t.textMuted }}>Loading document...</span>
        </div>
      );
    }
    if (state.phase === 'error') {
      return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 text-center" style={{ minHeight: 320 }}>
          <MdErrorOutline size={34} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: t.textPrimary }}>{state.message}</span>
        </div>
      );
    }
    if (kind === 'image') {
      return (
        <img
          src={state.objectUrl}
          alt={label}
          style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain' }}
        />
      );
    }
    if (kind === 'pdf') {
      // The browser's built-in PDF viewer. `title` is required for
      // screen readers; the blob URL means this never exposes the file's
      // real location.
      return (
        <iframe
          title={label}
          src={state.objectUrl}
          style={{ width: '100%', height: '72vh', border: 'none', background: '#fff' }}
        />
      );
    }
    // Office and anything else: say plainly that it cannot be shown here,
    // and give the user the action that does work.
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ minHeight: 320 }}>
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 72, height: 72, background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}
        >
          <MdDescription size={34} style={{ color: t.accentText }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{label}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            {[ext && `${ext} document`, formatBytes(state.size)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: t.textSecondary, margin: 0, maxWidth: 380 }}>
          {ext ? `${ext} files` : 'Files of this type'} cannot be previewed in the browser.
          Download the file to open it in the application it belongs to.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
          style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}
        >
          <MdDownload size={15} /> Download
        </button>
      </div>
    );
  };

  return (
    // Clicking the backdrop closes; clicking the panel does not. Scroll
    // position of the page behind is untouched — this is an overlay, not a
    // navigation, so the list the user came from is exactly where it was.
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
    >
      <div
        className="rounded-2xl w-full flex flex-col"
        style={{ maxWidth: 820, maxHeight: '90vh', background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${t.divider}` }}>
          <h3 className="truncate" style={{ fontSize: 14.5, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
            {label}{ext ? <span style={{ fontWeight: 600, color: t.textMuted }}> · {ext}</span> : null}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={state.phase !== 'ready'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: t.insetBg, color: t.textPrimary, border: `1px solid ${t.surfaceBorder}`, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <MdDownload size={14} /> Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex items-center justify-center rounded-lg"
              style={{ width: 30, height: 30, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <MdClose size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center" style={{ background: t.insetBg, overflow: 'auto', minHeight: 320 }}>
          {body()}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
