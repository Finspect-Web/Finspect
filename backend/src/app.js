require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Finspect API is running."
  });
});

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
