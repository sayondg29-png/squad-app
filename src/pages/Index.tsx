import { useState } from "react";
import { SquadProvider } from "@/squad/context/SquadContext";
import { AppShell, ScreenId } from "@/squad/components/AppShell";
import { HomeScreen } from "@/squad/screens/HomeScreen";
import { MapScreen } from "@/squad/screens/MapScreen";
import { ExpensesScreen } from "@/squad/screens/ExpensesScreen";
import { LateScreen } from "@/squad/screens/LateScreen";
import { ProfileScreen } from "@/squad/screens/ProfileScreen";

const Index = () => {
  const [screen, setScreen] = useState<ScreenId>("home");
  const [openAdd, setOpenAdd] = useState(0);

  const handleFab = () => {
    if (screen === "late") {
      // no-op; the form is right there
      return;
    }
    setScreen("expenses");
    setOpenAdd(v => v + 1);
  };

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

export default Index;
