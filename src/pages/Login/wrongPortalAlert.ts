// V_25.0 — shown when an account signs in on the wrong login page: staff
// (admin / employee) on /customer/login, or a customer on /login. The
// server checks the account's role and refuses before any OTP is sent; this
// popup explains it and links to the right page.
const COPY = {
  // Opened on the customer page by a staff account.
  customer: {
    title: 'Customer Login Page',
    text: 'This is the Customer Login page. Admin and employee accounts cannot sign in here. Kindly go to the Admin / Employee login page:',
    path: '/login',
    button: 'Go to Admin / Employee Login',
  },
  // Opened on the staff page by a customer account.
  staff: {
    title: 'Internal Office Login',
    text: 'This login page is for internal office use only, not for customers. Kindly go to the Customer Login portal:',
    path: '/customer/login',
    button: 'Go to Customer Login',
  },
} as const;

export async function showWrongPortalAlert(page: 'customer' | 'staff'): Promise<void> {
  const c = COPY[page];
  const url = `${window.location.origin}${c.path}`;
  const Swal = (await import('sweetalert2')).default;
  const result = await Swal.fire({
    icon: 'warning',
    title: c.title,
    html: `<p style="margin:0 0 12px">${c.text}</p>`
      + `<a href="${url}" style="color:#2563eb;font-weight:700;text-decoration:underline;word-break:break-all">${url}</a>`,
    confirmButtonText: c.button,
    confirmButtonColor: '#1a5c38',
    showCancelButton: true,
    cancelButtonText: 'Close',
  });
  if (result.isConfirmed) window.location.assign(url);
}
