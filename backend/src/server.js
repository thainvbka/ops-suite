import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import config from "./config/index.js";

const app = express();
const db = await import("./database/mongodb.js");

app.use(morgan("dev"));
app.use(cors());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});
