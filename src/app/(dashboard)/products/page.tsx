'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Package,
  Pencil,
  Trash2,
  ExternalLink,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  productsService,
  type Product,
} from '@/features/products/services/products.service';
import { ProductDialog } from '@/features/products/components/product-dialog';

export default function ProductsPage() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', showInactive],
    queryFn: () => productsService.list(showInactive),
  });

  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of products) {
      const cat = p.category || 'Outros';
      (groups[cat] = groups[cat] || []).push(p);
    }
    return groups;
  }, [products]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });

  const handleDelete = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"? Os agents vão deixar de mencionar.`))
      return;
    try {
      await productsService.remove(p.id);
      toast.success('Produto removido');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro');
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            <Package className="h-5 w-5 text-primary" />
            Catálogo
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Produtos que os agents IA conhecem e consultam pra fazer pitch.
            Cada agent vê a lista compacta no system prompt e busca o pitch
            completo via skill <code>getProductPitch</code> quando vai recomendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inativos
          </label>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </button>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-6">
        {isLoading && (
          <div className="text-center text-sm text-zinc-400">Carregando…</div>
        )}
        {!isLoading && products.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 p-10 text-center dark:border-zinc-800">
            <Package className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600">
              Catálogo vazio
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Cadastre o primeiro produto pra começar — os agents vão
              consultar pra pitchar.
            </p>
          </div>
        )}

        {Object.keys(grouped).map((cat) => (
          <div key={cat}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {cat}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {grouped[cat].map((p) => (
                <div
                  key={p.id}
                  className={`group relative rounded-xl border bg-white p-4 hover:border-primary/40 hover:shadow-sm dark:bg-zinc-900 ${
                    p.isActive
                      ? 'border-zinc-200 dark:border-zinc-800'
                      : 'border-zinc-200 opacity-60 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {p.name}
                        </h3>
                        {!p.isActive && (
                          <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </div>
                      <code className="text-[11px] font-mono text-zinc-400">
                        {p.slug}
                      </code>
                      <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {p.shortLine}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    {p.price && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {p.price}
                      </span>
                    )}
                    {p.paymentLink && (
                      <a
                        href={p.paymentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-zinc-500 hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        checkout
                      </a>
                    )}
                    {p.differentiators.slice(0, 3).map((d, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      >
                        {d}
                      </span>
                    ))}
                    {p.differentiators.length > 3 && (
                      <span className="text-[10px] text-zinc-400">
                        +{p.differentiators.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ProductDialog
        open={creating}
        product={null}
        onClose={() => setCreating(false)}
        onSaved={() => {
          refresh();
          setCreating(false);
        }}
      />
      <ProductDialog
        open={!!editing}
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          refresh();
          setEditing(null);
        }}
      />
    </div>
  );
}
