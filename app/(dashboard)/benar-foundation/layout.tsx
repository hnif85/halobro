"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function BenarFoundationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const desc = pathname.includes("/supported")
    ? "Kandidat penerima dana Yayasan Benar"
    : "Monitoring penerima dana Yayasan Benar";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-7xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Benar Foundation</h1>
        <p className="mt-1 text-sm text-zinc-500">{desc}</p>
      </div>

      {children}
    </motion.div>
  );
}
