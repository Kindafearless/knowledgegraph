'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8080';

export function useAuthInit() {
  const { setUser, setAccessToken, setLoading, accessToken } = useAuthStore();
  const initAttempted = useRef(false);

  useEffect(() => {
    // Only run once
    if (initAttempted.current) {
      return;
    }
    initAttempted.current = true;

    const initAuth = async () => {
      const currentToken = useAuthStore.getState().accessToken;

      // Check for local dev mode - auto-login with test user
      const isLocalDev = process.env.NODE_ENV === 'development' ||
                         process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

      if (isLocalDev && !currentToken) {
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
            // Handle the auth service response structure
            if (data.access_token && data.user) {
              setAccessToken(data.access_token);
              setUser({
                id: data.user.id,
                email: data.user.email,
                name: data.user.name || data.user.email,
                roles: data.user.roles || ['admin'],
                permissions: ['*'],
                attributes: {
                  data_sources: Array.isArray(data.user.data_sources)
                    ? data.user.data_sources.join(',')
                    : '',
                  classification: data.user.classification || 'unclassified',
                },
              });
            } else {
              console.warn('Unexpected login response structure:', data);
            }
          } else {
            console.warn('Auto-login failed with status:', response.status);
          }
        } catch (error) {
          console.warn('Auth service not reachable:', error);
        }
        setLoading(false);
        return;
      }

      // If we have a token, validate it
      if (currentToken) {
        try {
          const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/me`, {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            // The /me endpoint returns user directly, not nested in data.user
            const user = data.user || data;
            if (user && user.id) {
              setUser({
                id: user.id,
                email: user.email,
                name: user.name || user.email,
                roles: user.roles || [],
                permissions: ['*'],
                attributes: {
                  data_sources: Array.isArray(user.data_sources)
                    ? user.data_sources.join(',')
                    : '',
                  classification: user.classification || 'unclassified',
                },
              });
            }
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
  }, [setUser, setAccessToken, setLoading]);
}
