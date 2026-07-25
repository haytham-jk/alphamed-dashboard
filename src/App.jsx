import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";
import {
  BriefcaseBusiness,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  RadioTower,
  Users,
  X,
} from "lucide-react";

import Login from "./components/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { supabase } from "./lib/supabase";

import AssetsPage from "./pages/AssetsPage";
import CaseDetailsPage from "./pages/CaseDetailsPage";
import CasesPage from "./pages/CasesPage";
import CustomerFormPage from "./pages/CustomerFormPage";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import EditAssetPage from "./pages/EditAssetPage";
import EditCasePage from "./pages/EditCasePage";
import EditLinearityPage from "./pages/EditLinearityPage";
import EditTrainingPage from "./pages/EditTrainingPage";
import LinearityPage from "./pages/LinearityPage";
import NewAssetPage from "./pages/NewAssetPage";
import NewCasePage from "./pages/NewCasePage";
import NewLinearityPage from "./pages/NewLinearityPage";
import NewTrainingPage from "./pages/NewTrainingPage";
import TrainingPage from "./pages/TrainingPage";
import UnityRealTimePage from "./pages/UnityRealTimePage";
import NewUnityRealTimePage from "./pages/NewUnityRealTimePage";
import EditUnityRealTimePage from "./pages/EditUnityRealTimePage";
import { ClipboardList } from "lucide-react";
import EqasOnlinePage from "./pages/EqasOnlinePage";
import NewEqasOnlinePage from "./pages/NewEqasOnlinePage";
import EditEqasOnlinePage from "./pages/EditEqasOnlinePage";

import { getCurrentProfile } from "./services/profile";

function AppShell({ session, profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = profile?.role === "editor" || profile?.role === "admin";

  function navClass({ isActive }) {
    return [
      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
      isActive
        ? "bg-blue-950 text-blue-300"
        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
    ].join(" ");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const navigation = (
    <>
      <NavLink to="/" end className={navClass} onClick={closeMenu}>
        <LayoutDashboard size={18} aria-hidden="true" />
        Dashboard
      </NavLink>

      <NavLink
        to="/cases?status=Active"
        className={navClass}
        onClick={closeMenu}
      >
        <BriefcaseBusiness size={18} aria-hidden="true" />
        Cases
      </NavLink>

      <NavLink to="/customers" className={navClass} onClick={closeMenu}>
        <Users size={18} aria-hidden="true" />
        Customers
      </NavLink>

      <NavLink to="/training" className={navClass} onClick={closeMenu}>
        <GraduationCap size={18} aria-hidden="true" />
        Training
      </NavLink>

      <NavLink to="/assets" className={navClass} onClick={closeMenu}>
        <MonitorCog size={18} aria-hidden="true" />
        Assets
      </NavLink>

      <NavLink
        to="/unity-real-time"
        className={navClass}
        onClick={closeMenu}
      >
        <RadioTower size={18} aria-hidden="true" />
        Unity Real Time
      </NavLink>
      <NavLink to="/linearity" className={navClass} onClick={closeMenu}>
        <FlaskConical size={18} aria-hidden="true" />
        Linearity
      </NavLink>

      <NavLink to="/eqas-online" className={navClass} onClick={closeMenu}>
      <ClipboardList size={18} aria-hidden="true" />
        EQAS Online
       </NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-800 bg-slate-950 p-4 md:block">
        <div className="mb-6 px-2">
          <p className="text-sm text-blue-400">Alphamed</p>
          <h1 className="text-xl font-semibold">Operations Hub</h1>
          <p className="mt-1 text-xs capitalize text-slate-500">
            {profile?.role || "user"}
          </p>
        </div>

        <nav className="space-y-1" aria-label="Main navigation">
          {navigation}
        </nav>

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <header className="flex items-center justify-between border-b border-slate-800 p-4 md:hidden">
        <div>
          <p className="text-sm text-blue-400">Alphamed</p>
          <p className="font-semibold">Operations Hub</p>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-b border-slate-800 bg-slate-950 p-4 md:hidden"
        >
          <nav className="space-y-1" aria-label="Mobile navigation">
            {navigation}
          </nav>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 flex w-full items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}

      <main className="p-4 md:ml-60 md:p-6">
        <Routes>
          <Route path="/" element={<DashboardPage canEdit={canEdit} />} />

          <Route path="/cases" element={<CasesPage canEdit={canEdit} />} />
          <Route
            path="/cases/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <NewCasePage session={session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cases/:caseId"
            element={<CaseDetailsPage canEdit={canEdit} />}
          />
          <Route
            path="/cases/:caseId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <EditCasePage session={session} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={<CustomersPage canEdit={canEdit} />}
          />
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <CustomerFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:customerId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <CustomerFormPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/training"
            element={<TrainingPage canEdit={canEdit} />}
          />
          <Route
            path="/training/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <NewTrainingPage session={session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/:trainingId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <EditTrainingPage session={session} />
              </ProtectedRoute>
            }
          />

          <Route path="/assets" element={<AssetsPage canEdit={canEdit} />} />
          <Route
            path="/assets/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <NewAssetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:assetId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <EditAssetPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/unity-real-time"
            element={<UnityRealTimePage canEdit={canEdit} />}
          />
          <Route
            path="/unity-real-time/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <NewUnityRealTimePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unity-real-time/:installationId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <EditUnityRealTimePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/linearity"
            element={<LinearityPage canEdit={canEdit} />}
          />
          <Route
            path="/linearity/new"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <NewLinearityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linearity/:linearityId/edit"
            element={
              <ProtectedRoute canEdit={canEdit}>
                <EditLinearityPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/eqas-online" element={<EqasOnlinePage canEdit={canEdit} />} />
          <Route path="/eqas-online/new" element={<ProtectedRoute canEdit={canEdit}><NewEqasOnlinePage /></ProtectedRoute>} />
          <Route path="/eqas-online/:recordId/edit" element={<ProtectedRoute canEdit={canEdit}><EditEqasOnlinePage /></ProtectedRoute>} />

        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sessionRef = useRef(null);
  const profileRequestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function applySession(nextSession) {
      const requestId = ++profileRequestId.current;
      if (!mounted) return;

      sessionRef.current = nextSession;
      setSession(nextSession);
      setError("");

      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const currentProfile = await getCurrentProfile(nextSession.user.id);
        if (mounted && profileRequestId.current === requestId) {
          setProfile(currentProfile);
        }
      } catch (profileError) {
        if (mounted && profileRequestId.current === requestId) {
          setProfile(null);
          setError(
            profileError?.message || "Unable to load the user profile."
          );
        }
      } finally {
        if (mounted && profileRequestId.current === requestId) {
          setLoading(false);
        }
      }
    }

    async function loadInitialSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        if (mounted) {
          setError(
            sessionError.message || "Unable to load the current session."
          );
          setLoading(false);
        }
        return;
      }

      await applySession(data.session);
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      if (!mounted) return;

      const currentUserId = sessionRef.current?.user?.id;
      const nextUserId = nextSession?.user?.id;

      if (authEvent === "SIGNED_OUT" || !nextSession) {
        applySession(null);
        return;
      }

      if (
        authEvent === "TOKEN_REFRESHED" ||
        (authEvent === "SIGNED_IN" && currentUserId === nextUserId)
      ) {
        sessionRef.current = nextSession;
        setSession(nextSession);
        return;
      }

      applySession(nextSession);
    });

    return () => {
      mounted = false;
      profileRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400"
        role="status"
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-red-300">
        <div
          className="max-w-lg rounded-2xl border border-red-900 bg-red-950/40 p-6"
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 rounded-xl border border-red-800 px-4 py-2 hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <AppShell session={session} profile={profile} />
    </BrowserRouter>
  );
}
