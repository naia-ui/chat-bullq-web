'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { inboxService, type Conversation } from '../services/inbox.service';

interface Props {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
}

/**
 * Hard-delete: apaga a conversa e cascateia mensagens, anexos, tags, runs de
 * IA e leituras — irreversível. A API exige o nome ou telefone exato do
 * contato como confirmação (?confirm=), então replicamos essa barreira aqui
 * em vez de um simples "tem certeza?".
 */
export function DeleteConversationDialog({ conversation, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const expected = conversation.contact?.name || conversation.contact?.phone || '';

  useEffect(() => {
    if (open) setConfirmText('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, deleting]);

  if (!open) return null;

  const matches = confirmText.trim() === expected.trim() && expected.trim().length > 0;

  const handleDelete = async () => {
    if (!matches) return;
    setDeleting(true);
    try {
      await inboxService.deleteConversation(conversation.id, confirmText.trim());
      toast.success('Conversa apagada permanentemente');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao apagar conversa');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !deleting && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Apagar conversa
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-[13px] text-zinc-700 dark:text-zinc-300">
            Isso apaga a conversa <strong>permanentemente</strong>, junto com todas
            as mensagens, anexos, tags e histórico de IA. Não pode ser desfeito.
          </p>
          <div>
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Digite <strong>{expected || '—'}</strong> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting || !expected}
              placeholder={expected}
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || !matches}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
            Apagar permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}
