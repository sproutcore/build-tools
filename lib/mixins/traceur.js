/*globals BT*/
BT.TraceurMixin = {

  handleTraceur: function (str) {
   if (this.getPath('framework.enableTraceur') || (this.getPath('framework.belongsTo.enableTraceur') && this.getPath('framework.isApp')) || str.indexOf('bt_traceur') > -1) {
      str = str.replace(/(bt_traceur\(.*\)[,;]?)/g, "");

      var traceur = require('traceur');
      try {
        str = traceur.compile(str, {
          // https://github.com/google/traceur-compiler/blob/master/src/Options.js#L25
          annotations: false,
          arrayComprehension: false,
          arrowFunctions: true,
          asyncFunctions: false,
          blockBinding: true,
          classes: false,
          commentCallback: false,
          computedPropertyNames: true,
          debug: false,
          debugNames: false,
          defaultParameters: true,
          destructuring: true,
          exponentiation: false,
          forOf: true,
          freeVariableChecker: false,
          generatorComprehension: false,
          generators: true,
          lowResolutionSourceMap: false,
          inputSourceMap: false,
          memberVariables: false,
          moduleName: false,
          modules: 'bootstrap',
          numericLiterals: true,
          outputLanguage: 'es5',
          propertyMethods: true,
          propertyNameShorthand: true,
          referrer: '',
          require: false,
          restParameters: true,
          script: true, // Prevent a module wrapper from being added.
          sourceMaps: false,
          spread: true,
          symbols: false,
          templateLiterals: true,
          typeAssertionModule: null,
          typeAssertions: false,
          types: false,
          unicodeEscapeSequences: true,
          unicodeExpressions: true,
          validate: false,
        }, this.get('path'));
      }
      catch(e) {
        BT.Logger.error('Traceur compiler error with file %@: %@'.fmt(this.get('path'), e));
      }
    }

    return str;
  },

};

