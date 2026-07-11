import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db.js"; // initializes SQLite tables on startup
import jobsRouter from "./routes/jobs.js";
import authRouter from "./routes/auth.js";
import savedJobsRouter from "./routes/savedJobs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "remote-jobs-aggregator-api" });
});

app.use("/api/jobs", jobsRouter);
app.use("/api/auth", authRouter);
app.use("/api/saved-jobs", savedJobsRouter);

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
