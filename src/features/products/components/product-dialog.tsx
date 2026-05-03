'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  productsService,
  slugify,
  type Product,
} from '../services/products.service';

interface Props {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductDialog({ open, product, onClose, onSaved }: Props) {
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [shortLine, setShortLine] = useState('');
  const [pitch, setPitch] = useState('');
  const [price, setPrice] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [differentiators, setDifferentiators] = useState<string[]>([]);
  const [diffInput, setDiffInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setSlug(product.slug);
      setSlugTouched(true);
      setName(product.name);
      setCategory(product.category ?? '');
      setShortLine(product.shortLine);
      setPitch(product.pitch);
      setPrice(product.price ?? '');
      setPaymentLink(product.paymentLink ?? '');
      setTargetAudience(product.targetAudience ?? '');
      setDifferentiators(product.differentiators ?? []);
      setIsActive(product.isActive);
    } else {
      setSlug('');
      setSlugTouched(false);
      setName('');
      setCategory('');
      setShortLine('');
      setPitch('');
      setPrice('');
      setPaymentLink('');
      setTargetAudience('');
      setDifferentiators([]);
      setDiffInput('');
      setIsActive(true);
    }
  }, [product, open]);

  // Auto-slug from name while user hasn't manually edited slug.
  useEffect(() => {
    if (!product && !slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, product, slugTouched]);

  if (!open) return null;

  const handleAddDiff = () => {
    const v = diffInput.trim();
    if (!v) return;
    if (!differentiators.includes(v)) {
      setDifferentiators((prev) => [...prev, v]);
    }
    setDiffInput('');
  };

  const handleSave = async () => {
    if (!slug || !name || !shortLine || !pitch) {
      toast.error('Slug, nome, frase resumida e pitch são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug,
        name,
        category: category || undefined,
        shortLine,
        pitch,
        price: price || undefined,
        paymentLink: paymentLink || undefined,
        targetAudience: targetAudience || undefined,
        differentiators,
        isActive,
      };
      if (product) {
        await productsService.update(product.id, payload);
        toast.success('Produto atualizado');
      } else {
        await productsService.create(payload);
        toast.success('Produto criado');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {product ? 'Editar produto' : 'Novo produto'}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Esses dados são consultados pelos agents IA na hora de pitchar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maestr.IA — Mentoria Claude Code"
              />
            </Field>
            <Field
              label="Slug"
              hint="Identificador único (lowercase, hifens). O agent usa pra puxar pitch."
              required
            >
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugTouched(true);
                }}
                placeholder="maestria"
                className="font-mono"
              />
            </Field>
          </div>

          <Field label="Categoria" hint="Pra agrupar no catálogo. Texto livre.">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Mentoria, Curso, Plantão…"
            />
          </Field>

          <Field
            label="Frase resumida"
            hint="1 linha. Aparece na lista compacta que vai pra TODOS os prompts dos agents."
            required
          >
            <input
              value={shortLine}
              onChange={(e) => setShortLine(e.target.value)}
              placeholder="Mentoria de 6 meses pra não-técnicos construírem com Claude Code"
            />
          </Field>

          <Field
            label="Pitch completo"
            hint="Texto entregue pelo agent quando ele decide recomendar. Inclua benefícios, prova social, escassez, CTA. Markdown OK."
            required
          >
            <textarea
              rows={8}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="A única mentoria do Brasil que ensina pessoa zero técnica a construir sistemas próprios com Claude Code..."
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Preço" hint='Ex: "R$ 4.500 ou 6x R$ 750"'>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="R$ 4.500 à vista ou 6x R$ 750"
              />
            </Field>
            <Field label="Link de checkout" hint="URL pro pagamento">
              <input
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://bravyschool.com/maestria"
                className="font-mono text-xs"
              />
            </Field>
          </div>

          <Field
            label="Público-alvo"
            hint="Quem é o cliente ideal — agent usa pra qualificar e adequar a fala."
          >
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Empresários, profissionais autônomos não-técnicos"
            />
          </Field>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Diferenciais
            </label>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Lista de bullets que o agent pode citar como vantagem competitiva.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {differentiators.map((d, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() =>
                      setDifferentiators((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      )
                    }
                    className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-900/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={diffInput}
                onChange={(e) => setDiffInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDiff();
                  }
                }}
                placeholder="Adicionar e Enter…"
                className="flex-1 min-w-[150px] rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleAddDiff}
                className="rounded-md bg-zinc-100 p-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Ativo (visível pros agents)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !slug || !name || !shortLine || !pitch}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : product ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 [&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:border-zinc-300 [&>input]:bg-white [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>textarea]:w-full [&>textarea]:rounded-md [&>textarea]:border [&>textarea]:border-zinc-300 [&>textarea]:bg-white [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-sm dark:[&>input]:border-zinc-700 dark:[&>input]:bg-zinc-800 dark:[&>input]:text-zinc-100 dark:[&>textarea]:border-zinc-700 dark:[&>textarea]:bg-zinc-800 dark:[&>textarea]:text-zinc-100">
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}
