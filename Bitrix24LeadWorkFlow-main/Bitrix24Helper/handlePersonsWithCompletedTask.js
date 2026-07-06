import fs from 'fs-extra';
import path from 'path';

// Updated file name
const SALES_INDEX_FILE = path.join('/mnt/data', 'SalesPersonWithCompletedTask.json');

const SALES_TEAM = {
  "Sales Executives": [25, 27, 29],
  "Telly Sales": [113, 115, 167, 203]
};

/**
 * Load or initialize the array for each department
 */
async function loadCompletedUsers() {
  if (await fs.pathExists(SALES_INDEX_FILE)) {
    return await fs.readJson(SALES_INDEX_FILE);
  } else {
    const defaultData = Object.fromEntries(
      Object.keys(SALES_TEAM).map(dept => [dept, []])
    );
    await fs.outputJson(SALES_INDEX_FILE, defaultData, { spaces: 2 });
    return defaultData;
  }
}

/**
 * Add a value to the array
 */
export async function addUserToCompleted(department, value) {
  const data = await loadCompletedUsers();
  if (!data[department]) data[department] = [];
  data[department].push(value);
  await fs.outputJson(SALES_INDEX_FILE, data, { spaces: 2 });
}

/**
 * Get the first element of the array
 */
export async function getFirstCompletedUser(department) {
  const data = await loadCompletedUsers();
  if (!data[department] || data[department].length === 0) return null;
  return data[department][0];
}

/**
 * Remove a value from the array
 */
export async function removeUserFromCompleted(department, value) {
  const data = await loadCompletedUsers();
  if (!data[department]) return; // nothing to remove

  // Filter out the value
  data[department] = data[department].filter(v => v !== value);
  await fs.outputJson(SALES_INDEX_FILE, data, { spaces: 2 });
}
