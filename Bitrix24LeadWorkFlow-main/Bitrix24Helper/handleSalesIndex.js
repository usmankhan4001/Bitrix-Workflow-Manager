import fs from 'fs-extra';
import path from 'path';
import { SALES_TEAM } from '../Constants/SalesTeam.js';

const SALES_INDEX_FILE = path.join('/mnt/data', 'sales_indices.json');




/**
 * Load or initialize all indices.
 */
async function loadAllIndices() {
    // [1] Start of the function
    console.log('--- Starting loadAllIndices function ---');
    
    try {
        // [2] Check if the file exists
        console.log(`Checking if index file exists at: ${SALES_INDEX_FILE}`);
        if (await fs.pathExists(SALES_INDEX_FILE)) {
            // [3a] File exists, attempting to read it
            console.log('Index file found. Attempting to read and parse JSON...');
            const indices = await fs.readJson(SALES_INDEX_FILE);
            
            // [4a] Success
            console.log('Indices loaded successfully:', indices);
            return indices;
            
        } else {
            // [3b] File does not exist, creating default indices
            console.log('Index file NOT found. Creating default indices.');
            const defaultIndices = Object.fromEntries(Object.keys(SALES_TEAM).map(k => [k, 0]));
            console.log('Default indices created:', defaultIndices);
            
            // [4b] Writing default indices to file
            console.log(`Writing default indices to file: ${SALES_INDEX_FILE}`);
            await fs.outputJson(SALES_INDEX_FILE, defaultIndices, { spaces: 2 });
            
            // [5b] Success
            console.log('Default indices successfully written and returned.');
            return defaultIndices;
        }
    } catch (err) {
        // [6] Error handling block
        console.error('--- !!! CATCH BLOCK ACTIVATED !!! ---');
        console.error('Original Error:', err.message);
        console.log('Error encountered while loading indices. Resetting storage...');
        
        // [7] Creating default indices for reset
        const defaultIndices = Object.fromEntries(Object.keys(SALES_TEAM).map(k => [k, 0]));
        console.log('Default indices for reset:', defaultIndices);
        
        // [8] Overwriting file with default indices
        console.log(`Overwriting file with default indices: ${SALES_INDEX_FILE}`);
        await fs.outputJson(SALES_INDEX_FILE, defaultIndices, { spaces: 2 });
        
        // [9] Success
        console.log('Indices reset complete. Returning default indices.');
        return defaultIndices;
        
    } finally {
        // [10] End of the function
        console.log('--- loadAllIndices function finished ---');
    }
}

/**
 * Get the current index for a department,
 * then increment it (round-robin) and persist.
 */
export async function getAndIncrementIndex(department) {
  const indices = await loadAllIndices();
  const team = SALES_TEAM[department];

  if (!team) throw new Error(`Department '${department}' not found.`);
  if (team.length === 0) throw new Error(`No members in '${department}'.`);

  // Current index
  const currentIndex = indices[department] || 0;

  // Increment (wrap around)
  const nextIndex = (currentIndex + 1) % team.length;

  // Save updated index
  indices[department] = nextIndex;
  await fs.outputJson(SALES_INDEX_FILE, indices, { spaces: 2 });

  // Return the current one (the one you just used)
  return currentIndex;
}

