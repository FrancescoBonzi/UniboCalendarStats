function setLoadingMessage() {
  let message = 'Caricamento';
  for (i = 0; i < n; i++) {
    message += '.';
  }
  document.getElementById('loading-message').innerHTML = message;
  n = (n + 1) % 4;
}

let n = 0;
let interval = setInterval(setLoadingMessage, 500);

// Send a message to the main process
window.api.send("toMain", "getSummary")

// Called when message received from main process
window.api.receive("fromMain", (functionName, data) => {
  document.getElementById('loading-message').style = "display: none;"
  clearInterval(interval)
  switch (functionName) {
    // below for summary
    case "activeEnrollments": showActiveEnrollments(data); break;
    case "statsDayByDay": showStatsDayByDay(data); break;
    case "numUsersForCourses": showNumUsersForCourses(data); break;
    case "activeUsers": showActiveUsers(data); break;
    case "totalEnrollments": showTotalEnrollments(data); break;

    // below for single enrollment
    case "enrollmentDetails": showEnrollmentDetails(data); break;
    case "enrollmentDailyRequests": showEnrollmentDailyRequests(data); break;
    case "enrollmentUAs": showEnrollmentUserAgents(data); break;
    case "enrollmentLectures": showEnrollmentCourses(data); break;
    case "enrollmentFirstRequestAfter4AM": showEnrollmentFirstRequestAfter4AM(data); break;

    default: console.error("Unsupported response!")
  }
})

function getInfoAboutEnrollment(enrollment_id) {
  document.getElementById('summary').style = "display: none;"
  document.getElementById('loading-message').style = "display: block;"
  n = 0;
  interval = setInterval(setLoadingMessage, 500);
  window.api.send("toMain", ["getInfoAboutEnrollment", enrollment_id])
}

function showActiveEnrollments(data) {
  dropdown_tag = document.querySelector("[aria-labelledby='dropdownMenuButton']")
  for (const d of data) {
    const new_enrollment = "<a class='dropdown-item' href='#' onclick=getInfoAboutEnrollment('" + d.enrollment_id + "');>" + d.course + " - " + d.counter + "</a></br>";
    dropdown_tag.insertAdjacentHTML('beforeend', new_enrollment);
  }
}

// Functions
function showStatsDayByDay([requests, enrollments, active_users]) {
  requests = JSON.parse(requests);
  enrollments = JSON.parse(enrollments)
  wrapped_data = {
    datasets: [
      {
        label: "Numero di richieste per giorno",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgb(255, 99, 132)",
        fill: false,
        data: requests
      },
      {
        label: "Numero di iscritti",
        backgroundColor: "rgb(255, 159, 64, 0.5)",
        borderColor: "rgb(255, 159, 64)",
        fill: false,
        data: enrollments
      },
      {
        label: "Numero di iscritti attivi",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192)",
        fill: false,
        data: active_users
      }
    ]
  }

  new Chart(document.getElementById("day-by-day").getContext('2d'), {
    type: 'line',
    data: wrapped_data,
    options: {
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            unit: 'week'
          }
        }]
      }
    }
  })
}

function showNumUsersForCourses(data) {

  data = JSON.parse(data)

  let wrapped_data = {
    labels: data["x"],
    datasets: [
      {
        label: "Iscrizioni per Corso",
        data: data["y"],
        fill: false,
        backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"],
        borderColor: ["rgb(255, 99, 132)", "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)", "rgb(54, 162, 235)", "rgb(153, 102, 255)", "rgb(201, 203, 207)"],
        "borderWidth": 1
      }
    ]
  }

  new Chart(document.getElementById("enrol-per-courses").getContext('2d'), {
    type: 'horizontalBar',
    data: wrapped_data,
    options: {
      scales: {
        yAxes: [
          {
            position: 'right',
            ticks: {
              beginAtZero: true,
            },
            scaleLabel: {
              display: true,
            }
          }
        ]
      },
    }
  })
}

function showActiveUsers(count) {
  document.getElementById('active-users').innerHTML = "<p>Utenti attivi oggi: " + count + "</p>"
}

function showTotalEnrollments(data) {
  document.getElementById("enrol-count").innerHTML = "<p>Link generati: " + data + "</p>"
}


/*
  FOR SINGLE ENROLLMENT INFO
*/

function initializeChart(parent_id) {
  var div = document.getElementById(parent_id);
  div.innerHTML = ""
  var canvas = document.createElement('canvas');
  canvas.style.width = "100%"
  canvas.style.height = "300px"
  div.appendChild(canvas);
  return canvas
}

function showEnrollmentDetails(data) {
  document.getElementById('enrol-details').innerHTML = "<h2 style='margin-top: 0.5rem;'>" + data[0].type + " in " + data[0].course + ", " + data[0].year + "^ anno</h2></br><p>" + data[0].id + "</p>"
}

function showEnrollmentDailyRequests(data) {
  data = JSON.parse(data);
  wrapped_data = {
    datasets: [
      {
        label: "Richieste giornaliere",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgb(255, 99, 132)",
        fill: false,
        data: data
      }]
  }

  var canvas = initializeChart("enrol-daily-req")
  var context = canvas.getContext('2d');

  new Chart(context, {
    type: 'line',
    data: wrapped_data,
    options: {
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            unit: 'week'
          }
        }]
      }
    }
  })
}

function showEnrollmentUserAgents(data) {

  values = []
  labels = []
  for (const d of data) {
    values.push(d.counter)
    if (d.user_agent === null) {
      labels.push('Indefinito')
    } else {
      labels.push(d.user_agent)
    }
  }

  data = {
    datasets: [{
      data: values,
      backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(255, 159, 64, 0.2)", "rgba(255, 205, 86, 0.2)", "rgba(75, 192, 192, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(201, 203, 207, 0.2)"]
    }],
    labels: labels
  };

  var canvas = initializeChart("enrol-ua")
  var context = canvas.getContext('2d');

  new Chart(context, {
    type: 'pie',
    data: data,
    options: null
  });
}

function showEnrollmentCourses(data) {
  let html = ""
  for(var l of data) {
    html += "<li>" + l.materia_descrizione + " - " +  l.docente_nome + " <a href='" + l.url + "'>link</a></li></br>"
  }
  document.getElementById('lectures-list').innerHTML = html
}

function showEnrollmentFirstRequestAfter4AM(data) {
  wrapped_data = {
    datasets: [
      {
        label: "Orario di risveglio",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192)",
        fill: false,
        data: data
      }]
  }

  var canvas = initializeChart("enrol-wake-up")
  var context = canvas.getContext('2d');

  new Chart(context, {
    type: 'line',
    data: wrapped_data,
    options: {
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            unit: 'week'
          }
        }]
      }
    }
  })

}