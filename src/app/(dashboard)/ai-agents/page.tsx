'use client';

import { useState } from 'react';
import { Bot, BarChart3, User, Sparkles, Wrench, Activity } from 'lucide-react';
import { AgentsList } from '@/features/ai-agents/components/agents-list';
import { JarvisOverviewTab } from '@/features/ai-agents/components/jarvis/overview-tab';
import { JarvisAgentTab } from '@/features/ai-agents/components/jarvis/agent-tab';
import { JarvisSkillsTab } from '@/features/ai-agents/components/jarvis/skills-tab';
import { JarvisToolsTab } from '@/features/ai-agents/components/jarvis/tools-tab';
import { JarvisRunsTab } from '@/features/ai-agents/components/jarvis/runs-tab';

type Tab = 'overview' | 'agents' | 'skills' | 'tools' | 'agent' | 'runs';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Visão geral', icon: BarChart3 },
  { id: 'agents', label: 'Agentes', icon: Bot },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'runs', label: 'Execuções', icon: Activity },
  { id: 'agent', label: 'Por agente', icon: User },
];

export default function AiAgentsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-1 pt-4">
          <h1 className="mr-6 inline-flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Bot className="h-5 w-5 text-primary" /> Jarvis
          </h1>
          <div className="flex">
            {TABS.map((t) => {
              const active = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && <JarvisOverviewTab />}
        {tab === 'agents' && <AgentsList />}
        {tab === 'skills' && <JarvisSkillsTab />}
        {tab === 'tools' && <JarvisToolsTab />}
        {tab === 'runs' && <JarvisRunsTab />}
        {tab === 'agent' && <JarvisAgentTab />}
      </div>
    </div>
  );
}
