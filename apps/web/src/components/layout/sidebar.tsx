'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Network,
  Database,
  BookOpen,
  Settings,
  Users,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Graph Explorer', href: '/graph', icon: Network },
  { name: 'Data Sources', href: '/data-sources', icon: Database, permission: 'datasource:read' },
  { name: 'Vocabulary (CCV)', href: '/ccv', icon: BookOpen },
  { name: 'Search', href: '/search', icon: FileSearch },
];

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: Users, permission: 'user:read' },
  { name: 'Permissions', href: '/admin/permissions', icon: Shield, permission: 'permissions:read' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings:read' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission, user } = useAuthStore();

  const filteredNav = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const filteredAdminNav = adminNavigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">KnowledgeGraph</span>
          </div>
        )}
        {collapsed && <Network className="h-6 w-6 text-primary mx-auto" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {filteredNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'transition-colors'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </div>

        {/* Admin section */}
        {filteredAdminNav.length > 0 && (
          <>
            <div className="px-6 py-4">
              <div className="h-px bg-border" />
            </div>
            {!collapsed && (
              <div className="px-6 py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administration
                </span>
              </div>
            )}
            <div className="px-3 space-y-1">
              {filteredAdminNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                    'text-muted-foreground hover:text-foreground hover:bg-accent',
                    'transition-colors'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User info */}
      {user && (
        <div className="p-4 border-t border-border">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.roles[0]}</p>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-sm font-medium text-primary">
                {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
