import {
  buildCacheKey,
  getCachedGeometry,
  setCachedGeometry
} from "../lib/synthesisCache.js";
import {
  Animation,
  Material,
  PrimitiveShape,
  SceneData,
  SceneObject
} from "../types/scene.types.js";
import {
  AssembledR3FOutput,
  GenerateR3FResult,
  SynthesisContract,
  SynthesisRequiredOutput
} from "../types/synthesis.types.js";
import {
  ANIMATION_DEFAULTS,
  normalizePulseConfig
} from "../utils/animation.utils.js";

export type R3FTypingMode = "none" | "typescript" | "prop-types";
export type R3FFramework = "nextjs" | "vite" | "plain";

export interface GenerateR3FOptions {
  typing?: R3FTypingMode;
  framework?: R3FFramework;
  synthesized_components?: Record<string, string>;
}

type MaterialCategory = "transmission" | "physical" | "emissive" | "standard";

type SynthesizedComponentEntry = {
  objectId: string;
  object: SceneObject;
  componentName: string;
  refName: string;
  definitionBlock: string;
  verified: boolean;
  warningComment?: string;
  failureReason?: string;
};

const FALLBACK_PLACEHOLDER_COLOR = "#666666";
const FAILED_SYNTHESIS_PLACEHOLDER_COLOR = "#ff4444";

type AnimationPropertyKey =
  | "position.x"
  | "position.y"
  | "position.z"
  | "rotation.x"
  | "rotation.y"
  | "rotation.z"
  | "scale";

type AnimationHookGroup = {
  object: SceneObject;
  refName: string;
  property: AnimationPropertyKey;
  animations: Animation[];
};

function getSafeMaterial(material: Material | undefined | null): Material {
  return material ?? {
    type: "standard",
    color: FALLBACK_PLACEHOLDER_COLOR,
    roughness: 0.8,
    metalness: 0
  };
}

function classifyMaterial(material: Material | undefined | null): MaterialCategory {
  const safeMaterial = getSafeMaterial(material);

  if (
    safeMaterial.type === "glass" ||
    (typeof safeMaterial.transmission === "number" && safeMaterial.transmission > 0)
  ) {
    return "transmission";
  }

  if (
    safeMaterial.type === "metal" ||
    (typeof safeMaterial.metalness === "number" && safeMaterial.metalness >= 0.8)
  ) {
    return "physical";
  }

  if (
    typeof safeMaterial.emissiveIntensity === "number" &&
    safeMaterial.emissiveIntensity > 0.5
  ) {
    return "emissive";
  }

  return "standard";
}

function sceneUsesTransmission(scene: SceneData): boolean {
  return scene.objects.some((object) => {
    return classifyMaterial(object.material) === "transmission";
  });
}

function isPrimitiveShape(shape: SceneObject["shape"]): shape is PrimitiveShape {
  return shape === "box" || shape === "sphere" || shape === "cylinder";
}

function isSynthesisObject(object: SceneObject): object is SceneObject & {
  type: "synthesis_contract";
  shape: "SYNTHESIS_REQUIRED";
  synthesis_contract: SynthesisContract;
} {
  return object.type === "synthesis_contract" && object.shape === "SYNTHESIS_REQUIRED" && Boolean(object.synthesis_contract);
}

function getAnimatedObjectIdSet(objects: SceneObject[], animations: Animation[]) {
  const animatedIds = new Set<string>();

  for (const object of objects) {
    const isAnimated = animations.some((animation) => {
      return (
        animation.target_id === object.id ||
        animation.target === object.id ||
        animation.target === object.name
      );
    });

    if (isAnimated) {
      animatedIds.add(object.id);
    }
  }

  return animatedIds;
}

function buildRefNameMap(objects: SceneObject[]) {
  const usedNames = new Set<string>();
  const refNames = new Map<string, string>();

  for (const [index, object] of objects.entries()) {
    const rawName = object.name?.trim() || object.id || `object${index + 1}`;
    const pascalName = toPascalCase(rawName);
    const camelBase = pascalName ? `${pascalName.charAt(0).toLowerCase()}${pascalName.slice(1)}` : `object${index + 1}`;
    const identifierBase = /^[A-Za-z_$]/.test(camelBase) ? camelBase : `object${index + 1}`;
    let refName = `${identifierBase}Ref`;
    let suffix = 2;

    while (usedNames.has(refName)) {
      refName = `${identifierBase}${suffix}Ref`;
      suffix += 1;
    }

    usedNames.add(refName);
    refNames.set(object.id, refName);
  }

  return refNames;
}

function getRefNameForObject(object: SceneObject, refNameMap: Map<string, string>) {
  return refNameMap.get(object.id) ?? "objectRef";
}

function getAxisBaseValue(values: number[], axis: "x" | "y" | "z") {
  if (axis === "x") {
    return values[0];
  }

  if (axis === "y") {
    return values[1];
  }

  return values[2];
}

function isAnimationAxis(value: unknown): value is "x" | "y" | "z" {
  return value === "x" || value === "y" || value === "z";
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getAnimationTargetObject(objects: SceneObject[], animation: Animation) {
  return objects.find((object) => {
    return (
      animation.target_id === object.id ||
      animation.target === object.id ||
      animation.target === object.name
    );
  });
}

function resolveAnimationAxis(animation: Animation): "x" | "y" | "z" {
  const rawAxis = (animation.config as { axis?: unknown } | undefined)?.axis;

  if (isAnimationAxis(rawAxis)) {
    return rawAxis;
  }

  if (animation.type === "rotate") {
    return (ANIMATION_DEFAULTS.rotate.axis ?? "y") as "x" | "y" | "z";
  }

  if (animation.type === "float") {
    return (ANIMATION_DEFAULTS.float.axis ?? "y") as "x" | "y" | "z";
  }

  if (animation.type === "bounce") {
    return (ANIMATION_DEFAULTS.bounce.axis ?? "y") as "x" | "y" | "z";
  }

  return "y";
}

function resolveAnimationProperty(animation: Animation): AnimationPropertyKey | null {
  if (animation.type === "pulse") {
    return "scale";
  }

  const axis = resolveAnimationAxis(animation);

  if (animation.type === "rotate") {
    return `rotation.${axis}`;
  }

  if (animation.type === "float" || animation.type === "bounce") {
    return `position.${axis}`;
  }

  return null;
}

function resolveSegmentCount(object: SceneObject) {
  if (!isPrimitiveShape(object.shape)) {
    return 1;
  }

  if (object.shape === "sphere") {
    return object.render_hints?.segment_count ?? 64;
  }

  if (object.shape === "cylinder") {
    return object.render_hints?.segment_count ?? 48;
  }

  return object.render_hints?.segment_count ?? 1;
}

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);

  return code
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

function isVector3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function getSafeVector3(value: unknown, fallback: [number, number, number]): [number, number, number] {
  return isVector3(value) ? value : fallback;
}

function buildMaterialJsx(material: Material, extraIndent = 0): string {
  const safeMaterial = getSafeMaterial(material);
  const category = classifyMaterial(safeMaterial);
  const pad = " ".repeat(extraIndent);

  switch (category) {
    case "transmission": {
      const props = [
        `color="${safeMaterial.color}"`,
        `transmission={${safeMaterial.transmission ?? 0.85}}`,
        `roughness={${safeMaterial.roughness ?? 0.1}}`,
        `thickness={0.5}`,
        `chromaticAberration={0.03}`,
        `anisotropy={0.1}`,
        `distortion={0.0}`,
        `distortionScale={0.3}`,
        `temporalDistortion={0.0}`
      ];

      if (typeof safeMaterial.metalness === "number") {
        props.push(`metalness={${safeMaterial.metalness}}`);
      }

      if (typeof safeMaterial.envMapIntensity === "number") {
        props.push(`envMapIntensity={${safeMaterial.envMapIntensity}}`);
      }

      if (safeMaterial.emissive) {
        props.push(`emissive="${safeMaterial.emissive}"`);
        props.push(`emissiveIntensity={${safeMaterial.emissiveIntensity ?? 0.3}}`);
      }

      return `${pad}<MeshTransmissionMaterial\n${props.map((prop) => `${pad}  ${prop}`).join("\n")}\n${pad}/>`;
    }

    case "physical": {
      const props = [
        `color="${safeMaterial.color}"`,
        `metalness={${safeMaterial.metalness ?? 1}}`,
        `roughness={${safeMaterial.roughness ?? 0.05}}`
      ];

      if (typeof safeMaterial.envMapIntensity === "number") {
        props.push(`envMapIntensity={${safeMaterial.envMapIntensity}}`);
      }

      if (safeMaterial.emissive) {
        props.push(`emissive="${safeMaterial.emissive}"`);
        props.push(`emissiveIntensity={${safeMaterial.emissiveIntensity ?? 0}}`);
      }

      if (safeMaterial.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshPhysicalMaterial ${props.join(" ")} />`;
    }

    case "emissive": {
      const props = [
        `color="${safeMaterial.color}"`,
        `metalness={${safeMaterial.metalness ?? 0.2}}`,
        `roughness={${safeMaterial.roughness ?? 0.1}}`,
        `emissive="${safeMaterial.emissive || safeMaterial.color}"`,
        `emissiveIntensity={${safeMaterial.emissiveIntensity ?? 1}}`
      ];

      if (typeof safeMaterial.envMapIntensity === "number") {
        props.push(`envMapIntensity={${safeMaterial.envMapIntensity}}`);
      }

      if (safeMaterial.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }

    case "standard":
    default: {
      const props = [`color="${safeMaterial.color}"`];

      if (typeof safeMaterial.metalness === "number") {
        props.push(`metalness={${safeMaterial.metalness}}`);
      }

      if (typeof safeMaterial.roughness === "number") {
        props.push(`roughness={${safeMaterial.roughness}}`);
      }

      if (safeMaterial.emissive) {
        props.push(`emissive="${safeMaterial.emissive}"`);
        props.push(`emissiveIntensity={${safeMaterial.emissiveIntensity ?? 0}}`);
      }

      if (typeof safeMaterial.envMapIntensity === "number") {
        props.push(`envMapIntensity={${safeMaterial.envMapIntensity}}`);
      }

      if (safeMaterial.flatShading) {
        props.push("flatShading");
      }

      return `${pad}<meshStandardMaterial ${props.join(" ")} />`;
    }
  }
}

function buildEmissiveGlowLight(object: SceneObject): string {
  if (classifyMaterial(object.material) !== "emissive") {
    return "";
  }

  const material = getSafeMaterial(object.material);
  const glowColor = material.emissive || material.color;
  const intensity = Math.min((material.emissiveIntensity ?? 1) * 0.4, 1.5);
  const [x, y, z] = getSafeVector3(object.position, [0, 0, 0]);

  return `      <pointLight position={[${x}, ${y}, ${z}]} color="${glowColor}" intensity={${intensity.toFixed(2)}} distance={3} decay={2} />`;
}

function buildContributionName(type: string, axis: "x" | "y" | "z", index: number) {
  const suffix = axis.toUpperCase();

  return index === 1 ? `${type}${suffix}` : `${type}${suffix}${index}`;
}

function buildScalarAnimationHook(
  group: AnimationHookGroup,
  warnings: string[]
) {
  const [targetProperty, axis] = group.property.split(".") as ["position" | "rotation", "x" | "y" | "z"];
  const basePosition = getSafeVector3(group.object.position, [0, 0, 0]);
  const baseRotation = getSafeVector3(group.object.rotation, [0, 0, 0]);
  const baseValue = targetProperty === "position"
    ? getAxisBaseValue(basePosition, axis)
    : getAxisBaseValue(baseRotation, axis);
  const contributions: Array<{ variableName: string; expression: string }> = [];
  let floatCount = 0;
  let bounceCount = 0;
  let rotateCount = 0;

  for (const animation of group.animations) {
    if (animation.type === "float") {
      floatCount += 1;

      if (floatCount > 1) {
        warnings.push(
          `Duplicate float animations detected for '${group.object.name ?? group.object.id}' on ${group.property}. Only the first float animation will be applied.`
        );
        continue;
      }

      const config = animation.config as { speed?: unknown; amplitude?: unknown } | undefined;
      const speed = getFiniteNumber(config?.speed, ANIMATION_DEFAULTS.float.speed ?? 0.9);
      const amplitude = getFiniteNumber(config?.amplitude, ANIMATION_DEFAULTS.float.amplitude ?? 0.18);

      contributions.push({
        variableName: buildContributionName("float", axis, floatCount),
        expression: `Math.sin(t * ${speed}) * ${amplitude}`
      });
      continue;
    }

    if (animation.type === "bounce") {
      bounceCount += 1;
      const config = animation.config as { speed?: unknown; amplitude?: unknown } | undefined;
      const speed = getFiniteNumber(config?.speed, 1.0);
      const amplitude = getFiniteNumber(config?.amplitude, 0.1);

      contributions.push({
        variableName: buildContributionName("bounce", axis, bounceCount),
        expression: `Math.abs(Math.sin(t * ${speed})) * ${amplitude}`
      });
      continue;
    }

    if (animation.type === "rotate") {
      rotateCount += 1;
      const config = animation.config as { speed?: unknown; range?: unknown } | undefined;
      const speed = getFiniteNumber(config?.speed, ANIMATION_DEFAULTS.rotate.speed ?? 0.4);
      const range = getFiniteNumber(config?.range, ANIMATION_DEFAULTS.rotate.range ?? Math.PI);
      const isContinuous =
        animation.resolved_semantics === "continuous" ||
        range >= Math.PI;

      contributions.push({
        variableName: buildContributionName("rotate", axis, rotateCount),
        expression: isContinuous ? `t * ${speed}` : `Math.sin(t * ${speed}) * ${range}`
      });
    }
  }

  if (contributions.length === 0) {
    return "";
  }

  const contributionLines = contributions
    .map((contribution) => `    const ${contribution.variableName} = ${contribution.expression};`)
    .join("\n");
  const combinedExpression = contributions.map((contribution) => contribution.variableName).join(" + ");

  return `
  useFrame((state) => {
    if (!${group.refName}.current) return;
    const t = state.clock.getElapsedTime();
${contributionLines}
    ${group.refName}.current.${targetProperty}.${axis} = ${baseValue} + ${combinedExpression};
  });`;
}

function buildPulseAnimationHook(
  group: AnimationHookGroup,
  warnings: string[]
) {
  const baseScale = getSafeVector3(group.object.scale, [1, 1, 1]);
  let pulseAnimation: Animation | null = null;

  for (const animation of group.animations) {
    if (animation.type !== "pulse") {
      continue;
    }

    if (!pulseAnimation) {
      pulseAnimation = animation;
      continue;
    }

    warnings.push(
      `Duplicate pulse animations detected for '${group.object.name ?? group.object.id}' on scale. Only the first pulse animation will be applied.`
    );
  }

  if (!pulseAnimation) {
    return "";
  }

  const pulseConfig = normalizePulseConfig(
    (pulseAnimation.config ?? {}) as {
      speed?: number;
      amplitude?: number;
      scale?: number;
      scale_range?: [number, number];
      _derived?: {
        scale?: number;
        scale_range?: [number, number];
      };
    }
  );
  const [minScale, maxScale] = pulseConfig.scale_range ?? [1, pulseConfig.scale ?? 1.1];
  const speed = pulseConfig.speed ?? ANIMATION_DEFAULTS.pulse.speed ?? 1;
  const scaleDelta = maxScale - minScale;

  return `
  useFrame((state) => {
    if (!${group.refName}.current) return;
    const t = state.clock.getElapsedTime();
    const pulseScale = ${minScale} + ((Math.sin(t * ${speed}) + 1) / 2) * ${scaleDelta};
    ${group.refName}.current.scale.set(
      ${baseScale[0]} * pulseScale,
      ${baseScale[1]} * pulseScale,
      ${baseScale[2]} * pulseScale
    );
  });`;
}

function buildAnimationHooks(
  objects: SceneObject[],
  animations: Animation[],
  refNameMap: Map<string, string>
) {
  const groups = new Map<string, AnimationHookGroup>();
  const warnings: string[] = [];

  for (const animation of animations) {
    const targetObject = getAnimationTargetObject(objects, animation);
    const property = resolveAnimationProperty(animation);

    if (!targetObject || !property) {
      continue;
    }

    const key = `${targetObject.id}:${property}`;

    if (!groups.has(key)) {
      groups.set(key, {
        object: targetObject,
        refName: getRefNameForObject(targetObject, refNameMap),
        property,
        animations: []
      });
    }

    groups.get(key)?.animations.push(animation);
  }

  const hooks = [...groups.values()]
    .map((group) => {
      if (group.property === "scale") {
        return buildPulseAnimationHook(group, warnings);
      }

      return buildScalarAnimationHook(group, warnings);
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    hooks,
    warnings
  };
}

function buildLightingJsx(scene: SceneData) {
  return scene.lighting
    .map((light) => {
      if (light.type === "ambient") {
        return `      <ambientLight intensity={${light.intensity}} color="${light.color}" />`;
      }

      if (light.type === "directional") {
        return `      <directionalLight position={${JSON.stringify(light.position || [3, 4, 2])}} intensity={${light.intensity}} color="${light.color}" />`;
      }

      if (light.type === "spot") {
        return `      <spotLight position={${JSON.stringify(light.position || [2, 5, 2])}} intensity={${light.intensity}} color="${light.color}" />`;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildGeometryJsx(shape: PrimitiveShape, segmentCount: number, padSpaces: number): string {
  const pad = " ".repeat(padSpaces);
  const roundedSegments = Math.max(1, Math.round(segmentCount));

  if (shape === "sphere") {
    const widthSegments = Math.max(8, roundedSegments);
    const heightSegments = Math.max(6, Math.round(widthSegments / 2));
    return `${pad}<sphereGeometry args={[1, ${widthSegments}, ${heightSegments}]} />`;
  }

  if (shape === "cylinder") {
    const radialSegments = Math.max(8, roundedSegments);
    return `${pad}<cylinderGeometry args={[0.65, 0.65, 1.6, ${radialSegments}]} />`;
  }

  return `${pad}<boxGeometry args={[1, 1, 1, ${roundedSegments}, ${roundedSegments}, ${roundedSegments}]} />`;
}

function toPascalCase(value: string) {
  const segments = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  if (segments.length === 0) {
    return "SynthesizedObject";
  }

  return segments.join("");
}

function toPlaceholderToken(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "OBJECT";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractForwardRefComponentName(jsxString: string) {
  const match = jsxString.trim().match(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*React\.forwardRef\b/);

  return match?.[1] ?? null;
}

function ensureComponentDisplayName(componentCode: string, componentName: string) {
  const displayNamePattern = new RegExp(`\\b${escapeRegex(componentName)}\\.displayName\\s*=`);

  if (displayNamePattern.test(componentCode)) {
    return componentCode;
  }

  return `${componentCode}\n${componentName}.displayName = "${componentName}";`;
}

function buildSynthesizedComponentEntries(
  scene: SceneData,
  synthesizedComponents: Record<string, string>,
  refNameMap: Map<string, string>
) {
  const entries: SynthesizedComponentEntry[] = [];
  const warningComments: string[] = [];
  const warnings: string[] = [];

  for (const [objectId, jsxString] of Object.entries(synthesizedComponents)) {
    const object = scene.objects.find((entry) => entry.id === objectId);

    if (!object) {
      warningComments.push(`// Warning: synthesized component [${objectId}] has no matching object in scene_data; skipped.`);
      warnings.push(`Component with id '${objectId}' has no matching object in scene_data and was skipped.`);
      continue;
    }

    const trimmed = typeof jsxString === "string" ? jsxString.trim() : "";
    const extractedComponentName = extractForwardRefComponentName(trimmed);
    const componentName = extractedComponentName ?? `${toPascalCase(object.name ?? object.id)}Geometry`;
    const verified = Boolean(extractedComponentName);
    const failureReason = verified
      ? undefined
      : trimmed
        ? "Expected a top-level React.forwardRef component declaration."
        : "Component payload was empty.";
    const definitionBody = verified
      ? ensureComponentDisplayName(trimmed, componentName)
      : `// Warning: synthesized component [${objectId}] failed verification. Placeholder geometry will be rendered for this object.`;
    const warningComment = verified
      ? undefined
      : `// Warning: synthesized component [${objectId}] could not be verified and was replaced with a placeholder mesh.`;

    if (failureReason) {
      warnings.push(
        `Component '${object.name ?? object.id}' (id: ${objectId}) failed verification: ${failureReason} Rendered as placeholder.`
      );
    }

    entries.push({
      objectId,
      object,
      componentName,
      refName: getRefNameForObject(object, refNameMap),
      definitionBlock: `// Auto-synthesized geometry for: ${object.name ?? object.id}\n${definitionBody}`,
      verified,
      warningComment,
      failureReason
    });
  }

  return {
    entries,
    warningComments,
    warnings,
    entryByObjectId: new Map(entries.map((entry) => [entry.objectId, entry]))
  };
}

function getPlaceholderDimensions(object: SceneObject): [number, number, number] {
  const renderHintBox = object.render_hints?.bounding_box;

  if (
    Array.isArray(renderHintBox) &&
    renderHintBox.length === 3 &&
    renderHintBox.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)
  ) {
    return [renderHintBox[0], renderHintBox[1], renderHintBox[2]];
  }

  const synthesisBox = object.synthesis_contract?.bounding_box;

  if (
    Array.isArray(synthesisBox) &&
    synthesisBox.length === 3 &&
    synthesisBox.every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)
  ) {
    return [synthesisBox[0], synthesisBox[1], synthesisBox[2]];
  }

  return [0.5, 0.5, 0.5];
}

function buildPlaceholderObjectBlock(object: SceneObject, refName: string | null, note?: string) {
  const refProp = refName ? `ref={${refName}} ` : "";
  const position = `position={${JSON.stringify(getSafeVector3(object.position, [0, 0, 0]))}}`;
  const rotation = `rotation={${JSON.stringify(getSafeVector3(object.rotation, [0, 0, 0]))}}`;
  const scale = `scale={${JSON.stringify(getSafeVector3(object.scale, [1, 1, 1]))}}`;
  const [width, height, depth] = getPlaceholderDimensions(object);
  const comment = note ?? `Placeholder: ${object.name ?? object.id} synthesized geometry pending`;

  return [
    `      {/* ${comment} */}`,
    `      <mesh ${refProp}${position} ${rotation} ${scale}>`,
    `        <boxGeometry args={[${width}, ${height}, ${depth}]} />`,
    `        <meshStandardMaterial color="${FAILED_SYNTHESIS_PLACEHOLDER_COLOR}" wireframe />`,
    "      </mesh>"
  ].join("\n");
}

function buildSceneGraph(
  scene: SceneData,
  synthesizedComponents: Map<string, SynthesizedComponentEntry>,
  animatedObjectIds: Set<string>,
  refNameMap: Map<string, string>
) {
  const graph = scene.objects
    .map((object) => {
      const synthesizedEntry = synthesizedComponents.get(object.id);
      const refName = synthesizedEntry
        ? synthesizedEntry.refName
        : animatedObjectIds.has(object.id)
          ? getRefNameForObject(object, refNameMap)
          : null;
      const refProp = refName ? `ref={${refName}} ` : "";
      const position = `position={${JSON.stringify(getSafeVector3(object.position, [0, 0, 0]))}}`;
      const rotation = `rotation={${JSON.stringify(getSafeVector3(object.rotation, [0, 0, 0]))}}`;
      const scale = `scale={${JSON.stringify(getSafeVector3(object.scale, [1, 1, 1]))}}`;

      if (synthesizedEntry?.verified) {
        const lines = [
          `      <${synthesizedEntry.componentName} ${refProp}${position} ${rotation} ${scale} />`
        ];
        const glowLight = buildEmissiveGlowLight(object);

        if (glowLight) {
          lines.push(glowLight);
        }

        return lines.join("\n");
      }

      if (synthesizedEntry && !synthesizedEntry.verified) {
        return [
          synthesizedEntry.warningComment ?? "",
          buildPlaceholderObjectBlock(object, refName, `${object.name ?? object.id} placeholder rendered because synthesized component could not be verified`)
        ]
          .filter(Boolean)
          .join("\n");
      }

      if (isSynthesisObject(object)) {
        return buildPlaceholderObjectBlock(object, refName, `${object.name ?? object.id} placeholder rendered because synthesized JSX was not provided`);
      }

      if (object.type === "primitive" && isPrimitiveShape(object.shape)) {
        const lines = [
          `      <mesh ${refProp}${position} ${rotation} ${scale}>`,
          buildGeometryJsx(object.shape, resolveSegmentCount(object), 8),
          buildMaterialJsx(getSafeMaterial(object.material), 8),
          "      </mesh>"
        ];
        const glowLight = buildEmissiveGlowLight(object);

        if (glowLight) {
          lines.push(glowLight);
        }

        return lines.join("\n");
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");

  const placeholderObjectCount = scene.objects.filter((object) => {
    if (!isSynthesisObject(object)) {
      return false;
    }

    const entry = synthesizedComponents.get(object.id);

    return !entry || !entry.verified;
  }).length;

  return {
    graph,
    placeholderObjectCount
  };
}

function buildImports(
  hasAnimations: boolean,
  hasTransmission: boolean,
  hasRefs: boolean,
  typing: R3FTypingMode,
  hasRuntimeWarnings: boolean
) {
  const reactImports = ["Suspense"];

  if (hasRefs) {
    reactImports.push("useRef");
  }

  if (hasRuntimeWarnings) {
    reactImports.push("useEffect");
  }

  const fiberImports = ["Canvas"];
  if (hasAnimations) {
    fiberImports.push("useFrame");
  }

  const dreiImports = ["Environment"];
  if (hasTransmission) {
    dreiImports.push("MeshTransmissionMaterial");
  }

  const importLines = [
    `import React, { ${reactImports.join(", ")} } from "react";`,
    `import { ${fiberImports.join(", ")} } from "@react-three/fiber";`,
    `import { ${dreiImports.join(", ")} } from "@react-three/drei";`
  ];

  if (typing === "prop-types") {
    importLines.push(`import PropTypes from "prop-types";`);
  }

  return importLines.join("\n");
}

function buildRuntimeWarningEffect(warnings: string[]) {
  if (warnings.length === 0) {
    return "";
  }

  const lines = warnings
    .map((warning) => `    console.warn(${JSON.stringify(warning)});`)
    .join("\n");

  return `  useEffect(() => {
${lines}
  }, []);`;
}

function buildTypeDefinitions(typing: R3FTypingMode) {
  if (typing !== "typescript") {
    return "";
  }

  return `import type { Group, Mesh } from "three";

type ObjectRef = Group | Mesh;
`;
}

function buildPropTypesBlock(typing: R3FTypingMode) {
  if (typing !== "prop-types") {
    return "";
  }

  return `
GeneratedScene.propTypes = {};
`;
}

function getSceneStyle(scene: SceneData) {
  return scene.metadata?.style || "minimal";
}

function getSceneMaterialPreset(scene: SceneData) {
  return scene.metadata?.design_tokens?.material_preset || "matte_soft";
}

function getSceneAccentColor(scene: SceneData) {
  return scene.metadata?.color_hints?.find((hint) => hint.role === "accent")?.hex ?? "#00F5FF";
}

function getCacheKeyForObject(scene: SceneData, object: SceneObject) {
  return buildCacheKey({
    objectName: object.name || object.id,
    style: getSceneStyle(scene),
    materialPreset: getSceneMaterialPreset(scene),
    accentColor: getSceneAccentColor(scene)
  });
}

function buildSynthesizedComponentsTemplate(contractObjects: SceneObject[]) {
  const template: Record<string, string> = {};

  for (const object of contractObjects) {
    template[object.id] = `<REPLACE_WITH_JSX_FOR_${toPlaceholderToken(object.name || object.id)}>`;
  }

  return template;
}

function buildSynthesisRequiredResponse(
  contractObjects: SceneObject[],
  scene: SceneData,
  framework: R3FFramework,
  typing: R3FTypingMode,
  customMessage?: string
): SynthesisRequiredOutput {
  const contracts = contractObjects
    .filter(isSynthesisObject)
    .map((object) => object.synthesis_contract);

  return {
    status: "SYNTHESIS_REQUIRED",
    message:
      customMessage ??
      `${contractObjects.length} object(s) require geometry synthesis before code can be generated. Generate JSX geometry for each object listed in "objects_needing_synthesis" following their constraints exactly, then call generate_r3f_code again with the "synthesized_components" parameter populated.`,
    objects_needing_synthesis: contracts.map((contract) => ({
      object_id: contract.object_id,
      object_name: contract.object_name,
      category: contract.category,
      bounding_box: contract.bounding_box,
      complexity_tier: contract.complexity_tier,
      min_parts: contract.min_parts,
      max_parts: contract.max_parts,
      complexity_hint: contract.complexity_hint,
      lod_note: contract.lod_note,
      constraints: contract.constraints,
      expected_output: {
        component_name: `${toPascalCase(contract.object_name)}Geometry`,
        format: "React.forwardRef component - JSX only, no imports, no exports",
        example_signature: `const ${toPascalCase(contract.object_name)}Geometry = React.forwardRef((props, ref) => (\n  <group ref={ref}>\n    {/* meshes here */}\n  </group>\n));`
      }
    })),
    resume_instructions: {
      tool: "generate_r3f_code",
      call_with: {
        scene_data: "pass the same scene_data unchanged",
        framework,
        typing,
        synthesized_components: buildSynthesizedComponentsTemplate(contractObjects)
      },
      note: "Replace each placeholder value in synthesized_components with the actual JSX string you generated."
    }
  };
}

function assembleR3FComponent(
  scene: SceneData,
  framework: R3FFramework,
  typing: R3FTypingMode,
  synthesizedComponents: Record<string, string>
): AssembledR3FOutput {
  const animationList = Array.isArray(scene.animations) ? scene.animations : [];
  const animatedObjectIds = getAnimatedObjectIdSet(scene.objects, animationList);
  const refNameMap = buildRefNameMap(scene.objects);
  const synthesizedComponentEntries = buildSynthesizedComponentEntries(scene, synthesizedComponents, refNameMap);
  const refObjectIds = new Set(animatedObjectIds);
  const hasTransmission = sceneUsesTransmission(scene);

  for (const entry of synthesizedComponentEntries.entries) {
    refObjectIds.add(entry.objectId);
  }

  const hasAnimations = animatedObjectIds.size > 0;
  const hasRefs = refObjectIds.size > 0;
  const animationHooks = buildAnimationHooks(scene.objects, animationList, refNameMap);
  const runtimeWarningEffect = buildRuntimeWarningEffect(animationHooks.warnings);
  const refType = typing === "typescript" ? "<ObjectRef | null>" : "";
  const refDeclarations = scene.objects
    .map((object) => {
      return refObjectIds.has(object.id) ? `  const ${getRefNameForObject(object, refNameMap)} = useRef${refType}(null);` : "";
    })
    .filter(Boolean)
    .join("\n");

  const lightingJsx = buildLightingJsx(scene);
  const sceneGraph = buildSceneGraph(
    scene,
    synthesizedComponentEntries.entryByObjectId,
    animatedObjectIds,
    refNameMap
  );
  const injectedComponents = [
    ...synthesizedComponentEntries.warningComments,
    ...synthesizedComponentEntries.entries.map((entry) => entry.definitionBlock)
  ].join("\n\n");
  const imports = buildImports(
    hasAnimations,
    hasTransmission,
    hasRefs,
    typing,
    animationHooks.warnings.length > 0
  );
  const typeDefinitions = buildTypeDefinitions(typing);
  const propTypesBlock = buildPropTypesBlock(typing);
  const useClientDirective = framework === "nextjs" ? `"use client";\n\n` : "";
  const fallbackObjects = scene.objects
    .filter(isSynthesisObject)
    .filter((object) => {
      const entry = synthesizedComponentEntries.entryByObjectId.get(object.id);

      return !entry || !entry.verified;
    });
  const warnings = [
    ...synthesizedComponentEntries.warnings,
    ...fallbackObjects
      .filter((object) => !synthesizedComponentEntries.entryByObjectId.has(object.id))
      .map((object) => `Component '${object.name ?? object.id}' (id: ${object.id}) was not provided. Rendered as placeholder.`)
  ];

  const sceneContent = `function SceneContent() {
${refDeclarations || ""}
${runtimeWarningEffect ? `\n${runtimeWarningEffect}` : ""}${animationHooks.hooks ? `\n${animationHooks.hooks}\n` : ""}
  return (
    <>
${lightingJsx}
${sceneGraph.graph}
    </>
  );
}`;

  const fullComponent = `${useClientDirective}${imports}
${typeDefinitions}
${injectedComponents ? `${injectedComponents}\n\n` : ""}${sceneContent}

export default function GeneratedScene() {
  return (
    <Canvas camera={{ position: ${JSON.stringify(scene.camera.position)}, fov: ${scene.camera.fov} }}>
      <color attach="background" args={["${scene.environment.background.value}"]} />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} />
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
${propTypesBlock}`;

  return {
    status: sceneGraph.placeholderObjectCount > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
    r3f_code: fullComponent,
    language: typing === "typescript" ? "tsx" : "jsx",
    framework,
    synthesized_object_count: Object.keys(synthesizedComponents).length,
    placeholder_object_count: sceneGraph.placeholderObjectCount,
    warnings: warnings.length > 0 ? warnings : undefined,
    warning: sceneGraph.placeholderObjectCount > 0
      ? `Placeholder meshes were used for synthesized components: ${fallbackObjects.map((object) => object.name || object.id).join(", ")}.`
      : undefined,
    scene_id: scene.scene_id
  };
}

function generatePlaceholderScene(
  scene: SceneData,
  framework: R3FFramework,
  typing: R3FTypingMode
) {
  const useClientDirective = framework === "nextjs" ? `"use client";\n\n` : "";
  const language: "tsx" | "jsx" = typing === "typescript" ? "tsx" : "jsx";
  const cameraPosition = getSafeVector3(scene.camera?.position, [0, 2, 5]);
  const fov = typeof scene.camera?.fov === "number" ? scene.camera.fov : 50;
  const background = scene.environment?.background?.value ?? "#050a15";
  const objects = (scene.objects ?? [])
    .map((object) => {
      const position = getSafeVector3(object.position, [0, 0, 0]);
      const rotation = getSafeVector3(object.rotation, [0, 0, 0]);
      const scale = getSafeVector3(object.scale, [1, 1, 1]);
      const [width, height, depth] = getPlaceholderDimensions(object);

      return [
        `      {/* Placeholder: ${object.name ?? object.id ?? "object"} */}`,
        `      <mesh position={${JSON.stringify(position)}} rotation={${JSON.stringify(rotation)}} scale={${JSON.stringify(scale)}}>`,
        `        <boxGeometry args={[${width}, ${height}, ${depth}]} />`,
        `        <meshStandardMaterial color="${FAILED_SYNTHESIS_PLACEHOLDER_COLOR}" wireframe />`,
        "      </mesh>"
      ].join("\n");
    })
    .join("\n");

  return {
    language,
    r3f_code: `${useClientDirective}import React from "react";
import { Canvas } from "@react-three/fiber";

export default function PlaceholderScene() {
  return (
    <Canvas camera={{ position: ${JSON.stringify(cameraPosition)}, fov: ${fov} }}>
      <color attach="background" args={["${background}"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 2]} intensity={1} />
${objects}
    </Canvas>
  );
}`
  };
}

export function handleGenerateR3FCode(
  scene: SceneData,
  options: GenerateR3FOptions = {}
): GenerateR3FResult {
  const framework = options.framework ?? "plain";
  const typing = options.typing ?? "none";

  try {
    const sceneObjects = Array.isArray(scene.objects) ? scene.objects : [];
    const contractObjects = sceneObjects.filter(isSynthesisObject);
    const providedComponents = options.synthesized_components ?? {};
    const autoFilledComponents: Record<string, string> = { ...providedComponents };

    for (const object of contractObjects) {
      if (autoFilledComponents[object.id]) {
        continue;
      }

      const cachedGeometry = getCachedGeometry(getCacheKeyForObject(scene, object));
      if (cachedGeometry) {
        autoFilledComponents[object.id] = cachedGeometry;
      }
    }

    const result = assembleR3FComponent(scene, framework, typing, autoFilledComponents);

    for (const [objectId, jsx] of Object.entries(providedComponents)) {
      const object = contractObjects.find((entry) => entry.id === objectId);

      if (!object) {
        continue;
      }

      setCachedGeometry(getCacheKeyForObject(scene, object), {
        jsx,
        object_name: object.name || object.id,
        category: object.synthesis_contract.category,
        style: getSceneStyle(scene),
        material_preset: getSceneMaterialPreset(scene),
        accent_color: getSceneAccentColor(scene)
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown code generation failure.";
    const hint = "If you have synthesis_contract objects, ensure synthesized_components contains a JSX string for each object id. Do not pass object-type values; only raw JSX strings are accepted.";

    try {
      const fallback = generatePlaceholderScene(scene, framework, typing);

      return {
        status: "PARTIAL",
        warning: `Full codegen failed. Returning placeholder scene instead. Error: ${message}`,
        error: message,
        hint,
        r3f_code: fallback.r3f_code,
        language: fallback.language,
        framework,
        scene_id: scene?.scene_id ?? ""
      };
    } catch {
      return {
        status: "ERROR",
        error: message,
        hint,
        scene_id: scene?.scene_id ?? null
      };
    }
  }
}

export function generateR3FCode(scene: SceneData, options: GenerateR3FOptions = {}) {
  const result = handleGenerateR3FCode(scene, options);

  if (
    result.status === "SUCCESS" ||
    result.status === "PARTIAL_SUCCESS" ||
    result.status === "PARTIAL"
  ) {
    return result.r3f_code;
  }

  if (result.status === "SYNTHESIS_REQUIRED") {
    throw new Error(result.message);
  }

  if (result.status === "ERROR") {
    throw new Error(result.error);
  }

  throw new Error("Unknown generate_r3f_code failure.");
}
