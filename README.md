Based on the provided details and the structure of your project, I've crafted documentation for your README.md that includes an overview of each script and their key functionalities. This documentation aims to offer clear insights into the purpose and capabilities of each part of your project.

---

# CITIES Data Visualization Dashboard Datasets

This repository hosts the datasets for the CITIES Data Visualization Dashboard, ensuring the data is current by regularly updating it to reflect the latest available information. The datasets are vital for powering the dashboard, offering insights through data visualization.

## Overview

The datasets are managed through a series of scripts that automate the process of fetching, updating, and maintaining the data and its metadata. These scripts interact with Google Sheets, where the datasets are originally curated and stored, and then transform this data into a format suitable for the dashboard, ensuring the visualization reflects the most recent data.

### Files

- [sync.js](./sync.js): The main script of the program. It orchestrates the process of fetching the temporary database configuration (`temp_database.json`) from the GitHub repository of CITIES-Dashboard, retrieving datasets from specified Google Sheets, and updating local CSV files and their metadata if changes are detected. It ensures the datasets used by the dashboard are up to date.
  
- [datafetch.js](./datafetch.js): This script contains functions dedicated to fetching data. It includes:
  - `fetchDataFromGithub(url)`: Fetches JSON data from a specified GitHub URL.
  - `getSheetNameByGid(sheetId, gid, apiKey)`: Retrieves the name of a Google Sheet by its ID and GID using the provided API key.
  - `fetchDataFromGoogleSheet(sheetId, gid, apiKey, query, headers)`: Fetches data from a specified Google Sheet and processes it based on the provided query and headers parameters.

- [utils.js](./utils.js): A collection of utility functions that support data manipulation and formatting. These include:
  - `isValidSheetName(sheetName)`: Validates the name of a Google Sheet.
  - `convertDateFormat(data)`: Converts date strings within an array to a standardized format (YYYY-MM-DD).
  - `roundFloatingPointsInData(data)`: Rounds floating point numbers in an array to two decimal places.
  - `sanitizeData(data)`: Applies data sanitization functions to prepare data for processing.
  - `arrayToCSV(data)`: Converts an array of data into a CSV string format.
  - `computeHash(data)`: Computes the SHA-256 hash of a given dataset.
  - `getCSVFileSize(filePath)`: Retrieves the size of a CSV file.

- [datasets_metadata.json](./datasets_metadata.json): A JSON file containing metadata for each dataset, including the dataset's name, a link to that version's CSV file, the date of the last update, and the size of that version. This file is used to track the datasets' metadata, and display the versions over at the dashboard.

### Links

- [CITIES Data Visualization Dashboard](https://citiesdashboard.com/)

---

Please ensure that each script is well-commented, including JSDoc comments for functions, to facilitate understanding and maintenance by other developers or contributors to the project.