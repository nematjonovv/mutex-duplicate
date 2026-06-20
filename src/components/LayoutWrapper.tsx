import React, { useState, useEffect, useMemo } from "react";
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Drawer, Grid, Typography, Modal, Input, Space, Tooltip } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  ShoppingOutlined,
  PrinterOutlined,
  ExperimentOutlined,
  ToolOutlined,
  DollarOutlined,
  ReadOutlined,
  AppstoreOutlined,
  InboxOutlined,
  AuditOutlined,
  ContainerOutlined,
  SolutionOutlined,
  TruckOutlined,
  DatabaseOutlined,
  SafetyOutlined,
  GoldOutlined,
  ReconciliationOutlined,
  FundOutlined,
  PieChartOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
  LockOutlined,
  UnlockOutlined,
  CreditCardOutlined,

} from "@ant-design/icons";

const { Text, Title } = Typography;
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { notificationService } from "@/services/notificationService";
import { apiService } from "@/services/api";
import type { MenuProps } from "antd";
import { useQuery } from "react-query";
import { useSocket } from "@/hooks/useSocket";
import { PROTECTED_SECTIONS } from "./ProtectedRoute";
import { useSecurityStore } from "@/store/securityStore";

const { Header, Sider, Content } = Layout;

// Define ProtectedSection type here to avoid import issues if not explicitly exported from ProtectedRoute
type ProtectedSection = "sales" | "finance" | "management";

interface LayoutWrapperProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
  setPasswordPromptVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentSectionToUnlock: React.Dispatch<React.SetStateAction<ProtectedSection | null>>;
}

// Section configuration
type SectionKey = "dashboard" | "finance" | "sales" | "production" | "products" | "reports" | "partners" | "management" | "system";

interface SectionConfig {
  key: SectionKey;
  title: string;
  icon: React.ReactNode;
  color: string;
  routes: string[];
  roles: string[];
}

const SECTIONS: SectionConfig[] = [
  {
    key: "dashboard",
    title: "Bosh sahifa",
    icon: <DashboardOutlined />,
    color: "#1890ff",
    routes: ["/dashboard"],
    roles: ["DIRECTOR", "MANAGER", "SELLER"],
  },
  {
    key: "finance",
    title: "Moliya",
    icon: <DollarOutlined />,
    color: "#52c41a",
    routes: ["/accounts", "/cash-flow", "/debts", "/finance-reports", "/our-debts"],
    roles: ["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT"],
  },
  {
    key: "sales",
    title: "Sotuvlar",
    icon: <ShoppingOutlined />,
    color: "#722ed1",
    routes: ["/invoices", "/sales/returns", "/sales/returned-products", "/sold-products"],
    roles: ["DIRECTOR", "MANAGER", "SELLER"],
  },
  {
    key: "production",
    title: "Ishlab chiqarish",
    icon: <ExperimentOutlined />,
    color: "#eb2f96",
    routes: ["/batches", "/dyeing/wrapping"],
    roles: ["DIRECTOR", "MANAGER", "WORKER", "ACCOUNTANT"],
  },
  {
    key: "products",
    title: "Mahsulotlar",
    icon: <AppstoreOutlined />,
    color: "#13c2c2",
    routes: ["/materials", "/finished-products", "/finished-product", "/warehouse/defective-products"],
    roles: ["DIRECTOR", "MANAGER", "WORKER", "SELLER"],
  },
  {
    key: "reports",
    title: "Hisobotlar",
    icon: <PieChartOutlined />,
    color: "#fa8c16",
    routes: ["/reports"],
    roles: ["DIRECTOR", "MANAGER", "SELLER"],
  },
  {
    key: "partners",
    title: "Hamkorlar",
    icon: <TeamOutlined />,
    color: "#2f54eb",
    routes: ["/clients", "/suppliers"],
    roles: ["DIRECTOR", "MANAGER", "SELLER"],
  },
  {
    key: "management",
    title: "Boshqaruv",
    icon: <SettingOutlined />,
    color: "#595959",
    routes: ["/users", "/security-settings"],
    roles: ["DIRECTOR", "MANAGER",],
  },
  {
    key: "system",
    title: "Tizim",
    icon: <ReadOutlined />,
    color: "#389e0d",
    routes: ["/settings", "/profile", "/notifications"],
    roles: ["DIRECTOR", "MANAGER",],
  },
];

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  children,
  hideSidebar,
  setPasswordPromptVisible,
  setCurrentSectionToUnlock,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ipModalVisible, setIpModalVisible] = useState(false);
  const [serverIP, setServerIP] = useState(localStorage.getItem("server_ip") || "");
  const [currentLocalIP, setCurrentLocalIP] = useState<string>("");

  const { user, logout } = useAuthStore();
  const { isSectionUnlocked, lockSection } = useSecurityStore();

  useEffect(() => {
    if (ipModalVisible) {
      apiService.get<{ localIP: string }>("/network-info")
        .then(res => setCurrentLocalIP(res.localIP))
        .catch(err => console.error("IPni olib bo'lmadi:", err));
    }
  }, [ipModalVisible]);

  const { unreadCount, setUnreadCount, addNotification, incrementUnreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const handleSaveIP = () => {
    if (serverIP) {
      const cleanIP = serverIP.trim().replace(/[^0-9.:]/g, '');
      localStorage.setItem("server_ip", cleanIP);
      window.location.reload();
    } else {
      localStorage.removeItem("server_ip");
      window.location.reload();
    }
  };

  const currentSection = useMemo(() => {
    const path = location.pathname;
    for (const section of SECTIONS) {
      if (section.routes.some(route => path === route || path.startsWith(route + "/"))) {
        return section;
      }
    }
    return SECTIONS[0];
  }, [location.pathname]);

  const currentProtectedSection = useMemo(() => {
    for (const routePattern in PROTECTED_SECTIONS) {
      const regex = new RegExp(`^${routePattern.replace(/:[^\s/]+/g, '([^/]+)')}$`);
      if (regex.test(location.pathname)) {
        return PROTECTED_SECTIONS[routePattern];
      }
    }
    return null;
  }, [location.pathname]);

  const isProtectedSection = !!currentProtectedSection;

  const handleToggleSectionLock = () => {
    if (!currentProtectedSection) return;

    if (isSectionUnlocked(currentProtectedSection)) {
      lockSection(currentProtectedSection);
    } else {
      setPasswordPromptVisible(true);
      setCurrentSectionToUnlock(currentProtectedSection);
    }
  };

  const [isNetworkDown, setIsNetworkDown] = useState(false);

  useQuery(
    ["notifications-unread"],
    () => notificationService.getUnreadCount(),
    {
      enabled: !!user && (user.role === "DIRECTOR" || user.role === "MANAGER") && !isNetworkDown,
      refetchInterval: isNetworkDown ? false : 30000,
      retry: false,
      onError: (err: any) => {
        if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
          setIsNetworkDown(true);
          setTimeout(() => setIsNetworkDown(false), 60000);
        }
      },
      onSuccess: (response) => {
        if (response.success && response.data) {
          setUnreadCount(response.data.count);
          setIsNetworkDown(false);
        }
      },
    }
  );

  const socket = useSocket();

  useEffect(() => {
    if (!user || !socket) return;
    if (user.role !== "DIRECTOR" && user.role !== "MANAGER") return;
    if (!socket.connected) return;

    const handleNotification = (notification: any) => {
      addNotification(notification);
      incrementUnreadCount();
    };

    socket.on("notification:received", handleNotification);
    return () => {
      socket.off("notification:received", handleNotification);
    };
  }, [user, socket, addNotification, incrementUnreadCount]);

  const getMenuItems = (): MenuProps["items"] => {
    if (!user) return [];

    const items: MenuProps["items"] = [];
    const hasAnyRole = (roles: string[]) => roles.includes(user.role);

    switch (currentSection.key) {
      case "dashboard":
        items.push({
          key: "/dashboard",
          icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
          label: "Statistika",
          onClick: () => navigate("/dashboard"),
        });
        break;

      case "finance":
        if (hasAnyRole(["MANAGER", "ACCOUNTANT"])) {
          items.push({
            key: "/cash-flow",
            icon: <ReconciliationOutlined style={{ fontSize: '18px' }} />,
            label: "Hisoblar",
            onClick: () => navigate("/cash-flow"),
          });
        }
        if (hasAnyRole(["MANAGER", "ACCOUNTANT"])) {
          items.push({
            key: "/debts",
            icon: <AuditOutlined style={{ fontSize: '18px' }} />,
            label: "Qarzlar",
            onClick: () => navigate("/debts"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"])) {
          items.push({
            key: "/finance-reports",
            icon: <PieChartOutlined style={{ fontSize: '18px' }} />,
            label: "Moliyaviy hisobotlar",
            onClick: () => navigate("/finance-reports"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER", "ACCOUNTANT"])) {
          items.push({
            key: "/our-debts",
            icon: <CreditCardOutlined style={{ fontSize: "18px" }} />,
            label: "Bizning qarzlar",
            onClick: () => navigate("/our-debts"),
          });
        }
        break;

      case "sales":
        items.push({
          key: "/invoices",
          icon: <FileTextOutlined style={{ fontSize: '18px' }} />,
          label: "Fakturalar",
          onClick: () => navigate("/invoices"),
        });
        items.push({
          key: "/sold-products",
          icon: <ShoppingOutlined style={{ fontSize: '18px' }} />,
          label: "Sotilgan mahsulotlar",
          onClick: () => navigate("/sold-products"),
        });
        items.push({
          key: "/sales/returns",
          icon: <ContainerOutlined style={{ fontSize: '18px' }} />,
          label: "Qaytarish",
          onClick: () => navigate("/sales/returns"),
        });
        items.push({
          key: "/sales/returned-products",
          icon: <InboxOutlined style={{ fontSize: '18px' }} />,
          label: "Qaytarilgan mahsulotlar",
          onClick: () => navigate("/sales/returned-products"),
        });
        break;

      case "production":
        items.push({
          key: "/batches",
          icon: <PrinterOutlined style={{ fontSize: '18px' }} />,
          label: "Partiyalar",
          onClick: () => navigate("/batches"),
        });
        items.push({
          key: "/dyeing/wrapping",
          icon: <AppstoreOutlined style={{ fontSize: '18px' }} />,
          label: "Qoplash",
          onClick: () => navigate("/dyeing/wrapping"),
        });
        break;

      case "products":
        if (hasAnyRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"])) {
          items.push({
            key: "/materials",
            icon: <InboxOutlined style={{ fontSize: '18px' }} />,
            label: "Xom ashyo",
            onClick: () => navigate("/materials"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"])) {
          items.push({
            key: "/finished-products",
            icon: <GoldOutlined style={{ fontSize: '18px' }} />,
            label: "Tayyor mahsulotlar",
            onClick: () => navigate("/finished-products"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"])) {
          items.push({
            key: "/warehouse/defective-products",
            icon: <SafetyOutlined style={{ fontSize: '18px' }} />,
            label: "Yaroqsiz mahsulotlar",
            onClick: () => navigate("/warehouse/defective-products"),
          });
        }
        break;

      case "reports":
        items.push({
          key: "/dashboard",
          icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
          label: "Dashboard",
          onClick: () => navigate("/dashboard"),
        });
        items.push({
          key: "/reports",
          icon: <PieChartOutlined style={{ fontSize: '18px' }} />,
          label: "Hisobotlar",
          onClick: () => navigate("/reports"),
        });
        break;

      case "partners":
        if (hasAnyRole(["DIRECTOR", "MANAGER", "SELLER"])) {
          items.push({
            key: "/clients",
            icon: <TeamOutlined style={{ fontSize: '18px' }} />,
            label: "Mijozlar",
            onClick: () => navigate("/clients"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER", "WORKER", "SELLER"])) {
          items.push({
            key: "/suppliers",
            icon: <TruckOutlined style={{ fontSize: '18px' }} />,
            label: "Yetkazib beruvchilar",
            onClick: () => navigate("/suppliers"),
          });
        }
        break;

      case "management":
        if (hasAnyRole(["DIRECTOR", "MANAGER",])) {
          items.push({
            key: "/users",
            icon: <UserOutlined style={{ fontSize: '18px' }} />,
            label: "Foydalanuvchilar",
            onClick: () => navigate("/users"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER"])) {
          items.push({
            key: "/security-settings",
            icon: <ToolOutlined style={{ fontSize: '18px' }} />,
            label: "Xavfsizlik sozlamalari",
            onClick: () => navigate("/security-settings"),
          });
        }
        break;

      case "system":
        if (hasAnyRole(["DIRECTOR", "MANAGER", "SELLER", "ACCOUNTANT", "WORKER", "WRAPPER"])) { // All authenticated users can see their profile
          items.push({
            key: "/profile",
            icon: <UserOutlined style={{ fontSize: '18px' }} />,
            label: "Profil",
            onClick: () => navigate("/profile"),
          });
        }
        if (hasAnyRole(["DIRECTOR", "MANAGER"])) { // Only DIRECTOR or MANAGER can see notifications
          items.push({
            key: "/notifications",
            icon: <BellOutlined style={{ fontSize: '18px' }} />,
            label: "Bildirishnomalar",
            onClick: () => navigate("/notifications"),
          });
        }
        if (user.role === "DIRECTOR") { // Assuming general settings might be for DIRECTOR only
          items.push({
            key: "/settings",
            icon: <SettingOutlined style={{ fontSize: '18px' }} />,
            label: "Sozlamalar",
            onClick: () => navigate("/settings"),
          });
        }
        break;
    }

    return items;
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profil",
      onClick: () => navigate("/profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Chiqish",
      onClick: () => logout(),
    },
  ];

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        className="section-header"
        style={{
          background: `linear-gradient(135deg, ${currentSection.color}22 0%, transparent 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '20px 16px',
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/navigate")}
          style={{
            color: 'rgba(255,255,255,0.85)',
            marginBottom: 16,
            padding: '4px 12px',
            height: 'auto',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
          }}
        >
          {!collapsed && "Asosiy menyu"}
        </Button>

        <div className="flex items-center gap-3">
          <div
            style={{
              width: collapsed ? 40 : 48,
              height: collapsed ? 40 : 48,
              borderRadius: 12,
              background: currentSection.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: collapsed ? 18 : 22,
              boxShadow: `0 4px 12px ${currentSection.color}66`,
            }}
          >
            {currentSection.icon}
          </div>
          {!collapsed && (
            <div>
              <Title level={5} style={{ margin: 0, color: 'white' }}>
                {currentSection.title}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                {getMenuItems()?.length || 0} ta sahifa
              </Text>
            </div>
          )}
        </div>
      </div>

      <div className="py-3" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[
            location.pathname.startsWith("/dyeing/wrapping/") ? "/dyeing/wrapping" :
              location.pathname.startsWith("/invoices/") ? "/invoices" :
                location.pathname
          ]}
          items={getMenuItems()}
          className="border-0 section-menu"
          onClick={() => isMobile && setMobileOpen(false)}
          style={{ background: 'transparent' }}
        />
      </div>

      <div
        className="flex items-center justify-center py-4 border-t border-gray-700"
        style={{ marginTop: 'auto' }}
      >
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
              color: 'white',
            }}
          >
            OT
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                color: 'white',
              }}
            >
              OT
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              MUTex
            </Text>
          </div>
        )}
      </div>
    </div>
  );

  if (user?.role === "WRAPPER") {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
        <Header
          style={{
            padding: '0 24px',
            height: 64,
            lineHeight: '64px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PrinterOutlined style={{ fontSize: 20, color: 'white' }} />
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>
                Qoplash
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                {user?.fullName}
              </div>
            </div>
          </div>

          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => logout()}
            style={{
              color: 'white',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              height: 36,
              padding: '0 16px',
            }}
          >
            Chiqish
          </Button>
        </Header>

        <Content style={{ margin: 16, padding: 20, background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {children}
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!hideSidebar && (
        !isMobile ? (
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            width={260}
            collapsedWidth={80}
            className="shadow-xl"
            style={{
              background: 'linear-gradient(180deg, #001529 0%, #00203d 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {sidebarContent}
          </Sider>
        ) : (
          <Drawer
            placement="left"
            onClose={() => setMobileOpen(false)}
            open={mobileOpen}
            width={280}
            styles={{
              body: {
                padding: 0,
                background: 'linear-gradient(180deg, #001529 0%, #00203d 100%)',
              }
            }}
            closable={false}
          >
            {sidebarContent}
          </Drawer>
        )
      )}

      <Layout>
        <Header className="bg-white px-4 flex items-center justify-between shadow-sm" style={{ padding: isMobile ? '0 12px' : '0 16px' }}>
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
              onClick={() => isMobile ? setMobileOpen(true) : setCollapsed(!collapsed)}
              className="text-lg"
            />
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={() => navigate("/navigate")}
              className="text-lg"
              title="Asosiy menyu"
            />
            <Tooltip title="Tarmoq sozlamalari">
              <Button
                type="text"
                icon={<GlobalOutlined style={{ color: serverIP ? '#52c41a' : 'inherit' }} />}
                onClick={() => setIpModalVisible(true)}
                className="text-lg"
              />
            </Tooltip>
            {isProtectedSection && user && (user.role === "DIRECTOR" || user.role === "MANAGER") && (
              <Tooltip title={isSectionUnlocked(currentProtectedSection) ? "Bo'limni qulflash" : "Bo'limni qulfdan chiqarish"}>
                <Button
                  type="text"
                  icon={isSectionUnlocked(currentProtectedSection) ? <UnlockOutlined /> : <LockOutlined />}
                  onClick={handleToggleSectionLock}
                  className="text-lg"
                  style={{ color: isSectionUnlocked(currentProtectedSection) ? '#52c41a' : '#f5222d' }}
                />
              </Tooltip>
            )}
            {!isMobile && (
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-lg"
                style={{ background: `${currentSection.color}15` }}
              >
                <span style={{ color: currentSection.color, fontSize: 16 }}>
                  {currentSection.icon}
                </span>
                <Text strong style={{ color: currentSection.color }}>
                  {currentSection.title}
                </Text>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {user && (user.role === "DIRECTOR" || user.role === "MANAGER") && (
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="text-lg"
                  onClick={() => navigate("/notifications")}
                />
              </Badge>
            )}

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
                <Avatar icon={<UserOutlined />} className="bg-blue-500" size={isMobile ? "small" : "default"} />
                {!isMobile && (
                  <div className="text-sm">
                    <div className="font-medium">{user?.fullName}</div>
                    <div className="text-gray-500 text-xs">{user?.role}</div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className={`${isMobile ? "m-3 p-3" : "m-6 p-6"} bg-white rounded-lg shadow-sm`}>
          {children}
        </Content>
      </Layout>

      <Modal
        title="Tarmoq sozlamalari (Ulanish)"
        open={ipModalVisible}
        onOk={handleSaveIP}
        onCancel={() => setIpModalVisible(false)}
        okText="Saqlash va qayta yuklash"
        cancelText="Bekor qilish"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px' }}>
            <Text strong>Sizning joriy IP manzilingiz: </Text>
            <Text copyable style={{ fontSize: '16px', color: '#52c41a' }}>{currentLocalIP || 'Yuklanmoqda...'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Boshqa qurilmalar ushbu IP orqali sizga ulanishi mumkin.
            </Text>
          </div>
          <div>
            <Text type="secondary">
              Agar siz boshqa kompyuterdagi serverga ulanmoqchi bo'lsangiz, o'sha kompyuterning IP manzilini kiriting.
            </Text>
          </div>
          <Input
            placeholder="Masalan: 192.168.1.5"
            value={serverIP}
            onChange={(e) => setServerIP(e.target.value)}
            prefix={<GlobalOutlined />}
          />
          {serverIP && (
            <Text type="success">
              Joriy ulanish: http://{serverIP}:5000/api
            </Text>
          )}
        </Space>
      </Modal>

      <style>{`
        .section-menu .ant-menu-item {
          margin: 4px 12px !important;
          padding-left: 16px !important;
          border-radius: 10px !important;
          height: 48px !important;
          line-height: 48px !important;
        }
        .section-menu .ant-menu-item-selected {
          background: ${currentSection.color} !important;
        }
        .section-menu .ant-menu-item:hover:not(.ant-menu-item-selected) {
          background: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </Layout>
  );
};

export default LayoutWrapper;
