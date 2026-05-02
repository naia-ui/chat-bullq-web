'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserPlus,
  XCircle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { ConversationAiToggle } from './conversation-ai-toggle';
import { inboxService, type Conversation } from '../services/inbox.service';

interface ConversationHeaderProps {
  conversation: Conversation;
  onUpdate: () => void;
}

function HeaderAvatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || '??';
  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {initials}
    </div>
  );
}

export function ConversationHeader({ conversation, onUpdate }: ConversationHeaderProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await inboxService.syncConversation(conversation.id);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['messages', conversation.id] }),
        queryClient.refetchQueries({ queryKey: ['conversations'] }),
      ]);
      if (result.imported > 0) {
        toast.success(
          `${result.imported} ${result.imported === 1 ? 'mensagem nova' : 'mensagens novas'} sincronizada${result.imported === 1 ? '' : 's'}`,
        );
      } else {
        toast.success('Tudo em dia — nenhuma mensagem nova');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };
  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    setIsLoading(true);
    try {
      await action();
      toast.success(successMsg);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        <HeaderAvatar
          name={conversation.contact.name}
          avatarUrl={conversation.contact.avatarUrl}
        />
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {conversation.contact.name || conversation.contact.phone || 'Desconhecido'}
          </div>
          {conversation.contact.phone && conversation.contact.name && (
            <div className="text-xs text-zinc-500">{conversation.contact.phone}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ConversationAiToggle
          conversation={conversation}
          disabled={isLoading}
          onChange={async (next) => {
            await handleAction(
              () => inboxService.toggleAi(conversation.id, next),
              next === null
                ? 'IA voltou pro padrão (segue config global)'
                : next
                  ? 'IA forçada nesta conversa (sobrepõe global)'
                  : 'IA pausada nesta conversa',
            );
          }}
        />
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Sincronizar mensagens"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
        {conversation.status !== 'CLOSED' && !conversation.assignedToId && (
          <button
            onClick={() =>
              handleAction(
                () => inboxService.assignToMe(conversation.id),
                'Conversa atribuída a você',
              )
            }
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Atribuir a mim
          </button>
        )}
        {conversation.status !== 'CLOSED' && (
          <button
            onClick={() =>
              handleAction(
                () => inboxService.closeConversation(conversation.id),
                'Conversa encerrada',
              )
            }
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <XCircle className="h-3.5 w-3.5" />
            Encerrar
          </button>
        )}
        {conversation.status === 'CLOSED' && (
          <button
            onClick={() =>
              handleAction(
                () => inboxService.reopenConversation(conversation.id),
                'Conversa reaberta',
              )
            }
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reabrir
          </button>
        )}
      </div>
    </div>
  );
}
