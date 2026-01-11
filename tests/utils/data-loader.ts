



import fs from 'fs';
import { loadConfig } from '../../config_helper';

export const loadData = (dataPath: string) => {

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonWithoutComments = rawData
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const parsed = JSON.parse(jsonWithoutComments);
  const cfg = loadConfig();
  const envUsername = process.env.JIRA_USERNAME;
  const envPassword = process.env.JIRA_PASSWORD;
  const credentials = {
    username: envUsername || '',
    password: envPassword || ''
  };
  return {
    ...parsed,
    jiraUrl: cfg.jira.baseUrl,
    projectKey: cfg.jira.projectKeyDefault,
    credentials
  };
};