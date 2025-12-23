// utils/codeExecutor.js
import fs from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ------------------ Directory Setup ------------------
// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary folder for code execution
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// ------------------ Execution Commands ------------------
const EXECUTION_COMMANDS = {
  java: (baseName) => `javac ${baseName}.java && java ${baseName}`,
  javascript: (baseName) => `node ${baseName}.js`,
  // c++: (baseName) => `g++ ${baseName}.cpp -o ${baseName} && ./${baseName}`,
};

// ------------------ Helper: Execute Command ------------------
function executeCommand(command, execOptions) {
  return new Promise((resolve, reject) => {
    exec(command, execOptions, (error, stdout, stderr) => {
      if (error) {
        reject({ error: stderr || error.message || 'Execution failed' });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// ------------------ Main Function ------------------
export async function execute(code, language, problemId) {
  // 1. Generate unique filename
  const baseName = `${Date.now()}_${problemId}`;
  let extension;

  switch (language) {
    case 'java':
      extension = 'java';
      break;
    case 'javascript':
      extension = 'js';
      break;
    default:
      return { status: 'error', output: null, error: `Unsupported language: ${language}` };
  }

  const filePath = path.join(TEMP_DIR, `${baseName}.${extension}`);
  const command = EXECUTION_COMMANDS[language](baseName);

  const execOptions = {
    cwd: TEMP_DIR, // run inside temp folder
    timeout: 5000, // 5 seconds
    maxBuffer: 1024 * 512, // 512KB
  };

  // List files to clean up
  const filesToClean = [filePath];
  if (language === 'java') {
    filesToClean.push(path.join(TEMP_DIR, `${baseName}.class`));
  }

  try {
    // 2. Write code to temporary file
    await fs.writeFile(filePath, code);

    // 3. Execute code
    const { stdout, stderr } = await executeCommand(command, execOptions);

    return {
      status: 'success',
      output: stdout.trim() || 'No output.',
      error: null,
    };
  } catch (e) {
    let errorMsg = e.error || e.toString();
    if (errorMsg.includes('Timeout')) {
      errorMsg = 'Execution failed: Time Limit Exceeded (5s)';
    }
    return { status: 'error', output: null, error: errorMsg };
  } finally {
    // 4. Clean up temporary files
    for (const file of filesToClean) {
      await fs.unlink(file).catch(() => {}); // ignore if file doesn't exist
    }
  }
}
