import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  Brain,
  Building2,
  Eye,
  Lock,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  X,
} from 'lucide-react';
import { AGENTS, AGENT_ORDER } from '../../constants/agents';
import { ENGINE_META, ENGINE_ORDER } from '../../constants/engines';
import { getAgentLevelInfo, getOfficeTierInfo } from '../../constants/progression';
import type {
  AgentId,
  AgentRuntimeState,
  EngineId,
  OfficeLevel,
  ProgressionState,
  SceneTheme,
  TaskRun,
} from '../../types';
import { OfficeEnvironment } from './OfficeEnvironment';
import { AgentCharacter } from './AgentCharacter';

interface OfficeSceneProps {
  agentStates: Record<AgentId, AgentRuntimeState>;
  agentEngines: Record<AgentId, EngineId>;
  progression: ProgressionState;
  displayOfficeLevel: OfficeLevel;
  previewOfficeLevel: OfficeLevel | null;
  onSetPreviewOfficeLevel: (level: OfficeLevel | null) => void;
  onOpenProgression: () => void;
  levelUpNotice: string | null;
  selectedAgentId: AgentId | null;
  onSelectAgent: (id: AgentId | null) => void;
  activeTask: TaskRun | null;
  sceneTheme: SceneTheme;
  onChangeSceneTheme: (theme: SceneTheme) => void;
}

type WingFocus = 'all' | EngineId;

const CAMERA_PRESETS: Record<OfficeLevel, { zoom: number; target: [number, number, number] }> = {
  1: { zoom: 23, target: [0, 0.35, -0.3] },
  2: { zoom: 20, target: [1.8, 0.45, -0.3] },
  3: { zoom: 19, target: [1.8, 1.1, -0.3] },
};

const WING_CAMERA_PRESETS: Record<EngineId, { zoom: number; target: [number, number, number] }> = {
  gemini: { zoom: 42, target: [-7.2, 0.4, -2.5] },
  qwen: { zoom: 44, target: [0, 0.4, -2.5] },
  deepseek: { zoom: 42, target: [7.2, 0.4, -2.5] },
};

const SCENE_LIGHTING: Record<
  SceneTheme,
  {
    bg: string;
    containerClass: string;
    ambientIntensity: number;
    ambientColor: string;
    hemiArgs: [string, string, number];
    dirIntensity: number;
    dirColor: string;
    fillIntensity: number;
    fillColor: string;
    shadowOpacity: number;
    shadowColor: string;
  }
> = {
  day: {
    bg: '#f3ede1',
    containerClass:
      'border-[#e3d9c8] bg-gradient-to-br from-[#f8f4ec] via-[#f2ece0] to-[#e9e2d2]',
    ambientIntensity: 0.76,
    ambientColor: '#fffaf0',
    hemiArgs: ['#fffdf8', '#e2d5c1', 0.65],
    dirIntensity: 1.15,
    dirColor: '#fff6e6',
    fillIntensity: 0.35,
    fillColor: '#dbeafe',
    shadowOpacity: 0.28,
    shadowColor: '#8b7355',
  },
  sunset: {
    bg: '#ead8c7',
    containerClass:
      'border-[#dfc7b2] bg-gradient-to-br from-[#f6e3d2] via-[#edd6c1] to-[#e2c6b0]',
    ambientIntensity: 0.58,
    ambientColor: '#fde6cf',
    hemiArgs: ['#fed7aa', '#c084fc', 0.55],
    dirIntensity: 1.25,
    dirColor: '#fdba74',
    fillIntensity: 0.42,
    fillColor: '#c4b5fd',
    shadowOpacity: 0.34,
    shadowColor: '#6b4c3b',
  },
  night: {
    bg: '#0b1120',
    containerClass:
      'border-slate-700 bg-gradient-to-br from-[#0b1120] via-[#111827] to-[#0f172a]',
    ambientIntensity: 0.38,
    ambientColor: '#94a3b8',
    hemiArgs: ['#60a5fa', '#0f172a', 0.48],
    dirIntensity: 0.62,
    dirColor: '#60a5fa',
    fillIntensity: 0.36,
    fillColor: '#818cf8',
    shadowOpacity: 0.42,
    shadowColor: '#020617',
  },
};

function CameraController({
  officeLevel,
  wingFocus,
  focusTick,
  controlsRef,
  isTransitioningRef,
}: {
  officeLevel: OfficeLevel;
  wingFocus: WingFocus;
  focusTick: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  isTransitioningRef: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();
  const initializedRef = useRef(false);
  const desiredZoomRef = useRef(CAMERA_PRESETS[officeLevel].zoom);
  const desiredTargetRef = useRef(new THREE.Vector3(...CAMERA_PRESETS[officeLevel].target));

  useEffect(() => {
    const preset =
      wingFocus === 'all' ? CAMERA_PRESETS[officeLevel] : WING_CAMERA_PRESETS[wingFocus];
    desiredZoomRef.current = preset.zoom;
    desiredTargetRef.current.set(...preset.target);

    if (!initializedRef.current) {
      initializedRef.current = true;
      if ('zoom' in camera) {
        camera.zoom = preset.zoom;
        camera.updateProjectionMatrix();
      }
      if (controlsRef.current) {
        controlsRef.current.target.copy(desiredTargetRef.current);
        controlsRef.current.update();
      }
      return;
    }

    isTransitioningRef.current = true;
  }, [officeLevel, wingFocus, focusTick, camera, controlsRef, isTransitioningRef]);

  useFrame((_, rawDelta) => {
    if (!isTransitioningRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const alpha = Math.min(1, delta * 7.5);

    let zoomDone = true;
    if ('zoom' in camera) {
      const zDiff = desiredZoomRef.current - camera.zoom;
      if (Math.abs(zDiff) > 0.06) {
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, desiredZoomRef.current, alpha);
        camera.updateProjectionMatrix();
        zoomDone = false;
      } else {
        camera.zoom = desiredZoomRef.current;
        camera.updateProjectionMatrix();
      }
    }

    let targetDone = true;
    if (controlsRef.current) {
      const dist = controlsRef.current.target.distanceTo(desiredTargetRef.current);
      if (dist > 0.025) {
        controlsRef.current.target.lerp(desiredTargetRef.current, alpha);
        controlsRef.current.update();
        targetDone = false;
      } else {
        controlsRef.current.target.copy(desiredTargetRef.current);
        controlsRef.current.update();
      }
    }

    if (zoomDone && targetDone) {
      isTransitioningRef.current = false;
    }
  });

  return null;
}

export function OfficeScene({
  agentStates,
  agentEngines,
  progression,
  displayOfficeLevel,
  previewOfficeLevel,
  onSetPreviewOfficeLevel,
  onOpenProgression,
  levelUpNotice,
  selectedAgentId,
  onSelectAgent,
  activeTask,
  sceneTheme,
  onChangeSceneTheme,
}: OfficeSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isTransitioningRef = useRef(false);
  const [wingFocus, setWingFocus] = useState<WingFocus>('all');
  const [focusTick, setFocusTick] = useState(0);
  const overlayElRef = useRef<Record<AgentId, HTMLDivElement | null>>({
    sef: null,
    arastirmaci: null,
    icerikci: null,
    yazilimci: null,
    siberci: null,
  });

  const handleSelectWingFocus = (next: WingFocus) => {
    setWingFocus(next);
    setFocusTick((prev) => prev + 1);
  };

  const resetCamera = () => {
    setWingFocus('all');
    setFocusTick((prev) => prev + 1);
  };

  const lighting = SCENE_LIGHTING[sceneTheme];
  const officeTier = getOfficeTierInfo(progression.officeXp);
  const selectedAgent = selectedAgentId ? AGENTS[selectedAgentId] : null;
  const selectedEngine = selectedAgentId ? ENGINE_META[agentEngines[selectedAgentId]] : null;
  const selectedRuntime = selectedAgentId ? agentStates[selectedAgentId] : null;
  const selectedProgress = selectedAgentId ? progression.agents[selectedAgentId] : null;
  const selectedLevelInfo = selectedProgress ? getAgentLevelInfo(selectedProgress.xp) : null;

  const activeAgentIds: AgentId[] =
    activeTask?.status === 'running'
      ? activeTask.activeAgents && activeTask.activeAgents.length > 0
        ? activeTask.activeAgents
        : activeTask.activeAgent
          ? [activeTask.activeAgent]
          : []
      : [];

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border shadow-inner transition-colors duration-500 ${lighting.containerClass}`}
    >
      {/* 3D Isometric Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        onPointerMissed={() => onSelectAgent(null)}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[lighting.bg]} />

        <OrthographicCamera
          makeDefault
          position={[19, 17, 19]}
          zoom={CAMERA_PRESETS[displayOfficeLevel].zoom}
          near={-60}
          far={160}
        />

        <CameraController
          officeLevel={displayOfficeLevel}
          wingFocus={wingFocus}
          focusTick={focusTick}
          controlsRef={controlsRef}
          isTransitioningRef={isTransitioningRef}
        />

        {/* Dynamic Day / Sunset / Night Cyber Lighting */}
        <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
        <hemisphereLight args={lighting.hemiArgs} />
        <directionalLight
          position={[15, 22, 13]}
          intensity={lighting.dirIntensity}
          color={lighting.dirColor}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-camera-near={1}
          shadow-camera-far={70}
          shadow-bias={-0.0005}
        />
        <directionalLight
          position={[-12, 9, -8]}
          intensity={lighting.fillIntensity}
          color={lighting.fillColor}
        />

        <Suspense fallback={null}>
          <OfficeEnvironment
            agentStates={agentStates}
            agentEngines={agentEngines}
            progression={progression}
            officeLevel={displayOfficeLevel}
            sceneTheme={sceneTheme}
          />

          {AGENT_ORDER.map((id) => (
            <AgentCharacter
              key={id}
              agentId={id}
              runtimeState={agentStates[id]}
              agentLevel={getAgentLevelInfo(progression.agents[id].xp).level}
              isSelected={selectedAgentId === id}
              onSelect={(clickedId) =>
                onSelectAgent(selectedAgentId === clickedId ? null : clickedId)
              }
              overlayElRef={overlayElRef}
            />
          ))}

          <ContactShadows
            position={[1.5, 0.008, 0]}
            opacity={lighting.shadowOpacity}
            scale={38}
            blur={2.1}
            far={6}
            color={lighting.shadowColor}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enablePan
          panSpeed={0.7}
          rotateSpeed={0.55}
          zoomSpeed={0.85}
          minZoom={13}
          maxZoom={85}
          minPolarAngle={Math.PI / 5}
          maxPolarAngle={Math.PI / 2.3}
          minAzimuthAngle={-Math.PI / 8}
          maxAzimuthAngle={Math.PI / 1.45}
          onStart={() => {
            isTransitioningRef.current = false;
          }}
          target={CAMERA_PRESETS[displayOfficeLevel].target}
        />
      </Canvas>

      {/* Projected Native HTML Overlay Bubbles for All 4 Agents */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {AGENT_ORDER.map((id) => {
          const ag = AGENTS[id];
          const eng = ENGINE_META[agentEngines[id]];
          const st = agentStates[id];
          const lvl = getAgentLevelInfo(progression.agents[id].xp);
          const isWorking = st.activity === 'working';
          const isCompleted = st.activity === 'completed';
          const isSel = selectedAgentId === id;

          return (
            <div
              key={id}
              ref={(node) => {
                overlayElRef.current[id] = node;
              }}
              className="pointer-events-auto absolute top-0 left-0 will-change-transform"
              style={{ opacity: 0, zIndex: isWorking ? 25 : isSel ? 20 : 12 }}
            >
              <button
                type="button"
                onClick={() => onSelectAgent(isSel ? null : id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-1 text-center shadow-md backdrop-blur-md transition-colors duration-150 select-none ${
                  isWorking
                    ? 'bg-white/95 shadow-lg'
                    : isSel
                      ? 'bg-white/95 ring-2 ring-indigo-400'
                      : 'bg-white/88 hover:bg-white'
                }`}
                style={{
                  borderColor: isWorking ? eng.color : 'rgba(148, 163, 184, 0.45)',
                  minWidth: '104px',
                }}
              >
                <div className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ag.color }}
                  />
                  <span className="text-[11px] font-extrabold tracking-tight text-slate-900">
                    {ag.name}
                  </span>
                  {ag.locked && (
                    <span title="Kilitli CEO — Değiştirilemez">
                      <Lock className="h-2.5 w-2.5 text-orange-600" />
                    </span>
                  )}
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] font-extrabold ${
                      lvl.level >= 2
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Sv.{lvl.level}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className="rounded px-1 py-0.2 text-[8.5px] font-extrabold"
                    style={{
                      backgroundColor: eng.lightBg,
                      color: eng.accentColor,
                    }}
                  >
                    {eng.badgeSymbol} {eng.shortName}
                  </span>
                  <div
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-semibold"
                    style={{
                      backgroundColor: isWorking ? ag.lightBg : '#f1f5f9',
                      color: isWorking ? ag.accentColor : isCompleted ? '#059669' : '#64748b',
                    }}
                  >
                    {isWorking && (
                      <span
                        className="h-1.5 w-1.5 animate-ping rounded-full"
                        style={{ backgroundColor: eng.color }}
                      />
                    )}
                    <span className="max-w-[95px] truncate">{st.statusText}</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Celebratory Level-Up Toast Banner */}
      {levelUpNotice && (
        <div className="pointer-events-none absolute top-14 left-1/2 z-30 -translate-x-1/2 animate-bounce">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-4 py-2 text-xs font-extrabold text-amber-900 shadow-xl">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>{levelUpNotice}</span>
          </div>
        </div>
      )}

      {/* Top HUD Bar: Status/Level Left + Wing Focus & Camera Reset Right (wraps cleanly on narrow panes) */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex max-w-xs items-center gap-2 rounded-xl border border-white/80 bg-white/88 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  activeTask?.status === 'running'
                    ? 'animate-pulse bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              {activeTask?.status === 'running' ? (
                <span className="truncate">
                  Çalışıyor
                  {activeAgentIds.length > 0
                    ? ` • ${activeAgentIds.map((id) => AGENTS[id].name).join(', ')}`
                    : ''}
                </span>
              ) : (
                <span>3-Kanat Kampüs</span>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenProgression}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md transition hover:border-amber-300 hover:bg-amber-50"
              title="Ofis büyümesi ve ajan seviyelerini aç"
            >
              <Building2 className="h-3.5 w-3.5 text-amber-600" />
              <span>
                Sv.{officeTier.level} {officeTier.name}
              </span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-800">
                {progression.officeXp} XP
              </span>
            </button>
          </div>

          {previewOfficeLevel !== null && (
            <div className="pointer-events-auto inline-flex w-fit items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/95 px-3 py-1 text-[11px] font-bold text-indigo-800 shadow-xs backdrop-blur-md">
              <Eye className="h-3.5 w-3.5" />
              <span>Bina Önizleme: Sv.{previewOfficeLevel}</span>
              <button
                type="button"
                onClick={() => onSetPreviewOfficeLevel(null)}
                className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100"
              >
                Kapat
              </button>
            </div>
          )}

          {activeTask?.status === 'running' && activeTask.plan && (
            <div className="pointer-events-auto max-w-sm rounded-xl border border-indigo-100 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm backdrop-blur-md">
              <div className="mb-1 flex items-center gap-1 font-bold text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                CEO Sauron İş Akışı
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {activeTask.plan.steps.map((step, index) => {
                  const ag = AGENTS[step.agentId];
                  const eng = ENGINE_META[agentEngines[step.agentId]];
                  const isDone = activeTask.completedAgents.includes(step.agentId);
                  const isNow = activeAgentIds.includes(step.agentId);
                  return (
                    <span
                      key={step.agentId}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                        isNow
                          ? 'ring-2 ring-offset-1'
                          : isDone
                            ? 'opacity-75'
                            : 'opacity-55'
                      }`}
                      style={{
                        backgroundColor: ag.lightBg,
                        color: ag.accentColor,
                        borderColor: eng.color,
                      }}
                    >
                      {index + 1}. {ag.name}
                      <span className="opacity-75">{eng.badgeSymbol}</span>
                      {isDone ? ' ✓' : isNow ? ' ...' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          {/* Scene Theme Switcher */}
          <div className="flex items-center gap-0.5 rounded-xl border border-white/80 bg-white/85 p-1 shadow-sm backdrop-blur-md">
            {(
              [
                { id: 'day', label: 'Gündüz', icon: Sun },
                { id: 'sunset', label: 'Akşam', icon: Sunset },
                { id: 'night', label: 'Cyber', icon: Moon },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = sceneTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSceneTheme(opt.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    active
                      ? opt.id === 'night'
                        ? 'bg-slate-900 text-cyan-300 shadow-xs'
                        : opt.id === 'sunset'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-amber-400 text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`${opt.label} moduna geç`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden md:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-white/80 bg-white/85 p-1 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleSelectWingFocus('all')}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                wingFocus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tümü
            </button>
            {ENGINE_ORDER.map((engId) => {
              const eng = ENGINE_META[engId];
              const active = wingFocus === engId;
              return (
                <button
                  key={engId}
                  type="button"
                  onClick={() => handleSelectWingFocus(engId)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                    active ? 'text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  style={active ? { backgroundColor: eng.color } : undefined}
                  title={`${eng.wingName} alanına odaklan`}
                >
                  <span>{eng.badgeSymbol}</span>
                  <span className="hidden sm:inline">{eng.shortName}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={resetCamera}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-indigo-700"
            title="Kamerayı varsayılan izometrik açıya sıfırla"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Selected Agent Inspector Card */}
      {selectedAgent && selectedEngine && selectedRuntime && selectedProgress && selectedLevelInfo && (
        <div className="absolute bottom-24 left-3.5 z-30 w-76 rounded-2xl border border-white/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-sm"
                style={{ backgroundColor: selectedAgent.color }}
              >
                {selectedAgent.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-1">
                  <h3 className="text-sm font-bold text-slate-900">{selectedAgent.name}</h3>
                  {selectedAgent.locked && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-800">
                      <Lock className="h-2.5 w-2.5" />
                      Kilitli CEO
                    </span>
                  )}
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    Sv.{selectedLevelInfo.level}
                  </span>
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
                    style={{
                      backgroundColor: selectedEngine.lightBg,
                      color: selectedEngine.accentColor,
                    }}
                  >
                    {selectedEngine.badgeSymbol} {selectedEngine.shortName}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">{selectedAgent.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectAgent(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Agent XP Progress */}
          <div className="mt-2.5">
            <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
              <span>{selectedProgress.xp} XP</span>
              <span>
                {selectedLevelInfo.nextLevelXp
                  ? `Sonraki: ${selectedLevelInfo.nextLevelXp} XP`
                  : 'Maks. Seviye'}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${selectedLevelInfo.progressPercent}%`,
                  backgroundColor: selectedAgent.color,
                }}
              />
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            {selectedAgent.description}
          </p>

          {/* Memories snippet */}
          <div className="mt-2 rounded-xl bg-slate-50 px-2.5 py-2">
            <p className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
              <Brain className="h-3 w-3 text-indigo-500" />
              Hafıza ({selectedProgress.memories.length})
            </p>
            {selectedProgress.memories.length === 0 ? (
              <p className="mt-0.5 text-[10.5px] text-slate-400">
                Görev tamamladıkça deneyimler burada birikir.
              </p>
            ) : (
              <p className="mt-0.5 truncate text-[10.5px] text-slate-600">
                • {selectedProgress.memories[0]}
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px]">
            <span className="font-medium text-slate-500">Anlık Durum:</span>
            <span className="font-bold" style={{ color: selectedAgent.accentColor }}>
              {selectedRuntime.statusText}
            </span>
          </div>
        </div>
      )}

      {/* Bottom Agent Quick Strip & Camera Hint */}
      <div className="pointer-events-none absolute right-3.5 bottom-3.5 left-3.5 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {AGENT_ORDER.map((id) => {
            const ag = AGENTS[id];
            const eng = ENGINE_META[agentEngines[id]];
            const st = agentStates[id];
            const lvl = getAgentLevelInfo(progression.agents[id].xp);
            const working = st.activity === 'working';
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectAgent(selectedAgentId === id ? null : id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md transition ${
                  selectedAgentId === id
                    ? 'border-indigo-400 bg-white text-slate-900'
                    : 'border-white/75 bg-white/80 text-slate-700 hover:bg-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${working ? 'animate-ping' : ''}`}
                  style={{ backgroundColor: ag.color }}
                />
                <span>{ag.name}</span>
                <span
                  className="rounded px-1 py-0.2 text-[9px] font-extrabold"
                  style={{ backgroundColor: eng.lightBg, color: eng.accentColor }}
                >
                  {eng.badgeSymbol} {eng.shortName}
                </span>
                <span className="rounded bg-amber-100/90 px-1 py-0.2 text-[9.5px] font-extrabold text-amber-800">
                  Sv.{lvl.level}
                </span>
                <span className="hidden text-[10px] font-medium text-slate-500 xl:inline">
                  • {st.statusText}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden rounded-xl border border-white/70 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-500 backdrop-blur-md 2xl:block">
          Sol tık: Döndür • Tekerlek: Yakınlaştır • Ajanlara tıkla: İncele
        </div>
      </div>
    </div>
  );
}
