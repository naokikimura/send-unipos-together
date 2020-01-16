const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');

exports['transpile:tsc'] = function tsc() {
  const ts = require('gulp-typescript');
  return gulp.src('src/**/*.{j,t}s{,x}')
    .pipe(sourcemaps.init())
    .pipe(ts.createProject('tsconfig.json')())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
}

exports['transpile:sass'] = function sass() {
  const sass = require('gulp-sass');
  return gulp.src('src/**/*.{,s}css')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
}

exports.transpile = gulp.parallel(exports['transpile:sass'], exports['transpile:tsc']);

exports['lint:tslint'] = function tslint() {
  const tslint = require("gulp-tslint");
  return gulp.src('src/**/*.{j,t}s{,x}')
    .pipe(tslint())
    .pipe(tslint.report());
}

exports['lint:stylelint'] = function stylelint() {
  const stylelint = require('gulp-stylelint');
  return gulp.src('src/**/*.{,s}css')
    .pipe(stylelint());
}

exports.lint = gulp.parallel(exports['lint:tslint'], exports['lint:stylelint']);

exports.test = () => {

}

exports.build = () => {

}

exports.package = () => {

}

exports.publish = () => {

}
