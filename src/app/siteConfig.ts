export const siteConfig = {
  siteName: "Moutaz",
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
    { label: "Home", href: "/" },
    { label: "Projects", href: "/projects" },
    { label: "Blog", href: "/blog" },
    { label: "Tags", href: "/tags" },
    { label: "Search", href: "/search" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Resume", href: "/resume" },
  ],

  /** When true, unknown tags cause a build warning via check:tags. */
  strictTags: false,
} as const;

export type NavItem = (typeof siteConfig.navItems)[number];
