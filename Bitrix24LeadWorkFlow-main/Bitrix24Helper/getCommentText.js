import { b24 } from '../Bitrix24AuthUtils/Bitrix24AuthUtils.js';
import { getTheChatIdForTheTask } from './getTheChatIdForTheTask.js';

/**
 * Retrieves a specific message text by Task ID and Message ID.
 * Uses the helper to get the Chat ID, then fetches messages via IM API and filters client-side.
 * * @param {number|string} taskId - The ID of the task.
 * @param {number|string} messageId - The ID of the message to retrieve.
 * @returns {Promise<string | null>} - The message text or null if not found.
 */
export default async function getCommentText(taskId, messageId) {

    const client = b24.instance;
    // 1. Validate Input
    if (!taskId || !messageId) {
        console.error('getCommentText: Missing Task ID or Message ID.', { taskId, messageId });
        return null;
    }

    try {
        // 2. Get the Chat ID using your imported helper
        const chatId = await getTheChatIdForTheTask(taskId);

        if (!chatId) {
            console.warn(`getCommentText: Could not determine Chat ID for Task ${taskId}.`);
            return null;
        }

        // 3. Format the Dialog ID
        // For task chats, Bitrix requires the prefix 'chat' before the numeric ID.
        const dialogId = `chat${chatId}`;

        // 4. Call im.dialog.messages.get
        // We fetch the last 50 messages to increase the chance of finding the recent comment.
        const response = await client.callMethod('im.dialog.messages.get', {
            "DIALOG_ID": dialogId,
            "LIMIT": 50
        });

        // 5. Process Response & Filter Client-Side
        if (response._data.result && Array.isArray(response._data.result.messages)) {
            const messages = response._data.result.messages;

            // Find the specific message by ID (loose comparison == handles string/number mismatch)
            const targetMessage = messages.find(msg => msg.id == messageId);

            if (targetMessage) {
                console.log(`✅ Found Message ${messageId} in Task ${taskId}`);
                return targetMessage.text;
            } else {
                console.warn(`Message ${messageId} not found in the last 50 messages of ${dialogId}.`);
                return null;
            }
        } else {
            console.warn(`No messages returned for ${dialogId}.`);
            return null;
        }

    } catch (error) {
        console.error(`Error in getCommentText for Task ${taskId}, Message ${messageId}:`, error);
        return null;
    }
}