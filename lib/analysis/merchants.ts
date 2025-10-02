import { addMerchant, getMerchant, getMerchantByName, updateMerchant, addMapping, getMapping } from '@/lib/db/operations';

/**
 * Normalizes raw merchant name by removing noise and standardizing format.
 * @param raw - Raw merchant description from transaction
 * @returns Normalized merchant name
 */
export function normalizeMerchantName(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\d{4,}/g, '') // Remove números longos (códigos)
    .replace(/BR$/, '') // Remove sufixo BR
    .replace(/SAO PAULO/g, '')
    .trim();
}

/**
 * Known merchant prefixes that indicate specific services.
 */
const KNOWN_PREFIXES: Record<string, string> = {
  'IFOOD *': 'iFood',
  'UBER *': 'Uber',
  '99 *': '99',
  'RAPPI *': 'Rappi',
  'NUBANK *': 'Nubank',
};

/**
 * Detects if raw description starts with a known merchant prefix.
 * @param raw - Raw merchant description
 * @returns Detected merchant name or null
 */
export function detectMerchantPrefix(raw: string): string | null {
  for (const [prefix, name] of Object.entries(KNOWN_PREFIXES)) {
    if (raw.startsWith(prefix)) {
      return name;
    }
  }
  return null;
}

/**
 * Gets or creates a merchant for a transaction.
 * Handles mapping, normalization, prefix detection, and stats updates.
 * @param rawDescription - Raw merchant description from transaction
 * @param amount - Transaction amount (for stats calculation)
 * @returns Merchant ID
 */
export async function getOrCreateMerchant(
  rawDescription: string,
  amount: number
): Promise<string> {
  // 1. Verificar se já existe mapping
  const existingMapping = await getMapping(rawDescription);
  if (existingMapping) {
    // IMPORTANTE: Mesmo com mapping existente, precisamos atualizar os stats
    const merchant = await getMerchant(existingMapping.merchant_id);
    if (merchant) {
      await updateMerchant(merchant.id, {
        total_spent: merchant.total_spent + Math.abs(amount),
        transaction_count: merchant.transaction_count + 1,
        last_seen: new Date(),
      });
    }
    return existingMapping.merchant_id;
  }

  // 2. Normalizar nome
  const normalized = normalizeMerchantName(rawDescription);

  // 3. Detectar prefixo
  const prefix = detectMerchantPrefix(rawDescription);
  const merchantName = prefix || normalized;

  // 4. Buscar merchant existente
  let merchant = await getMerchantByName(merchantName);

  if (merchant) {
    // Atualizar stats
    await updateMerchant(merchant.id, {
      total_spent: merchant.total_spent + Math.abs(amount),
      transaction_count: merchant.transaction_count + 1,
      last_seen: new Date(),
      variations: [...new Set([...merchant.variations, rawDescription])],
    });

    // Adicionar mapping
    await addMapping({
      raw_name: rawDescription,
      merchant_id: merchant.id,
      confirmed: false,
    });

    return merchant.id;
  } else {
    // Criar novo merchant
    const id = await addMerchant({
      name: merchantName,
      variations: [rawDescription],
      total_spent: Math.abs(amount),
      transaction_count: 1,
      last_seen: new Date(),
    });

    // Adicionar mapping
    await addMapping({
      raw_name: rawDescription,
      merchant_id: id,
      confirmed: false,
    });

    return id;
  }
}
