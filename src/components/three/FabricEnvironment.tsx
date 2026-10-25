"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Environnement d'éclairage généré localement (aucun HDRI téléchargé) :
 * de longues boîtes à lumière froides qui dessinent le lustre du coton.
 */
export function FabricEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={1.8} color="#e9ebf2" position={[0, 3, 2.5]} rotation={[-Math.PI / 3, 0, 0]} scale={[6, 1.2, 1]} />
      <Lightformer form="rect" intensity={1.3} color="#c9cde0" position={[-4, 0.6, -2]} rotation={[0, Math.PI / 2.6, 0]} scale={[1.2, 5, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#9aa2c8" position={[4, 0.2, -2.5]} rotation={[0, -Math.PI / 2.4, 0]} scale={[1, 4, 1]} />
      <Lightformer form="ring" intensity={0.6} color="#ffffff" position={[2, 1.5, 3]} scale={1.2} />
    </Environment>
  );
}
