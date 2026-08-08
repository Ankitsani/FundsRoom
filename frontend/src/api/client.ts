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

  return result.data as T;
}

export const api = {
  auth: {
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body }),
    me: () => request<any>('/auth/me', { method: 'GET' }),
  },
  customers: {
    list: (params: { page?: number; limit?: number; search?: string } = {}) => {
      const query = new URLSearchParams(params as any).toString();
      return request<any>(`/customers?${query}`, { method: 'GET' });
    },
    get: (id: string) => request<any>(`/customers/${id}`, { method: 'GET' }),
    create: (body: any) => request<any>('/customers', { method: 'POST', body }),
    update: (id: string, body: any) => request<any>(`/customers/${id}`, { method: 'PUT', body }),
    addNote: (id: string, body: { noteText: string }) =>
      request<any>(`/customers/${id}/notes`, { method: 'POST', body }),
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
    get: (id: string) => request<any>(`/products/${id}`, { method: 'GET' }),
    create: (body: any) => request<any>('/products', { method: 'POST', body }),
    update: (id: string, body: any) => request<any>(`/products/${id}`, { method: 'PUT', body }),
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
    get: (id: string) => request<any>(`/challans/${id}`, { method: 'GET' }),
    create: (body: any) => request<any>('/challans', { method: 'POST', body }),
    updateStatus: (id: string, status: string) =>
      request<any>(`/challans/${id}/status`, { method: 'PUT', body: { status } }),
  },
};
