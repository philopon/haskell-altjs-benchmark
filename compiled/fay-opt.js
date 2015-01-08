/*******************************************************************************
 * Misc.
 */

// Workaround for missing functionality in IE 8 and earlier.
if( Object.create === undefined ) {
  Object.create = function( o ) {
    function F(){}
    F.prototype = o;
    return new F();
  };
}

// Insert properties of b in place into a.
function Fay$$objConcat(a,b){
  for (var p in b) if (b.hasOwnProperty(p)){
    a[p] = b[p];
  }
  return a;
}

/*******************************************************************************
 * Thunks.
 */

// Force a thunk (if it is a thunk) until WHNF.
function Fay$$_(thunkish,nocache){
  while (thunkish instanceof Fay$$$) {
    thunkish = thunkish.force(nocache);
  }
  return thunkish;
}

// Apply a function to arguments (see method2 in Fay.hs).
function Fay$$__(){
  var f = arguments[0];
  for (var i = 1, len = arguments.length; i < len; i++) {
    f = (f instanceof Fay$$$? Fay$$_(f) : f)(arguments[i]);
  }
  return f;
}

// Thunk object.
function Fay$$$(value){
  this.forced = false;
  this.value = value;
}

// Force the thunk.
Fay$$$.prototype.force = function(nocache) {
  return nocache ?
    this.value() :
    (this.forced ?
     this.value :
     (this.value = this.value(), this.forced = true, this.value));
};


function Fay$$seq(x) {
  return function(y) {
    Fay$$_(x,false);
    return y;
  }
}

function Fay$$seq$36$uncurried(x,y) {
  Fay$$_(x,false);
  return y;
}

/*******************************************************************************
 * Monad.
 */

function Fay$$Monad(value){
  this.value = value;
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then(a){
  return function(b){
    return Fay$$bind(a)(function(_){
      return b;
    });
  };
}

// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
// >>
function Fay$$then$36$uncurried(a,b){
  return Fay$$bind$36$uncurried(a,function(_){ return b; });
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind(m){
  return function(f){
    return new Fay$$$(function(){
      var monad = Fay$$_(m,true);
      return Fay$$_(f)(monad.value);
    });
  };
}

// >>=
// This is used directly from Fay, but can be rebound or shadowed. See primOps in Types.hs.
function Fay$$bind$36$uncurried(m,f){
  return new Fay$$$(function(){
    var monad = Fay$$_(m,true);
    return Fay$$_(f)(monad.value);
  });
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$$_return(a){
  return new Fay$$Monad(a);
}

// Allow the programmer to access thunk forcing directly.
function Fay$$force(thunk){
  return function(type){
    return new Fay$$$(function(){
      Fay$$_(thunk,type);
      return new Fay$$Monad(Fay$$unit);
    })
  }
}

// This is used directly from Fay, but can be rebound or shadowed.
function Fay$$return$36$uncurried(a){
  return new Fay$$Monad(a);
}

// Unit: ().
var Fay$$unit = null;

/*******************************************************************************
 * Serialization.
 * Fay <-> JS. Should be bijective.
 */

// Serialize a Fay object to JS.
function Fay$$fayToJs(type,fayObj){
  var base = type[0];
  var args = type[1];
  var jsObj;
  if(base == "action") {
    // A nullary monadic action. Should become a nullary JS function.
    // Fay () -> function(){ return ... }
    return function(){
      return Fay$$fayToJs(args[0],Fay$$_(fayObj,true).value);
    };

  }
  else if(base == "function") {
    // A proper function.
    return function(){
      var fayFunc = fayObj;
      var return_type = args[args.length-1];
      var len = args.length;
      // If some arguments.
      if (len > 1) {
        // Apply to all the arguments.
        fayFunc = Fay$$_(fayFunc,true);
        // TODO: Perhaps we should throw an error when JS
        // passes more arguments than Haskell accepts.

        // Unserialize the JS values to Fay for the Fay callback.
        if (args == "automatic_function")
        {
          for (var i = 0; i < arguments.length; i++) {
            fayFunc = Fay$$fayToJs(["automatic"], Fay$$_(fayFunc(Fay$$jsToFay(["automatic"],arguments[i])),true));
          }
          return fayFunc;
        }

        for (var i = 0, len = len; i < len - 1 && fayFunc instanceof Function; i++) {
          fayFunc = Fay$$_(fayFunc(Fay$$jsToFay(args[i],arguments[i])),true);
        }
        // Finally, serialize the Fay return value back to JS.
        var return_base = return_type[0];
        var return_args = return_type[1];
        // If it's a monadic return value, get the value instead.
        if(return_base == "action") {
          return Fay$$fayToJs(return_args[0],fayFunc.value);
        }
        // Otherwise just serialize the value direct.
        else {
          return Fay$$fayToJs(return_type,fayFunc);
        }
      } else {
        throw new Error("Nullary function?");
      }
    };

  }
  else if(base == "string") {
    return Fay$$fayToJs_string(fayObj);
  }
  else if(base == "list") {
    // Serialize Fay list to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[0],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    return arr;
  }
  else if(base == "tuple") {
    // Serialize Fay tuple to JavaScript array.
    var arr = [];
    fayObj = Fay$$_(fayObj);
    var i = 0;
    while(fayObj instanceof Fay$$Cons) {
      arr.push(Fay$$fayToJs(args[i++],fayObj.car));
      fayObj = Fay$$_(fayObj.cdr);
    }
    return arr;
  }
  else if(base == "defined") {
    fayObj = Fay$$_(fayObj);
    return fayObj instanceof Fay.FFI._Undefined
      ? undefined
      : Fay$$fayToJs(args[0],fayObj.slot1);
  }
  else if(base == "nullable") {
    fayObj = Fay$$_(fayObj);
    return fayObj instanceof Fay.FFI._Null
      ? null
      : Fay$$fayToJs(args[0],fayObj.slot1);
  }
  else if(base == "double" || base == "int" || base == "bool") {
    // Bools are unboxed.
    return Fay$$_(fayObj);
  }
  else if(base == "ptr" || base == "unknown")
    return fayObj;
  else if(base == "automatic" && fayObj instanceof Function) {
    return Fay$$fayToJs(["function", "automatic_function"], fayObj);
  }
  else if(base == "automatic" || base == "user") {
    fayObj = Fay$$_(fayObj);

    if(fayObj instanceof Fay$$Cons || fayObj === null){
      // Serialize Fay list to JavaScript array.
      var arr = [];
      while(fayObj instanceof Fay$$Cons) {
        arr.push(Fay$$fayToJs(["automatic"],fayObj.car));
        fayObj = Fay$$_(fayObj.cdr);
      }
      return arr;
    } else {
      var fayToJsFun = fayObj && fayObj.instance && Fay$$fayToJsHash[fayObj.instance];
      return fayToJsFun ? fayToJsFun(type,type[2],fayObj) : fayObj;
    }
  }

  throw new Error("Unhandled Fay->JS translation type: " + base);
}

// Stores the mappings from fay types to js objects.
// This will be populated by compiled modules.
var Fay$$fayToJsHash = {};

// Specialized serializer for string.
function Fay$$fayToJs_string(fayObj){
  // Serialize Fay string to JavaScript string.
  var str = "";
  fayObj = Fay$$_(fayObj);
  while(fayObj instanceof Fay$$Cons) {
    str += Fay$$_(fayObj.car);
    fayObj = Fay$$_(fayObj.cdr);
  }
  return str;
};
function Fay$$jsToFay_string(x){
  return Fay$$list(x)
};

// Special num/bool serializers.
function Fay$$jsToFay_int(x){return x;}
function Fay$$jsToFay_double(x){return x;}
function Fay$$jsToFay_bool(x){return x;}

function Fay$$fayToJs_int(x){return Fay$$_(x);}
function Fay$$fayToJs_double(x){return Fay$$_(x);}
function Fay$$fayToJs_bool(x){return Fay$$_(x);}

// Unserialize an object from JS to Fay.
function Fay$$jsToFay(type,jsObj){
  var base = type[0];
  var args = type[1];
  var fayObj;
  if(base == "action") {
    // Unserialize a "monadic" JavaScript return value into a monadic value.
    return new Fay$$Monad(Fay$$jsToFay(args[0],jsObj));
  }
  else if(base == "function") {
    // Unserialize a function from JavaScript to a function that Fay can call.
    // So
    //
    //    var f = function(x,y,z){ … }
    //
    // becomes something like:
    //
    //    function(x){
    //      return function(y){
    //        return function(z){
    //          return new Fay$$$(function(){
    //            return Fay$$jsToFay(f(Fay$$fayTojs(x),
    //                                  Fay$$fayTojs(y),
    //                                  Fay$$fayTojs(z))
    //    }}}}};
    var returnType = args[args.length-1];
    var funArgs = args.slice(0,-1);

    if (jsObj.length > 0) {
      var makePartial = function(args){
        return function(arg){
          var i = args.length;
          var fayArg = Fay$$fayToJs(funArgs[i],arg);
          var newArgs = args.concat([fayArg]);
          if(newArgs.length == funArgs.length) {
            return new Fay$$$(function(){
              return Fay$$jsToFay(returnType,jsObj.apply(this,newArgs));
            });
          } else {
            return makePartial(newArgs);
          }
        };
      };
      return makePartial([]);
    }
    else
      return function (arg) {
        return Fay$$jsToFay(["automatic"], jsObj(Fay$$fayToJs(["automatic"], arg)));
      };
  }
  else if(base == "string") {
    // Unserialize a JS string into Fay list (String).
    // This is a special case, when String is explicit in the type signature,
    // with `Automatic' a string would not be decoded.
    return Fay$$list(jsObj);
  }
  else if(base == "list") {
    // Unserialize a JS array into a Fay list ([a]).
    var serializedList = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedList.push(Fay$$jsToFay(args[0],jsObj[i]));
    }
    // Pop it all in a Fay list.
    return Fay$$list(serializedList);
  }
  else if(base == "tuple") {
    // Unserialize a JS array into a Fay tuple ((a,b,c,...)).
    var serializedTuple = [];
    for (var i = 0, len = jsObj.length; i < len; i++) {
      // Unserialize each JS value into a Fay value, too.
      serializedTuple.push(Fay$$jsToFay(args[i],jsObj[i]));
    }
    // Pop it all in a Fay list.
    return Fay$$list(serializedTuple);
  }
  else if(base == "defined") {
    return jsObj === undefined
      ? new Fay.FFI._Undefined()
      : new Fay.FFI._Defined(Fay$$jsToFay(args[0],jsObj));
  }
  else if(base == "nullable") {
    return jsObj === null
      ? new Fay.FFI._Null()
      : new Fay.FFI.Nullable(Fay$$jsToFay(args[0],jsObj));
  }
  else if(base == "int") {
    // Int are unboxed, so there's no forcing to do.
    // But we can do validation that the int has no decimal places.
    // E.g. Math.round(x)!=x? throw "NOT AN INTEGER, GET OUT!"
    fayObj = Math.round(jsObj);
    if(fayObj!==jsObj) throw "Argument " + jsObj + " is not an integer!";
    return fayObj;
  }
  else if (base == "double" ||
           base == "bool" ||
           base ==  "ptr" ||
           base ==  "unknown") {
    return jsObj;
  }
  else if(base == "automatic" && jsObj instanceof Function) {
    var type = [["automatic"]];
    for (var i = 0; i < jsObj.length; i++)
      type.push(["automatic"]);
    return Fay$$jsToFay(["function", type], jsObj);
  }
  else if(base == "automatic" && jsObj instanceof Array) {
    var list = null;
    for (var i = jsObj.length - 1; i >= 0; i--) {
      list = new Fay$$Cons(Fay$$jsToFay([base], jsObj[i]), list);
    }
    return list;
  }
  else if(base == "automatic" || base == "user") {
    if (jsObj && jsObj['instance']) {
      var jsToFayFun = Fay$$jsToFayHash[jsObj["instance"]];
      return jsToFayFun ? jsToFayFun(type,type[2],jsObj) : jsObj;
    }
    else
      return jsObj;
  }

  throw new Error("Unhandled JS->Fay translation type: " + base);
}

// Stores the mappings from js objects to fay types.
// This will be populated by compiled modules.
var Fay$$jsToFayHash = {};

/*******************************************************************************
 * Lists.
 */

// Cons object.
function Fay$$Cons(car,cdr){
  this.car = car;
  this.cdr = cdr;
}

// Make a list.
function Fay$$list(xs){
  var out = null;
  for(var i=xs.length-1; i>=0;i--)
    out = new Fay$$Cons(xs[i],out);
  return out;
}

// Built-in list cons.
function Fay$$cons(x){
  return function(y){
    return new Fay$$Cons(x,y);
  };
}

// List index.
// `list' is already forced by the time it's passed to this function.
// `list' cannot be null and `index' cannot be out of bounds.
function Fay$$index(index,list){
  for(var i = 0; i < index; i++) {
    list = Fay$$_(list.cdr);
  }
  return list.car;
}

// List length.
// `list' is already forced by the time it's passed to this function.
function Fay$$listLen(list,max){
  for(var i = 0; list !== null && i < max + 1; i++) {
    list = Fay$$_(list.cdr);
  }
  return i == max;
}

/*******************************************************************************
 * Numbers.
 */

// Built-in *.
function Fay$$mult(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) * Fay$$_(y);
    });
  };
}

function Fay$$mult$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) * Fay$$_(y);
  });

}

// Built-in +.
function Fay$$add(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) + Fay$$_(y);
    });
  };
}

// Built-in +.
function Fay$$add$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) + Fay$$_(y);
  });

}

// Built-in -.
function Fay$$sub(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) - Fay$$_(y);
    });
  };
}
// Built-in -.
function Fay$$sub$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) - Fay$$_(y);
  });

}

// Built-in /.
function Fay$$divi(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) / Fay$$_(y);
    });
  };
}

// Built-in /.
function Fay$$divi$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) / Fay$$_(y);
  });

}

/*******************************************************************************
 * Booleans.
 */

// Are two values equal?
function Fay$$equal(lit1, lit2) {
  // Simple case
  lit1 = Fay$$_(lit1);
  lit2 = Fay$$_(lit2);
  if (lit1 === lit2) {
    return true;
  }
  // General case
  if (lit1 instanceof Array) {
    if (lit1.length != lit2.length) return false;
    for (var len = lit1.length, i = 0; i < len; i++) {
      if (!Fay$$equal(lit1[i], lit2[i])) return false;
    }
    return true;
  } else if (lit1 instanceof Fay$$Cons && lit2 instanceof Fay$$Cons) {
    do {
      if (!Fay$$equal(lit1.car,lit2.car))
        return false;
      lit1 = Fay$$_(lit1.cdr), lit2 = Fay$$_(lit2.cdr);
      if (lit1 === null || lit2 === null)
        return lit1 === lit2;
    } while (true);
  } else if (typeof lit1 == 'object' && typeof lit2 == 'object' && lit1 && lit2 &&
             lit1.instance === lit2.instance) {
    for(var x in lit1) {
      if(!Fay$$equal(lit1[x],lit2[x]))
        return false;
    }
    return true;
  } else {
    return false;
  }
}

// Built-in ==.
function Fay$$eq(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$equal(x,y);
    });
  };
}

function Fay$$eq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$equal(x,y);
  });

}

// Built-in /=.
function Fay$$neq(x){
  return function(y){
    return new Fay$$$(function(){
      return !(Fay$$equal(x,y));
    });
  };
}

// Built-in /=.
function Fay$$neq$36$uncurried(x,y){

  return new Fay$$$(function(){
    return !(Fay$$equal(x,y));
  });

}

// Built-in >.
function Fay$$gt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) > Fay$$_(y);
    });
  };
}

// Built-in >.
function Fay$$gt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) > Fay$$_(y);
  });

}

// Built-in <.
function Fay$$lt(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) < Fay$$_(y);
    });
  };
}


// Built-in <.
function Fay$$lt$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) < Fay$$_(y);
  });

}


// Built-in >=.
function Fay$$gte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) >= Fay$$_(y);
    });
  };
}

// Built-in >=.
function Fay$$gte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) >= Fay$$_(y);
  });

}

// Built-in <=.
function Fay$$lte(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) <= Fay$$_(y);
    });
  };
}

// Built-in <=.
function Fay$$lte$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) <= Fay$$_(y);
  });

}

// Built-in &&.
function Fay$$and(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) && Fay$$_(y);
    });
  };
}

// Built-in &&.
function Fay$$and$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) && Fay$$_(y);
  });
  ;
}

// Built-in ||.
function Fay$$or(x){
  return function(y){
    return new Fay$$$(function(){
      return Fay$$_(x) || Fay$$_(y);
    });
  };
}

// Built-in ||.
function Fay$$or$36$uncurried(x,y){

  return new Fay$$$(function(){
    return Fay$$_(x) || Fay$$_(y);
  });

}

/*******************************************************************************
 * Mutable references.
 */

// Make a new mutable reference.
function Fay$$Ref(x){
  this.value = x;
}

// Write to the ref.
function Fay$$writeRef(ref,x){
  ref.value = x;
}

// Get the value from the ref.
function Fay$$readRef(ref,x){
  return ref.value;
}

/*******************************************************************************
 * Dates.
 */
function Fay$$date(str){
  return window.Date.parse(str);
}

/*******************************************************************************
 * Data.Var
 */

function Fay$$Ref2(val){
  this.val = val;
}

function Fay$$Sig(){
  this.handlers = [];
}

function Fay$$Var(val){
  this.val = val;
  this.handlers = [];
}

// Helper used by Fay$$setValue and for merging
function Fay$$broadcastInternal(self, val, force){
  var handlers = self.handlers;
  var exceptions = [];
  for(var len = handlers.length, i = 0; i < len; i++) {
    try {
      force(handlers[i][1](val), true);
    } catch (e) {
      exceptions.push(e);
    }
  }
  // Rethrow the encountered exceptions.
  if (exceptions.length > 0) {
    console.error("Encountered " + exceptions.length + " exception(s) while broadcasing a change to ", self);
    for(var len = exceptions.length, i = 0; i < len; i++) {
      (function(exception) {
        window.setTimeout(function() { throw exception; }, 0);
      })(exceptions[i]);
    }
  }
}

function Fay$$setValue(self, val, force){
  if (self instanceof Fay$$Ref2) {
    self.val = val;
  } else if (self instanceof Fay$$Var) {
    self.val = val;
    Fay$$broadcastInternal(self, val, force);
  } else if (self instanceof Fay$$Sig) {
    Fay$$broadcastInternal(self, val, force);
  } else {
    throw "Fay$$setValue given something that's not a Ref2, Var, or Sig"
  }
}

function Fay$$subscribe(self, f){
  var key = {};
  self.handlers.push([key,f]);
  var searchStart = self.handlers.length - 1;
  return function(_){
    for(var i = Math.min(searchStart, self.handlers.length - 1); i >= 0; i--) {
      if(self.handlers[i][0] == key) {
        self.handlers = self.handlers.slice(0,i).concat(self.handlers.slice(i+1));
        return;
      }
    }
    return _; // This variable has to be used, otherwise Closure
              // strips it out and Fay serialization breaks.
  };
}

/*******************************************************************************
 * Application code.
 */
var Data = {};Data.Data = {};var Fay = {};Fay.FFI = {};Fay.FFI._Nullable = function Nullable(slot1){this.slot1 = slot1;};Fay.FFI._Nullable.prototype.instance = "Nullable";Fay.FFI.Nullable = function(slot1){return new Fay$$$(function(){return new Fay.FFI._Nullable(slot1);});};Fay.FFI._Null = function Null(){};Fay.FFI._Null.prototype.instance = "Null";Fay.FFI.Null = new Fay$$$(function(){return new Fay.FFI._Null();});Fay.FFI._Defined = function Defined(slot1){this.slot1 = slot1;};Fay.FFI._Defined.prototype.instance = "Defined";Fay.FFI.Defined = function(slot1){return new Fay$$$(function(){return new Fay.FFI._Defined(slot1);});};Fay.FFI._Undefined = function Undefined(){};Fay.FFI._Undefined.prototype.instance = "Undefined";Fay.FFI.Undefined = new Fay$$$(function(){return new Fay.FFI._Undefined();});Fay$$objConcat(Fay$$fayToJsHash,{"Nullable": function(type,argTypes,_obj){var obj_ = {"instance": "Nullable"};var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);if (undefined !== obj_slot1) {obj_['slot1'] = obj_slot1;}return obj_;},"Null": function(type,argTypes,_obj){var obj_ = {"instance": "Null"};return obj_;},"Defined": function(type,argTypes,_obj){var obj_ = {"instance": "Defined"};var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);if (undefined !== obj_slot1) {obj_['slot1'] = obj_slot1;}return obj_;},"Undefined": function(type,argTypes,_obj){var obj_ = {"instance": "Undefined"};return obj_;}});Fay$$objConcat(Fay$$jsToFayHash,{"Nullable": function(type,argTypes,obj){return new Fay.FFI._Nullable(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));},"Null": function(type,argTypes,obj){return new Fay.FFI._Null();},"Defined": function(type,argTypes,obj){return new Fay.FFI._Defined(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));},"Undefined": function(type,argTypes,obj){return new Fay.FFI._Undefined();}});var Prelude = {};Prelude._Just = function Just(slot1){this.slot1 = slot1;};Prelude._Just.prototype.instance = "Just";Prelude.Just = function(slot1){return new Fay$$$(function(){return new Prelude._Just(slot1);});};Prelude._Nothing = function Nothing(){};Prelude._Nothing.prototype.instance = "Nothing";Prelude.Nothing = new Fay$$$(function(){return new Prelude._Nothing();});Prelude._Left = function Left(slot1){this.slot1 = slot1;};Prelude._Left.prototype.instance = "Left";Prelude.Left = function(slot1){return new Fay$$$(function(){return new Prelude._Left(slot1);});};Prelude._Right = function Right(slot1){this.slot1 = slot1;};Prelude._Right.prototype.instance = "Right";Prelude.Right = function(slot1){return new Fay$$$(function(){return new Prelude._Right(slot1);});};Prelude.maybe = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) instanceof Prelude._Nothing) {var m = $p1;return m;}if (Fay$$_($p3) instanceof Prelude._Just) {var x = Fay$$_($p3).slot1;var f = $p2;return Fay$$_(f)(x);}throw ["unhandled case in maybe",[$p1,$p2,$p3]];});};};};Prelude.$62$$62$$61$ = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$_(Fay$$bind($p1)($p2));});};};Prelude.$62$$62$ = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$_(Fay$$then($p1)($p2));});};};Prelude.$_return = function($p1){return new Fay$$$(function(){return new Fay$$Monad(Fay$$jsToFay(["unknown"],Fay$$return(Fay$$fayToJs(["unknown"],$p1))));});};Prelude.fail = new Fay$$$(function(){return Prelude.error;});Prelude.when = function($p1){return function($p2){return new Fay$$$(function(){var m = $p2;var p = $p1;return Fay$$_(p) ? Fay$$then$36$uncurried(m,Fay$$return$36$uncurried(Fay$$unit)) : Fay$$return$36$uncurried(Fay$$unit);});};};Prelude.unless = function($p1){return function($p2){return new Fay$$$(function(){var m = $p2;var p = $p1;return Fay$$_(p) ? Fay$$return$36$uncurried(Fay$$unit) : Fay$$then$36$uncurried(m,Fay$$return$36$uncurried(Fay$$unit));});};};Prelude.forM = function($p1){return function($p2){return new Fay$$$(function(){var fn = $p2;var lst = $p1;return Prelude.$36$$36$uncurried(Prelude.sequence,Prelude.map$36$uncurried(fn,lst));});};};Prelude.forM_ = function($p1){return function($p2){return new Fay$$$(function(){var m = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$then$36$uncurried(Fay$$_(m)(x),Prelude.forM_$36$uncurried(xs,m));}if (Fay$$_($p1) === null) {return Fay$$return$36$uncurried(Fay$$unit);}throw ["unhandled case in forM_",[$p1,$p2]];});};};Prelude.mapM = function($p1){return function($p2){return new Fay$$$(function(){var lst = $p2;var fn = $p1;return Prelude.$36$$36$uncurried(Prelude.sequence,Prelude.map$36$uncurried(fn,lst));});};};Prelude.mapM_ = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var m = $p1;return Fay$$then$36$uncurried(Fay$$_(m)(x),Prelude.mapM_$36$uncurried(m,xs));}if (Fay$$_($p2) === null) {return Fay$$return$36$uncurried(Fay$$unit);}throw ["unhandled case in mapM_",[$p1,$p2]];});};};Prelude.$61$$60$$60$ = function($p1){return function($p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$bind$36$uncurried(x,f);});};};Prelude.$_void = function($p1){return new Fay$$$(function(){var f = $p1;return Fay$$then$36$uncurried(f,Fay$$return$36$uncurried(Fay$$unit));});};Prelude.$62$$61$$62$ = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var x = $p3;var g = $p2;var f = $p1;return Fay$$bind$36$uncurried(Fay$$_(f)(x),g);});};};};Prelude.$60$$61$$60$ = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var x = $p3;var f = $p2;var g = $p1;return Fay$$bind$36$uncurried(Fay$$_(f)(x),g);});};};};Prelude.sequence = function($p1){return new Fay$$$(function(){var ms = $p1;return (function(){var k = function($p1){return function($p2){return new Fay$$$(function(){var m$39$ = $p2;var m = $p1;return Fay$$bind$36$uncurried(m,function($p1){var x = $p1;return Fay$$bind$36$uncurried(m$39$,function($p1){var xs = $p1;return Fay$$return$36$uncurried(Fay$$_(Fay$$_(Fay$$cons)(x))(xs));});});});};};return Prelude.foldr$36$uncurried(k,Fay$$return$36$uncurried(null),ms);})();});};Prelude.sequence_ = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Fay$$return$36$uncurried(Fay$$unit);}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var m = $tmp1.car;var ms = $tmp1.cdr;return Fay$$then$36$uncurried(m,Prelude.sequence_$36$uncurried$36$uncurried(ms));}throw ["unhandled case in sequence_",[$p1]];});};Prelude._GT = function GT(){};Prelude._GT.prototype.instance = "GT";Prelude.GT = new Fay$$$(function(){return new Prelude._GT();});Prelude._LT = function LT(){};Prelude._LT.prototype.instance = "LT";Prelude.LT = new Fay$$$(function(){return new Prelude._LT();});Prelude._EQ = function EQ(){};Prelude._EQ.prototype.instance = "EQ";Prelude.EQ = new Fay$$$(function(){return new Prelude._EQ();});Prelude.compare = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$_(Fay$$gt$36$uncurried(x,y)) ? Prelude.GT : Fay$$_(Fay$$lt$36$uncurried(x,y)) ? Prelude.LT : Prelude.EQ;});};};Prelude.succ = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$add$36$uncurried(x,1);});};Prelude.pred = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$sub$36$uncurried(x,1);});};Prelude.enumFrom = function($p1){return new Fay$$$(function(){var i = $p1;return Fay$$_(Fay$$_(Fay$$cons)(i))(Prelude.enumFrom$36$uncurried$36$uncurried(Fay$$add$36$uncurried(i,1)));});};Prelude.enumFromTo = function($p1){return function($p2){return new Fay$$$(function(){var n = $p2;var i = $p1;return Fay$$_(Fay$$gt$36$uncurried(i,n)) ? null : Fay$$_(Fay$$_(Fay$$cons)(i))(Prelude.enumFromTo$36$uncurried(Fay$$add$36$uncurried(i,1),n));});};};Prelude.enumFromBy = function($p1){return function($p2){return new Fay$$$(function(){var by = $p2;var fr = $p1;return Fay$$_(Fay$$_(Fay$$cons)(fr))(Prelude.enumFromBy$36$uncurried(Fay$$add$36$uncurried(fr,by),by));});};};Prelude.enumFromThen = function($p1){return function($p2){return new Fay$$$(function(){var th = $p2;var fr = $p1;return Prelude.enumFromBy$36$uncurried(fr,Fay$$sub$36$uncurried(th,fr));});};};Prelude.enumFromByTo = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var to = $p3;var by = $p2;var fr = $p1;return (function(){var neg = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(neg)(Fay$$add$36$uncurried(x,by)));});};var pos = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$gt$36$uncurried(x,to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(pos)(Fay$$add$36$uncurried(x,by)));});};return Fay$$_(Fay$$lt$36$uncurried(by,0)) ? Fay$$_(neg)(fr) : Fay$$_(pos)(fr);})();});};};};Prelude.enumFromThenTo = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var to = $p3;var th = $p2;var fr = $p1;return Prelude.enumFromByTo$36$uncurried(fr,Fay$$sub$36$uncurried(th,fr),to);});};};};Prelude.fromIntegral = function($p1){return new Fay$$$(function(){return $p1;});};Prelude.fromInteger = function($p1){return new Fay$$$(function(){return $p1;});};Prelude.not = function($p1){return new Fay$$$(function(){var p = $p1;return Fay$$_(p) ? false : true;});};Prelude.otherwise = true;Prelude.show = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_string(JSON.stringify(Fay$$fayToJs(["automatic"],$p1)));});};Prelude.error = function($p1){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],(function() { throw Fay$$fayToJs_string($p1) })());});};Prelude.$_undefined = new Fay$$$(function(){return Prelude.error$36$uncurried$36$uncurried(Fay$$list("Prelude.undefined"));});Prelude.either = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) instanceof Prelude._Left) {var a = Fay$$_($p3).slot1;var f = $p1;return Fay$$_(f)(a);}if (Fay$$_($p3) instanceof Prelude._Right) {var b = Fay$$_($p3).slot1;var g = $p2;return Fay$$_(g)(b);}throw ["unhandled case in either",[$p1,$p2,$p3]];});};};};Prelude.until = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var x = $p3;var f = $p2;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? x : Prelude.until$36$uncurried(p,f,Fay$$_(f)(x));});};};};Prelude.$36$$33$ = function($p1){return function($p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$_(Fay$$_(Fay$$seq)(x))(Fay$$_(f)(x));});};};Prelude.$_const = function($p1){return function($p2){return new Fay$$$(function(){var a = $p1;return a;});};};Prelude.id = function($p1){return new Fay$$$(function(){var x = $p1;return x;});};Prelude.$46$ = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var x = $p3;var g = $p2;var f = $p1;return Fay$$_(f)(Fay$$_(g)(x));});};};};Prelude.$36$ = function($p1){return function($p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$_(f)(x);});};};Prelude.flip = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var y = $p3;var x = $p2;var f = $p1;return Fay$$_(Fay$$_(f)(y))(x);});};};};Prelude.curry = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var y = $p3;var x = $p2;var f = $p1;return Fay$$_(f)(Fay$$list([x,y]));});};};};Prelude.uncurry = function($p1){return function($p2){return new Fay$$$(function(){var p = $p2;var f = $p1;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var x = Fay$$index(0,Fay$$_($tmp1));var y = Fay$$index(1,Fay$$_($tmp1));return Fay$$_(Fay$$_(f)(x))(y);}return (function(){ throw (["unhandled case",$tmp1]); })();})(p);});};};Prelude.snd = function($p1){return new Fay$$$(function(){if (Fay$$listLen(Fay$$_($p1),2)) {var x = Fay$$index(1,Fay$$_($p1));return x;}throw ["unhandled case in snd",[$p1]];});};Prelude.fst = function($p1){return new Fay$$$(function(){if (Fay$$listLen(Fay$$_($p1),2)) {var x = Fay$$index(0,Fay$$_($p1));return x;}throw ["unhandled case in fst",[$p1]];});};Prelude.div = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;if (Fay$$_(Fay$$and$36$uncurried(Fay$$gt$36$uncurried(x,0),Fay$$lt$36$uncurried(y,0)))) {return Fay$$sub$36$uncurried(Prelude.quot$36$uncurried(Fay$$sub$36$uncurried(x,1),y),1);} else {if (Fay$$_(Fay$$and$36$uncurried(Fay$$lt$36$uncurried(x,0),Fay$$gt$36$uncurried(y,0)))) {return Fay$$sub$36$uncurried(Prelude.quot$36$uncurried(Fay$$add$36$uncurried(x,1),y),1);}}var y = $p2;var x = $p1;return Prelude.quot$36$uncurried(x,y);});};};Prelude.mod = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;if (Fay$$_(Fay$$and$36$uncurried(Fay$$gt$36$uncurried(x,0),Fay$$lt$36$uncurried(y,0)))) {return Fay$$add$36$uncurried(Fay$$add$36$uncurried(Prelude.rem$36$uncurried(Fay$$sub$36$uncurried(x,1),y),y),1);} else {if (Fay$$_(Fay$$and$36$uncurried(Fay$$lt$36$uncurried(x,0),Fay$$gt$36$uncurried(y,0)))) {return Fay$$sub$36$uncurried(Fay$$add$36$uncurried(Prelude.rem$36$uncurried(Fay$$add$36$uncurried(x,1),y),y),1);}}var y = $p2;var x = $p1;return Prelude.rem$36$uncurried(x,y);});};};Prelude.divMod = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;if (Fay$$_(Fay$$and$36$uncurried(Fay$$gt$36$uncurried(x,0),Fay$$lt$36$uncurried(y,0)))) {return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var q = Fay$$index(0,Fay$$_($tmp1));var r = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$sub$36$uncurried(q,1),Fay$$add$36$uncurried(Fay$$add$36$uncurried(r,y),1)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.quotRem$36$uncurried(Fay$$sub$36$uncurried(x,1),y));} else {if (Fay$$_(Fay$$and$36$uncurried(Fay$$lt$36$uncurried(x,0),Fay$$gt$36$uncurried(y,1)))) {return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var q = Fay$$index(0,Fay$$_($tmp1));var r = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$sub$36$uncurried(q,1),Fay$$sub$36$uncurried(Fay$$add$36$uncurried(r,y),1)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.quotRem$36$uncurried(Fay$$add$36$uncurried(x,1),y));}}var y = $p2;var x = $p1;return Prelude.quotRem$36$uncurried(x,y);});};};Prelude.min = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],Math.min(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));});};};Prelude.max = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],Math.max(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));});};};Prelude.recip = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$divi)(1))(x);});};Prelude.negate = function($p1){return new Fay$$$(function(){var x = $p1;return (-(Fay$$_(x)));});};Prelude.abs = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.negate$36$uncurried$36$uncurried(x) : x;});};Prelude.signum = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$gt$36$uncurried(x,0)) ? 1 : Fay$$_(Fay$$eq$36$uncurried(x,0)) ? 0 : (-(1));});};Prelude.pi = new Fay$$$(function(){return Fay$$jsToFay_double(Math.PI);});Prelude.exp = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.exp(Fay$$fayToJs_double($p1)));});};Prelude.sqrt = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.sqrt(Fay$$fayToJs_double($p1)));});};Prelude.log = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.log(Fay$$fayToJs_double($p1)));});};Prelude.$42$$42$ = new Fay$$$(function(){return Prelude.unsafePow;});Prelude.$94$$94$ = new Fay$$$(function(){return Prelude.unsafePow;});Prelude.unsafePow = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],Math.pow(Fay$$_(Fay$$fayToJs(["unknown"],$p1)),Fay$$_(Fay$$fayToJs(["unknown"],$p2))));});};};Prelude.$94$ = function($p1){return function($p2){return new Fay$$$(function(){var b = $p2;var a = $p1;if (Fay$$_(Fay$$lt$36$uncurried(b,0))) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("(^): negative exponent"));} else {if (Fay$$_(Fay$$eq$36$uncurried(b,0))) {return 1;} else {if (Fay$$_(Prelude.even$36$uncurried$36$uncurried(b))) {return (function(){return new Fay$$$(function(){var x = new Fay$$$(function(){return Prelude.$94$$36$uncurried(a,Prelude.quot$36$uncurried(b,2));});return Fay$$mult$36$uncurried(x,x);});})();}}}var b = $p2;var a = $p1;return Fay$$mult$36$uncurried(a,Prelude.$94$$36$uncurried(a,Fay$$sub$36$uncurried(b,1)));});};};Prelude.logBase = function($p1){return function($p2){return new Fay$$$(function(){var x = $p2;var b = $p1;return Fay$$_(Fay$$_(Fay$$divi)(Prelude.log$36$uncurried$36$uncurried(x)))(Prelude.log$36$uncurried$36$uncurried(b));});};};Prelude.sin = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.sin(Fay$$fayToJs_double($p1)));});};Prelude.tan = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.tan(Fay$$fayToJs_double($p1)));});};Prelude.cos = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.cos(Fay$$fayToJs_double($p1)));});};Prelude.asin = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.asin(Fay$$fayToJs_double($p1)));});};Prelude.atan = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.atan(Fay$$fayToJs_double($p1)));});};Prelude.acos = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.acos(Fay$$fayToJs_double($p1)));});};Prelude.sinh = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$divi)(Fay$$sub$36$uncurried(Prelude.exp$36$uncurried$36$uncurried(x),Prelude.exp$36$uncurried$36$uncurried((-(Fay$$_(x)))))))(2);});};Prelude.tanh = function($p1){return new Fay$$$(function(){var x = $p1;return (function(){return new Fay$$$(function(){var a = new Fay$$$(function(){return Prelude.exp$36$uncurried$36$uncurried(x);});var b = new Fay$$$(function(){return Prelude.exp$36$uncurried$36$uncurried((-(Fay$$_(x))));});return Fay$$_(Fay$$_(Fay$$divi)(Fay$$sub$36$uncurried(a,b)))(Fay$$add$36$uncurried(a,b));});})();});};Prelude.cosh = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$divi)(Fay$$add$36$uncurried(Prelude.exp$36$uncurried$36$uncurried(x),Prelude.exp$36$uncurried$36$uncurried((-(Fay$$_(x)))))))(2);});};Prelude.asinh = function($p1){return new Fay$$$(function(){var x = $p1;return Prelude.log$36$uncurried$36$uncurried(Fay$$add$36$uncurried(x,Prelude.sqrt$36$uncurried$36$uncurried(Fay$$add$36$uncurried(Fay$$_(Fay$$_(Prelude.$42$$42$)(x))(2),1))));});};Prelude.atanh = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$divi)(Prelude.log$36$uncurried$36$uncurried(Fay$$_(Fay$$_(Fay$$divi)(Fay$$add$36$uncurried(1,x)))(Fay$$sub$36$uncurried(1,x)))))(2);});};Prelude.acosh = function($p1){return new Fay$$$(function(){var x = $p1;return Prelude.log$36$uncurried$36$uncurried(Fay$$add$36$uncurried(x,Prelude.sqrt$36$uncurried$36$uncurried(Fay$$sub$36$uncurried(Fay$$_(Fay$$_(Prelude.$42$$42$)(x))(2),1))));});};Prelude.properFraction = function($p1){return new Fay$$$(function(){var x = $p1;return (function(){return new Fay$$$(function(){var a = new Fay$$$(function(){return Prelude.truncate$36$uncurried$36$uncurried(x);});return Fay$$list([a,Fay$$sub$36$uncurried(x,Prelude.fromIntegral$36$uncurried$36$uncurried(a))]);});})();});};Prelude.truncate = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.ceiling$36$uncurried$36$uncurried(x) : Prelude.floor$36$uncurried$36$uncurried(x);});};Prelude.round = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.round(Fay$$fayToJs_double($p1)));});};Prelude.ceiling = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.ceil(Fay$$fayToJs_double($p1)));});};Prelude.floor = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.floor(Fay$$fayToJs_double($p1)));});};Prelude.subtract = new Fay$$$(function(){return Prelude.flip(Fay$$sub);});Prelude.even = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$eq$36$uncurried(Prelude.rem$36$uncurried(x,2),0);});};Prelude.odd = function($p1){return new Fay$$$(function(){var x = $p1;return Prelude.not$36$uncurried$36$uncurried(Prelude.even$36$uncurried$36$uncurried(x));});};Prelude.gcd = function($p1){return function($p2){return new Fay$$$(function(){var b = $p2;var a = $p1;return (function(){var go = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === 0) {var x = $p1;return x;}var y = $p2;var x = $p1;return Fay$$_(Fay$$_(go)(y))(Prelude.rem$36$uncurried(x,y));});};};return Fay$$_(Fay$$_(go)(Prelude.abs$36$uncurried$36$uncurried(a)))(Prelude.abs$36$uncurried$36$uncurried(b));})();});};};Prelude.quot = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$_(Fay$$eq$36$uncurried(y,0)) ? Prelude.error$36$uncurried$36$uncurried(Fay$$list("Division by zero")) : Prelude.quot$39$$36$uncurried(x,y);});};};Prelude.quot$39$ = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$jsToFay_int(~~(Fay$$fayToJs_int($p1)/Fay$$fayToJs_int($p2)));});};};Prelude.quotRem = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$list([Prelude.quot$36$uncurried(x,y),Prelude.rem$36$uncurried(x,y)]);});};};Prelude.rem = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$_(Fay$$eq$36$uncurried(y,0)) ? Prelude.error$36$uncurried$36$uncurried(Fay$$list("Division by zero")) : Prelude.rem$39$$36$uncurried(x,y);});};};Prelude.rem$39$ = function($p1){return function($p2){return new Fay$$$(function(){return Fay$$jsToFay_int(Fay$$fayToJs_int($p1) % Fay$$fayToJs_int($p2));});};};Prelude.lcm = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === 0) {return 0;}if (Fay$$_($p1) === 0) {return 0;}var b = $p2;var a = $p1;return Prelude.abs$36$uncurried$36$uncurried(Fay$$mult$36$uncurried(Prelude.quot$36$uncurried(a,Prelude.gcd$36$uncurried(a,b)),b));});};};Prelude.find = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Prelude.Just$36$uncurried$36$uncurried(x) : Prelude.find$36$uncurried(p,xs);}if (Fay$$_($p2) === null) {return Prelude.Nothing;}throw ["unhandled case in find",[$p1,$p2]];});};};Prelude.filter = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.filter$36$uncurried(p,xs)) : Prelude.filter$36$uncurried(p,xs);}if (Fay$$_($p2) === null) {return null;}throw ["unhandled case in filter",[$p1,$p2]];});};};Prelude.$_null = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return true;}return false;});};Prelude.map = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(f)(x)))(Prelude.map$36$uncurried(f,xs));}throw ["unhandled case in map",[$p1,$p2]];});};};Prelude.nub = function($p1){return new Fay$$$(function(){var ls = $p1;return Prelude.nub$39$$36$uncurried(ls,null);});};Prelude.nub$39$ = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var ls = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$_(Prelude.elem$36$uncurried(x,ls)) ? Prelude.nub$39$$36$uncurried(xs,ls) : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.nub$39$$36$uncurried(xs,Fay$$_(Fay$$_(Fay$$cons)(x))(ls)));}throw ["unhandled case in nub'",[$p1,$p2]];});};};Prelude.elem = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var y = $tmp1.car;var ys = $tmp1.cdr;var x = $p1;return Fay$$or$36$uncurried(Fay$$eq$36$uncurried(x,y),Prelude.elem$36$uncurried(x,ys));}if (Fay$$_($p2) === null) {return false;}throw ["unhandled case in elem",[$p1,$p2]];});};};Prelude.notElem = function($p1){return function($p2){return new Fay$$$(function(){var ys = $p2;var x = $p1;return Prelude.not$36$uncurried$36$uncurried(Prelude.elem$36$uncurried(x,ys));});};};Prelude.sort = new Fay$$$(function(){return Prelude.sortBy$36$uncurried$36$uncurried(Prelude.compare);});Prelude.sortBy = function($p1){return new Fay$$$(function(){var cmp = $p1;return Fay$$_(Prelude.foldr(Prelude.insertBy(cmp)))(null);});};Prelude.insertBy = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var x = $p2;return Fay$$list([x]);}var ys = $p3;var x = $p2;var cmp = $p1;return (function($tmp1){if (Fay$$_($tmp1) === null) {return Fay$$list([x]);}var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var y = $tmp2.car;var ys$39$ = $tmp2.cdr;return (function($tmp2){if (Fay$$_($tmp2) instanceof Prelude._GT) {return Fay$$_(Fay$$_(Fay$$cons)(y))(Prelude.insertBy$36$uncurried(cmp,x,ys$39$));}return Fay$$_(Fay$$_(Fay$$cons)(x))(ys);})(Fay$$_(Fay$$_(cmp)(x))(y));}return (function(){ throw (["unhandled case",$tmp1]); })();})(ys);});};};};Prelude.conc = function($p1){return function($p2){return new Fay$$$(function(){var ys = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.conc$36$uncurried(xs,ys));}var ys = $p2;if (Fay$$_($p1) === null) {return ys;}throw ["unhandled case in conc",[$p1,$p2]];});};};Prelude.concat = new Fay$$$(function(){return Fay$$_(Prelude.foldr(Prelude.conc))(null);});Prelude.concatMap = function($p1){return new Fay$$$(function(){var f = $p1;return Fay$$_(Prelude.foldr(Fay$$_(Prelude.$46$(Prelude.$43$$43$))(f)))(null);});};Prelude.foldr = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var z = $p2;return z;}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;return Fay$$_(Fay$$_(f)(x))(Prelude.foldr$36$uncurried(f,z,xs));}throw ["unhandled case in foldr",[$p1,$p2,$p3]];});};};};Prelude.foldr1 = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$listLen(Fay$$_($p2),1)) {var x = Fay$$index(0,Fay$$_($p2));return x;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(f)(x))(Prelude.foldr1$36$uncurried(f,xs));}if (Fay$$_($p2) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("foldr1: empty list"));}throw ["unhandled case in foldr1",[$p1,$p2]];});};};Prelude.foldl = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var z = $p2;return z;}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;return Prelude.foldl$36$uncurried(f,Fay$$_(Fay$$_(f)(z))(x),xs);}throw ["unhandled case in foldl",[$p1,$p2,$p3]];});};};};Prelude.foldl1 = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Prelude.foldl$36$uncurried(f,x,xs);}if (Fay$$_($p2) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("foldl1: empty list"));}throw ["unhandled case in foldl1",[$p1,$p2]];});};};Prelude.$43$$43$ = function($p1){return function($p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Prelude.conc$36$uncurried(x,y);});};};Prelude.$33$$33$ = function($p1){return function($p2){return new Fay$$$(function(){var b = $p2;var a = $p1;return (function(){var go = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("(!!): index too large"));}if (Fay$$_($p2) === 0) {var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var h = $tmp1.car;return h;}}var n = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var t = $tmp1.cdr;return Fay$$_(Fay$$_(go)(t))(Fay$$sub$36$uncurried(n,1));}throw ["unhandled case in go",[$p1,$p2]];});};};return Fay$$_(Fay$$lt$36$uncurried(b,0)) ? Prelude.error$36$uncurried$36$uncurried(Fay$$list("(!!): negative index")) : Fay$$_(Fay$$_(go)(a))(b);})();});};};Prelude.head = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("head: empty list"));}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var h = $tmp1.car;return h;}throw ["unhandled case in head",[$p1]];});};Prelude.tail = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("tail: empty list"));}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var t = $tmp1.cdr;return t;}throw ["unhandled case in tail",[$p1]];});};Prelude.init = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("init: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var h = $tmp1.car;var t = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(h))(Prelude.init$36$uncurried$36$uncurried(t));}throw ["unhandled case in init",[$p1]];});};Prelude.last = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("last: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return a;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var t = $tmp1.cdr;return Prelude.last$36$uncurried$36$uncurried(t);}throw ["unhandled case in last",[$p1]];});};Prelude.iterate = function($p1){return function($p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.iterate$36$uncurried(f,Fay$$_(f)(x)));});};};Prelude.repeat = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.repeat$36$uncurried$36$uncurried(x));});};Prelude.replicate = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p1) === 0) {return null;}var x = $p2;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.replicate$36$uncurried(Fay$$sub$36$uncurried(n,1),x));});};};Prelude.cycle = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("cycle: empty list"));}var xs = $p1;return (function(){var xs$39$ = new Fay$$$(function(){return Prelude.$43$$43$$36$uncurried(xs,xs$39$);});return xs$39$;})();});};Prelude.take = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p1) === 0) {return null;}if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.take$36$uncurried(Fay$$sub$36$uncurried(n,1),xs));}throw ["unhandled case in take",[$p1,$p2]];});};};Prelude.drop = function($p1){return function($p2){return new Fay$$$(function(){var xs = $p2;if (Fay$$_($p1) === 0) {return xs;}if (Fay$$_($p2) === null) {return null;}var xss = $p2;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? xss : Prelude.drop$36$uncurried(Fay$$sub$36$uncurried(n,1),xs);}throw ["unhandled case in drop",[$p1,$p2]];});};};Prelude.splitAt = function($p1){return function($p2){return new Fay$$$(function(){var xs = $p2;if (Fay$$_($p1) === 0) {return Fay$$list([null,xs]);}if (Fay$$_($p2) === null) {return Fay$$list([null,null]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]) : (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.splitAt$36$uncurried(Fay$$sub$36$uncurried(n,1),xs));}throw ["unhandled case in splitAt",[$p1,$p2]];});};};Prelude.takeWhile = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.takeWhile$36$uncurried(p,xs)) : null;}throw ["unhandled case in takeWhile",[$p1,$p2]];});};};Prelude.dropWhile = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Prelude.dropWhile$36$uncurried(p,xs) : Fay$$_(Fay$$_(Fay$$cons)(x))(xs);}throw ["unhandled case in dropWhile",[$p1,$p2]];});};};Prelude.span = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return Fay$$list([null,null]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.span$36$uncurried(p,xs)) : Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]);}throw ["unhandled case in span",[$p1,$p2]];});};};Prelude.$_break = function($p1){return new Fay$$$(function(){var p = $p1;return Prelude.span(Fay$$_(Prelude.$46$(Prelude.not))(p));});};Prelude.zipWith = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(a))(b)))(Prelude.zipWith$36$uncurried(f,as,bs));}}return null;});};};};Prelude.zipWith3 = function($p1){return function($p2){return function($p3){return function($p4){return new Fay$$$(function(){var $tmp1 = Fay$$_($p4);if ($tmp1 instanceof Fay$$Cons) {var c = $tmp1.car;var cs = $tmp1.cdr;var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(Fay$$_(f)(a))(b))(c)))(Prelude.zipWith3$36$uncurried(f,as,bs,cs));}}}return null;});};};};};Prelude.zip = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b])))(Prelude.zip$36$uncurried(as,bs));}}return null;});};};Prelude.zip3 = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var c = $tmp1.car;var cs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b,c])))(Prelude.zip3$36$uncurried(as,bs,cs));}}}return null;});};};};Prelude.unzip = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),2)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null]);}throw ["unhandled case in unzip",[$p1]];});};Prelude.unzip3 = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),3)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var z = Fay$$index(2,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),3)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));var zs = Fay$$index(2,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys),Fay$$_(Fay$$_(Fay$$cons)(z))(zs)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip3$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null,null]);}throw ["unhandled case in unzip3",[$p1]];});};Prelude.lines = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function(){var isLineBreak = function($p1){return new Fay$$$(function(){var c = $p1;return Fay$$or$36$uncurried(Fay$$eq$36$uncurried(c,"\r"),Fay$$eq$36$uncurried(c,"\n"));});};return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) === null) {return Fay$$list([a]);}}if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var $tmp2 = Fay$$_(Fay$$index(1,Fay$$_($tmp1)));if ($tmp2 instanceof Fay$$Cons) {var cs = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.lines$36$uncurried$36$uncurried(cs));}}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isLineBreak))(s));})();});};Prelude.unlines = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var l = $tmp1.car;var ls = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(l,Fay$$_(Fay$$_(Fay$$cons)("\n"))(Prelude.unlines$36$uncurried$36$uncurried(ls)));}throw ["unhandled case in unlines",[$p1]];});};Prelude.words = function($p1){return new Fay$$$(function(){var str = $p1;return (function(){var words$39$ = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.words$36$uncurried$36$uncurried(b));}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isSpace))(s));});};var isSpace = function($p1){return new Fay$$$(function(){var c = $p1;return Prelude.elem$36$uncurried(c,Fay$$list(" \t\r\n\u000c\u000b"));});};return Fay$$_(words$39$)(Prelude.dropWhile$36$uncurried(isSpace,str));})();});};Prelude.unwords = new Fay$$$(function(){return Prelude.intercalate(Fay$$list(" "));});Prelude.and = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return true;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$and$36$uncurried(x,Prelude.and$36$uncurried$36$uncurried(xs));}throw ["unhandled case in and",[$p1]];});};Prelude.or = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return false;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$or$36$uncurried(x,Prelude.or$36$uncurried$36$uncurried(xs));}throw ["unhandled case in or",[$p1]];});};Prelude.any = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return false;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$or$36$uncurried(Fay$$_(p)(x),Prelude.any$36$uncurried(p,xs));}throw ["unhandled case in any",[$p1,$p2]];});};};Prelude.all = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return true;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$and$36$uncurried(Fay$$_(p)(x),Prelude.all$36$uncurried(p,xs));}throw ["unhandled case in all",[$p1,$p2]];});};};Prelude.intersperse = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var sep = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.prependToAll$36$uncurried(sep,xs));}throw ["unhandled case in intersperse",[$p1,$p2]];});};};Prelude.prependToAll = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var sep = $p1;return Fay$$_(Fay$$_(Fay$$cons)(sep))(Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.prependToAll$36$uncurried(sep,xs)));}throw ["unhandled case in prependToAll",[$p1,$p2]];});};};Prelude.intercalate = function($p1){return function($p2){return new Fay$$$(function(){var xss = $p2;var xs = $p1;return Fay$$_(Prelude.concat)(Prelude.intersperse$36$uncurried(xs,xss));});};};Prelude.maximum = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("maximum: empty list"));}var xs = $p1;return Prelude.foldl1$36$uncurried(Prelude.max,xs);});};Prelude.minimum = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("minimum: empty list"));}var xs = $p1;return Prelude.foldl1$36$uncurried(Prelude.min,xs);});};Prelude.product = function($p1){return new Fay$$$(function(){var xs = $p1;return Prelude.foldl$36$uncurried(Fay$$mult,1,xs);});};Prelude.sum = function($p1){return new Fay$$$(function(){var xs = $p1;return Prelude.foldl$36$uncurried(Fay$$add,0,xs);});};Prelude.scanl = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var l = $p3;var z = $p2;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(z))((function($tmp1){if (Fay$$_($tmp1) === null) {return null;}var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var x = $tmp2.car;var xs = $tmp2.cdr;return Prelude.scanl$36$uncurried(f,Fay$$_(Fay$$_(f)(z))(x),xs);}return (function(){ throw (["unhandled case",$tmp1]); })();})(l));});};};};Prelude.scanl1 = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Prelude.scanl$36$uncurried(f,x,xs);}throw ["unhandled case in scanl1",[$p1,$p2]];});};};Prelude.scanr = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var z = $p2;return Fay$$list([z]);}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;return (function($tmp1){var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var h = $tmp2.car;var t = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));}return Prelude.$_undefined;})(Prelude.scanr$36$uncurried(f,z,xs));}throw ["unhandled case in scanr",[$p1,$p2,$p3]];});};};};Prelude.scanr1 = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}if (Fay$$listLen(Fay$$_($p2),1)) {var x = Fay$$index(0,Fay$$_($p2));return Fay$$list([x]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return (function($tmp1){var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var h = $tmp2.car;var t = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));}return Prelude.$_undefined;})(Prelude.scanr1$36$uncurried(f,xs));}throw ["unhandled case in scanr1",[$p1,$p2]];});};};Prelude.lookup = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {var _key = $p1;return Prelude.Nothing;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),2)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var xys = $tmp1.cdr;var key = $p1;return Fay$$_(Fay$$eq$36$uncurried(key,x)) ? Prelude.Just$36$uncurried$36$uncurried(y) : Prelude.lookup$36$uncurried(key,xys);}}throw ["unhandled case in lookup",[$p1,$p2]];});};};Prelude.length = function($p1){return new Fay$$$(function(){var xs = $p1;return Prelude.length$39$$36$uncurried(0,xs);});};Prelude.length$39$ = function($p1){return function($p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var xs = $tmp1.cdr;var acc = $p1;return Prelude.length$39$$36$uncurried(Fay$$add$36$uncurried(acc,1),xs);}var acc = $p1;return acc;});};};Prelude.reverse = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(Prelude.reverse$36$uncurried$36$uncurried(xs),Fay$$list([x]));}if (Fay$$_($p1) === null) {return null;}throw ["unhandled case in reverse",[$p1]];});};Prelude.print = function($p1){return new Fay$$$(function(){return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs(["automatic"],$p1))));});};Prelude.putStrLn = function($p1){return new Fay$$$(function(){return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs_string($p1))));});};Prelude.ifThenElse = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var b = $p3;var a = $p2;var p = $p1;return Fay$$_(p) ? a : b;});};};};Fay$$objConcat(Fay$$fayToJsHash,{"Just": function(type,argTypes,_obj){var obj_ = {"instance": "Just"};var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);if (undefined !== obj_slot1) {obj_['slot1'] = obj_slot1;}return obj_;},"Nothing": function(type,argTypes,_obj){var obj_ = {"instance": "Nothing"};return obj_;},"Left": function(type,argTypes,_obj){var obj_ = {"instance": "Left"};var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);if (undefined !== obj_slot1) {obj_['slot1'] = obj_slot1;}return obj_;},"Right": function(type,argTypes,_obj){var obj_ = {"instance": "Right"};var obj_slot1 = Fay$$fayToJs(argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],_obj.slot1);if (undefined !== obj_slot1) {obj_['slot1'] = obj_slot1;}return obj_;},"GT": function(type,argTypes,_obj){var obj_ = {"instance": "GT"};return obj_;},"LT": function(type,argTypes,_obj){var obj_ = {"instance": "LT"};return obj_;},"EQ": function(type,argTypes,_obj){var obj_ = {"instance": "EQ"};return obj_;}});Fay$$objConcat(Fay$$jsToFayHash,{"Just": function(type,argTypes,obj){return new Prelude._Just(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));},"Nothing": function(type,argTypes,obj){return new Prelude._Nothing();},"Left": function(type,argTypes,obj){return new Prelude._Left(Fay$$jsToFay(argTypes && (argTypes)[0] ? (argTypes)[0] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));},"Right": function(type,argTypes,obj){return new Prelude._Right(Fay$$jsToFay(argTypes && (argTypes)[1] ? (argTypes)[1] : (type)[0] === "automatic" ? ["automatic"] : ["unknown"],obj["slot1"]));},"GT": function(type,argTypes,obj){return new Prelude._GT();},"LT": function(type,argTypes,obj){return new Prelude._LT();},"EQ": function(type,argTypes,obj){return new Prelude._EQ();}});Prelude.reverse$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(Prelude.reverse$36$uncurried$36$uncurried(xs),Fay$$list([x]));}if (Fay$$_($p1) === null) {return null;}throw ["unhandled case in reverse",[$p1]];});};Prelude.$43$$43$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Prelude.conc$36$uncurried(x,y);});};Prelude.length$39$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){while (true) {var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var xs = $tmp1.cdr;var acc = $p1;$p1 = Fay$$add$36$uncurried(acc,1);$p2 = xs;continue;}var acc = $p1;return acc;}});};Prelude.lookup$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {var _key = $p1;return Prelude.Nothing;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),2)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var xys = $tmp1.cdr;var key = $p1;return Fay$$_(Fay$$eq$36$uncurried(key,x)) ? Prelude.Just$36$uncurried$36$uncurried(y) : Prelude.lookup$36$uncurried(key,xys);}}throw ["unhandled case in lookup",[$p1,$p2]];});};Prelude.Just$36$uncurried = function(slot1){return new Fay$$$(function(){return new Prelude._Just(slot1);});};Prelude.scanr1$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}if (Fay$$listLen(Fay$$_($p2),1)) {var x = Fay$$index(0,Fay$$_($p2));return Fay$$list([x]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return (function($tmp1){var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var h = $tmp2.car;var t = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));}return Prelude.$_undefined;})(Prelude.scanr1$36$uncurried(f,xs));}throw ["unhandled case in scanr1",[$p1,$p2]];});};Prelude.scanr$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var z = $p2;return Fay$$list([z]);}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;return (function($tmp1){var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var h = $tmp2.car;var t = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(x))(h)))(Fay$$_(Fay$$_(Fay$$cons)(h))(t));}return Prelude.$_undefined;})(Prelude.scanr$36$uncurried(f,z,xs));}throw ["unhandled case in scanr",[$p1,$p2,$p3]];});};Prelude.scanl$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var l = $p3;var z = $p2;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(z))((function($tmp1){if (Fay$$_($tmp1) === null) {return null;}var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var x = $tmp2.car;var xs = $tmp2.cdr;return Prelude.scanl$36$uncurried(f,Fay$$_(Fay$$_(f)(z))(x),xs);}return (function(){ throw (["unhandled case",$tmp1]); })();})(l));});};Prelude.foldl$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){while (true) {if (Fay$$_($p3) === null) {var z = $p2;return z;}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;$p1 = f;$p2 = Fay$$_(Fay$$_(f)(z))(x);$p3 = xs;continue;}throw ["unhandled case in foldl",[$p1,$p2,$p3]];}});};Prelude.foldl1$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Prelude.foldl$36$uncurried(f,x,xs);}if (Fay$$_($p2) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("foldl1: empty list"));}throw ["unhandled case in foldl1",[$p1,$p2]];});};Prelude.error$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],(function() { throw Fay$$fayToJs_string($p1) })());});};Prelude.intersperse$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var sep = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.prependToAll$36$uncurried(sep,xs));}throw ["unhandled case in intersperse",[$p1,$p2]];});};Prelude.prependToAll$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var sep = $p1;return Fay$$_(Fay$$_(Fay$$cons)(sep))(Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.prependToAll$36$uncurried(sep,xs)));}throw ["unhandled case in prependToAll",[$p1,$p2]];});};Prelude.all$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return true;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$and$36$uncurried(Fay$$_(p)(x),Prelude.all$36$uncurried(p,xs));}throw ["unhandled case in all",[$p1,$p2]];});};Prelude.any$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return false;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$or$36$uncurried(Fay$$_(p)(x),Prelude.any$36$uncurried(p,xs));}throw ["unhandled case in any",[$p1,$p2]];});};Prelude.or$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return false;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$or$36$uncurried(x,Prelude.or$36$uncurried$36$uncurried(xs));}throw ["unhandled case in or",[$p1]];});};Prelude.and$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return true;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$and$36$uncurried(x,Prelude.and$36$uncurried$36$uncurried(xs));}throw ["unhandled case in and",[$p1]];});};Prelude.dropWhile$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Prelude.dropWhile$36$uncurried(p,xs) : Fay$$_(Fay$$_(Fay$$cons)(x))(xs);}throw ["unhandled case in dropWhile",[$p1,$p2]];});};Prelude.elem$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var y = $tmp1.car;var ys = $tmp1.cdr;var x = $p1;return Fay$$or$36$uncurried(Fay$$eq$36$uncurried(x,y),Prelude.elem$36$uncurried(x,ys));}if (Fay$$_($p2) === null) {return false;}throw ["unhandled case in elem",[$p1,$p2]];});};Prelude.break$36$uncurried = function($p1){return new Fay$$$(function(){var p = $p1;return Prelude.span(Fay$$_(Prelude.$46$(Prelude.not))(p));});};Prelude.words$36$uncurried = function($p1){return new Fay$$$(function(){var str = $p1;return (function(){var words$39$ = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.words$36$uncurried$36$uncurried(b));}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isSpace))(s));});};var isSpace = function($p1){return new Fay$$$(function(){var c = $p1;return Prelude.elem$36$uncurried(c,Fay$$list(" \t\r\n\u000c\u000b"));});};return Fay$$_(words$39$)(Prelude.dropWhile$36$uncurried(isSpace,str));})();});};Prelude.unlines$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var l = $tmp1.car;var ls = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(l,Fay$$_(Fay$$_(Fay$$cons)("\n"))(Prelude.unlines$36$uncurried$36$uncurried(ls)));}throw ["unhandled case in unlines",[$p1]];});};Prelude.lines$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function(){var isLineBreak = function($p1){return new Fay$$$(function(){var c = $p1;return Fay$$or$36$uncurried(Fay$$eq$36$uncurried(c,"\r"),Fay$$eq$36$uncurried(c,"\n"));});};return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) === null) {return Fay$$list([a]);}}if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var $tmp2 = Fay$$_(Fay$$index(1,Fay$$_($tmp1)));if ($tmp2 instanceof Fay$$Cons) {var cs = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.lines$36$uncurried$36$uncurried(cs));}}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isLineBreak))(s));})();});};Prelude.unzip3$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),3)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var z = Fay$$index(2,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),3)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));var zs = Fay$$index(2,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys),Fay$$_(Fay$$_(Fay$$cons)(z))(zs)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip3$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null,null]);}throw ["unhandled case in unzip3",[$p1]];});};Prelude.unzip$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),2)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null]);}throw ["unhandled case in unzip",[$p1]];});};Prelude.zip3$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var c = $tmp1.car;var cs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b,c])))(Prelude.zip3$36$uncurried(as,bs,cs));}}}return null;});};Prelude.zip$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$list([a,b])))(Prelude.zip$36$uncurried(as,bs));}}return null;});};Prelude.zipWith3$36$uncurried = function($p1,$p2,$p3,$p4){return new Fay$$$(function(){var $tmp1 = Fay$$_($p4);if ($tmp1 instanceof Fay$$Cons) {var c = $tmp1.car;var cs = $tmp1.cdr;var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(Fay$$_(f)(a))(b))(c)))(Prelude.zipWith3$36$uncurried(f,as,bs,cs));}}}return null;});};Prelude.zipWith$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var b = $tmp1.car;var bs = $tmp1.cdr;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var a = $tmp1.car;var as = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(Fay$$_(f)(a))(b)))(Prelude.zipWith$36$uncurried(f,as,bs));}}return null;});};Prelude.span$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return Fay$$list([null,null]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.span$36$uncurried(p,xs)) : Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]);}throw ["unhandled case in span",[$p1,$p2]];});};Prelude.takeWhile$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.takeWhile$36$uncurried(p,xs)) : null;}throw ["unhandled case in takeWhile",[$p1,$p2]];});};Prelude.splitAt$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var xs = $p2;if (Fay$$_($p1) === 0) {return Fay$$list([null,xs]);}if (Fay$$_($p2) === null) {return Fay$$list([null,null]);}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? Fay$$list([null,Fay$$_(Fay$$_(Fay$$cons)(x))(xs)]) : (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(a),b]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.splitAt$36$uncurried(Fay$$sub$36$uncurried(n,1),xs));}throw ["unhandled case in splitAt",[$p1,$p2]];});};Prelude.drop$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var xs = $p2;if (Fay$$_($p1) === 0) {return xs;}if (Fay$$_($p2) === null) {return null;}var xss = $p2;var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? xss : Prelude.drop$36$uncurried(Fay$$sub$36$uncurried(n,1),xs);}throw ["unhandled case in drop",[$p1,$p2]];});};Prelude.take$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p1) === 0) {return null;}if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.take$36$uncurried(Fay$$sub$36$uncurried(n,1),xs));}throw ["unhandled case in take",[$p1,$p2]];});};Prelude.replicate$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p1) === 0) {return null;}var x = $p2;var n = $p1;return Fay$$_(Fay$$lt$36$uncurried(n,0)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.replicate$36$uncurried(Fay$$sub$36$uncurried(n,1),x));});};Prelude.repeat$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.repeat$36$uncurried$36$uncurried(x));});};Prelude.iterate$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.iterate$36$uncurried(f,Fay$$_(f)(x)));});};Prelude.last$36$uncurried = function($p1){return new Fay$$$(function(){while (true) {if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried(Fay$$list("last: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return a;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var t = $tmp1.cdr;$p1 = t;continue;}throw ["unhandled case in last",[$p1]];}});};Prelude.init$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("init: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var h = $tmp1.car;var t = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(h))(Prelude.init$36$uncurried$36$uncurried(t));}throw ["unhandled case in init",[$p1]];});};Prelude.conc$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var ys = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.conc$36$uncurried(xs,ys));}var ys = $p2;if (Fay$$_($p1) === null) {return ys;}throw ["unhandled case in conc",[$p1,$p2]];});};Prelude.foldr1$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$listLen(Fay$$_($p2),1)) {var x = Fay$$index(0,Fay$$_($p2));return x;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(f)(x))(Prelude.foldr1$36$uncurried(f,xs));}if (Fay$$_($p2) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("foldr1: empty list"));}throw ["unhandled case in foldr1",[$p1,$p2]];});};Prelude.foldr$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var z = $p2;return z;}var $tmp1 = Fay$$_($p3);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var z = $p2;var f = $p1;return Fay$$_(Fay$$_(f)(x))(Prelude.foldr$36$uncurried(f,z,xs));}throw ["unhandled case in foldr",[$p1,$p2,$p3]];});};Prelude.insertBy$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){if (Fay$$_($p3) === null) {var x = $p2;return Fay$$list([x]);}var ys = $p3;var x = $p2;var cmp = $p1;return (function($tmp1){if (Fay$$_($tmp1) === null) {return Fay$$list([x]);}var $tmp2 = Fay$$_($tmp1);if ($tmp2 instanceof Fay$$Cons) {var y = $tmp2.car;var ys$39$ = $tmp2.cdr;return (function($tmp2){if (Fay$$_($tmp2) instanceof Prelude._GT) {return Fay$$_(Fay$$_(Fay$$cons)(y))(Prelude.insertBy$36$uncurried(cmp,x,ys$39$));}return Fay$$_(Fay$$_(Fay$$cons)(x))(ys);})(Fay$$_(Fay$$_(cmp)(x))(y));}return (function(){ throw (["unhandled case",$tmp1]); })();})(ys);});};Prelude.sortBy$36$uncurried = function($p1){return new Fay$$$(function(){var cmp = $p1;return Fay$$_(Prelude.foldr(Prelude.insertBy(cmp)))(null);});};Prelude.not$36$uncurried = function($p1){return new Fay$$$(function(){var p = $p1;return Fay$$_(p) ? false : true;});};Prelude.nub$39$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var ls = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$_(Prelude.elem$36$uncurried(x,ls)) ? Prelude.nub$39$$36$uncurried(xs,ls) : Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.nub$39$$36$uncurried(xs,Fay$$_(Fay$$_(Fay$$cons)(x))(ls)));}throw ["unhandled case in nub'",[$p1,$p2]];});};Prelude.map$36$uncurried = function($p1,$p2){return new Fay$$$(function(){if (Fay$$_($p2) === null) {return null;}var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var f = $p1;return Fay$$_(Fay$$_(Fay$$cons)(Fay$$_(f)(x)))(Prelude.map$36$uncurried(f,xs));}throw ["unhandled case in map",[$p1,$p2]];});};Prelude.filter$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.filter$36$uncurried(p,xs)) : Prelude.filter$36$uncurried(p,xs);}if (Fay$$_($p2) === null) {return null;}throw ["unhandled case in filter",[$p1,$p2]];});};Prelude.find$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? Prelude.Just$36$uncurried$36$uncurried(x) : Prelude.find$36$uncurried(p,xs);}if (Fay$$_($p2) === null) {return Prelude.Nothing;}throw ["unhandled case in find",[$p1,$p2]];});};Prelude.gcd$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var b = $p2;var a = $p1;return (function(){var go = function($p1){return function($p2){return new Fay$$$(function(){if (Fay$$_($p2) === 0) {var x = $p1;return x;}var y = $p2;var x = $p1;return Fay$$_(Fay$$_(go)(y))(Prelude.rem$36$uncurried(x,y));});};};return Fay$$_(Fay$$_(go)(Prelude.abs$36$uncurried$36$uncurried(a)))(Prelude.abs$36$uncurried$36$uncurried(b));})();});};Prelude.quot$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$_(Fay$$eq$36$uncurried(y,0)) ? Prelude.error$36$uncurried$36$uncurried(Fay$$list("Division by zero")) : Prelude.quot$39$$36$uncurried(x,y);});};Prelude.abs$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.negate$36$uncurried$36$uncurried(x) : x;});};Prelude.rem$39$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){return Fay$$jsToFay_int(Fay$$fayToJs_int($p1) % Fay$$fayToJs_int($p2));});};Prelude.rem$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$_(Fay$$eq$36$uncurried(y,0)) ? Prelude.error$36$uncurried$36$uncurried(Fay$$list("Division by zero")) : Prelude.rem$39$$36$uncurried(x,y);});};Prelude.quot$39$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){return Fay$$jsToFay_int(~~(Fay$$fayToJs_int($p1)/Fay$$fayToJs_int($p2)));});};Prelude.even$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$eq$36$uncurried(Prelude.rem$36$uncurried(x,2),0);});};Prelude.floor$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.floor(Fay$$fayToJs_double($p1)));});};Prelude.ceiling$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.ceil(Fay$$fayToJs_double($p1)));});};Prelude.fromIntegral$36$uncurried = function($p1){return new Fay$$$(function(){return $p1;});};Prelude.truncate$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.ceiling$36$uncurried$36$uncurried(x) : Prelude.floor$36$uncurried$36$uncurried(x);});};Prelude.sqrt$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.sqrt(Fay$$fayToJs_double($p1)));});};Prelude.log$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.log(Fay$$fayToJs_double($p1)));});};Prelude.exp$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.exp(Fay$$fayToJs_double($p1)));});};Prelude.$94$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var b = $p2;var a = $p1;if (Fay$$_(Fay$$lt$36$uncurried(b,0))) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("(^): negative exponent"));} else {if (Fay$$_(Fay$$eq$36$uncurried(b,0))) {return 1;} else {if (Fay$$_(Prelude.even$36$uncurried$36$uncurried(b))) {return (function(){return new Fay$$$(function(){var x = new Fay$$$(function(){return Prelude.$94$$36$uncurried(a,Prelude.quot$36$uncurried(b,2));});return Fay$$mult$36$uncurried(x,x);});})();}}}var b = $p2;var a = $p1;return Fay$$mult$36$uncurried(a,Prelude.$94$$36$uncurried(a,Fay$$sub$36$uncurried(b,1)));});};Prelude.negate$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return (-(Fay$$_(x)));});};Prelude.quotRem$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var y = $p2;var x = $p1;return Fay$$list([Prelude.quot$36$uncurried(x,y),Prelude.rem$36$uncurried(x,y)]);});};Prelude.until$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var x = $p3;var f = $p2;var p = $p1;return Fay$$_(Fay$$_(p)(x)) ? x : Prelude.until$36$uncurried(p,f,Fay$$_(f)(x));});};Prelude.enumFromByTo$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var to = $p3;var by = $p2;var fr = $p1;return (function(){var neg = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(neg)(Fay$$add$36$uncurried(x,by)));});};var pos = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$gt$36$uncurried(x,to)) ? null : Fay$$_(Fay$$_(Fay$$cons)(x))(Fay$$_(pos)(Fay$$add$36$uncurried(x,by)));});};return Fay$$_(Fay$$lt$36$uncurried(by,0)) ? Fay$$_(neg)(fr) : Fay$$_(pos)(fr);})();});};Prelude.enumFromBy$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var by = $p2;var fr = $p1;return Fay$$_(Fay$$_(Fay$$cons)(fr))(Prelude.enumFromBy$36$uncurried(Fay$$add$36$uncurried(fr,by),by));});};Prelude.enumFromTo$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var n = $p2;var i = $p1;return Fay$$_(Fay$$gt$36$uncurried(i,n)) ? null : Fay$$_(Fay$$_(Fay$$cons)(i))(Prelude.enumFromTo$36$uncurried(Fay$$add$36$uncurried(i,1),n));});};Prelude.enumFrom$36$uncurried = function($p1){return new Fay$$$(function(){var i = $p1;return Fay$$_(Fay$$_(Fay$$cons)(i))(Prelude.enumFrom$36$uncurried$36$uncurried(Fay$$add$36$uncurried(i,1)));});};Prelude.sequence_$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Fay$$return$36$uncurried(Fay$$unit);}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var m = $tmp1.car;var ms = $tmp1.cdr;return Fay$$then$36$uncurried(m,Prelude.sequence_$36$uncurried$36$uncurried(ms));}throw ["unhandled case in sequence_",[$p1]];});};Prelude.mapM_$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var $tmp1 = Fay$$_($p2);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;var m = $p1;return Fay$$then$36$uncurried(Fay$$_(m)(x),Prelude.mapM_$36$uncurried(m,xs));}if (Fay$$_($p2) === null) {return Fay$$return$36$uncurried(Fay$$unit);}throw ["unhandled case in mapM_",[$p1,$p2]];});};Prelude.$36$$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var x = $p2;var f = $p1;return Fay$$_(f)(x);});};Prelude.forM_$36$uncurried = function($p1,$p2){return new Fay$$$(function(){var m = $p2;var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$then$36$uncurried(Fay$$_(m)(x),Prelude.forM_$36$uncurried(xs,m));}if (Fay$$_($p1) === null) {return Fay$$return$36$uncurried(Fay$$unit);}throw ["unhandled case in forM_",[$p1,$p2]];});};Fay.tarai = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var z = $p3;var y = $p2;var x = $p1;return Fay$$_(Fay$$_(Fay$$seq)(x))(Fay$$_(Fay$$_(Fay$$seq)(y))(Fay$$_(Fay$$_(Fay$$seq)(z))(Fay.tarai$39$$36$uncurried(x,y,z))));});};};};Fay.tarai$39$ = function($p1){return function($p2){return function($p3){return new Fay$$$(function(){var z = $p3;var y = $p2;var x = $p1;return Fay$$_(Fay$$lte$36$uncurried(x,y)) ? y : Fay.tarai$36$uncurried(Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(x,1),y,z),Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(y,1),z,x),Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(z,1),x,y));});};};};Fay.main = new Fay$$$(function(){return Prelude.print$36$uncurried(Fay.tarai$36$uncurried(11,5,0));});Fay.tarai$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var z = $p3;var y = $p2;var x = $p1;return Fay$$_(Fay$$_(Fay$$seq)(x))(Fay$$_(Fay$$_(Fay$$seq)(y))(Fay$$_(Fay$$_(Fay$$seq)(z))(Fay.tarai$39$$36$uncurried(x,y,z))));});};Prelude.print$36$uncurried = function($p1){return new Fay$$$(function(){return new Fay$$Monad(Fay$$jsToFay(["unknown"],(function(x) { if (console && console.log) console.log(x) })(Fay$$fayToJs(["automatic"],$p1))));});};Fay.tarai$39$$36$uncurried = function($p1,$p2,$p3){return new Fay$$$(function(){var z = $p3;var y = $p2;var x = $p1;return Fay$$_(Fay$$lte$36$uncurried(x,y)) ? y : Fay.tarai$36$uncurried(Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(x,1),y,z),Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(y,1),z,x),Fay.tarai$36$uncurried(Fay$$sub$36$uncurried(z,1),x,y));});};Prelude.sequence_$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Fay$$return$36$uncurried(Fay$$unit);}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var m = $tmp1.car;var ms = $tmp1.cdr;return Fay$$then$36$uncurried(m,Prelude.sequence_$36$uncurried$36$uncurried(ms));}throw ["unhandled case in sequence_",[$p1]];});};Prelude.enumFrom$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var i = $p1;return Fay$$_(Fay$$_(Fay$$cons)(i))(Prelude.enumFrom$36$uncurried$36$uncurried(Fay$$add$36$uncurried(i,1)));});};Prelude.even$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$eq$36$uncurried(Prelude.rem$36$uncurried(x,2),0);});};Prelude.error$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay(["unknown"],(function() { throw Fay$$fayToJs_string($p1) })());});};Prelude.floor$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.floor(Fay$$fayToJs_double($p1)));});};Prelude.ceiling$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_int(Math.ceil(Fay$$fayToJs_double($p1)));});};Prelude.negate$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return (-(Fay$$_(x)));});};Prelude.abs$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.negate$36$uncurried$36$uncurried(x) : x;});};Prelude.Just$36$uncurried$36$uncurried = function(slot1){return new Fay$$$(function(){return new Prelude._Just(slot1);});};Prelude.init$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried$36$uncurried(Fay$$list("init: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var h = $tmp1.car;var t = $tmp1.cdr;return Fay$$_(Fay$$_(Fay$$cons)(h))(Prelude.init$36$uncurried$36$uncurried(t));}throw ["unhandled case in init",[$p1]];});};Prelude.repeat$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$_(Fay$$cons)(x))(Prelude.repeat$36$uncurried$36$uncurried(x));});};Prelude.unzip$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),2)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null]);}throw ["unhandled case in unzip",[$p1]];});};Prelude.unzip3$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {if (Fay$$listLen(Fay$$_($tmp1.car),3)) {var x = Fay$$index(0,Fay$$_($tmp1.car));var y = Fay$$index(1,Fay$$_($tmp1.car));var z = Fay$$index(2,Fay$$_($tmp1.car));var ps = $tmp1.cdr;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),3)) {var xs = Fay$$index(0,Fay$$_($tmp1));var ys = Fay$$index(1,Fay$$_($tmp1));var zs = Fay$$index(2,Fay$$_($tmp1));return Fay$$list([Fay$$_(Fay$$_(Fay$$cons)(x))(xs),Fay$$_(Fay$$_(Fay$$cons)(y))(ys),Fay$$_(Fay$$_(Fay$$cons)(z))(zs)]);}return (function(){ throw (["unhandled case",$tmp1]); })();})(Prelude.unzip3$36$uncurried$36$uncurried(ps));}}if (Fay$$_($p1) === null) {return Fay$$list([null,null,null]);}throw ["unhandled case in unzip3",[$p1]];});};Prelude.break$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var p = $p1;return Prelude.span(Fay$$_(Prelude.$46$(Prelude.not))(p));});};Prelude.lines$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function(){var isLineBreak = function($p1){return new Fay$$$(function(){var c = $p1;return Fay$$or$36$uncurried(Fay$$eq$36$uncurried(c,"\r"),Fay$$eq$36$uncurried(c,"\n"));});};return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));if (Fay$$_(Fay$$index(1,Fay$$_($tmp1))) === null) {return Fay$$list([a]);}}if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var $tmp2 = Fay$$_(Fay$$index(1,Fay$$_($tmp1)));if ($tmp2 instanceof Fay$$Cons) {var cs = $tmp2.cdr;return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.lines$36$uncurried$36$uncurried(cs));}}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isLineBreak))(s));})();});};Prelude.unlines$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var l = $tmp1.car;var ls = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(l,Fay$$_(Fay$$_(Fay$$cons)("\n"))(Prelude.unlines$36$uncurried$36$uncurried(ls)));}throw ["unhandled case in unlines",[$p1]];});};Prelude.words$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var str = $p1;return (function(){var words$39$ = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return null;}var s = $p1;return (function($tmp1){if (Fay$$listLen(Fay$$_($tmp1),2)) {var a = Fay$$index(0,Fay$$_($tmp1));var b = Fay$$index(1,Fay$$_($tmp1));return Fay$$_(Fay$$_(Fay$$cons)(a))(Prelude.words$36$uncurried$36$uncurried(b));}return (function(){ throw (["unhandled case",$tmp1]); })();})(Fay$$_(Prelude.break$36$uncurried$36$uncurried(isSpace))(s));});};var isSpace = function($p1){return new Fay$$$(function(){var c = $p1;return Prelude.elem$36$uncurried(c,Fay$$list(" \t\r\n\u000c\u000b"));});};return Fay$$_(words$39$)(Prelude.dropWhile$36$uncurried(isSpace,str));})();});};Prelude.and$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return true;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$and$36$uncurried(x,Prelude.and$36$uncurried$36$uncurried(xs));}throw ["unhandled case in and",[$p1]];});};Prelude.or$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){if (Fay$$_($p1) === null) {return false;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Fay$$or$36$uncurried(x,Prelude.or$36$uncurried$36$uncurried(xs));}throw ["unhandled case in or",[$p1]];});};Prelude.reverse$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var x = $tmp1.car;var xs = $tmp1.cdr;return Prelude.$43$$43$$36$uncurried(Prelude.reverse$36$uncurried$36$uncurried(xs),Fay$$list([x]));}if (Fay$$_($p1) === null) {return null;}throw ["unhandled case in reverse",[$p1]];});};Prelude.last$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){while (true) {if (Fay$$_($p1) === null) {return Prelude.error$36$uncurried(Fay$$list("last: empty list"));}if (Fay$$listLen(Fay$$_($p1),1)) {var a = Fay$$index(0,Fay$$_($p1));return a;}var $tmp1 = Fay$$_($p1);if ($tmp1 instanceof Fay$$Cons) {var t = $tmp1.cdr;$p1 = t;continue;}throw ["unhandled case in last",[$p1]];}});};Prelude.sortBy$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var cmp = $p1;return Fay$$_(Prelude.foldr(Prelude.insertBy(cmp)))(null);});};Prelude.not$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var p = $p1;return Fay$$_(p) ? false : true;});};Prelude.fromIntegral$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return $p1;});};Prelude.truncate$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){var x = $p1;return Fay$$_(Fay$$lt$36$uncurried(x,0)) ? Prelude.ceiling$36$uncurried$36$uncurried(x) : Prelude.floor$36$uncurried$36$uncurried(x);});};Prelude.sqrt$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.sqrt(Fay$$fayToJs_double($p1)));});};Prelude.log$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.log(Fay$$fayToJs_double($p1)));});};Prelude.exp$36$uncurried$36$uncurried = function($p1){return new Fay$$$(function(){return Fay$$jsToFay_double(Math.exp(Fay$$fayToJs_double($p1)));});};


var st = process['hrtime']();
Fay$$_(Fay.main, true);
var diff = process['hrtime'](st);

console['warn'](diff[0] * 1e9 + diff[1]);
