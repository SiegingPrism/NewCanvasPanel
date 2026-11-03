import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPublicAppOrigin(): string {
  const publicUrl = (import.meta.env?.VITE_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (typeof window === "undefined") return publicUrl;
  const isLocalOrApp =
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return isLocalOrApp && publicUrl ? publicUrl : window.location.origin;
}
