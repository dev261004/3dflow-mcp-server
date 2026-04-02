# Sample Prompts for 3dflow MCP Server

These prompts are written for end users working through an MCP-enabled assistant. They are designed to help the assistant call the tools in the right order and explain what it is doing.

## How to Use These

- Paste one prompt into your MCP client.
- Let the assistant use the `3dflow-mcp-server` tools step by step.
- Ask follow-up questions with `edit_scene`, `apply_animation`, `optimize_for_web`, `export_asset`, or `integration_help` style intents when you want changes.

## 1. First-Time End-to-End Prompt

```text
Use the 3dflow MCP server to create a premium 3D hero scene for a chrome wristwatch advertisement.

Please follow this pipeline:
1. refine the prompt if needed
2. generate a scene plan
3. generate the scene data
4. preview and validate the scene
5. fix any issues if validation fails
6. synthesize the geometry requirements for the object
7. generate valid React.forwardRef JSX for the synthesized component
8. call generate_r3f_code with Next.js + TypeScript output
9. export the final asset as R3F
10. give me integration help for Next.js App Router

Visual direction:
- premium
- dark studio background
- soft chrome reflections
- subtle floating motion
- luxury ad look

Show me the important outputs at each step, not just the final code.
```

## 2. Website Hero Prompt

```text
Create a futuristic 3D landing page scene for a floating smartphone and payment card.

Use the 3dflow MCP server and keep the object count within the server's preferred limits.
I want:
- style: futuristic
- use case: website
- animation: float
- a vivid gradient background
- clean product spacing with no overlap

Please preview and validate before generating code. If validation warns about layout, fix the scene first.
Return Vite-compatible JSX output at the end.
```

## 3. Product Showcase Prompt

```text
Use the 3dflow tools to build a minimal product showcase scene for a sneaker.

Requirements:
- minimal style
- soft studio lighting
- no dramatic camera angle
- a single main object
- TypeScript output
- plain React framework target

I want the assistant to stop and summarize the preview and validation results before moving into final code generation.
```

## 4. Preview and Fix Prompt

```text
Take the latest scene_data from the 3dflow workflow, run preview and validate_scene, and fix anything that blocks generate_r3f_code.

If the scene is invalid:
- use edit_scene
- re-run preview
- re-run validate_scene

Do not move on to code generation until the scene is valid.
```

## 5. Revision Prompt

```text
Update the current 3d scene to feel more premium.

Please use edit_scene and then show me:
- what changed
- the updated scene_data summary
- a fresh preview result

Changes I want:
- darker background
- slightly brighter rim lighting
- glass-like material for the main object
- add subtle rotate animation
```

## 6. Animation Stacking Prompt

```text
Use apply_animation on the current scene and stack these animations on the main object:
- float on the y axis
- bounce on the y axis
- slow rotate on the y axis

Keep merge enabled.
Then explain any channel conflicts, preview the scene again, and continue only if the scene still validates cleanly.
```

## 7. Mobile Optimization Prompt

```text
Before final code generation, optimize the current scene for mobile web performance.

Use optimize_for_web with target mobile.
Then:
- summarize the optimization report
- tell me what was simplified
- continue with geometry synthesis and generate_r3f_code

Return TypeScript output for Next.js.
```

## 8. Geometry Synthesis Prompt

```text
For every synthesis-contract object in the current scene:
1. call synthesize_geometry
2. generate a valid React.forwardRef JSX component that follows the returned constraints exactly
3. pass the synthesized_components map into generate_r3f_code

Important:
- no imports inside synthesized components
- no exports inside synthesized components
- only raw JSX component strings
- use standard Three.js geometries only
- do not use useGLTF or external assets
```

## 9. Export Prompt

```text
Take the latest successful generate_r3f_code result and package it with export_asset as an R3F file.

Also export the latest scene_data as JSON so I have both:
- the generated component
- the structured scene definition
```

## 10. Integration Prompt

```text
Use integration_help for Next.js App Router and show me exactly how to wire the generated scene into a page.

I want:
- install command
- component file example
- page file example
- CSS height fix
- next.config.js snippet
- any performance tips that matter for production
```

## 11. Strict Validation Prompt

```text
Run validate_scene in strict mode on the current scene and act like this is heading to production.

If anything is promoted from warning to error:
- explain why
- fix it with edit_scene if possible
- re-run validation

Only continue to export if strict validation passes.
```

## 12. Troubleshooting Prompt

```text
My generated scene came back as PARTIAL_SUCCESS.

Please:
- inspect warnings
- tell me which synthesized component failed
- explain whether the fallback placeholder was used
- regenerate only the broken synthesized component
- run generate_r3f_code again
```

## Prompt Writing Tips

- Name 1 to 4 real physical objects, not abstract effects.
- Mention the use case: advertisement, website, showcase, or general.
- Mention style direction: premium, minimal, futuristic, playful, or dark.
- Say whether you want motion and what type of motion.
- Tell the assistant which framework you want at the end: plain React, Vite, or Next.js.
- Ask for `preview` and `validate_scene` explicitly if you want a safer pipeline.
