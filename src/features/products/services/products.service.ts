import { api } from '@/lib/api';

export interface Product {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  category: string | null;
  shortLine: string;
  pitch: string;
  price: string | null;
  paymentLink: string | null;
  targetAudience: string | null;
  differentiators: string[];
  isActive: boolean;
  order: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProductInput {
  slug: string;
  name: string;
  category?: string;
  shortLine: string;
  pitch: string;
  price?: string;
  paymentLink?: string;
  targetAudience?: string;
  differentiators?: string[];
  isActive?: boolean;
  order?: number;
}

export const productsService = {
  async list(includeInactive = false): Promise<Product[]> {
    const { data } = await api.get('/products', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return data.data ?? data;
  },
  async findBySlug(slug: string): Promise<Product> {
    const { data } = await api.get(`/products/by-slug/${slug}`);
    return data.data ?? data;
  },
  async create(input: UpsertProductInput): Promise<Product> {
    const { data } = await api.post('/products', input);
    return data.data ?? data;
  },
  async update(id: string, input: Partial<UpsertProductInput>): Promise<Product> {
    const { data } = await api.patch(`/products/${id}`, input);
    return data.data ?? data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
  async reorder(ids: string[]): Promise<void> {
    await api.patch('/products/reorder', { ids });
  },
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}
