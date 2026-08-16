
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import React, { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChatbotFloatingButton } from "@/components/ChatbotFloatingButton";
import { ConnectivityWatcher } from "@/components/ConnectivityWatcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initOfflineAI } from "@/services/transformersService";
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const AddCertification = lazy(() => import("./pages/AddCertification"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Messages = lazy(() => import("./pages/Messages"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const Emergency = lazy(() => import("./pages/Emergency"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const Map3D = lazy(() => import("./pages/Map3D"));
const ResponderDashboard = lazy(() => import("./pages/ResponderDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

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
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
              Loading app...
            </div>
          }
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
        </Suspense>
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
