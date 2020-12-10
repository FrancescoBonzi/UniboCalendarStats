
let interval

// Called when message received from main process
window.api.receive("fromMain", (functionName, data) => {
  document.getElementById('low-connection').style = "display: none;"
  clearInterval(interval)
  switch (functionName) {
    case "requestDayByDay": showRequestDayByDay(data); break;
    case "numUsersForCourses": showNumUsersForCourses(data); break;
    case "activeUsers": showActiveUsers(data); break;
    case "totalEnrollments": showTotalEnrollments(data); break;
    default: console.log("Not supported response!")
  }
})

let n = 0;
interval = setInterval(function () {
  let message = 'Scarico i dati';
  for (i = 0; i < n; i++) {
    message += '.';
  }
  document.getElementById('low-connection').innerHTML = message;
  n = (n + 1) % 4;
}, 500);

// Send a message to the main process
window.api.send("toMain", "getRequestsDayByDay")
window.api.send("toMain", "getNumUsersForCourses")
window.api.send("toMain", "getActiveUsers")
window.api.send("toMain", "getTotalEnrollments")

// Functions
function showRequestDayByDay(data) {
  data = JSON.parse(data)
  wrapped_data = {
    datasets: [
      {
        label: "Numero di richieste per giorno",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgb(255, 99, 132)",
        fill: false,
        data: data
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
  console.log(wrapped_data)
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

function showActiveUsers([partial, total]) {
  document.getElementById('active-users').innerHTML = "<h3>Di cui attivi oggi: " + partial + ". In totale attivi oggi: " + total + "</h3></br>"
}

function showTotalEnrollments(data) {
  document.getElementById("enrol-count").innerHTML = "<h2>Numero di url generati dal sito ufficiale: " + data + "</h2>"
}