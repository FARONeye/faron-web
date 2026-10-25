"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Espace profond temps réel : voûte de nébuleuses et galaxies lointaines (shader),
 * trois couches d'étoiles à des profondeurs différentes (parallaxe réelle) et une poussière
 * cosmique proche. `studio` (0 → 1) fond l'ensemble vers un fond de studio sombre.
 */

type Props = {
  quality: "high" | "lite";
  /** Lecture du mélange espace → studio à chaque image. */
  studio: () => number;
  animate: boolean;
};

const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = /* glsl */ `
uniform float uTime;
uniform float uStudio;
varying vec3 vDir;
${SIMPLEX}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < OCTAVES; i++) {
    s += a * snoise(p);
    p = p * 2.03 + 1.7;
    a *= 0.5;
  }
  return s;
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 galaxy(vec3 d, vec3 c, float size, float ang, vec3 col) {
  vec3 u = normalize(cross(c, vec3(0.0, 1.0, 0.0)));
  vec3 v = cross(c, u);
  vec2 q = vec2(dot(d, u), dot(d, v));
  q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
  q /= vec2(size, size * 0.38);
  float r = length(q);
  float arms = 0.65 + 0.35 * sin(atan(q.y, q.x) * 2.0 - r * 5.0);
  float core = exp(-r * r * 9.0);
  float disk = exp(-r * 2.4) * arms;
  return col * (core * 0.035 + disk * 0.006) * step(0.0, dot(d, c));
}

vec3 farStars(vec3 d) {
  vec3 p = d * 260.0;
  vec3 i = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash13(i);
  vec3 o = vec3(hash13(i + 1.3), hash13(i + 2.7), hash13(i + 5.1)) - 0.5;
  float s = step(0.9972, h) * smoothstep(0.28, 0.0, length(f - o * 0.5));
  float b = 0.004 + 0.03 * pow(hash13(i + 9.2), 6.0);
  return vec3(0.85, 0.88, 1.0) * s * b;
}

void main() {
  vec3 d = normalize(vDir);
  float t = uTime * 0.0035;

  vec3 bandAxis = normalize(vec3(0.25, 1.0, 0.35));
  float band = exp(-pow(dot(d, bandAxis) / 0.42, 2.0));
  float n1 = fbm(d * 2.1 + vec3(t, 0.0, -t));
  float n2 = fbm(d * 4.6 + vec3(-t * 1.3, t, 0.0) + n1 * 0.6);
  float cloud = smoothstep(-0.2, 0.8, n1 + 0.5 * n2) * band;
  float lanes = smoothstep(0.05, 0.55, fbm(d * 6.0 + 3.1)) * band;

  vec3 violet = vec3(0.020, 0.011, 0.040);
  vec3 blue = vec3(0.004, 0.010, 0.030);
  vec3 col = vec3(0.0016, 0.0016, 0.0024);
  col += mix(blue, violet, smoothstep(-0.3, 0.6, n2)) * cloud;
  col += vec3(0.012, 0.011, 0.018) * pow(cloud, 3.0);
  col *= 1.0 - 0.6 * lanes;

  col += galaxy(d, normalize(vec3(-0.55, 0.32, -0.77)), 0.022, 0.5, vec3(0.80, 0.80, 0.92));
  col += galaxy(d, normalize(vec3(0.66, -0.16, -0.73)), 0.012, 2.2, vec3(0.85, 0.82, 0.95));
  col += galaxy(d, normalize(vec3(0.12, 0.58, -0.80)), 0.008, 1.1, vec3(0.70, 0.76, 0.95));
  col += farStars(d);

  // Fond de studio : halo gris anthracite derrière la pièce, coins presque noirs.
  float center = smoothstep(0.35, 1.0, -d.z);
  vec3 studio = mix(vec3(0.0016, 0.0016, 0.0020), vec3(0.010, 0.010, 0.013), center);
  studio += vec3(0.004) * smoothstep(0.0, -0.6, d.y) * center;
  col = mix(col, studio, uStudio);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const pointsVertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
uniform float uDrift;
uniform vec3 uBox;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec3 p = position;
  if (uDrift > 0.0) {
    // Poussière : dérive lente, repliée dans la boîte.
    p.y = mod(p.y + uTime * uDrift * (0.4 + aPhase) + uBox.y, uBox.y * 2.0) - uBox.y;
    p.x += sin(uTime * 0.05 + aPhase * 6.0) * 0.05;
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPixelRatio * (14.0 / -mv.z), 0.75 * uPixelRatio, 7.0 * uPixelRatio);
  vColor = aColor;
  vTwinkle = 0.72 + 0.28 * sin(uTime * (0.4 + aPhase) + aPhase * 40.0);
}
`;

const pointsFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  a *= a;
  gl_FragColor = vec4(vColor * a * vTwinkle * uOpacity, 1.0);
  #include <colorspace_fragment>
}
`;

function makePoints(count: number, place: (i: number) => [number, number, number], size: [number, number], brightness: number, seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const ph = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = place(i);
    pos.set([x, y, z], i * 3);
    const tint = rand();
    const c = tint < 0.1 ? [0.75, 0.82, 1] : tint < 0.14 ? [1, 0.9, 0.8] : [0.92, 0.93, 0.97];
    const b = brightness * (0.25 + 0.75 * Math.pow(rand(), 3));
    col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    sz[i] = size[0] + (size[1] - size[0]) * Math.pow(rand(), 4);
    ph[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  return g;
}

function shell(rMin: number, rMax: number, seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  return (): [number, number, number] => {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const r = rMin + (rMax - rMin) * Math.cbrt(rand());
    const q = Math.sqrt(1 - u * u);
    return [r * q * Math.cos(th), r * u, r * q * Math.sin(th)];
  };
}

function boxPoints(seed: number, half: THREE.Vector3, zMin: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return (): [number, number, number] => [(rand() * 2 - 1) * half.x, (rand() * 2 - 1) * half.y, zMin + rand() * half.z * 2];
}

function createSpace(lite: boolean) {
  const sky = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uStudio: { value: 0 } },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    defines: { OCTAVES: lite ? 3 : 5 },
    side: THREE.BackSide,
    depthWrite: false,
  });

  const k = lite ? 0.45 : 1;
  const layer = (geometry: THREE.BufferGeometry, drift = 0, box = new THREE.Vector3()) => ({
    geometry,
    material: new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 1 },
        uDrift: { value: drift },
        uBox: { value: box },
      },
      vertexShader: pointsVertex,
      fragmentShader: pointsFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  });
  const dustBox = new THREE.Vector3(2.6, 1.7, 2.1);
  const layers = [
    layer(makePoints(Math.round(2200 * k), shell(30, 48, 11), [0.9, 2.6], 0.9, 3)),
    layer(makePoints(Math.round(1100 * k), shell(16, 30, 23), [0.8, 2.2], 0.8, 5)),
    layer(makePoints(Math.round(420 * k), shell(8, 16, 37), [0.7, 1.8], 0.7, 9)),
    layer(makePoints(Math.round(380 * k), boxPoints(91, dustBox, -2.8), [0.35, 1.1], 0.22, 13), 0.012, dustBox),
  ];

  return {
    sky,
    layers,
    update(dt: number, studio: number, dpr: number) {
      sky.uniforms.uTime.value += dt;
      sky.uniforms.uStudio.value = studio;
      for (const l of layers) {
        l.material.uniforms.uTime.value += dt;
        l.material.uniforms.uPixelRatio.value = dpr;
        l.material.uniforms.uOpacity.value = 1 - studio;
      }
    },
    dispose() {
      sky.dispose();
      for (const l of layers) {
        l.geometry.dispose();
        l.material.dispose();
      }
    },
  };
}

export function SpaceEnvironment({ quality, studio, animate }: Props) {
  const dpr = useThree((s) => s.viewport.dpr);
  const skyMesh = useRef<THREE.Mesh>(null);
  const space = useMemo(() => createSpace(quality === "lite"), [quality]);

  useEffect(() => () => space.dispose(), [space]);

  useFrame((state, delta) => {
    space.update(animate ? Math.min(delta, 0.05) : 0, studio(), dpr);
    skyMesh.current?.position.copy(state.camera.position);
  });

  return (
    <group>
      <mesh ref={skyMesh} material={space.sky} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[90, 64, 32]} />
      </mesh>
      {space.layers.map((l, i) => (
        <points key={i} geometry={l.geometry} material={l.material} frustumCulled={false} />
      ))}
    </group>
  );
}
