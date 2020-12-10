const terser = require('terser');

module.exports = function init(connection) {
  return async function minifySync([files, options]) {
    try {
      return await terser.minify(files, options);
    }
    catch (error) {
      return {error};
    }
  };
}