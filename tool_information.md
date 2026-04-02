# Tool Information

This file contains the detailed reference for all 12 registered tools in `3dflow-mcp-server`.

## Tool Index

| # | Tool | Purpose |
| --- | --- | --- |
| 1 | `refine_prompt` | Extract structured design intent from free-form input |
| 2 | `generate_scene_plan` | Turn a prompt into a structured scene plan |
| 3 | `generate_scene` | Build the main `scene_data` object |
| 4 | `preview` | Visualize and inspect scene layout before code generation |
| 5 | `validate_scene` | Run defensive structural validation |
| 6 | `edit_scene` | Apply targeted scene edits without regeneration |
| 7 | `apply_animation` | Add, merge, or replace scene animations |
| 8 | `optimize_for_web` | Optimize scene data for desktop or mobile |
| 9 | `synthesize_geometry` | Produce geometry synthesis contracts |
| 10 | `generate_r3f_code` | Generate final React Three Fiber code |
| 11 | `export_asset` | Package outputs as downloadable file payloads |
| 12 | `integration_help` | Return framework-specific integration instructions |

## 1. `refine_prompt`

Purpose:

- Extract structured design intent from a free-form prompt before scene planning.

Key input:

- `user_prompt`

Key outputs:

- `refined_prompt`
- `design_tokens`
- `object_hints`
- `color_hints`

Best used when:

- the original prompt is broad or ambiguous
- you want cleaner design tokens before planning

## 2. `generate_scene_plan`

Purpose:

- Parse a natural-language request into a structured scene plan.
- Extract 1 to 4 physical objects, style, animation intent, use case, and downstream design tokens.

Key inputs:

- `refined_prompt`
- `context`

Key outputs:

- `scene_plan.objects`
- `scene_plan.style`
- `scene_plan.animation`
- `scene_plan.use_case`
- `scene_plan.design_tokens`
- `warnings`

Rules enforced:

- maximum 4 objects
- objects must be real visible nouns
- lighting words, effects, and background words are not treated as scene objects
- style resolves to a supported single-token style

## 3. `generate_scene`

Purpose:

- Convert a scene plan into the structured `scene_data` object used by downstream tools.

Key input:

- `scene_plan`

Key outputs:

- `scene_data`
- `warnings`

What it sets:

- `scene_id`
- `metadata`
- background
- camera
- lighting
- objects
- animations

Implementation detail:

- `design_tokens` are propagated into `scene_data.metadata`.

## 4. `preview`

Purpose:

- Return a spatial overview of the scene before code generation.

Key inputs:

- `scene_data`
- `view`: `top` | `front` | `side`

Key outputs:

- `svg_wireframe`
- `text_description`
- `spatial_validation`

What it helps catch:

- object overlap
- framing problems
- lighting imbalance
- invalid animation targets
- pending synthesis objects

Rule of thumb:

- if `confidence_score < 7`, revise the scene before generating code

## 5. `validate_scene`

Purpose:

- Run a defensive validation pass before synthesis and code generation.

Key inputs:

- `scene_data`
- `strict`

Key outputs:

- `is_valid`
- `strict_mode`
- `summary`
- `errors_detail`
- `next_step`

Coverage:

- 13 rules across structure, objects, lighting, and animation
- error-level failures block code generation
- `strict: true` promotes warnings into blocking errors

## 6. `edit_scene`

Purpose:

- Apply targeted natural-language edits to an existing `scene_data` object without rebuilding the entire scene.

Key inputs:

- `scene_data`
- `edit_prompt`

Key outputs:

- updated `scene_data`
- `edit_summary.applied`
- `edit_summary.skipped`
- `edit_summary.warnings`

Can modify:

- background tone or color
- object materials
- object position
- lighting intensity
- animation add, replace, or remove behavior

Cannot modify:

- add objects
- remove objects
- move the camera
- rewrite mesh geometry

## 7. `apply_animation`

Purpose:

- Add or stack animations on scene objects.

Animation types:

- `rotate`
- `float`
- `bounce`
- `pulse`

Key inputs:

- `scene_data`
- `animations`
- `merge`

Key outputs:

- `applied`
- `channel_conflicts`
- `summary`
- updated `scene_data`

Important behavior:

- multiple animation types can target the same object
- same-axis conflicts are detected and reported
- `float` and `bounce` on the same axis are merged additively in the generated code

## 8. `optimize_for_web`

Purpose:

- Optimize scene data for desktop or mobile web performance before final code generation.

Key inputs:

- `scene_data`
- `target`: `desktop` | `mobile`

Key outputs:

- `optimized_scene`
- `report`

What it does:

- reduces estimated rendering cost
- simplifies lighting
- lowers geometry and particle budgets
- reports the before-and-after cost summary

## 9. `synthesize_geometry`

Purpose:

- Return a synthesis contract for a named object so the assistant can generate valid JSX geometry.

Key inputs:

- `object_name`
- `style`
- `material_preset`
- `object_id`
- `complexity`
- `target`
- `base_color`
- `accent_color`

Key outputs:

- `synthesis_contract`
- `warnings`
- `next_step`

Complexity tiers:

| Tier | Parts | Best for |
| --- | --- | --- |
| `low` | 4-7 | Mobile banners and thumbnails |
| `medium` | 10-20 | Website sections and widgets |
| `high` | 28+ | Hero sections and ad campaigns |

Geometry rules:

- standard Three.js geometries only
- no `useGLTF`
- no external assets
- no custom buffer geometry
- root component must use `React.forwardRef`

## 10. `generate_r3f_code`

Purpose:

- Build the final React Three Fiber component from structured scene data and synthesized JSX components.

Key inputs:

- `scene_data`
- `synthesized_components`
- `framework`: `nextjs` | `vite` | `plain`
- `typing`: `none` | `typescript` | `prop-types`

Key outputs:

- `status`
- `r3f_code`
- `placeholder_object_count`
- `synthesized_object_count`
- `warnings`
- `language`

Material translation:

| Input material | Generated JSX |
| --- | --- |
| `glass` / `glass_frost` | `MeshTransmissionMaterial` |
| `metal` / `metal_chrome` | `meshPhysicalMaterial` with metalness |
| high emissive materials | `meshStandardMaterial` plus companion `pointLight` |
| matte / standard | `meshStandardMaterial` |

Graceful degradation:

- malformed or non-`forwardRef` synthesized JSX becomes a red wireframe placeholder
- failures are added to `warnings`
- `status` becomes `PARTIAL_SUCCESS`

## 11. `export_asset`

Purpose:

- Package generated output into a downloadable file payload.

Formats:

- `r3f`
- `json`

Call order:

```text
generate_r3f_code -> export_asset({ r3f_code, format: "r3f" })
generate_scene    -> export_asset({ scene_data, format: "json" })
```

Important note:

- do not pass `synthesized_components` to `export_asset`
- it packages content and does not regenerate code

## 12. `integration_help`

Purpose:

- Return framework-specific setup instructions and code examples for generated output.

Supported platforms:

- `react`
- `nextjs`
- `html`

Next.js specifics:

- `router` is required when `platform: "nextjs"`
- supports `app_router` and `pages_router`
- returns `dynamic(..., { ssr: false })`-style guidance

Typical outputs:

- install command
- component integration example
- page file example
- CSS height fix
- `next.config.js` snippet
- performance tips
