// ==========================================
// DREAM GROUP CRM - COMPANY SERVICE
// ==========================================
import axiosInstance from './axiosConfig';

// JSON payload shape for create and update
export interface CompanyPayload {
  name            : string;
  email           : string;
  phone           : string;
  is_active       : boolean;
  company_code?   : string;
  whatsapp_number?: string;
  city?           : string;
  state?          : string;
  country?        : string;
  pincode?        : string;
  pan?            : string;
  gst?            : string;
  logo_url?       : string; // file path / folder path passed as a string
}

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

/** POST /api/company — JSON body, or multipart/form-data when a logo file is included */
create: async (payload: CompanyPayload | FormData) => {
  const res = await axiosInstance.post('/company', payload);
  console.log('Create Company Response:', res.data);
  return res.data;
},

/** PUT /api/company/:id — JSON body, or multipart/form-data when a logo file is included */
update: async (id: string, payload: CompanyPayload | FormData) => {
  const res = await axiosInstance.put(`/company/${id}`, payload);
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