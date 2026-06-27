import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 写作助手",
  description: "智能写作助手 - 让 AI 帮你高效创作",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#f5f0eb" />
        {/* ─── Anti-flash: apply theme before paint ─── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('theme');
                if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                if (t === 'dark') document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = t;
                var m = document.querySelector('meta[name="theme-color"]');
                if (m) m.setAttribute('content', t === 'dark' ? '#1a1a2e' : '#f5f0eb');
              })();
            `,
          }}
        />
      </head>
      <body className="h-full flex flex-col overflow-hidden">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
