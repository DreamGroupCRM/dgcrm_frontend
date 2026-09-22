// ==========================================
// DREAM GROUP CRM - TOAST WRAPPER
// ==========================================
// Every toast.success/.error/.info/.warn() call in the app should import
// `toast` from here instead of directly from 'react-toastify' — this is
// the one place that decides how long an error toast stays up, instead of
// that needing to be repeated (or forgotten) at ~250 individual call sites.
//
// Success/info/warn keep the ToastContainer's own default duration (5s —
// see App.tsx). This wrapper only overrides `.error`: a failed request or
// action stays on screen until the person dismisses it themselves
// (autoClose: false) rather than vanishing on a timer — a mistake worth
// surfacing as an error is also worth letting the person actually read
// before it disappears. A call site can still pass its own `autoClose`
// explicitly to override this default, same as before.
import { toast as baseToast, ToastOptions, ToastContent } from 'react-toastify';

function toastFn(content: ToastContent, options?: ToastOptions) {
  return baseToast(content, options);
}

export const toast = Object.assign(toastFn, baseToast, {
  error: (content: ToastContent, options?: ToastOptions) =>
    baseToast.error(content, { autoClose: false, ...options }),
});
