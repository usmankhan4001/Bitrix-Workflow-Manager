import { getResponsible } from "../Bitrix24Helper/handleOldValueOfResponsiblePerson.js";
import getMoreLeadData from "../Bitrix24Helper/getMoreLeadData.js";
import getTaskIdOfTheWFManager from "../Bitrix24Helper/getTaskIdOfTheWFManager.js";
import completeTaskByTaskID from "../Bitrix24Helper/completeTaskByTaskID.js";
import createTaskForSalesPerson from "../Bitrix24Helper/createTaskForSalesPerson.js";   

const WORKFLOW_MANAGER = process.env.WORKFLOW_MANAGER || 1;

export default async function leadChangeController(req, res) {
  console.log("leadChangeController called with the following data:", req.body);

  const leadId = req.body.data.FIELDS.ID;

  const oldResponsibleId = await getResponsible(leadId);
  console.log(`Old responsible ID for lead ${leadId} is ${oldResponsibleId}`);

  // get the more lead data:
  const moreLeadData = await getMoreLeadData(leadId);

  const newResponsibleID = moreLeadData.ASSIGNED_BY_ID;
  const lastModifiedByID = moreLeadData.MODIFY_BY_ID;

  console.log("Checking condition parts:");
  console.log("oldResponsibleId:", oldResponsibleId);
  console.log("WORKFLOW_MANAGER:", WORKFLOW_MANAGER);
  console.log("lastModifiedByID:", lastModifiedByID);
  console.log("newResponsibleID:", newResponsibleID);

  if (oldResponsibleId && oldResponsibleId == WORKFLOW_MANAGER) {
    console.log(
      "Condition passed: oldResponsibleId exists and equals WORKFLOW_MANAGER"
    );
  } else {
    console.log("Condition failed: oldResponsibleId check");
  }

  if (lastModifiedByID && lastModifiedByID == WORKFLOW_MANAGER) {
    console.log(
      "Condition passed: lastModifiedByID exists and equals WORKFLOW_MANAGER"
    );
  } else {
    console.log("Condition failed: lastModifiedByID check");
  }

  if (oldResponsibleId != newResponsibleID) {
    console.log("Condition passed: oldResponsibleId != newResponsibleID");
  } else {
    console.log("Condition failed: oldResponsibleId == newResponsibleID");
  }

  if (
    oldResponsibleId &&
    oldResponsibleId == WORKFLOW_MANAGER &&
    lastModifiedByID == WORKFLOW_MANAGER &&
    lastModifiedByID &&
    oldResponsibleId != newResponsibleID
  ) {
    console.log(
      `Responsible person for lead ${leadId} changed from ${oldResponsibleId} to ${newResponsibleID} by user ${lastModifiedByID}`
    );

    // get the task of reassignment:
    const taskIds = await getTaskIdOfTheWFManager(leadId);

    console.log(`Fetching task id of the workflow manager: ${taskIds}`);

    // complete that task automatically:
    for (const taskId of taskIds) {
      await completeTaskByTaskID(taskId);
    }

    // create task for the new sales person:
    await createTaskForSalesPerson(leadId, newResponsibleID);
  }

 


  // now add the task for the new responsible person 

  res.status(200).send({ message: "Lead change received." });
}
