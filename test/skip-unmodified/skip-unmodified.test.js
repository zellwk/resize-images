/* globals expect test */
const resizer = require('../../')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const del = require('del')

const denodeify = require('denodeify')
const stat = denodeify(fs.stat)

const getStats = async (...parts) => {
  return stat(path.resolve(...parts))
}

test('Skip unmodified files', async done => {
  const inputDir = 'test/skip-unmodified/input'
  const outputDir = 'test/skip-unmodified/output'

  // Creates initial files
  await resizer({ inputDir, outputDir, outputSizes: [500, 1000] })
  const input = await getStats(inputDir, 'file.png')
  const output = await getStats(outputDir, 'file.png')
  const resized = await getStats(outputDir, 'file-500.png')
  expect(output.mtime - input.mtime).toBeGreaterThan(0)
  expect(resized.mtime - input.mtime).toBeGreaterThan(0)

  // Runs resize again.
  // Output file should not be modified.
  // Resized files should not be modified too.
  await resizer({ inputDir, outputDir, outputSizes: [500, 1000] })
  const output2 = await getStats(outputDir, 'file.png')
  const resized2 = await getStats(outputDir, 'file-500.png')
  expect(output2.mtime - output.mtime).toEqual(0)
  expect(resized2.mtime - resized.mtime).toEqual(0)

  // Modifies file
  // File should be modified
  await sharp({ create: { width: 700, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } }
  })
    .png()
    .toFile(path.resolve(inputDir, 'file.png'))

  // Runs resizer again.
  // Output file should be modified
  // Resized files should be modified
  await resizer({ inputDir, outputDir, outputSizes: [500, 1000] })
  const output3 = await getStats(outputDir, 'file.png')
  const resized3 = await getStats(outputDir, 'file-500.png')
  expect(output3.mtime - output.mtime).toBeGreaterThan(0)
  expect(resized3.mtime - output.mtime).toBeGreaterThan(0)

  // cleanup
  await del(outputDir)

  done()
})
