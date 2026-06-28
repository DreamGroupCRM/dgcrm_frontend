// ==========================================
// DREAM GROUP CRM - COMPANY VIEW PAGE
// ==========================================
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdArrowBack, MdBusiness } from 'react-icons/md';
import { useAppDispatch, useAppSelector } from '../../../../hooks';
import { setPageTitle } from '../../../../redux/slices/uiSlice';
import { getTheme } from '../../../../styles/theme';
import { companyService } from '../../../../services/companyService';
import { Company } from '../../../../types';
import { ROUTES } from '../../../../constants';

const CompanyViewPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const { mode } = useAppSelector((s) => s.theme);
  const isDark   = mode === 'dark';
  const t        = getTheme(isDark);

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { dispatch(setPageTitle('View Company')); }, [dispatch]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await companyService.getById(id);
        if (res.success && res.data) {
          setCompany(res.data);
        } else {
          toast.error(res.message || 'Failed to load company');
        }
      } catch {
        toast.error('Failed to load company data');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 700, fontSize: 13,
    marginBottom: 6, color: t.textPrimary, fontFamily: t.fontFamily,
  };

  const fieldStyle: React.CSSProperties = {
    border: `1px solid ${t.inputBorder}`, borderRadius: 10,
    padding: '10px 14px', fontSize: 14, color: t.textPrimary,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: t.fontFamily, cursor: 'not-allowed', opacity: 0.85,
  };

  // Safe inside view page — no typing, so no focus/remount issue
  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="text" readOnly disabled value={value ?? '—'} style={fieldStyle} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p style={{ color: t.textMuted, fontFamily: t.fontFamily }}>Loading company data...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p style={{ color: t.textMuted, fontFamily: t.fontFamily }}>Company not found.</p>
        <button onClick={() => navigate(ROUTES.ADMIN.COMPANY)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
          <MdArrowBack size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: t.fontFamily }}>
      <div style={{ background: t.surfaceBg, border: `1px solid ${t.surfaceBorder}`, borderRadius: 14, padding: 28 }}>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          <Field label="Company Name"    value={company.name} />
          <Field label="Email"           value={company.email} />
          <Field label="Phone"           value={company.phone} />
          <Field label="WhatsApp Number" value={company.whatsapp_number} />
          <Field label="City"            value={company.city} />
          <Field label="State"           value={company.state} />
          <Field label="Country"         value={company.country} />
          <Field label="Pincode"         value={company.pincode} />
          <Field label="PAN"             value={company.pan} />
          <Field label="GST"             value={company.gst} />
        </div>

        {/* Logo */}
        {/* <div className="mb-8">
          <label style={labelStyle}>Company Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: t.insetBg, border: `1px solid ${t.surfaceBorder}` }}>
              {company.logo_url && company.logo_url !== 'string' ? (
                <img src={company.logo_url} alt="Company logo" className="w-full h-full object-contain" />
              ) : (
                <MdBusiness size={28} style={{ color: '#2563eb' }} />
              )}
            </div>
            <input type="text" readOnly disabled
              value={company.logo_url && company.logo_url !== 'string' ? company.logo_url : 'No logo uploaded'}
              style={{ ...fieldStyle }} />
          </div>
        </div> */}

        <button onClick={() => navigate(ROUTES.ADMIN.COMPANY)}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: t.btnSecondaryBg, color: t.btnSecondaryText, border: `1px solid ${t.surfaceBorder}`, cursor: 'pointer' }}>
          <MdArrowBack size={16} /> Go Back
        </button>
      </div>
    </div>
  );
};

export default CompanyViewPage;