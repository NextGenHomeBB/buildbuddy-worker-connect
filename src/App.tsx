import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Timer from "./pages/Timer";
import Tasks from "./pages/Tasks";
import Materials from "./pages/Materials";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Invitations from "./pages/Invitations";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "offlineFirst", retry: 2, staleTime: 1000 * 30 },
    mutations: { networkMode: "offlineFirst", retry: 2 },
  },
});

const persister = createSyncStoragePersister({ storage: window.localStorage });

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            {/* Protected app routes */}
            <Route path="/" element={<Index />} />
            <Route path="/invitations" element={<Invitations />} />
            <Route path="/timer" element={<Timer />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </PersistQueryClientProvider>
);

export default App;
