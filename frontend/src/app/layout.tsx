import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Tracker",
  description: "Track your stock and mutual fund investments",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground overflow-x-hidden antialiased">
        <AuthGuard>
          {/* Main Layout Container */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Nav Sidebar/Bottom Bar */}
            <BottomNav />

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 md:pl-64 flex flex-col">
              {/* Mobile Header (Sticky) */}
              <header className="md:hidden sticky top-0 z-40 bg-surface/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-base font-semibold">Portfolio Tracker</h1>
                <ThemeToggle />
              </header>

              {/* Desktop theme toggle (Fixed) */}
              <div className="hidden md:flex fixed top-4 right-4 z-50">
                <ThemeToggle />
              </div>

              {/* Scrollable Children Container */}
              <div className="flex-1 p-4 md:p-8 lg:p-12 max-w-6xl w-full mx-auto md:mx-0 overflow-x-hidden">
                {children}

                {/* Bottom spacer to account for mobile BottomNav */}
                <div className="h-24 md:hidden" />
              </div>
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
