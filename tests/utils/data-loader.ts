import fs from 'fs';
import path from 'path';

export const loadData = () => {
  const dataPath = path.join(process.cwd(), 'data.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  // Remove single-line comments that appear at the start of the line (e.g. commented out blocks)
  // This avoids stripping URLs like https://...
  const jsonWithoutComments = rawData
    .replace(/^\s*\/\/.*$/gm, '') 
    .replace(/\/\*[\s\S]*?\*\//g, '');
    
  return JSON.parse(jsonWithoutComments);
};
