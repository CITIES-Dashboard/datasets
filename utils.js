const crypto = require('crypto');
const fs = require('fs');

/**
 * Checks if the given sheet name is valid.
 * @param {string} sheetName
 * @returns {boolean} true if the sheet name is valid, false otherwise
 */
const isValidSheetName = (sheetName) => {
    if (typeof sheetName !== 'string' || sheetName.trim() === '' || sheetName.length > 100) {
        return false;
    }
    return !/[*?:/\\[\]']/.test(sheetName);
};

/**
 * Converts date strings in a dataset from a custom format to YYYY-MM-DD or YYYY-MM-DD HH:MM format.
 * Assumes date strings start with "Date(" and are in the format "Date(year,month,day,hour,minute)".
 * @param {Array<Array<any>>} data - The dataset containing rows of data, with date strings to convert.
 * @returns {Array<Array<any>>} The dataset with converted date strings.
 */
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

/**
 * Rounds all floating point numbers in a dataset to two decimal places.
 * @param {Array<Array<any>>} data - The dataset containing rows of data, which may include floating point numbers.
 * @returns {Array<Array<any>>} The dataset with all floating point numbers rounded to two decimal places.
 */
const roundFloatingPointsInData = (data) => {
    return data.map(row =>
        row.map(cell =>
            (typeof cell === 'number' && !Number.isInteger(cell)) ? parseFloat(cell.toFixed(2)) : cell
        )
    );
};

/**
 * Sanitizes data by converting date formats and rounding floating point numbers.
 * @param {Array<Array<any>>} data - The dataset to be sanitized.
 * @returns {Array<Array<any>>} The sanitized dataset.
 */
const sanitizeData = (data) => {
    data = convertDateFormat(data);
    data = roundFloatingPointsInData(data);
    return data;
};

/**
 * Converts a dataset into a CSV formatted string.
 * @param {Array<Array<any>>} data - The dataset to be converted.
 * @returns {string} The CSV formatted string.
 */
const arrayToCSV = (data) => {
    return data.map(row => row.join(',')).join('\n');
};

/**
 * Computes the SHA-256 hash of the given data.
 * @param {string} data - The data to hash.
 * @returns {string} The computed hash in hexadecimal format.
 */
const computeHash = (data) => {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
};

/**
 * Retrieves the file size of a CSV file at the specified path.
 * @param {string} filePath - The path to the CSV file.
 * @returns {number} The size of the file in bytes.
 */
const getCSVFileSize = (filePath) => {
    const stats = fs.statSync(filePath);
    return stats.size;
};

// If you decide to include the commented-out function:
/**
 * Sanitizes a Google Sheet query by removing LIMIT and ORDER BY clauses.
 * @param {string} query - The query to sanitize.
 * @returns {string} The sanitized query.
 */
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