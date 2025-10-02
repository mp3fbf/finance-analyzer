/**
 * Web Search Integration using Brave Search API
 *
 * Brave Search API is FREE for up to 2,000 queries/month.
 * Perfect for merchant name disambiguation.
 *
 * Get API key: https://brave.com/search/api/
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

/**
 * Perform web search using Brave Search API
 *
 * @param query - Search query (e.g., "ZUL1 CARTAO cobrança")
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Search results with summary
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5
): Promise<WebSearchResponse> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    console.warn('BRAVE_SEARCH_API_KEY not configured, skipping web search');
    return {
      query,
      results: [],
      summary: 'Web search disabled (API key not configured)'
    };
  }

  try {
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
  } catch (error) {
    console.error('Web search error:', error);
    return {
      query,
      results: [],
      summary: `Erro na busca: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
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
