const {writeFile} = require('fs')
const {resolve} = require('path')

const express = require('express')
const mkdirp = require('mkdirp')
const multer = require('multer')
const {ncp} = require('ncp')
const parseGithubUrl = require('parse-github-url')
const rimraf = require('rimraf')
const untarRequest = require('untar-request')

const app = express()
const storage = multer.diskStorage({
  // upload *.private-key.pem file to .data/private-key
  // https://expressjs.com/en/resources/middleware/multer.html#diskstorage
  destination: function (request, file, callback) {
    const destinationPath = resolve(process.cwd(), '.data')
    mkdirp(destinationPath, (error) => {
      if (error) return callback(error)
      callback(null, destinationPath)
    })
  },
  filename: function (req, file, cb) {
    cb(null, 'private-key.pem')
  }
})

const upload = multer({ storage })

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'))

app.get('/', function (request, response) {
  process.env.PROJECT_DOMAIN === 'probot' ? response.redirect('https://glitch.com/edit/#!/remix/probot') : response.sendFile(resolve(__dirname, 'index.html'))
})

app.post('/', upload.single('privateKey'), function (req, res) {
  const {
    repository,
    secret,
    id
  } = req.body
  const {
    originalname,
    path: uploadPath
  } = req.file

  console.log(`${originalname} uploaded to ${uploadPath}`)

  const config = `# generated with http://github.com/gr2m/glitch-github-app
APP_ID=${id}
WEBHOOK_SECRET=${secret}
NODE_ENV=production
PRIVATE_KEY_PATH=.data/private-key.pem
`
  writeFile('.env', config, (error) => {
    if (error) {
      console.log(error)
      return res.status(500).json({
        error: error.toString()
      })
    }
    console.log(`Configuration written to .env file`)

    const {
      owner,
      name,
      branch
    } = parseGithubUrl(repository)
    const url = `https://github.com/${owner}/${name}/archive/${branch}.tar.gz`
    const downloadFolderName = `${name}-${branch}`
    const dest = resolve(process.cwd(), '.data')
    untarRequest({url, dest}, function (error) {
      if (error) throw error
      console.log(`Files downloaded from ${url} to ${dest}/${downloadFolderName}`)

      rimraf('?(server|README.md|GLITCH_README.md|.gitignore)', (error) => {
        if (error) {
          console.log(error)
          return res.status(500).json({
            error: error.toString()
          })
        }

        console.log('Original server from glitch-github-app deleted')
        console.log(`Now copying ${resolve(dest, downloadFolderName)} to ${process.cwd()}`)

        // it needs a second for things to work ¯\_(ツ)_/¯
        setTimeout(() => {
          ncp(resolve(dest, downloadFolderName), process.cwd(), {
            stopOnErr: true
          }, (error) => {
            if (error) {
              console.log(error)
              return res.status(500).json({
                error: error.toString()
              })
            }

            console.log('All files copied')

            return res.status(201).json({
              ok: true
            })
          })
        }, 1000)
      })
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port)
})
