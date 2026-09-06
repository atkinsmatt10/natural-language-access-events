import "./globals.css";
import { requireAccess } from "@/lib/auth";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";

export const metadata = {
  metadataBase: new URL("https://natural-language-postgres.vercel.app"),
  title: "Natural Language Postgres",
  description:
    "Chat with a Postgres database using natural language powered by the AI SDK by Vercel.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAccess();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistMono.className} ${GeistSans.className}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
