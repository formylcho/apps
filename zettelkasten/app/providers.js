"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  // PWA: Service Worker を登録（本番のみ。dev では HMR と干渉するため無効）
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
