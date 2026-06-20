import React, { useEffect } from "react";
import { Card, Row, Col, Typography } from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  ShoppingOutlined,
  ExperimentOutlined,
  AppstoreOutlined,
  PieChartOutlined,
  TeamOutlined,
  SettingOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const { Title, Text } = Typography;

interface MenuCard {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  route: string;
  roles: string[];
}

const NavigatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const menuCards: MenuCard[] = [
    {
      key: "products",
      title: "Mahsulotlar",
      description: "Xom ashyo, tayyor mahsulotlar, ombor",
      icon: <AppstoreOutlined />,
      color: "#13c2c2",
      gradient: "linear-gradient(135deg, #13c2c2 0%, #08979c 100%)",
      route: "/materials",
      roles: ["DIRECTOR", "MANAGER", "WORKER", "SELLER"],
    },
    {
      key: "production",
      title: "Ishlab chiqarish",
      description: "Partiyalar, bo'yoq ishlari",
      icon: <ExperimentOutlined />,
      color: "#eb2f96",
      gradient: "linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)",
      route: "/batches",
      roles: ["DIRECTOR", "MANAGER", "WORKER","SELLER"],
    },
    {
      key: "sales",
      title: "Sotuvlar",
      description: "Fakturalar, qaytarishlar, sotilgan mahsulotlar",
      icon: <ShoppingOutlined />,
      color: "#722ed1",
      gradient: "linear-gradient(135deg, #722ed1 0%, #531dab 100%)",
      route: "/invoices",
      roles: ["DIRECTOR", "MANAGER", "SELLER"],
    },
    {
      key: "finance",
      title: "Moliya",
      description: "Hisoblar, pul oqimi, ish haqi, qarzlar",
      icon: <DollarOutlined />,
      color: "#52c41a",
      gradient: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
      route: "/cash-flow",
      roles: ["DIRECTOR", "MANAGER", "ACCOUNTANT"],
    },
    {
      key: "partners",
      title: "Hamkorlar",
      description: "Mijozlar va yetkazib beruvchilar",
      icon: <TeamOutlined />,
      color: "#2f54eb",
      gradient: "linear-gradient(135deg, #2f54eb 0%, #1d39c4 100%)",
      route: "/clients",
      roles: ["DIRECTOR", "MANAGER", "SELLER", "WORKER"],
    },

    {
      key: "reports",
      title: "Hisobotlar",
      description: "Tahlil va statistik ma'lumotlar",
      icon: <PieChartOutlined />,
      color: "#fa8c16",
      gradient: "linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)",
      route: "/reports",
      roles: ["DIRECTOR", "MANAGER", "SELLER"],
    },

    {
      key: "management",
      title: "Boshqaruv",
      description: "Foydalanuvchilar",
      icon: <SettingOutlined />,
      color: "#595959",
      gradient: "linear-gradient(135deg, #595959 0%, #434343 100%)",
      route: "/users",
      roles: ["DIRECTOR", "MANAGER",],
    },
  ];

  const hasAccess = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  useEffect(() => {
    if (user?.role === "ACCOUNTANT") {
      navigate("/cash-flow", { replace: true });
    }
  }, [user]);

  const filteredCards = menuCards.filter((card) => hasAccess(card.roles));

  return (
    <div className="navigate-content-wrapper"> {/* Renamed for clarity */}
      <div className="welcome-section">
        <Title level={2} className="welcome-title">
          Xush kelibsiz, {user?.fullName?.split(" ")[0]}!
        </Title>
        <Text className="welcome-subtitle">
          Quyidagi bo'limlardan birini tanlang
        </Text>
      </div>

      {/* Menu Cards */}
      <Row gutter={[24, 24]} className="cards-container ">
        {filteredCards.map((card) => (
          <Col key={card.key} xs={24} sm={12} md={8} lg={8} xl={6}>
            <Card
              hoverable
              onClick={() => navigate(card.route)}
              className="menu-card"
              styles={{ body: { padding: 0, height: "100%" } }}
            >
              <div className="card-inner">
                <div
                  className="card-icon-wrapper"
                  style={{ background: card.gradient }}
                >
                  {React.cloneElement(card.icon as React.ReactElement, {
                    className: "card-icon",
                  })}
                </div>
                <div className="card-body">
                  <Title level={4} className="card-title">
                    {card.title}
                  </Title>
                  <Text type="secondary" className="card-description">
                    {card.description}
                  </Text>
                </div>
                <div className="card-arrow">
                  <RightOutlined />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <style>{`
        .navigate-content-wrapper {
          padding: 48px 24px;
          min-height: calc(100vh - 64px); /* Adjust based on LayoutWrapper's header height */
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .welcome-section {
          text-align: center;
          margin-bottom: 48px;
        }

        .welcome-title {
          color: #1f1f1f !important;
          margin-bottom: 8px !important;
          font-size: 36px !important; /* Slightly larger */
        }

        .welcome-subtitle {
          color: #8c8c8c;
          font-size: 19px; /* Slightly larger */
        }

        .cards-container {
          max-width: 1200px;
          width: 100%; /* Ensure it takes full width of its parent to center */
          margin: 0 auto;
        }

        .menu-card {
          border-radius: 20px;
          border: none;
          overflow: hidden;
          transition: all 0.35s ease;
          background: white;
          height: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .menu-card:hover {
          transform: translateY(-8px) scale(1.02); /* Added scale effect */
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18); /* Stronger shadow */
        }

        .card-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 220px;
          position: relative;
        }

        .card-icon-wrapper {
          height: 110px; /* Slightly taller */
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .card-icon-wrapper::after {
          content: '';
          position: absolute;
          bottom: -50px;
          left: -50px;
          right: -50px;
          height: 100px;
          background: white;
          border-radius: 50%;
        }

        .card-icon {
          font-size: 48px !important; /* Larger icon */
          color: white;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.3)); /* Stronger shadow */
        }

        .card-body {
          padding: 24px; /* Increased padding */
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-title {
          margin: 0 0 10px 0 !important; /* Adjusted margin */
          font-size: 22px !important; /* Larger title */
          color: #1f1f1f;
        }

        .card-description {
          font-size: 15px; /* Slightly larger */
          line-height: 1.6;
          flex: 1;
        }

        .card-arrow {
          position: absolute;
          bottom: 24px;
          right: 24px;
          width: 40px; /* Larger arrow button */
          height: 40px;
          border-radius: 50%;
          background: #e6f7ff; /* Lighter background */
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1890ff; /* Blue color */
          transition: all 0.3s;
          font-size: 16px;
        }

        /* Mobile styles */
        @media (max-width: 576px) {
          .navigate-content-wrapper {
            padding: 24px 16px;
            min-height: calc(100vh - 56px); /* Adjust for mobile header height */
          }

          .welcome-title {
            font-size: 28px !important;
          }

          .welcome-subtitle {
            font-size: 16px;
          }

          .welcome-section {
            margin-bottom: 32px;
          }

          .card-inner {
            min-height: 180px;
          }

          .card-icon-wrapper {
            height: 80px;
          }

          .card-icon {
            font-size: 38px !important;
          }

          .card-body {
            padding: 16px 20px 20px;
          }

          .card-title {
            font-size: 18px !important;
          }

          .card-description {
            font-size: 13px;
          }

          .card-arrow {
            width: 32px;
            height: 32px;
            bottom: 16px;
            right: 16px;
            font-size: 14px;
          }
        }

        @media (min-width: 577px) and (max-width: 991px) {
          .card-inner {
            min-height: 200px;
          }

          .welcome-section {
            margin-bottom: 40px;
          }
        }

        @media (min-width: 1200px) {
          .card-inner {
            min-height: 240px;
          }

          .card-icon-wrapper {
            height: 120px; /* Even taller for larger screens */
          }

          .card-icon {
            font-size: 52px !important; /* Even larger icon */
          }

          .card-title {
            font-size: 24px !important;
          }

          .card-description {
            font-size: 16px;
          }
          .card-arrow {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default NavigatePage;