import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAuth } from "../lib/firebaseAuth";

export function LandingScreen() {
  const { signIn } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      await signIn();
    } catch (e: any) {
      console.error(e);
      if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
        toast.error(e?.message || "Sign in failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh relative overflow-hidden flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="absolute inset-0 -z-10" style={{ backgroundImage: "var(--gradient-glow)" }} />
      <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-primary/30 blur-3xl -z-10" />
      <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl -z-10" />

      <div className="float-in max-w-md w-full">
        <div className="inline-flex w-20 h-20 rounded-3xl gradient-primary shadow-glow items-center justify-center mb-6 pulse-ring">
          <Users className="text-white" size={40} />
        </div>
        <h1 className="font-display text-5xl font-bold text-gradient tracking-tight">Squad</h1>
        <p className="mt-4 text-base text-foreground/80 max-w-xs mx-auto leading-relaxed">
          Know where they are. Know who owes what.
        </p>

        <button
          onClick={onClick}
          disabled={busy}
          className="mt-12 w-full py-4 rounded-2xl bg-white text-neutral-900 font-semibold shadow-glow tap-scale disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-muted-foreground">
          By continuing you agree to play nice with your squad.
        </p>
      </div>
    </div>
  );
}