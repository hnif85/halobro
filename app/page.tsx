"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const token = localStorage.getItem("halobro_token");
    window.location.href = token ? "/benar-foundation" : "/login";
  }, []);

  return null;
}