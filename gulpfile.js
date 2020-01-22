const gulp = require('gulp');
const package = require('./package.json');

const sourcemaps = true;

const sources = {
  typescript: 'src/**/*.{j,t}s{,x}',
  scss: 'src/**/*.{,s}css',
}

function spawn(command, args = [], options) {
  const child = require('child_process')
    .spawn(command, args.filter(e => e === 0 || e), options);
  if (child.stdout) child.stdout.pipe(process.stdout);
  if (child.stderr) child.stderr.pipe(process.stderr);
  return child;
}

exports['transpile:tsc'] = function tsc() {
  const options = ['--pretty', sourcemaps ? '--sourceMap' : undefined];
  return spawn('tsc', options);
}

exports['transpile:sass'] = function sass() {
  const options = [sourcemaps ? '--source-map' : undefined];
  return spawn('sass', ['src/:dist/'].concat(options));
}

exports['lint:tslint'] = function tslint() {
  return spawn('tslint', ['-p', 'tsconfig.json']);
}

exports['lint:stylelint'] = function stylelint() {
  return spawn('stylelint', [sources.scss]);
}

exports['test:mocha'] = function mocha() {
  const options = process.env.CI
    ? ['-R', 'xunit', '-O', 'output=./reports/xunit/test-results.xml']
    : ['-c'];
  return spawn('mocha', options);
}

exports.assemble = function assemble() {
  const dependencies = require('gulp-package-dependencies');
  const path = require('path');
  return dependencies({
    excludes: name => !/^@types\//.test(name),
    glob: name => {
      switch (name) {
        case 'material-design-icons': return 'iconfont/**/*';
        default: return '**/*';
      }
    }
  })
    .pipe(gulp.dest('dist'));
}

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

const webstore = require('gulp-chrome-web-store')(
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

exports['watch:typescript'] = function watchTypeScript() {
  const task = gulp.parallel(exports['transpile:tsc'], exports['lint:tslint']);
  return gulp.watch(sources.typescript, task);
}

exports['watch:scss'] = function watchSCSS() {
  const task = gulp.parallel(exports['transpile:sass'], exports['lint:stylelint']);
  return gulp.watch(sources.scss, task);
}

exports.lint = gulp.parallel(exports['lint:tslint'], exports['lint:stylelint']);
exports.transpile = gulp.parallel(exports['transpile:sass'], exports['transpile:tsc']);
exports.build = gulp.parallel(exports.transpile, exports.assemble);
exports.test = gulp.series(exports.build, exports['test:mocha']);
exports.package = gulp.series(exports.build, exports['package:zip']);
exports.deploy = gulp.series(exports.package, exports['deploy:upload']);
exports.watch = gulp.parallel(exports['watch:typescript'], exports['watch:scss']);
exports.default = exports.build;
