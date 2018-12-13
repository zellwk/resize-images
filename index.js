const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const denodeify = require('denodeify')
const glob = denodeify(require('glob'))
const mkdir = denodeify(require('mkdirp'))
const fsStat = denodeify(fs.stat).bind(fs)

/**
 * Make output directories.
 * Required for Sharp, because Sharp errors if directory doesn't exist
 * @param {array} files Array of file paths
 */
const createDirectories = (files) => {
  const directories = files.reduce((dirs, file) => {
    const { inputPath, inputDir, outputDir } = file
    const dir = path.dirname(inputPath).replace(inputDir, outputDir)
    dirs.push(dir)
    return dirs
  }, [])

  const uniqueDirs = [...(new Set(directories))]
  return Promise.all(uniqueDirs.map(async dir => mkdir(dir)))
}

/**
 * Decides whether to modify file.
 * Modify if
 *   1. Input is newer
 *   2. No output file found
 * @param {object} file file data
 */
const shouldModify = async file => {
  const is = await fsStat(file.inputPath)
  for (const { path } of file.toOutput) {
    try {
      const os = await fsStat(path)
      if (is.mtime > os.mtime) return true
    } catch (error) {
      return true
    }
  }
}

const getFilesToModify = async files => {
  const toModify = []
  for (const file of files) {
    if (await shouldModify(file)) toModify.push(file)
  }
  return toModify
}

const getOutputSizes = (intendedSizes, fileSize) => {
  const sizes = intendedSizes.filter(size => size < fileSize)
  return sizes
}

/**
 * Gets output path
 * @param {object} file File object.
 * @param {string} size Size to output
 */
const getOutputPath = ({
  inputPath,
  inputDir,
  outputDir
}, size = '') => {
  const dir = path.dirname(inputPath).replace(inputDir, outputDir)
  const ext = path.extname(inputPath)
  const base = path.basename(inputPath, ext)
  size = size ? `-${size}` : ''

  return path.resolve(dir, base + size + ext)
}

const resize = async ({
  inputDir,
  outputDir,
  outputSizes = [],
  exts = ['jpg', 'webp', 'png', 'jpeg']
}) => {
  const extensions = exts.join(',')
  const inputPaths = await glob(inputDir + `/**/*.{${extensions}}`)
  let files = await Promise.all(inputPaths.map(async inputPath => {
    const f = { inputDir, outputDir, inputPath }
    const { width } = await sharp(inputPath).metadata()
    const sizesToCreate = getOutputSizes(outputSizes, width)

    // Creates an array of sizes to create
    // Includes original file
    const toOutput = sizesToCreate.map(size => {
      return {
        size: size,
        shouldResize: true,
        path: getOutputPath(f, size)
      }
    })
    toOutput.push({
      size: width,
      shouldResize: false,
      path: getOutputPath(f)
    })

    return {
      inputDir,
      inputPath,
      outputDir,
      toOutput
    }
  }))

  // Creates directories before running Sharp
  await createDirectories(files)

  // Skips unmodified files
  const filesToResize = await getFilesToModify(files)
  // console.log(filesToResize)

  // Creates files
  await Promise.all(filesToResize.map(file => {
    return Promise.all(file.toOutput.map(async meta => {
      const s = sharp(file.inputPath)
      return meta.shouldResize
        ? s
          .resize({ width: meta.size })
          .toFile(meta.path)
        : s.toFile(meta.path)
    }))
  }))
}

module.exports = resize
