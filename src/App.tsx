import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import UserManagement from "@/pages/UserManagement";
import Dashboard from "@/pages/Dashboard";
import Cabinets from "@/pages/Cabinets";
import Shelves from "@/pages/Shelves";
import Folders from "@/pages/Folders";
import Divisions from "@/pages/Divisions";
import Boxes from "@/pages/Boxes";
import VisualAllocation from "@/pages/VisualAllocation";
import AddProcurement from "@/pages/AddProcurement";
import ProcurementList from "@/pages/ProcurementList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UserManagement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cabinets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Cabinets /> {/* Changed from Cabinets */}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shelves"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Shelves />  {/* Changed from Shelves */}
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/folders"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Folders />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/divisions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Divisions />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/boxes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Boxes />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/visual-allocation"
        element={
          <ProtectedRoute>
            <AppLayout>
              <VisualAllocation />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/procurement/add"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AddProcurement />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/procurement/list"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProcurementList />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;