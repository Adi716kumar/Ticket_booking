const { getEventsService } = require("./eventService");

/**
 * Parses a free-text query like "weekend concert under 1500" into
 * structured filters { type, maxPrice, dateFrom, dateTo }.
 *
 * Tries the Anthropic API first (if ANTHROPIC_API_KEY is set) for genuine
 * natural-language understanding. If the key is missing, or the API call
 * fails for any reason (network, rate limit, bad key), it falls back to a
 * rule-based keyword parser instead of erroring out — this was a
 * deliberate design choice so a live interview demo never breaks just
 * because an API key/quota isn't available in the room.
 */
async function parseQuery(query) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await parseWithLLM(query);
    } catch (err) {
      console.log("LLM parse failed, falling back to rule-based parser:", err.message);
    }
  }
  return parseWithRules(query);
}

async function parseWithLLM(query) {
  const today = new Date().toISOString().slice(0, 10);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Today's date is ${today}. Parse this event search query into JSON only,
no other text, matching exactly this shape:
{"type": "Movie" | "Concert" | null, "maxPrice": number | null, "dateFrom": "YYYY-MM-DD" | null, "dateTo": "YYYY-MM-DD" | null}

Query: "${query}"`,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = data.content?.find((block) => block.type === "text")?.text || "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    type: parsed.type || undefined,
    maxPrice: parsed.maxPrice || undefined,
    dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : undefined,
    dateTo: parsed.dateTo ? new Date(parsed.dateTo) : undefined,
  };
}

/**
 * Simple, explainable keyword-based fallback — no external dependency,
 * always available. Deliberately conservative: only sets a filter when
 * it's confident, otherwise leaves it undefined so the search just
 * returns more results rather than wrongly narrowing them.
 */
function parseWithRules(query) {
  const q = query.toLowerCase();
  const filters = {};

  if (q.includes("movie") || q.includes("film")) filters.type = "Movie";
  if (q.includes("concert") || q.includes("gig") || q.includes("show")) filters.type = "Concert";

  const priceMatch = q.match(/under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i) || q.match(/(?:rs\.?|inr|₹)\s*(\d+)/i);
  if (priceMatch) filters.maxPrice = Number(priceMatch[1]);

  const now = new Date();
  if (q.includes("today")) {
    filters.dateFrom = new Date(now.setHours(0, 0, 0, 0));
    filters.dateTo = new Date(now.setHours(23, 59, 59, 999));
  } else if (q.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    filters.dateFrom = new Date(tomorrow.setHours(0, 0, 0, 0));
    filters.dateTo = new Date(tomorrow.setHours(23, 59, 59, 999));
  } else if (q.includes("weekend")) {
    const day = now.getDay(); // 0 = Sunday
    const daysUntilSaturday = (6 - day + 7) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    filters.dateFrom = saturday;
    filters.dateTo = sunday;
  }

  return filters;
}

exports.searchEventsService = async (query) => {
  const filters = await parseQuery(query);
  const events = await getEventsService(filters);
  return { filters, events };
};
