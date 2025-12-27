const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ override: true });

const app = express();

app.use(express.json());
app.use(cors());

const sensorRoutes = require("./routes/sensorRoutes");
const alertRoutes = require("./routes/alertRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const systemRoutes = require("./routes/systemRoutes");

// Degraded mode: app starts even if MongoDB is unavailable.
app.locals.dbConnected = false;

// Single connection attempt (no retries). Mongoose v7+ handles internal reconnection.
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.locals.dbConnected = true;
    console.log("MongoDB Connected Successfully");
  })
  .catch((err) => {
    app.locals.dbConnected = false;
    console.error("MongoDB Connection Error:", err && err.message ? err.message : err);
  });

// middleware to protect DB-dependent routes when DB is down
function requireDB(req, res, next) {
  if (app.locals.dbConnected) return next();
  res.status(503).json({ error: "Service degraded: database unavailable" });
}

app.use("/sensor", requireDB, sensorRoutes);
app.use("/alerts", requireDB, alertRoutes);
app.use("/device", requireDB, deviceRoutes);
app.use("/system", requireDB, systemRoutes);

// lightweight health endpoint
app.get('/health', (req, res) => {
  res.json({ uptime: process.uptime(), dbConnected: !!app.locals.dbConnected });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
