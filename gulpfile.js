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

exports.test = () => {

}

exports.build = gulp.series(exports.lint, exports.transpile);

exports.package = () => {
  const zip = require('gulp-zip');
  return gulp.src('./**/*')
    .pipe(ignore([
      '.*',
      'gulpfile.js',
      'node_modules',
      'node_modules/**/*',
      'package{,-lock}.json',
      'stylelint.config.js',
      'tsconfig.json',
      'tslint.json',
    ]))
    .pipe(zip(`${package.name}-${package.version}.zip`))
    .pipe(gulp.dest('.'));
}

exports.publish = () => {

}

exports['watch:tsc'] = function watchTsc() {
  return gulp.watch(sources.typescript, exports['transpile:tsc']);
}

exports['watch:sass'] = function watchSass() {
  return gulp.watch(sources.scss, exports['transpile:sass']);
}

exports.watch = gulp.parallel(exports['watch:tsc'], exports['watch:sass']);

exports.default = exports.build;
