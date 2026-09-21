// ==========================================
// DGCRM — CUSTOMER PORTAL SHARED STATE
// ==========================================
// One login can be linked to several bookings (a customer who has bought
// more than one flat, or a flat and a shop — see the backend's
// Customer.user_id and customerPortal.repository.ts). The header carries a
// switcher listing them by customer code, and EVERY page in the portal has
// to reflect whichever booking is currently selected.
//
// That selection therefore lives here, above the router outlet, rather than
// in any one page: switching booking on Payment History and then navigating
// to Documents must keep showing the same booking, and a page must never
// briefly render the previous booking's data while its own fetch catches
// up.
//
// The selection is also remembered in localStorage, so a refresh (or
// following a link straight into a deep page) comes back to the booking the
// customer was last looking at rather than resetting to the first one.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchMyBookings, fetchMyBookingDetail,
  PortalBookingSummary, PortalBookingDetail,
} from '../../services/customerPortalService';

const SELECTED_BOOKING_KEY = 'dgcrm.portal.booking';

interface CustomerPortalValue {
  /** Every booking linked to this login, in the order the API returned. */
  bookings: PortalBookingSummary[];
  /** The booking every page is currently showing, or null before load. */
  selectedId: number | null;
  selected: PortalBookingSummary | null;
  /** Full detail for the selected booking — personal, property, documents. */
  detail: PortalBookingDetail | null;
  loading: boolean;
  error: string | null;
  selectBooking: (id: number) => void;
  /** Re-reads the booking list and the selected booking's detail. */
  reload: () => void;
}

const CustomerPortalContext = createContext<CustomerPortalValue | null>(null);

const readStoredId = (): number | null => {
  try {
    const raw = localStorage.getItem(SELECTED_BOOKING_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const CustomerPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<PortalBookingSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PortalBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  // ── Booking list ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // The ids arrive as STRINGS: they are bigint columns, which the
        // MySQL driver hands back as strings to avoid losing precision,
        // even though the API type declares `number`. Left as they are,
        // `b.id === storedNumericId` is always false and a remembered
        // booking silently loses to the first one on every reload.
        // Normalising here keeps the rest of the portal honestly numeric.
        const rows = (await fetchMyBookings()).map((b) => ({ ...b, id: Number(b.id) }));
        if (cancelled) return;
        setBookings(rows);

        // A stored id is only honoured when it is still one of THIS login's
        // bookings — otherwise a stale value (or one copied between
        // accounts on a shared computer) would ask the API for a booking
        // that is not ours and show an error on every page.
        const stored = readStoredId();
        const valid = stored != null && rows.some((b) => b.id === stored);
        setSelectedId(valid ? stored : (rows[0]?.id ?? null));
      } catch {
        if (!cancelled) setError('We could not load your bookings. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadToken]);

  // ── Detail for whichever booking is selected ──────────────────────────
  useEffect(() => {
    if (selectedId == null) { setDetail(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMyBookingDetail(selectedId);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, reloadToken]);

  const selectBooking = useCallback((id: number) => {
    setSelectedId(id);
    // Cleared on the next switch anyway, but dropping it here means a page
    // can never paint the previous booking's details under the new
    // booking's heading while the fetch above is still in flight.
    setDetail(null);
    try { localStorage.setItem(SELECTED_BOOKING_KEY, String(id)); } catch { /* private mode */ }
  }, []);

  const value = useMemo<CustomerPortalValue>(() => ({
    bookings,
    selectedId,
    selected: bookings.find((b) => b.id === selectedId) ?? null,
    detail,
    loading,
    error,
    selectBooking,
    reload,
  }), [bookings, selectedId, detail, loading, error, selectBooking, reload]);

  return <CustomerPortalContext.Provider value={value}>{children}</CustomerPortalContext.Provider>;
};

export function useCustomerPortal(): CustomerPortalValue {
  const ctx = useContext(CustomerPortalContext);
  if (!ctx) throw new Error('useCustomerPortal must be used inside CustomerPortalProvider');
  return ctx;
}

/** A booking's own label in the switcher and page headings. */
export const bookingLabel = (b: PortalBookingSummary): string => {
  const unit = b.unit_type === 'shop'
    ? (b.shop_no ? `Shop ${b.shop_no}` : 'Shop')
    : (b.flat_no ? `Flat ${b.flat_no}` : 'Flat');
  return [b.building_name, b.wing_name && `Wing ${b.wing_name}`, unit].filter(Boolean).join(' · ');
};
