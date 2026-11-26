import { Award, Brain, Building2, Check, Eye, Lock, Plus, Sparkles, Trophy, X } from 'lucide-react';
import { AGENTS, AGENT_ORDER } from '../constants/agents';
import {
  getAgentLevelInfo,
  getOfficeTierInfo,
  OFFICE_TIERS,
} from '../constants/progression';
import type { OfficeLevel, ProgressionState } from '../types';

interface ProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  progression: ProgressionState;
  previewOfficeLevel: OfficeLevel | null;
  onSetPreviewOfficeLevel: (level: OfficeLevel | null) => void;
  onAddBonusXp: () => void;
}

export function ProgressionModal({
  isOpen,
  onClose,
  progression,
  previewOfficeLevel,
  onSetPreviewOfficeLevel,
  onAddBonusXp,
}: ProgressionModalProps) {
  if (!isOpen) return null;

  const officeTier = getOfficeTierInfo(progression.officeXp);
  const effectiveLevel = previewOfficeLevel ?? officeTier.level;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ofis ve Ajan Gelişimi"
      onClick={onClose}
    >
      <div
        className="custom-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#e3d9c8] bg-[#faf7f2] p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Ofis Büyümesi & Ajan Gelişimi
              </h2>
              <p className="text-xs text-slate-500">
                Görev tamamladıkça ajanların seviye atlar, hafızası güçlenir ve 3D ofis binan
                fiziksel olarak büyür.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Office Building Tier Progress */}
        <section className="mt-5 rounded-2xl border border-[#e3d9c8] bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Mevcut Bina: Sv.{officeTier.level} — {officeTier.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Toplam Ofis XP: <strong className="text-indigo-700">{progression.officeXp} XP</strong> •{' '}
                  Tamamlanan Görev: <strong>{progression.totalTasksCompleted}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {previewOfficeLevel !== null && (
                <button
                  type="button"
                  onClick={() => onSetPreviewOfficeLevel(null)}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                >
                  Gerçek Seviyeye Dön (Sv.{officeTier.level})
                </button>
              )}
              <button
                type="button"
                onClick={onAddBonusXp}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100"
                title="Bina büyümesini ve ajan yükseltmelerini hemen görmek için test XP ekle"
              >
                <Plus className="h-3.5 w-3.5" />
                +150 Test XP
              </button>
            </div>
          </div>

          {/* Office XP Bar */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-500">
              <span>Sv.{officeTier.level} İlerleme</span>
              <span>
                {officeTier.nextTierXp
                  ? `${progression.officeXp} / ${officeTier.nextTierXp} XP`
                  : 'Maksimum Ofis Seviyesi!'}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400 transition-all duration-500"
                style={{ width: `${officeTier.progressPercent}%` }}
              />
            </div>
          </div>

          {/* 3 Building Tiers Cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {OFFICE_TIERS.map((tier) => {
              const unlocked = progression.officeXp >= tier.minXp;
              const isShowing = effectiveLevel === tier.level;

              return (
                <div
                  key={tier.level}
                  className={`flex flex-col justify-between rounded-2xl border p-3.5 transition ${
                    isShowing
                      ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200'
                      : unlocked
                        ? 'border-emerald-200 bg-emerald-50/25'
                        : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-white">
                        Sv.{tier.level}
                      </span>
                      {unlocked ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="h-3.5 w-3.5" />
                          Açık
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400">
                          <Lock className="h-3 w-3" />
                          {tier.minXp} XP
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-xs font-extrabold text-slate-900">
                      {tier.name}
                    </h3>
                    <p className="text-[10.5px] text-slate-500">{tier.subtitle}</p>
                    <ul className="mt-2 space-y-1">
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-1 text-[10.5px] text-slate-600"
                        >
                          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSetPreviewOfficeLevel(
                        tier.level === officeTier.level ? null : tier.level,
                      );
                      onClose();
                    }}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                      isShowing
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isShowing ? 'Şu An Görüntüleniyor' : '3D Sahnede Önizle'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4 Agents Progression & Memory */}
        <section className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-extrabold tracking-wider text-slate-600 uppercase">
              Ajan Seviyeleri & Öğrenilen Hafıza
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AGENT_ORDER.map((id) => {
              const ag = AGENTS[id];
              const prog = progression.agents[id];
              const info = getAgentLevelInfo(prog.xp);

              return (
                <div
                  key={id}
                  className="rounded-2xl border bg-white p-4 shadow-xs"
                  style={{ borderColor: ag.borderColor }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: ag.color }}
                      >
                        {ag.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-slate-900">
                            {ag.name}
                          </span>
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                            Sv.{info.level} • {info.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {prog.tasksCompleted} görev tamamlandı • {prog.xp} XP
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Agent XP bar */}
                  <div className="mt-2.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${info.progressPercent}%`,
                          backgroundColor: ag.color,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10.5px] font-medium text-slate-500">
                      <strong>Görsel & Yetenek Bonusu:</strong> {info.perk}
                    </p>
                  </div>

                  {/* Agent Memories */}
                  <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
                    <p className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                      <Brain className="h-3 w-3 text-indigo-500" />
                      Ajan Hafızası ({prog.memories.length})
                    </p>
                    {prog.memories.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Henüz kayıtlı deneyim yok — görev verdikçe tercihlerini öğrenecek.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {prog.memories.slice(0, 3).map((mem, idx) => (
                          <li
                            key={idx}
                            className="truncate text-[11px] text-slate-600"
                            title={mem}
                          >
                            • {mem}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
