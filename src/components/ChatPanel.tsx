import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Flame,
  Loader2,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { AGENTS, EXAMPLE_PROMPTS } from '../constants/agents';
import type { AgentId, AppSettings, ChatMessage } from '../types';
import { MarkdownCard } from './MarkdownCard';

export type ChatTargetSelection = 'team' | Exclude<AgentId, 'sef'>;

const TARGET_OPTIONS: { id: ChatTargetSelection; label: string; badge: string }[] = [
  { id: 'team', label: 'Ekip (CEO Sauron)', badge: '👁️' },
  { id: 'arastirmaci', label: 'Araştırmacı', badge: '🔍' },
  { id: 'icerikci', label: 'İçerikçi', badge: '🎬' },
  { id: 'yazilimci', label: 'Yazılımcı', badge: '💻' },
  { id: 'siberci', label: 'Siberci', badge: '🛡️' },
];

function extractMentionTarget(
  rawPrompt: string,
  fallbackTarget: ChatTargetSelection,
): { cleanedPrompt: string; target: ChatTargetSelection } {
  const match = rawPrompt.match(/^@(ekip|sauron|arastirmaci|araştırmacı|icerikci|içerikçi|yazilimci|yazılımcı|siberci)\b[:,\s-]*/i);
  if (!match) {
    return { cleanedPrompt: rawPrompt, target: fallbackTarget };
  }
  const token = match[1].toLocaleLowerCase('tr-TR');
  const stripped = rawPrompt.slice(match[0].length).trim() || rawPrompt;
  if (token === 'ekip' || token === 'sauron') return { cleanedPrompt: stripped, target: 'team' };
  if (token === 'arastirmaci' || token === 'araştırmacı')
    return { cleanedPrompt: stripped, target: 'arastirmaci' };
  if (token === 'icerikci' || token === 'içerikçi')
    return { cleanedPrompt: stripped, target: 'icerikci' };
  if (token === 'yazilimci' || token === 'yazılımcı')
    return { cleanedPrompt: stripped, target: 'yazilimci' };
  if (token === 'siberci') return { cleanedPrompt: stripped, target: 'siberci' };
  return { cleanedPrompt: rawPrompt, target: fallbackTarget };
}

interface ChatPanelProps {
  messages: ChatMessage[];
  isRunning: boolean;
  isGeneratingMission: boolean;
  settings: AppSettings;
  onSubmitTask: (prompt: string, targetAgent?: ChatTargetSelection) => void;
  onTriggerSauronAutoTask: () => void;
  onOpenSettings: () => void;
  onEnableDemoMode: () => void;
  onClearChat: () => void;
}

export function ChatPanel({
  messages,
  isRunning,
  isGeneratingMission,
  settings,
  onSubmitTask,
  onTriggerSauronAutoTask,
  onOpenSettings,
  onEnableDemoMode,
  onClearChat,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [targetAgent, setTargetAgent] = useState<ChatTargetSelection>('team');
  const formRef = useRef<HTMLFormElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const canRun =
    Boolean(settings.apiKey.trim() || settings.openRouterApiKey.trim()) || settings.demoMode;

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRunning]);

  const isBusy = isRunning || isGeneratingMission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    const { cleanedPrompt, target } = extractMentionTarget(trimmed, targetAgent);
    onSubmitTask(cleanedPrompt, target);
    setInput('');
  };

  // IME-safe Enter-to-submit following ime-safe-enter-submit guidance
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
        return;
      }
      formRef.current?.requestSubmit();
    }
  };

  const isAgentSender = (sender: ChatMessage['sender']): sender is AgentId =>
    sender === 'sef' ||
    sender === 'arastirmaci' ||
    sender === 'icerikci' ||
    sender === 'yazilimci' ||
    sender === 'siberci';

  return (
    <section
      aria-label="Komut ve Sohbet Paneli"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e3d9c8] bg-white/90 shadow-sm backdrop-blur-sm"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece4d6] bg-[#faf7f2] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Komut & Sohbet Paneli</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTriggerSauronAutoTask}
            disabled={isBusy}
            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold text-orange-700 shadow-2xs transition hover:bg-orange-100 disabled:opacity-50"
            title="CEO Sauron kendi başına yeni görev üretip ekibi çalıştırsın"
          >
            {isGeneratingMission ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-orange-600" />
            )}
            <span>{isGeneratingMission ? 'Üretiyor...' : 'Sauron Görev Üretsin'}</span>
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              disabled={isBusy}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800 disabled:opacity-40"
              title="Sohbet akışını temizle"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* API Key Warning Banner if neither API key nor Demo Mode */}
      {!canRun && (
        <div className="border-b border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-2">
              <p className="font-medium leading-relaxed">
                Görev çalıştırmak için <strong>Ayarlar</strong> sekmesinden Gemini ve/veya OpenRouter
                (Qwen & DeepSeek) API anahtarınızı ekleyin ya da <strong>Demo Modu</strong>nu açın.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-indigo-700"
                >
                  <Settings className="h-3.5 w-3.5" />
                  API Anahtarı Ekle
                </button>
                <button
                  type="button"
                  onClick={onEnableDemoMode}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  Demo Modunda Dene
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center space-y-4 py-4">
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-indigo-50/40 to-cyan-50/50 p-4 text-center">
              <p className="text-sm font-bold text-slate-900">
                CEO Sauron & 5 Ajanlı Ekip Hazır!
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                <strong>CEO Sauron</strong> işi dağıtır; <strong>Gemini Ofisi</strong>,{' '}
                <strong>Qwen Stüdyosu</strong> ve <strong>DeepSeek Lab (Yazılımcı & Siberci)</strong>{' '}
                eşzamanlı çalışır.
              </p>
              <button
                type="button"
                onClick={onTriggerSauronAutoTask}
                disabled={isBusy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:from-orange-700 hover:to-amber-700 disabled:opacity-50"
              >
                {isGeneratingMission ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                <span>
                  {isGeneratingMission
                    ? 'CEO Sauron Görev Hazırlıyor...'
                    : 'Sauron Kendi Görev Üretsin & Başlatsın'}
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                Örnek Görevler
              </p>
              <div className="grid grid-cols-1 gap-2">
                {EXAMPLE_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setInput(item.prompt)}
                    className="group rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                      {item.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-xs leading-relaxed text-white shadow-xs">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-indigo-200">
                      <User className="h-3 w-3" />
                      <span>Sen</span>
                      <span>•</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              );
            }

            if (msg.sender === 'system') {
              return (
                <div
                  key={msg.id}
                  className="overflow-hidden break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
                >
                  {msg.text}
                </div>
              );
            }

            if (isAgentSender(msg.sender)) {
              return (
                <MarkdownCard
                  key={msg.id}
                  agentId={msg.sender}
                  title={msg.title}
                  content={msg.text}
                  createdAt={msg.createdAt}
                  isDemo={msg.isDemo}
                  engineId={msg.engineId}
                  modelUsed={msg.modelUsed}
                  compact
                />
              );
            }

            return null;
          })
        )}

        {(isRunning || isGeneratingMission) && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs font-semibold text-indigo-800">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>
              {isGeneratingMission
                ? 'CEO Sauron yeni görev oluşturuyor...'
                : 'Ajanlar ofiste görev üzerinde çalışıyor...'}
            </span>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Command Input Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="border-t border-[#ece4d6] bg-[#faf7f2] p-3"
      >
        {/* Direct 1-on-1 Agent Target Selector */}
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {TARGET_OPTIONS.map((opt) => {
            const active = targetAgent === opt.id;
            const agentColor = opt.id === 'team' ? '#ea580c' : AGENTS[opt.id].color;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetAgent(opt.id)}
                disabled={isBusy}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-bold transition ${
                  active
                    ? 'text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={
                  active ? { backgroundColor: agentColor, borderColor: agentColor } : undefined
                }
                title={
                  opt.id === 'team'
                    ? 'CEO Sauron tüm ekibe dağıtsın'
                    : `Doğrudan ${opt.label} ajanına görev gönder`
                }
              >
                <span>{opt.badge}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <label htmlFor="task-command-input" className="sr-only">
          AI ajan ekibine görev yazın
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="task-command-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            placeholder={
              targetAgent === 'team'
                ? "Ekibe görev verin (veya @siberci, @yazilimci ile tek ajana seslenin)..."
                : `Doğrudan ${AGENTS[targetAgent].name} ajanına görev veya soru gönderin...`
            }
            className="custom-scrollbar max-h-32 min-h-[52px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="inline-flex h-[52px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            title="Görevi gönder (Enter)"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Gönder</span>
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>Enter ile gönder • Shift + Enter yeni satır</span>
          {settings.demoMode && (
            <span className="font-semibold text-amber-600">Demo Modu</span>
          )}
        </div>
      </form>
    </section>
  );
}
