import axios from 'axios';

export const getSources = async (query) => {
  try {
    // Extract first few words to create a meaningful Wikipedia search query
    const words = query.split(' ').slice(0, 4).join(' ');
    
    const response = await axios.get(`https://en.wikipedia.org/w/api.php`, {
      params: {
        action: 'query',
        list: 'search',
        srsearch: words,
        format: 'json',
        utf8: 1
      }
    });

    const results = response.data.query.search.slice(0, 2);
    
    if (results.length === 0) {
      return [
        { title: "FactCheck.org", url: "https://www.factcheck.org/" }
      ];
    }

    return results.map(r => ({
      title: `Wikipedia: ${r.title}`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`
    }));
  } catch (err) {
    console.error('Source fetch error', err);
    // Fallback if API fails
    return [
      { title: "General Fact Check", url: "https://example.com/fact-check" }
    ];
  }
};
