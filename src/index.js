const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();
// DB_STRING=`mongodb://code-learning-platform-BE_DB:DB_PASSWORD@ac-xb2lqn7-shard-00-00.hwob9gg.mongodb.net:27017,ac-xb2lqn7-shard-00-01.hwob9gg.mongodb.net:27017,ac-xb2lqn7-shard-00-02.hwob9gg.mongodb.net:27017/?ssl=true&replicaSet=atlas-d10z9c-shard-0&authSource=admin&appName=CodeLearningPlatformBE`
// DB_PASSWORD=RitoGGWP
const dbString = process.env.DB_STRING.replace("DB_PASSWORD", process.env.DB_PASSWORD);

const app = express();

// Connect to MongoDB
mongoose
  .connect(dbString)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Basic get API endpoint
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
