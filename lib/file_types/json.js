/*jshint node:true */
/*globals BT*/

BT.JSONFile = BT.File.extend({
  extension: "json",
  contentType: 'application/json',
  isResource: true
});


// targets: function(){
//   return {
//     kind: 'framework',
//     name: "/" + this.get('url'),
//     link_docs: '',
//     link_root: this.get('url'),
//     link_tests: this.get('url') + "/tests/-index.json"
//   };
// }.property().cacheable(),
//
// //   targets: function(){
//     var me = this;
//     var ret = this._frameworks.map(function(fw){
//       var r = fw.get('targets');
//       r.parent = "/" + me.name;
//       return r;
//     });
//     return ret;
//   }.property().cacheable(),
BT.TargetJSONFile = BT.JSONFile.extend({
  framework: null,
  path: null,
  kind: 'framework',
  parseContent: function () {
    var fw = this.get('framework');
    var r;
    if (fw.isWrapperFramework) { // this could be complex
      r = "";
    }
    else {
      r = {
        kind: this.get('kind'),
        name: fw.get('fullname'),
        link_docs: "",
        link_root: url,
        link_tests: fwurl + "tests/-index.json"
      };
    }
    var url = this.get('url');
    var fwurl = url.substr(0, url.indexOf(this.get('basename')));
    //var
    return JSON.stringify(r);
  }
});