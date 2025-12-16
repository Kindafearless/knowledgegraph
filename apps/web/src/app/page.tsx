'use client';

import { useState } from 'react';
import { GraphExplorer } from '@/components/graph/graph-explorer';
import { ChatPanel } from '@/components/chat/chat-panel';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          <p className="text-muted-foreground">Please sign in to continue</p>
          <button
            onClick={() => {
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onToggleChat={() => setIsChatOpen(!isChatOpen)} isChatOpen={isChatOpen} />

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Graph Explorer */}
          <main className="flex-1 relative">
            <GraphExplorer />
          </main>

          {/* Chat Panel */}
          {isChatOpen && (
            <aside className="w-96 border-l border-border flex flex-col bg-card">
              <ChatPanel />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
