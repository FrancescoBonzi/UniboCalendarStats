const fetch = require('node-fetch')
const sqlite3 = require('sqlite3');
const parse = require('csv-parse')
const os = require('os');
const fs = require('fs');

const root_url = 'http://unibocalendar.duckdns.org/'
const db_file = 'data.db'

let db = null;

function castToArray(text) {

  let output = []

  // Create the parser
  const parser = parse({
    delimiter: '\n'
  })

  parser.on('readable', function () {
    let record
    while (record = parser.read()) {
      output.push(record.toString().split(','))
    }
  })
  parser.on('error', function (err) {
    console.error(err.message)
  })
  parser.on('end', function () {
    //console.log('EOF reached')
  })

  // Write data to the stream
  parser.write(text)
  // Close the readable stream
  parser.end()

  return output
}

async function downloadData() {
  let db_url = root_url + db_file;
  let db_filename = os.tmpdir() + new Date().getTime().toString() + "_unibocal.db";
  let db_data = await fetch(db_url).buffer();
  fs.writeFileSync(db_filename, db_data);
  db = new sqlite3.Database(db_filename);

  console.log('Data Downloaded at ' + new Date())
}

async function getData(window) {

  // Check if dataframe are populated, else download data from website
  /*
  I do not do this anymore, cause I don't think it's needed
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }*/

  // Call functions for client
  getActiveUsers(window, new Date())
  getStatsDayByDay(window)
  getNumUsersForCourses(window)
  getTotalEnrollments(window)

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

function getStatsDayByDay(window) {
  let data = []
  data.push(getRequestsDayByDay())
  data.push(getNumEnrollmentsDayByDay())
  data.push(getActiveUsersDayByDay())

  window.webContents.send("fromMain", "statsDayByDay", data)
}

function getRequestsDayByDay() {
  let df = df_ical.groupBy('date');
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('date', 'x')

  return JSON.stringify(df.toCollection())
}

function getNumEnrollmentsDayByDay() {
  // Select only the enrollments from the official website
  let df = df_enrollments.filter(row => row.get('uuid').length == 36)
  df = df.groupBy('date');
  // I suppose that each line contains a different uuid
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('date', 'x')
  let enrollments = df.toCollection()
  let result = [enrollments[0]]
  for (let i = 1; i < enrollments.length; i++) {
    result[i] = { x: enrollments[i].x, y: enrollments[i].y + result[i - 1].y }
  }

  return JSON.stringify(result)
}

function getActiveUsersDayByDay() {
  let result = []
  let dfe = df_enrollments.filter(row => row.get('uuid').length == 36).unique('uuid')
  let dfi = df_ical.filter(row => row.get('uuid').length == 36)
  let start_day = new Date(dfi.getRow(0).get('date'))
  let end_day = new Date()
  let date = start_day
  while (!sameDay(date, end_day)) {
    let df = dfi.filter(row => sameDay(new Date(row.get('date')), date))
    result.push({ x: date, y: df.join(dfe, 'uuid', 'left').unique('uuid').count() })
    date = new Date(date.setDate(date.getDate() + 1))
  }
  return result
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getActiveUsers(window, date) {
  let query = "SELECT COUNT(*) as users FROM hits WHERE date = ? GROUP BY enrollment_id;";
  let dfe = df_enrollments.filter(row => row.get('uuid').length == 36).unique('uuid')
  let dfi = df_ical.filter(row => row.get('uuid').length == 36)
  dfi = dfi.filter(row => sameDay(new Date(row.get('date')), date))
  let count = dfi.join(dfe, 'uuid', 'left').unique('uuid').count()

  window.webContents.send("fromMain", "activeUsers", count)
}

function getNumUsersForCourses(window) {
  let query = "SELECT COUNT(*) as users FROM enrollments GROUP BY course;";
  let df = df_enrollments.filter(row => row.get('uuid').length == 36)
  df = df.groupBy('course');
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('course', 'x').sortBy('y', true).head(8)

  let data = JSON.stringify(df.toDict())
  window.webContents.send("fromMain", "numUsersForCourses", data)
}

function getNumRequestsForUsers(window) {
  let query = "SELECT COUNT(*) as requests FROM hits GROUP BY enrollment_id;";
  // TO-DO!
}

function getTotalEnrollments(window) {
  let query = "SELECT COUNT(*) as users FROM enrollments;";
  let count = df_enrollments.filter(row => row.get('uuid').length == 36).count()

  window.webContents.send("fromMain", "totalEnrollments", count)
}

/*
This is an example you can use to learn how to call queries
*/
async function getUAStats(window) {
  let query = "SELECT user_agent, COUNT(*) as users FROM hits GROUP BY user_agent;";
  let results = await runQuery(query, []);

  window.webContents.send("fromMain", "totalEnrollments", results);
}

module.exports.downloadData = downloadData
module.exports.getData = getData