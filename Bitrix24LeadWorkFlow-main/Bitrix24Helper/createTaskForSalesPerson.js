import { b24 } from '../Bitrix24AuthUtils/Bitrix24AuthUtils.js';
import moment from 'moment-timezone'; 


const DEADLINE_DURATION_STRING = process.env.LEAD_DEADLINE_DURATION || "1 hour"; 

export default async function createTask(leadId, userid) {
    const client = b24.instance;

    // console.log("deadline duration string:", DEADLINE_DURATION_STRING);

    //get the lead title using the lead id:
    const responseOfLeadGet =  await client.callMethod('crm.lead.get', {ID: leadId});

    const leadData = responseOfLeadGet._data.result;

    const leadTitle = leadData.TITLE;

    // get the user name using the user id: 
    const responseOfUserGet = await client.callMethod('user.get', {ID: userid});

    // console.log("User Get Response:", responseOfUserGet);

    const data = responseOfUserGet._data.result[0];

    const {NAME, LAST_NAME} = data;

    const title = `${NAME} ${LAST_NAME} Follow up on Lead ${leadTitle}`
    const taskDescription = 
            `Please reach out to the customer for the lead "${leadTitle}" ` +
            `and update the CRM.\n You have ${DEADLINE_DURATION_STRING} to make contact.\n`

    const [amount, unit] = DEADLINE_DURATION_STRING.split(' ');
   const deadlineTime = moment().utc().add(parseInt(amount), unit).add(3, 'hours').format("YYYY-MM-DDTHH:mm:ss")

    // console.log("Calculated deadline time:", deadlineTime);

    const taskData = {
        fields: {
            TITLE: title,
            DESCRIPTION: taskDescription,
            DEADLINE: deadlineTime,
            CREATED_BY: parseInt(userid),
            RESPONSIBLE_ID: parseInt(userid), 
            UF_CRM_TASK: [`L_${leadId}`], 
            ALLOW_CHANGE_DEADLINE: 'N', 
        }
    }

    const createTaskResponse = await client.callMethod('tasks.task.add', taskData);


}