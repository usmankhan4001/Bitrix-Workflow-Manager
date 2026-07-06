import getMoreLeadData from "../Bitrix24Helper/getMoreLeadData.js";
import { SALES_TEAM } from "../Constants/SalesTeam.js";
import createTask from "../Bitrix24Helper/createTaskForSalesPerson.js";
import { getAndIncrementIndex } from "../Bitrix24Helper/handleSalesIndex.js";
import updateResponsiblePerson from "../Bitrix24Helper/updateResponsiblePerson.js";
import { setResponsible } from "../Bitrix24Helper/handleOldValueOfResponsiblePerson.js";
import checkIfLeadIsWithinSpecifiedTimeRange from "../Helpers/checkIfLeadIsWithinSpecifiedTimeRange.js";
import storeLateLeadInDatabase from "../DatabaseHelpers/storeTheLateLeadsInDatabase.js";
import cron from "node-cron";

export default async function leadAddController(req, res) {
  console.log("LeadAddController called with the following data:", req.body);

  const leadId = String(req.body.data.FIELDS.ID);

  // Fetch additional lead data
  const additionalLeadData = await getMoreLeadData(leadId);
  console.log("Additional lead data:", additionalLeadData);

  // get the created time of the lead:
  const leadCreatedTime = additionalLeadData?.DATE_CREATE;

  // call to check within the specified time range:
  if (checkIfLeadIsWithinSpecifiedTimeRange(leadCreatedTime)) {
    console.log("checking for debug");
    console.log("additionalLeadData.SOURCE_ID:", additionalLeadData.SOURCE_ID);
    if (additionalLeadData.SOURCE_ID == "UC_NNO79X") {
      return res
        .status(200)
        .send({ message: "Lead from excluded source. No action taken." });
    }
    console.log("checking for debug 01");

    
    // Todo: sales department removed the tally sales
    if (
      false
    ) {
      console.log(" in this if ");
      const salesIndexToAssign = await getAndIncrementIndex("Telly Sales");
      await updateResponsiblePerson(
        leadId,
        SALES_TEAM["Telly Sales"][salesIndexToAssign]
      );
      await createTask(leadId, SALES_TEAM["Telly Sales"][salesIndexToAssign]);
      // set the value to add into the responsible id storage:
      await setResponsible(
        leadId,
        SALES_TEAM["Sales Executives"][salesIndexToAssign]
      );
    } else {
      console.log("Assigning lead in else");
      const salesIndexToAssign = await getAndIncrementIndex("Sales Executives");
      await updateResponsiblePerson(
        leadId,
        SALES_TEAM["Sales Executives"][salesIndexToAssign]
      );
      await createTask(
        leadId,
        SALES_TEAM["Sales Executives"][salesIndexToAssign]
      );
      // set the value to add into the responsible id storage:
      await setResponsible(
        leadId,
        SALES_TEAM["Sales Executives"][salesIndexToAssign]
      );
    }
  } else {
    storeLateLeadInDatabase({ leadId: leadId });
  }

  // CRITICAL: Send a 200 OK response immediately so Bitrix24 doesn't retry.
  res.status(200).send({ message: "Lead received and processing started." });
}
