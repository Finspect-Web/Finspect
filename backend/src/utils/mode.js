function isDummyMode() {
  return process.env.USE_DUMMY_AUTH === "true" || !process.env.DATABASE_URL;
}

module.exports = {
  isDummyMode
};
