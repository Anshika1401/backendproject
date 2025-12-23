import CodingProblem from '../models/codingProblemModel.js';
import { runSingleTest, clearTempMain } from '../utils/codeExecutor.js';

const codingController = {
  // GET /coding/
  async getCodingHome(req, res, next) {
    try {
      const easyProblems = await CodingProblem.getProblemsByDifficulty('Easy');
      const mediumProblems = await CodingProblem.getProblemsByDifficulty('Medium');
      const hardProblems = await CodingProblem.getProblemsByDifficulty('Hard');

      res.render('coding/codingHome', {
        title: 'Coding Problems',
        user: req.user,
        easyProblems,
        mediumProblems,
        hardProblems
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /coding/:id
  async getCodingProblem(req, res, next) {
    try {
      const problemId = parseInt(req.params.id, 10);
      const problem = await CodingProblem.getProblemById(problemId);

      if (!problem) {
        return res.status(404).render('error', { message: 'Coding problem not found.' });
      }

      res.render('coding/codingProblem', {
        title: problem.title,
        user: req.user,
        problem,
        code: '',
        runResult: null,
        submissionStatus: null
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /coding/run/:id
  async runCode(req, res, next) {
    try {
      const problemId = parseInt(req.params.id, 10);
      const { code } = req.body;
      const problem = await CodingProblem.getProblemById(problemId);

      if (!problem) {
        return res.status(404).json({ error: 'Problem not found.' });
      }

      const input = problem.sample_input || '';
      const expectedOutput = (problem.sample_output || '').trim();

      const runResult = await runSingleTest(code, input);
      await clearTempMain();

      if (runResult.status === 'error') {
        return res.status(200).json({
          success: false,
          error: runResult.stderr,
          input,
          expected: expectedOutput
        });
      }

      const actualOutput = (runResult.stdout || '').trim();
      const isCorrect = actualOutput === expectedOutput;

      return res.status(200).json({
        success: true,
        result: {
          input,
          expected: expectedOutput,
          actual: actualOutput,
          status: isCorrect ? 'Passed' : 'Failed'
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /coding/submit/:id
  async submitCode(req, res, next) {
    try {
      const problemId = parseInt(req.params.id, 10);
      const { code } = req.body;
      const problem = await CodingProblem.getProblemById(problemId);
      const allTestCases = await CodingProblem.getAllTestCases(problemId);

      if (!problem || allTestCases.length === 0) {
        return res.render('coding/codingProblem', {
          title: problem ? problem.title : 'Error',
          user: req.user,
          problem,
          code,
          runResult: null,
          submissionStatus: {
            overallStatus: 'Error',
            message: 'No test cases defined for this problem.'
          }
        });
      }

      const results = [];
      let passedCount = 0;

      for (const testCase of allTestCases) {
        const input = testCase.input_data;
        const expectedOutput = (testCase.expected_output || '').trim();
        const runResult = await runSingleTest(code, input);
        const actualOutput = (runResult.stdout || '').trim();
        const errorMsg = runResult.stderr ? runResult.stderr.trim() : '';

        let status = 'Failed';
        if (runResult.status === 'error') {
          status = 'Error';
        } else if (actualOutput === expectedOutput) {
          status = 'Passed';
          passedCount++;
        }

        results.push({
          isSample: testCase.is_sample,
          input: testCase.is_sample ? input : 'Hidden Input',
          expected: testCase.is_sample ? expectedOutput : 'Hidden Output',
          actual: errorMsg ? `Error: ${errorMsg}` : actualOutput,
          status
        });
      }

      await clearTempMain();

      const submissionSummary = {
        passedCount,
        totalCount: allTestCases.length,
        results,
        overallStatus: passedCount === allTestCases.length ? 'Accepted' : 'Failed'
      };

      res.render('coding/codingProblem', {
        title: problem.title,
        user: req.user,
        problem,
        code,
        runResult: null,
        submissionStatus: submissionSummary
      });
    } catch (error) {
      next(error);
    }
  }
};

export default codingController;
