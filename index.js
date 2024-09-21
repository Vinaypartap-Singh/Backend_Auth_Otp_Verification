import express from "express";
import "dotenv/config";
import routes from "./routes/index.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 7000;

// Express URL Encoded and Cors
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set EJS View Engine

app.set("view engine", "ejs");
// Set EJS Path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set("views", path.resolve(__dirname, "./views"));

// Use Routes
app.use(routes);

app.get("/", (req, res) => {
  return res.json({ message: "Server is running" });
});

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
