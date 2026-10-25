import viewpoints from "./viewpoints.json";

/**
 * Points de vue caméra sur le T-shirt drapé. `viewpoints.json` est régénéré par
 * `npm run build:garment` à partir des repères du vêtement simulé (broderie, col, manche…).
 */
type View = { target: [number, number, number]; position: [number, number, number] };

export const VIEWPOINTS = viewpoints as unknown as Record<"front" | "back" | "collar" | "emblem" | "sleeve" | "cuff" | "panel" | "hem" | "backLogo" | "backNeckLogo", View>;

export type ViewpointKey = keyof typeof VIEWPOINTS;
