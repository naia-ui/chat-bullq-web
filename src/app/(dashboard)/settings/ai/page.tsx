'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiSettingsService,
  DEFAULT_BUSINESS_HOURS,
  WEEKDAYS,
  type BusinessHoursConfig,
  type Weekday,
} from '@/features/ai-agents/services/ai-settings.service';
import { channelsService, type Channel } from '@/features/channels/services/channels.service';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
];

export default function SettingsAiPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => aiSettingsService.get(),
  });

  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiTimezone, setAiTimezone] = useState('America/Sao_Paulo');
  const [hours, setHours] = useState<BusinessHoursConfig>(DEFAULT_BUSINESS_HOURS);
  const [outOfHoursMessage, setOutOfHoursMessage] = useState('');
  const [autoDisable, setAutoDisable] = useState(true);
  const [tokenCap, setTokenCap] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAiEnabled(data.aiEnabled);
    setAiTimezone(data.aiTimezone);
    setHours(data.aiBusinessHours ?? DEFAULT_BUSINESS_HOURS);
    setOutOfHoursMessage(data.aiOutOfHoursMessage ?? '');
    setAutoDisable(data.aiAutoDisableOnHuman);
    setTokenCap(data.aiMonthlyTokenCap?.toString() ?? '');
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await aiSettingsService.update({
        aiEnabled,
        aiTimezone,
        aiBusinessHours: hours,
        aiOutOfHoursMessage: outOfHoursMessage,
        aiAutoDisableOnHuman: autoDisable,
        aiMonthlyTokenCap: tokenCap ? parseInt(tokenCap, 10) : null,
      });
      toast.success('Configurações de IA salvas');
      qc.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (
    day: Weekday,
    patch: Partial<{ enabled: boolean; windows: Array<[string, string]> }>,
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        enabled: prev[day]?.enabled ?? false,
        windows: prev[day]?.windows ?? [],
        ...patch,
      },
    }));
  };

  const addWindow = (day: Weekday) => {
    setHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? true,
          windows: [...existing, ['09:00', '18:00']],
        },
      };
    });
  };

  const removeWindow = (day: Weekday, idx: number) => {
    setHours((prev) => {
      const existing = prev[day]?.windows ?? [];
      return {
        ...prev,
        [day]: {
          enabled: prev[day]?.enabled ?? false,
          windows: existing.filter((_, i) => i !== idx),
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-72 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            <Sparkles className="h-5 w-5 text-primary" />
            Inteligência Artificial
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Configure quando e como os agentes de IA atendem
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>

      {/* Kill switch */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              IA habilitada (geral)
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Padrão pra novas conversas. Canais individuais podem sobrepor
              esse toggle (abaixo). Conversas individuais também podem forçar
              IA ON/OFF.
            </p>
          </div>
          <Toggle checked={aiEnabled} onChange={setAiEnabled} />
        </label>
      </section>

      {/* Override por canal */}
      <ChannelAiOverrides />

      {/* Auto-disable on human */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Pausar IA quando humano responde
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Assim que um atendente envia uma mensagem na conversa, a IA é
              automaticamente desativada nessa conversa específica.
            </p>
          </div>
          <Toggle checked={autoDisable} onChange={setAutoDisable} />
        </label>
      </section>

      {/* Business hours */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Horário de atendimento
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Fora desses horários a IA não responde.
            </p>
          </div>
          <select
            value={aiTimezone}
            onChange={(e) => setAiTimezone(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {WEEKDAYS.map(({ key, label }) => {
            const day = hours[key] ?? { enabled: false, windows: [] };
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <label className="flex w-24 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) =>
                      updateDay(key, { enabled: e.target.checked })
                    }
                    className="h-3.5 w-3.5 rounded border-zinc-300"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {label}
                  </span>
                </label>

                {day.enabled ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {(day.windows ?? []).map(([from, to], i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="time"
                          value={from}
                          onChange={(e) => {
                            const updated = [...(day.windows ?? [])];
                            updated[i] = [e.target.value, to];
                            updateDay(key, { windows: updated });
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <span className="text-xs text-zinc-400">até</span>
                        <input
                          type="time"
                          value={to}
                          onChange={(e) => {
                            const updated = [...(day.windows ?? [])];
                            updated[i] = [from, e.target.value];
                            updateDay(key, { windows: updated });
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                        <button
                          onClick={() => removeWindow(key, i)}
                          className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addWindow(key)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-3 w-3" /> Janela
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">Não atende</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Out of hours message */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Mensagem fora de horário (opcional)
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Texto enviado automaticamente quando alguém manda mensagem fora do
          horário configurado. Vazio = não responde nada.
        </p>
        <textarea
          value={outOfHoursMessage}
          onChange={(e) => setOutOfHoursMessage(e.target.value)}
          rows={2}
          placeholder="Olá! No momento estamos fora do horário de atendimento. Voltamos amanhã às 9h e respondemos sua mensagem por aqui."
          className="mt-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </section>

      {/* Token cap */}
      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Limite mensal de tokens
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Soma input + output. Vazio = sem limite.
        </p>
        <input
          type="number"
          min="0"
          value={tokenCap}
          onChange={(e) => setTokenCap(e.target.value)}
          placeholder="ex: 1000000"
          className="mt-3 w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/**
 * Lista todos os canais ativos com um tri-state selector pra IA por canal:
 *   "Padrão" (null) → segue o toggle global da org
 *   "Forçar ON" (true) → IA responde nesse canal mesmo se org tá OFF
 *   "Forçar OFF" (false) → IA não responde nesse canal mesmo com org ON
 *
 * Cada mudança chama PATCH /channels/:id imediatamente — não precisa salvar.
 */
function ChannelAiOverrides() {
  const qc = useQueryClient();
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelsService.list(),
  });

  const update = async (id: string, value: boolean | null) => {
    try {
      await channelsService.update(id, { aiEnabled: value });
      qc.invalidateQueries({ queryKey: ['channels'] });
      toast.success(
        value === null
          ? 'Canal seguindo padrão da org'
          : value
            ? 'IA forçada ON nesse canal'
            : 'IA desligada nesse canal',
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar');
    }
  };

  const visible = (channels ?? []).filter((c) => !!c.isActive);

  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          IA por canal
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sobrepõe o toggle geral acima por canal. Útil pra ligar IA só num
          número de teste, ou desligar num canal de produção temporariamente.
        </p>
      </div>

      {isLoading ? (
        <div className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      ) : visible.length === 0 ? (
        <p className="text-xs text-zinc-500">
          Nenhum canal ativo. Adicione canais na aba Canais.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <ChannelOverrideRow
              key={c.id}
              channel={c}
              onChange={(v) => update(c.id, v)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ChannelOverrideRow({
  channel,
  onChange,
}: {
  channel: Channel;
  onChange: (v: boolean | null) => void;
}) {
  const opts: Array<{ value: 'inherit' | 'on' | 'off'; label: string; bg: string }> = [
    { value: 'inherit', label: 'Padrão', bg: 'bg-zinc-200 dark:bg-zinc-700' },
    { value: 'on', label: 'ON', bg: 'bg-emerald-500' },
    { value: 'off', label: 'OFF', bg: 'bg-red-500' },
  ];
  const current: 'inherit' | 'on' | 'off' =
    channel.aiEnabled === null || channel.aiEnabled === undefined
      ? 'inherit'
      : channel.aiEnabled
        ? 'on'
        : 'off';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {channel.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {channel.type.replace('_', ' ').toLowerCase()}
        </p>
      </div>
      <div className="inline-flex rounded-md bg-zinc-200 p-0.5 dark:bg-zinc-800">
        {opts.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                onChange(
                  opt.value === 'inherit' ? null : opt.value === 'on',
                )
              }
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? `${opt.bg} text-white`
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
