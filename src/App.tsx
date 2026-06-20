import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "antd";
import { useAuthStore } from "@/store/authStore";
import LoginPage from "@/pages/LoginPage";
import NavigatePage from "@/pages/NavigatePage";
import DashboardPage from "@/pages/DashboardPage";
import ClientsPage from "@/pages/ClientsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import DebtsPage from "@/pages/DebtsPage";
import ClientDebtDetailPage from "@/pages/ClientDebtDetailPage";
import MaterialsPage from "@/pages/MaterialsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import CreateInvoicePage from "@/pages/CreateInvoicePage";
import UsersPage from "@/pages/UsersPage";
import CashFlowPage from "@/pages/CashFlowPage";
import FinanceReportsPage from "@/pages/FinanceReportsPage";
import ReportsPage from "@/pages/ReportsPage";
import BatchesPage from "@/pages/BatchesPage";
import WrappingPage from "@/pages/WrappingPage";
import WrappingDetailPage from "@/pages/WrappingDetailPage";
import FinishedProductsPage from "@/pages/FinishedProductsPage";
import FinishedProductsByProductPage from "@/pages/FinishedProductsByProductPage";
import FinishedProductGroupDetailPage from "@/pages/FinishedProductGroupDetailPage";
import FinishedProductPage from "@/pages/FinishedProductPage";
import ReturnsPage from "@/pages/ReturnsPage";
import ReturnedProductsPage from "@/pages/ReturnedProductsPage";
import DefectiveProductsPage from "@/pages/DefectiveProductsPage";
import SoldProductsPage from "@/pages/SoldProductsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import SecuritySettingsPage from "@/pages/SecuritySettingsPage"; // NEW: Import SecuritySettingsPage
import LayoutWrapper from "@/components/LayoutWrapper";
import ProtectedRoute, { ProtectedSection } from "@/components/ProtectedRoute"; // Import ProtectedSection type
import LoadingSpinner from "./components/LoadingSpinner";
import StaticAntd from "@/utils/StaticAntd";
import SectionPasswordPrompt from "@/components/SectionPasswordPrompt"; // Import SectionPasswordPrompt
import OurDebtPage from "./pages/OurDebtPage";
import OurDebtDetailPage from "./pages/OurDebtDetailPage";

const { Content } = Layout;

// Component to handle WRAPPER redirect after login
const WrapperRedirect: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role === "WRAPPER") {
    // Redirect to last wrapped batch or wrapping page
    const redirectPath = user.lastWrappedBatchId
      ? `/dyeing/wrapping/${user.lastWrappedBatchId}`
      : "/dyeing/wrapping";
    return <Navigate to={redirectPath} replace />;
  }

  return <Navigate to="/navigate" replace />;
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // State for the section password prompt
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [currentSectionToUnlock, setCurrentSectionToUnlock] = useState<ProtectedSection | null>(null);
  const [redirectPathAfterUnlock, setRedirectPathAfterUnlock] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <StaticAntd />
      <Content>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <WrapperRedirect />
              ) : (
                <LoginPage />
              )
            }
          />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute
                passwordPromptVisible={passwordPromptVisible}
                setPasswordPromptVisible={setPasswordPromptVisible}
                currentSectionToUnlock={currentSectionToUnlock}
                setCurrentSectionToUnlock={setCurrentSectionToUnlock}
                redirectPathAfterUnlock={redirectPathAfterUnlock}
                setRedirectPathAfterUnlock={setRedirectPathAfterUnlock}
              >
                <Routes>
                  {/* Navigate page - without sidebar */}
                  <Route path="/navigate" element={<LayoutWrapper hideSidebar setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><NavigatePage /></LayoutWrapper>} />

                  {/* Pages with sidebar */}
                  <Route path="/dashboard" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><DashboardPage /></LayoutWrapper>} />
                  <Route path="/clients" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ClientsPage /></LayoutWrapper>} />
                  <Route path="/suppliers" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><SuppliersPage /></LayoutWrapper>} />
                  <Route path="/debts" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><DebtsPage /></LayoutWrapper>} />


                  <Route 
                  path="/debts/:clientId" 
                  element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ClientDebtDetailPage /></LayoutWrapper>} />


                  <Route path="/our-debts" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><OurDebtPage /></LayoutWrapper>} />
                  <Route path="/our-debts/:id" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><OurDebtDetailPage /></LayoutWrapper>} />

                  <Route path="/materials" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><MaterialsPage /></LayoutWrapper>} />
                  <Route path="/invoices" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><InvoicesPage /></LayoutWrapper>} />
                  <Route path="/invoices/create" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><CreateInvoicePage /></LayoutWrapper>} />
                  <Route path="/invoices/edit/:id" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><CreateInvoicePage /></LayoutWrapper>} />
                  <Route path="/users" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><UsersPage /></LayoutWrapper>} />

                  <Route path="/cash-flow" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><CashFlowPage /></LayoutWrapper>} />

                  <Route path="/finance-reports" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><FinanceReportsPage /></LayoutWrapper>} />
                  <Route path="/reports" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ReportsPage /></LayoutWrapper>} />
                  <Route path="/batches" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><BatchesPage /></LayoutWrapper>} />
                  <Route path="/dyeing/wrapping" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><WrappingPage /></LayoutWrapper>} />
                  <Route path="/dyeing/wrapping/:id" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><WrappingDetailPage /></LayoutWrapper>} />
                  <Route path="/profile" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ProfilePage /></LayoutWrapper>} />
                  <Route path="/security-settings" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><SecuritySettingsPage /></LayoutWrapper>} />
                  <Route path="/notifications" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><NotificationsPage /></LayoutWrapper>} />
                  <Route path="/finished-products" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><FinishedProductsPage /></LayoutWrapper>} />
                  <Route path="/finished-products/:productName" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><FinishedProductsByProductPage /></LayoutWrapper>} />
                  <Route path="/finished-products/:productName/:color/:colorCode" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><FinishedProductGroupDetailPage /></LayoutWrapper>} />
                  <Route path="/finished-product" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><FinishedProductPage /></LayoutWrapper>} />
                  <Route path="/sales/returns" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ReturnsPage /></LayoutWrapper>} />
                  <Route path="/sales/returned-products" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><ReturnedProductsPage /></LayoutWrapper>} />
                  <Route path="/warehouse/defective-products" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><DefectiveProductsPage /></LayoutWrapper>} />
                  <Route path="/sold-products" element={<LayoutWrapper setPasswordPromptVisible={setPasswordPromptVisible} setCurrentSectionToUnlock={setCurrentSectionToUnlock} currentSectionToUnlock={currentSectionToUnlock}><SoldProductsPage /></LayoutWrapper>} />
                  <Route path="/" element={<Navigate to="/navigate" replace />} />
                  <Route path="*" element={<Navigate to="/navigate" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
        {passwordPromptVisible && currentSectionToUnlock && (
          <SectionPasswordPrompt
            section={currentSectionToUnlock}
            visible={passwordPromptVisible}
            onClose={() => {
              setPasswordPromptVisible(false);
              setCurrentSectionToUnlock(null);
              setRedirectPathAfterUnlock(null);
              navigate("/navigate", { replace: true });
            }}
            onSuccess={() => {
              setPasswordPromptVisible(false);
              if (redirectPathAfterUnlock) {
                navigate(redirectPathAfterUnlock, { replace: true });
              }
            }}
          />
        )}
      </Content>
    </Layout>
  );
};

export default App;
