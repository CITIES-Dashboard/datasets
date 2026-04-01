const axios = require('axios');
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
        console.error(`GitHub Data Fetch Error: ${error.response?.statusText || error.message}`);
        return [];
    }
};

/**
 * Retrieves the name of a Google Sheet by its sheet ID and GID using an
 * authenticated Google Sheets API client (service account).
 * @async
 * @param {object} sheets - An authenticated Google Sheets API client instance.
 * @param {string} sheetId - The ID of the Google Sheet.
 * @param {number} gid - The GID of the specific sheet within the spreadsheet.
 * @returns {Promise<string|null>} A promise that resolves to the sheet name,
 * or null if the sheet is not found or the name is invalid.
 */
const getSheetNameByGid = async (sheets, sheetId, gid) => {
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            fields: 'sheets(properties(sheetId,title))',
        });

        const sheet = response.data.sheets.find(
            sheet => sheet.properties.sheetId === parseInt(gid, 10)
        );

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
 * Fetches data from a public Google Sheet using the Google Visualization API (gviz),
 * while resolving the sheet name via the authenticated Google Sheets API.
 * @async
 * @param {object} sheets - An authenticated Google Sheets API client instance.
 * @param {string} sheetId - The ID of the Google Sheet.
 * @param {number} gid - The GID of the specific sheet within the spreadsheet.
 * @param {string} [query] - Optional Google Visualization API query string (tq).
 * @param {number} [headers=1] - Indicates whether to include header row (1) or not (0).
 * @returns {Promise<{sheetName: string|null, data: Array<Array<any>>}>}
 * A promise that resolves to an object containing the sheet name and the fetched data array.
 * Returns null for the sheet name and an empty array for the data if any error occurs.
 */
const fetchDataFromGoogleSheet = async (sheets, sheetId, gid, query, headers) => {
    const sheetName = await getSheetNameByGid(sheets, sheetId, gid);
    if (!sheetName) {
        console.error(`Sheet with GID ${gid} not found in spreadsheet ${sheetId}`);
        return { sheetName: null, data: [] };
    }

    try {
        let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}`;

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