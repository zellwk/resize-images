/* globals expect test */
const resizer = require('../../')
const denodeify = require('denodeify')
const fs = require('fs')
const stat = denodeify(fs.stat)
const del = require('del')
const path = require('path')
const sharp = require('sharp')

const getStats = async (...parts) => {
  return stat(path.resolve(...parts))
}

test('Copies original files to destination', async done => {
  const inputDir = 'test/create-files/input'
  const outputDir = 'test/create-files/output'

  await del(outputDir)
  await resizer({
    inputDir,
    outputDir
  })

  const small = await getStats(outputDir, 'small.png')
  expect(small).toBeTruthy()

  const small2 = await getStats(outputDir, 'deep1', 'small.png')
  expect(small2).toBeTruthy()

  done()
})

test('Create files with smaller widths compared to original files', async done => {
  const inputDir = 'test/create-files/input'
  const outputDir = 'test/create-files/output'

  await resizer({
    inputDir,
    outputDir,
    outputSizes: [500, 1000]
  })

  // Should create files with smaller widths
  const medium = await getStats(outputDir, 'medium-500.jpg')
  const meta = await sharp(path.resolve(outputDir, 'medium-500.jpg'))
    .metadata()
  expect(medium).toBeTruthy()
  expect(meta.width).toEqual(500)

  // Should files with larger widths
  try {
    await getStats(outputDir, 'medium-1000.jpg')
  } catch (err) {
    expect(err.message).toEqual(expect.stringMatching(/ENOENT/))
  }

  // cleanup
  await del(outputDir)
  done()
})
