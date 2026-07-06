import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = '/mnt/Bitrix24Workflow/data/leadResponsible.json';

/**
 * Load storage from disk asynchronously.
 */
async function loadStorage() {
    try {
        const data = await fs.readFile(STORAGE_PATH, 'utf8');
        
        // FIX: If the file exists but is empty, return {} instead of crashing
        if (!data || data.trim() === "") {
            return {};
        }

        return JSON.parse(data);
    } catch (err) {
        // file doesn't exist
        if (err.code === 'ENOENT') return {}; 
        
        // FIX: If JSON is corrupted/invalid, log it and return {} to allow the app to continue
        console.error('Error parsing storage JSON:', err.message);
        return {};
    }
}

/**
 * Save storage to disk asynchronously.
 */
async function saveStorage(storage) {
    const tempPath = `${STORAGE_PATH}.tmp`;
    try {
        const content = JSON.stringify(storage, null, 2);
        
        // FIX: Write to a temp file first, then rename. 
        // This prevents the "Unexpected end of JSON" error if the process 
        // is interrupted during writing.
        await fs.writeFile(tempPath, content, 'utf8');
        await fs.rename(tempPath, STORAGE_PATH);
    } catch (err) {
        console.error('Error saving storage:', err);
        try { await fs.unlink(tempPath); } catch (e) {} // Clean up temp file on failure
    }
}

/**
 * Set or update the responsibleId for a given leadId.
 */
export async function setResponsible(leadId, responsibleId) {
    const storage = await loadStorage();
    storage[leadId] = responsibleId;
    await saveStorage(storage);
    console.log(`Set lead ${leadId} → responsible ${responsibleId}`);
}

/**
 * Get the responsibleId for a given leadId.
 * Returns null if not found.
 */
export async function getResponsible(leadId) {
    const storage = await loadStorage();
    return storage[leadId] || null;
}