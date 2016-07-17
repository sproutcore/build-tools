sc_require('../mixins/content_filters');

BT.CodeFile = BT.File.extend(BT.ContentFiltersMixin,
{
  isCode: true,

  content: null,

  contentObservers: null,

  updateContent: function()
  {
    var raw = this.get('rawContent');
    this.set('content', raw ? this.filterContent(raw.toString()) : null);

    var deps = this.getPath('contentObservers.content');
    if(deps) for(var i = 0, len = deps.get('length'); i < len; ++i) deps[i].updateContent();
  }.observes('rawContent'),
})
