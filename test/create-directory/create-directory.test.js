/* globals expect test */
const resizer = require('../../')
const denodeify = require('denodeify')
const fs = require('fs')
const stat = denodeify(fs.stat)
const del = require('del')
const path = require('path')

test('Create output directories', async done => {
  const inputDir = 'test/create-directory/input'
  const outputDir = 'test/create-directory/output'

  await del(outputDir)
  await resizer({
    inputDir,
    outputDir,
    outputSizes: []
  })

  expect(await stat(outputDir)).toBeTruthy()
  expect(await stat(path.resolve(outputDir, 'deep1'))).toBeTruthy()
  expect(await stat(path.resolve(outputDir, 'deep1', 'deep2'))).toBeTruthy()

  // cleanup
  await del(outputDir)
  done()
})
