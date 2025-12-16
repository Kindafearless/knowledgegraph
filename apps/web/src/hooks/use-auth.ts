'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8080';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    data_sources: string[];
    classification: string;
  };
}

export function useAuthInit() {
  const { setUser, setAccessToken, setLoading, accessToken } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // Check for local dev mode - auto-login with test user
      const isLocalDev = process.env.NODE_ENV === 'development' ||
                         process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

      if (isLocalDev && !accessToken) {
        // Auto-login with admin user for local development
        try {
          const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: 'admin@example.com',
              password: 'password123',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setAccessToken(data.access_token);
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email,
              roles: data.user.roles || ['admin'],
              permissions: ['*'],
              attributes: {
                data_sources: (data.user.data_sources || []).join(','),
                classification: data.user.classification || 'unclassified',
              },
            });
          } else {
            // Login failed - still show login screen
            console.warn('Auto-login failed, showing login screen');
          }
        } catch (error) {
          console.warn('Auth service not reachable:', error);
        }
        setLoading(false);
        return;
      }

      // If we have a token, validate it
      if (accessToken) {
        try {
          const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const data: AuthResponse = await response.json();
            setUser({
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email,
              roles: data.user.roles || [],
              permissions: ['*'], // For now, grant all permissions
              attributes: {
                data_sources: (data.user.data_sources || []).join(','),
                classification: data.user.classification || 'unclassified',
              },
            });
          } else {
            // Token invalid - clear it
            setAccessToken(null);
          }
        } catch (error) {
          console.warn('Failed to validate token:', error);
          setAccessToken(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, [accessToken, setUser, setAccessToken, setLoading]);
}
