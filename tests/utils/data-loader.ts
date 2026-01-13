import fs from 'fs';
import path from 'path';

type DataFile = {
  tests?: any[];
  testSets?: any[];
};

export const loadData = (dataPath: string): DataFile  => {
  if (typeof dataPath !== 'string') {
    throw new TypeError('The "path" argument must be of type string. Received ' + typeof dataPath);
  }else if (dataPath.trim() === '') {
    throw new Error('The "path" argument must not be an empty string');
  }else if (!path.isAbsolute(dataPath)) {
    throw new Error('The "path" argument must be an absolute path');
  }

  const resolvedPath = path.isAbsolute(dataPath)
    ? dataPath
    : path.join(__dirname, '..', '..', dataPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Data file not found at path: ${resolvedPath}`);
  }

  const rawData = fs.readFileSync(resolvedPath, 'utf-8');

  const jsonWithoutComments = rawData
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  let parsed: DataFile;
  try {
    parsed = JSON.parse(jsonWithoutComments);
  } catch (error) {
    throw new Error(`Failed to parse JSON data file: ${resolvedPath}`);
  }

  const tests = Array.isArray(parsed.tests) ? parsed.tests : [];
  const testSets = Array.isArray(parsed.testSets) ? parsed.testSets : [];

  return {
    ...parsed,
    tests,
    testSets
  };
};
