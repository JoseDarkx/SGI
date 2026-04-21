const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = {
  async get<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Error ${res.status}`);
    }
    return res.json();
  },

  async post<T>(path: string, token: string, body: object): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Error ${res.status}`);
    }
    return res.json();
  },

  async put<T>(path: string, token: string, body: object): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Error ${res.status}`);
    }
    return res.json();
  },

  async delete<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || `Error ${res.status}`);
    }
    return res.json();
  },
};