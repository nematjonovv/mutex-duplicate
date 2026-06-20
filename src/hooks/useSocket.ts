import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { message } from '@/utils/StaticAntd';

export const useSocket = () => {
  const { accessToken, refreshToken, setTokens, clearAuth } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    // Initialize socket
    const getSocketUrl = () => {
      const savedIP = localStorage.getItem("server_ip")?.trim();
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

      if (savedIP && ipRegex.test(savedIP)) {
        return `http://${savedIP}:5000`;
      }
      
      return import.meta.env.VITE_API_URL?.replace("/api", "") || 
             (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : "http://localhost:5000");
    };

    const socketUrl = getSocketUrl();

    // Disconnect existing socket if any
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 1, // Faqat 1 marta qayta urinadi
      reconnectionDelay: 10000, // Urinishlar orasida 10 soniya kutadi
      timeout: 5000,
    });

    socketRef.current = socket;

    // Handle successful connection
    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected successfully");
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Handle connection errors
    socket.on("connect_error", async (err) => {
      console.error("Socket connection error:", err.message);
      setIsConnected(false);

      // Agar ulanish xato bo'lsa va bu birinchi xato bo'lsa
      if (socket.active) {
        message?.error("Bildirishnomalar serveriga ulanib bo'lmadi.");
        // Ulanish urinishini to'xtatamiz, foydalanuvchi sahifani yangilaganda yoki IP o'zgarganda qayta ulanadi
        socket.disconnect();
      }

      if (err.message === "Authentication error: Token expired" || err.message === "Authentication error: Invalid token") {
        // Attempt to refresh token
        if (refreshToken) {
          try {
            const response = await authService.refreshToken(refreshToken);
            if (response.success && response.data) {
              const { accessToken: newAccessToken } = response.data;
              setTokens(newAccessToken, refreshToken);
            } else {
              clearAuth();
            }
          } catch (refreshError) {
            console.error("Socket token refresh failed:", refreshError);
            clearAuth();
          }
        } else {
          clearAuth();
        }
      }
    });

    return () => {
      if (socket?.connected) {
        socket.disconnect();
      }
    };
  }, [accessToken, refreshToken, setTokens, clearAuth]);

  return socketRef.current;
};
