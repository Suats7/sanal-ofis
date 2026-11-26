import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENTS, SAURON_AUTO_MISSIONS } from './constants/agents';
import { assertSauronIntegrity } from './constants/ceoLock';
import { ENGINE_META, normalizeAppSettings } from './constants/engines';
import {
  DEFAULT_GEMINI_MODEL,
  generateDemoAgentResponse,
  generateDemoPlan,
  normalizeGeminiModel,
} from './services/geminiService';
import {
  formatMultiEngineError,
  generateCeoMissionWithSauron,
  planTaskWithAgentEngine,
  resolveAgentEngine,
  runSpecialistWithAgentEngine,
} from './services/aiService';
import {
  playAgentCompleteSound,
  playCeoLaunchSound,
  playLevelUpSound,
  playThemeSwitchSound,
} from './services/soundService';
import {
  createInitialProgression,
  getAgentLevelInfo,
  getAgentXpReward,
  getOfficeTierInfo,
  summarizeMemoryEntry,
  XP_REWARDS,
} from './constants/progression';
import type {
  ActiveTab,
  AgentId,
  AgentOutputItem,
  AgentRuntimeState,
  AppSettings,
  ChatMessage,
  EngineId,
  OfficeLevel,
  ProgressionState,
  SceneTheme,
  TaskRun,
} from './types';
import { Navbar } from './components/Navbar';
import { OfficeScene } from './components/office/OfficeScene';
import { ChatPanel, type ChatTargetSelection } from './components/ChatPanel';
import { BoardView } from './components/BoardView';
import { SettingsView } from './components/SettingsView';
import { ProgressionModal } from './components/ProgressionModal';

const STORAGE_KEYS = {
  settings: 'sanal_ofis_settings_v1',
  outputs: 'sanal_ofis_outputs_v1',
  tasks: 'sanal_ofis_tasks_v1',
  messages: 'sanal_ofis_messages_v1',
  progression: 'sanal_ofis_progression_v1',
};

function createInitialAgentStates(): Record<AgentId, AgentRuntimeState> {
  return {
    sef: { id: 'sef', activity: 'idle', statusText: 'Boşta' },
    arastirmaci: { id: 'arastirmaci', activity: 'idle', statusText: 'Boşta' },
    icerikci: { id: 'icerikci', activity: 'idle', statusText: 'Boşta' },
    yazilimci: { id: 'yazilimci', activity: 'idle', statusText: 'Boşta' },
    siberci: { id: 'siberci', activity: 'idle', statusText: 'Boşta' },
  };
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ofis');
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadFromStorage<Partial<AppSettings>>(STORAGE_KEYS.settings, {});
    const normalized = normalizeAppSettings(loaded, DEFAULT_GEMINI_MODEL);
    return {
      ...normalized,
      model: normalizeGeminiModel(normalized.model),
    };
  });

  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentRuntimeState>>(
    createInitialAgentStates,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadFromStorage<ChatMessage[]>(STORAGE_KEYS.messages, []),
  );
  const [outputs, setOutputs] = useState<AgentOutputItem[]>(() =>
    loadFromStorage<AgentOutputItem[]>(STORAGE_KEYS.outputs, []),
  );
  const [tasks, setTasks] = useState<TaskRun[]>(() =>
    loadFromStorage<TaskRun[]>(STORAGE_KEYS.tasks, []),
  );
  const [progression, setProgression] = useState<ProgressionState>(() => {
    const fallback = createInitialProgression();
    const loaded = loadFromStorage<Partial<ProgressionState>>(
      STORAGE_KEYS.progression,
      fallback,
    );
    return {
      officeXp: typeof loaded?.officeXp === 'number' ? loaded.officeXp : fallback.officeXp,
      totalTasksCompleted:
        typeof loaded?.totalTasksCompleted === 'number'
          ? loaded.totalTasksCompleted
          : fallback.totalTasksCompleted,
      agents: {
        sef: loaded?.agents?.sef ?? fallback.agents.sef,
        arastirmaci: loaded?.agents?.arastirmaci ?? fallback.agents.arastirmaci,
        icerikci: loaded?.agents?.icerikci ?? fallback.agents.icerikci,
        yazilimci: loaded?.agents?.yazilimci ?? fallback.agents.yazilimci,
        siberci: loaded?.agents?.siberci ?? fallback.agents.siberci,
      },
    };
  });
  const [previewOfficeLevel, setPreviewOfficeLevel] = useState<OfficeLevel | null>(null);
  const [isProgressionOpen, setIsProgressionOpen] = useState(false);
  const [levelUpNotice, setLevelUpNotice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [demoMissionIndex, setDemoMissionIndex] = useState(0);
  const soundEnabledRef = useRef(settings.soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = settings.soundEnabled;
  }, [settings.soundEnabled]);

  useEffect(() => {
    if (!assertSauronIntegrity(AGENTS.sef)) {
      throw new Error('CEO Sauron kimlik bütünlüğü doğrulaması başarısız.');
    }
  }, []);

  const showLevelUpNotice = useCallback((message: string) => {
    playLevelUpSound(soundEnabledRef.current);
    setLevelUpNotice(message);
    window.setTimeout(() => {
      setLevelUpNotice((current) => (current === message ? null : current));
    }, 4500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages.slice(-60)));
    } catch {
      // Ignore
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.outputs, JSON.stringify(outputs.slice(0, 60)));
    } catch {
      // Ignore
    }
  }, [outputs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks.slice(0, 30)));
    } catch {
      // Ignore
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.progression, JSON.stringify(progression));
    } catch {
      // Ignore
    }
  }, [progression]);

  const awardAgentProgress = useCallback(
    (agentId: AgentId, memoryEntry: string, isTaskFinalBonus = false) => {
      const xpGain = getAgentXpReward(agentId);
      const officeGain = xpGain + (isTaskFinalBonus ? XP_REWARDS.taskCompletionBonus : 0);

      setProgression((prev) => {
        const prevAgent = prev.agents[agentId];
        const prevAgentLevel = getAgentLevelInfo(prevAgent.xp).level;
        const prevOfficeLevel = getOfficeTierInfo(prev.officeXp).level;

        const nextAgentXp = prevAgent.xp + xpGain;
        const nextOfficeXp = prev.officeXp + officeGain;
        const nextAgentLevel = getAgentLevelInfo(nextAgentXp).level;
        const nextOfficeTier = getOfficeTierInfo(nextOfficeXp);

        if (nextOfficeTier.level > prevOfficeLevel) {
          setPreviewOfficeLevel(null);
          showLevelUpNotice(
            `Ofis Sv.${nextOfficeTier.level} oldu: ${nextOfficeTier.name} açıldı!`,
          );
        } else if (nextAgentLevel > prevAgentLevel) {
          const info = getAgentLevelInfo(nextAgentXp);
          showLevelUpNotice(
            `${AGENTS[agentId].name} Sv.${info.level} (${info.title}) seviyesine yükseldi!`,
          );
        }

        const dedupedMemories = [
          memoryEntry,
          ...prevAgent.memories.filter((m) => m !== memoryEntry),
        ].slice(0, 6);

        return {
          officeXp: nextOfficeXp,
          totalTasksCompleted: prev.totalTasksCompleted + (isTaskFinalBonus ? 1 : 0),
          agents: {
            ...prev.agents,
            [agentId]: {
              xp: nextAgentXp,
              tasksCompleted: prevAgent.tasksCompleted + 1,
              memories: dedupedMemories,
            },
          },
        };
      });
    },
    [showLevelUpNotice],
  );

  const handleAddBonusXp = () => {
    setProgression((prev) => {
      const prevOfficeLevel = getOfficeTierInfo(prev.officeXp).level;
      const nextOfficeXp = prev.officeXp + 150;
      const nextOfficeTier = getOfficeTierInfo(nextOfficeXp);
      if (nextOfficeTier.level > prevOfficeLevel) {
        setPreviewOfficeLevel(null);
        showLevelUpNotice(
          `Ofis Sv.${nextOfficeTier.level} oldu: ${nextOfficeTier.name} açıldı!`,
        );
      }
      return {
        ...prev,
        officeXp: nextOfficeXp,
        agents: {
          sef: { ...prev.agents.sef, xp: prev.agents.sef.xp + 45 },
          arastirmaci: { ...prev.agents.arastirmaci, xp: prev.agents.arastirmaci.xp + 45 },
          icerikci: { ...prev.agents.icerikci, xp: prev.agents.icerikci.xp + 45 },
          yazilimci: { ...prev.agents.yazilimci, xp: prev.agents.yazilimci.xp + 45 },
          siberci: { ...prev.agents.siberci, xp: prev.agents.siberci.xp + 45 },
        },
      };
    });
  };

  const setAgentState = useCallback(
    (id: AgentId, patch: Partial<AgentRuntimeState>) => {
      setAgentStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...patch },
      }));
    },
    [],
  );

  const resetAllAgentsToIdle = useCallback(() => {
    setAgentStates(createInitialAgentStates());
  }, []);

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
  };

  const handleEnableDemoMode = () => {
    setSettings((prev) => ({ ...prev, demoMode: true }));
  };

  const handleChangeSceneTheme = (sceneTheme: SceneTheme) => {
    playThemeSwitchSound(settings.soundEnabled);
    setSettings((prev) => ({ ...prev, sceneTheme }));
  };

  const handleToggleSound = () => {
    setSettings((prev) => {
      const next = !prev.soundEnabled;
      if (next) {
        playThemeSwitchSound(true);
      }
      return { ...prev, soundEnabled: next };
    });
  };

  const handleClearChat = () => {
    if (isRunning) return;
    setMessages([]);
  };

  const handleClearOutputs = () => {
    if (isRunning) return;
    setOutputs([]);
    setTasks([]);
  };

  const handleResetAllData = () => {
    if (isRunning) return;
    setMessages([]);
    setOutputs([]);
    setTasks([]);
    setProgression(createInitialProgression());
    setPreviewOfficeLevel(null);
  };

  const handleSubmitTask = async (
    userPrompt: string,
    targetAgent: ChatTargetSelection = 'team',
  ) => {
    const hasAnyKey = Boolean(settings.apiKey.trim() || settings.openRouterApiKey.trim());
    const useDemo = settings.demoMode || !hasAnyKey;

    if (!hasAnyKey && !settings.demoMode) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeUniqueId('sys'),
          sender: 'system',
          text: 'Görev başlatmak için önce Ayarlar sekmesinden Gemini ve/veya OpenRouter (Qwen & DeepSeek) API anahtarınızı kaydedin ya da "Demo Modunda Dene" butonuna tıklayın.',
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setIsRunning(true);
    const taskId = makeUniqueId('task');
    const now = new Date().toISOString();
    const initialActiveAgent: AgentId = targetAgent === 'team' ? 'sef' : targetAgent;

    const newTask: TaskRun = {
      id: taskId,
      prompt: userPrompt,
      createdAt: now,
      status: 'running',
      completedAgents: [],
      activeAgent: initialActiveAgent,
      activeAgents: [initialActiveAgent],
      isDemo: useDemo,
    };

    setTasks((prev) => [newTask, ...prev]);
    setMessages((prev) => [
      ...prev,
      {
        id: makeUniqueId('user'),
        sender: 'user',
        text: targetAgent === 'team' ? userPrompt : `@${AGENTS[targetAgent].name} ${userPrompt}`,
        createdAt: now,
        taskId,
      },
    ]);

    const updateTask = (updater: (task: TaskRun) => TaskRun) => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updater(t) : t)));
    };

    let currentErrorContext: { engineId: EngineId; model: string } = {
      engineId: settings.agentEngines[initialActiveAgent],
      model: settings.model,
    };

    const persistWorkingGeminiModel = (engineUsed: EngineId, modelUsed: string) => {
      if (!useDemo && engineUsed === 'gemini' && modelUsed) {
        setSettings((prev) =>
          prev.model !== modelUsed ? { ...prev, model: modelUsed } : prev,
        );
      }
    };

    try {
      // DIRECT 1-ON-1 SPECIALIST MODE
      if (targetAgent !== 'team') {
        const directAgent = AGENTS[targetAgent];
        if (!useDemo) {
          const resolved = resolveAgentEngine(settings, targetAgent);
          currentErrorContext = { engineId: resolved.engineId, model: resolved.model };
        }

        setAgentState(targetAgent, {
          activity: 'walking_to_desk',
          statusText: 'Masasına Geçiyor...',
        });
        await wait(950);

        setAgentState(targetAgent, {
          activity: 'working',
          statusText: directAgent.workingLabel,
        });

        const directRes = useDemo
          ? await (async () => {
              await wait(1650);
              return {
                text: generateDemoAgentResponse(targetAgent, userPrompt),
                engineUsed: settings.agentEngines[targetAgent],
                modelUsed: 'Demo Modu',
                fallbackNote: undefined as string | undefined,
              };
            })()
          : await runSpecialistWithAgentEngine(
              settings,
              targetAgent,
              userPrompt,
              userPrompt,
              [],
              progression.agents[targetAgent],
            );

        persistWorkingGeminiModel(directRes.engineUsed, directRes.modelUsed);

        const directMarkdown = directRes.fallbackNote
          ? `${directRes.text}\n\n*Not: ${directRes.fallbackNote}*`
          : directRes.text;
        const doneTime = new Date().toISOString();

        setMessages((prev) => [
          ...prev,
          {
            id: makeUniqueId(`msg-${targetAgent}`),
            sender: targetAgent,
            title: `Doğrudan ${directAgent.name} Yanıtı`,
            text: directMarkdown,
            createdAt: doneTime,
            taskId,
            isDemo: useDemo,
            engineId: directRes.engineUsed,
            modelUsed: directRes.modelUsed,
          },
        ]);

        setOutputs((prev) => [
          {
            id: makeUniqueId(`out-${targetAgent}`),
            taskId,
            userPrompt,
            agentId: targetAgent,
            title: `Doğrudan ${directAgent.shortRole} Çıktısı`,
            content: directMarkdown,
            createdAt: doneTime,
            isDemo: useDemo,
            engineId: directRes.engineUsed,
            modelUsed: directRes.modelUsed,
          },
          ...prev,
        ]);

        updateTask((t) => ({
          ...t,
          status: 'completed',
          completedAgents: [targetAgent],
          activeAgent: undefined,
          activeAgents: [],
        }));

        awardAgentProgress(
          targetAgent,
          summarizeMemoryEntry(userPrompt, directAgent.shortRole),
          true,
        );
        playAgentCompleteSound(soundEnabledRef.current, targetAgent === 'siberci');

        setAgentState(targetAgent, {
          activity: 'completed',
          statusText: `Tamamlandı +${XP_REWARDS.specialistStep} XP`,
        });
        await wait(1000);
        setAgentState(targetAgent, {
          activity: 'idle',
          statusText: 'Boşta',
        });
        return;
      }

      // TEAM MODE: 1. CEO Sauron masasına geçer ve görevi analiz eder
      if (!useDemo) {
        const resolvedChef = resolveAgentEngine(settings, 'sef');
        currentErrorContext = { engineId: resolvedChef.engineId, model: resolvedChef.model };
      }

      setAgentState('sef', {
        activity: 'walking_to_desk',
        statusText: 'Masasına Geçiyor...',
      });
      await wait(1050);

      setAgentState('sef', {
        activity: 'working',
        statusText: 'Görevi Analiz Ediyor...',
      });

      const chefResult = useDemo
        ? await (async () => {
            await wait(1350);
            return {
              plan: generateDemoPlan(userPrompt),
              engineUsed: settings.agentEngines.sef,
              modelUsed: 'Demo Modu',
              fallbackNote: undefined as string | undefined,
            };
          })()
        : await planTaskWithAgentEngine(settings, userPrompt, progression.agents.sef);

      const { plan, engineUsed: chefEngine, modelUsed: chefModel, fallbackNote: chefFallback } =
        chefResult;
      persistWorkingGeminiModel(chefEngine, chefModel);

      const planMarkdown = `### 📋 Görev Analizi ve İş Dağılımı

${plan.summary}

${plan.steps
  .map((s, i) => {
    const stepEng = ENGINE_META[settings.agentEngines[s.agentId]];
    return `${i + 1}. **${AGENTS[s.agentId].name} (${AGENTS[s.agentId].shortRole} • ${stepEng.badgeSymbol} ${stepEng.shortName}):** ${s.subtask}  \n   *Gerekçe:* ${s.reason}`;
  })
  .join('\n')}${chefFallback ? `\n\n*Not: ${chefFallback}*` : ''}`;

      const planTime = new Date().toISOString();
      updateTask((t) => ({
        ...t,
        plan,
        completedAgents: ['sef'],
        activeAgent: undefined,
        activeAgents: [],
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: makeUniqueId('msg-sef'),
          sender: 'sef',
          title: 'CEO Sauron — Görev Planı & Dağıtım',
          text: planMarkdown,
          createdAt: planTime,
          taskId,
          isDemo: useDemo,
          engineId: chefEngine,
          modelUsed: chefModel,
        },
      ]);

      setOutputs((prev) => [
        {
          id: makeUniqueId('out-sef'),
          taskId,
          userPrompt,
          agentId: 'sef',
          title: 'CEO Sauron — Görev Planı & Dağıtım',
          content: planMarkdown,
          createdAt: planTime,
          isDemo: useDemo,
          engineId: chefEngine,
          modelUsed: chefModel,
        },
        ...prev,
      ]);

      awardAgentProgress('sef', summarizeMemoryEntry(userPrompt, 'CEO Planlama'), false);
      playCeoLaunchSound(soundEnabledRef.current);

      setAgentState('sef', {
        activity: 'completed',
        statusText: `CEO Planı Dağıttı +${XP_REWARDS.sefPlan} XP`,
      });
      await wait(850);
      setAgentState('sef', {
        activity: 'idle',
        statusText: 'Boşta',
      });

      // 2. Uzman ofisler çalışır: Paralel Çoklu Ofis Modu veya Sıralı Zincir Modu
      const runParallel = settings.parallelMode && plan.steps.length > 1;

      if (runParallel) {
        const stepAgents = plan.steps.map((s) => s.agentId);
        updateTask((t) => ({
          ...t,
          activeAgent: stepAgents[0],
          activeAgents: stepAgents,
        }));

        let finishedSuccessCount = 0;
        const failedDetails: string[] = [];
        const geminiSpecialistCount = useDemo
          ? 0
          : plan.steps.filter((s) => {
              try {
                return resolveAgentEngine(settings, s.agentId).engineId === 'gemini';
              } catch {
                return false;
              }
            }).length;

        const settled = await Promise.allSettled(
          plan.steps.map(async (step, idx) => {
            const agent = AGENTS[step.agentId];
            let stepEngine: EngineId = settings.agentEngines[step.agentId];
            let stepModel = '';

            if (!useDemo) {
              const resolved = resolveAgentEngine(settings, step.agentId);
              stepEngine = resolved.engineId;
              stepModel = resolved.model;
            }

            try {
              setAgentState(step.agentId, {
                activity: 'walking_to_desk',
                statusText: 'Masasına Geçiyor...',
              });
              await wait(!useDemo && geminiSpecialistCount > 1 ? 950 + idx * 550 : 950 + idx * 180);

              setAgentState(step.agentId, {
                activity: 'working',
                statusText: agent.workingLabel,
              });

              const stepRes = useDemo
                ? await (async () => {
                    await wait(1700 + idx * 650);
                    return {
                      text: generateDemoAgentResponse(step.agentId, userPrompt),
                      engineUsed: settings.agentEngines[step.agentId],
                      modelUsed: 'Demo Modu',
                      fallbackNote: undefined as string | undefined,
                    };
                  })()
                : await runSpecialistWithAgentEngine(
                    settings,
                    step.agentId,
                    userPrompt,
                    step.subtask,
                    [],
                    progression.agents[step.agentId],
                  );
              persistWorkingGeminiModel(stepRes.engineUsed, stepRes.modelUsed);

              const finalMarkdown = stepRes.fallbackNote
                ? `${stepRes.text}\n\n*Not: ${stepRes.fallbackNote}*`
                : stepRes.text;

              const stepTime = new Date().toISOString();

              setMessages((prev) => [
                ...prev,
                {
                  id: makeUniqueId(`msg-${step.agentId}`),
                  sender: step.agentId,
                  title:
                    step.subtask.length > 70
                      ? `${step.subtask.slice(0, 67)}...`
                      : step.subtask,
                  text: finalMarkdown,
                  createdAt: stepTime,
                  taskId,
                  isDemo: useDemo,
                  engineId: stepRes.engineUsed,
                  modelUsed: stepRes.modelUsed,
                },
              ]);

              setOutputs((prev) => [
                {
                  id: makeUniqueId(`out-${step.agentId}`),
                  taskId,
                  userPrompt,
                  agentId: step.agentId,
                  title: `${agent.shortRole} Çıktısı`,
                  content: finalMarkdown,
                  createdAt: stepTime,
                  isDemo: useDemo,
                  engineId: stepRes.engineUsed,
                  modelUsed: stepRes.modelUsed,
                },
                ...prev,
              ]);

              updateTask((t) => {
                const nextActive = (t.activeAgents ?? []).filter((id) => id !== step.agentId);
                return {
                  ...t,
                  completedAgents: [...t.completedAgents, step.agentId],
                  activeAgents: nextActive,
                  activeAgent: nextActive[0],
                };
              });

              finishedSuccessCount += 1;
              const isTaskCompleteBonus =
                finishedSuccessCount === plan.steps.length && failedDetails.length === 0;

              awardAgentProgress(
                step.agentId,
                summarizeMemoryEntry(userPrompt, agent.shortRole),
                isTaskCompleteBonus,
              );
              playAgentCompleteSound(soundEnabledRef.current, step.agentId === 'siberci');

              setAgentState(step.agentId, {
                activity: 'completed',
                statusText: `Tamamlandı +${XP_REWARDS.specialistStep} XP`,
              });
              await wait(1000);
              setAgentState(step.agentId, {
                activity: 'idle',
                statusText: 'Boşta',
              });
            } catch (stepErr) {
              const formatted = formatMultiEngineError(stepErr, stepEngine, stepModel);
              const detail = `${agent.name} (${ENGINE_META[stepEngine].name}): ${formatted}`;
              failedDetails.push(detail);

              updateTask((t) => {
                const nextActive = (t.activeAgents ?? []).filter((id) => id !== step.agentId);
                return {
                  ...t,
                  activeAgents: nextActive,
                  activeAgent: nextActive[0],
                };
              });

              setMessages((prev) => [
                ...prev,
                {
                  id: makeUniqueId(`err-${step.agentId}`),
                  sender: 'system',
                  text: detail,
                  createdAt: new Date().toISOString(),
                  taskId,
                },
              ]);

              setAgentState(step.agentId, {
                activity: 'idle',
                statusText: 'Boşta',
              });
              throw stepErr;
            }
          }),
        );

        const anySucceeded = settled.some((r) => r.status === 'fulfilled');
        updateTask((t) => ({
          ...t,
          status: anySucceeded ? 'completed' : 'error',
          activeAgent: undefined,
          activeAgents: [],
          ...(failedDetails.length > 0 ? { errorMessage: failedDetails.join(' | ') } : {}),
        }));
      } else {
        const accumulatedOutputs: { agentId: AgentId; content: string }[] = [];

        for (const step of plan.steps) {
          const agent = AGENTS[step.agentId];
          if (!useDemo) {
            const resolved = resolveAgentEngine(settings, step.agentId);
            currentErrorContext = { engineId: resolved.engineId, model: resolved.model };
          }

          updateTask((t) => ({
            ...t,
            activeAgent: step.agentId,
            activeAgents: [step.agentId],
          }));

          setAgentState(step.agentId, {
            activity: 'walking_to_desk',
            statusText: 'Masasına Geçiyor...',
          });
          await wait(1050);

          setAgentState(step.agentId, {
            activity: 'working',
            statusText: agent.workingLabel,
          });

          const stepRes = useDemo
            ? await (async () => {
                await wait(1900);
                return {
                  text: generateDemoAgentResponse(step.agentId, userPrompt),
                  engineUsed: settings.agentEngines[step.agentId],
                  modelUsed: 'Demo Modu',
                  fallbackNote: undefined as string | undefined,
                };
              })()
            : await runSpecialistWithAgentEngine(
                settings,
                step.agentId,
                userPrompt,
                step.subtask,
                accumulatedOutputs,
                progression.agents[step.agentId],
              );

          persistWorkingGeminiModel(stepRes.engineUsed, stepRes.modelUsed);

          const finalMarkdown = stepRes.fallbackNote
            ? `${stepRes.text}\n\n*Not: ${stepRes.fallbackNote}*`
            : stepRes.text;

          accumulatedOutputs.push({ agentId: step.agentId, content: finalMarkdown });
          const stepTime = new Date().toISOString();

          setMessages((prev) => [
            ...prev,
            {
              id: makeUniqueId(`msg-${step.agentId}`),
              sender: step.agentId,
              title:
                step.subtask.length > 70
                  ? `${step.subtask.slice(0, 67)}...`
                  : step.subtask,
              text: finalMarkdown,
              createdAt: stepTime,
              taskId,
              isDemo: useDemo,
              engineId: stepRes.engineUsed,
              modelUsed: stepRes.modelUsed,
            },
          ]);

          setOutputs((prev) => [
            {
              id: makeUniqueId(`out-${step.agentId}`),
              taskId,
              userPrompt,
              agentId: step.agentId,
              title: `${agent.shortRole} Çıktısı`,
              content: finalMarkdown,
              createdAt: stepTime,
              isDemo: useDemo,
              engineId: stepRes.engineUsed,
              modelUsed: stepRes.modelUsed,
            },
            ...prev,
          ]);

          updateTask((t) => ({
            ...t,
            completedAgents: [...t.completedAgents, step.agentId],
          }));

          const isLastStep = step === plan.steps[plan.steps.length - 1];
          awardAgentProgress(
            step.agentId,
            summarizeMemoryEntry(userPrompt, agent.shortRole),
            isLastStep,
          );
          playAgentCompleteSound(soundEnabledRef.current, step.agentId === 'siberci');

          setAgentState(step.agentId, {
            activity: 'completed',
            statusText: `Tamamlandı +${XP_REWARDS.specialistStep} XP`,
          });
          await wait(1000);

          setAgentState(step.agentId, {
            activity: 'idle',
            statusText: 'Boşta',
          });
        }

        updateTask((t) => ({
          ...t,
          status: 'completed',
          activeAgent: undefined,
          activeAgents: [],
        }));
      }
    } catch (error) {
      const errorMessage = formatMultiEngineError(
        error,
        currentErrorContext.engineId,
        currentErrorContext.model,
      );

      updateTask((t) => ({
        ...t,
        status: 'error',
        activeAgent: undefined,
        activeAgents: [],
        errorMessage,
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: makeUniqueId('err'),
          sender: 'system',
          text: `Hata oluştu: ${errorMessage}`,
          createdAt: new Date().toISOString(),
          taskId,
        },
      ]);
      resetAllAgentsToIdle();
    } finally {
      setIsRunning(false);
    }
  };

  const handleSauronAutoTask = async () => {
    if (isRunning || isGeneratingMission) return;

    const hasAnyKey = Boolean(settings.apiKey.trim() || settings.openRouterApiKey.trim());
    const useDemo = settings.demoMode || !hasAnyKey;

    if (!hasAnyKey && !settings.demoMode) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeUniqueId('sys'),
          sender: 'system',
          text: 'CEO Sauron’un görev üretip ekibi çalıştırması için önce Ayarlar’dan Gemini ve/veya OpenRouter API anahtarı ekleyin ya da "Demo Modunda Dene" butonuna tıklayın.',
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setIsGeneratingMission(true);
    let generatedMission = '';
    try {
      if (useDemo) {
        await wait(450);
        generatedMission = SAURON_AUTO_MISSIONS[demoMissionIndex % SAURON_AUTO_MISSIONS.length];
        setDemoMissionIndex((prev) => prev + 1);
      } else {
        generatedMission = await generateCeoMissionWithSauron(
          settings,
          progression.agents.sef,
        );
      }
    } finally {
      setIsGeneratingMission(false);
    }

    if (generatedMission.trim()) {
      await handleSubmitTask(generatedMission.trim());
    }
  };

  const handleAuditWithSiberci = (userPrompt: string, targetContent: string) => {
    if (isRunning || isGeneratingMission) return;
    setActiveTab('ofis');
    const trimmedContent =
      targetContent.length > 2600 ? `${targetContent.slice(0, 2600)}\n...` : targetContent;
    void handleSubmitTask(
      `Şu görev ve çıktı için kapsamlı siber güvenlik & OWASP sertleştirme denetimi yap:\n\nGörev: ${userPrompt}\n\nİncelenecek Çıktı:\n${trimmedContent}`,
      'siberci',
    );
  };

  const activeTask = tasks.find((t) => t.status === 'running') ?? null;
  const realOfficeLevel = getOfficeTierInfo(progression.officeXp).level;
  const displayOfficeLevel = previewOfficeLevel ?? realOfficeLevel;

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f1ea] text-slate-800">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        outputCount={outputs.length}
        settings={settings}
        progression={progression}
        onOpenProgression={() => setIsProgressionOpen(true)}
        onToggleSound={handleToggleSound}
        isWorking={isRunning}
      />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col min-h-0">
        {/* OFİS SEKME GÖRÜNÜMÜ (WebGL bağlamını korumak için gizlenerek canlı tutulur) */}
        <div
          className={
            activeTab === 'ofis'
              ? 'grid flex-1 grid-cols-1 gap-4 p-3 sm:p-4 lg:h-[calc(100vh-3.75rem)] lg:max-h-[calc(100vh-3.75rem)] lg:grid-cols-12 lg:overflow-hidden'
              : 'hidden'
          }
        >
          <div className="h-[520px] min-h-[460px] lg:col-span-7 lg:h-full lg:min-h-0 xl:col-span-8">
            <OfficeScene
              agentStates={agentStates}
              agentEngines={settings.agentEngines}
              progression={progression}
              displayOfficeLevel={displayOfficeLevel}
              previewOfficeLevel={previewOfficeLevel}
              onSetPreviewOfficeLevel={setPreviewOfficeLevel}
              onOpenProgression={() => setIsProgressionOpen(true)}
              levelUpNotice={levelUpNotice}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              activeTask={activeTask}
              sceneTheme={settings.sceneTheme}
              onChangeSceneTheme={handleChangeSceneTheme}
            />
          </div>

          <div className="h-[540px] min-h-0 lg:col-span-5 lg:h-full lg:min-h-0 lg:overflow-hidden xl:col-span-4">
            <ChatPanel
              messages={messages}
              isRunning={isRunning}
              isGeneratingMission={isGeneratingMission}
              settings={settings}
              onSubmitTask={handleSubmitTask}
              onTriggerSauronAutoTask={handleSauronAutoTask}
              onOpenSettings={() => setActiveTab('ayarlar')}
              onEnableDemoMode={handleEnableDemoMode}
              onClearChat={handleClearChat}
            />
          </div>
        </div>

        {/* PANO SEKME GÖRÜNÜMÜ */}
        {activeTab === 'pano' && (
          <div className="flex-1">
            <BoardView
              tasks={tasks}
              outputs={outputs}
              progression={progression}
              onOpenProgression={() => setIsProgressionOpen(true)}
              onClearOutputs={handleClearOutputs}
              onGoToOffice={() => setActiveTab('ofis')}
              onAuditWithSiberci={handleAuditWithSiberci}
            />
          </div>
        )}

        {/* AYARLAR SEKME GÖRÜNÜMÜ */}
        {activeTab === 'ayarlar' && (
          <div className="flex-1">
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onResetAllData={handleResetAllData}
            />
          </div>
        )}
      </main>

      <ProgressionModal
        isOpen={isProgressionOpen}
        onClose={() => setIsProgressionOpen(false)}
        progression={progression}
        previewOfficeLevel={previewOfficeLevel}
        onSetPreviewOfficeLevel={setPreviewOfficeLevel}
        onAddBonusXp={handleAddBonusXp}
      />
    </div>
  );
}
