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

exports['lint:eslint'] = function eslint() {
  const options = ['.', '--ext', '.js,.jsx,.ts,.tsx']
    .concat(process.env.CI ? ['-f', 'junit', '-o', './reports/eslint/test-result.xml'] : []);
  return spawn('eslint', options);
}

exports['lint:stylelint'] = async function stylelint() {
  if (process.env.CI) {
    const fs = require('fs');
    const util = require('util');
    await util.promisify(fs.mkdir)('./reports/stylelint/', { recursive: true });
  }
  const options = process.env.CI
    ? [
      '--custom-formatter',
      './node_modules/stylelint-junit-formatter',
      '-o',
      './reports/stylelint/test-result.xml',
    ]
    : [];
  const stdio = ['pipe', process.env.CI ? 'ignore' : 'pipe', 'pipe'];
  return spawn('stylelint', options.concat([sources.scss]), { stdio });
}

exports['test:mocha'] = function mocha() {
  const options = process.env.CI
    ? ['-R', 'xunit', '-O', 'output=./reports/mocha/test-result.xml']
    : ['-c'];
  return spawn('mocha', options);
}

exports.assemble = function assemble() {
  const dependencies = require('gulp-package-dependencies');
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

exports['pack:zip'] = function zip() {
  const zip = require('gulp-zip');
  const ignore = [
    '.*',
    'artifacts{,/**/*}',
    'coverage{,/**/*}',
    'gulpfile.js',
    'node_modules{,/**/*}',
    'package{,-lock}.json',
    'reports{,/**/*}',
    'stylelint.config.js',
    'test{,/**/*}',
    'tsconfig.json',
  ];
  return gulp.src('./**/*', { ignore })
    .pipe(zip(`${package.name}-${package.version}.zip`))
    .pipe(gulp.dest('./artifacts'));
}

const chromeWebstore = require('gulp-chrome-web-store')(
  process.env.CHROME_WEB_STORE_API_CREDENTIAL,
  process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE,
);
const item = chromeWebstore.item('pgpnkghddnfoopjapnlklllpjknnibkn');

exports.publish = function publish() {
  return item.publish();
}

exports['deploy:upload'] = function upload() {
  return gulp.src(`./artifacts/${package.name}-${package.version}.zip`)
    .pipe(item.upload());
}

exports['watch:typescript'] = function watchTypeScript() {
  const task = gulp.parallel(exports['transpile:tsc'], exports['lint:eslint']);
  return gulp.watch(sources.typescript, task);
}

exports['watch:scss'] = function watchSCSS() {
  const task = gulp.parallel(exports['transpile:sass'], exports['lint:stylelint']);
  return gulp.watch(sources.scss, task);
}

exports['version:unify'] = () => {
  const unify = require('gulp-unify-versions');
  return gulp.src('./manifest.json')
    .pipe(unify('./package.json'))
    .pipe(gulp.dest('./'));
}

exports.lint = gulp.parallel(exports['lint:eslint'], exports['lint:stylelint']);
exports.transpile = gulp.parallel(exports['transpile:sass'], exports['transpile:tsc']);
exports.build = gulp.parallel(exports.transpile, exports.assemble);
exports.test = gulp.series(exports.build, exports['test:mocha']);
exports.pack = gulp.series(exports.build, exports['pack:zip']);
exports.deploy = gulp.series(exports.pack, exports['deploy:upload']);
exports.watch = gulp.parallel(exports['watch:typescript'], exports['watch:scss']);
exports.default = exports.build;
