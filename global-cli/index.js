#!/usr/bin/env node

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//   /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// create-preact-app is installed globally on people's computers. This means
// that it is extremely difficult to have them upgrade the version and
// because there's only one global version installed, it is very prone to
// breaking changes.
//
// The only job of create-preact-app is to init the repository and then
// forward all the commands to the local version of create-preact-app.
//
// If you need to add a new command, please add it to the scripts/ folder.
//
// The only reason to modify this file is to add more warnings and
// troubleshooting information for the `create-preact-app` command.
//
// Do not make breaking changes! We absolutely don't want to have to
// tell people to update their global version of create-preact-app.
//
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//   /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

'use strict';

var fs = require('fs');
var path = require('path');
var spawn = require('cross-spawn');
var chalk = require('chalk');
var semver = require('semver');
var argv = require('minimist')(process.argv.slice(2));
var pathExists = require('path-exists');

/**
 * Arguments:
 *   --version - to print current version
 *   --verbose - to print logs while init
 *   --scripts-version <alternative package>
 *     Example of valid values:
 *     - a specific npm version: "0.22.0-rc1"
 *     - a .tgz archive from any npm repo: "https://registry.npmjs.org/react-scripts/-/react-scripts-0.20.0.tgz"
 *     - a package prepared with `npm pack`: "/Users/home/vjeux/create-react-app/react-scripts-0.22.0.tgz"
 */
var commands = argv._;
if (commands.length === 0) {
  if (argv.version) {
    console.log('create-preact-app version: ' + require('./package.json').version);
    process.exit();
  }
  console.error(
    'Usage: create-preact-app <project-directory> [--verbose]'
  );
  process.exit(1);
}

createApp(commands[0], argv.verbose, argv['scripts-version']);

function createApp(name, verbose, version) {
  var root = path.resolve(name);
  if (!pathExists.sync(name)) {
    fs.mkdirSync(root);
  } else if (!isGitHubBoilerplate(root)) {
    console.log('The directory `' + name + '` contains file(s) that could conflict. Aborting.');
    process.exit(1);
  }

  var appName = path.basename(root);
  console.log(
    'Creating a new Preact app in ' + root + '.'
  );
  console.log();

  var packageJson = {
    name: appName,
    version: '0.0.1',
    private: true,
  };
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  var originalDirectory = process.cwd();
  process.chdir(root);

  console.log('Installing packages. This might take a couple minutes.');
  console.log('Installing preact-scripts from npm...');
  console.log();

  run(root, appName, version, verbose, originalDirectory);
}

function run(root, appName, version, verbose, originalDirectory) {
  var args = [
    'install',
    verbose && '--verbose',
    '--save-dev',
    '--save-exact',
    getInstallPackage(version),
  ].filter(function(e) { return e; });
  var proc = spawn('npm', args, {stdio: 'inherit'});
  proc.on('close', function (code) {
    if (code !== 0) {
      console.error('`npm ' + args.join(' ') + '` failed');
      return;
    }

    checkNodeVersion();

    var scriptsPath = path.resolve(
      process.cwd(),
      'node_modules',
      'preact-scripts',
      'scripts',
      'init.js'
    );
    var init = require(scriptsPath);
    init(root, appName, verbose, originalDirectory);
  });
}

function getInstallPackage(version) {
  var packageToInstall = 'preact-scripts';
  var validSemver = semver.valid(version);
  if (validSemver) {
    packageToInstall += '@' + validSemver;
  } else if (version) {
    // for tar.gz or alternative paths
    packageToInstall = version;
  }
  return packageToInstall;
}

function checkNodeVersion() {
  var packageJsonPath = path.resolve(
    process.cwd(),
    'node_modules',
    'preact-scripts',
    'package.json'
  );
  var packageJson = require(packageJsonPath);
  if (!packageJson.engines || !packageJson.engines.node) {
    return;
  }

  if (!semver.satisfies(process.version, packageJson.engines.node)) {
    console.error(
      chalk.red(
        'You are currently running Node %s but create-preact-app requires %s.' +
        ' Please use a supported version of Node.\n'
      ),
      process.version,
      packageJson.engines.node
    );
    process.exit(1);
  }
}

// Check if GitHub boilerplate compatible
// https://github.com/facebookincubator/create-react-app/pull/368#issuecomment-237875655
function isGitHubBoilerplate(root) {
  var validFiles = [
    '.DS_Store', 'Thumbs.db', '.git', '.gitignore', 'README.md', 'LICENSE'
  ];
  return fs.readdirSync(root)
    .every(function(file) {
      return validFiles.indexOf(file) >= 0;
    });
}
