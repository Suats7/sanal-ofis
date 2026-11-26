import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cpu,
  Download,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { AGENTS, AGENT_ORDER } from '../constants/agents';
import { ENGINE_META, ENGINE_ORDER } from '../constants/engines';
import { getAgentLevelInfo, getOfficeTierInfo } from '../constants/progression';
import type {
  AgentId,
  AgentOutputItem,
  EngineId,
  ProgressionState,
  TaskRun,
} from '../types';
import { MarkdownCard } from './MarkdownCard';

interface BoardViewProps {
  tasks: TaskRun[];
  outputs: AgentOutputItem[];
  progression: ProgressionState;
  onOpenProgression: () => void;
  onClearOutputs: () => void;
  onGoToOffice: () => void;
  onAuditWithSiberci?: (userPrompt: string, targetContent: string) => void;
}

export function BoardView({
  tasks,
  outputs,
  progression,
  onOpenProgression,
  onClearOutputs,
  onGoToOffice,
  onAuditWithSiberci,
}: BoardViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const officeTier = getOfficeTierInfo(progression.officeXp);

  const filteredOutputs = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return outputs.filter((item) => {
      if (selectedAgent !== 'all' && item.agentId !== selectedAgent) return false;
      if (!q) return true;
      return (
        item.title.toLocaleLowerCase('tr-TR').includes(q) ||
        item.content.toLocaleLowerCase('tr-TR').includes(q) ||
        item.userPrompt.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [outputs, selectedAgent, searchQuery]);

  const analytics = useMemo(() => {
    const engineCounts: Record<EngineId, number> = { gemini: 0, qwen: 0, deepseek: 0 };
    for (const item of outputs) {
      if (item.engineId && engineCounts[item.engineId] !== undefined) {
        engineCounts[item.engineId] += 1;
      }
    }
    const engineTotal = engineCounts.gemini + engineCounts.qwen + engineCounts.deepseek;

    const auditedTaskIds = new Set<string>();
    for (const task of tasks) {
      if (task.completedAgents.includes('siberci')) {
        auditedTaskIds.add(task.id);
      }
    }
    for (const out of outputs) {
      if (out.agentId === 'siberci') {
        auditedTaskIds.add(out.taskId);
      }
    }

    const latestUnaudited = outputs.find(
      (o) => o.agentId !== 'sef' && o.agentId !== 'siberci' && !auditedTaskIds.has(o.taskId),
    );

    let mvpId: AgentId = 'sef';
    for (const id of AGENT_ORDER) {
      const curr = progression.agents[id];
      const best = progression.agents[mvpId];
      if (
        curr.xp > best.xp ||
        (curr.xp === best.xp && curr.tasksCompleted > best.tasksCompleted)
      ) {
        mvpId = id;
      }
    }

    return {
      engineCounts,
      engineTotal,
      auditedCount: auditedTaskIds.size,
      totalTasks: tasks.length,
      latestUnaudited,
      mvpId,
    };
  }, [outputs, tasks, progression.agents]);

  const handleDownloadMissionBundle = (task: TaskRun) => {
    const taskOutputs = outputs.filter((o) => o.taskId === task.id).slice().reverse();
    const lines: string[] = [
      `# Sanal AI Ajan Ofisi — Görev Raporu`,
      ``,
      `- **Görev:** ${task.prompt}`,
      `- **Tarih:** ${new Date(task.createdAt).toLocaleString('tr-TR')}`,
      `- **Durum:** ${task.status}`,
      task.plan ? `- **CEO Sauron Özeti:** ${task.plan.summary}` : '',
      ``,
      `---`,
      ``,
    ].filter((line) => line !== undefined);

    if (taskOutputs.length === 0) {
      lines.push('*Bu görev için kayıtlı çıktı bulunamadı.*');
    } else {
      for (const out of taskOutputs) {
        const ag = AGENTS[out.agentId];
        const engLabel = out.engineId ? ` • ${ENGINE_META[out.engineId].name}` : '';
        lines.push(`## ${ag.name} (${ag.shortRole}${engLabel})`);
        lines.push(`*${out.title}*`);
        lines.push('');
        lines.push(out.content);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanal-ofis-rapor-${task.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mvpAgent = AGENTS[analytics.mvpId];
  const mvpProgress = progression.agents[analytics.mvpId];
  const mvpLevel = getAgentLevelInfo(mvpProgress.xp);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Görev Akışı & Çıktı Panosu
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            AI ajan ekibinin ürettiği tüm plan, araştırma, senaryo, kod ve siber güvenlik çıktıları
            Markdown formatında burada toplanır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenProgression}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-left transition hover:bg-amber-100"
          >
            <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-amber-700 uppercase">
              <Trophy className="h-3 w-3" />
              Ofis Sv.{officeTier.level}
            </p>
            <p className="text-sm font-extrabold text-amber-950">
              {officeTier.name} ({progression.officeXp} XP)
            </p>
          </button>
          <div className="rounded-xl bg-[#f7f3eb] px-3.5 py-2 text-center">
            <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
              Toplam Görev
            </p>
            <p className="text-lg font-extrabold text-slate-900">{tasks.length}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-3.5 py-2 text-center">
            <p className="text-[10px] font-bold tracking-wide text-indigo-600 uppercase">
              Üretilen Çıktı
            </p>
            <p className="text-lg font-extrabold text-indigo-900">{outputs.length}</p>
          </div>
          {outputs.length > 0 && (
            <button
              type="button"
              onClick={onClearOutputs}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Panoyu Temizle
            </button>
          )}
        </div>
      </div>

      {/* Executive Analytics & Siberci Security Radar */}
      {outputs.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* 1. AI Engine Distribution */}
          <div className="rounded-2xl border border-[#e3d9c8] bg-white p-4 shadow-xs">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Cpu className="h-4 w-4 text-indigo-600" />
              AI Motor Dağılımı
            </p>
            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              {analytics.engineTotal > 0 &&
                ENGINE_ORDER.map((engId) => {
                  const count = analytics.engineCounts[engId];
                  if (count === 0) return null;
                  const pct = (count / analytics.engineTotal) * 100;
                  return (
                    <div
                      key={engId}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ENGINE_META[engId].color,
                      }}
                      title={`${ENGINE_META[engId].name}: ${count}`}
                    />
                  );
                })}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {ENGINE_ORDER.map((engId) => {
                const eng = ENGINE_META[engId];
                const count = analytics.engineCounts[engId];
                return (
                  <span
                    key={engId}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: eng.lightBg, color: eng.accentColor }}
                  >
                    {eng.badgeSymbol} {eng.shortName}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 2. Siberci Security Radar */}
          <div className="rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/70 to-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-950">
                <ShieldCheck className="h-4 w-4 text-cyan-600" />
                Siberci Güvenlik Radarı
              </p>
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-extrabold text-cyan-800">
                {analytics.auditedCount} / {analytics.totalTasks} Denetimli
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600">
              {analytics.latestUnaudited
                ? 'Son görev çıktısı henüz Siberci güvenlik taramasından geçmedi.'
                : 'Tüm görevler Siberci güvenlik taramasından geçti.'}
            </p>
            {analytics.latestUnaudited && onAuditWithSiberci && (
              <button
                type="button"
                onClick={() =>
                  onAuditWithSiberci(
                    analytics.latestUnaudited!.userPrompt,
                    analytics.latestUnaudited!.content,
                  )
                }
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition hover:bg-cyan-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Son Çıktıyı Siberci'ye Denetlet
              </button>
            )}
          </div>

          {/* 3. Office MVP */}
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white p-4 shadow-xs">
            <p className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950">
              <Award className="h-4 w-4 text-amber-600" />
              Ofisin Yıldızı (MVP)
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-xs"
                style={{ backgroundColor: mvpAgent.color }}
              >
                {mvpAgent.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-slate-900">{mvpAgent.name}</span>
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    Sv.{mvpLevel.level} • {mvpLevel.title}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  {mvpProgress.xp} XP • {mvpProgress.tasksCompleted} tamamlanan adım
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Task Workflow Timeline */}
      {tasks.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Görev Akış Geçmişi
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-[#e5ddd0] bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{task.prompt}</p>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : task.status === 'running'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : task.status === 'running' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {task.status === 'completed'
                      ? 'Tamamlandı'
                      : task.status === 'running'
                        ? 'Çalışıyor'
                        : 'Hata'}
                  </span>
                </div>

                {task.plan ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-600">{task.plan.summary}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                        style={{
                          backgroundColor: AGENTS.sef.lightBg,
                          color: AGENTS.sef.accentColor,
                        }}
                      >
                        1. CEO Sauron ✓
                      </span>
                      {task.plan.steps.map((step, idx) => {
                        const ag = AGENTS[step.agentId];
                        const done = task.completedAgents.includes(step.agentId);
                        const active =
                          task.activeAgents?.includes(step.agentId) ||
                          task.activeAgent === step.agentId;
                        return (
                          <span
                            key={step.agentId}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                              active ? 'ring-2 ring-indigo-400' : ''
                            }`}
                            style={{
                              backgroundColor: ag.lightBg,
                              color: ag.accentColor,
                            }}
                          >
                            {idx + 2}. {ag.name} {done ? '✓' : active ? '...' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  task.completedAgents.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {task.completedAgents.map((agId) => (
                        <span
                          key={agId}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                          style={{
                            backgroundColor: AGENTS[agId].lightBg,
                            color: AGENTS[agId].accentColor,
                          }}
                        >
                          Doğrudan: {AGENTS[agId].name} ✓
                        </span>
                      ))}
                    </div>
                  )
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-medium text-slate-400">
                    {new Date(task.createdAt).toLocaleString('tr-TR')}
                    {task.isDemo ? ' • Demo Modu' : ''}
                  </p>
                  {task.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadMissionBundle(task)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      title="Bu göreve ait tüm ajan çıktılarını tek Markdown raporu olarak indir"
                    >
                      <Download className="h-3 w-3" />
                      Raporu İndir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Ajan:
          </span>
          <button
            type="button"
            onClick={() => setSelectedAgent('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              selectedAgent === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tümü ({outputs.length})
          </button>
          {AGENT_ORDER.map((id) => {
            const ag = AGENTS[id];
            const count = outputs.filter((o) => o.agentId === id).length;
            const lvl = getAgentLevelInfo(progression.agents[id].xp).level;
            const active = selectedAgent === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedAgent(id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  active ? 'text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                style={active ? { backgroundColor: ag.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? '#ffffff' : ag.color }}
                />
                {ag.name} Sv.{lvl} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <label htmlFor="board-search" className="sr-only">
            Çıktılarda ara
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="board-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Çıktılarda ara..."
            className="w-full rounded-xl border border-[#e3d9c8] bg-white py-2 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
          />
        </div>
      </div>

      {/* Outputs List */}
      {filteredOutputs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8cdbc] bg-white/70 px-6 py-16 text-center">
          <Sparkles className="h-10 w-10 text-indigo-300" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            {outputs.length === 0
              ? 'Henüz üretilmiş bir çıktı yok'
              : 'Filtreyle eşleşen çıktı bulunamadı'}
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            {outputs.length === 0
              ? 'Ofis sekmesine dönüp sohbet panelinden ekibe bir görev verdiğinizde tüm ajan çıktıları burada listelenecek.'
              : 'Farklı bir ajan seçebilir veya arama metnini temizleyebilirsiniz.'}
          </p>
          {outputs.length === 0 && (
            <button
              type="button"
              onClick={onGoToOffice}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              Ofis Görünümüne Git
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredOutputs.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <p className="truncate px-1 text-[11px] font-medium text-slate-500">
                Görev: <span className="font-semibold text-slate-700">{item.userPrompt}</span>
              </p>
              <MarkdownCard
                agentId={item.agentId}
                title={item.title}
                content={item.content}
                createdAt={item.createdAt}
                isDemo={item.isDemo}
                engineId={item.engineId}
                modelUsed={item.modelUsed}
                showDownload
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
