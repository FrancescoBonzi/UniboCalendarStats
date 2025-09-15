# Unibo Calendar Stats

A desktop application built with Electron that provides statistical analysis and visualization of Unibo Calendar usage data. The app downloads data from a remote database and displays various charts and statistics about user enrollments, course popularity, and usage patterns.

## Features

- **Real-time Data Analysis**: Downloads and analyzes data from Unibo Calendar database
- **Interactive Charts**: Visualizes enrollment statistics, daily usage patterns, and course popularity
- **User Analytics**: Shows active users, enrollment details, and user behavior patterns
- **Cross-platform**: Works on macOS, Windows, and Linux

## Prerequisites

Before building and running this application, make sure you have the following installed:

- **Node.js** (version 18 or higher) - Required for modern Electron and security
- **npm** (version 8 or higher) - Comes with Node.js
- **Git** (for cloning the repository)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd UniboCalendarStats
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Fix security vulnerabilities** (optional but recommended):
   ```bash
   npm run audit-fix
   ```

## Running the Application

### Development Mode

To run the app in development mode:

```bash
npm start
```

This will start the Electron application using `electron-forge start`.

### Building for Production

#### For macOS (Intel and Apple Silicon)

To build a macOS application:

```bash
npm run make
```

This will create a DMG file in the `out/make/` directory that works on both Intel and Apple Silicon Macs.

#### For macOS (Intel only - Legacy)

If you specifically need an Intel-only build:

```bash
npm run build
```

This will create the app in the `out/` directory using `electron-packager`.

#### For Other Platforms

The app is configured to build for multiple platforms:

- **Windows**: Creates a Squirrel installer
- **Linux**: Creates DEB and RPM packages
- **macOS**: Creates DMG and ZIP files

Run `npm run make` to build for all configured platforms.

## Project Structure

```
UniboCalendarStats/
├── app.js              # Main Electron process
├── index.html          # Main UI
├── style.css           # Application styles
├── window.js           # Renderer process logic
├── preload.js          # Preload script for secure communication
├── model.js            # Data processing and database operations
├── package.json        # Project configuration and dependencies
├── icon.icns           # Application icon
└── insegnamenti.sqlite # Local database for course information
```

## Key Dependencies

- **Electron**: Desktop application framework (v28+ for security)
- **sqlite3**: Database operations
- **node-fetch**: HTTP requests for data downloading (v3+ with ESM support)
- **Chart.js**: Data visualization
- **Bootstrap**: UI framework
- **Electron Forge**: Modern build and packaging tools

## How It Works

1. **Data Download**: The app downloads a SQLite database from `http://unibocalendar.duckdns.org/data.db`
2. **Data Processing**: Analyzes enrollment data, user activity, and course statistics
3. **Visualization**: Displays interactive charts showing:
   - Daily enrollment trends
   - Course popularity rankings
   - User activity patterns
   - Individual enrollment details

## Building for Apple Silicon (M1/M2/M3 Macs)

The application is configured to build universal binaries that work on both Intel and Apple Silicon Macs. When you run:

```bash
npm run make
```

The resulting DMG file will work on all Mac architectures. The Electron Forge configuration automatically handles the universal build process.

## Troubleshooting

### Common Issues

1. **Build fails on Apple Silicon**:
   - Make sure you're using Node.js version 18 or higher
   - Try running `npm run clean` to clean install dependencies
   - Run `npm run audit-fix` to fix security vulnerabilities

2. **Data download fails**:
   - Check your internet connection
   - Verify the remote database URL is accessible

3. **App won't start**:
   - Ensure all dependencies are installed: `npm install`
   - Check that you're in the correct directory
   - Try `npm run clean` if you have dependency issues

4. **Security vulnerabilities**:
   - Run `npm audit` to see current issues
   - Use `npm run audit-fix` to fix non-breaking issues
   - For breaking changes, review and test before applying

### Development Tips

- The app downloads data on startup, so the first launch might take a moment
- Data is cached locally for faster subsequent launches
- Use `npm start` for development with hot reloading

## License

ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter any issues or have questions, please check the troubleshooting section above or create an issue in the repository.