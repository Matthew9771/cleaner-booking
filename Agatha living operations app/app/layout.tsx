import type { Metadata } from "next";
import type { Viewport } from "next";
import { AppFooter } from "./app-footer";
import { NavCloseOnOutside } from "./nav-close-on-outside";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agatha Living Operations",
  description: "Property operations, cleaning jobs, and booking workflows.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agatha Living"
  },
  applicationName: "Agatha Living Operations"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#171512"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavCloseOnOutside />
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
