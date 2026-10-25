"use client";

import { useGLTF } from "@react-three/drei";
import { siteConfig } from "@/config/site";
import { GLBShirt } from "./GLBShirt";

type Props = {
  quality: "high" | "lite";
};

export function Shirt({ quality }: Props) {
  return <GLBShirt url={siteConfig.assets.shirtModel[quality]} />;
}

export function preloadShirt(quality: "high" | "lite") {
  useGLTF.preload(siteConfig.assets.shirtModel[quality]);
}
