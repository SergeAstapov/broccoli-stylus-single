var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var includePathSearcher = require('include-path-searcher')
var quickTemp = require('quick-temp')
var mapSeries = require('promise-map-series')
var _ = require('lodash')
var RSVP = require('rsvp');

// Use the stylus module in the root project if available;
// otherwise, use the one included with this plugin
var codependency = require('codependency');
var requirePeer = codependency.register(module, { index: ['peerDependencies'] });
var stylus = requirePeer('stylus', { optional: true }) || require('stylus');

module.exports = StylusCompiler
function StylusCompiler (sourceTrees, inputFile, outputFile, options) {
  if (!(this instanceof StylusCompiler)) return new StylusCompiler(sourceTrees, inputFile, outputFile, options)
  this.sourceTrees = sourceTrees
  this.inputFile = inputFile
  this.outputFile = outputFile
  this.stylusOptions = options || {}
}

StylusCompiler.prototype.read = function (readTree) {
  var self = this
  quickTemp.makeOrRemake(this, '_tmpDestDir')
  var destFile = this._tmpDestDir + '/' + this.outputFile
  mkdirp.sync(path.dirname(destFile))
  return mapSeries(this.sourceTrees, readTree)
    .then(function (includePaths) {
      var stylusOptions = {
        filename: includePathSearcher.findFileSync(self.inputFile, includePaths),
        paths: includePaths,
      }
      _.merge(stylusOptions, self.stylusOptions)
      stylusOptions.paths = [path.dirname(stylusOptions.filename)].concat(stylusOptions.paths);
      data = fs.readFileSync(stylusOptions.filename, 'utf8');

      var promise = new RSVP.Promise(function(resolve, reject) {
        stylus.render(data, stylusOptions, function (e, css) {
          if (e) {
            reject(e);
          }
          fs.writeFileSync(destFile, css, { encoding: 'utf8' });

          resolve(self._tmpDestDir);
        });
      });

      return promise;
    });
}

StylusCompiler.prototype.cleanup = function () {
  quickTemp.remove(this, '_tmpDestDir')
}

