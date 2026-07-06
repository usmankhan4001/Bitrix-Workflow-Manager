import { getAllTheLateLeads } from "../DatabaseHelpers/getAllTheLateLeads.js";
// You likely need to import these helpers from wherever you defined them:
// import { getAndIncrementIndex, updateResponsiblePerson, createTask, setResponsible, getLeadDetails } from "./yourHelperFile.js"; 
// Make sure SALES_TEAM is imported or defined here
import  getMoreLeadData  from "../Bitrix24Helper/getMoreLeadData.js";
import createTask from "../Bitrix24Helper/createTaskForSalesPerson.js";
import { getAndIncrementIndex } from "../Bitrix24Helper/handleSalesIndex.js";
import updateResponsiblePerson from "../Bitrix24Helper/updateResponsiblePerson.js";
import { setResponsible } from "../Bitrix24Helper/handleOldValueOfResponsiblePerson.js";
import { SALES_TEAM } from "../Constants/SalesTeam.js";
import {moveLeadToAssigned} from "../DatabaseHelpers/removeTheLateLeadsFromDB.js";

export const assignLateLeads = async () => {
    console.log("🚀 Starting Late Lead Assignment...");

    // 1. Get all the late lead IDs from Mongo
    const lateLeadIds = await getAllTheLateLeads(); // Returns ["5503", "5504"...]

    if (!lateLeadIds || lateLeadIds.length === 0) {
        console.log("No late leads found.");
        return;
    }

    // 2. Loop through each lead ID
    for (const leadId of lateLeadIds) {
        try {
            console.log(`\n--- Processing Lead: ${leadId} ---`);

            // CRITICAL: We need to fetch the lead data from Bitrix to check the SOURCE_ID
            // I am assuming you have a helper for this. If not, you need to use method.crm.lead.get
            const additionalLeadData = await getMoreLeadData(leadId); 

            if (!additionalLeadData) {
                console.log(`Could not fetch details for lead ${leadId}, skipping.`);
                continue;
            }

            console.log("checking for debug");
            console.log("additionalLeadData.SOURCE_ID:", additionalLeadData.SOURCE_ID);

            // LOGIC FROM YOUR SNIPPET
            if (additionalLeadData.SOURCE_ID == "UC_NNO79X") {
                console.log("Lead from excluded source. No action taken.");
                continue; // Skip to the next lead in the loop
            }

            console.log("checking for debug 01");

            // TODO: You need to define the logic to determine which department to assign the telly sales
            // if the source is webform, then telly sales shall handle it:
            if (false) {
                console.log("In Telly Sales IF block");
                
                const salesIndexToAssign = await getAndIncrementIndex("Telly Sales");
                const responsibleId = SALES_TEAM['Telly Sales'][salesIndexToAssign];

                await updateResponsiblePerson(leadId, responsibleId);
                await createTask(leadId, responsibleId);
                
                // set the value to add into the responsible id storage:
                await setResponsible(leadId, responsibleId);

                // Call it directly here
                await moveLeadToAssigned(leadId)
            } 
            else {
                console.log("Assigning lead in ELSE block (Sales Executives)");
                
                const salesIndexToAssign = await getAndIncrementIndex("Sales Executives");
                const responsibleId = SALES_TEAM['Sales Executives'][salesIndexToAssign];

                await updateResponsiblePerson(leadId, responsibleId);
                await createTask(leadId, responsibleId);
                
                // set the value to add into the responsible id storage:
                await setResponsible(leadId, responsibleId);

                // Call it directly here
                await moveLeadToAssigned(leadId)
            }

        } catch (error) {
            console.error(` Error processing lead ${leadId}:`, error);
            // We continue the loop so one bad lead doesn't stop the others
        }
    }

    console.log("All late leads processed.");
};