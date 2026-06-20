import React, { useEffect, useState } from "react";
// Adding this comment to force re-parsing of the file.
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useSecurityStore } from "@/store/securityStore";
import { useApiQuery } from "@/hooks/useApi"; // NEW
import { settingsService } from "@/services/settingsService"; // NEW
import LoadingSpinner from "./LoadingSpinner";
import SectionPasswordPrompt from "./SectionPasswordPrompt"; // NEW

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  allowedRoles?: string[];
  // Props for shared password prompt state
  passwordPromptVisible: boolean;
  setPasswordPromptVisible: React.Dispatch<React.SetStateAction<boolean>>;
  currentSectionToUnlock: ProtectedSection | null;
  setCurrentSectionToUnlock: React.Dispatch<React.SetStateAction<ProtectedSection | null>>;
  redirectPathAfterUnlock: string | null;
  setRedirectPathAfterUnlock: React.Dispatch<React.SetStateAction<string | null>>;
}

type ProtectedSection = "sales" | "finance" | "management";

// Define protected routes and their corresponding sections
export const PROTECTED_SECTIONS: Record<string, ProtectedSection> = {
  "/invoices": "sales",
  "/invoices/create": "sales",
  "/invoices/edit": "sales", // Dynamic route handling will need to consider this base path
  "/reports": "sales",
  "/finance-reports": "finance",
  "/cash-flow": "finance",
  "/accounts": "finance",
  "/debts": "finance", // Client debts can be considered financial
  "/debts/": "finance", // Dynamic route for client debt detail
  "/users": "management",
  "/security-settings": "management",
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRole,
  allowedRoles,
  passwordPromptVisible,
  setPasswordPromptVisible,
  currentSectionToUnlock,
  setCurrentSectionToUnlock,
  redirectPathAfterUnlock,
  setRedirectPathAfterUnlock,
}) => {
  const { isAuthenticated, isLoading, user, getProfile, accessToken } = useAuthStore();
  const { isSectionUnlocked } = useSecurityStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch current password status from backend
  const { data: passwordStatus, isLoading: passwordStatusLoading } = useApiQuery(
    ["password-status"],
    settingsService.getPasswordStatus,
    { enabled: isAuthenticated && !isLoading } // Fetch status only if authenticated
  );

  useEffect(() => {
    // Only try to get profile if we have a token but not authenticated yet
    if (!isAuthenticated && !isLoading && accessToken) {
      getProfile();
    }
  }, [isAuthenticated, isLoading, accessToken, getProfile]);

  // Section protection logic
  useEffect(() => {
    if (!isAuthenticated || isLoading || passwordStatusLoading) return; // Wait for password status to load

    let sectionToProtect: ProtectedSection | null = null;
    for (const routePattern in PROTECTED_SECTIONS) {
      // Create a regex to match the route pattern, handling dynamic segments like :id
      const regex = new RegExp(`^${routePattern.replace(/:[^\s/]+/g, '([^/]+)')}$`);
      if (regex.test(location.pathname)) {
        sectionToProtect = PROTECTED_SECTIONS[routePattern];
        break;
      }
    }

    if (sectionToProtect) {
      const isPasswordSet =
        (sectionToProtect === "sales" && passwordStatus?.salesPasswordSet) ||
        (sectionToProtect === "finance" && passwordStatus?.financePasswordSet) ||
        (sectionToProtect === "management" && passwordStatus?.managementPasswordSet);
      
      console.log(`[ProtectedRoute] Path: ${location.pathname}, Section: ${sectionToProtect}`);
      console.log(`[ProtectedRoute] Is password set for ${sectionToProtect}: ${isPasswordSet}`);
      console.log(`[ProtectedRoute] Is section unlocked (local state): ${isSectionUnlocked(sectionToProtect)}`);
      console.log(`[ProtectedRoute] Raw passwordStatus:`, passwordStatus);

      if (isPasswordSet && !isSectionUnlocked(sectionToProtect)) {
        console.log(`[ProtectedRoute] Prompting for password for ${sectionToProtect}`);
        setCurrentSectionToUnlock(sectionToProtect);
        setRedirectPathAfterUnlock(location.pathname);
        setPasswordPromptVisible(true);
      } else {
        // If no password is set or section is already unlocked, clear prompt state
        setPasswordPromptVisible(false);
        setCurrentSectionToUnlock(null);
        setRedirectPathAfterUnlock(null);
      }
    } else {
      // Not a protected section, clear prompt state
      setPasswordPromptVisible(false);
      setCurrentSectionToUnlock(null);
      setRedirectPathAfterUnlock(null);
    }
  }, [location.pathname, isAuthenticated, isLoading, isSectionUnlocked, passwordStatus, passwordStatusLoading, setCurrentSectionToUnlock, setPasswordPromptVisible, setRedirectPathAfterUnlock]); // Added setters to dependencies

  // Show loading while checking authentication or password status
  if (isLoading || passwordStatusLoading) {
    return <LoadingSpinner fullScreen />;
  }


  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // WRAPPER users can only access wrapping pages
  if (user?.role === "WRAPPER") {
    const isWrappingPage = location.pathname.startsWith("/dyeing/wrapping");
    if (!isWrappingPage) {
      // Redirect to last wrapped batch or wrapping page
      const redirectPath = user.lastWrappedBatchId
        ? `/dyeing/wrapping/${user.lastWrappedBatchId}`
        : "/dyeing/wrapping";
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check role requirement (single role)
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/navigate" replace />;
  }

  // Check allowed roles (multiple roles)
  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/navigate" replace />;
  }

  // Check permissions requirement
  if (requiredPermissions.length > 0 && user) {
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      return <Navigate to="/navigate" replace />;
    }
  }

  // If a section is locked and prompt is visible, DO NOT RENDER CHILDREN
  // Instead, the App.tsx component will render SectionPasswordPrompt
  if (passwordPromptVisible && currentSectionToUnlock) {
    return null; // Render nothing, App.tsx will show the modal
  }

  return <>{children}</>;
};

export default ProtectedRoute;
