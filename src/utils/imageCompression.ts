// ==========================================
// DGCRM — CLIENT-SIDE IMAGE COMPRESSION
// ==========================================
// V_23.0 item 6.2 — "Customer save takes a long time and may remain
// loading".
//
// Saving a customer posts up to six files in one multipart request
// (customer photo, Aadhaar scan, PAN scan, application/declaration/
// allotment forms). Nothing ever reduced them, so a phone camera's own
// 3-5 MB JPEG was uploaded byte for byte — three of those is 10-15 MB,
// which on a typical office uplink is 30-60 seconds of the Save button
// sitting there spinning. That is the actual cost, not a slow query: the
// request cannot even reach the API until the bytes have finished going
// up.
//
// Re-encoding to a sensible size first turns a 4 MB photo into roughly
// 200-400 KB, which is the whole delay gone. Deliberately NOT done by
// raising a timeout — the upload really was that slow.
//
// Rules this has to respect, because the backend validates uploads in
// three layers (shared/uploadTypes.ts: extension, then mime, then real
// magic bytes, all of which must agree):
//
//   * Output is a genuine JPEG, named .jpg, typed image/jpeg — so
//     extension, mime and first bytes all match. Keeping a .png name on
//     JPEG bytes would be rejected, correctly, as a forged file. The one
//     exception (V_26.0) is a PNG with transparency, which stays a real
//     PNG with its own .png name.
//   * PDFs and every non-image are returned untouched. This only ever
//     touches raster images.
//   * An image already smaller than the threshold is returned as-is —
//     re-encoding a small file can make it bigger, and there is nothing
//     to gain.
//   * Any failure (no canvas, a decode error, a bigger result) returns
//     the ORIGINAL file. Compression is an optimisation; it must never be
//     the reason a customer cannot be saved.

/** Longest edge, in pixels, an uploaded image is scaled down to. */
const MAX_EDGE_PX = 1600;
/** JPEG quality for the re-encode. */
const JPEG_QUALITY = 0.82;
/** Images at or below this are left alone — nothing worth saving. */
const SKIP_BELOW_BYTES = 600 * 1024;

const isCompressibleImage = (file: File): boolean =>
  /^image\/(jpeg|jpg|png|webp)$/i.test(file.type);

const loadBitmap = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });

const toJpegName = (name: string): string => {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.jpg`;
};

// Files this module produced (or chose to leave as they are), so a file
// already handled by a form is not re-encoded a second time on its way out
// through the upload request (see compressFormDataImages).
const handled = new WeakSet<File>();

const done = (file: File): File => { handled.add(file); return file; };

/** True when any sampled pixel is see-through (a logo on a clear background). */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4 * 7) if (data[i] < 255) return true;
  return false;
}

/**
 * Returns a smaller version of an image file, or the original file
 * unchanged when it is not a compressible image, is already small, or
 * anything at all goes wrong. Photos and scans become JPEG; a PNG with
 * transparency (V_26.0 — a company logo) stays a PNG, only scaled down.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (handled.has(file)) return file;
  if (!isCompressibleImage(file) || file.size <= SKIP_BELOW_BYTES) return done(file);

  try {
    const img = await loadBitmap(file);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) return done(file);

    // Never upscale — a small-but-heavy image still gets re-encoded at its
    // own size, which is where most of the saving comes from anyway.
    const scale = Math.min(1, MAX_EDGE_PX / longest);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return done(file);
    ctx.drawImage(img, 0, 0, width, height);

    const keepPng = /^image\/png$/i.test(file.type) && hasTransparency(ctx, width, height);
    if (!keepPng) {
      // JPEG has no alpha channel, so a transparent area would otherwise
      // composite onto black. Paint white behind — the right background
      // for the scanned documents and ID photos this mostly handles.
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      if (keepPng) canvas.toBlob(resolve, 'image/png');
      else canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
    // A result that isn't actually smaller is no use — keep the original
    // rather than trading quality for nothing.
    if (!blob || blob.size >= file.size) return done(file);

    return done(new File([blob], keepPng ? file.name : toJpegName(file.name), {
      type: keepPng ? 'image/png' : 'image/jpeg',
      lastModified: Date.now(),
    }));
  } catch {
    return done(file);
  }
}

/** Runs every value through compressImageFile, leaving non-Files alone. */
export async function compressImageFiles<T>(values: T[]): Promise<(T | File)[]> {
  return Promise.all(values.map((v) => (v instanceof File ? compressImageFile(v) : Promise.resolve(v))));
}

/**
 * V_26.0 — the same for a whole upload request, so every form that sends
 * files (leads, cancellation papers, the Admin's review form, logos …) gets
 * it, not only the ones that call compressImageFile themselves. Applied in
 * axiosConfig.ts. Files already handled pass through untouched.
 */
export async function compressFormDataImages(form: FormData): Promise<FormData> {
  const entries = Array.from(form.entries());
  if (!entries.some(([, v]) => v instanceof File && !handled.has(v) && isCompressibleImage(v))) return form;
  const out = new FormData();
  for (const [key, value] of entries) {
    if (value instanceof File) {
      const f = await compressImageFile(value);
      out.append(key, f, f.name);
    } else {
      out.append(key, value);
    }
  }
  return out;
}
