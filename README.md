# Calder - Employee Shift Tracker

A web application designed to help manage and track employee work shifts. It features a calendar view for a quick overview of scheduled shifts, a table summarizing all shifts, and the ability to filter shifts by date and employee. The application can integrate with a Google Apps Script for data persistence or use local demo data.

## Features

*   **Add New Shifts:** Easily input employee name, date, start time, and end time for new shifts.
*   **Calendar View:** Visualize shifts on a monthly calendar with navigation to previous/next months.
*   **Shift Summary Table:** View all recorded shifts in a sortable and filterable table.
*   **Filter Shifts:** Filter the shift summary by date range and employee name.
*   **Calculate Total Hours:** Automatically calculates and displays total work hours for the filtered shifts.
*   **Google Apps Script Integration:** Persist and fetch shift data using a Google Apps Script backend.
*   **Demo Mode:** Falls back to local demo data if Google Apps Script is not configured or unavailable.
*   **Responsive Design:** User-friendly interface that adapts to different screen sizes.
*   **Error and Success Notifications:** Provides feedback for user actions like adding shifts.

## Technology Stack

*   **Frontend:** React (with Hooks), Vite
*   **Styling:** CSS (App.css, index.css)
*   **Date Management:** `date-fns` library
*   **Linting:** ESLint
*   **Backend (Optional):** Google Apps Script for data storage and retrieval.

## Setup and Running Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Google Apps Script (Optional but Recommended):**
    *   This application is designed to fetch and submit shift data to a Google Apps Script.
    *   Open the `src/App.jsx` file.
    *   Find the `GOOGLE_SCRIPT_URL` constant.
    *   Replace the placeholder URL (`"https://script.google.com/macros/s/AKfycbxGN7S9T_1DPAMe0x8Y5lchI6MCkkmgAcyFudGHSKoMEXttK-G_IODWM9IZT3-qRHP-oA/exec"` or `"YOUR_SCRIPT_URL_HERE"`) with your own deployed Google Apps Script URL.
    *   **If you don't configure this, the app will run in demo mode with pre-defined sample data and will not persist any new shifts you add.**
    *   See the section below on "Google Apps Script Backend" for details on what the script should do.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically at `http://localhost:5173`.

## Available Scripts

In the project directory, you can run the following commands:

*   `npm run dev`:
    Runs the app in development mode using Vite. Open [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal) to view it in your browser. The page will reload if you make edits.

*   `npm run build`:
    Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

*   `npm run lint`:
    Lints the project files using ESLint to check for code quality and style issues.

*   `npm run preview`:
    Serves the production build locally from the `dist` folder. This is useful for testing the production build before deploying.

## Google Apps Script Backend (Optional)

To enable data persistence, you need to create and deploy a Google Apps Script. The script should handle `GET` requests to fetch shifts and `POST` requests to add new shifts.

Here's a basic idea of what the script should do:

**1. `doGet(e)` function:**
   *   This function is called when the app makes a `GET` request to your script URL.
   *   It should retrieve shift data (e.g., from a Google Sheet).
   *   Return the data as a JSON response in the following format:
     ```json
     {
       "shifts": [
         { "employee": "John Doe", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM" },
         // ... more shifts
       ]
     }
     ```
   *   Example:
     ```javascript
     function doGet(e) {
       // Assuming shifts are stored in a sheet named 'Shifts'
       // Columns: Employee, Date, StartTime, EndTime
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Shifts");
       const data = sheet.getDataRange().getValues();
       const shiftsArray = data.slice(1).map(row => ({ // Skip header row
         employee: row[0],
         date: Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
         startTime: formatAppsScriptTime(row[2]), // Helper function needed for time objects
         endTime: formatAppsScriptTime(row[3])   // Helper function needed for time objects
       }));
       return ContentService.createTextOutput(JSON.stringify({ shifts: shiftsArray }))
         .setMimeType(ContentService.MimeType.JSON);
     }

     // Helper to format time from Google Sheets (which can be Date objects) to HH:MM string
     function formatAppsScriptTime(timeCellValue) {
       if (timeCellValue instanceof Date) {
         return Utilities.formatDate(timeCellValue, Session.getScriptTimeZone(), "HH:mm");
       }
       return timeCellValue; // If it's already a string
     }
     ```

**2. `doPost(e)` function:**
   *   This function is called when the app makes a `POST` request (to add a new shift).
   *   The shift data (employee, date, startTime, endTime) will be in `e.parameter`.
   *   Store this data (e.g., append a new row to a Google Sheet).
   *   Return a JSON response indicating success or failure:
     ```json
     { "result": "success" } 
     // or
     { "result": "error", "message": "Some error details" }
     ```
   *   Example:
     ```javascript
     function doPost(e) {
       try {
         const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Shifts");
         const params = e.parameter;
         sheet.appendRow([params.employee, params.date, params.startTime, params.endTime]);
         return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
           .setMimeType(ContentService.MimeType.JSON);
       } catch (error) {
         return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
           .setMimeType(ContentService.MimeType.JSON);
       }
     }
     ```

**Deployment:**
*   Create a new Google Apps Script project.
*   Paste your `doGet` and `doPost` functions.
*   Deploy the script as a Web App:
    *   `Deploy` > `New deployment`.
    *   Select type `Web app`.
    *   Configure:
        *   `Execute as`: `Me`
        *   `Who has access`: `Anyone` (if you want it publicly accessible for the app) or `Anyone with Google account` if your users will be logged into Google. For simplicity with external apps, `Anyone` is often used, but be mindful of security.
    *   Click `Deploy`.
    *   Copy the **Web app URL** provided and use this as the `GOOGLE_SCRIPT_URL` in `src/App.jsx`.

**Note:** Remember to set up your Google Sheet with appropriate headers if you're using the Google Sheet examples above. The example script assumes a sheet named "Shifts" with columns "Employee", "Date", "StartTime", "EndTime".
