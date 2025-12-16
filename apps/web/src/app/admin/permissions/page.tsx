'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Shield, Plus, Check, X } from 'lucide-react';

const mockRoles = [
  {
    id: '1',
    name: 'admin',
    description: 'Full system access',
    permissions: ['*'],
    userCount: 1
  },
  {
    id: '2',
    name: 'analyst',
    description: 'Can view and edit entities, run queries',
    permissions: ['entity:read', 'entity:write', 'datasource:read', 'ccv:read', 'ccv:write'],
    userCount: 5
  },
  {
    id: '3',
    name: 'viewer',
    description: 'Read-only access to entities and graphs',
    permissions: ['entity:read', 'datasource:read', 'ccv:read'],
    userCount: 12
  },
];

const allPermissions = [
  { key: 'entity:read', label: 'View Entities' },
  { key: 'entity:write', label: 'Edit Entities' },
  { key: 'entity:delete', label: 'Delete Entities' },
  { key: 'datasource:read', label: 'View Data Sources' },
  { key: 'datasource:write', label: 'Edit Data Sources' },
  { key: 'ccv:read', label: 'View Vocabulary' },
  { key: 'ccv:write', label: 'Edit Vocabulary' },
  { key: 'user:read', label: 'View Users' },
  { key: 'user:write', label: 'Edit Users' },
];

export default function PermissionsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onToggleChat={() => {}} isChatOpen={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Permissions</h1>
                <p className="text-muted-foreground">Manage roles and access control</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Create Role
              </button>
            </div>

            <div className="grid gap-6">
              {mockRoles.map((role) => (
                <div key={role.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold capitalize">{role.name}</h3>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{role.userCount} users</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {allPermissions.map((perm) => {
                      const hasPermission = role.permissions.includes('*') || role.permissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                            hasPermission ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {hasPermission ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {perm.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
