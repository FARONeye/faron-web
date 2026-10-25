"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

type Props = { url: string };

/**
 * Modèle VEIL statique : la simulation conserve le drapé gravitaire et le clone reste indépendant par Canvas.
 */
export function GLBShirt({ url }: Props) {
  const { scene } = useGLTF(url);
  // Une instance par canvas (accueil et visionneuse peuvent coexister).
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={model} />;
}
