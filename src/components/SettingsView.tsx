import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { AGENTS, AGENT_ORDER } from '../constants/agents';
import {
  DEEPSEEK_MODEL_OPTIONS,
  ENGINE_META,
  ENGINE_ORDER,
  normalizeOpenRouterModel,
  QWEN_MODEL_OPTIONS,
  type EngineModelOption,
} from '../constants/engines';
import {
  DEFAULT_GEMINI_MODEL,
  fetchAccountGeminiModels,
  formatGeminiError,
  GEMINI_MODEL_OPTIONS,
  normalizeGeminiModel,
  testGeminiConnection,
  type GeminiModelOption,
} from '../services/geminiService';
import {
  fetchOpenRouterModelsByFamily,
  formatOpenRouterError,
  testOpenRouterConnection,
} from '../services/openRouterService';
import type { AgentId, AppSettings, EngineId } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (next: AppSettings) => void;
  onResetAllData: () => void;
}

type TestResultState = { ok: boolean; message: string } | null;

interface OpenRouterCatalogInfo {
  freeCount: number;
  qwenFreeCount: number;
  deepseekFreeCount: number;
  qwenPaidCount: number;
  deepseekPaidCount: number;
}

function OpenRouterTestAlert({ result }: { result: TestResultState }) {
  if (!result) return null;
  const lower = result.message.toLowerCase();
  const showPrivacyLink = !result.ok && (lower.includes('privacy') || lower.includes('gizlilik'));
  const showCreditsLink = !result.ok && lower.includes('kredi');

  return (
    <div
      className={`mt-2.5 flex items-start gap-2 overflow-hidden rounded-lg border p-2.5 text-[11px] ${
        result.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {result.ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="break-words">{result.message}</p>
        {(showPrivacyLink || showCreditsLink) && (
          <div className="flex flex-wrap gap-2">
            {showPrivacyLink && (
              <a
                href="https://openrouter.ai/settings/privacy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 font-bold text-rose-800 underline hover:bg-white"
              >
                Gizlilik Ayarını Aç
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {showCreditsLink && (
              <a
                href="https://openrouter.ai/settings/credits"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 font-bold text-rose-800 underline hover:bg-white"
              >
                OpenRouter Kredi Sayfası
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsView({
  settings,
  onSaveSettings,
  onResetAllData,
}: SettingsViewProps) {
  // Gemini state
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(() => normalizeGeminiModel(settings.model));
  const [modelOptions, setModelOptions] = useState<GeminiModelOption[]>(GEMINI_MODEL_OPTIONS);
  const [loadingGeminiModels, setLoadingGeminiModels] = useState(false);
  const [geminiModelsNotice, setGeminiModelsNotice] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<TestResultState>(null);

  // OpenRouter (Qwen & DeepSeek) state
  const [openRouterApiKey, setOpenRouterApiKey] = useState(settings.openRouterApiKey);
  const [qwenModel, setQwenModel] = useState(() =>
    normalizeOpenRouterModel(settings.qwenModel, 'qwen'),
  );
  const [deepseekModel, setDeepseekModel] = useState(() =>
    normalizeOpenRouterModel(settings.deepseekModel, 'deepseek'),
  );
  const [qwenOptions, setQwenOptions] = useState<EngineModelOption[]>(QWEN_MODEL_OPTIONS);
  const [deepseekOptions, setDeepseekOptions] =
    useState<EngineModelOption[]>(DEEPSEEK_MODEL_OPTIONS);
  const [orCatalogInfo, setOrCatalogInfo] = useState<OpenRouterCatalogInfo | null>(null);
  const [loadingOrModels, setLoadingOrModels] = useState(false);
  const [orModelsNotice, setOrModelsNotice] = useState<string | null>(null);
  const [showOrKey, setShowOrKey] = useState(false);
  const [testingQwen, setTestingQwen] = useState(false);
  const [qwenTestResult, setQwenTestResult] = useState<TestResultState>(null);
  const [testingDeepseek, setTestingDeepseek] = useState(false);
  const [deepseekTestResult, setDeepseekTestResult] = useState<TestResultState>(null);

  // Per-agent engines & modes
  const [agentEngines, setAgentEngines] = useState<Record<AgentId, EngineId>>(
    settings.agentEngines,
  );
  const [parallelMode, setParallelMode] = useState(settings.parallelMode);
  const [demoMode, setDemoMode] = useState(settings.demoMode);
  const [savedNotice, setSavedNotice] = useState(false);

  const buildCurrentPayload = useCallback(
    (overrides?: Partial<AppSettings>): AppSettings => ({
      apiKey: apiKey.trim(),
      openRouterApiKey: openRouterApiKey.trim(),
      model: model || DEFAULT_GEMINI_MODEL,
      qwenModel,
      deepseekModel,
      agentEngines,
      parallelMode,
      demoMode,
      sceneTheme: settings.sceneTheme,
      soundEnabled: settings.soundEnabled,
      ...overrides,
    }),
    [
      apiKey,
      openRouterApiKey,
      model,
      qwenModel,
      deepseekModel,
      agentEngines,
      parallelMode,
      demoMode,
      settings.sceneTheme,
      settings.soundEnabled,
    ],
  );

  const handleLoadGeminiModels = useCallback(
    async (keyToUse: string, silent = false) => {
      const trimmed = keyToUse.trim();
      if (!trimmed) {
        if (!silent) {
          setGeminiTestResult({
            ok: false,
            message: 'Modelleri çekmek için önce Gemini API anahtarınızı girin.',
          });
        }
        return;
      }
      setLoadingGeminiModels(true);
      if (!silent) {
        setGeminiModelsNotice(null);
      }
      try {
        const fetched = await fetchAccountGeminiModels(trimmed);
        if (fetched.length > 0) {
          setModelOptions(fetched);
          setModel((current) =>
            fetched.some((m) => m.id === current) ? current : fetched[0].id,
          );
          setGeminiModelsNotice(`Hesabınızdan ${fetched.length} aktif Gemini modeli yüklendi.`);
        } else if (!silent) {
          setGeminiModelsNotice('Hesapta uygun metin üretim modeli bulunamadı.');
        }
      } catch (err) {
        if (!silent) {
          setGeminiTestResult({ ok: false, message: formatGeminiError(err, model) });
        }
      } finally {
        setLoadingGeminiModels(false);
      }
    },
    [model],
  );

  const handleLoadOpenRouterModels = useCallback(async (forceRefresh = false, silent = false) => {
    setLoadingOrModels(true);
    if (!silent) {
      setOrModelsNotice(null);
    }
    try {
      const {
        qwen,
        deepseek,
        freeModels,
        qwenFreeCount,
        deepseekFreeCount,
        qwenPaidCount,
        deepseekPaidCount,
      } = await fetchOpenRouterModelsByFamily(forceRefresh);
      if (qwen.length > 0) {
        setQwenOptions(qwen);
        setQwenModel((current) =>
          qwen.some((m) => m.id === current) ? current : qwen[0].id,
        );
      }
      if (deepseek.length > 0) {
        setDeepseekOptions(deepseek);
        setDeepseekModel((current) =>
          deepseek.some((m) => m.id === current) ? current : deepseek[0].id,
        );
      }
      setOrCatalogInfo({
        freeCount: freeModels.length,
        qwenFreeCount,
        deepseekFreeCount,
        qwenPaidCount,
        deepseekPaidCount,
      });
      if (qwen.length > 0 || deepseek.length > 0) {
        setOrModelsNotice(
          `OpenRouter'dan ${freeModels.length} ücretsiz (:free) + ${qwenPaidCount} Qwen ve ${deepseekPaidCount} DeepSeek modeli yüklendi.`,
        );
      }
    } catch (err) {
      if (!silent) {
        setOrModelsNotice(formatOpenRouterError(err));
      }
    } finally {
      setLoadingOrModels(false);
    }
  }, []);

  useEffect(() => {
    if (settings.apiKey.trim().length >= 20) {
      void handleLoadGeminiModels(settings.apiKey, true);
    }
    void handleLoadOpenRouterModels(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(buildCurrentPayload());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2400);
  };

  const handleTestGemini = async () => {
    if (!apiKey.trim()) {
      setGeminiTestResult({ ok: false, message: 'Lütfen önce bir Gemini API anahtarı girin.' });
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const candidateIds = modelOptions.map((m) => m.id);
      const { reply, usedModel } = await testGeminiConnection(
        apiKey.trim(),
        model,
        candidateIds,
      );
      onSaveSettings(buildCurrentPayload({ model: usedModel }));
      if (usedModel !== model) {
        setModel(usedModel);
        setGeminiTestResult({
          ok: true,
          message: `"${model}" geçici yoğunluk/kota nedeniyle yanıt vermediği için çalışan "${usedModel}" modeline geçildi ve kaydedildi. Yanıt: ${reply}`,
        });
      } else {
        setGeminiTestResult({ ok: true, message: `(${usedModel}) ${reply}` });
      }
    } catch (err) {
      setGeminiTestResult({ ok: false, message: formatGeminiError(err, model) });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestOpenRouter = async (family: 'qwen' | 'deepseek') => {
    if (!openRouterApiKey.trim()) {
      const msg = 'Lütfen önce bir OpenRouter API anahtarı girin.';
      if (family === 'qwen') setQwenTestResult({ ok: false, message: msg });
      else setDeepseekTestResult({ ok: false, message: msg });
      return;
    }

    const isQwen = family === 'qwen';
    const rawCurrentModel = isQwen ? qwenModel : deepseekModel;
    const currentModel = normalizeOpenRouterModel(rawCurrentModel, family);
    if (currentModel !== rawCurrentModel) {
      if (isQwen) setQwenModel(currentModel);
      else setDeepseekModel(currentModel);
    }

    const fallbacks = (isQwen ? qwenOptions : deepseekOptions)
      .filter((opt) => opt.isFree === true)
      .map((opt) => opt.id);

    if (isQwen) {
      setTestingQwen(true);
      setQwenTestResult(null);
    } else {
      setTestingDeepseek(true);
      setDeepseekTestResult(null);
    }

    try {
      const { reply, usedModel } = await testOpenRouterConnection(
        openRouterApiKey.trim(),
        currentModel,
        family,
        fallbacks,
      );

      if (isQwen) {
        setQwenModel(usedModel);
        onSaveSettings(buildCurrentPayload({ qwenModel: usedModel }));
        setQwenTestResult({
          ok: true,
          message:
            usedModel !== currentModel
              ? `"${currentModel}" yerine çalışan "${usedModel}" modeline geçildi ve kaydedildi. Yanıt: ${reply}`
              : `(${usedModel}) ${reply} — Anahtar kaydedildi.`,
        });
      } else {
        setDeepseekModel(usedModel);
        onSaveSettings(buildCurrentPayload({ deepseekModel: usedModel }));
        setDeepseekTestResult({
          ok: true,
          message:
            usedModel !== currentModel
              ? `"${currentModel}" yerine çalışan "${usedModel}" modeline geçildi ve kaydedildi. Yanıt: ${reply}`
              : `(${usedModel}) ${reply} — Anahtar kaydedildi.`,
        });
      }
    } catch (err) {
      const errMsg = formatOpenRouterError(err, currentModel);
      if (isQwen) setQwenTestResult({ ok: false, message: errMsg });
      else setDeepseekTestResult({ ok: false, message: errMsg });
    } finally {
      if (isQwen) setTestingQwen(false);
      else setTestingDeepseek(false);
    }
  };

  const handleChangeAgentEngine = (agentId: AgentId, engineId: EngineId) => {
    setAgentEngines((prev) => ({
      ...prev,
      [agentId]: engineId,
    }));
  };

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* 1) GEMINI OFİSİ CARD */}
      <section className="rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              ✦ Gemini Ofisi (Google AI Studio)
            </h2>
            <p className="text-xs text-slate-500">
              Gemini motoruna atanmış ajanlar (varsayılan: CEO Sauron & İçerikçi) için API anahtarınız.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="gemini-api-key" className="text-xs font-bold text-slate-700">
                Google AI Studio API Anahtarı
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Anahtar Al
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <input
                id="gemini-api-key"
                type={showGeminiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-11 pl-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((prev) => !prev)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                aria-label={showGeminiKey ? 'Gemini anahtarını gizle' : 'Gemini anahtarını göster'}
              >
                {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="gemini-model-select" className="text-xs font-bold text-slate-700">
                Gemini Modeli
              </label>
              <button
                type="button"
                onClick={() => void handleLoadGeminiModels(apiKey, false)}
                disabled={loadingGeminiModels || !apiKey.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingGeminiModels ? 'animate-spin' : ''}`} />
                {loadingGeminiModels ? 'Yükleniyor...' : 'Hesaptaki Modelleri Getir'}
              </button>
            </div>
            <div className="flex gap-2">
              <select
                id="gemini-model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              >
                {!modelOptions.some((opt) => opt.id === model) && (
                  <option value={model}>{model}</option>
                )}
                {modelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini || !apiKey.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
              >
                {testingGemini ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Gemini Test Et
              </button>
            </div>
          </div>
        </div>

        {geminiModelsNotice && (
          <p className="mt-2 text-[11px] font-medium text-emerald-700">{geminiModelsNotice}</p>
        )}

        {geminiTestResult && (
          <div
            className={`mt-3 flex items-start gap-2 overflow-hidden rounded-xl border p-3 text-xs ${
              geminiTestResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {geminiTestResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            )}
            <p className="min-w-0 flex-1 break-words leading-relaxed">
              {geminiTestResult.message}
            </p>
          </div>
        )}
      </section>

      {/* 2) OPENROUTER — QWEN & DEEPSEEK OFİSLERİ CARD */}
      <section className="rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                ◈ Qwen & ⌘ DeepSeek Ofisleri (OpenRouter)
              </h2>
              <p className="text-xs text-slate-500">
                Tek OpenRouter anahtarı ile hem Qwen Stüdyosu hem DeepSeek Lab doğrudan tarayıcıdan çalışır.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLoadOpenRouterModels(true, false)}
            disabled={loadingOrModels}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingOrModels ? 'animate-spin' : ''}`} />
            {loadingOrModels ? 'Yükleniyor...' : 'OpenRouter Modellerini Çek'}
          </button>
        </div>

        {/* OpenRouter Key Input */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="openrouter-api-key" className="text-xs font-bold text-slate-700">
              OpenRouter API Anahtarı
            </label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:underline"
            >
              Anahtar Al (openrouter.ai)
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="relative">
            <input
              id="openrouter-api-key"
              type={showOrKey ? 'text' : 'password'}
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-or-v1-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-11 pl-3.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowOrKey((prev) => !prev)}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
              aria-label={showOrKey ? 'OpenRouter anahtarını gizle' : 'OpenRouter anahtarını göster'}
            >
              {showOrKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Anahtarlarınız yalnızca tarayıcınızın <code className="rounded bg-slate-100 px-1">localStorage</code> alanında saklanır. Ücretsiz (<code className="rounded bg-slate-100 px-1">:free</code>) modellerde{' '}
              <a
                href="https://openrouter.ai/settings/privacy"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-violet-700 underline decoration-violet-300 hover:text-violet-900"
              >
                OpenRouter gizlilik ayarı
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{' '}
              izni gerekebilir.
            </span>
          </p>
        </div>

        {orModelsNotice && (
          <p className="mt-2 text-[11px] font-medium text-violet-700">{orModelsNotice}</p>
        )}

        {orCatalogInfo &&
          orCatalogInfo.qwenFreeCount === 0 &&
          orCatalogInfo.deepseekFreeCount === 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/75 p-3 text-[11px] leading-relaxed text-amber-950">
              <p className="font-bold">
                Bilgi: Resmi Qwen ve DeepSeek modelleri şu an OpenRouter&apos;da yalnızca kredili (~$0.03/1M token&apos;dan başlayan) olarak sunuluyor.
              </p>
              <p className="mt-1 text-amber-900/90">
                Bakiyeniz $0 iken hemen test edebilmeniz için listenin en üstüne güncel ücretsiz (<code className="rounded bg-amber-100 px-1">:free</code>) modeller yerleştirildi. Ücretsiz modeller için{' '}
                <a
                  href="https://openrouter.ai/settings/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-bold text-amber-900 underline"
                >
                  Gizlilik Ayarı
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                &apos;nı açabilir, doğrudan Qwen/DeepSeek modelleri için{' '}
                <a
                  href="https://openrouter.ai/settings/credits"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-bold text-amber-900 underline"
                >
                  Kredi Ekle
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>{' '}
                sayfasını kullanabilirsiniz.
              </p>
            </div>
          )}

        {/* Qwen & DeepSeek Model Selectors */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Qwen */}
          <div className="rounded-xl border border-violet-100 bg-violet-50/35 p-3.5">
            <label htmlFor="qwen-model-select" className="mb-1.5 block text-xs font-extrabold text-violet-900">
              ◈ Qwen Stüdyosu Modeli
            </label>
            <select
              id="qwen-model-select"
              value={qwenModel}
              onChange={(e) => setQwenModel(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"
            >
              {!qwenOptions.some((opt) => opt.id === qwenModel) && (
                <option value={qwenModel}>{qwenModel}</option>
              )}
              {qwenOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-violet-700/80">Örn: Araştırmacı ajan</span>
              <button
                type="button"
                onClick={() => void handleTestOpenRouter('qwen')}
                disabled={testingQwen || !openRouterApiKey.trim()}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
              >
                {testingQwen ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Qwen Test Et
              </button>
            </div>
            <OpenRouterTestAlert result={qwenTestResult} />
          </div>

          {/* DeepSeek */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5">
            <label htmlFor="deepseek-model-select" className="mb-1.5 block text-xs font-extrabold text-sky-900">
              ⌘ DeepSeek Lab Modeli
            </label>
            <select
              id="deepseek-model-select"
              value={deepseekModel}
              onChange={(e) => setDeepseekModel(e.target.value)}
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              {!deepseekOptions.some((opt) => opt.id === deepseekModel) && (
                <option value={deepseekModel}>{deepseekModel}</option>
              )}
              {deepseekOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-sky-700/80">Örn: Yazılımcı & Siberci</span>
              <button
                type="button"
                onClick={() => void handleTestOpenRouter('deepseek')}
                disabled={testingDeepseek || !openRouterApiKey.trim()}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
              >
                {testingDeepseek ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                DeepSeek Test Et
              </button>
            </div>
            <OpenRouterTestAlert result={deepseekTestResult} />
          </div>
        </div>
      </section>

      {/* 3) AJAN -> OFİS / AI MOTORU ATAMASI CARD */}
      <section className="rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Ajan → Ofis / AI Motoru Ataması
            </h2>
            <p className="text-xs text-slate-500">
              Hangi ajanın hangi AI motoruyla çalışacağını dilediğiniz gibi seçin.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {AGENT_ORDER.map((id) => {
            const ag = AGENTS[id];
            const selectedEngine = agentEngines[id];
            return (
              <div
                key={id}
                className="flex flex-col justify-between gap-2.5 rounded-xl border p-3.5"
                style={{ borderColor: ag.borderColor, backgroundColor: '#fcfbf9' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: ag.color }}
                    >
                      {ag.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs font-extrabold text-slate-900">{ag.name}</p>
                        {ag.locked && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-800">
                            <Lock className="h-2.5 w-2.5" />
                            Kilitli CEO
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500">{ag.role}</p>
                      {ag.locked && (
                        <p className="mt-0.5 text-[10px] font-medium text-orange-700/80">
                          Yönetici kimliği (Sauron) kalıcı olarak kilitlidir — yalnızca kullandığı
                          AI motoru değiştirilebilir.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {ENGINE_ORDER.map((engId) => {
                    const eng = ENGINE_META[engId];
                    const active = selectedEngine === engId;
                    return (
                      <button
                        key={engId}
                        type="button"
                        onClick={() => handleChangeAgentEngine(id, engId)}
                        className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition ${
                          active
                            ? 'text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        style={
                          active
                            ? { backgroundColor: eng.color, borderColor: eng.color }
                            : undefined
                        }
                      >
                        <span>{eng.badgeSymbol}</span>
                        <span>{eng.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4) ÇALIŞMA & DEMO MODLARI + KAYDET CARD */}
      <section className="rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Çalışma & Demo Modları</h2>
            <p className="text-xs text-slate-500">
              Ofis kanatlarının eşzamanlı çalışma düzenini ve simülasyon modunu yönetin.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Parallel Mode Toggle */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <Zap className="h-4 w-4 text-indigo-600" />
                Paralel Çoklu Ofis Modu
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-900/80">
                Açıkken Gemini, Qwen ve DeepSeek ofisleri aynı anda çalışır. Kapalıyken ajanlar
                sırayla birbirinin çıktısını devralarak ilerler.
              </p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={parallelMode}
                onChange={(e) => setParallelMode(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {/* Demo Mode Toggle */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <Sparkles className="h-4 w-4 text-amber-600" />
                Demo Modu (API Anahtarsız Simülasyon)
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900/80">
                API anahtarınız yoksa veya 3 kanatlı kampüsü hızlıca denemek istiyorsanız
                açabilirsiniz. Gerçek yanıtlar için kapalı tutun.
              </p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-amber-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-xs after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>

        {/* Save Action */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            Ayarları Kaydet
          </button>

          {savedNotice && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Tüm çoklu ofis ayarları kaydedildi!
            </span>
          )}
        </div>
      </section>

      {/* Danger / Reset Box */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3d9c8] bg-white p-5 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Yerel Verileri Sıfırla</h3>
          <p className="text-xs text-slate-500">
            Kayıtlı görev geçmişini, sohbeti ve pano çıktılarını temizler (API anahtarlarınız korunur).
          </p>
        </div>
        <button
          type="button"
          onClick={onResetAllData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          <Trash2 className="h-4 w-4" />
          Çıktıları Sıfırla
        </button>
      </div>
    </form>
  );
}
