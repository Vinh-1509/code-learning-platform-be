const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();
// MongoDB String: `mongodb+srv://code-learning-platform-BE_DB:DB_PASSWORD@codelearningplatformbe.hwob9gg.mongodb.net/?appName=CodeLearningPlatformBE`;
// DB_PASSWORD=RitoGGWP
const dbString = process.env.DB_STRING.replace("DB_PASSWORD", process.env.DB_PASSWORD);

const app = express();

// Connect to MongoDB
mongoose
  .connect(dbString)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/api/hello", (req, res) => {
  res.json({
    success: true,
    message: "Hello world"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
