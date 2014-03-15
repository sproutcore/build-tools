// enhance_env is adding stuff that didn't come with assigning the loaded SC to the runtime environment

SC.mixin(Function.prototype,
/** @lends Function.prototype */ {

  /**
    Indicates that the function should be treated as a computed property.

    Computed properties are methods that you want to treat as if they were
    static properties.  When you use get() or set() on a computed property,
    the object will call the property method and return its value instead of
    returning the method itself.  This makes it easy to create "virtual
    properties" that are computed dynamically from other properties.

    Consider the following example:

    {{{
      contact = SC.Object.create({

        firstName: "Charles",
        lastName: "Jolley",

        // This is a computed property!
        fullName: function() {
          return this.getEach('firstName','lastName').compact().join(' ') ;
        }.property('firstName', 'lastName'),

        // this is not
        getFullName: function() {
          return this.getEach('firstName','lastName').compact().join(' ') ;
        }
      });

      contact.get('firstName') ;
      --> "Charles"

      contact.get('fullName') ;
      --> "Charles Jolley"

      contact.get('getFullName') ;
      --> function()
    }}}

    Note that when you get the fullName property, SproutCore will call the
    fullName() function and return its value whereas when you get() a property
    that contains a regular method (such as getFullName above), then the
    function itself will be returned instead.

    h2. Using Dependent Keys

    Computed properties are often computed dynamically from other member
    properties.  Whenever those properties change, you need to notify any
    object that is observing the computed property that the computed property
    has changed also.  We call these properties the computed property is based
    upon "dependent keys".

    For example, in the contact object above, the fullName property depends on
    the firstName and lastName property.  If either property value changes,
    any observer watching the fullName property will need to be notified as
    well.

    You inform SproutCore of these dependent keys by passing the key names
    as parameters to the property() function.  Whenever the value of any key
    you name here changes, the computed property will be marked as changed
    also.

    You should always register dependent keys for computed properties to
    ensure they update.

    h2. Using Computed Properties as Setters

    Computed properties can be used to modify the state of an object as well
    as to return a value.  Unlike many other key-value system, you use the
    same method to both get and set values on a computed property.  To
    write a setter, simply declare two extra parameters: key and value.

    Whenever your property function is called as a setter, the value
    parameter will be set.  Whenever your property is called as a getter the
    value parameter will be undefined.

    For example, the following object will split any full name that you set
    into a first name and last name components and save them.

    {{{
      contact = SC.Object.create({

        fullName: function(key, value) {
          if (value !== undefined) {
            var parts = value.split(' ') ;
            this.beginPropertyChanges()
              .set('firstName', parts[0])
              .set('lastName', parts[1])
            .endPropertyChanges() ;
          }
          return this.getEach('firstName', 'lastName').compact().join(' ');
        }.property('firstName','lastName')

      }) ;

    }}}

    h2. Why Use The Same Method for Getters and Setters?

    Most property-based frameworks expect you to write two methods for each
    property but SproutCore only uses one. We do this because most of the time
    when you write a setter is is basically a getter plus some extra work.
    There is little added benefit in writing both methods when you can
    conditionally exclude part of it. This helps to keep your code more
    compact and easier to maintain.

    @param dependentKeys {String...} optional set of dependent keys
    @returns {Function} the declared function instance
  */
  property: function() {
    this.dependentKeys = SC.$A(arguments) ;
    var guid = SC.guidFor(this) ;
    this.cacheKey = "__cache__" + guid ;
    this.lastSetValueKey = "__lastValue__" + guid ;
    this.isProperty = true ;
    return this ;
  },

  /**
    You can call this method on a computed property to indicate that the
    property is cacheable (or not cacheable).  By default all computed
    properties are not cached.  Enabling this feature will allow SproutCore
    to cache the return value of your computed property and to use that
    value until one of your dependent properties changes or until you
    invoke propertyDidChange() and name the computed property itself.

    If you do not specify this option, computed properties are assumed to be
    not cacheable.

    @param {Boolean} aFlag optionally indicate cacheable or no, default true
    @returns {Function} reciever
  */
  cacheable: function(aFlag) {
    this.isProperty = true ;  // also make a property just in case
    if (!this.dependentKeys) this.dependentKeys = [] ;
    this.isCacheable = (aFlag === undefined) ? true : aFlag ;
    return this ;
  },

  /**
    Indicates that the computed property is volatile.  Normally SproutCore
    assumes that your computed property is idempotent.  That is, calling
    set() on your property more than once with the same value has the same
    effect as calling it only once.

    All non-computed properties are idempotent and normally you should make
    your computed properties behave the same way.  However, if you need to
    make your property change its return value everytime your method is
    called, you may chain this to your property to make it volatile.

    If you do not specify this option, properties are assumed to be
    non-volatile.

    @param {Boolean} aFlag optionally indicate state, default to true
    @returns {Function} receiver
  */
  idempotent: function(aFlag) {
    this.isProperty = true;  // also make a property just in case
    if (!this.dependentKeys) this.dependentKeys = [] ;
    this.isVolatile = (aFlag === undefined) ? true : aFlag ;
    return this ;
  },

  /**
    Declare that a function should observe an object at the named path.  Note
    that the path is used only to construct the observation one time.

    @returns {Function} receiver
  */
  observes: function(propertyPaths) {
    // sort property paths into local paths (i.e just a property name) and
    // full paths (i.e. those with a . or * in them)
    var loc = arguments.length, local = null, paths = null ;
    while(--loc >= 0) {
      var path = arguments[loc] ;
      // local
      if ((path.indexOf('.')<0) && (path.indexOf('*')<0)) {
        if (!local) local = this.localPropertyPaths = [] ;
        local.push(path);

      // regular
      } else {
        if (!paths) paths = this.propertyPaths = [] ;
        paths.push(path) ;
      }
    }
    return this ;
  }

});

// ..........................................................
// STRING ENHANCEMENT
//

// Interpolate string. looks for %@ or %@1; to control the order of params.
/**
  Apply formatting options to the string.  This will look for occurrences
  of %@ in your string and substitute them with the arguments you pass into
  this method.  If you want to control the specific order of replacement,
  you can add a number after the key as well to indicate which argument
  you want to insert.

  Ordered insertions are most useful when building loc strings where values
  you need to insert may appear in different orders.

  h3. Examples

  {{{
    "Hello %@ %@".fmt('John', 'Doe') => "Hello John Doe"
    "Hello %@2, %@1".fmt('John', 'Doe') => "Hello Doe, John"
  }}}

  @param args {Object...} optional arguments
  @returns {String} formatted string
*/
String.prototype.fmt = function() {
  // first, replace any ORDERED replacements.
  var args = arguments,
      idx  = 0; // the current index for non-numerical replacements
  return this.replace(/%@([0-9]+)?/g, function(s, argIndex) {
    argIndex = (argIndex) ? parseInt(argIndex,0)-1 : idx++ ;
    s =args[argIndex];
    return ((s===null) ? '(null)' : (s===undefined) ? '' : s).toString();
  }) ;
};

/**
  Localizes the string.  This will look up the reciever string as a key
  in the current Strings hash.  If the key matches, the loc'd value will be
  used.  The resulting string will also be passed through fmt() to insert
  any variables.

  @param args {Object...} optional arguments to interpolate also
  @returns {String} the localized and formatted string.
*/
String.prototype.loc = function() {
  var str = SC.STRINGS[this] || this;
  return str.fmt.apply(str,arguments) ;
};



/**
  Splits the string into words, separated by spaces. Empty strings are
  removed from the results.

  @returns {Array} an array of non-empty strings
*/
String.prototype.w = function() {
  var ary = [], ary2 = this.split(' '), len = ary2.length, str, idx=0;
  for (idx=0; idx<len; ++idx) {
    str = ary2[idx] ;
    if (str.length !== 0) ary.push(str) ; // skip empty strings
  }
  return ary ;
};

//
// DATE ENHANCEMENT
//
if (!Date.now) {
  Date.now = function() {
    return new Date().getTime() ;
  };
}

// Array enhancement
// Add SC.Array to the built-in array before we add SC.Enumerable to SC.Array
// since built-in Array's are already enumerable.
SC.mixin(Array.prototype, SC.Array) ;

// Some browsers do not support indexOf natively.  Patch if needed
if (!Array.prototype.indexOf) Array.prototype.indexOf = SC.Array.indexOf;

// Some browsers do not support lastIndexOf natively.  Patch if needed
if (!Array.prototype.lastIndexOf) {
  Array.prototype.lastIndexOf = SC.Array.lastIndexOf;
}

// ......................................................
// ARRAY SUPPORT
//
// Implement the same enhancements on Array.  We use specialized methods
// because working with arrays are so common.
(function() {
  SC.mixin(Array.prototype, {

    // primitive for array support.
    replace: function(idx, amt, objects) {
      if (this.isFrozen) throw SC.FROZEN_ERROR ;
      if (!objects || objects.length === 0) {
        this.splice(idx, amt) ;
      } else {
        var args = [idx, amt].concat(objects) ;
        this.splice.apply(this,args) ;
      }

      // if we replaced exactly the same number of items, then pass only the
      // replaced range.  Otherwise, pass the full remaining array length
      // since everything has shifted
      var len = objects ? (objects.get ? objects.get('length') : objects.length) : 0;
      this.enumerableContentDidChange(idx, amt, len - amt) ;
      return this ;
    },

    // If you ask for an unknown property, then try to collect the value
    // from member items.
    unknownProperty: function(key, value) {
      var ret = this.reducedProperty(key, value) ;
      if ((value !== undefined) && ret === undefined) {
        ret = this[key] = value;
      }
      return ret ;
    },

    flatten: function() {
      var ret = [];
      this.forEach(function(k){
        if(k && k instanceof Array){
          ret = ret.concat(k.flatten());
        }
        else ret.push(k);
      });
      return ret;
    }

  });

  // If browser did not implement indexOf natively, then override with
  // specialized version
  var indexOf = Array.prototype.indexOf;
  if (!indexOf || (indexOf === SC.Array.indexOf)) {
    Array.prototype.indexOf = function(object, startAt) {
      var idx, len = this.length;

      if (startAt === undefined) startAt = 0;
      else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
      if (startAt < 0) startAt += len;

      for(idx=startAt;idx<len;idx++) {
        if (this[idx] === object) return idx ;
      }
      return -1;
    } ;
  }

  var lastIndexOf = Array.prototype.lastIndexOf ;
  if (!lastIndexOf || (lastIndexOf === SC.Array.lastIndexOf)) {
    Array.prototype.lastIndexOf = function(object, startAt) {
      var idx, len = this.length;

      if (startAt === undefined) startAt = len-1;
      else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
      if (startAt < 0) startAt += len;

      for(idx=startAt;idx>=0;idx--) {
        if (this[idx] === object) return idx ;
      }
      return -1;
    };
  }

})();

SC.mixin(Array.prototype, SC.Reducers) ;
Array.prototype.isEnumerable = true ;

// ......................................................
// ARRAY SUPPORT
//

// Implement the same enhancements on Array.  We use specialized methods
// because working with arrays are so common.
(function() {

  // These methods will be applied even if they already exist b/c we do it
  // better.
  var alwaysMixin = {

    // this is supported so you can get an enumerator.  The rest of the
    // methods do not use this just to squeeze every last ounce of perf as
    // possible.
    nextObject: SC.Enumerable.nextObject,
    enumerator: SC.Enumerable.enumerator,
    firstObject: SC.Enumerable.firstObject,
    lastObject: SC.Enumerable.lastObject,
    sortProperty: SC.Enumerable.sortProperty,

    // see above...
    mapProperty: function(key) {
      var len = this.length ;
      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret[idx] = next ? (next.get ? next.get(key) : next[key]) : null;
      }
      return ret ;
    },

    filterProperty: function(key, value) {
      var len = this.length ;
      var ret  = [],idx,next,cur,matched;
      for(idx=0;idx<len;idx++) {
        next = this[idx] ;
        cur = next ? (next.get ? next.get(key) : next[key]) : null;
        matched = (value === undefined) ? !!cur : SC.isEqual(cur, value);
        if (matched) ret.push(next) ;
      }
      return ret ;
    },

    //returns a matrix
    groupBy: function(key) {
      var len = this.length,
          ret = [],
          grouped = [],
          keyValues = [],
          idx,len2,next,cur;

      for(idx=0;idx<len;idx++) {
        next = this[idx] ;
        cur = next ? (next.get ? next.get(key) : next[key]) : null;
        if(SC.none(grouped[cur])){ grouped[cur] = []; keyValues.push(cur); }
        grouped[cur].push(next);
      }
      for(idx=0,len2=keyValues.length; idx < len2; idx++){
        ret.push(grouped[keyValues[idx]]);
      }
      return ret ;
    },


    find: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var next, ret = null, found = false;
      for(var idx=0;idx<len && !found;idx++) {
        next = this[idx] ;
        if(found = callback.call(target, next, idx, this)) ret = next ;
      }
      next = null;
      return ret ;
    },

    findProperty: function(key, value) {
      var len = this.length ;
      var next, cur, found=false, ret=null;
      for(var idx=0;idx<len && !found;idx++) {
        cur = (next=this[idx]) ? (next.get ? next.get(key): next[key]):null;
        found = (value === undefined) ? !!cur : SC.isEqual(cur, value);
        if (found) ret = next ;
      }
      next=null;
      return ret ;
    },

    everyProperty: function(key, value) {
      var len = this.length ;
      var ret  = true;
      for(var idx=0;ret && (idx<len);idx++) {
        var next = this[idx] ;
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      }
      return ret ;
    },

    someProperty: function(key, value) {
      var len = this.length ;
      var ret  = false;
      for(var idx=0; !ret && (idx<len); idx++) {
        var next = this[idx] ;
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      }
      return ret ;  // return the invert
    },

    invoke: function(methodName) {
      var len = this.length ;
      if (len <= 0) return [] ; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [] ;
      var alen = arguments.length ;
      if (alen > 1) {
        for(idx=1;idx<alen;idx++) args.push(arguments[idx]) ;
      }

      // call invoke
      var ret = [] ;
      for(idx=0;idx<len;idx++) {
        var next = this[idx] ;
        var method = next ? next[methodName] : null ;
        if (method) ret[idx] = method.apply(next, args) ;
      }
      return ret ;
    },

    invokeWhile: function(targetValue, methodName) {
      var len = this.length ;
      if (len <= 0) return null ; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [] ;
      var alen = arguments.length ;
      if (alen > 2) {
        for(idx=2;idx<alen;idx++) args.push(arguments[idx]) ;
      }

      // call invoke
      var ret = targetValue ;
      for(idx=0;(ret === targetValue) && (idx<len);idx++) {
        var next = this[idx] ;
        var method = next ? next[methodName] : null ;
        if (method) ret = method.apply(next, args) ;
      }
      return ret ;
    },

    toArray: function() {
      var len = this.length ;
      if (len <= 0) return [] ; // nothing to invoke....

      // call invoke
      var ret = [] ;
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret.push(next) ;
      }
      return ret ;
    },

    getEach: function(key) {
      var ret = [];
      var len = this.length ;
      var idx,obj;
      for(idx=0;idx<len;idx++) {
        obj = this[idx];
        ret[idx] = obj ? (obj.get ? obj.get(key) : obj[key]) : null;
      }
      return ret ;
    },

    setEach: function(key, value) {
      var len = this.length;
      for(var idx=0;idx<len;idx++) {
        var obj = this[idx];
        if (obj) {
          if (obj.set) {
            obj.set(key, value);
          } else obj[key] = value ;
        }
      }
      return this ;
    }

  };

  // These methods will only be applied if they are not already defined b/c
  // the browser is probably getting it.
  var mixinIfMissing = {

    forEach: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        callback.call(target, next, idx, this);
      }
      return this ;
    },

    map: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        ret[idx] = callback.call(target, next, idx, this) ;
      }
      return ret ;
    },

    filter: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = [];
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;
        if(callback.call(target, next, idx, this)) ret.push(next) ;
      }
      return ret ;
    },

    every: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = true;
      for(var idx=0;ret && (idx<len);idx++) {
        var next = this[idx] ;
        if(!callback.call(target, next, idx, this)) ret = false ;
      }
      return ret ;
    },

    some: function(callback, target) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;
      if (target === undefined) target = null;

      var ret  = false;
      for(var idx=0;(!ret) && (idx<len);idx++) {
        var next = this[idx] ;
        if(callback.call(target, next, idx, this)) ret = true ;
      }
      return ret ;
    },

    reduce: function(callback, initialValue, reducerProperty) {
      if (typeof callback !== "function") throw new TypeError() ;
      var len = this.length ;

      // no value to return if no initial value & empty
      if (len===0 && initialValue === undefined) throw new TypeError();

      var ret  = initialValue;
      for(var idx=0;idx<len;idx++) {
        var next = this[idx] ;

        // while ret is still undefined, just set the first value we get as
        // ret. this is not the ideal behavior actually but it matches the
        // FireFox implementation... :(
        if (next !== null) {
          if (ret === undefined) {
            ret = next ;
          } else {
            ret = callback.call(null, ret, next, idx, this, reducerProperty);
          }
        }
      }

      // uh oh...we never found a value!
      if (ret === undefined) throw new TypeError() ;
      return ret ;
    }
  };

  // Apply methods if missing...
  for(var key in mixinIfMissing) {
    if (!mixinIfMissing.hasOwnProperty(key)) continue ;

    // The mixinIfMissing methods should be applied if they are not defined.
    // If Prototype 1.6 is included, some of these methods will be defined
    // already, but we want to override them anyway in this special case
    // because our version is faster and functionally identitical.
    if (!Array.prototype[key] || ((typeof Prototype === 'object') && Prototype.Version.match(/^1\.6/))) {
      Array.prototype[key] = mixinIfMissing[key] ;
    }
  }

  // Apply other methods...
  SC.mixin(Array.prototype, alwaysMixin) ;

})() ;

SC.mixin(Array.prototype, SC.Freezable);
SC.mixin(Array.prototype, SC.Observable) ;

