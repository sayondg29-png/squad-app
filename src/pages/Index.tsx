import { useState } from "react";
import { SquadProvider } from "@/squad/context/SquadContext";
import { AuthProvider } from "@/squad/lib/auth";
import { FirebaseAuthProvider, useFirebaseAuth } from "@/squad/lib/firebaseAuth";
import { AppShell, ScreenId } from "@/squad/components/AppShell";
import { HomeScreen } from "@/squad/screens/HomeScreen";
import { MapScreen } from "@/squad/screens/MapScreen";
import { ExpensesScreen } from "@/squad/screens/ExpensesScreen";
import { LateScreen } from "@/squad/screens/LateScreen";
import { ProfileScreen } from "@/squad/screens/ProfileScreen";
import { LandingScreen } from "@/squad/screens/LandingScreen";
import { Loader2 } from "lucide-react";

const AppContent = () => {
  const { user, loading } = useFirebaseAuth();
  const [screen, setScreen] = useState<ScreenId>("home");
  const [openAdd, setOpenAdd] = useState(0);

  const handleFab = () => {
    if (screen === "late") {
      return;
    }
    setScreen("expenses");
    setOpenAdd(v => v + 1);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!user) return <LandingScreen />;

  return (
    <SquadProvider>
      <AppShell active={screen} onChange={(s) => setScreen(s)} onFab={handleFab}>
        {screen === "home" && <HomeScreen />}
        {screen === "map" && <MapScreen />}
        {screen === "expenses" && <ExpensesScreen key={openAdd} openAddOnMount={openAdd > 0} />}
        {screen === "late" && <LateScreen />}
        {screen === "profile" && <ProfileScreen />}
      </AppShell>
    </SquadProvider>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <FirebaseAuthProvider>
        <AppContent />
      </FirebaseAuthProvider>
    </AuthProvider>
  );
};

export default Index;
