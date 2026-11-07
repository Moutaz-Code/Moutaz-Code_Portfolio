export const siteConfig = {
  siteName: "Moutaz Pharaon",
  siteTagline: "Technical Artist & Graphics Programmer",
  siteUrl: "https://moutaz.vercel.app/",
  defaultOgImage: "/og/default.png",
  twitterHandle: undefined as string | undefined,

  socialLinks: {
    github: "https://github.com/Moutaz-Code",
    linkedin: "https://www.linkedin.com/in/mou-taz-pharaon-8468b088/",
    email: "mailto:moutaz.pharaon@gmail.com",
    itch: "https://stalinsdietplan.itch.io/",
    shadertoy: "https://www.shadertoy.com/user/Motaz",
  },

  navItems: [
    { label: "Projects", href: "/#projects" },
    { label: "Shaders", href: "/#shaders" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "/#contact" },
  ],

  /** When true, unknown tags cause a build warning via check:tags. */
  strictTags: false,
} as const;

export type NavItem = (typeof siteConfig.navItems)[number];
