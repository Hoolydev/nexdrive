const FIPE_API_URL = 'https://fipe.parallelum.com.br/api/v2';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZDZhMTM2YS03M2UzLTQ3MzYtODBlNC02MDBkZGRjMWYxYWQiLCJlbWFpbCI6InNpbHppbmhvbWFyb21iYUBnbWFpbC5jb20iLCJpYXQiOjE3NjAyMTc2ODl9.4IWm0K1w4RMN6BFp-hWfKcN3_w_j8bRSy9rUzRDPDVU';

export type FipeBrand = {
  code: string;
  name: string;
};

export type FipeModel = {
  code: string;
  name: string;
};

export type FipeYear = {
  code: string;
  name: string;
};

export type FipePrice = {
  brand: string;
  codeFipe: string;
  fuel: string;
  fuelAcronym: string;
  model: string;
  modelYear: number;
  price: string;
  reference: string;
  vehicleType: number;
};

const headers = {
  'X-Subscription-Token': API_TOKEN
};

export const fipeApi = {
  async getBrands() {
    const response = await fetch(`${FIPE_API_URL}/cars/brands`, { headers });
    if (!response.ok) throw new Error('Falha ao buscar marcas');
    return response.json() as Promise<FipeBrand[]>;
  },

  async getModels(brandId: string) {
    const response = await fetch(`${FIPE_API_URL}/cars/brands/${brandId}/models`, { headers });
    if (!response.ok) throw new Error('Falha ao buscar modelos');
    return response.json() as Promise<FipeModel[]>;
  },

  async getYears(brandId: string, modelId: string) {
    const response = await fetch(`${FIPE_API_URL}/cars/brands/${brandId}/models/${modelId}/years`, { headers });
    if (!response.ok) throw new Error('Falha ao buscar anos');
    return response.json() as Promise<FipeYear[]>;
  },

  async getPrice(brandId: string, modelId: string, yearId: string) {
    const response = await fetch(`${FIPE_API_URL}/cars/brands/${brandId}/models/${modelId}/years/${yearId}`, { headers });
    if (!response.ok) throw new Error('Falha ao buscar preço');
    return response.json() as Promise<FipePrice>;
  }
};