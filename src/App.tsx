
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ChatbotFloatingButton } from "@/components/ChatbotFloatingButton";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import AddCertification from "./pages/AddCertification";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import WorkerDashboard from "./pages/WorkerDashboard";
import Emergency from "./pages/Emergency";
import AdminLogin from './pages/Adminlogin';
import EmergencyAdminPanel from './pages/EmergencyAdminPanel';
import AdminRegister from './pages/AdminRegister';
import Map3D from './pages/Map3D';
import ResponderDashboard from './pages/ResponderDashboard';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <LocationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen pb-16">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/add-certification" element={<AddCertification />} />
                  <Route path="/add-post" element={<Index />} />
                  <Route path="/emergency" element={<Emergency />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/worker-dashboard" element={<WorkerDashboard />} />
                  <Route path="/responder" element={<ResponderDashboard />} />
                  <Route path="/map3d" element={<Map3D />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/emergency-admin" element={<EmergencyAdminPanel />} />
                  <Route path="/admin-register" element={<AdminRegister />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <BottomNavigation />
                <ChatbotFloatingButton />
              </div>
            </BrowserRouter>
          </LocationProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
