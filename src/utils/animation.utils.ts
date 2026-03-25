import { resolveDefaultComplexity } from "../lib/complexity.profiles.js";
import type { SceneData } from "../types/scene.types.js";
import type {
  AnimationConfig,
  AnimationEntry,
  AnimationType,
  CanonicalAnimationType,
  ChannelConflict,
  ChannelMap,
  ResolvedAnimationTarget,
  RotateSemantics
} from "../types/apply-animation.types.js";
import { RotateSemantics as RotateSemanticsEnum } from "../types/apply-animation.types.js";

export { resolveDefaultComplexity };

export const ANIMATION_DEFAULTS: Record<AnimationType, AnimationConfig> = {
  rotate: { speed: 0.4, axis: "y", range: 6.28 },
  rotation: { speed: 0.4, axis: "y", range: 6.28 },
  float: { speed: 0.9, axis: "y", amplitude: 0.18 },
  bounce: { speed: 1.2, axis: "y", amplitude: 0.25 },
  pulse: { speed: 1.0, scale: 1.1 }
} as const;

export const CHANNEL_MAP: ChannelMap = {
  float: "position.y",
  bounce: "position.y",
  rotate: "rotation.y",
  rotation: "rotation.y",
  pulse: "scale"
} as const;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidAxis(value: unknown): value is "x" | "y" | "z" {
  return value === "x" || value === "y" || value === "z";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidScaleRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isPositiveNumber(value[0]) &&
    isPositiveNumber(value[1]) &&
    value[1] >= value[0]
  );
}

function getConfigScale(config: AnimationConfig | undefined) {
  if (isPositiveNumber(config?.scale)) {
    return config.scale;
  }

  if (isValidScaleRange(config?.scale_range)) {
    return config.scale_range[1];
  }

  return undefined;
}

function sanitizeIncomingConfig(config: Partial<AnimationConfig>): AnimationConfig {
  const sanitized: AnimationConfig = {};

  if (isPositiveNumber(config.speed)) {
    sanitized.speed = config.speed;
  }

  if (isPositiveNumber(config.amplitude)) {
    sanitized.amplitude = config.amplitude;
  }

  if (isPositiveNumber(config.range)) {
    sanitized.range = config.range;
  }

  if (isValidAxis(config.axis)) {
    sanitized.axis = config.axis;
  }

  if (isNonEmptyString(config.easing)) {
    sanitized.easing = config.easing.trim();
  }

  if (isPositiveNumber(config.scale)) {
    sanitized.scale = config.scale;
  }

  if (isValidScaleRange(config.scale_range)) {
    sanitized.scale_range = [config.scale_range[0], config.scale_range[1]];
  }

  if (!sanitized.scale && sanitized.scale_range) {
    sanitized.scale = sanitized.scale_range[1];
  }

  if (!sanitized.scale_range && sanitized.scale) {
    sanitized.scale_range = [1, sanitized.scale];
  }

  return sanitized;
}

export function mergeAnimationConfig(
  existing: AnimationConfig | undefined,
  incoming: Partial<AnimationConfig>,
  override: boolean
): AnimationConfig {
  const sanitizedIncoming = sanitizeIncomingConfig(incoming);
  const source = override ? undefined : existing;
  const merged: AnimationConfig = {};

  merged.speed = isPositiveNumber(source?.speed) ? source.speed : sanitizedIncoming.speed;
  merged.amplitude = isPositiveNumber(source?.amplitude) ? source.amplitude : sanitizedIncoming.amplitude;
  merged.range = isPositiveNumber(source?.range) ? source.range : sanitizedIncoming.range;
  merged.axis = isValidAxis(source?.axis) ? source.axis : sanitizedIncoming.axis;
  merged.easing = isNonEmptyString(source?.easing) ? source.easing.trim() : sanitizedIncoming.easing;

  const existingScale = getConfigScale(source);
  const incomingScale = getConfigScale(sanitizedIncoming);
  const resolvedScale = (override ? undefined : existingScale) ?? incomingScale;

  if (resolvedScale) {
    merged.scale = resolvedScale;
    merged.scale_range =
      (override ? undefined : isValidScaleRange(source?.scale_range) ? [source.scale_range[0], source.scale_range[1]] : undefined) ??
      sanitizedIncoming.scale_range ??
      [1, resolvedScale];
  }

  return merged;
}

/**
 * Rotate semantics are range-driven:
 * - range >= Math.PI means continuous spin
 * - range < Math.PI means oscillation
 */
export function resolveRotateSemantics(range: number): RotateSemantics {
  return range >= Math.PI ? RotateSemanticsEnum.CONTINUOUS : RotateSemanticsEnum.OSCILLATION;
}

export function normalizeAnimationType(type: AnimationType): CanonicalAnimationType {
  return type === "rotation" ? "rotate" : type;
}

export function materializeAnimationConfig(
  type: AnimationType,
  config?: Partial<AnimationConfig>
): AnimationConfig {
  return sanitizeIncomingConfig({
    ...ANIMATION_DEFAULTS[type],
    ...(config ?? {})
  });
}

export function resolveTargetObject(
  scene_data: SceneData,
  target_id?: string
): ResolvedAnimationTarget | null {
  if (!Array.isArray(scene_data.objects) || scene_data.objects.length === 0) {
    return null;
  }

  const object =
    (target_id ? scene_data.objects.find((candidate) => candidate.id === target_id) : undefined) ??
    scene_data.objects[0];

  if (!object) {
    return null;
  }

  return {
    target_id: object.id,
    target_name: object.name || object.id,
    object
  };
}

export function detectChannelConflicts(
  entries: Array<AnimationEntry & { target_id: string; target_name: string }>
): ChannelConflict[] {
  const conflicts: ChannelConflict[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < entries.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < entries.length; compareIndex += 1) {
      const left = entries[index];
      const right = entries[compareIndex];

      if (left.target_id !== right.target_id) {
        continue;
      }

      if (CHANNEL_MAP[left.type] !== CHANNEL_MAP[right.type]) {
        continue;
      }

      if (left.type === right.type) {
        continue;
      }

      const key = [left.target_id, ...[left.type, right.type].sort()].join(":");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      conflicts.push({
        type: "CHANNEL_CONFLICT",
        message: `${left.type} and ${right.type} both target ${CHANNEL_MAP[left.type]} on object '${left.target_name}'. Only the last one applied will be visible.`,
        affected_types: [left.type, right.type],
        affected_target_id: left.target_id
      });
    }
  }

  return conflicts;
}
