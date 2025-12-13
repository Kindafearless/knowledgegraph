'use client';

import { useState } from 'react';
import {
  Search,
  Bell,
  MessageSquare,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useGraphStore } from '@/stores/graph-store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onToggleChat: () => void;
  isChatOpen: boolean;
}

export function Header({ onToggleChat, isChatOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuthStore();
  const { searchAndVisualize, isLoading } = useGraphStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchAndVisualize(searchQuery);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities, relationships, or ask a question..."
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'placeholder:text-muted-foreground'
            )}
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={cn(
            'p-2 rounded-md transition-colors',
            isChatOpen
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
          title="Toggle AI chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground relative"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-20">
                <div className="p-3 border-b border-border">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent">
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => {
                      logout();
                      window.location.href = '/api/auth/logout';
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
