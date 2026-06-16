"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
      }
    }

    checkSession();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <form
        onSubmit={handleLogin}
        className="
          w-full max-w-sm
          space-y-5
          rounded-2xl
          border border-zinc-800
          bg-zinc-900/60
          p-8
          shadow-2xl
          backdrop-blur
        "
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Goal Tracker
          </h1>
          <p className="text-sm text-zinc-400">
            Sign in to continue
          </p>
        </div>

        <input
          className="
            w-full
            rounded-lg
            border border-zinc-700
            bg-zinc-950
            px-4 py-3
            text-sm
            outline-none
            focus:border-blue-500
            focus:ring-2 focus:ring-blue-500/20
          "
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="
            w-full
            rounded-lg
            border border-zinc-700
            bg-zinc-950
            px-4 py-3
            text-sm
            outline-none
            focus:border-blue-500
            focus:ring-2 focus:ring-blue-500/20
          "
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">
            {error}
          </p>
        )}

        <button
          className="
            w-full
            rounded-lg
            bg-blue-600
            py-3
            text-sm font-medium
            transition
            hover:bg-blue-500
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          disabled={loading || !email || !password}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}