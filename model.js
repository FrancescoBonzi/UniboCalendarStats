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

async function getRequestsDayByDay(window) {

  // Check if data frame are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  let df = df_ical.groupBy('date');
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('date', 'x')
  df = df.map(row => row.set('x',
    new Date(
      row.get('x').split('/')[2],
      row.get('x').split('/')[1] - 1,
      row.get('x').split('/')[0]))
  )
  let data = JSON.stringify(df.toCollection())
  window.webContents.send("fromMain", "requestDayByDay", data)
}

async function getActiveUsers(window) {

  // Check if data frame are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  let dfe = df_enrollments.filter(row => row.get('uuid').length == 36).unique('uuid')
  let today = df_ical.tail(1).select('date').toArray()[0]
  let count_total = df_ical.filter(row => row.get('date') == today).unique('uuid').count()
  let dfi = df_ical.filter(row => row.get('uuid').length == 36)
  dfi = dfi.filter(row => row.get('date') == today)
  let count_partial = dfi.join(dfe, 'uuid', 'left').unique('uuid').count()

  window.webContents.send("fromMain", "activeUsers", [count_partial, count_total])
}

async function getNumUsersForCourses(window) {

  // Check if data frame are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  let df = df_enrollments.filter(row => row.get('uuid').length == 36)
  df = df.groupBy('course');
  df = df.aggregate(group => group.count()).rename('aggregation', 'y')
  df = df.rename('course', 'x').sortBy('y', true).head(8)

  let data = JSON.stringify(df.toDict())
  window.webContents.send("fromMain", "numUsersForCourses", data)
}

async function getNumRequestsForUsers(window) {

  // Check if data frame are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  // TO-DO!
}

async function getTotalEnrollments(window) {

  // Check if data frame are populated, else download data from website
  while (df_ical === undefined || df_enrollments === undefined) {
    await downloadData()
  }

  let count = df_enrollments.filter(row => row.get('uuid').length == 36).count()
  window.webContents.send("fromMain", "totalEnrollments", count)
}

module.exports.downloadData = downloadData
module.exports.getRequestsDayByDay = getRequestsDayByDay
module.exports.getNumUsersForCourses = getNumUsersForCourses
module.exports.getActiveUsers = getActiveUsers
module.exports.getTotalEnrollments = getTotalEnrollments