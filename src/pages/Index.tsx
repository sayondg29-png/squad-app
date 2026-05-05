import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppProvider, useApp } from "@/squad/lib/AppContext";
import { LoginScreen } from "@/squad/screens/LoginScreen";
import { ProfileSetupScreen } from "@/squad/screens/ProfileSetupScreen";
import { WelcomeScreen } from "@/squad/screens/WelcomeScreen";
import { CreateSquadScreen } from "@/squad/screens/CreateSquadScreen";
import { HomeScreen } from "@/squad/screens/HomeScreen";
import { ExpensesScreen } from "@/squad/screens/ExpensesScreen";
import { LateScreen } from "@/squad/screens/LateScreen";
import { MapScreen } from "@/squad/screens/MapScreen";
import { ProfileScreen } from "@/squad/screens/ProfileScreen";
import { BottomNav, Tab } from "@/squad/components/BottomNav";

type WelcomeRoute = "welcome" | "create";

const Inner = () => {
  const { session, loading, profile } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [route, setRoute] = useState<WelcomeRoute>("welcome");

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0D0D2B]">
        <Loader2 className="animate-spin text-[#00E5FF]" size={32} />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (!profile) return <ProfileSetupScreen />;

  if (!profile.squad_id) {
    if (route === "create") return <CreateSquadScreen onBack={() => setRoute("welcome")} onDone={() => setRoute("welcome")} />;
    return <WelcomeScreen onCreate={() => setRoute("create")} />;
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto bg-[#0D0D2B] text-white relative">
      {tab === "home" && <HomeScreen />}
      {tab === "expenses" && <ExpensesScreen />}
      {tab === "late" && <LateScreen />}
      {tab === "map" && <MapScreen />}
      {tab === "profile" && <ProfileScreen />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
};

const Index = () => (
  <AppProvider>
    <Inner />
  </AppProvider>
);

export default Index;
