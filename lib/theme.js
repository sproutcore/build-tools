/*globals BT*/
BT.Theme = BT.Framework.extend({

  /**
    Walk like a duck.

    @type Boolean
    @default true
  */
  isTheme: true,

  /**
    The name of the CSS theme.

    @type String
    @default true
  */
  cssTheme: null,

  /**
    The path of the main SCSS variables file relative to the resources directory.

    @type String
    @default '_variables.css'
  */
  scssVariablesPath: '_variables.css'

});
