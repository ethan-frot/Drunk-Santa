import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://drunk-santa.karpenkodaria.com"),
  title: {
    default: "Drunk-Santa",
    template: "%s — Drunk-Santa",
  },
  description:
    "Un mini-jeu d’arcade web en Next.js x Phaser où vous attrapez des objets, évitez les pièges et grimpez au classement.",
  applicationName: "Drunk-Santa",
  keywords: [
    "Jeu",
    "Arcade",
    "Next.js",
    "Phaser",
    "TypeScript",
    "Prisma",
    "PostgreSQL",
    "Docker",
    "Supabase",
  ],
  openGraph: {
    title: "Drunk-Santa",
    description:
      "Un mini-jeu d’arcade web en Next.js x Phaser où vous attrapez des objets, évitez les pièges et grimpez au classement.",
    url: "http://drunk-santa.karpenkodaria.com",
    siteName: "Drunk-Santa",
    images: [
      {
        url: "/assets/ui/main-menu/title-background.png",
        width: 1200,
        height: 630,
        alt: "Drunk-Santa",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Drunk-Santa",
    description:
      "Un mini-jeu d’arcade web en Next.js x Phaser où vous attrapez des objets, évitez les pièges et grimpez au classement.",
    images: ["/assets/ui/main-menu/title-background.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
  themeColor: "#121212",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
