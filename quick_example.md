# Quick Example

This walkthrough shows a simple end-to-end use of the MCP server for a premium watch advertisement scene.

## Flow

```text
generate_scene_plan
  -> generate_scene
  -> validate_scene
  -> apply_animation
  -> generate_r3f_code
  -> export_asset
  -> integration_help
```

## 1. `generate_scene_plan`

Input:

```json
{
  "refined_prompt": "Create a premium hero scene for a chrome wristwatch floating above a dark studio floor with subtle motion and luxury ad lighting."
}
```

Representative output:

```json
{
  "scene_plan": {
    "objects": ["watch"],
    "style": "premium",
    "animation": "float",
    "use_case": "advertisement",
    "design_tokens": {
      "use_case": "advertisement",
      "theme": "premium",
      "material_preset": "metal_brushed",
      "animation": "float",
      "lighting_preset": "studio_dramatic",
      "background_preset": "dark_studio",
      "composition": "product_closeup"
    }
  }
}
```

## 2. `generate_scene`

Input:

```json
{
  "scene_plan": {
    "objects": ["watch"],
    "style": "premium",
    "animation": "float",
    "use_case": "advertisement",
    "design_tokens": {
      "use_case": "advertisement",
      "theme": "premium",
      "material_preset": "metal_brushed",
      "animation": "float",
      "lighting_preset": "studio_dramatic",
      "background_preset": "dark_studio",
      "composition": "product_closeup"
    }
  }
}
```

Key `scene_data` fields:

```json
{
  "scene_id": "scene_watch_ad",
  "metadata": {
    "use_case": "advertisement",
    "style": "premium"
  },
  "camera": {
    "type": "perspective"
  },
  "objects": [
    {
      "id": "watch_1",
      "type": "synthesis_contract",
      "name": "watch"
    }
  ],
  "animations": [
    {
      "type": "float",
      "target_id": "watch_1"
    }
  ]
}
```

## 3. `validate_scene`

Input:

```json
{
  "scene_data": "<scene_data from generate_scene>",
  "strict": false
}
```

Representative result:

```json
{
  "is_valid": true,
  "summary": {
    "total_rules_run": 13,
    "warnings": 0,
    "errors": 0
  },
  "next_step": "READY: All 13 validation checks passed. Proceed to synthesize_geometry -> generate_r3f_code."
}
```

## 4. `apply_animation`

To stack `float` and `bounce` on the same object:

```json
{
  "scene_data": "<validated scene_data>",
  "merge": true,
  "animations": [
    {
      "type": "float",
      "target_id": "watch_1",
      "config": { "axis": "y", "speed": 0.9, "amplitude": 0.18 }
    },
    {
      "type": "bounce",
      "target_id": "watch_1",
      "config": { "axis": "y", "speed": 0.6, "amplitude": 0.05 }
    }
  ]
}
```

Generated code pattern:

```js
const floatY = Math.sin(t * 0.9) * 0.18;
const bounceY = Math.abs(Math.sin(t * 0.6)) * 0.05;
watchRef.current.position.y = baseY + floatY + bounceY;
```

## 5. `generate_r3f_code`

Minimal valid synthesized component:

```json
{
  "scene_data": "<scene_data>",
  "framework": "nextjs",
  "typing": "typescript",
  "synthesized_components": {
    "watch_1": "const WatchGeometry = React.forwardRef((props, ref) => (\n  <group ref={ref}>\n    <mesh>\n      <torusGeometry args={[0.32, 0.05, 24, 64]} />\n      <meshPhysicalMaterial color=\"#d9ecff\" metalness={1} roughness={0.2} />\n    </mesh>\n  </group>\n));"
  }
}
```

Representative response:

```json
{
  "status": "SUCCESS",
  "language": "tsx",
  "framework": "nextjs",
  "synthesized_object_count": 1,
  "placeholder_object_count": 0
}
```

## 6. Generated Component Preview

```tsx
"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { Group, Mesh } from "three";

type ObjectRef = Group | Mesh;

const WatchGeometry = React.forwardRef((props, ref) => (
  <group ref={ref}>
    <mesh>
      <torusGeometry args={[0.32, 0.05, 24, 64]} />
      <meshPhysicalMaterial color="#d9ecff" metalness={1} roughness={0.2} />
    </mesh>
  </group>
));
WatchGeometry.displayName = "WatchGeometry";

function SceneContent() {
  const watchRef = useRef<ObjectRef | null>(null);
```

## 7. Next Steps

- Export the generated scene with `export_asset`.
- Ask `integration_help` for React or Next.js wiring instructions.
- Use [sample_prompt.md](./sample_prompt.md) for more end-user prompt patterns.
