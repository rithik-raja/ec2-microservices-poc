const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`backend listening on http://localhost:${PORT}`);
});
