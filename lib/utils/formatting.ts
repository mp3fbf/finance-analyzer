/**
 * Currency formatter instance (created once for performance)
 */
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Formats a number as Brazilian Real currency
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "R$ 1.234,56")
 */
export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/**
 * Formats a date to Brazilian locale
 * @param date - The date to format
 * @returns Formatted date string (e.g., "25/11/2025")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formats a date and time to Brazilian locale
 * @param date - The date to format
 * @returns Formatted date and time string (e.g., "25/11/2025 14:30")
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR');
}
