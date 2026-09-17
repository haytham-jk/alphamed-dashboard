import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";
import {
  BriefcaseBusiness,
  Boxes,
  ClipboardList,
  GitCommitHorizontal,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Share2,
  Users,
  X,
} from "lucide-react";
import Login from "./components/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import InstallAppButton from "./components/InstallAppButton";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
import FlashMessage from "./components/ui/FlashMessage";
import { supabase } from "./lib/supabase";
import { getCurrentProfile } from "./services/profile";
import { preloadRoute, scheduleRoutePreloads } from "./utils/routePreload";
import packageInfo from "../package.json";

const routeImporters = {
  dashboard: () => import("./pages/DashboardPage"),
  assets: () => import("./pages/AssetsPage"),
  cases: () => import("./pages/CasesPage"),
  customers: () => import("./pages/CustomersPage"),
  eqas: () => import("./pages/EqasOnlinePage"),
  linearity: () => import("./pages/LinearityPage"),
  training: () => import("./pages/TrainingPage"),
  unity: () => import("./pages/UnityRealTimePage"),
  bioplex: () => import("./pages/BioplexInventoryPage"),
};
const DashboardPage = lazy(routeImporters.dashboard);
const AssetsPage = lazy(routeImporters.assets);
const CasesPage = lazy(routeImporters.cases);
const CustomersPage = lazy(routeImporters.customers);
const EqasOnlinePage = lazy(routeImporters.eqas);
const LinearityPage = lazy(routeImporters.linearity);
const TrainingPage = lazy(routeImporters.training);
const UnityRealTimePage = lazy(routeImporters.unity);
const BioplexInventoryPage = lazy(routeImporters.bioplex);
const BioplexMatchingCheckPage = lazy(() => import("./pages/BioplexMatchingCheckPage"));
const BioplexMatchingImportsPage = lazy(() => import("./pages/BioplexMatchingImportsPage"));
const BioplexMatchingImportReviewPage = lazy(() => import("./pages/BioplexMatchingImportReviewPage"));
const BioplexInventoryFormPage = lazy(() => import("./pages/BioplexInventoryFormPage"));
const BioplexInventoryDetailsPage = lazy(() => import("./pages/BioplexInventoryDetailsPage"));
const BioplexInventoryAttentionPage = lazy(() => import("./pages/BioplexInventoryAttentionPage"));
const BioplexInventoryReportPage = lazy(() => import("./pages/BioplexInventoryReportPage"));
const BioplexLotExpiryMaintenancePage = lazy(() => import("./pages/BioplexLotExpiryMaintenancePage"));
const CaseDetailsPage = lazy(() => import("./pages/CaseDetailsPage"));
const CustomerFormPage = lazy(() => import("./pages/CustomerFormPage"));
const CustomerSiteOverviewPage = lazy(() => import("./pages/CustomerSiteOverviewPage"));
const EditAssetPage = lazy(() => import("./pages/EditAssetPage"));
const EditCasePage = lazy(() => import("./pages/EditCasePage"));
const EditLinearityPage = lazy(() => import("./pages/EditLinearityPage"));
const EditTrainingPage = lazy(() => import("./pages/EditTrainingPage"));
const NewAssetPage = lazy(() => import("./pages/NewAssetPage"));
const NewCasePage = lazy(() => import("./pages/NewCasePage"));
const NewLinearityPage = lazy(() => import("./pages/NewLinearityPage"));
const NewTrainingPage = lazy(() => import("./pages/NewTrainingPage"));
const NewUnityRealTimePage = lazy(() => import("./pages/NewUnityRealTimePage"));
const EditUnityRealTimePage = lazy(() => import("./pages/EditUnityRealTimePage"));
const NewEqasOnlinePage = lazy(() => import("./pages/NewEqasOnlinePage"));
const EditEqasOnlinePage = lazy(() => import("./pages/EditEqasOnlinePage"));

function PageLoadingFallback() {
  return (
    <div className="min-h-[55vh] animate-pulse space-y-5" role="status" aria-label="Loading page">
      <div className="h-8 w-56 rounded-lg bg-slate-800" />
      <div className="h-24 rounded-2xl border border-slate-800 bg-slate-900" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900" />
        <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900" />
        <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900" />
      </div>
      <span className="sr-only">Loading page...</span>
    </div>
  );
}
function AppShell({ session, profile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = profile?.role === "editor" || profile?.role === "admin";
  useEffect(() => scheduleRoutePreloads([
    ["assets", routeImporters.assets],
    ["cases", routeImporters.cases],
    ["customers", routeImporters.customers],
    ["eqas", routeImporters.eqas],
    ["linearity", routeImporters.linearity],
    ["training", routeImporters.training],
    ["unity", routeImporters.unity],
  ]), []);
  function preload(routeKey) {
    preloadRoute(routeKey, routeImporters[routeKey]).catch(() => {});
  }

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
      <NavLink to="/" end className={navClass} onClick={closeMenu} onMouseEnter={() => preload("dashboard")} onFocus={() => preload("dashboard")} onTouchStart={() => preload("dashboard")}>
        <LayoutDashboard size={18} aria-hidden="true" />
        Dashboard
      </NavLink>
      <NavLink to="/assets" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("assets")} onFocus={() => preload("assets")} onTouchStart={() => preload("assets")}>
        <MonitorCog size={18} aria-hidden="true" />
        Assets
      </NavLink>
      <NavLink to="/bioplex-inventory" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("bioplex")} onFocus={() => preload("bioplex")} onTouchStart={() => preload("bioplex")}>
        <Boxes size={18} aria-hidden="true" />
        BioPlex Management
      </NavLink>
      <NavLink to="/cases?status=Active" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("cases")} onFocus={() => preload("cases")} onTouchStart={() => preload("cases")}>
        <BriefcaseBusiness size={18} aria-hidden="true" />
        Cases
      </NavLink>
      <NavLink to="/customers" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("customers")} onFocus={() => preload("customers")} onTouchStart={() => preload("customers")}>
        <Users size={18} aria-hidden="true" />
        Customers
      </NavLink>
      <NavLink to="/eqas-online" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("eqas")} onFocus={() => preload("eqas")} onTouchStart={() => preload("eqas")}>
        <ClipboardList size={18} aria-hidden="true" />
        EQAS Online
      </NavLink>
      <NavLink to="/linearity" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("linearity")} onFocus={() => preload("linearity")} onTouchStart={() => preload("linearity")}>
        <GitCommitHorizontal size={18} aria-hidden="true" />
        Linearity
      </NavLink>
      <NavLink to="/training" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("training")} onFocus={() => preload("training")} onTouchStart={() => preload("training")}>
        <GraduationCap size={18} aria-hidden="true" />
        Training
      </NavLink>
      <NavLink to="/unity-real-time" className={navClass} onClick={closeMenu} onMouseEnter={() => preload("unity")} onFocus={() => preload("unity")} onTouchStart={() => preload("unity")}>
        <Share2 size={18} aria-hidden="true" />
        Unity Real Time
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <InstallAppButton />
      <PwaUpdatePrompt />
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
        <div className="absolute bottom-4 left-4 right-4">
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Version {packageInfo.version}
          </p>
        </div>
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
        <div id="mobile-navigation" className="border-b border-slate-800 bg-slate-950 p-4 md:hidden">
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
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Version {packageInfo.version}
          </p>
        </div>
      )}

      <main className="p-4 md:ml-60 md:p-6">
        <FlashMessage />
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage canEdit={canEdit} />} />
            <Route path="/cases" element={<CasesPage canEdit={canEdit} />} />
            <Route path="/cases/new" element={<ProtectedRoute canEdit={canEdit}><NewCasePage /></ProtectedRoute>} />
            <Route path="/cases/:caseId" element={<CaseDetailsPage canEdit={canEdit} />} />
            <Route path="/cases/:caseId/edit" element={<ProtectedRoute canEdit={canEdit}><EditCasePage /></ProtectedRoute>} />
            <Route path="/customers" element={<CustomersPage canEdit={canEdit} />} />
            <Route path="/customers/new" element={<ProtectedRoute canEdit={canEdit}><CustomerFormPage /></ProtectedRoute>} />
            <Route path="/customers/:customerId/overview" element={<CustomerSiteOverviewPage canEdit={canEdit} />} />
            <Route path="/customers/:customerId/edit" element={<ProtectedRoute canEdit={canEdit}><CustomerFormPage /></ProtectedRoute>} />
            <Route path="/training" element={<TrainingPage canEdit={canEdit} />} />
            <Route path="/training/new" element={<ProtectedRoute canEdit={canEdit}><NewTrainingPage session={session} /></ProtectedRoute>} />
            <Route path="/training/:trainingId/edit" element={<ProtectedRoute canEdit={canEdit}><EditTrainingPage /></ProtectedRoute>} />
            <Route path="/assets" element={<AssetsPage canEdit={canEdit} />} />
            <Route path="/assets/new" element={<ProtectedRoute canEdit={canEdit}><NewAssetPage /></ProtectedRoute>} />
            <Route path="/assets/:assetId/edit" element={<ProtectedRoute canEdit={canEdit}><EditAssetPage /></ProtectedRoute>} />
            <Route path="/bioplex-inventory" element={<BioplexInventoryPage canEdit={canEdit} profile={profile} />} />
            <Route path="/bioplex-inventory/new" element={<ProtectedRoute canEdit={canEdit}><BioplexInventoryFormPage /></ProtectedRoute>} />
            <Route path="/bioplex-inventory/attention" element={<BioplexInventoryAttentionPage profile={profile} />} />
            <Route path="/bioplex-inventory/report" element={<BioplexInventoryReportPage />} />
            <Route path="/bioplex-inventory/lot-expiry-maintenance" element={<ProtectedRoute canEdit={profile?.role === "admin"}><BioplexLotExpiryMaintenancePage /></ProtectedRoute>} />
            <Route path="/bioplex-matching-check" element={<BioplexMatchingCheckPage profile={profile} />} />
            <Route path="/bioplex-matching-imports" element={<ProtectedRoute canEdit={profile?.role === "admin"}><BioplexMatchingImportsPage /></ProtectedRoute>} />
            <Route path="/bioplex-matching-imports/:importId" element={<ProtectedRoute canEdit={profile?.role === "admin"}><BioplexMatchingImportReviewPage /></ProtectedRoute>} />
            <Route path="/bioplex-inventory/:sessionId" element={<BioplexInventoryDetailsPage canEdit={canEdit} />} />
            <Route path="/bioplex-inventory/:sessionId/edit" element={<ProtectedRoute canEdit={canEdit}><BioplexInventoryFormPage /></ProtectedRoute>} />
            <Route path="/unity-real-time" element={<UnityRealTimePage canEdit={canEdit} />} />
            <Route path="/unity-real-time/new" element={<ProtectedRoute canEdit={canEdit}><NewUnityRealTimePage /></ProtectedRoute>} />
            <Route path="/unity-real-time/:installationId/edit" element={<ProtectedRoute canEdit={canEdit}><EditUnityRealTimePage /></ProtectedRoute>} />
            <Route path="/linearity" element={<LinearityPage canEdit={canEdit} />} />
            <Route path="/linearity/new" element={<ProtectedRoute canEdit={canEdit}><NewLinearityPage /></ProtectedRoute>} />
            <Route path="/linearity/:linearityId/edit" element={<ProtectedRoute canEdit={canEdit}><EditLinearityPage /></ProtectedRoute>} />
            <Route path="/eqas-online" element={<EqasOnlinePage canEdit={canEdit} />} />
            <Route path="/eqas-online/new" element={<ProtectedRoute canEdit={canEdit}><NewEqasOnlinePage /></ProtectedRoute>} />
            <Route path="/eqas-online/:recordId/edit" element={<ProtectedRoute canEdit={canEdit}><EditEqasOnlinePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
          if (!currentProfile?.is_active) {
            await supabase.auth.signOut();
            throw new Error("Your account is inactive. Contact an administrator for access.");
          }
          setProfile(currentProfile);
        }
      } catch (profileError) {
        if (mounted && profileRequestId.current === requestId) {
          setProfile(null);
          setError(profileError?.message || "Unable to load the user profile.");
        }
      } finally {
        if (mounted && profileRequestId.current === requestId) setLoading(false);
      }
    }

    async function loadInitialSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (mounted) {
          setError(sessionError.message || "Unable to load the current session.");
          setLoading(false);
        }
        return;
      }
      await applySession(data.session);
    }

    loadInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      if (!mounted) return;
      const currentUserId = sessionRef.current?.user?.id;
      const nextUserId = nextSession?.user?.id;
      if (authEvent === "SIGNED_OUT" || !nextSession) {
        applySession(null);
        return;
      }
      if (authEvent === "TOKEN_REFRESHED" || (authEvent === "SIGNED_IN" && currentUserId === nextUserId)) {
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

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400" role="status">Loading...</div>;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-red-300">
        <div className="max-w-lg rounded-2xl border border-red-900 bg-red-950/40 p-6" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => supabase.auth.signOut()} className="mt-4 rounded-xl border border-red-800 px-4 py-2 hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">Sign out</button>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;
  return <BrowserRouter><AppShell session={session} profile={profile} /></BrowserRouter>;
}
