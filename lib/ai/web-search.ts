/**
 * Web Search Integration using Brave Search API
 *
 * Brave Search API is FREE for up to 2,000 queries/month.
 * Perfect for merchant name disambiguation.
 *
 * Get API key: https://brave.com/search/api/
 *
 * FREE PLAN LIMITS:
 * - 1 request/second (enforced via rate limiting below)
 * - 2,000 requests/month
 */

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  age?: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  summary: string;
}

// ============================================================================
// RATE LIMITING: Queue-based system to enforce 1 request/second
// ============================================================================

type QueuedRequest = {
  query: string;
  maxResults: number;
  resolve: (value: WebSearchResponse) => void;
  reject: (error: Error) => void;
};

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
let lastRequestTime = 0;
const MIN_DELAY_MS = 1100; // 1.1 seconds between requests (Brave Free: 1 req/sec)

/**
 * Process queue sequentially with rate limiting
 */
async function processQueue() {
  if (isProcessingQueue) return; // Already processing
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift()!;

    try {
      // Enforce delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < MIN_DELAY_MS) {
        const waitTime = MIN_DELAY_MS - timeSinceLastRequest;
        console.log(`⏱️  Rate limiting: waiting ${waitTime}ms (${requestQueue.length} pending)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      lastRequestTime = Date.now();

      // Make actual API call
      const result = await performSearch(request.query, request.maxResults);
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    }
  }

  isProcessingQueue = false;
}

/**
 * Actual search implementation (no rate limiting here, handled by queue)
 */
async function performSearch(query: string, maxResults: number): Promise<WebSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('BRAVE_SEARCH_API_KEY not configured, skipping web search');
    return {
      query,
      results: [],
      summary: 'Web search disabled (API key not configured)'
    };
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract web results
  const results: SearchResult[] = (data.web?.results || [])
    .slice(0, maxResults)
    .map((result: any) => ({
      title: result.title,
      description: result.description,
      url: result.url,
      age: result.age
    }));

  // Create summary from top results
  const summary = results
    .map((r, idx) => `${idx + 1}. ${r.title}\n   ${r.description}`)
    .join('\n\n');

  return {
    query,
    results,
    summary: summary || 'Nenhum resultado encontrado'
  };
}

/**
 * Perform web search using Brave Search API
 *
 * PUBLIC API: Enqueues request and returns promise
 *
 * @param query - Search query (e.g., "ZUL1 CARTAO cobrança")
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Search results with summary
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<WebSearchResponse> {
  return new Promise((resolve, reject) => {
    // Add to queue
    requestQueue.push({ query, maxResults, resolve, reject });

    // Start processing if not already running
    processQueue().catch(err => {
      console.error('Queue processing error:', err);
    });
  });
}

/**
 * Format search results for Claude's context
 *
 * @param searchResponse - Web search response
 * @returns Formatted text for AI prompt
 */
export function formatSearchResultsForAI(searchResponse: WebSearchResponse): string {
  if (searchResponse.results.length === 0) {
    return 'Busca web não retornou resultados relevantes.';
  }

  return `RESULTADOS DA BUSCA WEB para "${searchResponse.query}":

${searchResponse.results.map((result, idx) => `
${idx + 1}. ${result.title}
   URL: ${result.url}
   ${result.description}
`).join('\n')}

RESUMO: Com base nos resultados acima, identifique o estabelecimento real.`;
}
