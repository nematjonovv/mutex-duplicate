import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ConfigProvider, App as AntApp } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/uz";
import "antd/dist/reset.css";
import "./index.css";
import App from "./App";

// Configure dayjs for Uzbekistan locale
dayjs.locale("uz");

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Ant Design theme configuration
const theme = {
  token: {
    colorPrimary: "#3b82f6",
    borderRadius: 8,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: "#f5f5f5",
      siderBg: "#001529",
    },
    Menu: {
      darkItemBg: "#001529",
      darkItemSelectedBg: "#1890ff",
    },
    Card: {
      borderRadiusLG: 8,
    },
    Table: {
      borderRadius: 8,
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  /*<React.StrictMode>*/
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={theme}>
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </QueryClientProvider>
  /* </React.StrictMode> */
);
