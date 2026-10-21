import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DesignProviders } from "@/components/screens/providers";
import { PRODUCT } from "@/components/screens/frame";
import "./globals.css";

export const metadata: Metadata = { title: PRODUCT };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        {/* the frame reads the address (useSearchParams), so it waits for the request */}
        <Suspense><DesignProviders>{children}</DesignProviders></Suspense>
      </body>
    </html>
  );
}
