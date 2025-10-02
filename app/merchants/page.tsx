'use client';

import { useMerchants } from '@/lib/db/hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useState } from 'react';
import { processMerchantsForAllTransactions } from '@/lib/analysis/process-merchants';
import { useDiscoverMerchants } from '@/lib/hooks/useDiscoverMerchants';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Store, Upload, Sparkles, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { resetDiscoveries } from '@/lib/db/operations';

export default function MerchantsPage() {
  const merchants = useMerchants();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>();

  const { discoverMerchants, progress, isDiscovering } = useDiscoverMerchants();

  const handleResetDiscoveries = async () => {
    setResetting(true);
    setMessage(undefined);
    try {
      await resetDiscoveries();
      setShowResetConfirm(false);
      setMessage({
        type: 'success',
        text: 'Análises antigas removidas! Clique em "Start Discovery" para re-analisar com os novos algoritmos.'
      });
    } catch (error) {
      console.error('Failed to reset discoveries:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao resetar: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      });
    } finally {
      setResetting(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setMessage(undefined);
    try {
      const result = await processMerchantsForAllTransactions();
      if (result.errors > 0) {
        setMessage({
          type: 'error',
          text: `Processados ${result.processed} de ${result.total} merchants (${result.errors} erros)`
        });
      } else {
        setMessage({ type: 'success', text: `${result.processed} mapeamentos processados com sucesso!` });
      }
    } catch (error) {
      console.error('Failed to process merchants:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao processar: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDiscover = async () => {
    setMessage(undefined);
    try {
      const result = await discoverMerchants();

      if (result.discoveries_count === 0) {
        setMessage({
          type: 'success',
          text: 'Todos os estabelecimentos já foram descobertos!'
        });
      } else {
        setMessage({
          type: 'success',
          text: `${result.discoveries_count} estabelecimentos descobertos! Redirecionando para validação...`
        });

        // Navigate to validation page after 1.5 seconds
        setTimeout(() => {
          router.push('/merchants/validate');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to discover merchants:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao descobrir: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Estabelecimentos</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link href="/upload">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Novo Upload
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Visualize os estabelecimentos unificados e seus totais
          </p>
        </div>

        {/* Discovery Progress - Enhanced with real-time updates */}
        {isDiscovering && (
          <Card className="mb-6 border-blue-500/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header with stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 font-semibold">
                        {progress.message}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {progress.current}/{progress.total} estabelecimentos processados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%
                    </p>
                    {progress.total > 0 && progress.current > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{Math.round((progress.total - progress.current) * 0.9)}s restantes
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar with animation */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                {/* Stats inline */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Processados</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {progress.current}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Restantes</p>
                    <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {Math.max(0, progress.total - progress.current)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Velocidade</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ~0.9s
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {message && !isDiscovering && (
          <Card className={`mb-6 ${message.type === 'success' ? 'border-green-500/50' : 'border-destructive/50'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                <p className={message.type === 'success' ? 'text-green-500' : 'text-destructive'}>
                  {message.text}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!merchants || merchants.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum estabelecimento encontrado</CardTitle>
              <CardDescription>
                Faça upload de uma fatura primeiro ou clique em &quot;Processar Mapeamentos&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Link href="/upload">
                  <Button className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Upload de Fatura
                  </Button>
                </Link>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleProcess}
                    disabled={processing || isDiscovering}
                    className="flex-1"
                  >
                    {processing ? 'Processando...' : 'Processar Mapeamentos'}
                  </Button>
                  <Button
                    onClick={handleDiscover}
                    disabled={processing || isDiscovering}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isDiscovering ? 'Descobrindo...' : 'Descobrir com IA'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">
                  {merchants.length} {merchants.length === 1 ? 'estabelecimento encontrado' : 'estabelecimentos encontrados'}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={processing || isDiscovering || resetting}
                    size="sm"
                    className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Resetar Análises
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleProcess}
                    disabled={processing || isDiscovering}
                    size="sm"
                  >
                    {processing ? 'Processando...' : 'Reprocessar Mapeamentos'}
                  </Button>
                  <Button
                    onClick={handleDiscover}
                    disabled={processing || isDiscovering}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    {isDiscovering ? 'Descobrindo...' : 'Descobrir com IA'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use <strong>Descobrir com IA</strong> para identificar estabelecimentos reais a partir dos códigos de transação
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {merchants.map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {m.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {m.transaction_count} {m.transaction_count === 1 ? 'transação' : 'transações'} • Última:{' '}
                          {formatDate(m.last_seen)}
                        </p>
                        <details className="mt-3 group">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-2">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            Ver variações ({m.variations.length})
                          </summary>
                          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground border-l-2 border-muted pl-4 ml-2">
                            {m.variations.map((v, i) => (
                              <li key={i}>• {v}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-destructive">
                          {formatCurrency(m.total_spent)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  <CardTitle>Resetar Análises Antigas?</CardTitle>
                </div>
                <CardDescription>
                  Esta ação vai remover todas as discoveries e aprendizados anteriores.
                  As transações serão preservadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-semibold mb-2">✓ O que será removido:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Todas as discoveries pendentes</li>
                      <li>Histórico de learning (correções)</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
                    <p className="font-semibold mb-2 text-blue-600 dark:text-blue-400">✓ O que será preservado:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-600/80 dark:text-blue-400/80">
                      <li>Todas as transações (faturas)</li>
                      <li>Merchants já validados</li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Após o reset, clique em <strong>&quot;Start Discovery&quot;</strong> para re-analisar
                    com os novos algoritmos (normalização agressiva + learning + web search).
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1"
                    disabled={resetting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleResetDiscoveries}
                    disabled={resetting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resetar Agora
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
