export const SALES_TEAM = {
    "Sales Executives": [25,503,705,421],
    "Telly Sales": []
}

export default function getDepartmentByUserId(userId) {
  const strId = String(userId);
  for (const [department, ids] of Object.entries(SALES_TEAM)) {
    if (ids.map(String).includes(strId)) {
      return department;
    }
  }
  return null; // not found
}





