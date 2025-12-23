// routes/coding.js (ES MODULE VERSION)

import express from "express";
import axios from "axios";

const router = express.Router();

// -------------------------
// Mock Questions Data
// -------------------------
const questions = [
  {
    id: 1,
    title: "Two Sum",
    description:
      "Given an array of integers, return indices of the two numbers such that they add up to a target.",
    inputExample: "[2,7,11,15], target = 9",
    outputExample: "[0,1]",
    functionName: "twoSum",
  },
  {
    id: 2,
    title: "Palindrome Check",
    description: "Determine whether a given string is a palindrome.",
    inputExample: "madam",
    outputExample: "true",
    functionName: "isPalindrome",
  },
];

// -------------------------
// Routes
// -------------------------

// Coding problem list
router.get("/", (req, res) => {
  res.render("coding/index", {
    title: "Coding Practice",
    questions,
  });
});

// Individual coding challenge
router.get("/:id", (req, res) => {
  const question = questions.find(
    (q) => q.id === Number(req.params.id)
  );

  if (!question) {
    return res.status(404).send("Question not found");
  }

  res.render("coding/challenge", {
    title: question.title,
    question,
  });
});

// -------------------------
// Run Code (Java Compiler via Piston API)
// -------------------------
router.post("/run/:id", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: "java",
        version: "17.0.3",
        files: [{ name: "Main.java", content: code }],
      }
    );

    const result = response.data;

    res.json({
      output: result.run?.output || "No output",
      language: result.language,
      version: result.version,
    });

  } catch (error) {
    console.error("⚠️ Error executing code:", error.message);

    res.status(500).json({
      error: error.response?.data || "Execution failed. Please try again.",
    });
  }
});

export default router;
