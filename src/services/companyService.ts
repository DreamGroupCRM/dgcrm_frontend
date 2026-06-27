// ==========================================
// DREAM GROUP CRM - COMPANY SERVICE
// ==========================================
// All API calls for the Company Master module.
// Sends JSON (not FormData) for create and update.
import axiosInstance from './axiosConfig';

// Payload shape the backend expects for create / update
export interface CompanyPayload {
  name         : string;
  email        : string;
  phone        : string;
  company_code?: string;
  sort_order?  : number;
  logo_url?    : string;
  whatsapp_number?: string;
  city?        : string;
  state?       : string;
  country?     : string;
  pincode?     : string;
  pan?         : string;
  gst?         : string;
  is_active    : boolean;
}

export const companyService = {
  /** GET /api/company?is_active=true&page=1&limit=10 */
  getAll: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get('/company', {
      params: { is_active: true, page, limit },
    });
    return res.data;
  },

  /** GET /api/company/:id */
  getById: async (id: string) => {
    const res = await axiosInstance.get(`/company/${id}`);
    return res.data;
  },

  /** POST /api/company  — sends JSON body, NOT FormData */
  create: async (payload: CompanyPayload) => {
    const res = await axiosInstance.post('/company', payload);
    return res.data;
  },

  /** PUT /api/company/:id  — sends JSON body, NOT FormData */
  update: async (id: string, payload: CompanyPayload) => {
    const res = await axiosInstance.put(`/company/${id}`, payload);
    return res.data;
  },

  /** DELETE /api/company/:id */
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/company/${id}`);
    return res.data;
  },
};