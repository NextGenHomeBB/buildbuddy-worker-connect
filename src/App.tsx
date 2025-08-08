
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import localforage from "localforage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Timer from "./pages/Timer";
import Tasks from "./pages/Tasks";
import Materials from "./pages/Materials";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Invitations from "./pages/Invitations";
import Settings from "./pages/Settings";
import SettingsCompany from "./pages/SettingsCompany";
import AuthRoute from "./routes/auth";
import UpdatePassword from "./pages/UpdatePassword";
import LogoutRoute from "./routes/logout";
import { AuthGate } from "@/components/AuthGate";
import OfflineSyncBanner from "@/components/OfflineSyncBanner";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "offlineFirst", retry: 2, staleTime: 1000 * 30 },
    mutations: { networkMode: "offlineFirst", retry: 2 },
  },
});

const persister = createAsyncStoragePersister({ storage: localforage });

// New pages
import IncidentsNew from "./pages/IncidentsNew";
import MaterialsRequest from "./pages/MaterialsRequest";

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OfflineSyncBanner />
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<LogoutRoute />} />
            {/* Protected app routes */}
            <Route path="/" element={<AuthGate><Index /></AuthGate>} />
            <Route path="/invitations" element={<AuthGate><Invitations /></AuthGate>} />
            <Route path="/timer" element={<AuthGate><Timer /></AuthGate>} />
            <Route path="/tasks" element={<AuthGate><Tasks /></AuthGate>} />
            <Route path="/materials" element={<AuthGate><Materials /></AuthGate>} />
            <Route path="/materials/request" element={<AuthGate><MaterialsRequest /></AuthGate>} />
            <Route path="/messages" element={<AuthGate><Messages /></AuthGate>} />
            <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
            <Route path="/incidents/new" element={<AuthGate><IncidentsNew /></AuthGate>} />
            <Route path="/settings" element={<AuthGate><Settings /></AuthGate>} />
            <Route path="/settings/company" element={<AuthGate><SettingsCompany /></AuthGate>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </PersistQueryClientProvider>
);

export default App;
