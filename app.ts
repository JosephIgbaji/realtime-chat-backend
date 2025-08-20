import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth";
import roomsRouter from "./routes/rooms";
import messagesRouter from "./routes/messages";
import profileRouter from "./routes/profile";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*"
}));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/messages", messagesRouter);
// app.use("/api/user", profileRouter);

app.get("/", (_req, res) => {
  res.json({message: "Welcome to the Realtime Chat API", version: "1.0.0"}).status(200);
});

export default app;
