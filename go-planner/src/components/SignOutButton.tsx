"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/core/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      disabled={loading}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-brand-navy transition hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "A sair…" : "Sair"}
    </button>
  );
}
