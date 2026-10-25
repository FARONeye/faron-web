"use client";

import { Suspense, useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { HomeRig } from "@/components/home/rig";
import { FabricEnvironment } from "./FabricEnvironment";
import { SpaceEnvironment } from "./SpaceEnvironment";
import { Shirt } from "./shirt/Shirt";

type Props = {
  rigRef: RefObject<HomeRig>;
  quality: "high" | "lite";
  animate: boolean;
  paused: boolean;
  eventSource: RefObject<HTMLElement | null>;
};

const damp = THREE.MathUtils.damp;
const isPortrait = (s: RootState) => s.size.width / s.size.height < 0.8;

const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3(0, -0.04, 0);

function CameraRig({ rigRef, animate }: { rigRef: RefObject<HomeRig>; animate: boolean }) {
  useFrame((state, delta) => {
    const r = rigRef.current;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    _target.set(r.tgtX, r.tgtY, r.tgtZ);
    _desired
      .set(r.camX, r.camY, r.camZ)
      .sub(_target)
      .multiplyScalar(isPortrait(state) ? 1.5 : 1)
      .add(_target);
    if (animate) {
      _desired.x += Math.sin(t * 0.071) * 0.05;
      _desired.y += Math.sin(t * 0.053) * 0.03;
    }
    const k = 1 - Math.exp(-3 * dt);
    state.camera.position.lerp(_desired, k);
    _look.lerp(_target, k);
    state.camera.lookAt(_look);
  });
  return null;
}

function Stage({ rigRef, animate, quality }: { rigRef: RefObject<HomeRig>; animate: boolean; quality: "high" | "lite" }) {
  const group = useRef<THREE.Group>(null);
  const lights = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rimA = useRef<THREE.DirectionalLight>(null);
  const rimB = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);

  useFrame((state, delta) => {
    const r = rigRef.current;
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const portrait = isPortrait(state);
    const float = animate ? Math.sin(t * 0.6) * 0.012 : 0;
    g.position.x = damp(g.position.x, portrait ? 0 : r.posX, 3, dt);
    g.position.y = damp(g.position.y, (portrait ? r.studio * 0.2 : 0) + float, 3, dt);
    const px = animate && !portrait ? state.pointer.x * 0.08 : 0;
    const py = animate && !portrait ? -state.pointer.y * 0.04 : 0;
    g.rotation.y = damp(g.rotation.y, r.rotY + px + (animate ? Math.sin(t * 0.23) * 0.035 : 0), 2.5, dt);
    g.rotation.x = damp(g.rotation.x, py, 2, dt);
    g.rotation.z = animate ? Math.sin(t * 0.37) * 0.012 : 0;
    // L'éclairage tourne avec le vêtement : le dos montré par le récit reçoit l'éclairage de référence de la face,
    // au lieu d'être délavé par les contre-jours placés derrière.
    if (lights.current) lights.current.rotation.y = g.rotation.y;
    state.scene.environmentRotation.y = g.rotation.y;

    const light = r.intro * r.reveal;
    if (key.current) key.current.intensity = 4.6 * light;
    if (rimA.current) rimA.current.intensity = 6 * r.intro * r.rim;
    if (rimB.current) rimB.current.intensity = 3.8 * r.intro * r.rim;
    if (ambient.current) ambient.current.intensity = 0.26 + 0.42 * light;
    state.scene.environmentIntensity = 1.2 * light;
  });

  return (
    <>
      <group ref={group}>
        <Shirt quality={quality} />
      </group>
      <group ref={lights}>
        <directionalLight
          ref={key}
          position={[2.2, 2.6, 2.6]}
          color="#e8eaf0"
          castShadow={quality === "high"}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-0.9}
          shadow-camera-right={0.9}
          shadow-camera-top={0.9}
          shadow-camera-bottom={-0.9}
        />
        <directionalLight ref={rimA} position={[-2.6, 1.4, -2.4]} color="#d4d8e6" />
        <directionalLight ref={rimB} position={[2.8, 0.4, -2.2]} color="#8f97c4" />
      </group>
      <ambientLight ref={ambient} color="#9aa0b8" />
    </>
  );
}

export default function HomeScene({ rigRef, quality, animate, paused, eventSource }: Props) {
  const root = useRef<RootState | null>(null);

  // La page reste montée (masquée) après navigation : on suspend alors le rendu.
  useLayoutEffect(() => {
    root.current?.setFrameloop(paused ? "never" : "always");
    return () => root.current?.setFrameloop("never");
  }, [paused]);

  return (
    <Canvas
      className="!fixed inset-0"
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      frameloop={paused ? "never" : "always"}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      shadows={quality === "high" ? "percentage" : false}
      camera={{ fov: 30, near: 0.05, far: 200, position: [0, -0.02, 3.3] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={(state) => {
        root.current = state;
        state.gl.toneMapping = THREE.ACESFilmicToneMapping;
        state.gl.toneMappingExposure = 1.12;
      }}
      aria-hidden
    >
      <color attach="background" args={["#050507"]} />
      <Suspense fallback={null}>
        <SpaceEnvironment quality={quality} animate={animate} studio={() => rigRef.current.studio} />
        <Stage rigRef={rigRef} animate={animate} quality={quality} />
        <FabricEnvironment />
      </Suspense>
      <CameraRig rigRef={rigRef} animate={animate} />
      <PerformanceMonitor onDecline={({ factor }) => root.current?.setDpr(Math.max(1, 1 + factor * 0.5))} />
    </Canvas>
  );
}
