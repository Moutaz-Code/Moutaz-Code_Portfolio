export type TagDef = {
  slug: string;
  label: string;
  aliases?: string[];
  category?:
    | "language"
    | "web"
    | "dotnet"
    | "game-dev"
    | "graphics"
    | "rendering"
    | "security"
    | "ai"
    | "university"
    | "research"
    | "it"
    | "tools"
    | "general";
};

export const TAGS: TagDef[] = [
  // General / meta
  { slug: "projects", label: "Projects", category: "general" },
  { slug: "portfolio", label: "Portfolio", category: "general" },
  { slug: "case-study", label: "Case Study", category: "general", aliases: ["case-studies", "case_study"] },
  { slug: "writing", label: "Writing", category: "general", aliases: ["blog", "post", "posts"] },
  { slug: "tutorial", label: "Tutorial", category: "general", aliases: ["how-to", "howto", "guide"] },
  { slug: "notes", label: "Notes", category: "general", aliases: ["note"] },

  // University / studies
  { slug: "university", label: "University", category: "university", aliases: ["uni", "college"] },
  { slug: "coursework", label: "Coursework", category: "university", aliases: ["university-work", "uni-work", "classwork"] },
  { slug: "studies", label: "Studies", category: "university", aliases: ["study", "studying"] },
  { slug: "assignments", label: "Assignments", category: "university", aliases: ["assignment"] },
  { slug: "capstone", label: "Capstone", category: "university", aliases: ["graduation-project", "final-year-project", "fyp"] },

  // Research
  { slug: "research", label: "Research", category: "research", aliases: ["r-and-d", "rnd", "investigation"] },
  { slug: "experiments", label: "Experiments", category: "research", aliases: ["experiment"] },
  { slug: "paper-review", label: "Paper Review", category: "research", aliases: ["paper", "papers", "literature-review", "lit-review"] },

  // Languages (C and C-style + more)
  { slug: "c", label: "C", category: "language" },
  { slug: "cpp", label: "C++", category: "language", aliases: ["c++", "cplusplus"] },
  { slug: "csharp", label: "C#", category: "language", aliases: ["c#", "cs", "c-sharp"] },
  { slug: "java", label: "Java", category: "language" },
  { slug: "kotlin", label: "Kotlin", category: "language" },
  { slug: "python", label: "Python", category: "language" },
  { slug: "rust", label: "Rust", category: "language" },
  { slug: "go", label: "Go", category: "language", aliases: ["golang"] },
  { slug: "typescript", label: "TypeScript", category: "language", aliases: ["ts"] },
  { slug: "javascript", label: "JavaScript", category: "language", aliases: ["js", "ecmascript"] },
  { slug: "sql", label: "SQL", category: "language" },

  // Web development (general)
  { slug: "web-development", label: "Web Development", category: "web", aliases: ["web-dev", "web", "frontend", "backend", "fullstack"] },
  { slug: "html", label: "HTML", category: "web" },
  { slug: "css", label: "CSS", category: "web" },
  { slug: "tailwind", label: "Tailwind CSS", category: "web", aliases: ["tailwindcss"] },
  { slug: "nodejs", label: "Node.js", category: "web", aliases: ["node", "node-js"] },
  { slug: "api", label: "APIs", category: "web", aliases: ["rest", "rest-api", "graphql"] },

  // JS frameworks & libraries
  { slug: "react", label: "React", category: "web" },
  { slug: "nextjs", label: "Next.js", category: "web", aliases: ["next"] },
  { slug: "vue", label: "Vue", category: "web", aliases: ["vuejs"] },
  { slug: "nuxt", label: "Nuxt", category: "web", aliases: ["nuxtjs"] },
  { slug: "svelte", label: "Svelte", category: "web", aliases: ["sveltekit"] },
  { slug: "astro", label: "Astro", category: "web" },
  { slug: "vite", label: "Vite", category: "web" },
  { slug: "angular", label: "Angular", category: "web" },
  { slug: "animejs", label: "anime.js", category: "web", aliases: ["anime-js"] },
  { slug: "motion", label: "Motion", category: "web", aliases: ["motion-dev", "motionone", "motion-one"] },
  { slug: "threejs", label: "Three.js", category: "graphics", aliases: ["three", "three-js"] },

  // .NET ecosystem
  { slug: "dotnet", label: ".NET", category: "dotnet", aliases: [".net", "dot-net", "dot_net", "net"] },
  { slug: "aspnet", label: "ASP.NET", category: "dotnet", aliases: ["asp.net", "aspnetcore", "asp-net", "asp-net-core"] },
  { slug: "wpf", label: "WPF", category: "dotnet" },
  { slug: "winui", label: "WinUI", category: "dotnet", aliases: ["winui3", "win-ui"] },
  { slug: "xaml", label: "XAML", category: "dotnet" },
  { slug: "entity-framework", label: "Entity Framework", category: "dotnet", aliases: ["ef", "ef-core", "entityframework", "entity-framework-core"] },

  // Game dev
  { slug: "game-dev", label: "Game Dev", category: "game-dev", aliases: ["gamedev", "game-development"] },
  { slug: "game-jam", label: "Game Jam", category: "game-dev", aliases: ["jam", "gamejam", "jam-game"] },
  { slug: "unity", label: "Unity", category: "game-dev", aliases: ["unity3d"] },
  { slug: "unreal", label: "Unreal Engine", category: "game-dev", aliases: ["ue", "ue5", "unreal-engine"] },
  { slug: "gameplay", label: "Gameplay", category: "game-dev" },
  { slug: "tools-dev", label: "Tools Dev", category: "game-dev", aliases: ["tooling"] },
  { slug: "technical-art", label: "Technical Art", category: "game-dev", aliases: ["tech-art"] },
  { slug: "vfx", label: "VFX", category: "game-dev", aliases: ["visual-effects"] },

  // Graphics programming & shaders
  { slug: "graphics-programming", label: "Graphics Programming", category: "graphics", aliases: ["graphics", "gpu", "rendering-code"] },
  { slug: "shaders", label: "Shaders", category: "graphics", aliases: ["shader", "shader-programming"] },
  { slug: "glsl", label: "GLSL", category: "graphics" },
  { slug: "hlsl", label: "HLSL", category: "graphics" },
  { slug: "shaderlab", label: "ShaderLab", category: "graphics", aliases: ["unity-shaderlab"] },

  // WebGL / OpenGL / DirectX / Vulkan
  { slug: "webgl", label: "WebGL", category: "graphics", aliases: ["web-gl"] },
  { slug: "opengl", label: "OpenGL", category: "graphics", aliases: ["gl"] },
  { slug: "directx", label: "DirectX", category: "graphics", aliases: ["dx", "d3d", "direct3d"] },
  { slug: "vulkan", label: "Vulkan", category: "graphics" },
  { slug: "metal", label: "Metal", category: "graphics" },

  // Rendering styles & techniques
  { slug: "rendering", label: "Rendering", category: "rendering" },
  { slug: "pbr", label: "PBR", category: "rendering", aliases: ["physically-based-rendering", "physically-based"] },
  { slug: "npr", label: "NPR", category: "rendering", aliases: ["non-photorealistic-rendering", "toon", "cel-shading", "celshading"] },
  { slug: "ray-tracing", label: "Ray Tracing", category: "rendering", aliases: ["raytracing", "rtx"] },
  { slug: "global-illumination", label: "Global Illumination", category: "rendering", aliases: ["gi"] },
  { slug: "ssao", label: "SSAO", category: "rendering" },
  { slug: "ssr", label: "SSR", category: "rendering", aliases: ["screen-space-reflections"] },
  { slug: "taa", label: "TAA", category: "rendering", aliases: ["temporal-aa"] },
  { slug: "msaa", label: "MSAA", category: "rendering" },
  { slug: "fxaa", label: "FXAA", category: "rendering" },
  { slug: "post-processing", label: "Post Processing", category: "rendering", aliases: ["postprocess", "postfx"] },
  { slug: "lighting", label: "Lighting", category: "rendering" },
  { slug: "materials", label: "Materials", category: "rendering" },
  { slug: "shadows", label: "Shadows", category: "rendering" },

  // 2D/3D rendering & animation
  { slug: "2d", label: "2D", category: "graphics", aliases: ["2d-rendering", "2d-animation"] },
  { slug: "3d", label: "3D", category: "graphics", aliases: ["3d-rendering", "3d-animation"] },
  { slug: "animation", label: "Animation", category: "graphics", aliases: ["anim"] },
  { slug: "rigging", label: "Rigging", category: "graphics" },

  // Cybersecurity / infosec
  { slug: "cybersecurity", label: "Cybersecurity", category: "security", aliases: ["cyber-security", "infosec", "info-sec", "information-security"] },
  { slug: "digital-forensics", label: "Digital Forensics", category: "security", aliases: ["forensics"] },
  { slug: "incident-response", label: "Incident Response", category: "security", aliases: ["ir"] },
  { slug: "threat-modeling", label: "Threat Modeling", category: "security" },
  { slug: "crypto", label: "Cryptography", category: "security", aliases: ["cryptography"] },
  { slug: "network-security", label: "Network Security", category: "security" },
  { slug: "appsec", label: "AppSec", category: "security", aliases: ["application-security"] },
  { slug: "reverse-engineering", label: "Reverse Engineering", category: "security", aliases: ["reversing"] },

  // AI / ML
  { slug: "ai", label: "AI", category: "ai", aliases: ["artificial-intelligence"] },
  { slug: "machine-learning", label: "Machine Learning", category: "ai", aliases: ["ml"] },
  { slug: "deep-learning", label: "Deep Learning", category: "ai", aliases: ["dl"] },
  { slug: "nlp", label: "NLP", category: "ai", aliases: ["natural-language-processing"] },
  { slug: "computer-vision", label: "Computer Vision", category: "ai", aliases: ["cv"] },
  { slug: "llm", label: "LLMs", category: "ai", aliases: ["large-language-models", "large-language-model"] },
  { slug: "onnx", label: "ONNX", category: "ai" },

  // IT / systems
  { slug: "it", label: "IT", category: "it", aliases: ["information-technology"] },
  { slug: "systems", label: "Systems", category: "it", aliases: ["systems-programming"] },
  { slug: "operating-systems", label: "Operating Systems", category: "it", aliases: ["os"] },
  { slug: "databases", label: "Databases", category: "it", aliases: ["database"] },
  { slug: "linux", label: "Linux", category: "it" },
  { slug: "windows", label: "Windows", category: "it" },
  { slug: "networking", label: "Networking", category: "it" },

  // Tools / deployment
  { slug: "git", label: "Git", category: "tools" },
  { slug: "github", label: "GitHub", category: "tools" },
  { slug: "vercel", label: "Vercel", category: "tools" },
  { slug: "docker", label: "Docker", category: "tools" },
  { slug: "ci-cd", label: "CI/CD", category: "tools", aliases: ["cicd", "ci", "cd"] },
];

/** Lookup a tag definition by its canonical slug. */
export const TAG_BY_SLUG = new Map(TAGS.map((t) => [t.slug, t]));

/** Resolve an alias (or label) to its canonical slug. */
export const ALIAS_TO_SLUG = new Map<string, string>();
for (const tag of TAGS) {
  for (const a of tag.aliases ?? []) {
    ALIAS_TO_SLUG.set(a.toLowerCase().trim(), tag.slug);
  }
  // Also map label variants as aliases
  ALIAS_TO_SLUG.set(tag.label.toLowerCase().trim(), tag.slug);
}
