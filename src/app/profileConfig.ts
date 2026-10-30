export const profileConfig = {
  name: "Moutaz",
  role: "Technical Artist & Graphics Programmer",
  pitch:
    "I make games in Unity and spend most of my time on the rendering side: shaders, post-processing, lighting, and whatever it takes to make a scene look the way it should. Outside games I've built a forensics platform, Android apps and web tools.",
  ctas: [
    { label: "View My Projects", href: "/projects", variant: "primary" as const },
    { label: "Resume", href: "/resume", variant: "secondary" as const },
    { label: "Contact Me", href: "/contact", variant: "secondary" as const },
  ],
  // Grouped skills for clarity and easy editing
  skills: [
    {
      group: "Graphics",
      items: ["HLSL", "GLSL", "Shader Graph", "URP & Render Graph", "Post-processing", "Lighting"],
    },
    {
      group: "Games",
      items: ["Unity (URP, HDRP)", "C#", "Godot", "Blender"],
    },
    {
      group: "Software",
      items: ["C++", "Java", "Python", "TypeScript", "Android", "Astro"],
    },
    {
      group: "Tools",
      items: ["Git", "Qt", "Tailwind CSS"],
    },
  ],
  experience: [
    {
      title: "Game Development Mentor",
      org: "Endless Studios",
      period: "2026 – Present",
    },
    {
      title: "Game Development Intern",
      org: "Pixoul Gaming",
      period: "Summer 2026",
    },
    {
      title: "B.Eng. Information Technology",
      org: "Abu Dhabi University",
      period: "2021 – 2026",
    },
  ],
} as const;
