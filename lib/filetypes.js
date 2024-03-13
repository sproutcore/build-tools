/*globals BT*/

sc_require('file_types/script');
sc_require('file_types/json');
sc_require('file_types/css');
sc_require('file_types/scss');
sc_require('file_types/image');
sc_require('file_types/module_script');
sc_require('file_types/template');
sc_require('file_types/index_html');
sc_require('file_types/html');

BT.projectManager.registerFileClass("js", BT.ScriptFile);
BT.projectManager.registerFileClass("json", BT.JSONFile);
BT.projectManager.registerFileClass("css", BT.CSSFile);
BT.projectManager.registerFileClass("scss", BT.SCSSFile);
BT.projectManager.registerFileClass("ejs", BT.TemplateFile);
BT.projectManager.registerFileClass("html", BT.HTMLFile);

BT.projectManager.registerFileClass("png", BT.PNGFile);
BT.projectManager.registerFileClass("jpg", BT.JPGFile);
BT.projectManager.registerFileClass("gif", BT.GIFFile);
BT.projectManager.registerFileClass("swf", BT.SWFFile);
BT.projectManager.registerFileClass('woff', BT.WOFFFile);
BT.projectManager.registerFileClass('woff2', BT.WOFF2File);
BT.projectManager.registerFileClass('ttf', BT.TTFFile);
BT.projectManager.registerFileClass('otf', BT.OTFFile);
BT.projectManager.registerFileClass('eot', BT.EOTFile);
BT.projectManager.registerFileClass('svg', BT.SVGFile);
BT.projectManager.registerFileClass('ico', BT.ICOFile);
