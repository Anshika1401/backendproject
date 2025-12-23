/**
 * apptest.js - Jest test suite for Progress Routes
 */

const request = require("supertest");
const express = require("express");

// !!! Mock the DB pool
jest.mock("../../db", () => ({
  query: jest.fn()
}));

// Mock ensureAuth – just pass-through
jest.mock("../../middleware/auth", () => ({
  ensureAuth: (req, res, next) => {
    req.user = { id: 1 }; // Fake logged-in user
    next();
  }
}));

// Mock calculatePercentage
jest.mock("../../utils/progressUtil", () => ({
  calculatePercentage: (a, b) => (a / b) * 100
}));

const pool = require("../../db");
const progressRoute = require("../../routes/progress");

describe("Progress Route Tests", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Fake render handler (captures render output)
    app.set("views", __dirname);
    app.set("view engine", "hbs");
    app.response.render = function (view, options) {
      this.send({ view, ...options });
    };

    app.use("/progress", progressRoute);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------
  // TEST 1: GET /progress
  // -------------------------------------------------------
  test("GET /progress → should load user progress dashboard", async () => {
    // Mock DB responses

    // Progress attempts
    pool.query.mockImplementationOnce(() =>
      Promise.resolve({
        rows: [
          {
            id: 10,
            subject: "Java",
            type: "MCQ",
            difficulty: "Easy",
            score: 8,
            total: 10,
            created_at: new Date()
          }
        ]
      })
    );

    // Leaderboard
    pool.query.mockImplementationOnce(() =>
      Promise.resolve({
        rows: [
          { username: "Alice", percentage: 90 },
          { username: "Bob", percentage: 85 }
        ]
      })
    );

    const res = await request(app).get("/progress");

    expect(res.statusCode).toBe(200);

    // Render check
    expect(res.body.view).toBe("progress");
    expect(res.body.attempts.length).toBe(1);
    expect(res.body.leaderboard.length).toBe(2);

    // Percentage calculation test
    expect(res.body.attempts[0].percentage).toBe(80);
  });

  // -------------------------------------------------------
  // TEST 2: POST /progress/update
  // -------------------------------------------------------
  test("POST /progress/update → should insert progress and redirect", async () => {
    pool.query.mockResolvedValue({});

    const res = await request(app)
      .post("/progress/update")
      .send({
        subject: "Cloud Computing",
        type: "Coding",
        difficulty: "Medium",
        score: 6,
        total: 10
      });

    // DB should have been called once
    expect(pool.query).toHaveBeenCalledTimes(1);

    // Verify query arguments
    expect(pool.query.mock.calls[0][0]).toContain("INSERT INTO progress");
    expect(pool.query.mock.calls[0][1]).toEqual([
      1, // user id from mocked auth
      "Cloud Computing",
      "Coding",
      "Medium",
      6,
      10
    ]);

    // Redirection status
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/progress");
  });
});
