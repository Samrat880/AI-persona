import "~/styles/globals.css";

import { type Metadata } from "next";
import { Bebas_Neue, Geist } from "next/font/google";
import { Toaster } from "~/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Guru Ji",
  description: "Chat with Hitesh and Piyush AI mentors",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${bebasNeue.variable} dark`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
