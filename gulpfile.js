const gulp = require('gulp');
const ignore = require('gulp-ignore');
const sourcemaps = require('gulp-sourcemaps');
const package = require('./package.json');

const sources = {
  typescript: 'src/**/*.{j,t}s{,x}',
  scss: 'src/**/*.{,s}css',
}

exports['transpile:tsc'] = function tsc() {
  const ts = require('gulp-typescript');
  return gulp.src(sources.typescript)
    .pipe(sourcemaps.init())
    .pipe(ts.createProject('tsconfig.json')())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
}

exports['transpile:sass'] = function sass() {
  const sass = require('gulp-sass');
  return gulp.src(sources.scss)
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
}

exports.transpile = gulp.parallel(exports['transpile:sass'], exports['transpile:tsc']);

exports['lint:tslint'] = function tslint() {
  const tslint = require("gulp-tslint");
  return gulp.src(sources.typescript)
    .pipe(tslint())
    .pipe(tslint.report());
}

exports['lint:stylelint'] = function stylelint() {
  const stylelint = require('gulp-stylelint');
  return gulp.src(sources.scss)
    .pipe(stylelint());
}

exports.lint = gulp.parallel(exports['lint:tslint'], exports['lint:stylelint']);

exports['test:mocha'] = function mocha() {
  const mocha = require('./gulp-mocha');
  return gulp.src('./test/**/*.spec.{j,t}s')
    .pipe(mocha());
}

exports.test = gulp.parallel(exports['test:mocha']);

exports.assemble = function assemble() {
  const dependencies = ((folder, package, packageLock, excludes) => {
    const path = require('path');
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
  })('node_modules', require('./package.json'), require('./package-lock.json'), name => !/^@types\//.test(name));
  return gulp.src(dependencies, { base: 'node_modules'})
    .pipe(gulp.dest('dist'));
}

exports.build = gulp.parallel(exports.transpile, exports.assemble);

exports['package:zip'] = function zip() {
  const zip = require('gulp-zip');
  return gulp.src('./**/*')
    .pipe(ignore([
      '*.zip',
      '.*',
      'client_secret_*.json',
      'coverage',
      'coverage/**/*',
      'gulpfile.js',
      'node_modules',
      'node_modules/**/*',
      'package{,-lock}.json',
      'stylelint.config.js',
      'test',
      'test/**/*',
      'tsconfig.json',
      'tslint.json',
    ]))
    .pipe(zip(`${package.name}-${package.version}.zip`))
    .pipe(gulp.dest('.'));
}

exports.package = gulp.series(exports.build, exports['package:zip']);

const webstore = require('./gulp-chrome-web-store')(
  'pgpnkghddnfoopjapnlklllpjknnibkn',
  process.env.CHROME_WEB_STORE_API_CREDENTIAL,
  process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE,
);

exports.publish = function publish() {
  return webstore.publish();
}

exports['deploy:upload'] = function upload() {
  return gulp.src(`${package.name}-${package.version}.zip`)
    .pipe(webstore.upload());
}

exports.deploy = gulp.series(exports.package, exports['deploy:upload']);

exports['watch:typescript'] = function watchTypeScript() {
  const task = gulp.parallel(exports['transpile:tsc'], exports['lint:tslint']);
  return gulp.watch(sources.typescript, task);
}

exports['watch:scss'] = function watchSCSS() {
  const task = gulp.parallel(exports['transpile:sass'], exports['lint:stylelint']);
  return gulp.watch(sources.scss, task);
}

exports.watch = gulp.parallel(exports['watch:typescript'], exports['watch:scss']);

exports.default = exports.build;
