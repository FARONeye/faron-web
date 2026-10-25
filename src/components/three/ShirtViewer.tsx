"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useReducedMotion } from "motion/react";
import { FabricEnvironment } from "./FabricEnvironment";
import { LoaderOverlay } from "./LoaderOverlay";
import { Shirt } from "./shirt/Shirt";
import { VIEWPOINTS, type ViewpointKey } from "./shirt/dimensions";

const VIEW_LABELS: { key: ViewpointKey; label: string }[] = [
  { key: "front", label: "Face" },
  { key: "back", label: "Dos" },
  { key: "backLogo", label: "Ø dos" },
  { key: "backNeckLogo", label: "Col dos" },
  { key: "collar", label: "Col" },
  { key: "emblem", label: "Broderie" },
  { key: "sleeve", label: "Manche" },
  { key: "cuff", label: "Étiquette" },
  { key: "panel", label: "Panneau" },
  { key: "hem", label: "Ourlet" },
];

const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();

/** Azimut de la caméra par défaut, pour lequel l'éclairage de face (référence) a été réglé. */
const HOME_AZIMUTH = Math.atan2(0.6, 1.85);

/**
 * Lumières et environnement qui suivent l'azimut de la caméra : chaque face du T-shirt (dos, profils, trois-quarts)
 * reçoit l'éclairage de référence de la vue de face. Fixes dans le monde, les contre-jours (plus intenses que la
 * lumière principale) frappaient le dos de plein fouet et le délavaient en gris.
 */
function CameraLightRig() {
  const rig = useRef<THREE.Group>(null);
  useFrame(({ camera, controls, scene }) => {
    const t = (controls as OrbitControlsImpl | null)?.target;
    const az = Math.atan2(camera.position.x - (t?.x ?? 0), camera.position.z - (t?.z ?? 0)) - HOME_AZIMUTH;
    if (rig.current) rig.current.rotation.y = az;
    scene.environmentRotation.y = az;
  });
  return (
    <group ref={rig}>
      <directionalLight
        position={[2, 2.6, 2.4]}
        intensity={4.2}
        color="#eceef4"
        castShadow={false}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
      />
      <directionalLight position={[-2.4, 1.2, -2.2]} intensity={3.8} color="#d4d8e6" />
      <directionalLight position={[2.6, 0.3, -2]} intensity={2.8} color="#8f97c4" />
      <directionalLight position={[2.4, 0.1, 1.2]} intensity={2.1} color="#e4dccf" />
    </group>
  );
}

/** Déplace la caméra vers un point de vue, puis rend la main à l'utilisateur. */
function ViewpointAnimator({
  view,
  controls,
  onArrive,
}: {
  view: ViewpointKey | null;
  controls: React.RefObject<OrbitControlsImpl | null>;
  onArrive: () => void;
}) {
  const camera = useThree((s) => s.camera);
  useFrame((_, delta) => {
    const c = controls.current;
    if (!view || !c) return;
    const v = VIEWPOINTS[view];
    _pos.set(v.position[0], v.position[1], v.position[2]);
    _tgt.set(v.target[0], v.target[1], v.target[2]);
    const k = 1 - Math.exp(-4 * Math.min(delta, 0.05));
    camera.position.lerp(_pos, k);
    c.target.lerp(_tgt, k);
    c.update();
    if (camera.position.distanceTo(_pos) < 0.003 && c.target.distanceTo(_tgt) < 0.002) onArrive();
  });
  return null;
}

type Props = {
  quality: "high" | "lite";
  /** Interface complète (points de vue, options) ou visionneuse compacte. */
  variant?: "full" | "compact";
  className?: string;
  /** Faux : la visionneuse reste montée (caméra conservée) mais ne rend plus, p. ex. quand la galerie montre une image. */
  active?: boolean;
};

export default function ShirtViewer({ quality, variant = "full", className = "", active = true }: Props) {
  const reduced = useReducedMotion() ?? false;
  const [autoRotate, setAutoRotate] = useState(!reduced);
  const [view, setView] = useState<ViewpointKey | null>(null);
  const [activeView, setActiveView] = useState<ViewpointKey>("front");
  const controls = useRef<OrbitControlsImpl>(null);
  const root = useRef<RootState | null>(null);

  // Suspend le rendu quand la route est masquée (navigation avec Activity) ou que la visionneuse est inactive.
  useLayoutEffect(() => {
    root.current?.setFrameloop(active ? "always" : "never");
    return () => root.current?.setFrameloop("never");
  }, [active]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => setView(null);
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  });

  const goTo = (key: ViewpointKey) => {
    setAutoRotate(false);
    setActiveView(key);
    setView(key);
  };

  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,#202127_0%,#0d0e12_55%,#060608_100%)] ${className}`}>
      <Canvas
        dpr={quality === "high" ? [1, 2] : [1, 1.5]}
        shadows={false}
        camera={{ fov: 30, near: 0.02, far: 50, position: [0.6, 0.05, 1.85] }}
        gl={{ antialias: true }}
        onCreated={(state) => {
          root.current = state;
          if (!active) state.setFrameloop("never");
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = 1.34;
        }}
        className="touch-none"
      >
        <Suspense fallback={null}>
          <Shirt quality={quality} />
          <FabricEnvironment />
          <ContactShadows position={[0, -0.6, 0]} opacity={0.55} scale={2.2} blur={2.6} far={0.6} resolution={512} color="#000000" />
        </Suspense>
        <CameraLightRig />
        <ambientLight intensity={0.82} color="#9aa0b8" />
        <OrbitControls
          ref={controls}
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.7}
          zoomSpeed={0.8}
          minDistance={0.3}
          maxDistance={3.2}
          target={[0, -0.07, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
        />
        <ViewpointAnimator view={view} controls={controls} onArrive={() => setView(null)} />
      </Canvas>

      <LoaderOverlay />

      {variant === "full" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-6">
          <div
            className="pointer-events-auto -mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
            role="group"
            aria-label="Points de vue"
          >
            {VIEW_LABELS.map((v) => (
              <button key={v.key} type="button" onClick={() => goTo(v.key)} aria-pressed={activeView === v.key} className="chip shrink-0">
                {v.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
            <button type="button" className="chip" aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
              Rotation auto {autoRotate ? "· activée" : "· désactivée"}
            </button>
          </div>
          <p className="label hidden text-center text-mist/80 sm:block">Glisser pour pivoter · Pincer ou molette pour zoomer</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
          <span className="label text-mist/80">Glisser pour pivoter</span>
          <button type="button" className="chip pointer-events-auto" aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
            Rotation auto
          </button>
        </div>
      )}
    </div>
  );
}
