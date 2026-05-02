import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Users } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto px-6 py-12 flex flex-col justify-center float-in">
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-3xl gradient-primary shadow-glow items-center justify-center mb-4">
          <Users className="text-white" size={32} />
        </div>
        <h1 className="font-display text-3xl font-bold text-gradient">Squad</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {mode === "signin" ? "Welcome back. Find your people." : "Join the squad. Never get ghosted again."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Display name"
            className="w-full px-4 py-3 rounded-2xl bg-input border border-border focus:border-accent outline-none text-sm"
          />
        )}
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-input border border-border focus:border-accent outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-input border border-border focus:border-accent outline-none text-sm"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-2xl gradient-primary text-white font-semibold shadow-glow tap-scale disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <button
        onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
        className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "No account? " : "Already have one? "}
        <span className="text-accent font-semibold">{mode === "signin" ? "Sign up" : "Sign in"}</span>
      </button>
    </div>
  );
}