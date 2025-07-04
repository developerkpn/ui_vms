const { faker } = require("@faker-js/faker");
const moment = require("moment");

function RejectLog() {
  const rejectLog = { data: [] };
  for (let i = 0; i < 10; i++) {
    rejectLog.data.push({
      id: faker.seed(),
      create_at: moment(faker.date.anytime()).format("DD-MM-YYYY HH:mm:ss"),
      remark: faker.lorem.sentences({ min: 2, max: 4 }),
    });
  }
  return rejectLog;
}

module.exports = RejectLog;
