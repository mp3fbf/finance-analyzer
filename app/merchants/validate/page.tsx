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
import { formatCurrency } from '@/lib/utils/formatting';

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
      if (pending.length > 0) {
        setEditedName(pending[0].ai_final_inference);
      }
    } catch (error) {
      console.error('Failed to load discoveries:', error);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    const discovery = discoveries[currentIndex];
    if (!discovery.id) return;

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
        context_features: {
          has_asterisk: discovery.context_snapshot.code_structure.has_asterisk,
          has_numeric_suffix: discovery.context_snapshot.code_structure.has_variable_numeric_suffix,
          value_cv: discovery.context_snapshot.amount_stats.cv,
          occurrence_count: discovery.context_snapshot.occurrence_count,
          temporal_pattern: discovery.context_snapshot.temporal_pattern.pattern_description
        }
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to confirm discovery:', error);
    }
  }

  async function handleCorrect() {
    const discovery = discoveries[currentIndex];
    if (!discovery.id) return;

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
        context_features: {
          has_asterisk: discovery.context_snapshot.code_structure.has_asterisk,
          has_numeric_suffix: discovery.context_snapshot.code_structure.has_variable_numeric_suffix,
          value_cv: discovery.context_snapshot.amount_stats.cv,
          occurrence_count: discovery.context_snapshot.occurrence_count,
          temporal_pattern: discovery.context_snapshot.temporal_pattern.pattern_description
        }
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to correct discovery:', error);
    }
  }

  async function handleReject() {
    const discovery = discoveries[currentIndex];
    if (!discovery.id) return;

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
        context_features: {
          has_asterisk: discovery.context_snapshot.code_structure.has_asterisk,
          has_numeric_suffix: discovery.context_snapshot.code_structure.has_variable_numeric_suffix,
          value_cv: discovery.context_snapshot.amount_stats.cv,
          occurrence_count: discovery.context_snapshot.occurrence_count,
          temporal_pattern: discovery.context_snapshot.temporal_pattern.pattern_description
        }
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
      setEditedName(discoveries[nextIndex].ai_final_inference);
    } else {
      // Reload to check if there are more pending
      loadDiscoveries();
      setCurrentIndex(0);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2 dark:text-gray-100">Carregando descobertas...</div>
          <div className="text-gray-600 dark:text-gray-400">Analisando estabelecimentos</div>
        </div>
      </div>
    );
  }

  if (discoveries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2 dark:text-gray-100">✅ Tudo validado!</div>
          <div className="text-gray-600 dark:text-gray-400">Não há estabelecimentos pendentes de validação</div>
        </div>
      </div>
    );
  }

  const discovery = discoveries[currentIndex];
  const context = discovery.context_snapshot;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-gray-100">🔍 Validação de Estabelecimentos</h1>
          <div className="text-gray-600 dark:text-gray-400">
            {currentIndex + 1} de {discoveries.length} pendentes
          </div>
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / discoveries.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Discovery Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          {/* Code */}
          <div className="mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Código da transação:</div>
            <div className="font-mono text-lg font-bold dark:text-gray-100">{discovery.raw_code}</div>
            {context.raw_variations.length > 1 && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer">
                  {context.raw_variations.length} variações detectadas
                </summary>
                <ul className="mt-2 text-sm font-mono text-gray-700 dark:text-gray-300">
                  {context.raw_variations.slice(0, 5).map((v, i) => (
                    <li key={i}>• {v}</li>
                  ))}
                  {context.raw_variations.length > 5 && (
                    <li className="text-gray-500">... e mais {context.raw_variations.length - 5}</li>
                  )}
                </ul>
              </details>
            )}
          </div>

          {/* AI Inference */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-blue-800 font-semibold">IA inferiu:</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Confiança: {Math.round(discovery.ai_confidence * 100)}%
              </div>
            </div>
            <div className="text-xl font-bold text-blue-900 mb-2">
              {discovery.ai_final_inference}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              {discovery.ai_reasoning_summary}
            </div>
          </div>

          {/* Context Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ocorrências</div>
              <div className="text-lg font-semibold">{context.occurrence_count} transações</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Valor Total</div>
              <div className="text-lg font-semibold">
                {formatCurrency(context.total_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Faixa de valores</div>
              <div className="text-sm">
                {formatCurrency(context.amount_stats.min)} - {formatCurrency(context.amount_stats.max)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Padrão temporal</div>
              <div className="text-sm">{context.temporal_pattern.pattern_description}</div>
            </div>
          </div>

          {/* Reasoning Details */}
          <details className="mb-6">
            <summary className="text-sm text-gray-700 cursor-pointer font-semibold">
              Ver raciocínio completo da IA
            </summary>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300">Análise estrutural:</div>
                <div className="text-gray-600 dark:text-gray-400">{discovery.ai_reasoning.structural_analysis}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300">Análise de valores:</div>
                <div className="text-gray-600 dark:text-gray-400">{discovery.ai_reasoning.value_analysis}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 dark:text-gray-300">Análise temporal:</div>
                <div className="text-gray-600 dark:text-gray-400">{discovery.ai_reasoning.temporal_analysis}</div>
              </div>
              {discovery.ai_reasoning.hypotheses.length > 0 && (
                <div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300">Hipóteses consideradas:</div>
                  <ul className="mt-2 space-y-2">
                    {discovery.ai_reasoning.hypotheses.map((h, i) => (
                      <li key={i} className="border-l-2 border-gray-300 pl-3">
                        <div className="font-medium">{h.name} ({Math.round(h.confidence * 100)}%)</div>
                        <div className="text-xs text-green-700">✓ {h.evidence_for.join(', ')}</div>
                        {h.evidence_against.length > 0 && (
                          <div className="text-xs text-red-700">✗ {h.evidence_against.join(', ')}</div>
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nome correto do estabelecimento:
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o nome correto"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notas (opcional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  ✓ Confirmar
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  ✏️ Corrigir
                </button>
                <button
                  onClick={() => {
                    setEditMode(true);
                    setNotes('');
                  }}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  ❌ Rejeitar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-semibold hover:bg-gray-500 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCorrect}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                  disabled={!editedName.trim()}
                >
                  Salvar Correção
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  Confirmar Rejeição
                </button>
              </>
            )}
          </div>
        </div>

        {/* Impact Score Info */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Impacto financeiro: {formatCurrency(discovery.impact_score)}
          <span className="ml-2">(prioridade por valor total × frequência)</span>
        </div>
      </div>
    </div>
  );
}
