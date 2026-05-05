import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function JoinHandler() {
  const { squadId } = useParams<{ squadId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (squadId) {
      try { localStorage.setItem("pendingSquadId", squadId); } catch {}
    }
    navigate("/", { replace: true });
  }, [squadId, navigate]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0D0D2B]">
      <Loader2 className="animate-spin text-[#00E5FF]" size={32} />
    </div>
  );
}