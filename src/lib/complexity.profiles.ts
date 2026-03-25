export const COMPLEXITY_TIER_VALUES = ["low", "medium", "high"] as const;
export const SYNTHESIS_TARGET_VALUES = ["mobile", "desktop"] as const;

export type ComplexityTier = typeof COMPLEXITY_TIER_VALUES[number];
export type SynthesisTarget = typeof SYNTHESIS_TARGET_VALUES[number];

export interface ComplexityProfile {
  min_parts: number;
  max_parts: number;
  complexity_hint: ComplexityTier;
  allowed_geometries: readonly string[];
  material_rule: string;
  assembly_hint: string;
  lod_note: string;
  bounding_box: [number, number, number];
}

const LOW_MIN_PARTS = 4;
const LOW_MAX_PARTS = 7;
const MEDIUM_MIN_PARTS = 10;
const MEDIUM_MAX_PARTS = 20;
const HIGH_MIN_PARTS = 28;
const LOW_ACCENT_LIMIT = 1;
const MEDIUM_ACCENT_LIMIT = 3;
const LOW_DRAW_CALL_TARGET = 500;
const MEDIUM_DRAW_CALL_TARGET = 1500;
const DEFAULT_BOUNDING_BOX: [number, number, number] = [1, 2, 1];

export const COMPLEXITY_PROFILES = {
  low: {
    min_parts: LOW_MIN_PARTS,
    max_parts: LOW_MAX_PARTS,
    complexity_hint: "low",
    allowed_geometries: ["BoxGeometry", "SphereGeometry", "CylinderGeometry"],
    material_rule: `Single material per object. No emissive details. Maximum ${LOW_ACCENT_LIMIT} accent element.`,
    assembly_hint: `Humanoid: build with head (sphere), torso (box), and ${2} arm stubs (cylinders). Skip joints, fingers, panels, and fine details entirely.`,
    lod_note: `Optimized for mobile banners and thumbnails. Target < ${LOW_DRAW_CALL_TARGET} draw calls.`,
    bounding_box: DEFAULT_BOUNDING_BOX
  },
  medium: {
    min_parts: MEDIUM_MIN_PARTS,
    max_parts: MEDIUM_MAX_PARTS,
    complexity_hint: "medium",
    allowed_geometries: [
      "BoxGeometry",
      "SphereGeometry",
      "CylinderGeometry",
      "CapsuleGeometry",
      "TorusGeometry"
    ],
    material_rule: `Up to ${2} material types. Accent emissive on max ${MEDIUM_ACCENT_LIMIT} elements (eyes, chest core, one joint). No fine panel detailing.`,
    assembly_hint: `Humanoid: head, torso, neck, ${2} full arms with elbow joints, ${2} legs with knee joints. Skip wrist details, finger geometry, and decorative panel overlays.`,
    lod_note: `Balanced for website sections and embedded widgets. Target < ${MEDIUM_DRAW_CALL_TARGET} draw calls.`,
    bounding_box: DEFAULT_BOUNDING_BOX
  },
  high: {
    min_parts: HIGH_MIN_PARTS,
    max_parts: Number.POSITIVE_INFINITY,
    complexity_hint: "high",
    allowed_geometries: [
      "BoxGeometry",
      "SphereGeometry",
      "CylinderGeometry",
      "CapsuleGeometry",
      "TorusGeometry",
      "ConeGeometry",
      "PlaneGeometry",
      "RingGeometry"
    ],
    material_rule: `Full multi-material. Emissive accents on joints, eyes, chest, waist strip, knee joints, and base ring. Side panels, antenna, and visor strip are all included.`,
    assembly_hint: `Humanoid: head with visor + eyes, neck, torso with chest ring + core + side panels, waist + accent strip, ${2} arms (shoulder joint + upper arm + elbow joint + forearm + hand), ${2} legs (hip joint + upper leg + knee joint + lower leg + foot), antenna + base ring.`,
    lod_note: `Full fidelity for hero sections and showcase scenes. No polygon budget constraint.`,
    bounding_box: DEFAULT_BOUNDING_BOX
  }
} as const satisfies Record<ComplexityTier, ComplexityProfile>;

function normalizeToken(value?: string) {
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

export function resolveDefaultComplexity(
  use_case?: string,
  composition?: string,
  target?: SynthesisTarget
): ComplexityTier {
  const normalizedUseCase = normalizeToken(use_case);
  const normalizedComposition = normalizeToken(composition);

  if (target === "mobile") {
    return "low";
  }

  if (normalizedUseCase === "advertisement" && normalizedComposition === "hero_centered") {
    return "high";
  }

  if (normalizedUseCase === "advertisement" && normalizedComposition === "product_closeup") {
    return "medium";
  }

  if (normalizedUseCase === "website" && normalizedComposition === "hero_centered") {
    return "high";
  }

  if (normalizedUseCase === "website" && normalizedComposition === "floating_showcase") {
    return "medium";
  }

  if (normalizedUseCase === "showcase") {
    return "high";
  }

  return "medium";
}
