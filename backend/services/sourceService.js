import axios from 'axios';

/**
 * Fetches real-time evidence from Tavily Search API.
 * Tavily returns clean, LLM-friendly content — perfect for the Researcher agent.
 */
export const getSources = async (query) => {
  const lowQuery = query.toLowerCase();
  
  // Basic mock results for common topics if API key is missing
  const getMockSources = (q) => {
    if (q.includes('bill gates') && q.includes('farmland')) {
      return [{
        title: "Fact Check: Bill Gates' Farmland Ownership",
        url: "https://www.reuters.com/article/factcheck-gates-farmland/",
        content: "Bill Gates owns approximately 275,000 acres of US farmland, which is less than 1% of total US farmland. Claims of '420 square miles' for cannabis dominance are satirical or false."
      }];
    }
    if (q.includes('election') || q.includes('vote')) {
      return [{
        title: "CISA: Election Security Rumor Control",
        url: "https://www.cisa.gov/rumorcontrol",
        content: "Official government resources for debunking election misinformation. Election systems remain resilient and protected."
      }];
    }
    return [];
  };

  if (process.env.USE_TAVILY !== 'true' || !process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY.includes('YOUR_KEY')) {
    console.info('[ShieldNet] Tavily Search currently disabled or key missing.');
    const mock = getMockSources(lowQuery);
    return { results: mock, formatted: mock.map(m => ({ title: m.title, url: m.url })) };
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.TAVILY_API_KEY,
      query: query.substring(0, 400), // Tavily query limit
      search_depth: 'basic',
      max_results: 4,
      include_answer: false,
      include_raw_content: false,
    });

    const results = response.data.results || [];

    // Formatted for the UI (verified_sources)
    const formatted = results.map(r => ({
      title: r.title,
      url: r.url,
    }));

    // Raw results with content snippets for the AI agents
    const raw = results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content ? r.content.substring(0, 300) : '',
    }));

    return { results: raw, formatted };
  } catch (err) {
    console.error('[ShieldNet] Tavily API error:', err.response?.data || err.message);

    // Graceful fallback — return empty to allow agents to still run
    return { results: [], formatted: [] };
  }
};
