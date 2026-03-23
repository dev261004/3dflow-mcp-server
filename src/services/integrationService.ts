import { existsSync } from "node:fs";
import path from "node:path";

type Platform = "react" | "nextjs" | "html";
type ExportFormat = "r3f" | "json";
type NextRouterMode = "app_router" | "pages_router";

function hasTypeScriptConfig() {
  return existsSync(path.join(process.cwd(), "tsconfig.json"));
}

function getInstallCommand(platform: Platform) {
  if (platform === "html") {
    return "npm install three";
  }

  return "npm install three @react-three/fiber @react-three/drei";
}

function getFormatNote(format: ExportFormat) {
  if (format === "json") {
    return "If you exported JSON instead of R3F, first convert that scene data into a React Three Fiber component before wiring it into your app.";
  }

  return "Use the exported React Three Fiber component directly inside the integration examples below.";
}

function getReactGuide(format: ExportFormat) {
  return {
    platform: "react",
    install_command: getInstallCommand("react"),
    format_note: getFormatNote(format),
    steps: [
      "Install Three.js and React Three Fiber dependencies.",
      "Place any confirmed .glb models inside public/models so exported paths like /models/smartphone.glb resolve correctly.",
      "Render the exported scene component inside a container with an explicit height.",
      "If your export uses async assets, keep the component inside a Suspense boundary.",
      "Add performance helpers like <Preload all /> once the scene is stable."
    ],
    component_file: {
      file_path: "src/App.tsx",
      code: `
import { Suspense } from "react";
import { Preload, PerformanceMonitor } from "@react-three/drei";
import GeneratedScene from "./GeneratedScene";

export default function App() {
  return (
    <main className="scene-shell">
      <Suspense fallback={<div className="scene-loading">Loading 3D scene...</div>}>
        <PerformanceMonitor />
        <GeneratedScene />
        <Preload all />
      </Suspense>
    </main>
  );
}
`
    },
    css_fix: {
      note: "A missing explicit height is the most common reason the canvas appears blank.",
      code: `
html,
body,
#root {
  height: 100%;
  margin: 0;
}

.scene-shell {
  width: 100%;
  height: 100vh;
}
`
    },
    public_folder_setup: {
      folder: "public/models",
      note: "Copy any confirmed .glb assets into public/models and keep the file names identical to the exported paths."
    },
    performance_tips: [
      "Use <Preload all /> after your first successful render to warm asset fetches.",
      "Wrap the scene with <PerformanceMonitor /> when you want adaptive quality controls."
    ],
    typescript_note: hasTypeScriptConfig()
      ? "TypeScript config was detected in this workspace, so prefer exporting with the `typing: \"typescript\"` option and keep your generated component as .tsx."
      : undefined
  };
}

function getNextFilePaths(router: NextRouterMode) {
  if (router === "app_router") {
    return {
      sceneFile: "app/components/SceneClient.tsx",
      pageFile: "app/page.tsx"
    };
  }

  return {
    sceneFile: "components/SceneClient.tsx",
    pageFile: "pages/index.tsx"
  };
}

function getNextSceneComponentCode(router: NextRouterMode) {
  if (router === "app_router") {
    return `"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Preload, PerformanceMonitor } from "@react-three/drei";

const GeneratedScene = dynamic(() => import("./GeneratedScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading 3D scene...</div>
});

export default function SceneClient() {
  return (
    <section className="scene-shell">
      <Suspense fallback={<div className="scene-loading">Preparing canvas...</div>}>
        <PerformanceMonitor />
        <GeneratedScene />
        <Preload all />
      </Suspense>
    </section>
  );
}`;
  }

  return `import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Preload, PerformanceMonitor } from "@react-three/drei";

const GeneratedScene = dynamic(() => import("./GeneratedScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading 3D scene...</div>
});

export default function SceneClient() {
  return (
    <section className="scene-shell">
      <Suspense fallback={<div className="scene-loading">Preparing canvas...</div>}>
        <PerformanceMonitor />
        <GeneratedScene />
        <Preload all />
      </Suspense>
    </section>
  );
}`;
}

function getNextPageCode(router: NextRouterMode, sceneImportPath: string) {
  if (router === "app_router") {
    return `import SceneClient from "${sceneImportPath}";

export default function HomePage() {
  return <SceneClient />;
}`;
  }

  return `import dynamic from "next/dynamic";

const SceneClient = dynamic(() => import("${sceneImportPath}"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh" }}>Loading 3D scene...</div>
});

export default function HomePage() {
  return <SceneClient />;
}`;
}

function getNextCssFixCode(router: NextRouterMode) {
  if (router === "app_router") {
    return `
html,
body {
  width: 100%;
  min-height: 100%;
  margin: 0;
}

.scene-shell {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
}
`;
  }

  return `
html,
body,
#__next {
  width: 100%;
  height: 100%;
  margin: 0;
}

.scene-shell {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
}
`;
}

function getNextGuide(format: ExportFormat, router: NextRouterMode = "app_router") {
  const filePaths = getNextFilePaths(router);
  const isAppRouter = router === "app_router";

  return {
    platform: "nextjs",
    router,
    install_command: getInstallCommand("nextjs"),
    format_note: getFormatNote(format),
    steps: [
      "Install the Three.js, React Three Fiber, and drei packages.",
      "Set `transpilePackages` in next.config.js if your generated scene or local packages need transpilation through Next.js.",
      isAppRouter
        ? "Create a client component for the scene and keep the exported R3F canvas behind the `\"use client\"` directive."
        : "Keep the scene in a client-only component and disable SSR with next/dynamic in the page entry.",
      "Use a dynamic import with `ssr: false` and a loading fallback so the scene never renders on the server.",
      "Set an explicit height on html/body/root containers and your scene wrapper.",
      "Place confirmed .glb models under public/models so exported asset URLs resolve.",
      "Add <Preload all /> and <PerformanceMonitor /> after the scene is loading correctly."
    ],
    next_config: {
      file_path: "next.config.js",
      code: `
/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"]
};

export default nextConfig;
`
    },
    component_file: {
      file_path: filePaths.sceneFile,
      no_ssr_note: "The 3D canvas must stay client-side. Do not render the exported R3F component during SSR.",
      code: getNextSceneComponentCode(router)
    },
    page_file: {
      file_path: filePaths.pageFile,
      code: getNextPageCode(
        router,
        router === "app_router" ? "./components/SceneClient" : "../components/SceneClient"
      )
    },
    css_fix: {
      note: "If the scene mounts but the canvas is invisible, a missing height chain is usually the cause.",
      code: getNextCssFixCode(router)
    },
    public_folder_setup: {
      folder: "public/models",
      note: "Store confirmed .glb files in public/models and keep exported asset names unchanged, for example public/models/smartphone.glb."
    },
    performance_tips: [
      "Use <Preload all /> after the initial scene integration to warm model and texture requests.",
      "Use <PerformanceMonitor /> to downgrade effects or pixel ratio when frame time drops."
    ],
    typescript_note: hasTypeScriptConfig()
      ? "TypeScript config was detected in this workspace, so use `.tsx` files for the scene component and export with `typing: \"typescript\"` when possible."
      : undefined
  };
}

function getHtmlGuide(format: ExportFormat) {
  return {
    platform: "html",
    install_command: getInstallCommand("html"),
    format_note: format === "json"
      ? "JSON scene data still needs a renderer layer. For plain HTML, you will need to map that JSON into Three.js objects manually."
      : "For plain HTML integration, use the exported scene structure as a guide and wire it into Three.js manually.",
    steps: [
      "Install Three.js.",
      "Create a full-height canvas container before initializing the renderer.",
      "Load confirmed .glb files from /models with GLTFLoader when available.",
      "Fallback to simple procedural geometry for assets that are not available yet.",
      "Prefer React Three Fiber for easier animation and asset orchestration if the app grows."
    ],
    css_fix: {
      note: "Canvas height issues still apply in vanilla setups.",
      code: `
html,
body,
#scene-root {
  width: 100%;
  height: 100vh;
  margin: 0;
}
`
    },
    public_folder_setup: {
      folder: "models",
      note: "Serve .glb files from a static /models path so loaders can resolve them consistently."
    },
    performance_tips: [
      "Preload critical assets before starting the animation loop.",
      "Reduce geometry segments and texture sizes on mobile."
    ],
    typescript_note: hasTypeScriptConfig()
      ? "TypeScript config was detected, so consider keeping your Three.js integration in `.ts` modules for loader and scene typing."
      : undefined
  };
}

export function getIntegrationHelp(
  platform: Platform,
  format: ExportFormat,
  router?: NextRouterMode
) {
  if (platform === "react") {
    return getReactGuide(format);
  }

  if (platform === "nextjs") {
    return getNextGuide(format, router);
  }

  if (platform === "html") {
    return getHtmlGuide(format);
  }

  return {
    message: "Unsupported platform"
  };
}
