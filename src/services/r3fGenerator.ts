import { isAssetConfirmed } from "./assetService.js";
import { Animation, SceneData, SceneObject } from "../types/scene.js";

export type R3FTypingMode = "none" | "typescript" | "prop-types";

export interface GenerateR3FOptions {
  typing?: R3FTypingMode;
}

function getAnimatedObjectIdSet(objects: SceneObject[], animations: Animation[]) {
  const animatedIds = new Set<string>();

  for (const obj of objects) {
    const isAnimated = animations.some((animation) => {
      return animation.target_id === obj.id || animation.target === obj.id || animation.target === obj.name;
    });

    if (isAnimated) {
      animatedIds.add(obj.id);
    }
  }

  return animatedIds;
}

function getRefName(index: number) {
  return index === 0 ? "primaryRef" : `object${index + 1}Ref`;
}

function getAxisBaseValue(values: number[], axis: "x" | "y" | "z") {
  if (axis === "x") return values[0];
  if (axis === "y") return values[1];
  return values[2];
}

function getDefaultSegments(shape: SceneObject["shape"]) {
  if (shape === "sphere") {
    return 64;
  }

  if (shape === "cylinder") {
    return 48;
  }

  return 1;
}

function resolveSegmentCount(object: SceneObject) {
  return object.render_hints?.segment_count ?? getDefaultSegments(object.shape);
}

function resolveAssetConfirmation(object: SceneObject) {
  if (!object.asset) {
    return false;
  }

  if (typeof object.asset_confirmed === "boolean") {
    return object.asset_confirmed;
  }

  return isAssetConfirmed(object.asset);
}

function inferFallbackShape(object: SceneObject): "box" | "sphere" | "cylinder" {
  if (object.shape) {
    return object.shape;
  }

  const lookup = `${object.name || ""} ${object.asset || ""}`.toLowerCase();

  if (lookup.includes("orb") || lookup.includes("sphere") || lookup.includes("globe")) {
    return "sphere";
  }

  if (lookup.includes("bottle") || lookup.includes("can")) {
    return "cylinder";
  }

  return "box";
}

function buildAnimationHooks(objects: SceneObject[], animations: Animation[]) {
  return animations.map((animation) => {
    const targetObject = objects.find((obj) => {
      return animation.target_id === obj.id || animation.target === obj.id || animation.target === obj.name;
    });

    if (!targetObject) {
      return "";
    }

    const objectIndex = objects.findIndex((obj) => obj.id === targetObject.id);
    const refName = getRefName(objectIndex);

    if (animation.type === "float" && "amplitude" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(targetObject.position, animation.config.axis)} + Math.sin(t) * ${animation.config.amplitude};
  });`;
    }

    if (animation.type === "rotate" && "range" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.rotation.${animation.config.axis} = ${getAxisBaseValue(targetObject.rotation, animation.config.axis)} + Math.sin(t) * ${animation.config.range};
  });`;
    }

    if (animation.type === "bounce" && "amplitude" in animation.config) {
      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    ${refName}.current.position.${animation.config.axis} = ${getAxisBaseValue(targetObject.position, animation.config.axis)} + Math.abs(Math.sin(t)) * ${animation.config.amplitude};
  });`;
    }

    if (animation.type === "pulse" && "scale_range" in animation.config) {
      const [minScale, maxScale] = animation.config.scale_range;
      const scaleDelta = maxScale - minScale;

      return `
  useFrame((state) => {
    if (!${refName}.current) return;
    const t = state.clock.getElapsedTime() * ${animation.config.speed};
    const pulseScale = ${minScale} + ((Math.sin(t) + 1) / 2) * ${scaleDelta};
    ${refName}.current.scale.set(
      ${targetObject.scale[0]} * pulseScale,
      ${targetObject.scale[1]} * pulseScale,
      ${targetObject.scale[2]} * pulseScale
    );
  });`;
    }

    return "";
  }).filter(Boolean).join("\n\n");
}

function buildLightJsx(scene: SceneData) {
  return scene.lighting.map((light) => {
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
  }).filter(Boolean).join("\n");
}

function buildComponentPropString(props: string[]) {
  return props.filter(Boolean).join(" ");
}

function buildObjectJsx(objects: SceneObject[], animatedObjectIds: Set<string>) {
  return objects.map((object, index) => {
    const objectRef = animatedObjectIds.has(object.id) ? `objectRef={${getRefName(index)}}` : "";
    const position = `position={${JSON.stringify(object.position)}}`;
    const scale = `scale={${JSON.stringify(object.scale)}}`;
    const material = `material={${JSON.stringify(object.material)}}`;
    const segmentCount = `segmentCount={${resolveSegmentCount(object)}}`;

    if (object.asset && resolveAssetConfirmation(object)) {
      const props = buildComponentPropString([
        `url="/models/${object.asset}"`,
        position,
        scale,
        objectRef
      ]);

      return `      <AssetModel ${props} />`;
    }

    if (object.asset) {
      const props = buildComponentPropString([
        `asset="${object.asset}"`,
        `shape="${inferFallbackShape(object)}"`,
        position,
        scale,
        material,
        segmentCount,
        objectRef
      ]);

      return `      {/* Replace with useGLTF('/models/${object.asset}') when model is available */}\n      <ProceduralAssetFallback ${props} />`;
    }

    const props = buildComponentPropString([
      `shape="${inferFallbackShape(object)}"`,
      position,
      scale,
      material,
      segmentCount,
      objectRef
    ]);

    return `      <ProceduralMesh ${props} />`;
  }).join("\n");
}

function buildTypeDefinitions(typing: R3FTypingMode) {
  if (typing !== "typescript") {
    return "";
  }

  return `
type Vector3Tuple = [number, number, number];
type MeshShape = "box" | "sphere" | "cylinder";
type ObjectRef = any;

type MaterialConfig = {
  type: "glass" | "metal" | "matte" | "standard";
  color: string;
  metalness?: number;
  roughness?: number;
  transmission?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flatShading?: boolean;
  envMapIntensity?: number;
};

interface MaterialLayerProps {
  material: MaterialConfig;
}

interface ProceduralMeshProps {
  shape: MeshShape;
  position: Vector3Tuple;
  scale: Vector3Tuple;
  material: MaterialConfig;
  segmentCount?: number;
  objectRef?: ObjectRef;
}

interface AssetModelProps {
  url: string;
  position: Vector3Tuple;
  scale: Vector3Tuple;
  objectRef?: ObjectRef;
}

interface ProceduralAssetFallbackProps extends ProceduralMeshProps {
  asset: string;
}
`;
}

function buildPropTypesBlock(typing: R3FTypingMode, hasConfirmedAssets: boolean) {
  if (typing !== "prop-types") {
    return "";
  }

  return `
const vector3PropType = PropTypes.arrayOf(PropTypes.number).isRequired;
const objectRefPropType = PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.shape({ current: PropTypes.any })
]);
const materialPropType = PropTypes.shape({
  type: PropTypes.oneOf(["glass", "metal", "matte", "standard"]).isRequired,
  color: PropTypes.string.isRequired,
  metalness: PropTypes.number,
  roughness: PropTypes.number,
  transmission: PropTypes.number,
  emissive: PropTypes.string,
  emissiveIntensity: PropTypes.number,
  flatShading: PropTypes.bool,
  envMapIntensity: PropTypes.number
}).isRequired;

MaterialLayer.propTypes = {
  material: materialPropType
};

ProceduralMesh.propTypes = {
  shape: PropTypes.oneOf(["box", "sphere", "cylinder"]).isRequired,
  position: vector3PropType,
  scale: vector3PropType,
  material: materialPropType,
  segmentCount: PropTypes.number,
  objectRef: objectRefPropType
};

ProceduralAssetFallback.propTypes = {
  asset: PropTypes.string.isRequired,
  shape: PropTypes.oneOf(["box", "sphere", "cylinder"]).isRequired,
  position: vector3PropType,
  scale: vector3PropType,
  material: materialPropType,
  segmentCount: PropTypes.number,
  objectRef: objectRefPropType
};
${hasConfirmedAssets ? `
AssetModel.propTypes = {
  url: PropTypes.string.isRequired,
  position: vector3PropType,
  scale: vector3PropType,
  objectRef: objectRefPropType
};` : ""}
`;
}

function buildSharedComponentBlock(typing: R3FTypingMode, hasConfirmedAssets: boolean) {
  const materialPropsType = typing === "typescript" ? ": MaterialLayerProps" : "";
  const meshPropsType = typing === "typescript" ? ": ProceduralMeshProps" : "";
  const assetPropsType = typing === "typescript" ? ": AssetModelProps" : "";
  const fallbackPropsType = typing === "typescript" ? ": ProceduralAssetFallbackProps" : "";

  return `
function MaterialLayer({ material }${materialPropsType}) {
  const materialProps = {
    color: material.color,
    metalness: material.metalness,
    roughness: material.roughness,
    envMapIntensity: material.envMapIntensity,
    emissive: material.emissive,
    emissiveIntensity: material.emissiveIntensity,
    flatShading: material.flatShading
  };

  if (material.type === "glass" || typeof material.transmission === "number") {
    return (
      <meshPhysicalMaterial
        {...materialProps}
        transmission={material.transmission ?? 0.5}
        transparent
      />
    );
  }

  return <meshStandardMaterial {...materialProps} />;
}

function ProceduralMesh({
  shape,
  position,
  scale,
  material,
  segmentCount = 1,
  objectRef
}${meshPropsType}) {
  const roundedSegments = Math.max(1, Math.round(segmentCount));
  const sphereWidthSegments = Math.max(8, roundedSegments);
  const sphereHeightSegments = Math.max(6, Math.round(sphereWidthSegments / 2));
  const cylinderSegments = Math.max(8, roundedSegments);

  return (
    <mesh ref={objectRef} position={position} scale={scale}>
      {shape === "sphere" ? (
        <sphereGeometry args={[1, sphereWidthSegments, sphereHeightSegments]} />
      ) : shape === "cylinder" ? (
        <cylinderGeometry args={[0.65, 0.65, 1.6, cylinderSegments]} />
      ) : (
        <boxGeometry args={[1, 1, 1, roundedSegments, roundedSegments, roundedSegments]} />
      )}
      <MaterialLayer material={material} />
    </mesh>
  );
}

${hasConfirmedAssets ? `
function AssetModel({ url, position, scale, objectRef }${assetPropsType}) {
  const gltf = useGLTF(url);
  const modelScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  return (
    <primitive
      ref={objectRef}
      object={modelScene}
      position={position}
      scale={scale}
      dispose={null}
    />
  );
}` : ""}

function ProceduralAssetFallback({
  asset,
  shape,
  position,
  scale,
  material,
  segmentCount = 24,
  objectRef
}${fallbackPropsType}) {
  if (/smartphone|phone/i.test(asset)) {
    // Replace with useGLTF('/models/smartphone.glb') when model is available
    return (
      <group ref={objectRef} position={position} scale={scale}>
        <mesh scale={[0.95, 1.8, 0.12]}>
          <boxGeometry args={[1, 1, 1, 4, 8, 1]} />
          <MaterialLayer material={material} />
        </mesh>
        <mesh position={[0, 0, 0.07]} scale={[0.84, 1.55, 0.02]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.42} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.78, 0.075]} scale={[0.18, 0.04, 0.01]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.05} />
        </mesh>
        <mesh position={[0.27, -0.73, 0.08]} scale={[0.16, 0.16, 0.01]}>
          <circleGeometry args={[1, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.12} />
        </mesh>
        <mesh position={[-0.28, 0.67, 0.08]} scale={[0.1, 0.1, 0.04]}>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial color="#0b1020" roughness={0.25} metalness={0.25} />
        </mesh>
        <mesh position={[-0.12, 0.67, 0.08]} scale={[0.07, 0.07, 0.04]}>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial color="#0b1020" roughness={0.25} metalness={0.25} />
        </mesh>
      </group>
    );
  }

  return (
    <ProceduralMesh
      shape={shape}
      position={position}
      scale={scale}
      material={material}
      segmentCount={segmentCount}
      objectRef={objectRef}
    />
  );
}
`;
}

function buildImports(hasConfirmedAssets: boolean, hasAnimations: boolean, typing: R3FTypingMode) {
  const reactImports = [
    hasConfirmedAssets ? "Suspense" : "",
    hasConfirmedAssets ? "useMemo" : "",
    hasAnimations ? "useRef" : ""
  ].filter(Boolean);
  const fiberImports = ["Canvas", hasAnimations ? "useFrame" : ""].filter(Boolean);
  const importLines = [
    reactImports.length > 0 ? `import { ${reactImports.join(", ")} } from "react";` : "",
    `import { ${fiberImports.join(", ")} } from "@react-three/fiber";`
  ].filter(Boolean);

  if (hasConfirmedAssets) {
    importLines.push(`import { useGLTF } from "@react-three/drei";`);
  }

  if (typing === "prop-types") {
    importLines.push(`import PropTypes from "prop-types";`);
  }

  return importLines.join("\n");
}

export function generateR3FCode(scene: SceneData, options: GenerateR3FOptions = {}) {
  const typing = options.typing ?? "none";
  const animationList = Array.isArray(scene.animations) ? scene.animations : [];
  const animatedObjectIds = getAnimatedObjectIdSet(scene.objects, animationList);
  const hasAnimations = animationList.length > 0;
  const hasConfirmedAssets = scene.objects.some((object) => object.asset && resolveAssetConfirmation(object));
  const refDeclarations = scene.objects
    .map((object, index) => {
      return animatedObjectIds.has(object.id) ? `  const ${getRefName(index)} = useRef(null);` : "";
    })
    .filter(Boolean)
    .join("\n");
  const animationHooks = buildAnimationHooks(scene.objects, animationList);
  const lightsCode = buildLightJsx(scene);
  const objectsCode = buildObjectJsx(scene.objects, animatedObjectIds);
  const background = scene.environment?.background?.value || "#ffffff";
  const imports = buildImports(hasConfirmedAssets, hasAnimations, typing);
  const typeDefinitions = buildTypeDefinitions(typing);
  const sharedComponents = buildSharedComponentBlock(typing, hasConfirmedAssets);
  const propTypesBlock = buildPropTypesBlock(typing, hasConfirmedAssets);
  const sceneContent = `function SceneContent() {
${refDeclarations || ""}
${animationHooks ? `\n${animationHooks}\n` : ""}
  return (
    <>
${lightsCode}
${objectsCode}
    </>
  );
}`;
  const canvasChildren = hasConfirmedAssets
    ? `      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>`
    : `      <SceneContent />`;

  return `${imports}
${typeDefinitions}
${sharedComponents}
${propTypesBlock}
${sceneContent}

export default function GeneratedScene() {
  return (
    <Canvas camera={{ position: ${JSON.stringify(scene.camera.position)}, fov: ${scene.camera.fov} }}>
      <color attach="background" args={["${background}"]} />
${canvasChildren}
    </Canvas>
  );
}
`;
}
