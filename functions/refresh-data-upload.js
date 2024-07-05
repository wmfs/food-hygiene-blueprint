const { parse } = require('csv-parse')
const fs = require('fs')
const parseCsvRow = require('../shared/parse-csv-row')

function readCsv (csvFile, importLog) {
  return new Promise((resolve, reject) => {
    let idx = 1

    fs.createReadStream(csvFile)
      .pipe(parse({ columns: true }))
      .on('data', row => {
        idx++
        parseCsvRow(row, idx, importLog)
      })
      .on('error', reject)
      .on('end', resolve)
  })
}

function addUploadStatus (log) {
  const {
    totalRejected,
    totalRows
  } = log

  log.uploadGood = ''
  log.uploadWarning = ''
  log.uploadError = ''

  if (totalRows === 0) {
    log.uploadError = '0 rows to be uploaded.'
  } else if (totalRejected > 0) {
    log.uploadWarning = `${totalRows} rows to be uploaded but ${totalRejected} rows were rejected (see below).`
  } else {
    log.uploadGood = `${totalRows} rows to be uploaded.`
  }
}

async function processFile ({ serverFilename, clientFilename }) {
  const importLog = {
    serverFilename,
    clientFilename,
    rows: [],
    rejected: [],
    totalRows: 0,
    totalRejected: 0
  }

  await readCsv(serverFilename, importLog)

  addUploadStatus(importLog)

  return importLog
}

module.exports = function () {
  return async function refreshDataUpload (event) {
    const {
      serverFilename,
      clientFilename
    } = event.body.upload

    try {
      return processFile({ serverFilename, clientFilename })
    } catch (err) {
      return {
        uploadGood: '',
        uploadWarning: '',
        uploadError: `Could not process file upload: ${err.message}`
      }
    }
  }
}
