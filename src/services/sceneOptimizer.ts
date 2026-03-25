import { v4 as uuidv4 } from "uuid";
import {
  Light,
  PrimitiveShape,
  SceneData,
  SceneObject,
  TextureResolution
} from "../types/scene.js";

type OptimizationTarget = "desktop" | "mobile";

interface CostSummary {
  estimated_triangles: number;
  draw_calls: number;
  lights: number;
}

interface OptimizationChange {
  description: string;
  impact: "real" | "no-op";
  confidence: number;
}

interface OptimizationReport {
  target: OptimizationTarget;
  original_cost: CostSummary;
  optimized_cost: CostSummary;
  changes_made: OptimizationChange[];
  further_suggestions: string[];
  draw_call_breakdown: { object: string; draw_calls: number }[];
}

const DEFAULT_SEGMENTS: Record<PrimitiveShape, number> = {
  box: 1,
  sphere: 64,
  cylinder: 48
};

const SEGMENT_CAPS: Record<OptimizationTarget, Record<PrimitiveShape, number>> = {
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

function isPrimitiveShape(shape: SceneObject["shape"]): shape is PrimitiveShape {
  return shape === "box" || shape === "sphere" || shape === "cylinder";
}

function getTransmissionValue(object: SceneObject) {
  const transmission = object.material?.transmission;
  return typeof transmission === "number" ? transmission : undefined;
}

function ensureRenderHints(object: SceneObject) {
  object.render_hints ??= {};

  if (isPrimitiveShape(object.shape)) {
    object.render_hints.segment_count ??= DEFAULT_SEGMENTS[object.shape];
  }

  if (object.synthesis_contract) {
    object.render_hints.bounding_box ??= object.synthesis_contract.bounding_box;
    object.render_hints.min_parts ??= object.synthesis_contract.min_parts;
    object.render_hints.complexity ??= object.synthesis_contract.complexity_hint;
  }

  if ((getTransmissionValue(object) ?? 0) > 0) {
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

  let drawCalls = object.type === "synthesis_contract"
    ? Math.max(1, object.render_hints?.min_parts ?? object.synthesis_contract?.min_parts ?? 1)
    : 1;

  if ((getTransmissionValue(object) ?? 0) > 0) {
    drawCalls += 1;
  }

  const particleCount = object.render_hints?.particle_count ?? 0;
  if (particleCount > 0) {
    drawCalls += Math.max(1, Math.ceil(particleCount / 160));
  }

  return drawCalls;
}

/**
 * Estimate actual triangle count for an object based on its geometry type and parameters.
 */
function estimateObjectTriangles(object: SceneObject): number {
  ensureRenderHints(object);

  let triangles = 0;

  if (object.type === "primitive" && isPrimitiveShape(object.shape)) {
    const segments = object.render_hints?.segment_count ?? DEFAULT_SEGMENTS[object.shape];

    if (object.shape === "box") {
      triangles += 12 * Math.max(1, segments * segments);
    }

    if (object.shape === "sphere") {
      const widthSeg = segments;
      const heightSeg = Math.max(2, Math.floor(segments / 2));
      triangles += widthSeg * heightSeg * 2;
    }

    if (object.shape === "cylinder") {
      // Three.js CylinderGeometry: radialSegments × 2 (body) + radialSegments × 2 (caps)
      triangles += segments * 2 + segments * 2;
    }
  }

  if (object.type === "synthesis_contract") {
    const minParts = object.render_hints?.min_parts ?? object.synthesis_contract?.min_parts ?? 4;
    const complexity = object.render_hints?.complexity ?? object.synthesis_contract?.complexity_hint ?? "medium";
    const perPartTriangles = complexity === "high" ? 220 : complexity === "low" ? 70 : 140;
    triangles += minParts * perPartTriangles;
  }

  const particleCount = object.render_hints?.particle_count ?? 0;
  if (particleCount > 0) {
    triangles += particleCount * 2;
  }

  return triangles;
}

function analyzeSceneCost(scene: SceneData): CostSummary {
  const drawCalls = scene.objects.reduce((total, object) => total + estimateObjectDrawCalls(object), 0);
  const estimatedTriangles = scene.objects.reduce((total, object) => total + estimateObjectTriangles(object), 0);

  return {
    estimated_triangles: estimatedTriangles,
    draw_calls: drawCalls,
    lights: scene.lighting.length
  };
}

function buildDrawCallBreakdown(scene: SceneData): { object: string; draw_calls: number }[] {
  return scene.objects.map((object, index) => ({
    object: object.name || `object_${index + 1}`,
    draw_calls: estimateObjectDrawCalls(object)
  }));
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

/**
 * Determines whether a material actually uses textures that would benefit from resolution reduction.
 * Matte materials with no asset reference have no textures to optimize.
 */
function hasActualTextures(object: SceneObject): boolean {
  return Boolean(object.render_hints?.texture_resolution);
}

function optimizeLighting(scene: SceneData, target: OptimizationTarget, changes: OptimizationChange[]) {
  const originalLightCount = scene.lighting.length;
  const ambientLights = scene.lighting.filter((light) => light.type === "ambient");
  const dynamicLights = scene.lighting.filter((light) => light.type !== "ambient");

  // Mobile: max 2 lights total (1 ambient + 1 directional)
  // Desktop: max 3 lights total
  const desiredMaxLights = target === "mobile" ? 2 : 3;

  const needsMerge =
    originalLightCount > desiredMaxLights ||
    dynamicLights.length > (target === "mobile" ? 1 : 2) ||
    ambientLights.length === 0;

  if (needsMerge) {
    scene.lighting = createMergedLightingRig(scene.lighting, target);
    const dynamicLabel = dynamicLights.length > 0
      ? `${dynamicLights.length} dynamic light${dynamicLights.length > 1 ? "s" : ""}`
      : `${originalLightCount} light${originalLightCount > 1 ? "s" : ""}`;
    const rigLabel = scene.lighting.length > 1 ? "1 ambient + 1 directional" : "1 ambient";

    changes.push({
      description: `Merged ${dynamicLabel} into ${rigLabel} rig (${originalLightCount} → ${scene.lighting.length})`,
      impact: scene.lighting.length < originalLightCount ? "real" : "no-op",
      confidence: 0.9
    });
  } else if (target === "mobile" && dynamicLights.length > 0) {
    // Even if we don't merge, reduce dynamic light intensities on mobile
    let reduced = 0;
    for (const light of scene.lighting) {
      if (light.type !== "ambient" && light.intensity > 0.6) {
        const prev = light.intensity;
        light.intensity = Number((light.intensity * 0.7).toFixed(2));
        reduced++;
      }
    }
    if (reduced > 0) {
      changes.push({
        description: `Reduced intensity on ${reduced} dynamic light${reduced > 1 ? "s" : ""} for mobile`,
        impact: "real",
        confidence: 0.75
      });
    }
  }
}

function optimizeGeometry(object: SceneObject, target: OptimizationTarget, changes: OptimizationChange[], fallbackLabel: string) {
  ensureRenderHints(object);

  if (!isPrimitiveShape(object.shape)) {
    return;
  }

  const currentSegments = object.render_hints?.segment_count ?? DEFAULT_SEGMENTS[object.shape];
  const targetSegments = Math.min(currentSegments, SEGMENT_CAPS[target][object.shape]);

  if (targetSegments < currentSegments) {
    const trisBefore = estimateObjectTriangles(object);
    object.render_hints!.segment_count = targetSegments;
    const trisAfter = estimateObjectTriangles(object);

    changes.push({
      description: `Reduced ${object.shape} segments from ${currentSegments} to ${targetSegments} on ${describeObject(object, fallbackLabel)} (≈${trisBefore} → ${trisAfter} triangles)`,
      impact: "real",
      confidence: 0.95
    });
  }
}

function optimizeParticles(object: SceneObject, target: OptimizationTarget, changes: OptimizationChange[], fallbackLabel: string) {
  ensureRenderHints(object);

  const currentParticles = object.render_hints?.particle_count;
  if (typeof currentParticles !== "number") {
    return;
  }

  const particleCap = PARTICLE_CAPS[target];
  if (currentParticles > particleCap) {
    object.render_hints!.particle_count = particleCap;
    changes.push({
      description: `Capped particle count ${currentParticles} → ${particleCap} for ${describeObject(object, fallbackLabel)}`,
      impact: "real",
      confidence: 0.9
    });
  }
}

function optimizeTextures(object: SceneObject, target: OptimizationTarget, changes: OptimizationChange[], fallbackLabel: string) {
  ensureRenderHints(object);

  if (!hasActualTextures(object)) {
    if (object.render_hints?.texture_resolution) {
      delete object.render_hints.texture_resolution;
    }
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
    changes.push({
      description: `Reduced texture resolution on ${describeObject(object, fallbackLabel)} from ${currentResolution} to ${targetResolution}`,
      impact: "real",
      confidence: 0.85
    });
  }
}

function optimizeMaterial(object: SceneObject, target: OptimizationTarget, changes: OptimizationChange[], fallbackLabel: string) {
  ensureRenderHints(object);

  const material = object.material;
  if (!material) {
    return;
  }

  const transmission = getTransmissionValue(object);

  if (target === "mobile" && (transmission ?? 0) > 0) {
    const originalTransmission = transmission!;

    material.type = "standard";
    material.roughness = Number(Math.max(material.roughness ?? 0.2, 0.42).toFixed(2));
    material.metalness = Number(Math.min(material.metalness ?? 0.08, 0.08).toFixed(2));
    delete material.transmission;
    object.render_hints!.transparency_mode = "approximate";

    changes.push({
      description: `Replaced transmission material (${originalTransmission}) on ${describeObject(object, fallbackLabel)} with cheaper opaque approximation`,
      impact: "real",
      confidence: 0.9
    });
  } else if (target === "desktop" && (transmission ?? 0) > 0.7) {
    const previousTransmission = transmission!;
    const clampedTransmission = Number(Math.min(transmission!, 0.7).toFixed(2));

    if (clampedTransmission < transmission!) {
      material.transmission = clampedTransmission;
      material.roughness = Number(Math.max(material.roughness ?? 0.12, 0.12).toFixed(2));
      changes.push({
        description: `Reduced transmission intensity on ${describeObject(object, fallbackLabel)} from ${previousTransmission} to ${clampedTransmission}`,
        impact: "real",
        confidence: 0.85
      });
    }
  }

  if (typeof material.emissiveIntensity === "number") {
    const factor = target === "mobile" ? 0.7 : 0.85;
    const nextIntensity = Number((material.emissiveIntensity * factor).toFixed(2));

    if (nextIntensity !== material.emissiveIntensity) {
      material.emissiveIntensity = nextIntensity;
      changes.push({
        description: `Trimmed emissive intensity on ${describeObject(object, fallbackLabel)} to ${nextIntensity}`,
        impact: "real",
        confidence: 0.7
      });
    }
  }

  if (typeof material.envMapIntensity === "number") {
    const factor = target === "mobile" ? 0.65 : 0.8;
    const nextIntensity = Number((material.envMapIntensity * factor).toFixed(2));

    if (nextIntensity !== material.envMapIntensity) {
      material.envMapIntensity = nextIntensity;
      changes.push({
        description: `Lowered environment reflections on ${describeObject(object, fallbackLabel)} to ${nextIntensity}`,
        impact: "real",
        confidence: 0.7
      });
    }
  }
}

function optimizeAnimations(scene: SceneData, target: OptimizationTarget, changes: OptimizationChange[]) {
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
    changes.push({
      description: `Reduced animation speeds across ${animationUpdates} animation channel${animationUpdates > 1 ? "s" : ""} for ${target}`,
      impact: "real",
      confidence: 0.8
    });
  }
}

function flagRepeatedGeometry(scene: SceneData, changes: OptimizationChange[], furtherSuggestions: string[]) {
  const groups = new Map<string, SceneObject[]>();

  for (const object of scene.objects) {
    ensureRenderHints(object);
    const groupKey = object.type === "synthesis_contract"
      ? `synthesis:${object.synthesis_contract?.category ?? "unknown"}:${object.name || object.id}`
      : `primitive:${object.shape || "box"}`;
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

    const readableKey = groupKey
      .replace(/^primitive:/, "")
      .replace(/^synthesis:/, "");
    changes.push({
      description: `Suggested instancing for repeated geometry group "${readableKey}" (${objects.length} objects)`,
      impact: "real",
      confidence: 0.85
    });
    furtherSuggestions.push(`Use instancing for repeated ${readableKey} geometry to trim CPU submission cost`);
  }
}

function buildFurtherSuggestions(scene: SceneData, target: OptimizationTarget, lightsWereReduced: boolean) {
  const suggestions = new Set<string>();
  const hasSynthesizedObjects = scene.objects.some((object) => object.type === "synthesis_contract");
  const hasTransmission = scene.objects.some((object) => (getTransmissionValue(object) ?? 0) > 0);

  if (hasSynthesizedObjects) {
    suggestions.add("Cache synthesized geometry per object/style/material combination to avoid repeated orchestration work");
  }

  if (hasTransmission && target !== "mobile") {
    suggestions.add("Consider static environment maps for reflective or glass-heavy scenes");
  }

  // Only suggest baking lights if we didn't already reduce them
  if (scene.lighting.length > 1 && !lightsWereReduced) {
    suggestions.add("Bake static lighting where possible to reduce runtime light cost");
  }

  if (target === "mobile") {
    suggestions.add("Prefer fewer meshes per synthesized object on mobile to trim draw calls");
  }

  return [...suggestions];
}

export function optimizeScene(scene: SceneData, target: OptimizationTarget) {
  const originalScene = JSON.parse(JSON.stringify(scene)) as SceneData;
  const updated = JSON.parse(JSON.stringify(scene)) as SceneData;
  const changes: OptimizationChange[] = [];

  const originalCost = analyzeSceneCost(originalScene);

  updated.objects.forEach((object, index) => {
    const fallbackLabel = `object_${index + 1}`;

    optimizeGeometry(object, target, changes, fallbackLabel);
    optimizeParticles(object, target, changes, fallbackLabel);
    optimizeTextures(object, target, changes, fallbackLabel);
    optimizeMaterial(object, target, changes, fallbackLabel);
  });

  const lightCountBefore = updated.lighting.length;
  optimizeLighting(updated, target, changes);
  const lightsWereReduced = updated.lighting.length < lightCountBefore ||
    changes.some((c) => c.description.toLowerCase().includes("light") && c.impact === "real");

  optimizeAnimations(updated, target, changes);

  const furtherSuggestions = buildFurtherSuggestions(updated, target, lightsWereReduced);
  flagRepeatedGeometry(updated, changes, furtherSuggestions);

  const optimizedCost = analyzeSceneCost(updated);

  // Deduplicate changes by description
  const seenDescriptions = new Set<string>();
  const deduplicatedChanges = changes.filter((change) => {
    if (seenDescriptions.has(change.description)) {
      return false;
    }
    seenDescriptions.add(change.description);
    return true;
  });

  const drawCallBreakdown = buildDrawCallBreakdown(updated);

  const report: OptimizationReport = {
    target,
    original_cost: originalCost,
    optimized_cost: optimizedCost,
    changes_made: deduplicatedChanges,
    further_suggestions: [...new Set(furtherSuggestions)],
    draw_call_breakdown: drawCallBreakdown
  };

  return {
    optimized_scene: updated,
    report
  };
}
