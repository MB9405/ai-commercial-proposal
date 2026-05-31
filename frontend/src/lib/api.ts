const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Произошла ошибка');
  }

  return data.data;
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; name: string; companyName?: string }) =>
      request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<any>('/auth/me'),
    updateProfile: (body: any) =>
      request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  },
  proposals: {
    list: (page = 1, limit = 10) =>
      request<any[]>(`/proposals?page=${page}&limit=${limit}`),
    get: (id: string) => request<any>(`/proposals/${id}`),
    create: (body: any) =>
      request<any>('/proposals', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) =>
      request<any>(`/proposals/${id}`, { method: 'DELETE' }),
    generateDocs: (proposalId: string, types: string[]) =>
      request<any>('/proposals/documents', {
        method: 'POST',
        body: JSON.stringify({ proposalId, types }),
      }),
  },
  templates: {
    list: () => request<any[]>('/templates'),
  },
  subscriptions: {
    plans: () => request<any[]>('/subscriptions/plans'),
    current: () => request<any>('/subscriptions/current'),
    upgrade: (planType: string) =>
      request<any>('/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ planType }),
      }),
  },
  upload: {
    logo: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/upload/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return res.json();
    },
  },
};
