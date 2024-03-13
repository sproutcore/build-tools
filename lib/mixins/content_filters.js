BT.ContentFiltersMixin =
{
  hasContentFiltersSupport: true,

  /**
    Array of content filters.
    Example filter configuration:
    ```contentFilters: [
      function(content) { ... },  // anonymous function will be called
      'methodName',  // this.methodName(content) method will be called
      ['methodName', param1, param2, ...], // this.methodName(content, param1, param2) will be called with arbitrary number of parameters
      [['SC.Object', 'methodName'], param1, param2, ...] // SC.Object.methodName(content)
      [[SC.Object, function(content, param1) {}], param1, ...],
      SC.Object.create(BT.ContentFilterMixin),  // Apply filters from another object
    ],```
    A filter may return `null` or an empty string to stop further filtering.
  */
  contentFilters: [],

  filterContent: function(content)
  {
    var filters = this.get('contentFilters');
    for(var i = 0, len = filters.get('length'); i < len; ++i)
    {
      var filter = filters[i];
      if(filter.hasContentFiltersSupport)
      {
        content = filter.filterContent(content);
      }
      else
      {
        switch(SC.typeOf(filter))
        {
          case SC.T_STRING: content = this[filter](content); break;
          case SC.T_FUNCTION: content = filter.call(this, content); break;
          case SC.T_ARRAY: {
            var target = this, handler = filter.shift();
            if(SC.T_ARRAY === SC.typeOf(handler))
            {
              target = handler.shift();
              handler = handler.shift();
            }
            if(SC.T_STRING === SC.typeOf(target)) target = SC.objectForPropertyPath(target);
            filter.unshift(content);
            if(SC.T_STRING === SC.typeOf(handler)) content = target[handler].apply(target, filter);
            else handler.apply(target, filter);
          }
          break;
        }
      }
      if(SC.empty(content)) break;
    }
    return content;
  },
}
