const fs = require('fs');

const { fetchDataFromGithub, fetchDataFromGoogleSheet } = require('./datafetch');
const { arrayToCSV, computeHash, getCSVFileSize } = require('./utils');

const main = async (apiKey, databaseUrl, currentCommit) => {
    try {
        const database = await fetchDataFromGithub(databaseUrl);
        let metadata = {};

        if (fs.existsSync('./datasets_metadata.json')) {
            metadata = JSON.parse(fs.readFileSync('./datasets_metadata.json', 'utf-8'));
        }

        for (const project of database) {
            if (!project.rawDataTables ||
                project.rawDataTables.length === 0 ||
                Object.keys(project.rawDataTables[0]).length === 0) continue;


            const projectPath = `./${project.id}`;
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath);
            }

            const projectMetadata = metadata[project.id] || [];

            for (const dataset of project.rawDataTables) {
                const gid = dataset.gid;
                const query = dataset.query || null;
                const headers = dataset.headers || 1; // default headers is 1
                const { sheetName, data } = await fetchDataFromGoogleSheet(project.sheetId, gid, apiKey, query, headers);

                if (!sheetName || data.length === 0) {
                    throw new Error(`Invalid sheet name or empty data for GID ${gid} in project ${project.id}`);
                }

                const csvData = arrayToCSV(data);

                // Check for any existing .csv files corresponding to this gid
                let existingCsvFile = null;
                let existingFileName = null;
                for (const entry of projectMetadata) {
                    if (entry.id === gid.toString() && entry.versions.length > 0) {
                        existingFileName = entry.versions[0].name;
                        existingCsvFile = `${projectPath}/${existingFileName}.csv`;
                        break;
                    }
                }

                const sanitizedSheetName = sheetName.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "_");
                const fileName = `${sanitizedSheetName}.csv`;

                const filePath = `${projectPath}/${fileName}`;
                if (existingCsvFile && existingCsvFile !== filePath) {
                    fs.renameSync(existingCsvFile, filePath);
                }
                const oldCSVData = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : "";
                const oldHash = computeHash(oldCSVData);
                const newHash = computeHash(csvData);

                if (oldHash !== newHash) {
                    fs.writeFileSync(filePath, csvData);

                    const rawLinkLatest = `https://raw.githubusercontent.com/CITIES-Dashboard/datasets/main/${project.id}/${fileName}`;
                    const currentCommitRawLink = existingFileName
                        ? `https://raw.githubusercontent.com/CITIES-Dashboard/datasets/${currentCommit}/${project.id}/${existingFileName}.csv`
                        : `https://raw.githubusercontent.com/CITIES-Dashboard/datasets/${currentCommit}/${project.id}/${fileName}.csv`;
                    const size = getCSVFileSize(filePath);
                    const currentVersion = {
                        name: sanitizedSheetName,
                        rawLink: rawLinkLatest,
                        version: new Date().toISOString().split('T')[0], // Only YYYY-MM-DD format
                        sizeInBytes: size
                    };

                    let datasetEntry = projectMetadata.find(entry => entry.id === dataset.gid.toString());

                    if (!datasetEntry) {
                        datasetEntry = {
                            id: dataset.gid.toString(),
                            versions: []
                        };
                        projectMetadata.push(datasetEntry);
                    }

                    // If there's a previous version
                    if (datasetEntry.versions.length > 0) {
                        // Update its rawLink to include the commit hash
                        datasetEntry.versions[0].rawLink = currentCommitRawLink;

                        // Go through all versions and find the number of versions
                        // with the same date as the current version
                        const numVersionsWithSameDate = datasetEntry.versions.filter(version => version.version === currentVersion.version).length;
                        // If there already exist versions with the same date
                        // Overwrite them with the current version by filtering them out
                        if (numVersionsWithSameDate > 0) {
                            datasetEntry.versions = datasetEntry.versions.filter(version => version.version !== currentVersion.version);
                        }
                    }

                    // Prepend the new version
                    datasetEntry.versions.unshift(currentVersion);
                }
            }

            // Sort projectMetadata to match the order of rawDataTables based on gid
            const gidOrder = project.rawDataTables.map(dataset => dataset.gid.toString());
            projectMetadata.sort((a, b) => gidOrder.indexOf(a.id) - gidOrder.indexOf(b.id));

            metadata[project.id] = projectMetadata;
        }

        fs.writeFileSync('./datasets_metadata.json', JSON.stringify(metadata, null, 2));
    } catch (error) {
        console.error(`Error in main: ${error.message}`);
    }
};

const SHEETS_API_KEY = process.env.SHEETS_NEW_API_KEY;
const TEMP_DATABASE_URL = 'https://raw.githubusercontent.com/CITIES-Dashboard/cities-dashboard.github.io/main/frontend/src/temp_database.json';
const CURRENT_COMMIT_HASH = process.env.CURRENT_COMMIT;
main(SHEETS_API_KEY, TEMP_DATABASE_URL, CURRENT_COMMIT_HASH).catch(console.error);
