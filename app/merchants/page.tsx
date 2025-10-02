'use client';

import { useMerchants } from '@/lib/db/hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useState } from 'react';
import { processMerchantsForAllTransactions } from '@/lib/analysis/process-merchants';
import Link from 'next/link';
import { CheckCircle2, XCircle, Store, Upload } from 'lucide-react';

export default function MerchantsPage() {
  const merchants = useMerchants();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>();

  const handleProcess = async () => {
    setProcessing(true);
    setMessage(undefined);
    try {
      await processMerchantsForAllTransactions();
      setMessage({ type: 'success', text: 'Mapeamentos processados com sucesso!' });
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

        {message && (
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
              <div className="flex gap-3">
                <Link href="/upload">
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Upload de Fatura
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleProcess} disabled={processing}>
                  {processing ? 'Processando...' : 'Processar Mapeamentos'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {merchants.length} {merchants.length === 1 ? 'estabelecimento encontrado' : 'estabelecimentos encontrados'}
              </p>
              <Button variant="outline" onClick={handleProcess} disabled={processing} size="sm">
                {processing ? 'Processando...' : 'Reprocessar Mapeamentos'}
              </Button>
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
                          {m.last_seen.toLocaleDateString('pt-BR')}
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
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(m.total_spent)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
