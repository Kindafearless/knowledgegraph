'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Settings, Database, Brain, Bell, Shield, Save } from 'lucide-react';

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');

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

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'llm', label: 'LLM Settings', icon: Brain },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onToggleChat={() => {}} isChatOpen={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Configure your Knowledge Graph application</p>
            </div>

            <div className="flex gap-6">
              <nav className="w-48 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 bg-card border border-border rounded-lg p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">General Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Application Name</label>
                        <input
                          type="text"
                          defaultValue="Knowledge Graph"
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Default Classification</label>
                        <select className="w-full px-3 py-2 border border-input rounded-md bg-background">
                          <option>Unclassified</option>
                          <option>Confidential</option>
                          <option>Secret</option>
                          <option>Top Secret</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Enable Dark Mode</p>
                          <p className="text-sm text-muted-foreground">Use dark theme by default</p>
                        </div>
                        <button className="relative w-11 h-6 bg-primary rounded-full">
                          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'llm' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">LLM Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">LLM Provider</label>
                        <select className="w-full px-3 py-2 border border-input rounded-md bg-background">
                          <option>Mock (Development)</option>
                          <option>OpenAI</option>
                          <option>Anthropic</option>
                          <option>AWS Bedrock</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Model</label>
                        <input
                          type="text"
                          defaultValue="gpt-4"
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Temperature</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          defaultValue="0.7"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab !== 'general' && activeTab !== 'llm' && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{tabs.find(t => t.id === activeTab)?.label} settings coming soon</p>
                  </div>
                )}

                <div className="flex justify-end mt-6 pt-6 border-t border-border">
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
