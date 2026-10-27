import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { InteractionFeedback } from "@/components/ui/interaction-feedback";
import { ThemeSync } from "@/components/ui/theme-switch";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

// Inter з віссю optical size: на великих розмірах дає «display»-форми (щільніші), на 14 px — текстові. Один шрифт на весь інтерфейс.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Виразний акцент (лише hero входу): курсивний серіф поруч з Inter. Латиниця; в інтерфейсі лише англійські слова.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Property Workflows", template: "%s · Property Workflows" },
  description: "Repeatable property processes: templates, runs and tasks with clear owners.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: вбудований скрипт нижче ставить data-theme до гідратації (AC-DSYS-06, без спалаху теми).
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        <InteractionFeedback />
        {children}
      </body>
    </html>
  );
}
