/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Wraps the gcloud tool into a module for reading metadata.
 */

var childProcess = require('child_process');


/**
 * Returns the input data as-is without any formatting. This implements
 * a default/no-op formatter.
 * @param {string} data The data to be formatted.
 * @return {string} The formatted data.
 */
function identity(data) {
  return data;
}


/**
 * Extracts the project id portion from a project id name/value pair.
 * @param {string} data The name/value pair as generated by gcloud.
 * @return {string} The project id
 */
function projectIdParser(data) {
  return data.replace('project = ', '');
}


/**
 * List of supported metadata lookup commands, along with an output
 * processor to process the result of the command.
 */
var commandConfig = {
  projectId: {
    command: 'gcloud config list project | grep project',
    parser: projectIdParser
  },

  authToken: {
    command: 'gcloud auth print-access-token',
    parser: identity
  }
};


/**
 * Looks up the specified metadata.
 * @param {string} name The metadata to lookup.
 * @param {function(string):string} formatter The formatter to apply to
 *     the metadata.
 * @param {function(?Error, ?string)} cb Callback to invoke with results.
 */
function lookupMetadata(name, formatter, cb) {
  formatter = formatter || identity;

  try {
    var cmd = commandConfig[name];
    if (!cmd) {
      throw new Error('Invalid metadata name: ' + name);
    }

    process.env['TERM'] = 'vt-100';
    childProcess.exec(cmd.command, function(error, stdout, stderr) {
      if (error) {
        console.error(stderr);
        cb(error, null);
      }
      else {
        var value = formatter(cmd.parser(stdout.trim()));
        cb(null, value);
      }
    });
  }
  catch (e) {
    process.nextTick(function() {
      cb(e, null);
    });
  }
}


/**
 * Exposes the metadata lookup functionality.
 */
module.exports = {
  metadata: lookupMetadata
};