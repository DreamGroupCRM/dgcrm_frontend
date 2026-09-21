// My Documents — every file captured when the booking was created, each
// with View and Download.
//
// Both actions go through the app's existing protected-document path
// rather than a plain link: uploads are not public (see the backend's
// shared/fileAccess.ts), an <a href> could not send the credential, and
// the viewer already knows how to render an image, a PDF or an
// unpreviewable type. A document that was never uploaded is still listed,
// marked "Not uploaded", so the customer can see what is on file and what
// is missing rather than guessing from an absent card.
import React, { useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { MdFolderOpen, MdVisibility, MdDownload, MdInsertDriveFile, MdPictureAsPdf } from 'react-icons/md';
import { resolveFileUrl } from '../../../utils';
import { useAppearanceTokens } from '../../../styles/appearanceTokens';
import DocumentViewerModal from '../../../components/common/DocumentViewerModal';
import { previewKindFor, downloadDocument } from '../../../services/documentService';
import { useCustomerPortal } from '../CustomerPortalContext';
import { PageHead, Card } from '../CustomerPortalUi';

const CustomerDocumentsPage: React.FC = () => {
  const { detail } = useCustomerPortal();
  const { t } = useAppearanceTokens();
  const [viewing, setViewing] = useState<{ label: string; url: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const documents = useMemo(() => ([
    { label: 'Customer Photo', url: detail?.customer_image ?? null },
    { label: 'Aadhar Card', url: detail?.aadhar_card ?? null },
    { label: 'PAN Card', url: detail?.pan_card ?? null },
    { label: 'Application Form', url: detail?.application_form ?? null },
    { label: 'Declaration Form', url: detail?.declaration_form ?? null },
    { label: 'Allotment Letter', url: detail?.allotment_letter ?? null },
  ]), [detail]);

  const handleDownload = async (label: string, url: string) => {
    setDownloading(label);
    try {
      await downloadDocument(resolveFileUrl(url), label);
    } finally {
      setDownloading(null);
    }
  };

  if (!detail) return <div className="cp-center"><CircularProgress size={28} /></div>;

  const uploaded = documents.filter((d) => d.url).length;

  return (
    <>
      <PageHead title="My Documents" subtitle="Documents we hold against your booking" />

      <Card icon={<MdFolderOpen size={16} />} title={`Documents (${uploaded} of ${documents.length} uploaded)`}>
        <div className="cp-docs">
          {documents.map(({ label, url }) => {
            const resolved = url ? resolveFileUrl(url) : null;
            const isImage = resolved ? previewKindFor(resolved) === 'image' : false;
            return (
              <div key={label} className="cp-doc">
                <div className="cp-doc-preview">
                  {resolved && isImage ? (
                    <img src={resolved} alt="" />
                  ) : resolved ? (
                    <MdPictureAsPdf size={38} style={{ color: '#dc2626' }} />
                  ) : (
                    <MdInsertDriveFile size={34} style={{ color: t.textSecondary, opacity: 0.55 }} />
                  )}
                </div>
                <div className="cp-doc-body">
                  <div className="cp-doc-name">{label}</div>
                  <div className="cp-doc-status">{url ? 'Uploaded' : 'Not uploaded'}</div>
                  {url && resolved && (
                    <div className="cp-btn-row">
                      <button type="button" className="cp-btn" onClick={() => setViewing({ label, url: resolved })}>
                        <MdVisibility size={14} /> View
                      </button>
                      <button
                        type="button" className="cp-btn cp-btn-primary"
                        disabled={downloading === label}
                        onClick={() => handleDownload(label, url)}
                      >
                        <MdDownload size={14} /> {downloading === label ? '...' : 'Download'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {viewing && (
        <DocumentViewerModal t={t} label={viewing.label} url={viewing.url} onClose={() => setViewing(null)} />
      )}
    </>
  );
};

export default CustomerDocumentsPage;
