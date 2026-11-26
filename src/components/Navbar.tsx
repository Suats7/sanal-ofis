import {
  Box,
  ClipboardList,
  KeyRound,
  Settings,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getOfficeTierInfo } from '../constants/progression';
import type { ActiveTab, AppSettings, ProgressionState } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  outputCount: number;
  settings: AppSettings;
  progression: ProgressionState;
  onOpenProgression: () => void;
  onToggleSound: () => void;
  isWorking: boolean;
}

export function Navbar({
  activeTab,
  onTabChange,
  outputCount,
  settings,
  progression,
  onOpenProgression,
  onToggleSound,
  isWorking,
}: NavbarProps) {
  const hasGeminiKey = Boolean(settings.apiKey.trim());
  const hasOpenRouterKey = Boolean(settings.openRouterApiKey.trim());
  const hasAnyKey = hasGeminiKey || hasOpenRouterKey;
  const officeTier = getOfficeTierInfo(progression.officeXp);

  const apiBadgeLabel = settings.demoMode
    ? 'Demo Modu Aktif'
    : hasGeminiKey && hasOpenRouterKey
      ? 'Gemini + OpenRouter'
      : hasGeminiKey
        ? `Gemini (${settings.model})`
        : hasOpenRouterKey
          ? 'OpenRouter (Qwen/DS)'
          : 'API Anahtarı Gerekli';

  const navItems: { id: ActiveTab; label: string; icon: typeof Box; badge?: number }[] = [
    { id: 'ofis', label: 'Ofis', icon: Box },
    { id: 'pano', label: 'Pano', icon: ClipboardList, badge: outputCount > 0 ? outputCount : undefined },
    { id: 'ayarlar', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#e4dbc9] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-[1600px] items-center justify-between gap-3 px-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
              Sanal AI Ajan Ofisi
            </h1>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
              3D İzometrik Çoklu Ajan Çalışma Alanı
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav aria-label="Ana gezinme" className="flex items-center gap-1 rounded-2xl bg-[#f3efe6] p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition sm:text-sm ${
                  active
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-0.5 rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Connection & Office Level Status Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenProgression}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
            title="Ofis büyümesi, XP ve ajan seviyelerini görüntüle"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            <span>Sv.{officeTier.level}</span>
            <span className="hidden text-[11px] font-semibold text-amber-700 md:inline">
              • {progression.officeXp} XP
            </span>
          </button>

          {isWorking && (
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 md:inline-flex">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
              Ekip Çalışıyor
            </span>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            className={`inline-flex items-center justify-center rounded-xl border p-1.5 transition ${
              settings.soundEnabled
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
            title={settings.soundEnabled ? 'Ofis seslerini kapat' : 'Ofis seslerini aç'}
            aria-label={settings.soundEnabled ? 'Ofis seslerini kapat' : 'Ofis seslerini aç'}
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('ayarlar')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              hasAnyKey && !settings.demoMode
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : settings.demoMode
                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
            title="Gemini & OpenRouter API ayarlarını aç"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{apiBadgeLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
