'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Sparkles, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiAgentsService,
  type AiAgent,
} from '../services/ai-agents.service';
import { useOrgId } from '@/hooks/use-org-query-key';
import { CreateAgentDialog } from './create-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';

export function AgentsList() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AiAgent | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['ai-agents', orgId],
    queryFn: () => aiAgentsService.list(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['ai-agents'] });

  const handleToggleActive = async (agent: AiAgent) => {
    try {
      await aiAgentsService.update(agent.id, { isActive: !agent.isActive });
      toast.success(agent.isActive ? 'Agente desativado' : 'Agente ativado');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alternar');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Agentes cadastrados
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Personas que respondem mensagens automaticamente
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo agente
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))
        ) : agents && agents.length > 0 ? (
          agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setEditing(agent)}
              className="group rounded-xl border border-zinc-200 bg-white p-5 text-left transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {agent.name}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {agent.kind === 'ORCHESTRATOR' ? 'Orquestrador' : 'Worker'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {agent.modelId}
                    </p>
                    {agent.description && (
                      <p className="mt-2 text-sm text-zinc-600 line-clamp-2 dark:text-zinc-400">
                        {agent.description}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(agent);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${
                    agent.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                  }`}
                >
                  {agent.isActive ? (
                    <>
                      <Power className="h-3 w-3" /> Ativo
                    </>
                  ) : (
                    <>
                      <PowerOff className="h-3 w-3" /> Pausado
                    </>
                  )}
                </span>
              </div>

              {agent.channels && agent.channels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {agent.channels.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {c.channel.name}
                      <span className="text-zinc-400">· {c.mode.toLowerCase()}</span>
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
            <Bot className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Nenhum agente cadastrado ainda
            </p>
            <p className="mt-1 max-w-md text-center text-xs text-zinc-400 dark:text-zinc-500">
              Crie um agente, dê a ele um system prompt e atribua a um canal —
              ele passa a responder automaticamente.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar primeiro agente
            </button>
          </div>
        )}
      </div>

      <CreateAgentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
      <EditAgentDialog
        agent={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </div>
  );
}
