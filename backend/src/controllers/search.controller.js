const asyncHandler = require("../utils/asyncHandler");
const { searchGlobal } = require("../services/search.service");

const searchController = asyncHandler(async (req, res) => {
  const actor = req.user || null;
  const data = await searchGlobal(req.query.q, actor);
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  searchController
};