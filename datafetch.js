const axios = require('axios');
const { google } = require('googleapis');

const { isValidSheetName, sanitizeData } = require('./utils');

const fetchDataFromGithub = async (url) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`GitHub Data Fetch Error: ${error.response.statusText}`);
        return [];
    }
};

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