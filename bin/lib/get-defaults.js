var path = require('path')
var changelogParser = require('changelog-parser')
var exec = require('shelljs').exec
var parseRepo = require('github-url-to-object')

function getDefaults (workPath, callback) {
  var pkg = require(path.resolve(workPath, 'package.json'))

  if (!pkg.hasOwnProperty('repository')) {
    return callback(new Error('You must define a repository for your module => https://docs.npmjs.com/files/package.json#repository'))
  }

  var commit = getTargetCommitish()
  var repoParts = parseRepo(pkg.repository)
  var owner = repoParts.user
  var repo = repoParts.repo
  var logPath = path.resolve(workPath, 'CHANGELOG.md')

  changelogParser(logPath, function (err, result) {
    if (err) return callback(err)

    var unreleased = result.versions.filter(function (release) {
      return release.title && release.title.toLowerCase
        ? release.title.toLowerCase() === 'unreleased'
        : false
    })

    if (unreleased.length > 0) {
      return callback(new Error('Unreleased changes detected in CHANGELOG.md, aborting'))
    }

    var log = result.versions.filter(function (release) { return release.version !== null })[0]

    if (log.version !== pkg.version) {
      var errStr = 'CHANGELOG.md out of sync with package.json '
      errStr += '(' + (log.version || log.title) + ' !== ' + pkg.version + ')'
      return callback(new Error(errStr))
    }

    var version = pkg.version ? 'v' + pkg.version : null

    callback(null, {
      body: log.body,
      assets: false,
      owner: owner,
      repo: repo,
      dryRun: false,
      endpoint: 'https://api.github.com',
      workpath: process.cwd(),
      prerelease: false,
      draft: false,
      target_commitish: commit,
      tag_name: version,
      name: version
    })
  })
}

function getTargetCommitish () {
  var commit = exec('git rev-parse HEAD', { silent: true }).output.split('\n')[0]
  if (commit.indexOf('fatal') === -1) return commit
  return 'master'
}

module.exports = getDefaults
module.exports.getTargetCommitish = getTargetCommitish
