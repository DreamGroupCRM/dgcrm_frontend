// My Documents — every document on file for the selected booking, shown
// large and side by side (a real preview for images, a PDF sheet for PDFs),
// each with View and Download. Moved off Home onto its own sidebar page.
import React, { useState } from 'react';
import { CircularProgress } from '@mui/material';
import { MdDownload, MdInsertDriveFile, MdPictureAsPdf, MdVisibility, MdFolderOpen } from 'react-icons/md';
import { toast } from '@/utils/toast';
import { resolveFileUrl } from '../../../utils';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import { previewKindFor, downloadDocument } from '../../../services/documentService';
import { useCustomerPortal, bookingLabel } from '../CustomerPortalContext';
import { PageHead } from '../CustomerPortalUi';

const CustomerDocumentsPage: React.FC = () => {
  const { detail, selected } = useCustomerPortal();
  const { t } = useAppearanceTokens();
  const [viewing, setViewing] = useState<{ label: string; url: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!detail) return <div className="cp-center"><CircularProgress size={28} /></div>;

  const documents = [
    { label: 'Customer Photo', url: detail.customer_image },
    { label: 'Aadhaar Card', url: detail.aadhar_card },
    { label: 'PAN Card', url: detail.pan_card },
    { label: 'Application Form', url: detail.application_form },
    { label: 'Declaration Form', url: detail.declaration_form },
    { label: 'Allotment Letter', url: detail.allotment_letter },
    // V_25.0 — a cancelled booking also lists the cancellation documents
    // that were actually uploaded (nothing is shown for ones that weren't).
    ...(selected?.is_cancelled ? [
      { label: 'Cancellation Letter', url: detail.cancel_letter ?? null },
      { label: 'Acceptance Letter', url: detail.acceptance_letter ?? null },
      { label: 'Cancellation Documents', url: detail.cancel_documents ?? null },
      { label: 'Returned Documents', url: detail.returned_documents ?? null },
    ].filter((d) => !!d.url) : []),
  ];

  const handleDownload = async (label: string, url: string) => {
    setDownloading(label);
    try {
      await downloadDocument(resolveFileUrl(url), label);
    } catch {
      toast.error('We could not download this document. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <PageHead title="My Documents" subtitle={selected ? bookingLabel(selected) : undefined} />

      <div className="cp-docs-grid">
        {documents.map(({ label, url }) => {
          const resolved = url ? resolveFileUrl(url) : null;
          const kind = resolved ? previewKindFor(resolved) : null;
          return (
            <section key={label} className="cp-doc-card">
              <div className="cp-doc-card-head">
                <span>{label}</span>
                {!resolved && <span className="cp-doc-card-missing">Not uploaded</span>}
              </div>
              <button
                type="button" className="cp-doc-card-preview" disabled={!resolved}
                onClick={() => resolved && setViewing({ label, url: resolved })}
                aria-label={resolved ? `View ${label}` : `${label} not uploaded`}
              >
                {resolved && kind === 'image' ? (
                  <img src={resolved} alt={label} />
                ) : resolved ? (
                  <span className="cp-doc-card-pdf"><MdPictureAsPdf size={56} /><span>PDF document</span></span>
                ) : (
                  <span className="cp-doc-card-pdf" style={{ color: t.textSecondary, opacity: 0.6 }}><MdInsertDriveFile size={48} /><span>Not uploaded</span></span>
                )}
              </button>
              {resolved && url && (
                <div className="cp-doc-card-actions">
                  <button type="button" className="cp-btn" onClick={() => setViewing({ label, url: resolved })}>
                    <MdVisibility size={14} /> View
                  </button>
                  <button type="button" className="cp-btn cp-btn-primary" disabled={downloading === label} onClick={() => handleDownload(label, url)}>
                    <MdDownload size={14} /> {downloading === label ? 'Downloading…' : 'Download'}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {documents.every((d) => !d.url) && (
        <div className="cp-empty" style={{ marginTop: 12 }}><MdFolderOpen size={16} /> No documents are on file for this booking yet.</div>
      )}

      {viewing && (
        <DocumentViewerModal t={t} label={viewing.label} url={viewing.url} onClose={() => setViewing(null)} />
      )}
    </>
  );
};

export default CustomerDocumentsPage;
