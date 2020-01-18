const gulp = require('gulp');
const path = require('path');

function dependencies({ folder = 'node_modules', package = require('./package.json'), packageLock = require('./package-lock.json'), excludes = name => true, options = {} }) {
  return gulp.src(
    (function (folder, package, packageLock, excludes) {
      const mapper = Array.prototype.flatMap;
      function resolver(dictionary, mapper = Array.prototype.map) {
        return function resolve(name) {
          const module = dictionary[name];
          const requires = module && module.requires && Object.keys(module.requires);
          return [name].concat(requires ? mapper.call(requires, resolve) : []);
        }
      }
      return mapper.call(Object.keys(package.dependencies), resolver(packageLock.dependencies, mapper))
        .filter(excludes)
        .map(name => path.join(folder, name, '**/*'))
        .concat(folder);
    })(folder, package, packageLock, excludes),
    Object.assign({ base: folder }, options),
  );
}

module.exports = dependencies;
