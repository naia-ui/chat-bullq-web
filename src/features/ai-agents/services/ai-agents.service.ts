import { api } from '@/lib/api';

export type AgentKind = 'ORCHESTRATOR' | 'WORKER';
export type AgentMode = 'AUTONOMOUS' | 'COPILOT' | 'DISABLED';
export type AgentTrigger = 'ALWAYS' | 'OFF_HOURS' | 'NO_HUMAN_ASSIGNED';

export interface AgentChannelLink {
  id: string;
  channelId: string;
  mode: AgentMode;
  trigger: AgentTrigger;
  channel: { id: string; name: string; type: string };
}

export interface AiAgent {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  kind: AgentKind;
  category: string | null;
  capabilities: string[];
  modelId: string;
  modelParams: Record<string, unknown> | null;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  canRespondDirectly: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  channels?: AgentChannelLink[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  kind?: AgentKind;
  category?: string;
  capabilities?: string[];
  modelId: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  canRespondDirectly?: boolean;
  isActive?: boolean;
}

export interface AgentRun {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  finalAction:
    | 'REPLIED'
    | 'DELEGATED'
    | 'HANDED_BACK'
    | 'TRANSFERRED_TO_HUMAN'
    | 'CLOSED_CONVERSATION'
    | 'NO_ACTION'
    | null;
  errorMessage: string | null;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: string;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  conversationId: string;
  toolCalls: Array<{
    id: string;
    toolName: string;
    input: unknown;
    output: unknown;
    error: string | null;
    durationMs: number | null;
    createdAt: string;
  }>;
}

export const aiAgentsService = {
  async list(): Promise<AiAgent[]> {
    const { data } = await api.get('/ai-agents');
    return data.data ?? data;
  },

  async findOne(id: string): Promise<AiAgent> {
    const { data } = await api.get(`/ai-agents/${id}`);
    return data.data ?? data;
  },

  async create(input: CreateAgentInput): Promise<AiAgent> {
    const { data } = await api.post('/ai-agents', input);
    return data.data ?? data;
  },

  async update(id: string, input: Partial<CreateAgentInput>): Promise<AiAgent> {
    const { data } = await api.patch(`/ai-agents/${id}`, input);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/ai-agents/${id}`);
  },

  async assignChannel(
    id: string,
    payload: { channelId: string; mode?: AgentMode; trigger?: AgentTrigger },
  ): Promise<AgentChannelLink> {
    const { data } = await api.post(`/ai-agents/${id}/channels`, payload);
    return data.data ?? data;
  },

  async unassignChannel(id: string, channelId: string): Promise<void> {
    await api.delete(`/ai-agents/${id}/channels/${channelId}`);
  },

  async listRuns(id: string, limit = 50): Promise<AgentRun[]> {
    const { data } = await api.get(`/ai-agents/${id}/runs`, { params: { limit } });
    return data.data ?? data;
  },

  async feed(params: { agentId?: string; limit?: number } = {}): Promise<FeedRun[]> {
    const { data } = await api.get('/ai-agents/runs/feed', { params });
    return data.data ?? data;
  },

  async orgStats(period: Period = '7d'): Promise<OrgStats> {
    const { data } = await api.get('/ai-agents/stats/overview', {
      params: { period },
    });
    return data.data ?? data;
  },

  async agentStats(id: string, period: Period = '7d'): Promise<AgentStats> {
    const { data } = await api.get(`/ai-agents/${id}/stats`, {
      params: { period },
    });
    return data.data ?? data;
  },
};

export type Period = '24h' | '7d' | '30d';

export interface FeedRun {
  id: string;
  agentId: string;
  conversationId: string;
  modelId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  finalAction: AgentRun['finalAction'];
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: string;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  agent: { id: string; name: string; kind: AgentKind };
  toolCalls: Array<{ toolName: string }>;
}

export interface OrgStats {
  period: Period;
  since: string;
  runs: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    successRate: number | null;
  };
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: { usd: number; avgPerRun: number };
  latency: { p50: number | null; p95: number | null };
  monthlyCap: {
    used: number;
    cap: number | null;
    percentUsed: number | null;
  };
  byModel: Array<{
    modelId: string;
    runs: number;
    tokens: number;
    cost: number;
  }>;
  byAgent: Array<{
    agentId: string;
    runs: number;
    tokens: number;
    cost: number;
  }>;
  byFinalAction: Record<string, number>;
  tools: Array<{ name: string; calls: number }>;
  handoffs: Array<{
    fromAgentId: string;
    toAgentId: string;
    count: number;
  }>;
}

export interface AgentStats {
  period: Period;
  since: string;
  runs: {
    total: number;
    completed: number;
    failed: number;
    successRate: number | null;
  };
  tokens: OrgStats['tokens'];
  cost: OrgStats['cost'];
  latency: OrgStats['latency'];
  byFinalAction: Record<string, number>;
  byModel: OrgStats['byModel'];
  tools: OrgStats['tools'];
  handoffs: { sent: number; received: number };
}

export const CURATED_MODELS = [
  {
    id: 'anthropic/claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    badge: 'Rápido · barato',
    recommendedFor: 'orchestrator',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    badge: 'Equilíbrio · padrão',
    recommendedFor: 'worker',
  },
  {
    id: 'anthropic/claude-opus-4-7',
    label: 'Claude Opus 4.7',
    badge: 'Premium · mais caro',
    recommendedFor: 'worker',
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o mini',
    badge: 'Rápido · barato',
    recommendedFor: 'orchestrator',
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    badge: 'Equilíbrio',
    recommendedFor: 'worker',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    badge: 'Muito barato',
    recommendedFor: 'orchestrator',
  },
] as const;
