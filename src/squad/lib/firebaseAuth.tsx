import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth, signInWithGoogle, firebaseSignOut } from "@/integrations/firebase/client";

interface FbAuthCtx {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<FbAuthCtx>({
  user: null, loading: true,
  signIn: async () => {}, signOut: async () => {},
});

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      // Treat anonymous sessions as "not signed in" for gating purposes
      setUser(u && !u.isAnonymous ? u : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <Ctx.Provider value={{
      user, loading,
      signIn: async () => { await signInWithGoogle(); },
      signOut: async () => { await firebaseSignOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useFirebaseAuth = () => useContext(Ctx);