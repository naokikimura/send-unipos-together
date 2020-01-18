module.exports = function Plugin(options) {
  const stream = require('stream');
  const Mocha = require('mocha');
  const MochaOptions = require('mocha/lib/cli/options');
  const mochaOptions = typeof options === 'object' ? options : MochaOptions.loadOptions(options);
  (Array.isArray(mochaOptions.require) ? mochaOptions.require : [mochaOptions.require]).filter(id => id).forEach(require);
  const mocha = new Mocha(mochaOptions);
  return new stream.Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      mocha.addFile(file.path);
      this.push(file);
      callback();
    },
    final(callback) {
      mocha.run(function (failures) {
        callback();
      });
    }
  });
}
