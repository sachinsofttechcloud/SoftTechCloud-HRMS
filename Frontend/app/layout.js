import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import MainLayout from "./components/main-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const merri = Merriweather({
  variable: "--font-merri",
  subsets: ["latin"],
});

export const metadata = {
  title: "SoftTechCloud HRMS Portal",
  description: "Enterprise Human Resource Management System",
  icons: {
    icon: "/login/Logo-2.png",
    shortcut: "/login/Logo-2.png",
    apple: "/login/Logo-2.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${merri.variable} h-full antialiased scroll-smooth dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#020817] text-slate-100 antialiased">
        {/* Global theme background shared by all pages */}
        <div className="global-theme-bg" aria-hidden="true" />
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
