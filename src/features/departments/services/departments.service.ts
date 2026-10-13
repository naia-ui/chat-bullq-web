import { api } from '@/lib/api';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

export const departmentsService = {
  async list(): Promise<Department[]> {
    const { data } = await api.get('/departments');
    return data.data ?? [];
  },

  async create(payload: { name: string; description?: string }): Promise<Department> {
    const { data } = await api.post('/departments', payload);
    return data.data;
  },
};
