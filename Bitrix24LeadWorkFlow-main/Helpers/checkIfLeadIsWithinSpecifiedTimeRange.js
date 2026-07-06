

function timeStringToDate(timeStr, baseDate = new Date()) {
  let hours, minutes = 0;

  if (timeStr.includes(':')) {
    [hours, minutes] = timeStr.split(':').map(Number);
  } else {
    hours = Number(timeStr); // "10" → 10
  }

  if (Number.isNaN(hours) || hours < 0 || hours > 23) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function checkIfLeadIsWithinSpecifiedTimeRange(leadTimestamp) {
    const startTime = process.env.WORKFLOW_START_TIME
    const endTime = process.env.WORKFLOW_END_TIME
    const notAllowedDays = (process.env.NOT_ALLOWED_DAYS || "").split(',').map(Number)

    // not ime was specified in the env variables:
    if(!startTime || !endTime) {
        return;
    }

    const startTimeDate = timeStringToDate(startTime);
    const endTimeDate = timeStringToDate(endTime);

    var leadCreatedTimeStamp = new Date(leadTimestamp);

    const leadCreatedDay = leadCreatedTimeStamp.getDay();

    leadCreatedTimeStamp.setHours(leadCreatedTimeStamp.getHours()+5);


    console.log("startTimeDate:", startTimeDate);
    console.log("endTimeDate:", endTimeDate);
    console.log("leadCreatedTimeStamp:", leadCreatedTimeStamp);


    if(leadCreatedTimeStamp >= startTimeDate && leadCreatedTimeStamp <= endTimeDate && !notAllowedDays.includes(leadCreatedDay)) {
        console.log(`Lead created at ${leadCreatedTimeStamp} is WITHIN the specified time range of ${startTime} - ${endTime}.`);
        return true;
    }

    return false;

}