const { searchEventsService } = require("../services/searchService");

exports.searchEvents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }

    const { filters, events } = await searchEventsService(q);
    res.json({ success: true, filters, events });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
