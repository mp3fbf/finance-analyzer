'use client';

/**
 * Merchant Validation Page
 *
 * Interface for users to validate, correct, or reject AI-inferred merchant names.
 * Displays discoveries sorted by impact (financial importance).
 */

import { useState, useEffect } from 'react';
import { MerchantDiscovery } from '@/types/discovery';
import {
  getPendingDiscoveries,
  confirmDiscovery,
  correctDiscovery,
  rejectDiscovery,
  addDiscoveryLearning
} from '@/lib/db/operations';
import { createPatternSignature, createContextSummary } from '@/types/discovery';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import { TransactionContext } from '@/lib/analysis/context-analyzer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, Pencil, X } from 'lucide-react';

/**
 * Helper function to build context features for discovery learning
 */
function buildContextFeatures(context: TransactionContext) {
  return {
    has_asterisk: context.code_structure.has_asterisk,
    has_numeric_suffix: context.code_structure.has_variable_numeric_suffix,
    value_cv: context.amount_stats.cv,
    occurrence_count: context.occurrence_count,
    temporal_pattern: context.temporal_pattern.pattern_description
  };
}

/**
 * Merchant validation page component
 *
 * Displays pending discoveries sorted by impact score, allowing users to
 * confirm, correct, or reject AI-inferred merchant names.
 */
export default function MerchantValidationPage() {
  const [discoveries, setDiscoveries] = useState<MerchantDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDiscoveries();
  }, []);

  async function loadDiscoveries() {
    setLoading(true);
    try {
      const pending = await getPendingDiscoveries();
      setDiscoveries(pending);
      if (pending.length > 0 && pending[0]) {
        setEditedName(pending[0].ai_final_inference);
      }
    } catch (error) {
      console.error('Failed to load discoveries:', error);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    const discovery = discoveries[currentIndex];
    if (!discovery || !discovery.id) return;

    try {
      await confirmDiscovery(discovery.id);

      // Add learning signal
      await addDiscoveryLearning({
        pattern_signature: createPatternSignature(discovery.context_snapshot),
        original_code: discovery.raw_code,
        context_summary: createContextSummary(discovery.context_snapshot),
        ai_inference: discovery.ai_final_inference,
        ai_confidence: discovery.ai_confidence,
        user_correction: null,
        was_correct: true,
        context_features: buildContextFeatures(discovery.context_snapshot)
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to confirm discovery:', error);
    }
  }

  async function handleCorrect() {
    const discovery = discoveries[currentIndex];
    if (!discovery || !discovery.id) return;

    try {
      await correctDiscovery(discovery.id, editedName, notes);

      // Add learning signal
      await addDiscoveryLearning({
        pattern_signature: createPatternSignature(discovery.context_snapshot),
        original_code: discovery.raw_code,
        context_summary: createContextSummary(discovery.context_snapshot),
        ai_inference: discovery.ai_final_inference,
        ai_confidence: discovery.ai_confidence,
        user_correction: editedName,
        was_correct: false,
        error_type: 'partially_correct',
        context_features: buildContextFeatures(discovery.context_snapshot)
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to correct discovery:', error);
    }
  }

  async function handleReject() {
    const discovery = discoveries[currentIndex];
    if (!discovery || !discovery.id) return;

    try {
      await rejectDiscovery(discovery.id, notes);

      // Add learning signal
      await addDiscoveryLearning({
        pattern_signature: createPatternSignature(discovery.context_snapshot),
        original_code: discovery.raw_code,
        context_summary: createContextSummary(discovery.context_snapshot),
        ai_inference: discovery.ai_final_inference,
        ai_confidence: discovery.ai_confidence,
        user_correction: null,
        was_correct: false,
        error_type: 'completely_wrong',
        context_features: buildContextFeatures(discovery.context_snapshot)
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to reject discovery:', error);
    }
  }

  function moveToNext() {
    setEditMode(false);
    setNotes('');
    if (currentIndex < discoveries.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      const nextDiscovery = discoveries[nextIndex];
      if (nextDiscovery) {
        setEditedName(nextDiscovery.ai_final_inference);
      }
    } else {
      // Reload to check if there are more pending
      loadDiscoveries();
      setCurrentIndex(0);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-foreground">Carregando descobertas...</div>
          <div className="text-muted-foreground">Analisando estabelecimentos</div>
        </div>
      </div>
    );
  }

  if (discoveries.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2 text-foreground">✅ Tudo validado!</div>
          <div className="text-muted-foreground">Não há estabelecimentos pendentes de validação</div>
        </div>
      </div>
    );
  }

  const discovery = discoveries[currentIndex];
  if (!discovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 text-foreground">Erro ao carregar descoberta</div>
          <div className="text-muted-foreground">Descoberta não encontrada</div>
        </div>
      </div>
    );
  }

  const context = discovery.context_snapshot;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-foreground">🔍 Validação de Estabelecimentos</h1>
          <div className="text-muted-foreground">
            {currentIndex + 1} de {discoveries.length} pendentes
          </div>
          <div className="mt-2 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / discoveries.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Discovery Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Code */}
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-1">Código da transação:</div>
              <div className="font-mono text-lg font-bold text-foreground">{discovery.raw_code}</div>
              {context.raw_variations.length > 1 && (
                <details className="mt-2">
                  <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    {context.raw_variations.length} variações detectadas
                  </summary>
                  <ul className="mt-2 text-sm font-mono text-muted-foreground">
                    {context.raw_variations.slice(0, 5).map((v, i) => (
                      <li key={i}>• {v}</li>
                    ))}
                    {context.raw_variations.length > 5 && (
                      <li className="text-muted-foreground/60">... e mais {context.raw_variations.length - 5}</li>
                    )}
                  </ul>
                </details>
              )}
            </div>

            {/* AI Inference */}
            <div className="mb-6 p-4 border-l-4 border-primary bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-foreground">IA inferiu:</div>
                <Badge variant="outline">
                  Confiança: {Math.round(discovery.ai_confidence * 100)}%
                </Badge>
              </div>
              <div className="text-xl font-bold text-foreground mb-2">
                {discovery.ai_final_inference}
              </div>
              <div className="text-sm text-muted-foreground">
                {discovery.ai_reasoning_summary}
              </div>
            </div>

          {/* Context Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-muted-foreground">Ocorrências</div>
              <div className="text-lg font-semibold text-foreground">{context.occurrence_count} transações</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-lg font-semibold text-foreground">
                {formatCurrency(context.total_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Faixa de valores</div>
              <div className="text-sm text-foreground">
                {formatCurrency(context.amount_stats.min)} - {formatCurrency(context.amount_stats.max)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Padrão temporal</div>
              <div className="text-sm text-foreground">{context.temporal_pattern.pattern_description}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Período</div>
              <div className="text-sm text-foreground">
                {formatDate(new Date(context.date_range.first))} até {formatDate(new Date(context.date_range.last))}
              </div>
            </div>
          </div>

          {/* Reasoning Details */}
          <details className="mb-6">
            <summary className="text-sm cursor-pointer font-semibold text-foreground hover:text-primary">
              Ver raciocínio completo da IA
            </summary>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold text-foreground">Análise estrutural:</div>
                <div className="text-muted-foreground">{discovery.ai_reasoning.structural_analysis}</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">Análise de valores:</div>
                <div className="text-muted-foreground">{discovery.ai_reasoning.value_analysis}</div>
              </div>
              <div>
                <div className="font-semibold text-foreground">Análise temporal:</div>
                <div className="text-muted-foreground">{discovery.ai_reasoning.temporal_analysis}</div>
              </div>
              {discovery.ai_reasoning.hypotheses.length > 0 && (
                <div>
                  <div className="font-semibold text-foreground">Hipóteses consideradas:</div>
                  <ul className="mt-2 space-y-2">
                    {discovery.ai_reasoning.hypotheses.map((h, i) => (
                      <li key={i} className="border-l-2 border-border pl-3">
                        <div className="font-medium text-foreground">{h.name} ({Math.round(h.confidence * 100)}%)</div>
                        <div className="text-xs text-green-600 dark:text-green-400">✓ {h.evidence_for.join(', ')}</div>
                        {h.evidence_against.length > 0 && (
                          <div className="text-xs text-red-600 dark:text-red-400">✗ {h.evidence_against.join(', ')}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>

          {/* Edit Mode */}
          {editMode && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Nome correto do estabelecimento:
                </label>
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Digite o nome correto"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                  Notas (opcional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Ex: É uma padaria local, não é uma rede"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!editMode ? (
              <>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
                <Button
                  onClick={() => setEditMode(true)}
                  variant="default"
                  className="flex-1"
                  size="lg"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Corrigir
                </Button>
                <Button
                  onClick={() => {
                    setEditMode(true);
                    setNotes('');
                  }}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setEditMode(false)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCorrect}
                  variant="default"
                  className="flex-1"
                  size="lg"
                  disabled={!editedName.trim()}
                >
                  Salvar Correção
                </Button>
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  Confirmar Rejeição
                </Button>
              </>
            )}
          </div>
          </CardContent>
        </Card>

        {/* Impact Score Info */}
        <div className="text-center text-sm text-muted-foreground">
          Impacto financeiro: {formatCurrency(discovery.impact_score)}
          <span className="ml-2">(prioridade por valor total × frequência)</span>
        </div>
      </div>
    </div>
  );
}
