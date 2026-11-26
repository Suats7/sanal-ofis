import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { AGENTS, AGENT_ORDER } from '../../constants/agents';
import { ENGINE_META } from '../../constants/engines';
import { getAgentLevelInfo } from '../../constants/progression';
import type {
  AgentId,
  AgentRuntimeState,
  EngineId,
  OfficeLevel,
  ProgressionState,
  SceneTheme,
} from '../../types';

interface WorkstationProps {
  agentId: AgentId;
  engineId: EngineId;
  isActive: boolean;
  agentLevel: number;
  officeLevel: OfficeLevel;
  isNight: boolean;
}

function Workstation({
  agentId,
  engineId,
  isActive,
  agentLevel,
  officeLevel,
  isNight,
}: WorkstationProps) {
  const agent = AGENTS[agentId];
  const engine = ENGINE_META[engineId];
  const [x, y, z] = agent.deskPosition;
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sideScreenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lampLightRef = useRef<THREE.PointLight>(null);

  const isUpgraded = agentLevel >= 2 || officeLevel >= 2;
  const isExecutive = agentLevel >= 3 || officeLevel >= 3;
  const nightBoost = isNight ? 0.35 : 0;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (screenMatRef.current) {
      screenMatRef.current.emissiveIntensity =
        (isActive ? 1.05 + Math.sin(t * 6) * 0.25 : isUpgraded ? 0.34 : 0.2) + nightBoost;
    }
    if (sideScreenMatRef.current) {
      sideScreenMatRef.current.emissiveIntensity =
        (isActive ? 0.9 + Math.cos(t * 5) * 0.2 : isUpgraded ? 0.26 : 0.14) + nightBoost;
    }
    if (lampLightRef.current) {
      lampLightRef.current.intensity =
        (isActive ? 1.5 + Math.sin(t * 4) * 0.25 : isUpgraded ? 0.35 : 0.2) +
        (isNight ? 0.55 : 0);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Subtle colored desk zone mat */}
      <mesh position={[0, 0.012, -0.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.35, 2.1]} />
        <meshStandardMaterial color={isNight ? '#1e293b' : engine.lightBg} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.015, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.1, 4]} />
        <meshBasicMaterial
          color={engine.color}
          transparent
          opacity={isActive ? 0.72 : isNight ? 0.45 : isUpgraded ? 0.32 : 0.18}
        />
      </mesh>

      {/* Desk Top */}
      <RoundedBox args={[2.1, 0.09, 1.0]} radius={0.04} smoothness={3} position={[0, 0.78, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color={isNight ? '#334155' : isExecutive ? '#fdfaf5' : '#f6efe4'}
          roughness={0.6}
        />
      </RoundedBox>
      {/* Colored engine LED accent strip on front of desk */}
      <mesh position={[0, 0.78, 0.505]} castShadow>
        <boxGeometry args={[1.65, 0.045, 0.018]} />
        <meshStandardMaterial
          color={engine.color}
          emissive={engine.color}
          emissiveIntensity={(isActive ? 1.15 : isUpgraded ? 0.65 : 0.22) + nightBoost}
          roughness={0.35}
        />
      </mesh>

      {/* Golden desk corner inlays for Sv.3+ agents */}
      {isExecutive && (
        <>
          <mesh position={[-0.95, 0.78, 0.505]}>
            <boxGeometry args={[0.12, 0.045, 0.022]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.25} />
          </mesh>
          <mesh position={[0.95, 0.78, 0.505]}>
            <boxGeometry args={[0.12, 0.045, 0.022]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.25} />
          </mesh>
        </>
      )}

      {/* 4 Wooden Desk Legs */}
      {[
        [-0.92, 0.39, -0.38],
        [0.92, 0.39, -0.38],
        [-0.92, 0.39, 0.38],
        [0.92, 0.39, 0.38],
      ].map(([lx, ly, lz], idx) => (
        <mesh key={idx} position={[lx, ly, lz]} castShadow receiveShadow>
          <cylinderGeometry args={[0.042, 0.035, 0.78, 10]} />
          <meshStandardMaterial color={isExecutive ? '#c8a986' : '#d9bc9b'} roughness={0.75} />
        </mesh>
      ))}

      {/* Main Monitor (wider ultrawide monitor at Sv.3+) */}
      <group position={[-0.22, 0.825, 0.16]} rotation={[0, -0.18, 0]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.035, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.16, 0.03]} castShadow>
          <boxGeometry args={[0.07, 0.28, 0.05]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </mesh>
        <RoundedBox
          args={[isExecutive ? 0.96 : 0.78, isExecutive ? 0.52 : 0.48, 0.055]}
          radius={0.025}
          smoothness={2}
          position={[0, 0.39, 0]}
          castShadow
        >
          <meshStandardMaterial color="#334155" roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.39, -0.03]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[isExecutive ? 0.88 : 0.7, isExecutive ? 0.44 : 0.4]} />
          <meshStandardMaterial
            ref={screenMatRef}
            color={isActive ? engine.color : '#64748b'}
            emissive={engine.color}
            emissiveIntensity={0.22}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 0.4, 0.032]}>
          <circleGeometry args={[0.048, 16]} />
          <meshStandardMaterial
            color={isExecutive ? '#fbbf24' : engine.color}
            emissive={isExecutive ? '#f59e0b' : engine.color}
            emissiveIntensity={isActive ? 1.35 : 0.45}
          />
        </mesh>
      </group>

      {/* Angled Secondary Display / Tablet */}
      <group position={[0.58, 0.825, 0.04]} rotation={[0, -0.78, 0]}>
        <RoundedBox
          args={[isUpgraded ? 0.48 : 0.42, isUpgraded ? 0.36 : 0.32, 0.035]}
          radius={0.02}
          smoothness={2}
          position={[0, 0.21, 0]}
          rotation={[-0.18, 0, 0]}
          castShadow
        >
          <meshStandardMaterial color="#475569" roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.21, 0.02]} rotation={[-0.18, 0, 0]}>
          <planeGeometry args={[isUpgraded ? 0.42 : 0.36, isUpgraded ? 0.29 : 0.25]} />
          <meshStandardMaterial
            ref={sideScreenMatRef}
            color={isActive ? '#e0f2fe' : '#94a3b8'}
            emissive={engine.color}
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* Keyboard & Mouse */}
      <RoundedBox args={[0.52, 0.025, 0.18]} radius={0.008} smoothness={2} position={[-0.12, 0.838, -0.18]} castShadow>
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.09, 0.025, 0.13]} radius={0.015} smoothness={2} position={[0.28, 0.838, -0.18]} castShadow>
        <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
      </RoundedBox>

      {/* Cute Coffee Mug */}
      <group position={[-0.78, 0.885, -0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.055, 0.12, 12]} />
          <meshStandardMaterial color={agent.color} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.015, 12]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.3} />
        </mesh>
      </group>

      {/* Mini Desk Lamp */}
      <group position={[0.78, 0.825, -0.22]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.04, 12]} />
          <meshStandardMaterial color={isExecutive ? '#f59e0b' : engine.color} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.18]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.36, 8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        <mesh position={[-0.08, 0.36, 0]} rotation={[0, 0, -0.45]} castShadow>
          <coneGeometry args={[0.1, 0.15, 12]} />
          <meshStandardMaterial color={isExecutive ? '#fbbf24' : engine.color} roughness={0.35} />
        </mesh>
        <pointLight
          ref={lampLightRef}
          position={[-0.1, 0.28, 0.05]}
          color={engine.color}
          intensity={0.2}
          distance={2.8}
          decay={2}
        />
      </group>

      {/* Ergonomic Office Chair behind desk */}
      <group position={[0, 0, -0.98]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.05, 5]} />
          <meshStandardMaterial color="#64748b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 10]} />
          <meshStandardMaterial color="#475569" roughness={0.4} />
        </mesh>
        <RoundedBox args={[0.58, 0.09, 0.56]} radius={0.04} smoothness={2} position={[0, 0.42, 0]} castShadow>
          <meshStandardMaterial color={agent.color} roughness={0.75} />
        </RoundedBox>
        <RoundedBox args={[0.56, isExecutive ? 0.64 : 0.54, 0.09]} radius={0.04} smoothness={2} position={[0, isExecutive ? 0.77 : 0.72, -0.25]} castShadow>
          <meshStandardMaterial color={agent.color} roughness={0.75} />
        </RoundedBox>
      </group>
    </group>
  );
}

function WallSignBoard({
  position,
  title,
  subtitle,
  color,
  isActive,
}: {
  position: [number, number, number];
  title: string;
  subtitle: string;
  color: string;
  isActive: boolean;
}) {
  const ledMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border accent
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      // Subtle glow bar on left
      ctx.fillStyle = color;
      ctx.fillRect(24, 28, 12, canvas.height - 56);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 48px Inter, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, canvas.width / 2 + 6, 66);

      // Subtitle
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 22px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillText(subtitle, canvas.width / 2 + 6, 118);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [title, subtitle, color]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }) => {
    if (ledMatRef.current) {
      const t = clock.getElapsedTime();
      ledMatRef.current.emissiveIntensity = isActive ? 1.55 + Math.sin(t * 5.2) * 0.45 : 0.38;
    }
  });

  return (
    <group position={position}>
      <RoundedBox args={[3.4, 0.86, 0.1]} radius={0.04} smoothness={2} castShadow>
        <meshStandardMaterial color="#1e293b" roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[3.22, 0.74]} />
        <meshStandardMaterial
          map={texture}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={isActive ? 1.15 : 0.65}
          roughness={0.25}
        />
      </mesh>
      {/* Live Status LED bar underneath */}
      <mesh position={[0, -0.5, 0.04]}>
        <boxGeometry args={[2.9, 0.065, 0.04]} />
        <meshStandardMaterial
          ref={ledMatRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
        />
      </mesh>
      {isActive && (
        <pointLight position={[0, -0.2, 0.7]} color={color} intensity={1.3} distance={4.2} decay={2} />
      )}
    </group>
  );
}

function GlassPartitionWall({
  position,
  accentColor,
}: {
  position: [number, number, number];
  accentColor: string;
}) {
  return (
    <group position={position}>
      {/* Wood base */}
      <RoundedBox args={[0.14, 0.35, 8.1]} radius={0.02} smoothness={2} position={[0, 0.175, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e2d5c1" roughness={0.75} />
      </RoundedBox>
      {/* Frosted glass panel */}
      <mesh position={[0, 0.825, 0]}>
        <boxGeometry args={[0.06, 0.95, 7.92]} />
        <meshStandardMaterial color="#dbeafe" transparent opacity={0.34} roughness={0.12} />
      </mesh>
      {/* Top accent rail */}
      <RoundedBox args={[0.12, 0.06, 8.1]} radius={0.02} smoothness={2} position={[0, 1.33, 0]} castShadow>
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </RoundedBox>
      {/* Front & back pillars */}
      <RoundedBox args={[0.16, 1.38, 0.16]} radius={0.02} smoothness={2} position={[0, 0.69, -4.02]} castShadow>
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.16, 1.38, 0.16]} radius={0.02} smoothness={2} position={[0, 0.69, 4.02]} castShadow>
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

function PottedPlant({
  position,
  scale = 1,
  potColor = '#e6a587',
}: {
  position: [number, number, number];
  scale?: number;
  potColor?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.21, 0.52, 12]} />
        <meshStandardMaterial color={potColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 12]} />
        <meshStandardMaterial color="#6b4f3a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.72, 8]} />
        <meshStandardMaterial color="#7c5c43" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.32, 0]} castShadow>
        <dodecahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#6bbf8a" roughness={0.75} />
      </mesh>
      <mesh position={[-0.24, 1.06, 0.16]} castShadow>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color="#58ab78" roughness={0.75} />
      </mesh>
      <mesh position={[0.24, 1.12, -0.14]} castShadow>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#7fd19d" roughness={0.75} />
      </mesh>
    </group>
  );
}

function CreativeMoodboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.45, 0]}>
      {/* Easel legs */}
      <mesh position={[-0.26, 0.65, 0]} rotation={[0, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.35, 8]} />
        <meshStandardMaterial color="#c8a986" roughness={0.7} />
      </mesh>
      <mesh position={[0.26, 0.65, 0]} rotation={[0, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.35, 8]} />
        <meshStandardMaterial color="#c8a986" roughness={0.7} />
      </mesh>
      {/* Board */}
      <RoundedBox args={[0.92, 0.78, 0.06]} radius={0.03} smoothness={2} position={[0, 1.02, 0.04]} rotation={[-0.12, 0, 0]} castShadow>
        <meshStandardMaterial color="#fffaf2" roughness={0.6} />
      </RoundedBox>
      {/* Color swatches */}
      {[
        { pos: [-0.24, 1.16, 0.075] as [number, number, number], c: '#f43f5e' },
        { pos: [0.02, 1.16, 0.075] as [number, number, number], c: '#6366f1' },
        { pos: [0.26, 1.16, 0.075] as [number, number, number], c: '#fbbf24' },
        { pos: [-0.14, 0.9, 0.105] as [number, number, number], c: '#a5b4fc' },
        { pos: [0.18, 0.9, 0.105] as [number, number, number], c: '#fda4af' },
      ].map((sw, idx) => (
        <mesh key={idx} position={sw.pos} rotation={[-0.12, 0, 0]}>
          <planeGeometry args={[0.2, 0.18]} />
          <meshStandardMaterial color={sw.c} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function ResearchBookshelf({ position }: { position: [number, number, number] }) {
  const binderColors = ['#7c3aed', '#0ea5e9', '#a855f7', '#38bdf8', '#f59e0b', '#6366f1'];
  return (
    <group position={position}>
      <RoundedBox args={[1.35, 1.05, 0.45]} radius={0.04} smoothness={2} position={[0, 0.525, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#e6ccb2" roughness={0.7} />
      </RoundedBox>
      {/* Shelf recess */}
      <mesh position={[0, 0.68, 0.05]}>
        <boxGeometry args={[1.18, 0.34, 0.38]} />
        <meshStandardMaterial color="#d5bdaf" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0.05]}>
        <boxGeometry args={[1.18, 0.34, 0.38]} />
        <meshStandardMaterial color="#d5bdaf" roughness={0.8} />
      </mesh>
      {/* Colorful books */}
      {binderColors.map((c, idx) => (
        <mesh key={idx} position={[-0.45 + idx * 0.16, 0.68, 0.14]} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.24]} />
          <meshStandardMaterial color={c} roughness={0.6} />
        </mesh>
      ))}
      {/* Small top plant & desk globe */}
      <mesh position={[0.38, 1.18, 0]} castShadow>
        <sphereGeometry args={[0.14, 14, 14]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.35} />
      </mesh>
      <mesh position={[-0.36, 1.13, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.09, 0.16, 10]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.7} />
      </mesh>
      <mesh position={[-0.36, 1.28, 0]} castShadow>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#6bbf8a" roughness={0.75} />
      </mesh>
    </group>
  );
}

function DevServerRack({
  position,
  isActive,
}: {
  position: [number, number, number];
  isActive: boolean;
}) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (ledRef.current) {
      const t = clock.getElapsedTime();
      ledRef.current.emissiveIntensity = isActive
        ? 1.5 + Math.sin(t * 7) * 0.45
        : 0.75 + Math.sin(t * 2) * 0.15;
    }
  });

  return (
    <group position={position}>
      <RoundedBox args={[0.95, 1.85, 0.78]} radius={0.05} smoothness={2} position={[0, 0.925, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.25} />
      </RoundedBox>
      {[0, 1, 2, 3, 4].map((row) => (
        <mesh key={row} position={[0, 1.55 - row * 0.28, 0.4]}>
          <boxGeometry args={[0.72, 0.09, 0.02]} />
          <meshStandardMaterial
            ref={row === 0 ? ledRef : undefined}
            color={row % 2 === 0 ? '#38bdf8' : '#22d3ee'}
            emissive={row % 2 === 0 ? '#0284c7' : '#06b6d4'}
            emissiveIntensity={isActive ? 1.5 : 0.75}
          />
        </mesh>
      ))}
    </group>
  );
}

function TelemetryConsole({
  position,
  isActive,
}: {
  position: [number, number, number];
  isActive: boolean;
}) {
  const beaconRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const t = clock.getElapsedTime();
      beaconRef.current.rotation.y = t * (isActive ? 2.6 : 0.9);
      beaconRef.current.position.y = 1.62 + Math.sin(t * 2.5) * 0.04;
    }
  });

  return (
    <group position={position} rotation={[0, -0.55, 0]}>
      <RoundedBox args={[1.1, 0.85, 0.5]} radius={0.04} smoothness={2} position={[0, 0.425, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#334155" roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.95, 0.55, 0.05]} radius={0.02} smoothness={2} position={[0, 1.15, 0]} rotation={[-0.12, 0, 0]} castShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, 1.15, 0.03]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[0.84, 0.45]} />
        <meshStandardMaterial
          color="#0891b2"
          emissive="#22d3ee"
          emissiveIntensity={isActive ? 1.25 : 0.5}
        />
      </mesh>
      {/* Hovering Security Firewall Beacon */}
      <mesh ref={beaconRef} position={[0, 1.62, 0]} castShadow>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#06b6d4"
          emissiveIntensity={isActive ? 1.8 : 0.75}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function HuddleTableArea({ position }: { position: [number, number, number] }) {
  const stoolColors = ['#6366f1', '#0ea5e9', '#f43f5e', '#10b981'];
  return (
    <group position={position}>
      <RoundedBox args={[3.4, 0.025, 3.0]} radius={0.05} smoothness={2} position={[0, 0.012, 0]} receiveShadow>
        <meshStandardMaterial color="#e0e7ff" roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[1.55, 0.08, 1.95]} radius={0.08} smoothness={3} position={[0, 0.74, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#fffaf2" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.37, -0.55]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 0.72, 12]} />
        <meshStandardMaterial color="#d5bdaf" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.37, 0.55]} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 0.72, 12]} />
        <meshStandardMaterial color="#d5bdaf" roughness={0.7} />
      </mesh>
      {[
        [-1.02, 0, -0.48],
        [-1.02, 0, 0.48],
        [1.02, 0, -0.48],
        [1.02, 0, 0.48],
      ].map(([sx, sy, sz], i) => (
        <group key={i} position={[sx, sy, sz]}>
          <mesh position={[0, 0.24, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.09, 0.44, 10]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.23, 0.23, 0.09, 16]} />
            <meshStandardMaterial color={stoolColors[i]} roughness={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VendingMachine({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const snackColors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc', '#fb7185'];

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.15, 2.15, 0.82]} radius={0.07} smoothness={3} position={[0, 1.08, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f28482" roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[1.18, 0.16, 0.85]} radius={0.04} smoothness={2} position={[0, 2.14, 0]} castShadow>
        <meshStandardMaterial color="#f6bd60" roughness={0.4} />
      </RoundedBox>
      <mesh position={[-0.14, 1.28, 0.39]}>
        <boxGeometry args={[0.72, 1.22, 0.06]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.55} roughness={0.2} />
      </mesh>
      {[0, 1, 2].map((row) => (
        <group key={row} position={[-0.14, 1.68 - row * 0.38, 0.425]}>
          <mesh position={[0, -0.09, 0]}>
            <boxGeometry args={[0.66, 0.025, 0.06]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          {[-0.22, -0.07, 0.08, 0.22].map((sx, col) => (
            <mesh key={col} position={[sx, 0, 0]} castShadow>
              <cylinderGeometry args={[0.042, 0.042, 0.14, 10]} />
              <meshStandardMaterial
                color={snackColors[(row * 4 + col) % snackColors.length]}
                roughness={0.35}
              />
            </mesh>
          ))}
        </group>
      ))}
      <RoundedBox args={[0.2, 0.42, 0.04]} radius={0.02} smoothness={2} position={[0.37, 1.35, 0.41]}>
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0.37, 1.46, 0.435]}>
        <planeGeometry args={[0.13, 0.08]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>
      <RoundedBox args={[0.74, 0.28, 0.08]} radius={0.03} smoothness={2} position={[-0.14, 0.38, 0.39]}>
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </RoundedBox>
    </group>
  );
}

function CoffeeStation({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.15, 0.92, 0.65]} radius={0.04} smoothness={2} position={[0, 0.46, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[1.2, 0.06, 0.7]} radius={0.02} smoothness={2} position={[0, 0.94, 0]} castShadow>
        <meshStandardMaterial color="#d5bdaf" roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[0.38, 0.42, 0.32]} radius={0.04} smoothness={2} position={[-0.25, 1.18, 0]} castShadow>
        <meshStandardMaterial color="#475569" roughness={0.4} />
      </RoundedBox>
      <mesh position={[-0.25, 1.06, 0.12]}>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 10]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <group position={[0.32, 0.97, 0]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.17, 0.28, 14]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.15, 0.36, 14]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.72} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

function CafeteriaCorner({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Warm cafe zone mat */}
      <RoundedBox args={[4.4, 0.025, 4.1]} radius={0.04} smoothness={2} position={[0.3, 0.012, -0.15]} receiveShadow>
        <meshStandardMaterial color="#fef3c7" roughness={0.95} />
      </RoundedBox>
      <VendingMachine position={[2.0, 0, -1.55]} rotation={[0, -Math.PI / 2, 0]} />
      <CoffeeStation position={[2.0, 0, 0.65]} rotation={[0, -Math.PI / 2, 0]} />
      {/* Round Bistro Table + 2 Stools */}
      <group position={[-0.95, 0, 0.25]}>
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.06, 20]} />
          <meshStandardMaterial color="#e6ccb2" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.22, 0.7, 12]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.5} />
        </mesh>
        {[
          [-0.78, 0, -0.35],
          [0.72, 0, 0.42],
        ].map(([sx, sy, sz], i) => (
          <group key={i} position={[sx, sy, sz]}>
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.08, 0.44, 10]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.21, 0.21, 0.08, 16]} />
              <meshStandardMaterial color={i === 0 ? '#fbbf24' : '#38bdf8'} roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function LoungeArea() {
  return (
    <group position={[0.0, 0, 5.25]}>
      <RoundedBox args={[4.8, 0.03, 2.75]} radius={0.04} smoothness={2} position={[0, 0.015, 0]} receiveShadow>
        <meshStandardMaterial color="#f6e2d3" roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, 2.4]} />
        <meshStandardMaterial color="#faece2" roughness={0.95} />
      </mesh>

      {/* Main 3-seater mint sofa at back */}
      <group position={[0, 0, 0.92]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[2.35, 0.38, 0.82]} radius={0.08} smoothness={3} position={[0, 0.24, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#95d5b2" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[2.35, 0.56, 0.24]} radius={0.08} smoothness={3} position={[0, 0.56, -0.3]} castShadow receiveShadow>
          <meshStandardMaterial color="#74c69d" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.22, 0.45, 0.82]} radius={0.07} smoothness={2} position={[-1.08, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#74c69d" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.22, 0.45, 0.82]} radius={0.07} smoothness={2} position={[1.08, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#74c69d" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.36, 0.32, 0.14]} radius={0.06} smoothness={2} position={[-0.65, 0.56, -0.09]} rotation={[0.18, 0.2, 0.1]} castShadow>
          <meshStandardMaterial color="#fde68a" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[0.36, 0.32, 0.14]} radius={0.06} smoothness={2} position={[0.65, 0.56, -0.09]} rotation={[0.18, -0.25, -0.1]} castShadow>
          <meshStandardMaterial color="#fecdd3" roughness={0.9} />
        </RoundedBox>
      </group>

      {/* Cozy Peach Armchair Left */}
      <group position={[-1.72, 0, -0.15]} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[0.95, 0.38, 0.82]} radius={0.08} smoothness={3} position={[0, 0.24, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#fbcfe8" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.95, 0.54, 0.22]} radius={0.08} smoothness={3} position={[0, 0.54, -0.3]} castShadow>
          <meshStandardMaterial color="#f9a8d4" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.42, 0.82]} radius={0.06} smoothness={2} position={[-0.42, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#f9a8d4" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.42, 0.82]} radius={0.06} smoothness={2} position={[0.42, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#f9a8d4" roughness={0.85} />
        </RoundedBox>
      </group>

      {/* Cozy Sky Armchair Right */}
      <group position={[1.72, 0, -0.15]} rotation={[0, -Math.PI / 2, 0]}>
        <RoundedBox args={[0.95, 0.38, 0.82]} radius={0.08} smoothness={3} position={[0, 0.24, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#bae6fd" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.95, 0.54, 0.22]} radius={0.08} smoothness={3} position={[0, 0.54, -0.3]} castShadow>
          <meshStandardMaterial color="#7dd3fc" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.42, 0.82]} radius={0.06} smoothness={2} position={[-0.42, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#7dd3fc" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.42, 0.82]} radius={0.06} smoothness={2} position={[0.42, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#7dd3fc" roughness={0.85} />
        </RoundedBox>
      </group>

      {/* Round Wooden Coffee Table */}
      <group position={[0, 0, -0.15]}>
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.06, 20]} />
          <meshStandardMaterial color="#e6ccb2" roughness={0.65} />
        </mesh>
        {[
          [-0.28, 0.18, -0.28],
          [0.28, 0.18, -0.28],
          [0, 0.18, 0.32],
        ].map(([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]} castShadow>
            <cylinderGeometry args={[0.032, 0.024, 0.36, 8]} />
            <meshStandardMaterial color="#b08968" roughness={0.75} />
          </mesh>
        ))}
        <mesh position={[-0.14, 0.405, 0.08]} rotation={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.02, 0.3]} />
          <meshStandardMaterial color="#c7d2fe" roughness={0.6} />
        </mesh>
        <mesh position={[0.18, 0.44, -0.06]} castShadow>
          <cylinderGeometry args={[0.048, 0.042, 0.1, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/** LEVEL 2 EXPANSION: Startup Right Wing (Meeting Table, Live Wall TV Dashboard, Glow Decor) */
function StartupExpansionWing() {
  const bar1Ref = useRef<THREE.Mesh>(null);
  const bar2Ref = useRef<THREE.Mesh>(null);
  const bar3Ref = useRef<THREE.Mesh>(null);
  const bar4Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (bar1Ref.current) bar1Ref.current.scale.y = 0.75 + Math.sin(t * 2.1) * 0.22;
    if (bar2Ref.current) bar2Ref.current.scale.y = 0.85 + Math.cos(t * 2.4) * 0.2;
    if (bar3Ref.current) bar3Ref.current.scale.y = 0.7 + Math.sin(t * 1.8 + 1) * 0.25;
    if (bar4Ref.current) bar4Ref.current.scale.y = 0.9 + Math.cos(t * 2.2 + 2) * 0.18;
  });

  const stoolColors = ['#6366f1', '#0ea5e9', '#f43f5e', '#10b981'];

  return (
    <group>
      {/* Expanded Right Wing Base Slab & Floor */}
      <RoundedBox args={[4.4, 0.55, 15.4]} radius={0.12} smoothness={3} position={[13.2, -0.29, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#dfd3c3" roughness={0.85} />
      </RoundedBox>
      <mesh position={[13.15, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.3, 15.0]} />
        <meshStandardMaterial color="#f2e8da" roughness={0.85} />
      </mesh>

      {/* Extended Back Wall */}
      <group position={[13.2, 1.65, -7.55]}>
        <RoundedBox args={[4.4, 3.3, 0.26]} radius={0.04} smoothness={2} receiveShadow castShadow>
          <meshStandardMaterial color="#faf5ec" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, -1.53, 0.145]}>
          <boxGeometry args={[4.3, 0.22, 0.04]} />
          <meshStandardMaterial color="#e5dac7" roughness={0.8} />
        </mesh>

        {/* Big Animated Wall Dashboard TV */}
        <group position={[0, 0.2, 0.16]}>
          <RoundedBox args={[2.55, 1.38, 0.08]} radius={0.04} smoothness={2} castShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.35} />
          </RoundedBox>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[2.35, 1.18]} />
            <meshStandardMaterial color="#0f172a" emissive="#1e1b4b" emissiveIntensity={0.7} />
          </mesh>
          <mesh ref={bar1Ref} position={[-0.7, -0.05, 0.055]}>
            <boxGeometry args={[0.28, 0.68, 0.02]} />
            <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={0.9} />
          </mesh>
          <mesh ref={bar2Ref} position={[-0.24, -0.02, 0.055]}>
            <boxGeometry args={[0.28, 0.78, 0.02]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.9} />
          </mesh>
          <mesh ref={bar3Ref} position={[0.24, -0.08, 0.055]}>
            <boxGeometry args={[0.28, 0.6, 0.02]} />
            <meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={0.9} />
          </mesh>
          <mesh ref={bar4Ref} position={[0.7, 0.02, 0.055]}>
            <boxGeometry args={[0.28, 0.85, 0.02]} />
            <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.9} />
          </mesh>
        </group>
      </group>

      {/* Front & Right Cutaway Curbs for Expanded Wing */}
      <mesh position={[13.15, 0.06, 7.5]} receiveShadow>
        <boxGeometry args={[4.3, 0.12, 0.12]} />
        <meshStandardMaterial color="#e5dac7" roughness={0.8} />
      </mesh>
      <mesh position={[15.3, 0.06, 0]} receiveShadow>
        <boxGeometry args={[0.12, 0.12, 15.1]} />
        <meshStandardMaterial color="#e5dac7" roughness={0.8} />
      </mesh>

      {/* Startup Meeting Table & 4 Colored Stools */}
      <group position={[13.1, 0, -1.5]}>
        <RoundedBox args={[2.8, 0.025, 4.2]} radius={0.04} smoothness={2} position={[0, 0.012, 0]} receiveShadow>
          <meshStandardMaterial color="#e0e7ff" roughness={0.95} />
        </RoundedBox>
        <RoundedBox args={[1.55, 0.08, 2.75]} radius={0.08} smoothness={3} position={[0, 0.76, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#fffaf2" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.38, -0.75]} castShadow>
          <cylinderGeometry args={[0.07, 0.14, 0.74, 12]} />
          <meshStandardMaterial color="#d5bdaf" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.38, 0.75]} castShadow>
          <cylinderGeometry args={[0.07, 0.14, 0.74, 12]} />
          <meshStandardMaterial color="#d5bdaf" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.81, 0]} castShadow>
          <boxGeometry args={[0.76, 0.015, 1.1]} />
          <meshStandardMaterial color="#dbeafe" roughness={0.6} />
        </mesh>
        <RoundedBox args={[0.3, 0.03, 0.22]} radius={0.01} smoothness={2} position={[0.2, 0.82, 0.82]} castShadow>
          <meshStandardMaterial color="#334155" />
        </RoundedBox>
        {[
          [-1.08, 0, -0.65],
          [-1.08, 0, 0.65],
          [1.08, 0, -0.65],
          [1.08, 0, 0.65],
        ].map(([sx, sy, sz], i) => (
          <group key={i} position={[sx, sy, sz]}>
            <mesh position={[0, 0.24, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.09, 0.44, 10]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 0.48, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.09, 16]} />
              <meshStandardMaterial color={stoolColors[i]} roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Left-Wall Glowing Startup Accent Bar */}
      <group position={[-10.89, 2.45, -1.5]}>
        <RoundedBox args={[0.06, 0.34, 1.85]} radius={0.03} smoothness={2}>
          <meshStandardMaterial
            color="#6366f1"
            emissive="#6366f1"
            emissiveIntensity={0.85}
          />
        </RoundedBox>
        <pointLight position={[0.35, 0, 0]} color="#818cf8" intensity={0.75} distance={3.5} />
      </group>

      {/* Extra Startup Potted Plants */}
      <PottedPlant position={[14.5, 0, -6.4]} scale={1.0} potColor="#a5b4fc" />
      <PottedPlant position={[14.5, 0, 6.4]} scale={1.1} potColor="#fde68a" />
    </group>
  );
}

/** LEVEL 3 EXPANSION: 2nd Story Glass Mezzanine, Staircase, AI Server Core & Sky Garden */
function SecondFloorPlaza() {
  const crystalRef = useRef<THREE.Mesh>(null);
  const serverLedRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 1.1;
      crystalRef.current.position.y = 1.18 + Math.sin(t * 2.4) * 0.08;
    }
    if (serverLedRef.current) {
      serverLedRef.current.emissiveIntensity = 1.0 + Math.sin(t * 5.5) * 0.45;
    }
  });

  const floorY = 3.35;

  return (
    <group>
      {/* Architectural Support Columns */}
      {[
        [11.3, floorY / 2, 2.8],
        [14.9, floorY / 2, 2.8],
        [14.9, floorY / 2, -6.9],
      ].map(([cx, cy, cz], idx) => (
        <mesh key={idx} position={[cx, cy, cz]} castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.12, floorY, 12]} />
          <meshStandardMaterial color="#e2d7c5" roughness={0.55} />
        </mesh>
      ))}

      {/* Floating Wooden Staircase leading from ground floor to 2nd Floor Plaza */}
      <group position={[14.2, 0, 6.3]}>
        {Array.from({ length: 11 }).map((_, i) => (
          <RoundedBox
            key={i}
            args={[0.96, 0.09, 0.3]}
            radius={0.02}
            smoothness={2}
            position={[0, 0.25 + i * 0.3, -i * 0.3]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#deb887" roughness={0.65} />
          </RoundedBox>
        ))}
        <mesh position={[0.5, 1.8, -1.5]} rotation={[-0.78, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 4.35, 0.07]} />
          <meshStandardMaterial color="#6366f1" roughness={0.35} />
        </mesh>
      </group>

      {/* 2nd Floor Mezzanine Deck (above the right Startup wing) */}
      <group position={[13.2, floorY, -2.0]}>
        <RoundedBox args={[4.1, 0.24, 10.2]} radius={0.06} smoothness={2} position={[0, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f6efe4" roughness={0.65} />
        </RoundedBox>
        <mesh position={[0, 0.02, 5.12]}>
          <boxGeometry args={[4.1, 0.07, 0.04]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.45} roughness={0.3} />
        </mesh>
        <mesh position={[-2.06, 0.02, 0]}>
          <boxGeometry args={[0.04, 0.07, 10.2]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.45} roughness={0.3} />
        </mesh>

        {/* 2nd Floor Cutaway Back Wall */}
        <RoundedBox args={[4.1, 2.35, 0.24]} radius={0.04} smoothness={2} position={[0, 1.2, -5.0]} castShadow receiveShadow>
          <meshStandardMaterial color="#eef2ff" roughness={0.85} />
        </RoundedBox>
        {/* Glowing Golden-Indigo Rooftop Beacon */}
        <RoundedBox args={[2.3, 0.44, 0.14]} radius={0.05} smoothness={2} position={[0, 2.52, -5.0]} castShadow>
          <meshStandardMaterial color="#4f46e5" emissive="#6366f1" emissiveIntensity={0.85} />
        </RoundedBox>
        <mesh position={[0, 2.52, -4.91]}>
          <boxGeometry args={[1.85, 0.15, 0.03]} />
          <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.6} />
        </mesh>

        {/* Glass Balcony Railings */}
        <mesh position={[-1.98, 0.56, 0]}>
          <boxGeometry args={[0.05, 0.85, 9.95]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.38} roughness={0.1} />
        </mesh>
        <mesh position={[-1.98, 1.0, 0]}>
          <boxGeometry args={[0.07, 0.06, 10.05]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.25} />
        </mesh>
        <mesh position={[-0.5, 0.56, 5.04]}>
          <boxGeometry args={[3.0, 0.85, 0.05]} />
          <meshStandardMaterial color="#bae6fd" transparent opacity={0.38} roughness={0.1} />
        </mesh>
        <mesh position={[-0.5, 1.0, 5.04]}>
          <boxGeometry args={[3.05, 0.06, 0.07]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.25} />
        </mesh>

        {/* 2 Glowing AI Core Server Racks on 2nd Floor */}
        {[-0.9, 0.55].map((sx, idx) => (
          <group key={idx} position={[sx, 0.12, -3.7]}>
            <RoundedBox args={[0.92, 1.85, 0.78]} radius={0.05} smoothness={2} position={[0, 0.92, 0]} castShadow>
              <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.25} />
            </RoundedBox>
            {[0, 1, 2, 3, 4].map((row) => (
              <mesh key={row} position={[0, 1.56 - row * 0.28, 0.4]}>
                <boxGeometry args={[0.7, 0.08, 0.02]} />
                <meshStandardMaterial
                  ref={idx === 0 && row === 0 ? serverLedRef : undefined}
                  color={row % 2 === 0 ? '#38bdf8' : '#34d399'}
                  emissive={row % 2 === 0 ? '#0ea5e9' : '#10b981'}
                  emissiveIntensity={1.15}
                />
              </mesh>
            ))}
          </group>
        ))}

        {/* Golden Trophy / AI Core Crystal Pedestal */}
        <group position={[-0.35, 0.12, 0.8]}>
          <mesh position={[0, 0.38, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.5, 0.76, 16]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <cylinderGeometry args={[0.36, 0.36, 0.05, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh ref={crystalRef} position={[0, 1.18, 0]} castShadow>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.35}
              metalness={0.4}
              roughness={0.15}
            />
          </mesh>
          <pointLight position={[0, 1.25, 0]} color="#fbbf24" intensity={1.3} distance={4.5} />
        </group>

        {/* Rooftop Sky Garden Planters */}
        <PottedPlant position={[1.15, 0.12, 0.5]} scale={0.85} potColor="#6366f1" />
        <PottedPlant position={[-1.05, 0.12, 3.6]} scale={0.78} potColor="#34d399" />
      </group>
    </group>
  );
}

const SPECIALIST_IDS: Exclude<AgentId, 'sef'>[] = [
  'arastirmaci',
  'icerikci',
  'yazilimci',
  'siberci',
];

function DataBeamArc({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const orbRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let k = 0; k < 4; k++) {
      const mesh = orbRefs.current[k];
      if (!mesh) continue;
      const p = (t * 0.55 + k * 0.25) % 1;
      const x = start[0] + (end[0] - start[0]) * p;
      const z = start[2] + (end[2] - start[2]) * p;
      const y = 1.18 + Math.sin(p * Math.PI) * 2.45;
      mesh.position.set(x, y, z);
      const s = 0.7 + Math.sin(p * Math.PI) * 0.55;
      mesh.scale.setScalar(s);
    }
  });

  return (
    <group>
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          ref={(el) => {
            orbRefs.current[k] = el;
          }}
          position={[start[0], 1.2, start[2]]}
        >
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={color}
            emissiveIntensity={2.1}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function TaskDataBeams({
  agentStates,
  agentEngines,
}: {
  agentStates: Record<AgentId, AgentRuntimeState>;
  agentEngines: Record<AgentId, EngineId>;
}) {
  const hubRingRef = useRef<THREE.Mesh>(null);
  const start = AGENTS.sef.deskPosition;

  const activeSpecialists = SPECIALIST_IDS.filter(
    (id) =>
      agentStates?.[id]?.activity === 'working' ||
      agentStates?.[id]?.activity === 'walking_to_desk',
  );
  const isSauronCommanding =
    agentStates?.sef?.activity === 'working' || activeSpecialists.length > 0;

  useFrame(({ clock }) => {
    if (hubRingRef.current) {
      const t = clock.getElapsedTime();
      const pulse = 1 + Math.sin(t * 4.2) * 0.12;
      hubRingRef.current.scale.set(pulse, pulse, 1);
      hubRingRef.current.rotation.z = t * 1.1;
    }
  });

  return (
    <group>
      {isSauronCommanding && (
        <mesh
          ref={hubRingRef}
          position={[start[0], 0.03, start[2] - 0.35]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.18, 1.32, 24]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.72} side={THREE.DoubleSide} />
        </mesh>
      )}
      {activeSpecialists.map((id) => (
        <DataBeamArc
          key={id}
          start={start}
          end={AGENTS[id].deskPosition}
          color={ENGINE_META[agentEngines[id]].color}
        />
      ))}
    </group>
  );
}

const THEME_PALETTE: Record<
  SceneTheme,
  {
    slab: string;
    floor: string;
    grid1: string;
    grid2: string;
    backWall: string;
    leftWall: string;
    baseboard: string;
    carpets: [string, string, string];
    windowGlass: string;
    windowEmissive: string;
    windowIntensity: number;
  }
> = {
  day: {
    slab: '#dfd3c3',
    floor: '#f5ecdf',
    grid1: '#e5d9c6',
    grid2: '#ece2d3',
    backWall: '#faf5ec',
    leftWall: '#eef3ec',
    baseboard: '#e5dac7',
    carpets: ['#eef2ff', '#f5f3ff', '#e0f2fe'],
    windowGlass: '#cfe8ff',
    windowEmissive: '#bae6fd',
    windowIntensity: 0.45,
  },
  sunset: {
    slab: '#d7c1ad',
    floor: '#f5e4d3',
    grid1: '#e4ccb6',
    grid2: '#ecd7c3',
    backWall: '#fbf0e4',
    leftWall: '#f3e6da',
    baseboard: '#dfc8b2',
    carpets: ['#e8eafd', '#f1eafe', '#dceefa'],
    windowGlass: '#fed7aa',
    windowEmissive: '#fb923c',
    windowIntensity: 0.85,
  },
  night: {
    slab: '#1e293b',
    floor: '#243044',
    grid1: '#334155',
    grid2: '#2a364b',
    backWall: '#1e293b',
    leftWall: '#1b2638',
    baseboard: '#334155',
    carpets: ['#293256', '#332954', '#1d3b53'],
    windowGlass: '#1e3a8a',
    windowEmissive: '#3b82f6',
    windowIntensity: 1.05,
  },
};

interface OfficeEnvironmentProps {
  agentStates: Record<AgentId, AgentRuntimeState>;
  agentEngines: Record<AgentId, EngineId>;
  progression: ProgressionState;
  officeLevel: OfficeLevel;
  sceneTheme: SceneTheme;
}

export function OfficeEnvironment({
  agentStates,
  agentEngines,
  progression,
  officeLevel,
  sceneTheme,
}: OfficeEnvironmentProps) {
  const isNight = sceneTheme === 'night';
  const palette = THEME_PALETTE[sceneTheme];
  const isGeminiWingActive =
    agentStates?.sef?.activity === 'working' || agentStates?.icerikci?.activity === 'working';
  const isQwenWingActive = agentStates?.arastirmaci?.activity === 'working';
  const isDeepSeekWingActive =
    agentStates?.yazilimci?.activity === 'working' || agentStates?.siberci?.activity === 'working';

  return (
    <group>
      {/* Floating Isometric Base Slab (Huge 3-Wing Campus 22 x 15) */}
      <RoundedBox args={[22.4, 0.55, 15.4]} radius={0.12} smoothness={3} position={[0, -0.29, 0]} receiveShadow castShadow>
        <meshStandardMaterial color={palette.slab} roughness={0.85} />
      </RoundedBox>

      {/* Main Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 15]} />
        <meshStandardMaterial color={palette.floor} roughness={0.85} />
      </mesh>

      {/* Subtle architectural floor grid lines scaled to 22 x 15 */}
      <gridHelper args={[22, 22, palette.grid1, palette.grid2]} position={[0, 0.004, 0]} scale={[1, 1, 15 / 22]} />

      {/* 3 Distinct Office Wing Floor Carpets (z: -7.1 .. +1.0) */}
      {/* Left Wing: Gemini Ofisi */}
      <mesh position={[-7.25, 0.008, -3.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.4, 8.2]} />
        <meshStandardMaterial color={palette.carpets[0]} roughness={0.94} />
      </mesh>
      {/* Center Wing: Qwen Stüdyosu */}
      <mesh position={[0, 0.008, -3.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.6, 8.2]} />
        <meshStandardMaterial color={palette.carpets[1]} roughness={0.94} />
      </mesh>
      {/* Right Wing: DeepSeek Lab */}
      <mesh position={[7.25, 0.008, -3.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.4, 8.2]} />
        <meshStandardMaterial color={palette.carpets[2]} roughness={0.94} />
      </mesh>

      {/* Cyber Neon Floor Accent Strips in Night Mode */}
      {isNight && (
        <>
          <mesh position={[-7.25, 0.011, 0.98]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.2, 0.07]} />
            <meshBasicMaterial color={ENGINE_META.gemini.color} />
          </mesh>
          <mesh position={[0, 0.011, 0.98]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.07]} />
            <meshBasicMaterial color={ENGINE_META.qwen.color} />
          </mesh>
          <mesh position={[7.25, 0.011, 0.98]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.2, 0.07]} />
            <meshBasicMaterial color={ENGINE_META.deepseek.color} />
          </mesh>
        </>
      )}

      {/* Two Cutaway Glass & Wood Partition Walls separating the 3 Wings */}
      <GlassPartitionWall position={[-3.7, 0, -3.15]} accentColor="#818cf8" />
      <GlassPartitionWall position={[3.7, 0, -3.15]} accentColor="#38bdf8" />

      {/* Half-Cutaway Back Wall (z = -7.55) */}
      <group position={[0, 1.65, -7.55]}>
        <RoundedBox args={[22.2, 3.3, 0.26]} radius={0.04} smoothness={2} receiveShadow castShadow>
          <meshStandardMaterial color={palette.backWall} roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, -1.53, 0.145]}>
          <boxGeometry args={[22.0, 0.22, 0.04]} />
          <meshStandardMaterial color={palette.baseboard} roughness={0.8} />
        </mesh>

        {/* Wing 1 Sign: GEMINI OFİSİ */}
        <WallSignBoard
          position={[-7.0, 0.96, 0.16]}
          title="✦ GEMINI OFİSİ"
          subtitle="CEO Sauron & İçerik Stüdyosu"
          color={ENGINE_META.gemini.color}
          isActive={isGeminiWingActive || isNight}
        />

        {/* Pastel Window in Gemini Wing */}
        <group position={[-9.5, -0.32, 0.15]}>
          <RoundedBox args={[2.25, 1.42, 0.08]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color={palette.baseboard} roughness={0.7} />
          </RoundedBox>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[2.0, 1.2]} />
            <meshStandardMaterial
              color={palette.windowGlass}
              emissive={palette.windowEmissive}
              emissiveIntensity={palette.windowIntensity}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <boxGeometry args={[0.06, 1.22, 0.03]} />
            <meshStandardMaterial color={isNight ? '#475569' : '#ffffff'} />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <boxGeometry args={[2.04, 0.06, 0.03]} />
            <meshStandardMaterial color={isNight ? '#475569' : '#ffffff'} />
          </mesh>
        </group>

        {/* Wing 2 Sign: QWEN STÜDYOSU */}
        <WallSignBoard
          position={[0, 0.96, 0.16]}
          title="◈ QWEN STÜDYOSU"
          subtitle="Araştırma & Trend Analizi"
          color={ENGINE_META.qwen.color}
          isActive={isQwenWingActive || isNight}
        />

        {/* Team Whiteboard with Sticky Notes below Qwen Sign */}
        <group position={[0, -0.32, 0.15]}>
          <RoundedBox args={[2.35, 1.32, 0.06]} radius={0.03} smoothness={2} castShadow>
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[2.18, 1.15]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          {[
            { pos: [-0.74, 0.28, 0.045] as [number, number, number], color: '#a5b4fc' },
            { pos: [-0.26, 0.24, 0.045] as [number, number, number], color: '#7dd3fc' },
            { pos: [0.24, 0.29, 0.045] as [number, number, number], color: '#fda4af' },
            { pos: [0.74, 0.22, 0.045] as [number, number, number], color: '#6ee7b7' },
            { pos: [-0.5, -0.18, 0.045] as [number, number, number], color: '#fde68a' },
            { pos: [0.06, -0.22, 0.045] as [number, number, number], color: '#c4b5fd' },
            { pos: [0.6, -0.15, 0.045] as [number, number, number], color: '#99f6e4' },
          ].map((note, idx) => (
            <mesh key={idx} position={note.pos}>
              <planeGeometry args={[0.3, 0.24]} />
              <meshStandardMaterial color={note.color} roughness={0.8} />
            </mesh>
          ))}
        </group>

        {/* Wing 3 Sign: DEEPSEEK LAB */}
        <WallSignBoard
          position={[7.25, 0.96, 0.16]}
          title="⌘ DEEPSEEK LAB"
          subtitle="Yazılım & Siber Güvenlik"
          color={ENGINE_META.deepseek.color}
          isActive={isDeepSeekWingActive || isNight}
        />
      </group>

      {/* Half-Cutaway Left Wall (x = -11.05) */}
      <group position={[-11.05, 1.65, 0]}>
        <RoundedBox args={[0.26, 3.3, 15.2]} radius={0.04} smoothness={2} receiveShadow castShadow>
          <meshStandardMaterial color={palette.leftWall} roughness={0.9} />
        </RoundedBox>
        <mesh position={[0.145, -1.53, 0]}>
          <boxGeometry args={[0.04, 0.22, 15.0]} />
          <meshStandardMaterial color={palette.baseboard} roughness={0.8} />
        </mesh>

        {/* Wall Shelf with Books */}
        <group position={[0.25, 0.35, -2.5]}>
          <RoundedBox args={[0.32, 0.07, 1.9]} radius={0.02} smoothness={2} castShadow>
            <meshStandardMaterial color="#d9bc9b" roughness={0.7} />
          </RoundedBox>
          {[
            { z: -0.65, h: 0.32, c: '#818cf8' },
            { z: -0.53, h: 0.26, c: '#fb7185' },
            { z: -0.42, h: 0.35, c: '#38bdf8' },
            { z: -0.3, h: 0.28, c: '#34d399' },
            { z: 0.35, h: 0.3, c: '#fbbf24' },
            { z: 0.47, h: 0.25, c: '#a78bfa' },
          ].map((b, i) => (
            <mesh key={i} position={[0, b.h / 2 + 0.035, b.z]} castShadow>
              <boxGeometry args={[0.2, b.h, 0.09]} />
              <meshStandardMaterial color={b.c} roughness={0.65} />
            </mesh>
          ))}
        </group>

        {/* Minimalist Pastel Wall Clock */}
        <group position={[0.15, 0.65, 3.2]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.06, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.33, 0.38, 24]} />
            <meshStandardMaterial color="#6366f1" />
          </mesh>
          <mesh position={[0, 0.04, -0.09]}>
            <boxGeometry args={[0.025, 0.015, 0.18]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.08, 0.04, 0.02]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.025, 0.015, 0.16]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      </group>

      {/* Low cutaway curb along front (and right edge when Level 1) */}
      <mesh position={[0, 0.06, 7.5]} receiveShadow>
        <boxGeometry args={[22.1, 0.12, 0.12]} />
        <meshStandardMaterial color={palette.baseboard} roughness={0.8} />
      </mesh>
      {officeLevel === 1 && (
        <mesh position={[11.0, 0.06, 0]} receiveShadow>
          <boxGeometry args={[0.12, 0.12, 15.1]} />
          <meshStandardMaterial color={palette.baseboard} roughness={0.8} />
        </mesh>
      )}

      {/* 5 AI Agent Workstations across the 3 Wings */}
      {AGENT_ORDER.map((id) => (
        <Workstation
          key={id}
          agentId={id}
          engineId={agentEngines[id]}
          isActive={agentStates?.[id]?.activity === 'working'}
          agentLevel={getAgentLevelInfo(progression?.agents?.[id]?.xp ?? 0).level}
          officeLevel={officeLevel ?? 1}
          isNight={isNight}
        />
      ))}

      {/* Live 3D Task Data Beams from CEO Sauron to active wings */}
      <TaskDataBeams agentStates={agentStates} agentEngines={agentEngines} />

      {/* Wing-specific decorative props */}
      <CreativeMoodboard position={[-10.0, 0, -0.4]} />
      <ResearchBookshelf position={[2.45, 0, -0.5]} />
      <DevServerRack position={[9.7, 0, -6.1]} isActive={isDeepSeekWingActive || isNight} />
      <TelemetryConsole position={[9.6, 0, -0.7]} isActive={isDeepSeekWingActive || isNight} />

      {/* Front Common Campus Zones (z: +4.0 .. +7.2) */}
      <HuddleTableArea position={[-7.4, 0, 4.7]} />
      <LoungeArea />
      <CafeteriaCorner position={[7.6, 0, 4.8]} />

      {/* Low-Poly Potted Plants */}
      <PottedPlant position={[-10.2, 0, -6.6]} scale={1.15} potColor="#e6a587" />
      <PottedPlant position={[-10.2, 0, 6.5]} scale={1.0} potColor="#93c5fd" />
      <PottedPlant position={[-2.7, 0, -6.6]} scale={0.95} potColor="#c4b5fd" />
      <PottedPlant position={[10.2, 0, 6.6]} scale={1.05} potColor="#f9a8d4" />
      <PottedPlant position={[4.5, 0, 6.5]} scale={0.9} potColor="#a7f3d0" />

      {/* LEVEL 2+: Startup Wing Expansion */}
      {officeLevel >= 2 && <StartupExpansionWing />}

      {/* LEVEL 3: 2nd Story AI Plaza with Staircase, Server Core & Rooftop Garden */}
      {officeLevel >= 3 && <SecondFloorPlaza />}
    </group>
  );
}
