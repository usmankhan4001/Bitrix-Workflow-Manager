import { b24 } from '../Bitrix24AuthUtils/Bitrix24AuthUtils.js';

/**
 * Retrieves the Chat ID associated with a specific Bitrix24 Task.
 * @param {number|string} taskId - The ID of the task to search for.
 * @returns {Promise<number|null>} - Returns the Chat ID if found, or null if no chat exists.
 * @throws {Error} - Throws an error if the API call fails completely.
 */
export async function getTheChatIdForTheTask(taskId) {

    const client = b24.instance;

    // 1. Basic Validation
    if (!taskId) {
        throw new Error("getTheChatIdForTheTask: taskId parameter is required.");
    }

    try {
        console.log(`Fetching Chat ID for Task ${taskId}...`);

        // 2. Call the API
        // We MUST specify 'CHAT_ID' in 'select', otherwise Bitrix won't return it.
        const response = await client.callMethod('tasks.task.get', {
            taskId: taskId,
            select: ['ID', 'TITLE', 'CHAT_ID'] 
        });


        console.log("getTheChatIdForTheTask response:", response);
        // 3. Validate Response Structure
        // Bitrix API responses are nested in { result: { task: { ... } } }
        // if (!response || !response.result || !response.result.task) {
        //     console.warn(`Task ${taskId} not found or access denied.`);
        //     return null;
        // }

        const task = response._data.result.task;

        // 4. Extract the Chat ID
        // Note: The API usually returns the key as 'chatId' (camelCase) in the JSON object
        // but we check strictly to be safe.
        const chatId = task.chatId || task.CHAT_ID;

        if (chatId) {
            console.log(`✅ Found Chat ID: ${chatId} for Task ${taskId}`);
            return Number(chatId); // Ensure we return a number
        } else {
            console.log(`ℹ️ Task ${taskId} exists, but it has no associated Chat ID.`);
            return null;
        }

    } catch (error) {
        // 5. Error Handling
        console.error(`❌ Error in getTheChatIdForTheTask for Task ${taskId}:`, error);
        
        // Optional: specific handling for "Task not found" errors usually return code 400 or generic errors
        // You can decide to return null here or re-throw the error depending on your app logic.
        throw error; 
    }
}