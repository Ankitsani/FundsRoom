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

  const contentType = response.headers.get('content-type');
  let result: any;

  if (contentType && contentType.includes('application/json')) {
    try {
      result = await response.json();
    } catch (e: any) {
      throw new Error(`Failed to parse response as JSON. Status: ${response.status}. Error: ${e.message}`);
    }
  } else {
    // Response is not JSON (typically HTML 404 / 500 error pages from Nginx/Vercel)
    const text = await response.text();
    const snippet = text.substring(0, 150).replace(/[\r\n]+/g, ' ');
    throw new Error(
      `Received non-JSON response from server (Status: ${response.status}). This usually means the API endpoint was not found or the backend is offline. Response preview: "${snippet}..."`
    );
  }

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
  erp: {
    locations: {
      list: async () => {
        const res = await request<any>('/erp/locations', { method: 'GET' });
        return res.data;
      },
      create: async (body: { name: string }) => {
        const res = await request<any>('/erp/locations', { method: 'POST', body });
        return res.data;
      },
    },
    users: {
      list: async () => {
        const res = await request<any>('/erp/users', { method: 'GET' });
        return res.data;
      },
    },
    inventory: {
      list: async (params: { locationId?: string; search?: string } = {}) => {
        const query = new URLSearchParams();
        if (params.locationId) query.append('locationId', params.locationId);
        if (params.search) query.append('search', params.search);
        const res = await request<any>(`/erp/inventory?${query.toString()}`, { method: 'GET' });
        return res.data;
      },
      adjust: async (body: { item: string; category: string; locationId: string; batch: string; physicalQuantity: number }) => {
        const res = await request<any>('/erp/inventory', { method: 'POST', body });
        return res.data;
      },
      reportDamaged: async (body: { inventoryId: string; quantityChanged: number }) => {
        const res = await request<any>('/erp/inventory/damaged', { method: 'POST', body });
        return res.data;
      },
    },
    workOrders: {
      list: async () => {
        const res = await request<any>('/erp/work-orders', { method: 'GET' });
        return res.data;
      },
      create: async (body: { workOrderId: string; locationId: string; inventoryId: string; requiredQuantity: number; assignedUserId: string }) => {
        const res = await request<any>('/erp/work-orders', { method: 'POST', body });
        return res.data;
      },
      updateStatus: async (id: string, status: string) => {
        const res = await request<any>(`/erp/work-orders/${id}/status`, { method: 'PATCH', body: { status } });
        return res.data;
      },
    },
    transfers: {
      list: async () => {
        const res = await request<any>('/erp/transfers', { method: 'GET' });
        return res.data;
      },
      create: async (body: { transferId: string; sourceLocationId: string; destinationLocationId: string; inventoryId: string; quantity: number }) => {
        const res = await request<any>('/erp/transfers', { method: 'POST', body });
        return res.data;
      },
      dispatch: async (id: string) => {
        const res = await request<any>(`/erp/transfers/${id}/dispatch`, { method: 'POST' });
        return res.data;
      },
      receive: async (id: string, body: { receivedQty: number }) => {
        const res = await request<any>(`/erp/transfers/${id}/receive`, { method: 'POST', body });
        return res.data;
      },
    },
    orders: {
      list: async () => {
        const res = await request<any>('/erp/orders', { method: 'GET' });
        return res.data;
      },
      create: async (body: { orderNumber: string; customerId: string; inventoryId: string; quantity: number }) => {
        const res = await request<any>('/erp/orders', { method: 'POST', body });
        return res.data;
      },
      cancel: async (id: string) => {
        const res = await request<any>(`/erp/orders/${id}/cancel`, { method: 'POST' });
        return res.data;
      },
    },
  },
};
