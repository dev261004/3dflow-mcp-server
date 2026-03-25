import { v4 as uuidv4 } from "uuid";
import { Animation, SceneObject } from "../types/scene.types.js";

function normalizeAnimationIntent(type: string) {
  const normalized = type.toLowerCase().trim();

  if (normalized === "rotation") {
    return "rotate";
  }

  if (["rotate", "float", "pulse", "bounce", "none"].includes(normalized)) {
    return normalized;
  }

  return "none";
}

function createAnimationTarget(object: SceneObject) {
  return {
    target: object.name || object.id,
    target_id: object.id
  };
}

function createFloatAnimation(object: SceneObject): Animation {
  return {
    id: uuidv4(),
    ...createAnimationTarget(object),
    type: "float",
    config: {
      amplitude: 0.18,
      speed: 0.9,
      axis: "y"
    },
    loop: true
  };
}

function createRotateAnimation(object: SceneObject, speed = 0.4, range = 6.28): Animation {
  return {
    id: uuidv4(),
    ...createAnimationTarget(object),
    type: "rotate",
    resolved_semantics: range >= Math.PI ? "continuous" : "oscillation",
    config: {
      speed,
      axis: "y",
      range
    },
    loop: true
  };
}

function createPulseAnimation(object: SceneObject, scaleRange: [number, number] = [0.95, 1.05], speed = 1.2): Animation {
  return {
    id: uuidv4(),
    ...createAnimationTarget(object),
    type: "pulse",
    config: {
      scale_range: scaleRange,
      speed
    },
    loop: true
  };
}

function createBounceAnimation(object: SceneObject): Animation {
  return {
    id: uuidv4(),
    ...createAnimationTarget(object),
    type: "bounce",
    config: {
      amplitude: 0.22,
      speed: 1.1,
      axis: "y"
    },
    loop: true
  };
}

function findAccentTarget(objects: SceneObject[]) {
  return (
    objects.find((object, index) => index > 0 && /(orb|sphere|glow|light)/i.test(object.name || "")) ??
    objects[1] ??
    null
  );
}

export function buildAnimations(
  objects: SceneObject[],
  intent: string,
  options?: {
    accentPulse?: boolean;
  }
): Animation[] {
  if (!Array.isArray(objects) || objects.length === 0) {
    return [];
  }

  const normalizedIntent = normalizeAnimationIntent(intent);

  if (normalizedIntent === "none") {
    return [];
  }

  const mainObject = objects[0];
  const animations: Animation[] = [];

  if (normalizedIntent === "float") {
    animations.push(createFloatAnimation(mainObject));
    animations.push(createRotateAnimation(mainObject));
  }

  if (normalizedIntent === "rotate") {
    animations.push(createRotateAnimation(mainObject, 0.55, 6.28));
  }

  if (normalizedIntent === "pulse") {
    animations.push(createPulseAnimation(mainObject));
  }

  if (normalizedIntent === "bounce") {
    animations.push(createBounceAnimation(mainObject));
  }

  if (options?.accentPulse) {
    const accentTarget = findAccentTarget(objects);

    if (accentTarget && !animations.some((animation) => animation.target_id === accentTarget.id && animation.type === "pulse")) {
      animations.push(createPulseAnimation(accentTarget, [0.97, 1.03], 1));
    }
  }

  return animations;
}
