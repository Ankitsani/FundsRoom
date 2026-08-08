const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, config);

  if (response.status === 204) {
    return {} as T;
  }

  const result = await response.json();

  if (!response.ok) {
    const errorMsg = result?.error?.message || 'Something went wrong';
    const error = new Error(errorMsg) as any;
    error.status = response.status;
    error.code = result?.error?.code;
    error.details = result?.error?.details;
    throw error;
  }

  return result as T;
}

export const api = {
  auth: {
    login: async (body: any) => {
      const res = await request<any>('/auth/login', { method: 'POST', body });
      return res.data;
    },
    me: async () => {
      const res = await request<any>('/auth/me', { method: 'GET' });
      return res.data;
    },
  },
  customers: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const query = new URLSearchParams(params as any).toString();
      return request<any>(`/customers?${query}`, { method: 'GET' });
    },
    get: async (id: string) => {
      const res = await request<any>(`/customers/${id}`, { method: 'GET' });
      return res.data;
    },
    create: async (body: any) => {
      const res = await request<any>('/customers', { method: 'POST', body });
      return res.data;
    },
    update: async (id: string, body: any) => {
      const res = await request<any>(`/customers/${id}`, { method: 'PUT', body });
      return res.data;
    },
    addNote: async (id: string, body: { noteText: string }) => {
      const res = await request<any>(`/customers/${id}/notes`, { method: 'POST', body });
      return res.data;
    },
  },
  products: {
    list: (params: { page?: number; limit?: number; search?: string; category?: string; lowStock?: boolean } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.search) query.append('search', params.search);
      if (params.category) query.append('category', params.category);
      if (params.lowStock !== undefined) query.append('lowStock', String(params.lowStock));
      return request<any>(`/products?${query.toString()}`, { method: 'GET' });
    },
    get: async (id: string) => {
      const res = await request<any>(`/products/${id}`, { method: 'GET' });
      return res.data;
    },
    create: async (body: any) => {
      const res = await request<any>('/products', { method: 'POST', body });
      return res.data;
    },
    update: async (id: string, body: any) => {
      const res = await request<any>(`/products/${id}`, { method: 'PUT', body });
      return res.data;
    },
  },
  challans: {
    list: (params: { page?: number; limit?: number; status?: string; customerId?: string; startDate?: string; endDate?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.status) query.append('status', params.status);
      if (params.customerId) query.append('customerId', params.customerId);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      return request<any>(`/challans?${query.toString()}`, { method: 'GET' });
    },
    get: async (id: string) => {
      const res = await request<any>(`/challans/${id}`, { method: 'GET' });
      return res.data;
    },
    create: async (body: any) => {
      const res = await request<any>('/challans', { method: 'POST', body });
      return res.data;
    },
    updateStatus: async (id: string, status: string) => {
      const res = await request<any>(`/challans/${id}/status`, { method: 'PUT', body: { status } });
      return res.data;
    },
  },
};
