import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { AGENTS } from '../../constants/agents';
import type { AgentId, AgentRuntimeState } from '../../types';

interface AgentCharacterProps {
  agentId: AgentId;
  runtimeState: AgentRuntimeState;
  agentLevel: number;
  isSelected: boolean;
  onSelect: (id: AgentId) => void;
  overlayElRef: MutableRefObject<Record<AgentId, HTMLDivElement | null>>;
}

export function AgentCharacter({
  agentId,
  runtimeState,
  agentLevel,
  isSelected,
  onSelect,
  overlayElRef,
}: AgentCharacterProps) {
  const agent = AGENTS[agentId];
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);
  const haloRingRef = useRef<THREE.Mesh>(null);
  const levelStarRef = useRef<THREE.Mesh>(null);
  const legendHaloRef = useRef<THREE.Mesh>(null);
  const sauronEyeRef = useRef<THREE.Group>(null);
  const cyberShieldRef = useRef<THREE.Group>(null);

  const initialPos = useMemo(
    () => new THREE.Vector3(...agent.loungeAnchor),
    [agent.loungeAnchor],
  );
  const currentPos = useRef(initialPos.clone());
  const wanderTarget = useRef(initialPos.clone());
  const projectedVec = useMemo(() => new THREE.Vector3(), []);
  const nextWanderTime = useRef(2 + Math.random() * 4);
  const phaseOffset = useMemo(() => {
    const map: Record<AgentId, number> = {
      sef: 0,
      arastirmaci: 1.5,
      icerikci: 3.1,
      yazilimci: 4.7,
      siberci: 6.2,
    };
    return map[agentId];
  }, [agentId]);

  const isWorking = runtimeState.activity === 'working';
  const isMovingToDesk = runtimeState.activity === 'walking_to_desk';
  const isCompleted = runtimeState.activity === 'completed';

  useFrame(({ clock, camera, size }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime() + phaseOffset;

    if (!groupRef.current || !bodyRef.current || !headRef.current) return;

    // Determine desired target position
    const target = new THREE.Vector3();
    if (isMovingToDesk || isWorking || isCompleted) {
      target.set(...agent.seatPosition);
    } else {
      // Gentle wandering around lounge anchor when idle
      if (clock.getElapsedTime() > nextWanderTime.current) {
        nextWanderTime.current = clock.getElapsedTime() + 4.5 + Math.random() * 4.5;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.25;
        wanderTarget.current.set(
          THREE.MathUtils.clamp(
            agent.loungeAnchor[0] + Math.cos(angle) * radius,
            agent.loungeAnchor[0] - 0.45,
            agent.loungeAnchor[0] + 0.45,
          ),
          0,
          THREE.MathUtils.clamp(
            agent.loungeAnchor[2] + Math.sin(angle) * radius,
            agent.loungeAnchor[2] - 0.35,
            agent.loungeAnchor[2] + 0.35,
          ),
        );
      }
      target.copy(wanderTarget.current);
    }

    const dx = target.x - currentPos.current.x;
    const dz = target.z - currentPos.current.z;
    const dist = Math.hypot(dx, dz);

    const speed = isMovingToDesk || isWorking ? 5.2 : 0.85;
    const isActuallyWalking = dist > 0.06;

    if (isActuallyWalking) {
      const step = Math.min(dist, speed * delta);
      currentPos.current.x += (dx / dist) * step;
      currentPos.current.z += (dz / dist) * step;

      // Rotate smoothly toward walking direction
      const desiredRot = Math.atan2(dx, dz);
      const currentRot = groupRef.current.rotation.y;
      let diff = desiredRot - currentRot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 9);
    } else if (isWorking || isMovingToDesk || isCompleted) {
      // Face the desk monitor (+z)
      const desiredRot = agent.deskRotationY;
      let diff = desiredRot - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 8);
    } else {
      // Gentle idle look around toward center/camera
      const idleRot = -0.35 + Math.sin(t * 0.45) * 0.35;
      let diff = idleRot - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, delta * 2.5);
    }

    groupRef.current.position.set(currentPos.current.x, 0, currentPos.current.z);

    // Body bounce & limb animations
    if (isWorking && !isActuallyWalking) {
      // Energetic bounce + typing arm motion
      bodyRef.current.position.y = 0.05 + Math.abs(Math.sin(t * 6.5)) * 0.085;
      headRef.current.rotation.z = Math.sin(t * 3.2) * 0.08;
      headRef.current.rotation.x = 0.08 + Math.sin(t * 4.5) * 0.05;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -0.95 + Math.sin(t * 15) * 0.25;
        rightArmRef.current.rotation.x = -0.95 + Math.cos(t * 15) * 0.25;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    } else if (isCompleted && !isActuallyWalking) {
      // Happy celebration hop
      bodyRef.current.position.y = Math.abs(Math.sin(t * 7)) * 0.18;
      headRef.current.rotation.z = Math.sin(t * 6) * 0.1;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -2.2 + Math.sin(t * 8) * 0.2;
        rightArmRef.current.rotation.x = -2.2 - Math.sin(t * 8) * 0.2;
      }
    } else if (isActuallyWalking) {
      // Cute waddle walk
      const walkFreq = isMovingToDesk ? 12 : 6.5;
      bodyRef.current.position.y = Math.abs(Math.sin(t * walkFreq)) * 0.08;
      headRef.current.rotation.z = Math.sin(t * walkFreq) * 0.05;
      headRef.current.rotation.x = 0;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(t * walkFreq) * 0.45;
        rightArmRef.current.rotation.x = -Math.sin(t * walkFreq) * 0.45;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = -Math.sin(t * walkFreq) * 0.45;
        rightLegRef.current.rotation.x = Math.sin(t * walkFreq) * 0.45;
      }
    } else {
      // Calm breathing idle
      bodyRef.current.position.y = Math.sin(t * 2.2) * 0.028;
      headRef.current.rotation.z = Math.sin(t * 1.1) * 0.04;
      headRef.current.rotation.x = 0;
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(t * 1.8) * 0.06;
        rightArmRef.current.rotation.x = -Math.sin(t * 1.8) * 0.06;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }

    // Active glow aura ring animation
    if (auraRingRef.current) {
      const pulse = 1 + Math.sin(t * 5) * 0.14;
      auraRingRef.current.scale.set(pulse, pulse, 1);
      auraRingRef.current.rotation.z = t * 1.4;
    }
    if (haloRingRef.current) {
      haloRingRef.current.position.y = 0.55 + ((t * 0.7) % 0.9);
      const fade = 1 - ((t * 0.7) % 0.9) / 0.9;
      const mat = haloRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isWorking ? fade * 0.65 : 0;
    }
    if (levelStarRef.current) {
      levelStarRef.current.rotation.y = t * 2.2;
      levelStarRef.current.position.y = 1.56 + Math.sin(t * 3.5) * 0.05;
    }
    if (legendHaloRef.current) {
      legendHaloRef.current.rotation.z = t * 1.4;
      legendHaloRef.current.position.y = 1.66 + Math.sin(t * 2.6) * 0.03;
    }
    if (sauronEyeRef.current) {
      sauronEyeRef.current.position.y = 0.16 + Math.sin(t * 2.8) * 0.015;
      sauronEyeRef.current.rotation.y = Math.sin(t * 1.4) * 0.25;
    }
    if (cyberShieldRef.current) {
      cyberShieldRef.current.position.y = 0.64 + Math.sin(t * 3.1) * 0.04;
      cyberShieldRef.current.rotation.y = t * (isWorking ? 2.4 : 0.9);
    }

    // Project 3D head anchor to 2D canvas coordinates for zero-error native HTML overlay
    const el = overlayElRef.current[agentId];
    if (el) {
      projectedVec.set(
        currentPos.current.x,
        1.92 + bodyRef.current.position.y,
        currentPos.current.z,
      );
      projectedVec.project(camera);
      const screenX = (projectedVec.x * 0.5 + 0.5) * size.width;
      const screenY = (-projectedVec.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.opacity = '1';
    }
  });

  return (
    <group
      ref={groupRef}
      position={[agent.loungeAnchor[0], 0, agent.loungeAnchor[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agentId);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Active / Selected Floor Ring */}
      {(isWorking || isSelected || isCompleted) && (
        <mesh
          ref={auraRingRef}
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.45, 0.62, 24]} />
          <meshBasicMaterial
            color={agent.color}
            transparent
            opacity={isWorking ? 0.85 : 0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Rising glow pulse ring while working */}
      <mesh
        ref={haloRingRef}
        position={[0, 0.6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={isWorking}
      >
        <ringGeometry args={[0.42, 0.5, 24]} />
        <meshBasicMaterial color={agent.color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Cute Low-Poly Robot Body */}
      <group ref={bodyRef}>
        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.13, 0.18, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.13, 0.18, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.16, 4, 8]} />
          <meshStandardMaterial color="#475569" roughness={0.5} />
        </mesh>

        {/* Torso */}
        <RoundedBox
          args={[0.5, 0.52, 0.36]}
          radius={0.12}
          smoothness={3}
          position={[0, 0.56, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={agent.color} roughness={0.35} />
        </RoundedBox>

        {/* Chest Panel */}
        <RoundedBox
          args={[0.32, 0.24, 0.06]}
          radius={0.04}
          smoothness={2}
          position={[0, 0.58, 0.17]}
        >
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </RoundedBox>
        {/* Chest Status Core LED */}
        <mesh position={[0, 0.58, 0.21]}>
          <circleGeometry args={[0.065, 16]} />
          <meshStandardMaterial
            color={isWorking ? '#fef08a' : agentLevel >= 2 ? '#fbbf24' : agent.color}
            emissive={isWorking ? '#facc15' : agentLevel >= 2 ? '#f59e0b' : agent.color}
            emissiveIntensity={isWorking ? 1.8 : agentLevel >= 2 ? 1.0 : 0.6}
          />
        </mesh>

        {/* Level 2+ Uzman: Golden Collar Trim */}
        {agentLevel >= 2 && (
          <mesh position={[0, 0.83, 0]} castShadow>
            <cylinderGeometry args={[0.17, 0.2, 0.065, 14]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.55} roughness={0.25} />
          </mesh>
        )}

        {/* Level 3+ Kıdemli: Floating Orbiting Star Badge */}
        {agentLevel >= 3 && (
          <mesh ref={levelStarRef} position={[0.38, 1.56, 0.12]} castShadow>
            <octahedronGeometry args={[0.085, 0]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={1.25}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
        )}

        {/* Level 4+ Lider / Efsane: Golden Floating Halo */}
        {agentLevel >= 4 && (
          <mesh ref={legendHaloRef} position={[0, 1.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.025, 8, 24]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f59e0b"
              emissiveIntensity={agentLevel >= 5 ? 1.8 : 1.1}
              metalness={0.5}
              roughness={0.2}
            />
          </mesh>
        )}

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.33, 0.58, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.22, 4, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.33, 0.58, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.22, 4, 8]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>

        {/* Head Group */}
        <group ref={headRef} position={[0, 1.08, 0]}>
          {/* Main Rounded Robot Head */}
          <RoundedBox
            args={[0.56, 0.44, 0.46]}
            radius={0.14}
            smoothness={3}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </RoundedBox>

          {/* Colored Cap / Rim */}
          <RoundedBox
            args={[0.58, 0.12, 0.48]}
            radius={0.05}
            smoothness={2}
            position={[0, 0.18, 0]}
            castShadow
          >
            <meshStandardMaterial color={agent.color} roughness={0.35} />
          </RoundedBox>

          {/* Dark Glossy Face Visor */}
          <RoundedBox
            args={[0.42, 0.22, 0.06]}
            radius={0.06}
            smoothness={2}
            position={[0, -0.01, 0.21]}
          >
            <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.2} />
          </RoundedBox>

          {/* Glowing Expressive LED Eyes */}
          <mesh position={[-0.1, 0, 0.245]}>
            <sphereGeometry args={[0.044, 12, 12]} />
            <meshStandardMaterial
              color={isWorking ? '#fde047' : agentId === 'siberci' ? '#22d3ee' : '#38bdf8'}
              emissive={isWorking ? '#facc15' : agentId === 'siberci' ? '#22d3ee' : '#38bdf8'}
              emissiveIntensity={isWorking ? 2.0 : 1.3}
            />
          </mesh>
          <mesh position={[0.1, 0, 0.245]}>
            <sphereGeometry args={[0.044, 12, 12]} />
            <meshStandardMaterial
              color={isWorking ? '#fde047' : agentId === 'siberci' ? '#22d3ee' : '#38bdf8'}
              emissive={isWorking ? '#facc15' : agentId === 'siberci' ? '#22d3ee' : '#38bdf8'}
              emissiveIntensity={isWorking ? 2.0 : 1.3}
            />
          </mesh>

          {/* Role-Specific Cute Accessories */}
          {agentId === 'sef' && (
            /* CEO Sauron: Twin-Spire Obsidian Crown cradling the Fiery Eye */
            <group position={[0, 0.25, 0]}>
              <mesh position={[0, 0.02, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.16, 0.05, 12]} />
                <meshStandardMaterial color="#18181b" metalness={0.55} roughness={0.3} />
              </mesh>
              <mesh position={[-0.11, 0.14, 0]} rotation={[0, 0, -0.18]} castShadow>
                <coneGeometry args={[0.035, 0.22, 6]} />
                <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.28} />
              </mesh>
              <mesh position={[0.11, 0.14, 0]} rotation={[0, 0, 0.18]} castShadow>
                <coneGeometry args={[0.035, 0.22, 6]} />
                <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.28} />
              </mesh>
              <group ref={sauronEyeRef} position={[0, 0.16, 0.01]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.088, 16, 16]} />
                  <meshStandardMaterial
                    color="#f97316"
                    emissive="#fb923c"
                    emissiveIntensity={isWorking ? 2.1 : 1.25}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0, 0, 0.072]}>
                  <boxGeometry args={[0.022, 0.115, 0.03]} />
                  <meshStandardMaterial color="#09090b" roughness={0.1} />
                </mesh>
              </group>
            </group>
          )}

          {agentId === 'arastirmaci' && (
            /* Araştırmacı: Radar Dish Antenna */
            <group position={[0, 0.3, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.02, 0.025, 0.16, 8]} />
                <meshStandardMaterial color="#38bdf8" />
              </mesh>
              <mesh position={[0, 0.12, 0.03]} rotation={[0.45, 0, 0]} castShadow>
                <coneGeometry args={[0.11, 0.08, 12]} />
                <meshStandardMaterial
                  color="#0ea5e9"
                  emissive="#38bdf8"
                  emissiveIntensity={isWorking ? 1.3 : 0.3}
                />
              </mesh>
            </group>
          )}

          {agentId === 'icerikci' && (
            /* İçerikçi: Glowing Idea Bulb Antenna */
            <group position={[0, 0.29, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
                <meshStandardMaterial color="#fb7185" />
              </mesh>
              <mesh position={[0, 0.13, 0]} castShadow>
                <sphereGeometry args={[0.085, 14, 14]} />
                <meshStandardMaterial
                  color="#fef08a"
                  emissive="#f43f5e"
                  emissiveIntensity={isWorking ? 1.8 : 0.55}
                />
              </mesh>
            </group>
          )}

          {agentId === 'yazilimci' && (
            /* Yazılımcı: Cute Headphones */
            <group>
              <mesh position={[-0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 0.08, 14]} />
                <meshStandardMaterial color="#059669" roughness={0.35} />
              </mesh>
              <mesh position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 0.08, 14]} />
                <meshStandardMaterial color="#059669" roughness={0.35} />
              </mesh>
              <mesh position={[0, 0.22, 0]}>
                <torusGeometry args={[0.29, 0.03, 8, 18, Math.PI]} />
                <meshStandardMaterial color="#10b981" roughness={0.4} />
              </mesh>
            </group>
          )}

          {agentId === 'siberci' && (
            /* Siberci: Tactical Visor Trim & Dual Cyber Scanner Antennas */
            <group>
              <RoundedBox args={[0.46, 0.04, 0.07]} radius={0.015} smoothness={2} position={[0, 0.125, 0.22]}>
                <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.45} />
              </RoundedBox>
              <group position={[-0.14, 0.29, 0]} rotation={[0, 0, 0.2]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.016, 0.02, 0.16, 8]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.042, 10, 10]} />
                  <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#06b6d4"
                    emissiveIntensity={isWorking ? 2.0 : 0.9}
                  />
                </mesh>
              </group>
              <group position={[0.14, 0.29, 0]} rotation={[0, 0, -0.2]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.016, 0.02, 0.16, 8]} />
                  <meshStandardMaterial color="#334155" />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.042, 10, 10]} />
                  <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#06b6d4"
                    emissiveIntensity={isWorking ? 2.0 : 0.9}
                  />
                </mesh>
              </group>
            </group>
          )}
        </group>

        {/* Siberci: Floating Neon Cyan Cyber Shield Emblem */}
        {agentId === 'siberci' && (
          <group ref={cyberShieldRef} position={[0.46, 0.64, 0.22]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.17, 0.17, 0.032, 6]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#22d3ee"
                emissiveIntensity={isWorking ? 1.55 : 0.75}
                transparent
                opacity={0.58}
                roughness={0.2}
              />
            </mesh>
            <mesh>
              <octahedronGeometry args={[0.062, 0]} />
              <meshStandardMaterial
                color="#ecfeff"
                emissive="#22d3ee"
                emissiveIntensity={isWorking ? 2.0 : 1.1}
              />
            </mesh>
          </group>
        )}

        {/* Active working glow point light */}
        {isWorking && (
          <pointLight
            position={[0, 1.4, 0.4]}
            color={agent.color}
            intensity={2.2}
            distance={3.5}
            decay={2}
          />
        )}
      </group>
    </group>
  );
}
