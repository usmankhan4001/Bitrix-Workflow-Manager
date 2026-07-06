import getCommentText from "../Bitrix24Helper/getCommentText.js";
import getDepartmentByUserId from "../Constants/SalesTeam.js";
import {addUserToCompleted, getFirstCompletedUser} from "../Bitrix24Helper/handlePersonsWithCompletedTask.js"; // Note: Added getFirstCompletedUser for the overdue logic
import createTask from "../Bitrix24Helper/createTaskForSalesPerson.js";
import getTaskInfo from "../Bitrix24Helper/getTaskInfo.js";
import getTaskCountForLead from "../Bitrix24Helper/getTaskCountForLead.js";
import updateResponsiblePerson from "../Bitrix24Helper/updateResponsiblePerson.js";
import createTaskForWorkflowManager from "../Bitrix24Helper/createTaskForWorkflowManager.js";
import { setResponsible } from "../Bitrix24Helper/handleOldValueOfResponsiblePerson.js";
import changeTheStageOfLead from "../Bitrix24Helper/changeTheStageOfLead.js";
// import {getTaskCountForLeadForResponsiblePerson} from '../Bitrix24Helper/getTaskCountOfLeadForResponsiblePerson.js';


export default async function TaskCommentAddController(req, res) {
    console.log("--- TaskCommentAddController Initiated ---");
    // Log the entire request body to understand the webhook payload
    // console.log("TaskCommentAddController called with the following data:", req.body); 

    const WorkflowManager = process.env.WORKFLOW_MANAGER || 1; // Default to "Hammad" if not set

    const { ID, TASK_ID, MESSAGE_ID } = req.body.data.FIELDS_AFTER;
    console.log(`Webhook received for Task ID: ${TASK_ID}, Comment ID: ${ID}, Message ID: ${MESSAGE_ID}`);

    try {
        // Log the start of async operations
        console.log(`Fetching task info for TASK_ID: ${TASK_ID}`);
        
        // get the task id info:
        const taskRelatedInfo = await getTaskInfo(TASK_ID);

        // Safely access task details and log them
        const taskDetails = taskRelatedInfo?._data?.result?.tasks[0];
        if (!taskDetails) {
            console.error(`ERROR: Could not retrieve task details for TASK_ID: ${TASK_ID}`);
            return res.status(500).send({ message: "Could not retrieve task details." });
        }

        console.log("Retrieved Task Details:", taskRelatedInfo?._data?.result?.tasks[0]);
        
        // get the deadline of the task:
        const taskDeadline = taskDetails.deadline;
        console.log(`Task Deadline: ${taskDeadline}`);

        // get the responsible ID of the task:
        const responsibleId = taskDetails.responsibleId;
        console.log(`Task Responsible ID: ${responsibleId}`);

        // get the title of the task:
        const tasktitle = taskDetails.title;

        // get the related department of the responsible id
        const department = getDepartmentByUserId(responsibleId);
        console.log(`Responsible User's Department (for assignment index management): ${department}`); // **Personalization: Log department, linking to saved round-robin index logic**

        const relatedEntity = taskDetails.ufCrmTask;


        // get the text of the comment to determine what to do:
        console.log(`Fetching comment text for Comment ID: ${ID}`);
        const commentText = await getCommentText(TASK_ID, MESSAGE_ID);
        console.log("Retrieved comment text:", commentText);


        // prevnts the logic against task not created on the lead
        if(!relatedEntity){
            console.log(`No action needed for NON-CRM related task ${TASK_ID}. Exiting.`);
            return res.status(200).send({ message: "No action needed for NON-CRM related tasks." });
        }

        console.log(`Task ${TASK_ID} is CRM-related. Entity: ${relatedEntity}`);


        // this means that the task is finished/closed
        if(commentText.includes('completed the task') && tasktitle.includes("Follow up on Lead")) {
            console.log(`Comment indicates task ${TASK_ID} is closed. Adding user ${responsibleId} to completed list for department: ${department}`);
            await addUserToCompleted(department, responsibleId);
            console.log(`User ${responsibleId} added to completed list.`);

            // change the stage of the lead 
            await changeTheStageOfLead(String(relatedEntity).split('_')[1], 'IN_PROCESS');

        }
        else if(commentText.includes("task is overdue")){
            console.warn(`Comment indicates task ${TASK_ID} is overdue. Initiating reassignment.`);
            
            // getting the lead id to determine if a lead has already more than two tasks:
            const taskCountForLead = await getTaskCountForLead(String(relatedEntity).split('_')[1]);
            // Assuming getFirstCompletedUser is implemented to support the round-robin logic
            const userWithCompletedTask = await getFirstCompletedUser(department);



            if (userWithCompletedTask && taskCountForLead < 2) {
                console.log(`Found next available user for assignment in ${department}: ${userWithCompletedTask}.`);
                const crmEntityId = String(relatedEntity).split('_')[1];
                
                await updateResponsiblePerson(crmEntityId, userWithCompletedTask);
                console.log(`Successfully updated lead ${crmEntityId} responsible person to ${userWithCompletedTask}.`);
                // create task for the new user
                console.log(`Creating new task for CRM Entity ${crmEntityId} assigned to user ${userWithCompletedTask}.`);
                await createTask(crmEntityId, userWithCompletedTask);
                console.log(`New task successfully created and assigned.`);

                await setResponsible(crmEntityId, userWithCompletedTask);
            } else {

                // const taskCountForLeadForManager = await getTaskCountForLeadForResponsiblePerson(String(relatedEntity).split('_')[1], WorkflowManager);

                const crmEntityId = String(relatedEntity).split('_')[1];
                
                // if we could not find any user to assign the task to we assign the lead to the manager:
                updateResponsiblePerson(crmEntityId,WorkflowManager);

                createTaskForWorkflowManager(crmEntityId, WorkflowManager);

                console.log(`No available users in ${department} for reassignment or lead has 2+ tasks. Lead ${crmEntityId} reassigned to Workflow Manager ${WorkflowManager} for manual handling.`);

                await setResponsible(crmEntityId, WorkflowManager);
                // console.error(`CRITICAL: Could not find a completed user in department ${department} for reassignment. No new task created.`);
            }


        }
        else {
            console.log(`Comment text "${commentText}" is not 'Task closed.' or 'task is overdue'. No further action taken.`);
        }

    } catch (error) {
        console.error(`FATAL ERROR in TaskCommentAddController for TASK_ID ${TASK_ID}:`, error.message, error.stack);
        // Ensure a 200 response is still sent to prevent retries, even on failure, 
        // as the error is an internal server issue, not a bad request.
        return res.status(200).send({ message: "Task comment received, but processing failed." });
    }


    // CRITICAL: Send a 200 OK response immediately so Bitrix24 doesn't retry.
    console.log(`--- TaskCommentAddController Finished for TASK_ID ${TASK_ID}. Sending 200 OK. ---`);
    res.status(200).send({ message: "Task comment received." });
}