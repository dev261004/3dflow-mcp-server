import type {
  Animation,
  SceneData,
  SceneObject,
  Severity,
  ValidationResult,
  Validator,
  Vector3
} from "../types/validate-scene.types.js";

export interface ValidatorDefinition {
  rule_id: string;
  rule_name: string;
  severity: Severity;
  validate: Validator;
}

function createFailure(
  rule_id: string,
  rule_name: string,
  severity: Severity,
  message: string,
  fix_hint: string,
  affected: string[] | null = null
): ValidationResult {
  return {
    rule_id,
    rule_name,
    severity,
    status: "fail",
    message,
    fix_hint,
    affected
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidVector3(value: unknown): value is Vector3 {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

function getObjects(scene: SceneData) {
  return Array.isArray(scene.objects) ? scene.objects : [];
}

function getLights(scene: SceneData) {
  return Array.isArray(scene.lighting) ? scene.lighting : [];
}

function getAnimations(scene: SceneData) {
  return Array.isArray(scene.animations) ? scene.animations : [];
}

function getObjectLabel(object: SceneObject, index: number) {
  const name = typeof object.name === "string" ? object.name.trim() : "";
  const id = typeof object.id === "string" ? object.id.trim() : "";

  return name || id || `object_${index + 1}`;
}

function getAnimationLabel(animation: Animation, index: number) {
  const id = typeof animation.id === "string" ? animation.id.trim() : "";

  return id || `animation_${index + 1}`;
}

function formatPosition(position: Vector3) {
  return `(${position[0]}, ${position[1]}, ${position[2]})`;
}

// ── Structure Validators ──

export const validateSceneId: Validator = (scene) => {
  if (typeof scene.scene_id === "string" && scene.scene_id.trim()) {
    return null;
  }

  return createFailure(
    "S1",
    "scene_id present",
    "error",
    "scene_data is missing scene_id. Was generate_scene called before validate_scene?",
    "Call generate_scene first to produce a valid scene_data with a scene_id before running validation."
  );
};

export const validateObjectsExist: Validator = (scene) => {
  if (Array.isArray(scene.objects) && scene.objects.length > 0) {
    return null;
  }

  return createFailure(
    "S2",
    "objects array exists and is non-empty",
    "error",
    "scene_data.objects is empty or missing. No geometry will be rendered.",
    "Add at least one object via generate_scene or edit_scene."
  );
};

export const validateCameraPosition: Validator = (scene) => {
  if (scene.camera && isValidVector3(scene.camera.position) && isFiniteNumber(scene.camera.position[2])) {
    return null;
  }

  return createFailure(
    "S3",
    "camera position is valid",
    "error",
    `Camera position is malformed: ${JSON.stringify(scene.camera ?? null)}`,
    "Camera position must be [x, y, z] with valid numbers. Example: [0, 2, 5]"
  );
};

export const validateCameraDistance: Validator = (scene) => {
  if (!scene.camera || !isValidVector3(scene.camera.position)) {
    return null;
  }

  const z = scene.camera.position[2];

  if (Math.abs(z) >= 1.0) {
    return null;
  }

  return createFailure(
    "S4",
    "camera not clipping through scene",
    "warn",
    `Camera Z position (${z}) is less than 1.0. Objects may clip through the camera near plane.`,
    "Move camera further back: position[2] should be >= 2.0 for most scenes."
  );
};

// ── Object Validators ──

export const validateObjectIds: Validator = (scene) => {
  const invalidObjects = getObjects(scene)
    .map((object, index) => ({ object, label: getObjectLabel(object, index) }))
    .filter(({ object }) => !(typeof object.id === "string" && object.id.trim()));

  if (invalidObjects.length === 0) {
    return null;
  }

  const affected = invalidObjects.map(({ label }) => label);

  return createFailure(
    "O1",
    "all objects have valid ids",
    "error",
    `Objects are missing id fields: [${affected.join(", ")}]. Animation targeting and ref wiring will fail.`,
    "Each object must have a unique string id. Re-run generate_scene to regenerate proper ids.",
    affected
  );
};

export const validateObjectPositions: Validator = (scene) => {
  const invalidObjects = getObjects(scene)
    .map((object, index) => ({ object, label: getObjectLabel(object, index) }))
    .filter(({ object }) => !isValidVector3(object.position));

  if (invalidObjects.length === 0) {
    return null;
  }

  const affected = invalidObjects.map(({ label }) => label);

  return createFailure(
    "O2",
    "all objects have valid positions",
    "error",
    `Objects have invalid position values: [${affected.join(", ")}]`,
    "Position must be [x, y, z] with finite numbers.",
    affected
  );
};

export const validateFrustumBounds: Validator = (scene) => {
  const outOfBounds = getObjects(scene)
    .map((object, index) => ({
      label: getObjectLabel(object, index),
      position: object.position
    }))
    .filter((entry): entry is { label: string; position: Vector3 } => isValidVector3(entry.position))
    .filter(({ position }) => Math.abs(position[0]) > 2.5 || Math.abs(position[2]) > 2.5);

  if (outOfBounds.length === 0) {
    return null;
  }

  const affected = outOfBounds.map(({ label, position }) => `${label} ${formatPosition(position)}`);

  return createFailure(
    "O3",
    "objects within camera frustum bounds",
    "warn",
    `Objects may be outside camera view: [${affected.join(", ")}]. X or Z position exceeds ±2.5 units.`,
    "Move objects closer to origin. Recommended range: X and Z within [-2.0, 2.0].",
    affected
  );
};

export const validateObjectOverlap: Validator = (scene) => {
  const validObjects = getObjects(scene)
    .map((object, index) => ({
      label: getObjectLabel(object, index),
      position: object.position
    }))
    .filter((entry): entry is { label: string; position: Vector3 } => isValidVector3(entry.position));
  const overlappingPairs: string[] = [];
  const affectedNames = new Set<string>();

  for (let index = 0; index < validObjects.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < validObjects.length; compareIndex += 1) {
      const left = validObjects[index];
      const right = validObjects[compareIndex];
      const distance = Math.sqrt(
        Math.pow(left.position[0] - right.position[0], 2) +
        Math.pow(left.position[2] - right.position[2], 2)
      );

      if (distance < 0.25) {
        overlappingPairs.push(`${left.label} ↔ ${right.label}`);
        affectedNames.add(left.label);
        affectedNames.add(right.label);
      }
    }
  }

  if (overlappingPairs.length === 0) {
    return null;
  }

  return createFailure(
    "O4",
    "no two objects share nearly identical XZ position",
    "warn",
    `Objects overlap at nearly identical positions: ${overlappingPairs.join(", ")}. They will render on top of each other.`,
    "Separate objects by at least 0.5 units on X or Z axis.",
    [...affectedNames]
  );
};

export const validateSynthesisContracts: Validator = (scene) => {
  const pendingObjects = getObjects(scene)
    .map((object, index) => ({ object, label: getObjectLabel(object, index) }))
    .filter(({ object }) => {
      return (
        object.type === "synthesis_contract" ||
        object.shape === "SYNTHESIS_REQUIRED" ||
        object.synthesis_contract?.__type === "SYNTHESIS_REQUIRED"
      );
    });

  if (pendingObjects.length === 0) {
    return null;
  }

  const affected = pendingObjects.map(({ label }) => label);

  return createFailure(
    "O5",
    "synthesis contracts have no orphan pending contracts",
    "error",
    `Objects have unresolved synthesis contracts: [${affected.join(", ")}]. Call synthesize_geometry before generate_r3f_code or these objects will render as empty.`,
    "Call synthesize_geometry for each pending object and pass results to generate_r3f_code via synthesized_components before generating code.",
    affected
  );
};

// ── Lighting Validators ──

export const validateLightingExists: Validator = (scene) => {
  const hasNonAmbientLight = getLights(scene).some((light) => light.type !== "ambient");

  if (hasNonAmbientLight) {
    return null;
  }

  return createFailure(
    "L1",
    "at least one non-ambient light exists",
    "warn",
    "Scene has only ambient lighting. 3D geometry will appear flat with no visible depth.",
    "Add at least one spot, directional, or point light to reveal material depth and chrome reflections."
  );
};

export const validateLightIntensities: Validator = (scene) => {
  const invalidLights = getLights(scene)
    .map((light, index) => {
      const lightId = typeof light.id === "string" && light.id.trim() ? light.id : `light_${index + 1}`;

      return {
        lightId,
        intensity: light.intensity
      };
    })
    .filter(({ intensity }) => !isFiniteNumber(intensity) || intensity <= 0 || intensity > 20);

  if (invalidLights.length === 0) {
    return null;
  }

  const affected = invalidLights.map(({ lightId, intensity }) => `${lightId} (${String(intensity)})`);

  return createFailure(
    "L2",
    "light intensities are within reasonable range",
    "warn",
    `Light intensities out of reasonable range: [${affected.join(", ")}]. Intensities should be between 0.1 and 10.`,
    "Adjust light intensity to a value between 0.1 and 10.",
    affected
  );
};

// ── Animation Validators ──

export const validateAnimationTargets: Validator = (scene) => {
  const availableIds = getObjects(scene)
    .map((object) => (typeof object.id === "string" ? object.id.trim() : ""))
    .filter(Boolean);
  const availableIdSet = new Set(availableIds);
  const invalidAnimations = getAnimations(scene)
    .map((animation, index) => ({ animation, label: getAnimationLabel(animation, index) }))
    .filter(({ animation }) => {
      return typeof animation.target_id === "string" && animation.target_id.trim() && !availableIdSet.has(animation.target_id);
    });

  if (invalidAnimations.length === 0) {
    return null;
  }

  const affected = invalidAnimations.map(({ label, animation }) => `${label} → ${animation.target_id}`);
  const availableIdsText = availableIds.length > 0 ? availableIds.join(", ") : "none";

  return createFailure(
    "A1",
    "all animation target_ids resolve to real object ids",
    "error",
    `Animations target non-existent objects: [${affected.join(", ")}]. useFrame hooks will operate on null refs silently.`,
    `Correct animation.target_id to match an existing object.id. Available ids: [${availableIdsText}]`,
    affected
  );
};

export const validateAnimationConfigs: Validator = (scene) => {
  const invalidAnimations = getAnimations(scene)
    .map((animation, index) => ({ animation, label: getAnimationLabel(animation, index) }))
    .flatMap(({ animation, label }) => {
      const config = animation.config ?? {};

      if (
        (animation.type === "float" || animation.type === "bounce") &&
        !(isFiniteNumber(config.amplitude) && config.amplitude > 0)
      ) {
        return [`${label} (${animation.type} requires config.amplitude > 0)`];
      }

      if (
        (animation.type === "rotate" || animation.type === "pulse") &&
        !(isFiniteNumber(config.speed) && config.speed > 0)
      ) {
        return [`${label} (${animation.type} requires config.speed > 0)`];
      }

      return [];
    });

  if (invalidAnimations.length === 0) {
    return null;
  }

  const affected = invalidAnimations.map((entry) => entry.split(" (")[0]);

  return createFailure(
    "A2",
    "animation config has required fields per type",
    "warn",
    `Animation configs are missing required fields: [${invalidAnimations.join(", ")}]`,
    "Float and bounce require config.amplitude > 0. Rotate and pulse require config.speed > 0.",
    affected
  );
};

export const VALIDATOR_DEFINITIONS: ValidatorDefinition[] = [
  { rule_id: "S1", rule_name: "scene_id present", severity: "error", validate: validateSceneId },
  {
    rule_id: "S2",
    rule_name: "objects array exists and is non-empty",
    severity: "error",
    validate: validateObjectsExist
  },
  {
    rule_id: "S3",
    rule_name: "camera position is valid",
    severity: "error",
    validate: validateCameraPosition
  },
  {
    rule_id: "S4",
    rule_name: "camera not clipping through scene",
    severity: "warn",
    validate: validateCameraDistance
  },
  { rule_id: "O1", rule_name: "all objects have valid ids", severity: "error", validate: validateObjectIds },
  {
    rule_id: "O2",
    rule_name: "all objects have valid positions",
    severity: "error",
    validate: validateObjectPositions
  },
  {
    rule_id: "O3",
    rule_name: "objects within camera frustum bounds",
    severity: "warn",
    validate: validateFrustumBounds
  },
  {
    rule_id: "O4",
    rule_name: "no two objects share nearly identical XZ position",
    severity: "warn",
    validate: validateObjectOverlap
  },
  {
    rule_id: "O5",
    rule_name: "synthesis contracts have no orphan pending contracts",
    severity: "error",
    validate: validateSynthesisContracts
  },
  {
    rule_id: "L1",
    rule_name: "at least one non-ambient light exists",
    severity: "warn",
    validate: validateLightingExists
  },
  {
    rule_id: "L2",
    rule_name: "light intensities are within reasonable range",
    severity: "warn",
    validate: validateLightIntensities
  },
  {
    rule_id: "A1",
    rule_name: "all animation target_ids resolve to real object ids",
    severity: "error",
    validate: validateAnimationTargets
  },
  {
    rule_id: "A2",
    rule_name: "animation config has required fields per type",
    severity: "warn",
    validate: validateAnimationConfigs
  }
];

export const ALL_VALIDATORS: Validator[] = VALIDATOR_DEFINITIONS.map((definition) => definition.validate);
