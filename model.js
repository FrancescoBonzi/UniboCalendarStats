const fetch = require('node-fetch')
const sqlite3 = require('sqlite3');
const parse = require('csv-parse')
const os = require('os');
const fs = require('fs');
const { exit } = require('process');

const root_url = 'http://unibocalendar.duckdns.org/'
const db_file = 'data.db'

let db = null;

async function downloadData() {
  let db_url = root_url + db_file;
  let db_filename = os.tmpdir() + new Date().getTime().toString() + "_unibocal.db";
  let db_data = await fetch(db_url).then(x => x.buffer());
  fs.writeFileSync(db_filename, db_data);
  db = new sqlite3.Database(db_filename);

  console.log('Data Downloaded at ' + new Date())
}

async function getData(window) {

  // Check if dataframe are populated, else download data from website
  /*
  I do not do this anymore, cause I don't think it's needed*/
  if (db === null) {
    console.error("Error in downloading data.");
    exit();
  }

  // Call functions for client
  await getActiveUsers(window, new Date())
  await getStatsDayByDay(window)
  await getNumUsersForCourses(window)
  await getTotalEnrollments(window)

}

async function runQuery(q, p) {
  return new Promise((res, rej) => {
    db.all(q, p, function (e, r) {
      if (e !== null) {
        rej(e);
      } else {
        res(r);
      }
    })
  })
}

async function getStatsDayByDay(window) {
  let data = []
  data.push(await getRequestsDayByDay())
  data.push(await getNumEnrollmentsDayByDay())
  data.push(await getActiveUsersDayByDay())

  window.webContents.send("fromMain", "statsDayByDay", data)
}

async function getRequestsDayByDay() {
  let query = "SELECT COUNT(*) AS n, (date/86400000) AS day, date FROM hits GROUP BY day ORDER BY day;";
  let db_result = await runQuery(query, []);
  let result = [];
  for (const i of db_result) {
    result.push({ x: new Date(i.date), y: i.n });
  }

  return JSON.stringify(result);
}

async function getNumEnrollmentsDayByDay() {
  //86_400_000 = a day
  let query = "SELECT COUNT(*) AS n, (date/86400000) AS day, date FROM enrollments GROUP BY day ORDER BY day;";
  let db_result = await runQuery(query, []);
  let result = [];
  for (const i of db_result) {
    if (result.length == 0) {
      result.push({ x: new Date(i.date), y: i.n });
    } else {
      result.push({ x: new Date(i.date), y: i.n + result[result.length - 1].y });
    }
  }

  return JSON.stringify(result)
}

async function getActiveUsersDayByDay() {
  let query = "SELECT date, count(*) AS n FROM (SELECT date, enrollment_id, date/86400000 as d FROM hits where length(enrollment_id) = 36 group by d, enrollment_id) GROUP BY d;";
  let db_result = await runQuery(query, []);
  let result = []
  for (const i of db_result) {
    result.push({ x: new Date(i.date), y: i.n });
  }
  return result
}

function sameDay(d1, d2) {
  return false;
  //return d1.getFullYear() === d2.getFullYear() &&
  //  d1.getMonth() === d2.getMonth() &&
  //  d1.getDate() === d2.getDate();
}

async function getActiveUsers(window, date) {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  date = (date.getTime() / 86400000).toFixed(0).toString();
  console.error(date);
  let query = "SELECT COUNT(*) as users FROM (SELECT DISTINCT enrollment_id FROM hits WHERE date/86400000 = " + date + ");";
  let results = await runQuery(query, []);
  let count = results[0].users;

  window.webContents.send("fromMain", "activeUsers", count)
}

async function getNumUsersForCourses(window) {
  let query = "SELECT course AS x, COUNT(*) as y FROM enrollments GROUP BY course ORDER BY y DESC LIMIT 10;";
  let results = await runQuery(query, []);
  let data = { x: [], y: [] };
  for (const row of results) {
    data.x.push(row.x);
    data.y.push(row.y);
  }
  window.webContents.send("fromMain", "numUsersForCourses", JSON.stringify(data))
}

function getNumRequestsForUsers(window) {
  let query = "SELECT COUNT(*) as requests FROM hits GROUP BY enrollment_id;";
  // TO-DO!
}

async function getTotalEnrollments(window) {
  let query = "SELECT COUNT(*) as users FROM enrollments;";
  let result = await runQuery(query, []);
  let count = result[0].users;

  window.webContents.send("fromMain", "totalEnrollments", count)
}

/*
This is an example you can use to learn how to call queries
*/
async function getUAStats(window) {
  let query = "SELECT user_agent, COUNT(*) as users FROM hits GROUP BY user_agent;";
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "userAgents", results);
}

async function getUAAvgRequests(window) {
  let query = "SELECT ua, AVG(rpd) AS reqs FROM (SELECT ua, enrollment_id, SUM(requests) / COUNT(*) as rpd FROM (SELECT user_agent AS ua, enrollment_id, date/86400000 as day, COUNT(*) AS requests FROM hits  GROUP BY user_agent, enrollment_id, day) GROUP BY ua, enrollment_id) GROUP BY ua;";
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "userAgentAvgReqs", results);
}

async function getTodayEnrollments(window) {
  let today = (new Date().getTime() / 86400000).toFixed(0).toString();
  let query = "SELECT * FROM enrollments WHERE date / 86400000 = " + today;
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "todayEnrollments", results);
}

async function getEnrollmentsOrderedByLastHit(window) {
  let today = (new Date().getTime() / 86400000).toFixed(0).toString();
  let query = "SELECT enrollment_id, MAX(date) as last_hit FROM hits GROUP BY enrollment_id ORDER BY last_hit DESC";
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "enrollmentsByLastHit", results);
}

async function getEnrollmentDetails(window, enrollment_id) {
  let query = "SELECT * FROM enrollments WHERE id = ?";
  let results = await runQuery(query, [enrollment_id]);

  window.webContents.send("fromMain", "enrollmentDetails", results);
}

module.exports.downloadData = downloadData
module.exports.getData = getData