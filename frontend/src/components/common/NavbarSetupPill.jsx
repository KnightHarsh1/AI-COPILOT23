import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandCenterService from "../../services/commandCenterService";
import SetupPill from "./SetupPill";

// Navbar-mounted setup pill. Fetches coverage itself (the navbar has no
// dashboard data) and renders the existing SetupPill left of the bell. Clicking
// Continue routes to the dashboard where the full onboarding card opens.
function NavbarSetupPill() {
  const navigate = useNavigate();
  const [coverage, setCoverage] = useState(null);

  useEffect(() => {
    let mounted = true;
    CommandCenterService.getCommandCenter()
      .then((d) => { if (mounted) setCoverage(d?.coverage || null); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Hidden until coverage loads or when setup is already complete.
  if (!coverage?.items) return null;
  const complete = coverage.is_complete || coverage.items.every((i) => i.present);
  if (complete) return null;

  return (
    <SetupPill coverage={coverage} onContinue={() => navigate("/app/dashboard?setup=1")} />
  );
}

export default NavbarSetupPill;
