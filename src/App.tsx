
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChatbotFloatingButton } from "@/components/ChatbotFloatingButton";
import { ConnectivityWatcher } from "@/components/ConnectivityWatcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initOfflineAI } from "@/services/transformersService";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AddCertification from "./pages/AddCertification";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import WorkerDashboard from "./pages/WorkerDashboard";
import Emergency from "./pages/Emergency";
import AdminRegister from './pages/AdminRegister';
import Map3D from './pages/Map3D';
import ResponderDashboard from './pages/ResponderDashboard';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient();

// Init offline AI on load (non-blocking)
initOfflineAI().then(ready => {
  if (ready) console.log('🧠 Offline AI ready (Transformers.js)');
});

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<ErrorBoundary><Index /></ErrorBoundary>} />
          <Route path="/auth" element={<ErrorBoundary><Auth /></ErrorBoundary>} />
          <Route path="/profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
          <Route path="/add-certification" element={<ErrorBoundary><AddCertification /></ErrorBoundary>} />
          <Route path="/add-post" element={<ErrorBoundary><Index /></ErrorBoundary>} />
          <Route path="/emergency" element={<ErrorBoundary><Emergency /></ErrorBoundary>} />
          <Route path="/messages" element={<ErrorBoundary><Messages /></ErrorBoundary>} />
          <Route path="/worker-dashboard" element={<ErrorBoundary><WorkerDashboard /></ErrorBoundary>} />
          <Route path="/responder" element={<ErrorBoundary><ResponderDashboard /></ErrorBoundary>} />
          <Route path="/map3d" element={<ErrorBoundary><Map3D /></ErrorBoundary>} />
          <Route path="/admin-register" element={<ErrorBoundary><AdminRegister /></ErrorBoundary>} />
          <Route path="/admin-login" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
          <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <LocationProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <div className="min-h-screen pb-16 md:pb-0">
                  <AnimatedRoutes />
                  <BottomNavigation />
                  <ChatbotFloatingButton />
                  <ConnectivityWatcher />
                </div>
              </BrowserRouter>
            </LocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
