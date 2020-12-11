const fetch = require('node-fetch')
const DataFrame = require('dataframe-js').DataFrame;
const parse = require('csv-parse')

const root_url = 'http://unibocalendar.duckdns.org/'
const enrollments_file = 'enrollments.csv'
const ical_file = 'iCal.csv'

let df_enrollments = undefined
let df_ical = undefined

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
  let ical_url = root_url + ical_file
  let enrollments_url = root_url + enrollments_file

  // Download enrollments.csv
  df_enrollments = await fetch(enrollments_url).then(x => x.text())
    .then(function (text) {

      let data = castToArray(text)
      let df = new DataFrame(data, ['date', 'hour', 'uuid', 'type', 'course', 'year', 'curriculum'])
      //df.show()
      return df

    })
    .catch(function (err) {
      console.log(err);
      return undefined
    });

  // Download iCal.csv
  df_ical = await fetch(ical_url).then(x => x.text())
    .then(function (text) {

      let data = castToArray(text)
      let df = new DataFrame(data, ['date', 'hour', 'uuid'])
      //df.show()
      return df

    })
    .catch(function (err) {
      console.log(err);
      return undefined
    });

  console.log('Data Downloaded at ' + new Date())
}

async function getData(window) {

  // Check if dataframe are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  // Cast of Date format
  df_ical = df_ical.map(row => row.set('date',
    new Date(
      row.get('date').split('/')[2],
      row.get('date').split('/')[1] - 1,
      row.get('date').split('/')[0]))
  )

  df_enrollments = df_enrollments.map(row => row.set('date',
    new Date(
      row.get('date').split('/')[2],
      row.get('date').split('/')[1] - 1,
      row.get('date').split('/')[0]))
  )

  // Call functions for client
  getActiveUsers(window, new Date())
  getStatsDayByDay(window)
  getNumUsersForCourses(window)
  getTotalEnrollments(window)

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
  for(let i=1;i<enrollments.length;i++) {
    result[i] = {x:enrollments[i].x, y:enrollments[i].y+result[i-1].y}
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
  while(!sameDay(date, end_day)) {
    let df = dfi.filter(row => sameDay(new Date(row.get('date')), date))
    result.push({x:date, y:df.join(dfe, 'uuid', 'left').unique('uuid').count()})
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
  let dfe = df_enrollments.filter(row => row.get('uuid').length == 36).unique('uuid')
  let dfi = df_ical.filter(row => row.get('uuid').length == 36)
  dfi = dfi.filter(row => sameDay(new Date(row.get('date')), date))
  let count = dfi.join(dfe, 'uuid', 'left').unique('uuid').count()

  window.webContents.send("fromMain", "activeUsers", count)
}

function getNumUsersForCourses(window) {
  let df = df_enrollments.filter(row => row.get('uuid').length == 36)
  df = df.groupBy('course');
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('course', 'x').sortBy('y', true).head(8)

  let data = JSON.stringify(df.toDict())
  window.webContents.send("fromMain", "numUsersForCourses", data)
}

function getNumRequestsForUsers(window) {
  // TO-DO!
}

function getTotalEnrollments(window) {
  let count = df_enrollments.filter(row => row.get('uuid').length == 36).count()

  window.webContents.send("fromMain", "totalEnrollments", count)
}

module.exports.downloadData = downloadData
module.exports.getData = getData