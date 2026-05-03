'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag as TagIcon,
  MessageSquare,
  User,
  ChevronRight,
  ArrowLeft,
  Check,
  Loader2,
  KanbanSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { tagsService, type Tag } from '@/features/settings/services/tags.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { pipelinesService } from '@/features/pipelines/services/pipelines.service';
import type { Conversation } from '../services/inbox.service';

type Target = 'conversation' | 'contact';

interface ConversationContextMenuProps {
  conversation: Conversation;
  position: { x: number; y: number };
  onClose: () => void;
}

const MENU_WIDTH = 224;
const MENU_MAX_HEIGHT = 360;

export function ConversationContextMenu({
  conversation,
  position,
  onClose,
}: ConversationContextMenuProps) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'root' | Target | 'pipeline'>('root');
  const [pendingTagId, setPendingTagId] = useState<string | null>(null);
  const [pendingPipelineId, setPendingPipelineId] = useState<string | null>(null);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', orgId],
    queryFn: () => tagsService.list(),
  });

  // Pipelines lazy-loaded only when the user opens the "Adicionar a pipeline"
  // submenu — avoids hitting /pipelines on every right-click.
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines', orgId],
    queryFn: () => pipelinesService.list(),
    enabled: view === 'pipeline',
  });

  const appliedConversation = useMemo(
    () => new Set((conversation.tags ?? []).map((t) => t.tag.id)),
    [conversation.tags],
  );
  const appliedContact = useMemo(
    () => new Set((conversation.contact.tags ?? []).map((t) => t.tag.id)),
    [conversation.contact.tags],
  );

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleContext = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('contextmenu', handleContext);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('contextmenu', handleContext);
    };
  }, [onClose]);

  // Clamp position to viewport
  const clampedPos = useMemo(() => {
    if (typeof window === 'undefined') return position;
    const maxX = window.innerWidth - MENU_WIDTH - 8;
    const maxY = window.innerHeight - MENU_MAX_HEIGHT - 8;
    return {
      x: Math.min(position.x, maxX),
      y: Math.min(position.y, maxY),
    };
  }, [position]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
  };

  const addToPipeline = async (pipelineId: string, pipelineName: string) => {
    setPendingPipelineId(pipelineId);
    try {
      await pipelinesService.createCard(pipelineId, {
        conversationId: conversation.id,
      });
      toast.success(`Adicionada ao pipeline "${pipelineName}"`);
      queryClient.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Erro ao adicionar ao pipeline',
      );
    } finally {
      setPendingPipelineId(null);
    }
  };

  const toggleTag = async (tag: Tag, target: Target) => {
    const applied = target === 'conversation' ? appliedConversation : appliedContact;
    const isOn = applied.has(tag.id);
    setPendingTagId(tag.id);
    try {
      if (target === 'conversation') {
        if (isOn) await tagsService.removeFromConversation(conversation.id, tag.id);
        else await tagsService.addToConversation(conversation.id, tag.id);
      } else {
        if (isOn) await tagsService.removeFromContact(conversation.contact.id, tag.id);
        else await tagsService.addToContact(conversation.contact.id, tag.id);
      }
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar tag');
    } finally {
      setPendingTagId(null);
    }
  };

  return (
    <div
      ref={ref}
      style={{ top: clampedPos.y, left: clampedPos.x, width: MENU_WIDTH }}
      className="fixed z-50 rounded-lg border border-zinc-200/80 bg-white p-1 shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-900"
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {view === 'root' && (
        <>
          <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Atribuir tag
          </div>
          <button
            onClick={() => setView('conversation')}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="flex-1">Na conversa</span>
            {appliedConversation.size > 0 && (
              <span className="text-[10px] font-medium text-primary">
                {appliedConversation.size}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </button>
          <button
            onClick={() => setView('contact')}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <User className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="flex-1">No contato</span>
            {appliedContact.size > 0 && (
              <span className="text-[10px] font-medium text-primary">
                {appliedContact.size}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </button>

          <div className="mx-2 my-1 border-t border-zinc-100 dark:border-zinc-800" />

          <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Pipeline
          </div>
          <button
            onClick={() => setView('pipeline')}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            <KanbanSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="flex-1">Adicionar a pipeline</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </>
      )}

      {view === 'pipeline' && (
        <>
          <button
            onClick={() => setView('root')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-50 dark:text-zinc-500 dark:hover:bg-zinc-800/60"
          >
            <ArrowLeft className="h-3 w-3" />
            Adicionar a pipeline
          </button>
          <div className="mx-2 my-1 border-t border-zinc-100 dark:border-zinc-800" />
          <div
            className="overflow-y-auto scrollbar-thin"
            style={{ maxHeight: MENU_MAX_HEIGHT - 80 }}
          >
            {pipelinesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              </div>
            ) : pipelines.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <KanbanSquare className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  Nenhum pipeline
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  Crie em /pipelines
                </p>
              </div>
            ) : (
              pipelines.map((p) => {
                const isPending = pendingPipelineId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToPipeline(p.id, p.name)}
                    disabled={isPending}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                  >
                    <KanbanSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {isPending && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {(view === 'conversation' || view === 'contact') && (
        <>
          <button
            onClick={() => setView('root')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-50 dark:text-zinc-500 dark:hover:bg-zinc-800/60"
          >
            <ArrowLeft className="h-3 w-3" />
            {view === 'conversation' ? 'Tags da conversa' : 'Tags do contato'}
          </button>
          <div className="mx-2 my-1 border-t border-zinc-100 dark:border-zinc-800" />
          <div
            className="overflow-y-auto scrollbar-thin"
            style={{ maxHeight: MENU_MAX_HEIGHT - 80 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              </div>
            ) : tags.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <TagIcon className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                <p className="mt-1.5 text-[11px] text-zinc-400">Nenhuma tag</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  Crie em Configurações › Tags
                </p>
              </div>
            ) : (
              tags.map((tag) => {
                const applied =
                  view === 'conversation' ? appliedConversation : appliedContact;
                const isOn = applied.has(tag.id);
                const isPending = pendingTagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag, view)}
                    disabled={isPending}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    ) : isOn ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
