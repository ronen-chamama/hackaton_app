import type { Metadata } from "next";
import {
  Alef,
  Arimo,
  Assistant,
  Bellefair,
  David_Libre,
  Frank_Ruhl_Libre,
  Handjet,
  Heebo,
  Karantina,
  M_PLUS_Rounded_1c,
  Open_Sans,
  Rubik,
  Rubik_Dirt,
  Rubik_Scribble,
  Secular_One,
  Varela_Round,
} from "next/font/google";
import "./globals.css";

// ---------------------------------------------------------------------------
// Hebrew-capable body fonts
// ---------------------------------------------------------------------------

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const arimo = Arimo({
  variable: "--font-arimo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const varela = Varela_Round({
  variable: "--font-varela",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: "400",
});

const mPlusRounded = M_PLUS_Rounded_1c({
  variable: "--font-mplus-rounded",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "800"],
});

const alef = Alef({
  variable: "--font-alef",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["400", "700"],
});

// ---------------------------------------------------------------------------
// Hebrew display / heading fonts
// ---------------------------------------------------------------------------

const secular = Secular_One({
  variable: "--font-secular",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: "400",
});

const karantina = Karantina({
  variable: "--font-karantina",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["300", "400", "700"],
});

const davidLibre = David_Libre({
  variable: "--font-david-libre",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["400", "700", "900"],
});

const bellefair = Bellefair({
  variable: "--font-bellefair",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: "400",
});

// ---------------------------------------------------------------------------
// Decorative / display fonts (primarily Latin, fall back to Heebo for Hebrew)
// ---------------------------------------------------------------------------

/** Grunge / graffiti texture — Subversive headings */
const rubikDirt = Rubik_Dirt({
  variable: "--font-rubik-dirt",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: "400",
});

/** Hand-scribbled — Subversive body accent */
const rubikScribble = Rubik_Scribble({
  variable: "--font-rubik-scribble",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: "400",
});

/** Matrix / terminal dot-matrix — Tech theme */
const handjet = Handjet({
  variable: "--font-handjet",
  subsets: ["hebrew", "latin"],
  display: "swap",
  weight: ["400", "700", "900"],
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Chamama Hackathon",
  description: "Chamama Hackathon System",
};

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    heebo.variable,
    assistant.variable,
    openSans.variable,
    rubik.variable,
    arimo.variable,
    varela.variable,
    mPlusRounded.variable,
    alef.variable,
    secular.variable,
    karantina.variable,
    davidLibre.variable,
    frankRuhl.variable,
    bellefair.variable,
    rubikDirt.variable,
    rubikScribble.variable,
    handjet.variable,
  ].join(" ");

  return (
    <html dir="rtl" lang="he" className={`${fontVars} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
