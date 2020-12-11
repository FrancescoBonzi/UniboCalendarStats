const {
  app,
  BrowserWindow,
  ipcMain
} = require("electron");

const path = require("path");
const model = require('./model.js')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let window;

async function createWindow() {

  // Create the browser window.
  window = new BrowserWindow({
    width: 1100,
    height: 720,
    // Don't show the window until it ready, this prevents any white flickering
    show: false,
    resizable: true,
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      preload: path.join(__dirname, "preload.js") // use a preload script
    }
  });

  // Load app
  window.loadFile(path.join(__dirname, "index.html"));
  window.once('ready-to-show', () => {
    window.show()
  })

  // rest of code..
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

  // Download data in advance to avoid delay when the app starts
  model.downloadData()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.

    // Download data in advance to avoid delay when the app starts
    model.downloadData()

    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on("toMain", (event, args) => {
  switch(args) {
    case "getData": model.getData(window); break;
    default: console.log("Not supported function!")
  }
});