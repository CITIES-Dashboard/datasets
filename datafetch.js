const axios = require('axios');
const { google } = require('googleapis');

const { isValidSheetName, sanitizeData } = require('./utils');

/**
 * Fetches data from a specified GitHub URL.
 * @async
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<any>} A promise that resolves to the fetched data, or an empty array in case of an error.
 */
const fetchDataFromGithub = async (url) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`GitHub Data Fetch Error: ${error.response.statusText}`);
        return [];
    }
};

/**
 * Retrieves the name of a Google Sheet by its sheet ID and GID, using a specified API key.
 * @async
 * @param {string} sheetId - The ID of the Google Sheet.
 * @param {number} gid - The GID of the specific sheet within the Google Sheets file.
 * @param {string} apiKey - The API key used for accessing Google Sheets API.
 * @returns {Promise<string|null>} A promise that resolves to the sheet name, or null if the sheet is not found or the name is invalid.
 */
const getSheetNameByGid = async (sheetId, gid, apiKey) => {
    try {
        const sheets = google.sheets({ version: 'v4' });
        const response = await sheets.spreadsheets.get({
            key: apiKey,
            spreadsheetId: sheetId,
            fields: 'sheets(properties(sheetId,title))',
        });

        const sheet = response.data.sheets.find(sheet => sheet.properties.sheetId === parseInt(gid, 10));
        if (!sheet) {
            console.error(`Sheet with GID ${gid} not found in spreadsheet ${sheetId}`);
            return null;
        }

        const sheetName = sheet.properties.title;
        if (!isValidSheetName(sheetName)) {
            console.error(`Sheet name "${sheetName}" for GID ${gid} is invalid`);
            return null;
        }

        return sheetName;

    } catch (error) {
        console.error(`Error retrieving sheet name for GID ${gid}: ${error.message}`);
        return null;
    }
};

/**
 * Fetches data from a Google Sheet based on the sheet ID, GID, API key, and an optional query.
 * @async
 * @param {string} sheetId - The ID of the Google Sheet.
 * @param {number} gid - The GID of the specific sheet within the Google Sheets file.
 * @param {string} apiKey - The API key used for accessing the Google Sheets API.
 * @param {string} [query] - The query string to filter or manipulate the fetched data.
 * @param {number} [headers=1] - Indicates whether the first row contains headers (1) or not (0).
 * @returns {Promise<{sheetName: string|null, data: Array<Array<any>>}>} A promise that resolves to an object containing the sheet name and the fetched data array. Returns null for the sheet name and an empty array for the data if any error occurs.
 */
const fetchDataFromGoogleSheet = async (sheetId, gid, apiKey, query, headers) => {
    const sheetName = await getSheetNameByGid(sheetId, gid, apiKey);
    if (!sheetName) {
        console.error(`Sheet with GID ${gid} not found in spreadsheet ${sheetId}`);
        return { sheetName: null, data: [] };
    }

    try {
        let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&key=${apiKey}`;

        // Append the query string if a query is present
        if (query) {
            // const sanitizedQuery = sanitizeGoogleSheetQuery(query);
            const queryString = encodeURIComponent(query);
            url += `&tq=${queryString}`;
        }

        const response = await axios.get(url);
        const text = response.data;

        // Remove "google.visualization.Query.setResponse(" and the trailing ")"
        const jsonpBody = text.slice(47, -2);

        const jsonData = JSON.parse(jsonpBody);

        if (jsonData.table && jsonData.table.rows) {
            let data = jsonData.table.rows.map(row => row.c.map(cell => cell ? cell.v : ''));

            data = sanitizeData(data);

            // Include headers if the "headers" property is 1
            if (headers === 1 && jsonData.table.cols) {
                const headerRow = jsonData.table.cols.map(col => col.label);
                data = [headerRow, ...data];
            }

            return { sheetName, data };
        } else {
            console.error(`Error fetching data for GID ${gid} from spreadsheet ${sheetId}: 'table' or 'rows' missing in response`);
            return { sheetName: null, data: [] };
        }
    } catch (error) {
        console.error(`Error fetching data for GID ${gid} from spreadsheet ${sheetId}: ${error.message}`);
        return { sheetName: null, data: [] };
    }
};

module.exports = {
    fetchDataFromGithub,
    fetchDataFromGoogleSheet,
};