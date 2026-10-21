// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// The product's frame: each app, its navigation (each item for the roles that can open it) and its switcher.

import type { FrameApp } from "@/components/frame/app-frame";

export const PRODUCT = "Folio3 Parking";
/** the language the product opens in */
export const LANG = "en";
export const APPS: FrameApp[] = [
  {
    "id": "app",
    "name": "Folio3 Parking",
    "shell": "topbar",
    "nav": [
      {
        "label": "Dashboard",
        "route": "/dashboard",
        "roles": [
          "employee"
        ]
      },
      {
        "label": "My space",
        "route": "/my-space",
        "roles": [
          "employee"
        ]
      },
      {
        "label": "Free spaces",
        "route": "/free-spaces",
        "roles": [
          "employee"
        ]
      },
      {
        "label": "Profile",
        "route": "/profile",
        "roles": [
          "employee"
        ]
      },
      {
        "label": "Gate",
        "route": "/gate",
        "roles": [
          "gateGuard"
        ]
      },
      {
        "label": "Entry records",
        "route": "/admin/entry-records",
        "roles": [
          "parkingAdministrator"
        ]
      },
      {
        "label": "Reports",
        "route": "/admin/reports",
        "roles": [
          "parkingAdministrator"
        ]
      },
      {
        "label": "Unused spaces",
        "route": "/admin/unused-spaces",
        "roles": [
          "parkingAdministrator"
        ]
      },
      {
        "label": "Employees",
        "route": "/admin/employees",
        "roles": [
          "parkingAdministrator"
        ]
      },
      {
        "label": "Settings",
        "route": "/admin/settings",
        "roles": [
          "parkingAdministrator"
        ]
      },
      {
        "label": "Admins",
        "route": "/admin/admins",
        "roles": [
          "parkingAdministrator"
        ]
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
