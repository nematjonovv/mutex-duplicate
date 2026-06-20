// src/components/RoleRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";



export const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  MANAGER: "/navigate",
  SELLER: "/navigate",
  ACCOUNTANT: "/debts",
};
type Props = {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
};

const RoleRoute: React.FC<Props> = ({
  children,
  allowedRoles,
  redirectTo = "/dashboard"
}) => {
  const { user } = useAuthStore();

  if (!user?.role || !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;