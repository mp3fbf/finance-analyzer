'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
  showChat?: boolean;
  chatComponent?: ReactNode;
}

/**
 * Reusable dashboard layout with header, navigation, and optional chat panel
 */
export function DashboardLayout({
  children,
  showChat = false,
  chatComponent,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-foreground">
              Finance Analyzer
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Início
              </Link>
              <Link href="/merchants" className="text-muted-foreground hover:text-foreground transition-colors">
                Estabelecimentos
              </Link>
              <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
                Categorias
              </Link>
              <Link href="/insights" className="text-muted-foreground hover:text-foreground transition-colors">
                Insights
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild>
              <Link href="/upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-6 py-8 ${showChat ? 'grid grid-cols-2 gap-8' : ''}`}>
        <div>{children}</div>
        {showChat && chatComponent && (
          <div className="sticky top-8 h-[calc(100vh-8rem)]">{chatComponent}</div>
        )}
      </div>
    </div>
  );
}
