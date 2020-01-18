const gulp = require('gulp');
const package = require('./package.json');

const sourcemaps = true;

const sources = {
  typescript: 'src/**/*.{j,t}s{,x}',
  scss: 'src/**/*.{,s}css',
}

exports['transpile:tsc'] = function tsc() {
  const ts = require('gulp-typescript');
  return gulp.src(sources.typescript, { sourcemaps })
    .pipe(ts.createProject('tsconfig.json')())
    .pipe(gulp.dest('dist', { sourcemaps } ));
}

exports['transpile:sass'] = function sass() {
  const sass = require('gulp-sass');
  return gulp.src(sources.scss, { sourcemaps })
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('dist', { sourcemaps }));
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
  const dependencies = require('./gulp-dependencies');
  return dependencies({ excludes: name => !/^@types\//.test(name) })
    .pipe(gulp.dest('dist'));
}

exports.build = gulp.parallel(exports.transpile, exports.assemble);

exports['package:zip'] = function zip() {
  const zip = require('gulp-zip');
  const ignore = [
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
  ];
  return gulp.src('./**/*', { ignore })
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
