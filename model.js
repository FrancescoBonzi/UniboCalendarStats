// Dynamic import for node-fetch v3 (ESM only)
let fetch;
const sqlite3 = require('sqlite3');
const os = require('os');
const fs = require('fs');
const { exit } = require('process');
require('dotenv').config();

const root_url = 'http://unibocalendar.duckdns.org/'
const db_file = 'data.db'

let db = null;

async function downloadData() {
  try {
    // Import node-fetch dynamically for ESM compatibility
    if (!fetch) {
      const { default: nodeFetch } = await import('node-fetch');
      fetch = nodeFetch;
    }
    
    if (!process.env.DB_TOKEN) {
      throw new Error('DB_TOKEN environment variable is not set. Please check your .env file.');
    }
    
    let db_url = root_url + db_file + '?token=' + process.env.DB_TOKEN;
    let db_filename = os.tmpdir() + '/' + new Date().getTime().toString() + "_unibocal.db";
    
    console.log('Downloading data from:', root_url + db_file);
    let db_data = await fetch(db_url).then(x => {
      if (!x.ok) {
        throw new Error(`HTTP ${x.status}: ${x.statusText}`);
      }
      return x.arrayBuffer();
    });
    
    fs.writeFileSync(db_filename, Buffer.from(db_data));
    db = new sqlite3.Database(db_filename);

    console.log('Data Downloaded at ' + new Date())
  } catch (error) {
    console.error('Failed to download data:', error.message);
    throw error; // Re-throw to be caught by the caller
  }
}

async function getSummary(window) {

  if (db === null) {
    console.error("Error in downloading data.");
    window.webContents.send("fromMain", "error", "Database not available. Please try downloading data again.");
    return;
  }

  try {
    // Call functions for client
    await getActiveEnrollments(window)
    await getActiveUsers(window, new Date())
    await getStatsDayByDay(window)
    await getNumUsersForCourses(window)
    await getTotalEnrollments(window)
  } catch (error) {
    console.error("Error in getSummary:", error.message);
    window.webContents.send("fromMain", "error", "Error loading data: " + error.message);
  }
}

async function getInfoAboutEnrollment(window, enrollment_id) {

  if (db === null) {
    console.error("Error in downloading data.");
    window.webContents.send("fromMain", "error", "Database not available. Please try downloading data again.");
    return;
  }

  try {
    // Call functions for client
    await getEnrollmentDetails(window, enrollment_id)
    await getEnrollmentDailyRequests(window, enrollment_id)
    await getEnrollmentUserAgents(window, enrollment_id)
    await getEnrollmentFirstRequestAfter4AM(window, enrollment_id)
    getEnrollmentCourses(window, enrollment_id)
  } catch (error) {
    console.error("Error in getInfoAboutEnrollment:", error.message);
    window.webContents.send("fromMain", "error", "Error loading enrollment data: " + error.message);
  }
}

async function runQuery(q, p) {
  return new Promise((res, rej) => {
    if (db === null) {
      rej(new Error('Database not initialized. Please download data first.'));
      return;
    }
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

async function getActiveUsers(window, date) {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  date = (date.getTime() / 86400000).toFixed(0).toString();
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

async function getNumRequestsForUsers(window) {
  let query = "SELECT COUNT(*) as requests FROM hits GROUP BY enrollment_id;";
  let result = await runQuery(query, []);
  let count = result[0].users;

  window.webContents.send("fromMain", "numRequestsForUsers", count);
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

async function getActiveEnrollments(window) {
  let query = "SELECT enrollment_id, enrollments.course AS course, counter FROM (SELECT enrollment_id, count(*) AS counter FROM hits GROUP BY enrollment_id) INNER JOIN enrollments ON enrollment_id=enrollments.id WHERE counter > 1 ORDER BY counter DESC;"
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "activeEnrollments", results);
}

async function getTodayEnrollments(window) {
  let today = (new Date().getTime() / 86400000).toFixed(0).toString();
  let query = "SELECT * FROM enrollments WHERE date / 86400000 = " + today;
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "todayEnrollments", results);
}

async function getEnrollmentsOrderedByLastHit(window) {
  let query = "SELECT enrollment_id, MAX(date) as last_hit FROM hits GROUP BY enrollment_id ORDER BY last_hit DESC";
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "enrollmentsByLastHit", results);
}

async function getEnrollmentDetails(window, enrollment_id) {
  let query = "SELECT * FROM enrollments WHERE id = ?";
  let results = await runQuery(query, [enrollment_id]);

  window.webContents.send("fromMain", "enrollmentDetails", results);
}

async function getEnrollmentDailyRequests(window, enrollment_id) {
  let query = "SELECT COUNT(*) AS n, (date/86400000) AS day, date FROM hits WHERE enrollment_id = ? GROUP BY day ORDER BY day;";
  let db_result = await runQuery(query, [enrollment_id]);
  let result = [];
  for (const i of db_result) {
    result.push({ x: new Date(i.date), y: i.n });
  }

  window.webContents.send("fromMain", "enrollmentDailyRequests", JSON.stringify(result));
}

async function getEnrollmentUserAgents(window, enrollment_id) {
  let query = "SELECT user_agent, COUNT(*) AS counter FROM hits WHERE enrollment_id = ? GROUP BY user_agent";
  let results = await runQuery(query, [enrollment_id]);

  window.webContents.send("fromMain", "enrollmentUAs", results);
}

async function runQueryLectures(q, p) {
  return new Promise((res, rej) => {
    lectures_db.all(q, p, function (e, r) {
      if (e !== null) {
        rej(e);
      } else {
        res(r);
      }
    })
  })
}

async function getEnrollmentCourses(window, enrollment_id) {
  let query = "SELECT DISTINCT lecture_id FROM requested_lectures WHERE enrollment_id = ?";
  let lecture_ids = await runQuery(query, [enrollment_id]);
  query = "SELECT * FROM enrollments WHERE id = ?";
  let enrol_info = await runQuery(query, [enrollment_id]);

  const language = {
    "magistralecu": "orario-lezioni",
    "magistrale": "orario-lezioni",
    "laurea": "orario-lezioni",
    "singlecycle": "timetable",
    "1cycle": "timetable",
    "2cycle": "timetable"
  }

  //https://corsi.unibo.it/2cycle/artificial-intelligence/timetable/@@orario_reale_json?anno=2&calendar_view=
  let url = ['https://corsi.unibo.it', enrol_info[0].type, enrol_info[0].course,
    language[enrol_info[0].type], '@@orario_reale_json'].join('/')
  url += '?anno=' + enrol_info[0].year;
  url += '&curricula=' + enrol_info[0].curriculum;
  // Adding only the selected lectures to the request
  lectures_list = []
  for (var l of lecture_ids) {
    url += '&insegnamenti=' + l.lecture_id;
    lectures_list.push(l.lecture_id)
  }
  url += '&calendar_view=';

  // Sending the request and parsing the response
  // Import node-fetch dynamically for ESM compatibility
  if (!fetch) {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
  }
  
  let lecture_codes = await fetch(url).then(x => x.text())
    .then(function (json) {
      try {
        json = JSON.parse(json);
      } catch {
        json = []
      }
      console.error(url)
      //console.log(json)
      let lecture_codes = []
      for (var l of json) {
        if (lectures_list.length == 0 || lectures_list.includes(l.extCode)) {
          lecture_codes.push(l.cod_modulo)
        }
      }
      lecture_codes = [...new Set(lecture_codes)]
      return lecture_codes
    })
    .catch(function (err) {
      console.log(err);
      callback("An error occurred while creating the calendar.");
    });

  //console.log(lecture_codes)

  lectures_db_filename = 'insegnamenti.sqlite'
  lectures_db = new sqlite3.Database(lectures_db_filename);

  query = "SELECT min(OGC_FID), * FROM insegnamentidettagli_2020_it WHERE url is not null and materia_codice in (";
  for(var l of lecture_codes) {
    query += '?, '
  }
  if(lecture_codes.length != 0) {
    query = query.substr(0, query.length-2)
  }
  query += ") "
  query += "group by materia_codice"
  let lectures_info = await runQueryLectures(query, lecture_codes);
  //console.log(lectures_info)

  window.webContents.send("fromMain", "enrollmentLectures", lectures_info);
}

async function getEnrollmentFirstRequestAfter4AM(window, enrollment_id) {
  let query = 'SELECT MIN(date) as d FROM hits WHERE enrollment_id = ? AND CAST(strftime("%H", datetime(date/1000, "unixepoch", "localtime")) AS INTEGER) >= 4  GROUP BY strftime("%Y-%m-%d", datetime(date/1000, "unixepoch", "localtime"));';
  let db_results = await runQuery(query, [enrollment_id]);
  let results = [];
  for (var i = 0; i < db_results.length; i++) {
    let new_date = new Date(db_results[i].d);
    let new_time = (new_date.getHours() * 3600 + new_date.getMinutes() * 60 + new_date.getSeconds()) / 3600;
    new_date.setHours(0);
    new_date.setMinutes(0);
    new_date.setSeconds(0);
    new_date.setMilliseconds(0);

    results.push({ x: new_date, y: new_time });
  }

  window.webContents.send("fromMain", "enrollmentFirstRequestAfter4AM", results);
}

module.exports.downloadData = downloadData
module.exports.getSummary = getSummary
module.exports.getInfoAboutEnrollment = getInfoAboutEnrollment