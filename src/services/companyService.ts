// ==========================================
// DREAM GROUP CRM - COMPANY SERVICE
// ==========================================
import axiosInstance from './axiosConfig';

export const companyService = {

  /** GET /api/company?is_active=true&page=1&limit=10 */
  getAll: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get('/company', {
      params: { is_active: true, page, limit },
    });
    console.log('Fetch Companies Response:', res.data);
    return res.data;
  },

  /** GET /api/company/:id */
  getById: async (id: string) => {
    const res = await axiosInstance.get(`/company/${id}`);
    console.log('View Company Response:', res.data);
    return res.data;
  },

  /**
   * POST /api/company
   * Sends FormData so the logo file can be included.
   * Axios automatically sets Content-Type: multipart/form-data with
   * the correct boundary — do NOT set it manually.
   *
   * ⚠️  BACKEND NOTE: The backend must use multer (or equivalent) to
   *     parse multipart/form-data. The file arrives as req.file (field
   *     name: "logo"). After saving the file, return logo_url in the
   *     response so the frontend can display it in the table.
   */
  create: async (formData: FormData) => {
    const res = await axiosInstance.post('/company', formData);
    console.log('Create Company Response:', res.data);
    return res.data;
  },

  /**
   * PUT /api/company/:id
   * Same multipart approach as create.
   */
  update: async (id: string, formData: FormData) => {
    const res = await axiosInstance.put(`/company/${id}`, formData);
    console.log('Update Company Response:', res.data);
    return res.data;
  },

  /** DELETE /api/company/:id */
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/company/${id}`);
    console.log('Delete Company Response:', res.data);
    return res.data;
  },
};