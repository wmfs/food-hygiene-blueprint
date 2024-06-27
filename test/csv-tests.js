/* eslint-env mocha */

'use strict'

const chai = require('chai')
const expect = chai.expect
const path = require('path')
const tymly = require('@wmfs/tymly')
const process = require('process')
const runUpload = require('../functions/refresh-data-upload')()
const runImport = require('../functions/refresh-data-import')()

describe('FSA CSV Import Tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let bootedServices
  let tymlyService
  let client
  let fsaModel
  let importLogModel
  let uploadResult

  const uploadEvent = {
    body: {
      upload: {
        serverFilename: path.join(__dirname, 'fixtures', 'fsa.csv'),
        clientFilename: path.join(__dirname, 'fixtures', 'fsa.csv')
      }
    },
    importDirectory: path.join(__dirname, 'fixtures', 'output')
  }

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('startup tymly', async () => {
    const tymlyServices = await tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-solr-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-rest-client-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/mock-os-places-plugin'),
          require.resolve('@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin'),
          require.resolve('@wmfs/tymly-cardscript-plugin'),
          require.resolve('@wmfs/tymly-etl-plugin'),
          path.join(__dirname, '../../../plugins/tymly-cardscript-plugin'),
          require.resolve('@wmfs/tymly-pg-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      }
    )

    bootedServices = tymlyServices
    tymlyService = tymlyServices.tymly
    client = tymlyServices.storage.client
    fsaModel = tymlyServices.storage.models.fsa_foodRatings
    importLogModel = tymlyServices.storage.models.fsa_importLog
  })

  it('should run the state machine to upload the CSV file', async () => {
    uploadResult = await runUpload(uploadEvent)

    expect(uploadResult.totalRows).to.eql(5)
  })

  it('should run the state machine to import the uploaded data', async () => {
    await runImport(uploadResult, { bootedServices }, {})
  })

  it('should check the imported data log', async () => {
    const rows = await importLogModel.find({})

    expect(rows.length).to.eql(1)

    expect(rows[0].totalRowsInserted).to.eql(5)
    expect(rows[0].totalRowsRejected).to.eql(0)
    expect(rows[0].totalRows).to.eql(5)
  })

  it('should check the imported data', async () => {
    const rows = await fsaModel.find({ orderBy: ['uprn'] })

    expect(rows.length).to.eql(5)

    expect(rows[0].fhrsId).to.eql('1000001')
    expect(rows[0].uprn).to.eql('1234')
    expect(rows[0].ratingValue).to.eql('AwaitingInspection')

    expect(rows[1].fhrsId).to.eql('1000002')
    expect(rows[1].uprn).to.eql('1235')
    expect(rows[1].ratingValue).to.eql('AwaitingInspection')

    expect(rows[2].fhrsId).to.eql('1000003')
    expect(rows[2].uprn).to.eql('1236')
    expect(rows[2].ratingValue).to.eql('4')

    expect(rows[3].fhrsId).to.eql('1000004')
    expect(rows[3].uprn).to.eql('1237')
    expect(rows[3].ratingValue).to.eql('4')

    expect(rows[4].fhrsId).to.eql('1000005')
    expect(rows[4].uprn).to.eql('1238')
    expect(rows[4].ratingValue).to.eql('5')
  })

  after('clean up the tables', async () => {
    await client.query('DROP SCHEMA tymly CASCADE;')
    await client.query('DROP SCHEMA fsa CASCADE;')
  })

  after('shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
