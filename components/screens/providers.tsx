"use client";

// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// Around every page: the translations and the frame.

import type { ReactNode } from "react";
import { AppFrame } from "@/components/frame/app-frame";
import { I18nProvider } from "@/lib/i18n";
import { APPS, LANG, PRODUCT } from "./frame";

export function DesignProviders({ lang = LANG, children }: { lang?: string; children: ReactNode }) {
  return <I18nProvider lang={lang}><AppFrame product={PRODUCT} apps={APPS}>{children}</AppFrame></I18nProvider>;
}
