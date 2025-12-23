import pool from '../db.js';  // make sure your db.js is also ESM
import { parse } from 'path';

export const CodingProblem = {
  // Fetch a list of problems by difficulty (for codingHome view)
  async getProblemsByDifficulty(difficulty) {
    const { rows } = await pool.query(
      'SELECT * FROM coding_questions WHERE difficulty = $1 ORDER BY id ASC',
      [difficulty]
    );
    return rows;
  },

  // Fetch main problem details + only the sample test case
  async getProblemById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM coding_questions WHERE id = $1',
      [id]
    );
    if (!rows.length) return null;

    const problem = rows[0];

    // Fetch only the sample test case for display
    const sampleTestCase = await this.getSampleTestCase(id);
    problem.sample_test_case = sampleTestCase.length > 0 ? sampleTestCase[0] : null;

    return problem;
  },

  // Fetch ONLY the sample test case (is_sample = true)
  async getSampleTestCase(questionId) {
    const { rows } = await pool.query(
      'SELECT input_data, expected_output FROM test_cases WHERE question_id = $1 AND is_sample = TRUE',
      [questionId]
    );
    return rows;
  },

  // Fetch ALL test cases (sample + hidden) for submission checking
  async getAllTestCases(questionId) {
    const { rows } = await pool.query(
      'SELECT input_data, expected_output, is_sample FROM test_cases WHERE question_id = $1 ORDER BY id ASC',
      [questionId]
    );
    return rows;
  }
};
