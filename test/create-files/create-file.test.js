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

const inputDir = 'test/create-files/input'
const outputDir = 'test/create-files/output'

test('Throws error when outputSizes not configured', async done => {
  try {
    await resizer({ inputDir, outputDir })
  } catch (error) {
    expect(error.message).toEqual(expect.stringMatching(/No outputSizes configured/))
  }

  // cleanup
  await del(outputDir)
  done()
})

test('Throws error when input directory not configured', async done => {
  try {
    await resizer({ outputDir, outputSizes: [] })
  } catch (error) {
    expect(error.message).toEqual(expect.stringMatching(/input directory/))
  }

  // cleanup
  await del(outputDir)
  done()
})

test('Throws error when output directory not configured', async done => {
  try {
    await resizer({ inputDir, outputSizes: [] })
  } catch (error) {
    expect(error.message).toEqual(expect.stringMatching(/output directory/))
  }

  // cleanup
  await del(outputDir)
  done()
})

test('Copies original files to destination', async done => {
  await del(outputDir)
  await resizer({
    inputDir,
    outputDir,
    outputSizes: [500, 1000]
  })

  const small = await getStats(outputDir, 'small.png')
  expect(small).toBeTruthy()

  const small2 = await getStats(outputDir, 'deep1', 'small.png')
  expect(small2).toBeTruthy()

  done()
})

test('Create files with smaller widths compared to original files', async done => {
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

test('Supports GIFs', async done => {
  await resizer({
    inputDir,
    outputDir,
    outputSizes: [500, 1000]
  })

  // Should copy GIFs
  const gif = await getStats(outputDir, 'gif.gif')
  const { width: gifWidth } = await sharp(path.resolve(outputDir, 'gif.gif'))
    .metadata()
  expect(gif).toBeTruthy()
  expect(gifWidth).toEqual(750)

  // Should create GIFs with smaller widths
  const gif2 = await getStats(outputDir, 'gif-500.gif')
  const { width: gif2Width } = await sharp(path.resolve(outputDir, 'gif-500.gif'))
    .metadata()
  expect(gif2).toBeTruthy()
  expect(gif2Width).toEqual(500)

  // Should not create GIFs with larger widths
  try {
    await getStats(outputDir, 'gif-1000.gif')
  } catch (err) {
    expect(err.message).toEqual(expect.stringMatching(/ENOENT/))
  }

  // cleanup
  await del(outputDir)
  done()
})
