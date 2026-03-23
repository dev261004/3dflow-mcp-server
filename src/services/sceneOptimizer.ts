import { v4 as uuidv4 } from "uuid";
import { Light, SceneData, SceneObject, TextureResolution } from "../types/scene.js";

type OptimizationTarget = "desktop" | "mobile";
type PolyEstimate = "low" | "medium" | "high";

interface CostSummary {
  draw_calls: number;
  lights: number;
  poly_estimate: PolyEstimate;
}

interface OptimizationReport {
  target: OptimizationTarget;
  original_cost: CostSummary;
  optimized_cost: CostSummary;
  changes_made: string[];
  further_suggestions: string[];
}

const DEFAULT_SEGMENTS: Record<NonNullable<SceneObject["shape"]>, number> = {
  box: 1,
  sphere: 64,
  cylinder: 48
};

const SEGMENT_CAPS: Record<OptimizationTarget, Record<NonNullable<SceneObject["shape"]>, number>> = {
  desktop: {
    box: 1,
    sphere: 32,
    cylinder: 28
  },
  mobile: {
    box: 1,
    sphere: 24,
    cylinder: 20
  }
};

const PARTICLE_CAPS: Record<OptimizationTarget, number> = {
  desktop: 160,
  mobile: 80
};

const TEXTURE_TARGETS: Record<OptimizationTarget, TextureResolution> = {
  desktop: "medium",
  mobile: "low"
};

function ensureRenderHints(object: SceneObject) {
  object.render_hints ??= {};

  if (object.shape) {
    object.render_hints.segment_count ??= DEFAULT_SEGMENTS[object.shape];
  }

  if (object.asset) {
    object.render_hints.texture_resolution ??= "high";
  }

  if (typeof object.material.transmission === "number" && object.material.transmission > 0) {
    object.render_hints.transparency_mode ??= "physical";
  } else {
    object.render_hints.transparency_mode ??= "opaque";
  }

  const normalizedName = (object.name || "").toLowerCase();
  if (object.render_hints.particle_count === undefined && /(particle|spark|dust|trail)/.test(normalizedName)) {
    object.render_hints.particle_count = 160;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimateObjectDrawCalls(object: SceneObject) {
  ensureRenderHints(object);

  let drawCalls = 1;

  if (typeof object.material.transmission === "number" && object.material.transmission > 0) {
    drawCalls += 1;
  }

  const particleCount = object.render_hints?.particle_count ?? 0;
  if (particleCount > 0) {
    drawCalls += Math.max(1, Math.ceil(particleCount / 160));
  }

  return drawCalls;
}

function estimateObjectPolyUnits(object: SceneObject) {
  ensureRenderHints(object);

  let polyUnits = 0;

  if (object.type === "model") {
    const resolution = object.render_hints?.texture_resolution ?? "high";
    polyUnits += resolution === "high" ? 4200 : resolution === "medium" ? 2800 : 1800;
  }

  if (object.type === "primitive" && object.shape) {
    const segments = object.render_hints?.segment_count ?? DEFAULT_SEGMENTS[object.shape];

    if (object.shape === "box") {
      polyUnits += 12 * Math.max(1, segments);
    }

    if (object.shape === "sphere") {
      polyUnits += Math.round(segments * Math.max(8, segments / 2));
    }

    if (object.shape === "cylinder") {
      polyUnits += segments * 18;
    }
  }

  if (typeof object.material.transmission === "number" && object.material.transmission > 0) {
    polyUnits += 600;
  }

  if (typeof object.material.emissiveIntensity === "number" && object.material.emissiveIntensity > 0.8) {
    polyUnits += 220;
  }

  if (typeof object.material.envMapIntensity === "number" && object.material.envMapIntensity > 1) {
    polyUnits += 180;
  }

  if ((object.render_hints?.particle_count ?? 0) > 0) {
    polyUnits += (object.render_hints?.particle_count ?? 0) * 3;
  }

  return polyUnits;
}

function getPolyEstimate(polyUnits: number): PolyEstimate {
  if (polyUnits < 2000) {
    return "low";
  }

  if (polyUnits < 5000) {
    return "medium";
  }

  return "high";
}

function analyzeSceneCost(scene: SceneData): CostSummary {
  const drawCalls = scene.objects.reduce((total, object) => total + estimateObjectDrawCalls(object), 0);
  const polyUnits = scene.objects.reduce((total, object) => total + estimateObjectPolyUnits(object), 0);

  return {
    draw_calls: drawCalls,
    lights: scene.lighting.length,
    poly_estimate: getPolyEstimate(polyUnits)
  };
}

function describeObject(object: SceneObject, fallbackLabel: string) {
  return object.name || fallbackLabel;
}

function createMergedLightingRig(existingLights: Light[], target: OptimizationTarget) {
  const ambientLights = existingLights.filter((light) => light.type === "ambient");
  const dynamicLights = existingLights.filter((light) => light.type !== "ambient");
  const ambientSource = ambientLights[0];

  const ambientIntensity = ambientSource
    ? clamp(ambientSource.intensity + dynamicLights.length * 0.08, 0.35, target === "mobile" ? 0.6 : 0.7)
    : target === "mobile" ? 0.45 : 0.55;

  const mergedLights: Light[] = [
    {
      id: ambientSource?.id || uuidv4(),
      type: "ambient",
      intensity: Number(ambientIntensity.toFixed(2)),
      color: ambientSource?.color || "#ffffff"
    }
  ];

  if (dynamicLights.length > 0) {
    const totalDynamicIntensity = dynamicLights.reduce((sum, light) => sum + light.intensity, 0);

    mergedLights.push({
      id: uuidv4(),
      type: "directional",
      intensity: Number(clamp(totalDynamicIntensity * (target === "mobile" ? 0.4 : 0.5), 0.55, 1.1).toFixed(2)),
      color: dynamicLights[0].color,
      position: [3, 4, 2]
    });
  }

  return mergedLights;
}

function optimizeLighting(scene: SceneData, target: OptimizationTarget, changesMade: string[]) {
  const originalLightCount = scene.lighting.length;
  const ambientLights = scene.lighting.filter((light) => light.type === "ambient");
  const dynamicLights = scene.lighting.filter((light) => light.type !== "ambient");
  const desiredMaxLights = target === "mobile" ? 2 : 2;

  if (originalLightCount > desiredMaxLights || dynamicLights.length > 1 || ambientLights.length === 0) {
    scene.lighting = createMergedLightingRig(scene.lighting, target);
    const dynamicLabel = dynamicLights.length > 0 ? `${dynamicLights.length} dynamic light${dynamicLights.length > 1 ? "s" : ""}` : `${originalLightCount} light${originalLightCount > 1 ? "s" : ""}`;
    const rigLabel = scene.lighting.length > 1 ? "1 ambient + 1 directional" : "1 ambient";

    changesMade.push(`Merged ${dynamicLabel} into ${rigLabel} rig`);
  }
}

function optimizeGeometry(object: SceneObject, target: OptimizationTarget, changesMade: string[], fallbackLabel: string) {
  ensureRenderHints(object);

  if (!object.shape) {
    return;
  }

  const currentSegments = object.render_hints?.segment_count ?? DEFAULT_SEGMENTS[object.shape];
  const targetSegments = Math.min(currentSegments, SEGMENT_CAPS[target][object.shape]);

  if (targetSegments < currentSegments) {
    object.render_hints!.segment_count = targetSegments;
    changesMade.push(`Reduced ${object.shape} segments from ${currentSegments} to ${targetSegments} on ${describeObject(object, fallbackLabel)}`);
  }
}

function optimizeParticles(object: SceneObject, target: OptimizationTarget, changesMade: string[], fallbackLabel: string) {
  ensureRenderHints(object);

  const currentParticles = object.render_hints?.particle_count;
  if (typeof currentParticles !== "number") {
    return;
  }

  const particleCap = PARTICLE_CAPS[target];
  if (currentParticles > particleCap) {
    object.render_hints!.particle_count = particleCap;
    changesMade.push(`Flagged particle count ${currentParticles} -> ${particleCap} for ${describeObject(object, fallbackLabel)}`);
  }
}

function optimizeTextures(object: SceneObject, target: OptimizationTarget, changesMade: string[], fallbackLabel: string) {
  ensureRenderHints(object);

  if (!object.asset) {
    return;
  }

  const currentResolution = object.render_hints?.texture_resolution ?? "high";
  const targetResolution = TEXTURE_TARGETS[target];
  const resolutionRank: Record<TextureResolution, number> = {
    high: 3,
    medium: 2,
    low: 1
  };

  if (resolutionRank[targetResolution] < resolutionRank[currentResolution]) {
    object.render_hints!.texture_resolution = targetResolution;
    changesMade.push(`Reduced texture resolution flags on ${describeObject(object, fallbackLabel)} from ${currentResolution} to ${targetResolution}`);
  }
}

function optimizeMaterial(object: SceneObject, target: OptimizationTarget, changesMade: string[], fallbackLabel: string) {
  ensureRenderHints(object);

  if (target === "mobile" && typeof object.material.transmission === "number" && object.material.transmission > 0) {
    const originalTransmission = object.material.transmission;

    object.material.type = "standard";
    object.material.roughness = Number(Math.max(object.material.roughness ?? 0.2, 0.42).toFixed(2));
    object.material.metalness = Number(Math.min(object.material.metalness ?? 0.08, 0.08).toFixed(2));
    delete object.material.transmission;
    object.render_hints!.transparency_mode = "approximate";

    changesMade.push(`Replaced transmission material (${originalTransmission}) on ${describeObject(object, fallbackLabel)} with cheaper opaque approximation`);
  } else if (target === "desktop" && typeof object.material.transmission === "number" && object.material.transmission > 0.7) {
    const previousTransmission = object.material.transmission;
    const clampedTransmission = Number(Math.min(object.material.transmission, 0.7).toFixed(2));

    if (clampedTransmission < object.material.transmission) {
      object.material.transmission = clampedTransmission;
      object.material.roughness = Number(Math.max(object.material.roughness ?? 0.12, 0.12).toFixed(2));
      changesMade.push(`Reduced transmission intensity on ${describeObject(object, fallbackLabel)} from ${previousTransmission} to ${clampedTransmission}`);
    }
  }

  if (typeof object.material.emissiveIntensity === "number") {
    const factor = target === "mobile" ? 0.7 : 0.85;
    const nextIntensity = Number((object.material.emissiveIntensity * factor).toFixed(2));

    if (nextIntensity !== object.material.emissiveIntensity) {
      object.material.emissiveIntensity = nextIntensity;
      changesMade.push(`Trimmed emissive intensity on ${describeObject(object, fallbackLabel)} to ${nextIntensity}`);
    }
  }

  if (typeof object.material.envMapIntensity === "number") {
    const factor = target === "mobile" ? 0.65 : 0.8;
    const nextIntensity = Number((object.material.envMapIntensity * factor).toFixed(2));

    if (nextIntensity !== object.material.envMapIntensity) {
      object.material.envMapIntensity = nextIntensity;
      changesMade.push(`Lowered environment reflections on ${describeObject(object, fallbackLabel)} to ${nextIntensity}`);
    }
  }
}

function optimizeAnimations(scene: SceneData, target: OptimizationTarget, changesMade: string[]) {
  if (!Array.isArray(scene.animations) || scene.animations.length === 0) {
    return;
  }

  const speedFactor = target === "mobile" ? 0.6 : 0.85;
  let animationUpdates = 0;

  scene.animations = scene.animations.map((animation) => {
    if (animation.config && typeof animation.config.speed === "number") {
      animation.config.speed = Number((animation.config.speed * speedFactor).toFixed(2));
      animationUpdates += 1;
    }

    if (
      target === "mobile" &&
      animation.type === "pulse" &&
      "scale_range" in animation.config &&
      Array.isArray(animation.config.scale_range)
    ) {
      const [minScale, maxScale] = animation.config.scale_range;
      animation.config.scale_range = [
        Number(Math.max(0.98, minScale).toFixed(2)),
        Number(Math.min(1.02, maxScale).toFixed(2))
      ];
    }

    return animation;
  });

  if (animationUpdates > 0) {
    changesMade.push(`Reduced animation speeds across ${animationUpdates} animation channel${animationUpdates > 1 ? "s" : ""} for ${target}`);
  }
}

function flagRepeatedGeometry(scene: SceneData, changesMade: string[], furtherSuggestions: string[]) {
  const groups = new Map<string, SceneObject[]>();

  for (const object of scene.objects) {
    ensureRenderHints(object);
    const groupKey = object.asset ? `asset:${object.asset}` : `primitive:${object.shape || "box"}`;
    const group = groups.get(groupKey) ?? [];

    group.push(object);
    groups.set(groupKey, group);
  }

  for (const [groupKey, objects] of groups.entries()) {
    if (objects.length < 2) {
      continue;
    }

    objects.forEach((object) => {
      object.render_hints!.instancing_recommended = true;
    });

    const readableKey = groupKey.replace(/^asset:/, "").replace(/^primitive:/, "");
    changesMade.push(`Suggested instancing for repeated geometry group "${readableKey}" (${objects.length} objects)`);
    furtherSuggestions.push(`Use instancing for repeated ${readableKey} geometry to trim CPU submission cost`);
  }
}

function buildFurtherSuggestions(scene: SceneData, target: OptimizationTarget) {
  const suggestions = new Set<string>();
  const hasModelAssets = scene.objects.some((object) => Boolean(object.asset));
  const hasGlbAssets = scene.objects.some((object) => object.asset?.endsWith(".glb"));
  const hasTransmission = scene.objects.some((object) => typeof object.material.transmission === "number" && object.material.transmission > 0);

  if (hasModelAssets) {
    suggestions.add("Use drei <Preload /> for asset warming");
  }

  if (hasGlbAssets) {
    suggestions.add("Consider Draco compression if loading .glb files");
  }

  if (hasTransmission && target !== "mobile") {
    suggestions.add("Consider static environment maps for reflective or glass-heavy scenes");
  }

  if (scene.lighting.length > 1) {
    suggestions.add("Bake static lighting where possible to reduce runtime light cost");
  }

  if (target === "mobile") {
    suggestions.add("Prefer KTX2 or reduced texture atlases for mobile bandwidth savings");
  }

  return [...suggestions];
}

export function optimizeScene(scene: SceneData, target: OptimizationTarget) {
  const originalScene = JSON.parse(JSON.stringify(scene)) as SceneData;
  const updated = JSON.parse(JSON.stringify(scene)) as SceneData;
  const changesMade: string[] = [];

  const originalCost = analyzeSceneCost(originalScene);

  updated.objects.forEach((object, index) => {
    const fallbackLabel = `object_${index + 1}`;

    optimizeGeometry(object, target, changesMade, fallbackLabel);
    optimizeParticles(object, target, changesMade, fallbackLabel);
    optimizeTextures(object, target, changesMade, fallbackLabel);
    optimizeMaterial(object, target, changesMade, fallbackLabel);
  });

  optimizeLighting(updated, target, changesMade);
  optimizeAnimations(updated, target, changesMade);

  const furtherSuggestions = buildFurtherSuggestions(updated, target);
  flagRepeatedGeometry(updated, changesMade, furtherSuggestions);

  const optimizedCost = analyzeSceneCost(updated);

  const report: OptimizationReport = {
    target,
    original_cost: originalCost,
    optimized_cost: optimizedCost,
    changes_made: [...new Set(changesMade)],
    further_suggestions: [...new Set(furtherSuggestions)]
  };

  return {
    optimized_scene: updated,
    report
  };
}
