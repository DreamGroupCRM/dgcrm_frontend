// ==========================================
// DREAM GROUP CRM - COMPANY SERVICE
// ==========================================
import axiosInstance from './axiosConfig';

// Sent as a custom request header on every call below, and echoed back by
// the backend as a response header (see company.controller.ts) — so the
// named API operation being called is visible directly in the browser's
// Network tab (Headers panel), on both the request and the response, not
// just inferable from the URL/method.
const API_NAME_HEADER = 'X-Api-Name';

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
  FetchCompanyList: async (page = 1, limit = 10) => {
    const res = await axiosInstance.get('/company', {
      params: { is_active: true, page, limit },
      headers: { [API_NAME_HEADER]: 'FetchCompanyList' },
    });
    console.log('Fetch Companies Response:', res.data);
    return res.data;
  },

  /** GET /api/company/:id */
  ViewCompany: async (id: string) => {
    const res = await axiosInstance.get(`/company/${id}`, {
      headers: { [API_NAME_HEADER]: 'ViewCompany' },
    });
    console.log('View Company Response:', res.data);
    return res.data;
  },

/** POST /api/company — JSON body, or multipart/form-data when a logo file is included */
CreateCompany: async (payload: CompanyPayload | FormData) => {
  const res = await axiosInstance.post('/company', payload, {
    headers: { [API_NAME_HEADER]: 'CreateCompany' },
  });
  console.log('Create Company Response:', res.data);
  return res.data;
},

/** PUT /api/company/:id — JSON body, or multipart/form-data when a logo file is included */
UpdateCompany: async (id: string, payload: CompanyPayload | FormData) => {
  const res = await axiosInstance.put(`/company/${id}`, payload, {
    headers: { [API_NAME_HEADER]: 'UpdateCompany' },
  });
  console.log('Update Company Response:', res.data);
  return res.data;
},

  /** DELETE /api/company/:id */
  DeleteCompany: async (id: string) => {
    const res = await axiosInstance.delete(`/company/${id}`, {
      headers: { [API_NAME_HEADER]: 'DeleteCompany' },
    });
    console.log('Delete Company Response:', res.data);
    return res.data;
  },
};