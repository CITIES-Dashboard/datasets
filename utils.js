const crypto = require('crypto');
const fs = require('fs');

/**
 * Generate a random string
 * @param {string} sheetName
 * @returns {boolean} true if the sheet name is valid, false otherwise
 */
const isValidSheetName = (sheetName) => {
    if (typeof sheetName !== 'string' || sheetName.trim() === '' || sheetName.length > 100) {
        return false;
    }
    return !/[*?:/\\[\]']/.test(sheetName);
};

const convertDateFormat = (data) => {
    return data.map(row => {
        let dateStr = row[0];
        if (typeof dateStr === 'string' && dateStr.startsWith("Date(")) {
            // Extract parts of the Date string
            const parts = dateStr.slice(5, -1).split(",");
            let [year, month, day, ...rest] = parts.map(str => str.trim());

            // Increment month to correct for zero-based indexing in JS
            month = (parseInt(month) + 1).toString();

            // Reconstruct the date string in YYYY-MM-DD format
            dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // If there are additional time details, append them as HH:MM
            if (rest.length > 0) {
                const [hour, minute] = rest;
                dateStr += ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }

            // Update the first element of the row
            row[0] = dateStr;
        }
        return row;
    });
};

const roundFloatingPointsInData = (data) => {
    return data.map(row =>
        row.map(cell =>
            (typeof cell === 'number' && !Number.isInteger(cell)) ? parseFloat(cell.toFixed(2)) : cell
        )
    );
};

const sanitizeData = (data) => {
    data = convertDateFormat(data);
    data = roundFloatingPointsInData(data);
    return data;
};

const arrayToCSV = (data) => {
    return data.map(row => row.join(',')).join('\n');
};

const computeHash = (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
};

const getCSVFileSize = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.size;
};

// const sanitizeGoogleSheetQuery = (query) => {
//     return query
//         .replace(/LIMIT\s+\d+/gi, '')  // Remove LIMIT clauses
//         .replace(/ORDER\s+BY\s+[\w\s,]+/gi, '');  // Remove ORDER BY clauses
// };

module.exports = {
    isValidSheetName,
    convertDateFormat,
    roundFloatingPointsInData,
    sanitizeData,
    arrayToCSV,
    computeHash,
    getCSVFileSize
};