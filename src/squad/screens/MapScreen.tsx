import { LiveMap } from "../components/LiveMap";
import { SquadGate } from "../components/SquadGate";

export function MapScreen() {
  return (
    <SquadGate>
      {(squadId) => <LiveMap squadId={squadId} />}
    </SquadGate>
  );
}
