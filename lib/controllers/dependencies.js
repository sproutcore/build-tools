
BT.DependenciesController = SC.ArrayController.extend({
  
  // prevent a weird error in SC.ArrayController#_scac_observableContent
  orderBy: 'null',

  init: function() {
    sc_super();

    var that = this,
      set = SC.Set.create();

    set.addSetObserver({
      didAddItem: function(set, item) {
        item.addObserver('isDestroyed', that, 'didDestroyFile');
      },
      didRemoveItem: function(set, item) {
        item.removeObserver('isDestroyed', that, 'didDestroyFile');
      }
    })

    this.set('content', set);
  },

  didDestroyFile: function(item) {
    this.removeObject(item);
  },

  addObjects: function(items) {
    items.forEach(function(item) {
      this.addObject(item);
    }, this);
  },

});

