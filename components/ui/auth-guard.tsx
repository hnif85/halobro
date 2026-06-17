"use client";

import { useEffect, useState, type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("halobro_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (typeof url === "string" && (url.startsWith("/api/") || url.startsWith(window.location.origin + "/api/"))) {
        const headers = new Headers(init?.headers);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return originalFetch(input, { ...init, headers });
      }
      return originalFetch(input, init);
    };

    setOk(true);

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!ok) return null;

  return <>{children}</>;
}
