import { CATEGORY_MAP, detectCategory } from "./objectCategories.js";
import type { SynthesisContract } from "../types/synthesis.js";

export function buildSynthesisContract(params: {
  objectId: string;
  objectName: string;
  style: string;
  materialPreset: string;
  baseColor: string;
  accentColor: string;
}): SynthesisContract {
  const category = detectCategory(params.objectName);
  const config = CATEGORY_MAP[category];
  const materialInstructions = buildMaterialInstructions(
    params.materialPreset,
    params.baseColor,
    params.accentColor
  );

  return {
    __type: "SYNTHESIS_REQUIRED",
    object_id: params.objectId,
    object_name: params.objectName,
    category,
    bounding_box: config.bbox,
    min_parts: config.minParts,
    complexity_hint: config.complexityHint,
    style: params.style,
    material_preset: params.materialPreset,
    base_color: params.baseColor,
    accent_color: params.accentColor,
    constraints: {
      geometryOnly:
        "Use ONLY these Three.js geometries: BoxGeometry, SphereGeometry, CylinderGeometry, CapsuleGeometry, TorusGeometry, ConeGeometry, PlaneGeometry, RingGeometry. No custom buffer geometries.",
      boundingBox: `All meshes must fit within a bounding box of ${config.bbox[0]}w x ${config.bbox[1]}h x ${config.bbox[2]}d units, centered at world origin [0,0,0].`,
      minParts: `The group MUST contain at least ${config.minParts} distinct <mesh> elements. A single mesh or box is never acceptable.`,
      materialsAllowed:
        "Use only: meshPhysicalMaterial (for metal/glass), meshStandardMaterial (for matte/emissive/neon). No ShaderMaterial, no RawShaderMaterial.",
      materialInstructions,
      noExternalAssets:
        "NO useGLTF, NO useLoader, NO external URLs, NO asset imports of any kind. All geometry must be 100% procedural JSX.",
      refRequirement:
        "The root <group> element MUST accept a forwarded ref: use React.forwardRef and apply the ref to the root <group ref={ref}>.",
      returnFormat:
        "Return ONLY the JSX - a single React.forwardRef component. No import statements. No export statements. No markdown. No explanation. Just the raw JSX starting with: const ComponentName = React.forwardRef((",
      assemblyHint: config.assemblyHint,
      styleHint: `Visual style is "${params.style}". Reflect this in proportions, details, and material choices. Futuristic = sharp angles + neon accents. Premium = smooth + chrome. Playful = rounded + bright colors. Minimal = clean + simple forms.`,
      accentColorHint: `Primary accent color is ${params.accentColor}. Use it on emissive elements, glowing joints, edge highlights, or neon details via meshStandardMaterial with emissive="${params.accentColor}" and emissiveIntensity between 2 and 5.`
    },
    inject_into_tool: "generate_r3f_code",
    inject_as_parameter: "synthesized_components",
    parameter_format: `{ "${params.objectId}": "<raw JSX string of the forwardRef component>" }`
  };
}

function buildMaterialInstructions(
  materialPreset: string,
  baseColor: string,
  accentColor: string
): string {
  const presets: Record<string, string> = {
    metal_chrome: `Use meshPhysicalMaterial with color="${baseColor}", metalness={1}, roughness={0.04}, envMapIntensity={2.2} for primary surfaces. Use meshStandardMaterial with emissive="${accentColor}" and emissiveIntensity={3} for accent/glow elements.`,
    metal_brushed: `Use meshPhysicalMaterial with color="${baseColor}", metalness={0.85}, roughness={0.35} for primary surfaces. Accent elements use meshStandardMaterial with emissive="${accentColor}" and emissiveIntensity={1.5}.`,
    glass_clear: `Use meshPhysicalMaterial with color="${baseColor}", transmission={0.96}, roughness={0.02}, ior={1.5}, thickness={0.5} for glass surfaces. Structural elements use meshPhysicalMaterial with metalness={0.8} roughness={0.1}.`,
    glass_frost: `Use meshPhysicalMaterial with color="${baseColor}", transmission={0.75}, roughness={0.35}, ior={1.4}, thickness={0.3} for frosted glass. Frame/structure uses meshPhysicalMaterial with metalness={0.6}.`,
    matte_soft: `Use meshStandardMaterial with color="${baseColor}", roughness={0.85}, metalness={0} for matte surfaces. Accent elements use meshStandardMaterial with color="${accentColor}".`,
    plastic_gloss: `Use meshStandardMaterial with color="${baseColor}", roughness={0.15}, metalness={0.1} for glossy plastic. Accent details use meshStandardMaterial with color="${accentColor}" and roughness={0.05}.`
  };

  return (
    presets[materialPreset] ||
    `Use meshStandardMaterial with color="${baseColor}", roughness={0.5} for primary surfaces. Accent elements use color="${accentColor}".`
  );
}
