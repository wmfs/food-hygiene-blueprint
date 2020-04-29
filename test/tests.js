/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')

describe('data import', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  const STATE_MACHINE_NAME = 'fsa_refreshFromXmlFile_1_0'
  const OUTPUT_DIR = path.resolve(__dirname, './output')

  let tymlyService
  let statebox
  let client

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
          require.resolve('@wmfs/tymly-etl-plugin'),
          require.resolve('@wmfs/tymly-pg-plugin'),
          path.resolve(__dirname, '../node_modules/@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      }
    )

    tymlyService = tymlyServices.tymly
    statebox = tymlyServices.statebox
    client = tymlyServices.storage.client
  })

  it('create and populate the fsa.food_ratings database table', async () => {
    const executionDescription = await statebox.startExecution(
      {
        xmlPath: path.resolve(__dirname, './fixtures/food_ratings.xml'),
        csvPath: path.resolve(__dirname, './output/inserts/food_ratings.csv'),
        sourceDir: OUTPUT_DIR
      }, // input
      STATE_MACHINE_NAME, // state machine name
      {
        sendResponse: 'COMPLETE'
      } // options
    )

    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(executionDescription.currentStateName).to.eql('ImportingCsvFiles')
  })

  it('verify data in the table', async () => {
    const result = await client.query(
      'select fhrsid, local_authority_business_id, business_name, business_type, business_type_id, address_line_1, ' +
      'address_line_2, address_line_3, address_line_4, postcode, rating_value, rating_key, TO_CHAR(rating_date, \'DD/MM/YYYY\') AS rating_date, ' +
      'local_authority_code, local_authority_name, local_authority_website, local_authority_email_address, ' +
      'hygiene, structural, confidence_in_management, scheme_type, new_rating_pending, longitude, latitude ' +
      'from fsa.food_ratings order by fhrsid;'
    )

    expect(result.rowCount).to.eql(5)
    expect(result.rows[0].fhrsid).to.eql('1234567890')
    expect(result.rows[1].fhrsid).to.eql('1234567891')
    expect(result.rows[2].fhrsid).to.eql('1234567892')
    expect(result.rows[3].fhrsid).to.eql('1234567893')
    expect(result.rows[4].fhrsid).to.eql('1234567894')
  })

  it('clean up the database', async () => {
    const result = await client.query(
      'DELETE FROM fsa.food_ratings WHERE fhrsid::text LIKE \'123456789%\';'
    )

    expect(result.rowCount).to.eql(5)
  })

  it('verify empty database', async () => {
    const result = await client.query(
      'select * from fsa.food_ratings;'
    )

    expect(result.rows).to.eql([])
  })

  // TODO: package that converts a CSV file into an XML file appears to be tardy releasing file locks, which causes code that deletes output folder to fail
  // it('Should remove output directory now tests are complete', function (done) {
  //   if (fs.existsSync(OUTPUT_DIR)) {
  //     rimraf(OUTPUT_DIR, {}, done)
  //   } else {
  //     done()
  //   }
  // })

  after('shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
