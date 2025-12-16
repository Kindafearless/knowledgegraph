'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Network,
  Database,
  BookOpen,
  Settings,
  Users,
  FileSearch,
  ChevronDown,
  ChevronRight,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Table,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Graph Explorer', href: '/graph', icon: Network },
  {
    name: 'Data Sources',
    href: '/data-sources',
    icon: Database,
    permission: 'datasource:read',
    children: [
      { name: 'Connections', href: '/data-sources', icon: Plug },
      { name: 'Data Explorer', href: '/data-sources/explore', icon: Table },
    ],
  },
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Data Sources']));
  const { hasPermission, user } = useAuthStore();
  const pathname = usePathname();

  const filteredNav = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const filteredAdminNav = adminNavigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href;
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => pathname === child.href || pathname.startsWith(child.href + '/'));
    }
    return pathname.startsWith(item.href);
  };

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300 relative',
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
            <div key={item.name}>
              {item.children && !collapsed ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full',
                      'transition-colors',
                      isParentActive(item)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {expandedMenus.has(item.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedMenus.has(item.name) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                            'transition-colors',
                            isActive(child.href)
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          <child.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                    'transition-colors',
                    isActive(item.href) || isParentActive(item)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )}
            </div>
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
                    'transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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

      {/* Collapse toggle - inside sidebar at bottom */}
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors'
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-5 w-5 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

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
    </aside>
  );
}
