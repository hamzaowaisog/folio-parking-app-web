// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// The product's frame: each app, its navigation and its switcher.

import type { FrameApp } from "@/components/frame/app-frame";

export const PRODUCT = "folio-parking-app-web";
/** the language the product opens in */
export const LANG = "en";
export const APPS: FrameApp[] = [
  {
    "id": "app",
    "name": "folio-parking-app-web",
    "shell": "topbar",
    "nav": [
      {
        "label": "Sign in",
        "route": "/sign-in"
      },
      {
        "label": "Create an account",
        "route": "/sign-up"
      },
      {
        "label": "Dashboard",
        "route": "/dashboard"
      },
      {
        "label": "My space",
        "route": "/my-space"
      },
      {
        "label": "Free spaces",
        "route": "/free-spaces"
      },
      {
        "label": "Profile",
        "route": "/profile"
      },
      {
        "label": "Gate Tue 14 Oct · live",
        "route": "/gate"
      },
      {
        "label": "Entry records",
        "route": "/admin/entry-records"
      },
      {
        "label": "Reports",
        "route": "/admin/reports"
      },
      {
        "label": "Unused spaces",
        "route": "/admin/unused-spaces"
      },
      {
        "label": "Employees",
        "route": "/admin/employees"
      },
      {
        "label": "Settings",
        "route": "/admin/settings"
      },
      {
        "label": "Admins",
        "route": "/admin/admins"
      }
    ],
    "routes": [
      "/sign-in",
      "/sign-up",
      "/dashboard",
      "/my-space",
      "/free-spaces",
      "/profile",
      "/gate",
      "/admin/entry-records",
      "/admin/reports",
      "/admin/unused-spaces",
      "/admin/employees",
      "/admin/settings",
      "/admin/admins"
    ]
  }
];
