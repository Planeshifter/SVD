var Module;
if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function";
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
 if (!Module["print"]) Module["print"] = function print(x) {
  process["stdout"].write(x + "\n");
 };
 if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
  process["stderr"].write(x + "\n");
 };
 var nodeFS = require("fs");
 var nodePath = require("path");
 Module["read"] = function read(filename, binary) {
  filename = nodePath["normalize"](filename);
  var ret = nodeFS["readFileSync"](filename);
  if (!ret && filename != nodePath["resolve"](filename)) {
   filename = path.join(__dirname, "..", "src", filename);
   ret = nodeFS["readFileSync"](filename);
  }
  if (ret && !binary) ret = ret.toString();
  return ret;
 };
 Module["readBinary"] = function readBinary(filename) {
  return Module["read"](filename, true);
 };
 Module["load"] = function load(f) {
  globalEval(read(f));
 };
 if (process["argv"].length > 1) {
  Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
 } else {
  Module["thisProgram"] = "unknown-program";
 }
 Module["arguments"] = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", (function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 }));
} else if (ENVIRONMENT_IS_SHELL) {
 if (!Module["print"]) Module["print"] = print;
 if (typeof printErr != "undefined") Module["printErr"] = printErr;
 if (typeof read != "undefined") {
  Module["read"] = read;
 } else {
  Module["read"] = function read() {
   throw "no read() available (jsc?)";
  };
 }
 Module["readBinary"] = function readBinary(f) {
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  var data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 this["Module"] = Module;
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 Module["read"] = function read(url) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof console !== "undefined") {
  if (!Module["print"]) Module["print"] = function print(x) {
   console.log(x);
  };
  if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
   console.log(x);
  };
 } else {
  var TRY_USE_DUMP = false;
  if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
   dump(x);
  }) : (function(x) {});
 }
 if (ENVIRONMENT_IS_WEB) {
  window["Module"] = Module;
 } else {
  Module["load"] = importScripts;
 }
} else {
 throw "Unknown runtime environment. Where are we?";
}
function globalEval(x) {
 eval.call(null, x);
}
if (!Module["load"] && Module["read"]) {
 Module["load"] = function load(f) {
  globalEval(Module["read"](f));
 };
}
if (!Module["print"]) {
 Module["print"] = (function() {});
}
if (!Module["printErr"]) {
 Module["printErr"] = Module["print"];
}
if (!Module["arguments"]) {
 Module["arguments"] = [];
}
if (!Module["thisProgram"]) {
 Module["thisProgram"] = "./this.program";
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}
var Runtime = {
 setTempRet0: (function(value) {
  tempRet0 = value;
 }),
 getTempRet0: (function() {
  return tempRet0;
 }),
 stackSave: (function() {
  return STACKTOP;
 }),
 stackRestore: (function(stackTop) {
  STACKTOP = stackTop;
 }),
 getNativeTypeSize: (function(type) {
  switch (type) {
  case "i1":
  case "i8":
   return 1;
  case "i16":
   return 2;
  case "i32":
   return 4;
  case "i64":
   return 8;
  case "float":
   return 4;
  case "double":
   return 8;
  default:
   {
    if (type[type.length - 1] === "*") {
     return Runtime.QUANTUM_SIZE;
    } else if (type[0] === "i") {
     var bits = parseInt(type.substr(1));
     assert(bits % 8 === 0);
     return bits / 8;
    } else {
     return 0;
    }
   }
  }
 }),
 getNativeFieldSize: (function(type) {
  return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
 }),
 STACK_ALIGN: 16,
 getAlignSize: (function(type, size, vararg) {
  if (!vararg && (type == "i64" || type == "double")) return 8;
  if (!type) return Math.min(size, 8);
  return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
 }),
 dynCall: (function(sig, ptr, args) {
  if (args && args.length) {
   if (!args.splice) args = Array.prototype.slice.call(args);
   args.splice(0, 0, ptr);
   return Module["dynCall_" + sig].apply(null, args);
  } else {
   return Module["dynCall_" + sig].call(null, ptr);
  }
 }),
 functionPointers: [],
 addFunction: (function(func) {
  for (var i = 0; i < Runtime.functionPointers.length; i++) {
   if (!Runtime.functionPointers[i]) {
    Runtime.functionPointers[i] = func;
    return 2 * (1 + i);
   }
  }
  throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
 }),
 removeFunction: (function(index) {
  Runtime.functionPointers[(index - 2) / 2] = null;
 }),
 getAsmConst: (function(code, numArgs) {
  if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
  var func = Runtime.asmConstCache[code];
  if (func) return func;
  var args = [];
  for (var i = 0; i < numArgs; i++) {
   args.push(String.fromCharCode(36) + i);
  }
  var source = Pointer_stringify(code);
  if (source[0] === '"') {
   if (source.indexOf('"', 1) === source.length - 1) {
    source = source.substr(1, source.length - 2);
   } else {
    abort("invalid EM_ASM input |" + source + "|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)");
   }
  }
  try {
   var evalled = eval("(function(Module, FS) { return function(" + args.join(",") + "){ " + source + " } })")(Module, typeof FS !== "undefined" ? FS : null);
  } catch (e) {
   Module.printErr("error in executing inline EM_ASM code: " + e + " on: \n\n" + source + "\n\nwith args |" + args + "| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)");
   throw e;
  }
  return Runtime.asmConstCache[code] = evalled;
 }),
 warnOnce: (function(text) {
  if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
  if (!Runtime.warnOnce.shown[text]) {
   Runtime.warnOnce.shown[text] = 1;
   Module.printErr(text);
  }
 }),
 funcWrappers: {},
 getFuncWrapper: (function(func, sig) {
  assert(sig);
  if (!Runtime.funcWrappers[sig]) {
   Runtime.funcWrappers[sig] = {};
  }
  var sigCache = Runtime.funcWrappers[sig];
  if (!sigCache[func]) {
   sigCache[func] = function dynCall_wrapper() {
    return Runtime.dynCall(sig, func, arguments);
   };
  }
  return sigCache[func];
 }),
 UTF8Processor: (function() {
  var buffer = [];
  var needed = 0;
  this.processCChar = (function(code) {
   code = code & 255;
   if (buffer.length == 0) {
    if ((code & 128) == 0) {
     return String.fromCharCode(code);
    }
    buffer.push(code);
    if ((code & 224) == 192) {
     needed = 1;
    } else if ((code & 240) == 224) {
     needed = 2;
    } else {
     needed = 3;
    }
    return "";
   }
   if (needed) {
    buffer.push(code);
    needed--;
    if (needed > 0) return "";
   }
   var c1 = buffer[0];
   var c2 = buffer[1];
   var c3 = buffer[2];
   var c4 = buffer[3];
   var ret;
   if (buffer.length == 2) {
    ret = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
   } else if (buffer.length == 3) {
    ret = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
   } else {
    var codePoint = (c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63;
    ret = String.fromCharCode(((codePoint - 65536) / 1024 | 0) + 55296, (codePoint - 65536) % 1024 + 56320);
   }
   buffer.length = 0;
   return ret;
  });
  this.processJSString = function processJSString(string) {
   string = unescape(encodeURIComponent(string));
   var ret = [];
   for (var i = 0; i < string.length; i++) {
    ret.push(string.charCodeAt(i));
   }
   return ret;
  };
 }),
 getCompilerSetting: (function(name) {
  throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work";
 }),
 stackAlloc: (function(size) {
  var ret = STACKTOP;
  STACKTOP = STACKTOP + size | 0;
  STACKTOP = STACKTOP + 15 & -16;
  return ret;
 }),
 staticAlloc: (function(size) {
  var ret = STATICTOP;
  STATICTOP = STATICTOP + size | 0;
  STATICTOP = STATICTOP + 15 & -16;
  return ret;
 }),
 dynamicAlloc: (function(size) {
  var ret = DYNAMICTOP;
  DYNAMICTOP = DYNAMICTOP + size | 0;
  DYNAMICTOP = DYNAMICTOP + 15 & -16;
  if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();
  return ret;
 }),
 alignMemory: (function(size, quantum) {
  var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
  return ret;
 }),
 makeBigInt: (function(low, high, unsigned) {
  var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
  return ret;
 }),
 GLOBAL_BASE: 8,
 QUANTUM_SIZE: 4,
 __dummy__: 0
};
Module["Runtime"] = Runtime;
var __THREW__ = 0;
var ABORT = false;
var EXITSTATUS = 0;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}
var globalScope = this;
function getCFunc(ident) {
 var func = Module["_" + ident];
 if (!func) {
  try {
   func = eval("_" + ident);
  } catch (e) {}
 }
 assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
 return func;
}
var cwrap, ccall;
((function() {
 var stack = 0;
 var JSfuncs = {
  "stackSave": (function() {
   stack = Runtime.stackSave();
  }),
  "stackRestore": (function() {
   Runtime.stackRestore(stack);
  }),
  "arrayToC": (function(arr) {
   var ret = Runtime.stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }),
  "stringToC": (function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    ret = Runtime.stackAlloc((str.length << 2) + 1);
    writeStringToMemory(str, ret);
   }
   return ret;
  })
 };
 var toC = {
  "string": JSfuncs["stringToC"],
  "array": JSfuncs["arrayToC"]
 };
 ccall = function ccallFunc(ident, returnType, argTypes, args) {
  var func = getCFunc(ident);
  var cArgs = [];
  if (args) {
   for (var i = 0; i < args.length; i++) {
    var converter = toC[argTypes[i]];
    if (converter) {
     if (stack === 0) stack = Runtime.stackSave();
     cArgs[i] = converter(args[i]);
    } else {
     cArgs[i] = args[i];
    }
   }
  }
  var ret = func.apply(null, cArgs);
  if (returnType === "string") ret = Pointer_stringify(ret);
  if (stack !== 0) JSfuncs["stackRestore"]();
  return ret;
 };
 var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
 function parseJSFunc(jsfunc) {
  var parsed = jsfunc.toString().match(sourceRegex).slice(1);
  return {
   arguments: parsed[0],
   body: parsed[1],
   returnValue: parsed[2]
  };
 }
 var JSsource = {};
 for (var fun in JSfuncs) {
  if (JSfuncs.hasOwnProperty(fun)) {
   JSsource[fun] = parseJSFunc(JSfuncs[fun]);
  }
 }
 cwrap = function cwrap(ident, returnType, argTypes) {
  argTypes = argTypes || [];
  var cfunc = getCFunc(ident);
  var numericArgs = argTypes.every((function(type) {
   return type === "number";
  }));
  var numericRet = returnType !== "string";
  if (numericRet && numericArgs) {
   return cfunc;
  }
  var argNames = argTypes.map((function(x, i) {
   return "$" + i;
  }));
  var funcstr = "(function(" + argNames.join(",") + ") {";
  var nargs = argTypes.length;
  if (!numericArgs) {
   funcstr += JSsource["stackSave"].body + ";";
   for (var i = 0; i < nargs; i++) {
    var arg = argNames[i], type = argTypes[i];
    if (type === "number") continue;
    var convertCode = JSsource[type + "ToC"];
    funcstr += "var " + convertCode.arguments + " = " + arg + ";";
    funcstr += convertCode.body + ";";
    funcstr += arg + "=" + convertCode.returnValue + ";";
   }
  }
  var cfuncname = parseJSFunc((function() {
   return cfunc;
  })).returnValue;
  funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
  if (!numericRet) {
   var strgfy = parseJSFunc((function() {
    return Pointer_stringify;
   })).returnValue;
   funcstr += "ret = " + strgfy + "(ret);";
  }
  if (!numericArgs) {
   funcstr += JSsource["stackRestore"].body + ";";
  }
  funcstr += "return ret})";
  return eval(funcstr);
 };
}))();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;
function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;
 case "i8":
  HEAP8[ptr >> 0] = value;
  break;
 case "i16":
  HEAP16[ptr >> 1] = value;
  break;
 case "i32":
  HEAP32[ptr >> 2] = value;
  break;
 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;
 case "float":
  HEAPF32[ptr >> 2] = value;
  break;
 case "double":
  HEAPF64[ptr >> 3] = value;
  break;
 default:
  abort("invalid type for setValue: " + type);
 }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  return HEAP8[ptr >> 0];
 case "i8":
  return HEAP8[ptr >> 0];
 case "i16":
  return HEAP16[ptr >> 1];
 case "i32":
  return HEAP32[ptr >> 2];
 case "i64":
  return HEAP32[ptr >> 2];
 case "float":
  return HEAPF32[ptr >> 2];
 case "double":
  return HEAPF64[ptr >> 3];
 default:
  abort("invalid type for setValue: " + type);
 }
 return null;
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;
function allocate(slab, types, allocator, ptr) {
 var zeroinit, size;
 if (typeof slab === "number") {
  zeroinit = true;
  size = slab;
 } else {
  zeroinit = false;
  size = slab.length;
 }
 var singleType = typeof types === "string" ? types : null;
 var ret;
 if (allocator == ALLOC_NONE) {
  ret = ptr;
 } else {
  ret = [ _malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc ][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
 }
 if (zeroinit) {
  var ptr = ret, stop;
  assert((ret & 3) == 0);
  stop = ret + (size & ~3);
  for (; ptr < stop; ptr += 4) {
   HEAP32[ptr >> 2] = 0;
  }
  stop = ret + size;
  while (ptr < stop) {
   HEAP8[ptr++ >> 0] = 0;
  }
  return ret;
 }
 if (singleType === "i8") {
  if (slab.subarray || slab.slice) {
   HEAPU8.set(slab, ret);
  } else {
   HEAPU8.set(new Uint8Array(slab), ret);
  }
  return ret;
 }
 var i = 0, type, typeSize, previousType;
 while (i < size) {
  var curr = slab[i];
  if (typeof curr === "function") {
   curr = Runtime.getFunctionIndex(curr);
  }
  type = singleType || types[i];
  if (type === 0) {
   i++;
   continue;
  }
  if (type == "i64") type = "i32";
  setValue(ret + i, curr, type);
  if (previousType !== type) {
   typeSize = Runtime.getNativeTypeSize(type);
   previousType = type;
  }
  i += typeSize;
 }
 return ret;
}
Module["allocate"] = allocate;
function Pointer_stringify(ptr, length) {
 if (length === 0 || !ptr) return "";
 var hasUtf = false;
 var t;
 var i = 0;
 while (1) {
  t = HEAPU8[ptr + i >> 0];
  if (t >= 128) hasUtf = true; else if (t == 0 && !length) break;
  i++;
  if (length && i == length) break;
 }
 if (!length) length = i;
 var ret = "";
 if (!hasUtf) {
  var MAX_CHUNK = 1024;
  var curr;
  while (length > 0) {
   curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
   ret = ret ? ret + curr : curr;
   ptr += MAX_CHUNK;
   length -= MAX_CHUNK;
  }
  return ret;
 }
 var utf8 = new Runtime.UTF8Processor;
 for (i = 0; i < length; i++) {
  t = HEAPU8[ptr + i >> 0];
  ret += utf8.processCChar(t);
 }
 return ret;
}
Module["Pointer_stringify"] = Pointer_stringify;
function UTF16ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var codeUnit = HEAP16[ptr + i * 2 >> 1];
  if (codeUnit == 0) return str;
  ++i;
  str += String.fromCharCode(codeUnit);
 }
}
Module["UTF16ToString"] = UTF16ToString;
function stringToUTF16(str, outPtr) {
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  HEAP16[outPtr + i * 2 >> 1] = codeUnit;
 }
 HEAP16[outPtr + str.length * 2 >> 1] = 0;
}
Module["stringToUTF16"] = stringToUTF16;
function UTF32ToString(ptr) {
 var i = 0;
 var str = "";
 while (1) {
  var utf32 = HEAP32[ptr + i * 4 >> 2];
  if (utf32 == 0) return str;
  ++i;
  if (utf32 >= 65536) {
   var ch = utf32 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  } else {
   str += String.fromCharCode(utf32);
  }
 }
}
Module["UTF32ToString"] = UTF32ToString;
function stringToUTF32(str, outPtr) {
 var iChar = 0;
 for (var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
  var codeUnit = str.charCodeAt(iCodeUnit);
  if (codeUnit >= 55296 && codeUnit <= 57343) {
   var trailSurrogate = str.charCodeAt(++iCodeUnit);
   codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
  }
  HEAP32[outPtr + iChar * 4 >> 2] = codeUnit;
  ++iChar;
 }
 HEAP32[outPtr + iChar * 4 >> 2] = 0;
}
Module["stringToUTF32"] = stringToUTF32;
function demangle(func) {
 var hasLibcxxabi = !!Module["___cxa_demangle"];
 if (hasLibcxxabi) {
  try {
   var buf = _malloc(func.length);
   writeStringToMemory(func.substr(1), buf);
   var status = _malloc(4);
   var ret = Module["___cxa_demangle"](buf, 0, 0, status);
   if (getValue(status, "i32") === 0 && ret) {
    return Pointer_stringify(ret);
   }
  } catch (e) {} finally {
   if (buf) _free(buf);
   if (status) _free(status);
   if (ret) _free(ret);
  }
 }
 var i = 3;
 var basicTypes = {
  "v": "void",
  "b": "bool",
  "c": "char",
  "s": "short",
  "i": "int",
  "l": "long",
  "f": "float",
  "d": "double",
  "w": "wchar_t",
  "a": "signed char",
  "h": "unsigned char",
  "t": "unsigned short",
  "j": "unsigned int",
  "m": "unsigned long",
  "x": "long long",
  "y": "unsigned long long",
  "z": "..."
 };
 var subs = [];
 var first = true;
 function dump(x) {
  if (x) Module.print(x);
  Module.print(func);
  var pre = "";
  for (var a = 0; a < i; a++) pre += " ";
  Module.print(pre + "^");
 }
 function parseNested() {
  i++;
  if (func[i] === "K") i++;
  var parts = [];
  while (func[i] !== "E") {
   if (func[i] === "S") {
    i++;
    var next = func.indexOf("_", i);
    var num = func.substring(i, next) || 0;
    parts.push(subs[num] || "?");
    i = next + 1;
    continue;
   }
   if (func[i] === "C") {
    parts.push(parts[parts.length - 1]);
    i += 2;
    continue;
   }
   var size = parseInt(func.substr(i));
   var pre = size.toString().length;
   if (!size || !pre) {
    i--;
    break;
   }
   var curr = func.substr(i + pre, size);
   parts.push(curr);
   subs.push(curr);
   i += pre + size;
  }
  i++;
  return parts;
 }
 function parse(rawList, limit, allowVoid) {
  limit = limit || Infinity;
  var ret = "", list = [];
  function flushList() {
   return "(" + list.join(", ") + ")";
  }
  var name;
  if (func[i] === "N") {
   name = parseNested().join("::");
   limit--;
   if (limit === 0) return rawList ? [ name ] : name;
  } else {
   if (func[i] === "K" || first && func[i] === "L") i++;
   var size = parseInt(func.substr(i));
   if (size) {
    var pre = size.toString().length;
    name = func.substr(i + pre, size);
    i += pre + size;
   }
  }
  first = false;
  if (func[i] === "I") {
   i++;
   var iList = parse(true);
   var iRet = parse(true, 1, true);
   ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">";
  } else {
   ret = name;
  }
  paramLoop : while (i < func.length && limit-- > 0) {
   var c = func[i++];
   if (c in basicTypes) {
    list.push(basicTypes[c]);
   } else {
    switch (c) {
    case "P":
     list.push(parse(true, 1, true)[0] + "*");
     break;
    case "R":
     list.push(parse(true, 1, true)[0] + "&");
     break;
    case "L":
     {
      i++;
      var end = func.indexOf("E", i);
      var size = end - i;
      list.push(func.substr(i, size));
      i += size + 2;
      break;
     }
    case "A":
     {
      var size = parseInt(func.substr(i));
      i += size.toString().length;
      if (func[i] !== "_") throw "?";
      i++;
      list.push(parse(true, 1, true)[0] + " [" + size + "]");
      break;
     }
    case "E":
     break paramLoop;
    default:
     ret += "?" + c;
     break paramLoop;
    }
   }
  }
  if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
  if (rawList) {
   if (ret) {
    list.push(ret + "?");
   }
   return list;
  } else {
   return ret + flushList();
  }
 }
 var final = func;
 try {
  if (func == "Object._main" || func == "_main") {
   return "main()";
  }
  if (typeof func === "number") func = Pointer_stringify(func);
  if (func[0] !== "_") return func;
  if (func[1] !== "_") return func;
  if (func[2] !== "Z") return func;
  switch (func[3]) {
  case "n":
   return "operator new()";
  case "d":
   return "operator delete()";
  }
  final = parse();
 } catch (e) {
  final += "?";
 }
 if (final.indexOf("?") >= 0 && !hasLibcxxabi) {
  Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
 }
 return final;
}
function demangleAll(text) {
 return text.replace(/__Z[\w\d_]+/g, (function(x) {
  var y = demangle(x);
  return x === y ? x : x + " [" + y + "]";
 }));
}
function jsStackTrace() {
 var err = new Error;
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}
function stackTrace() {
 return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
 return x + 4095 & -4096;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false;
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0;
var DYNAMIC_BASE = 0, DYNAMICTOP = 0;
function enlargeMemory() {
 abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.");
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
var FAST_MEMORY = Module["FAST_MEMORY"] || 2097152;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
 if (totalMemory < 16 * 1024 * 1024) {
  totalMemory *= 2;
 } else {
  totalMemory += 16 * 1024 * 1024;
 }
}
if (totalMemory !== TOTAL_MEMORY) {
 Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec");
 TOTAL_MEMORY = totalMemory;
}
assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Runtime.dynCall("v", func);
   } else {
    Runtime.dynCall("vi", func, [ callback.arg ]);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
 callRuntimeCallbacks(__ATEXIT__);
 runtimeExited = true;
}
function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}
Module["addOnInit"] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
 __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;
function intArrayFromString(stringy, dontAddNull, length) {
 var ret = (new Runtime.UTF8Processor).processJSString(stringy);
 if (length) {
  ret.length = length;
 }
 if (!dontAddNull) {
  ret.push(0);
 }
 return ret;
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
 var ret = [];
 for (var i = 0; i < array.length; i++) {
  var chr = array[i];
  if (chr > 255) {
   chr &= 255;
  }
  ret.push(String.fromCharCode(chr));
 }
 return ret.join("");
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
 var array = intArrayFromString(string, dontAddNull);
 var i = 0;
 while (i < array.length) {
  var chr = array[i];
  HEAP8[buffer + i >> 0] = chr;
  i = i + 1;
 }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
 for (var i = 0; i < array.length; i++) {
  HEAP8[buffer + i >> 0] = array[i];
 }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; i++) {
  HEAP8[buffer + i >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer + str.length >> 0] = 0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;
function unSign(value, bits, ignore) {
 if (value >= 0) {
  return value;
 }
 return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}
function reSign(value, bits, ignore) {
 if (value <= 0) {
  return value;
 }
 var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
 if (value >= half && (bits <= 32 || value > half)) {
  value = -2 * half + value;
 }
 return value;
}
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
 var ah = a >>> 16;
 var al = a & 65535;
 var bh = b >>> 16;
 var bl = b & 65535;
 return al * bl + (ah * bl + al * bh << 16) | 0;
};
Math.imul = Math["imul"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 4224;
__ATINIT__.push({
 func: (function() {
  __GLOBAL__I_a();
 })
}, {
 func: (function() {
  __GLOBAL__I_a23();
 })
});
var memoryInitializer = "svd.js.mem";
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
}
function copyTempDouble(ptr) {
 HEAP8[tempDoublePtr] = HEAP8[ptr];
 HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
 HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
 HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
 HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
 HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
 HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
 HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7];
}
var structRegistrations = {};
function embind_init_charCodes() {
 var codes = new Array(256);
 for (var i = 0; i < 256; ++i) {
  codes[i] = String.fromCharCode(i);
 }
 embind_charCodes = codes;
}
var embind_charCodes = undefined;
function readLatin1String(ptr) {
 var ret = "";
 var c = ptr;
 while (HEAPU8[c]) {
  ret += embind_charCodes[HEAPU8[c++]];
 }
 return ret;
}
var char_0 = 48;
var char_9 = 57;
function makeLegalFunctionName(name) {
 if (undefined === name) {
  return "_unknown";
 }
 name = name.replace(/[^a-zA-Z0-9_]/g, "$");
 var f = name.charCodeAt(0);
 if (f >= char_0 && f <= char_9) {
  return "_" + name;
 } else {
  return name;
 }
}
function createNamedFunction(name, body) {
 name = makeLegalFunctionName(name);
 return (new Function("body", "return function " + name + "() {\n" + '    "use strict";' + "    return body.apply(this, arguments);\n" + "};\n"))(body);
}
function extendError(baseErrorType, errorName) {
 var errorClass = createNamedFunction(errorName, (function(message) {
  this.name = errorName;
  this.message = message;
  var stack = (new Error(message)).stack;
  if (stack !== undefined) {
   this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
  }
 }));
 errorClass.prototype = Object.create(baseErrorType.prototype);
 errorClass.prototype.constructor = errorClass;
 errorClass.prototype.toString = (function() {
  if (this.message === undefined) {
   return this.name;
  } else {
   return this.name + ": " + this.message;
  }
 });
 return errorClass;
}
var BindingError = undefined;
function throwBindingError(message) {
 throw new BindingError(message);
}
function requireFunction(signature, rawFunction) {
 signature = readLatin1String(signature);
 function makeDynCaller(dynCall) {
  var args = [];
  for (var i = 1; i < signature.length; ++i) {
   args.push("a" + i);
  }
  var name = "dynCall_" + signature + "_" + rawFunction;
  var body = "return function " + name + "(" + args.join(", ") + ") {\n";
  body += "    return dynCall(rawFunction" + (args.length ? ", " : "") + args.join(", ") + ");\n";
  body += "};\n";
  return (new Function("dynCall", "rawFunction", body))(dynCall, rawFunction);
 }
 var fp;
 if (Module["FUNCTION_TABLE_" + signature] !== undefined) {
  fp = Module["FUNCTION_TABLE_" + signature][rawFunction];
 } else if (typeof FUNCTION_TABLE !== "undefined") {
  fp = FUNCTION_TABLE[rawFunction];
 } else {
  var dc = asm["dynCall_" + signature];
  if (dc === undefined) {
   dc = asm["dynCall_" + signature.replace(/f/g, "d")];
   if (dc === undefined) {
    throwBindingError("No dynCall invoker for signature: " + signature);
   }
  }
  fp = makeDynCaller(dc);
 }
 if (typeof fp !== "function") {
  throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
 }
 return fp;
}
function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
 structRegistrations[rawType] = {
  name: readLatin1String(name),
  rawConstructor: requireFunction(constructorSignature, rawConstructor),
  rawDestructor: requireFunction(destructorSignature, rawDestructor),
  fields: []
 };
}
var _fabsf = Math_abs;
var ___errno_state = 0;
function ___setErrNo(value) {
 HEAP32[___errno_state >> 2] = value;
 return value;
}
var ERRNO_CODES = {
 EPERM: 1,
 ENOENT: 2,
 ESRCH: 3,
 EINTR: 4,
 EIO: 5,
 ENXIO: 6,
 E2BIG: 7,
 ENOEXEC: 8,
 EBADF: 9,
 ECHILD: 10,
 EAGAIN: 11,
 EWOULDBLOCK: 11,
 ENOMEM: 12,
 EACCES: 13,
 EFAULT: 14,
 ENOTBLK: 15,
 EBUSY: 16,
 EEXIST: 17,
 EXDEV: 18,
 ENODEV: 19,
 ENOTDIR: 20,
 EISDIR: 21,
 EINVAL: 22,
 ENFILE: 23,
 EMFILE: 24,
 ENOTTY: 25,
 ETXTBSY: 26,
 EFBIG: 27,
 ENOSPC: 28,
 ESPIPE: 29,
 EROFS: 30,
 EMLINK: 31,
 EPIPE: 32,
 EDOM: 33,
 ERANGE: 34,
 ENOMSG: 42,
 EIDRM: 43,
 ECHRNG: 44,
 EL2NSYNC: 45,
 EL3HLT: 46,
 EL3RST: 47,
 ELNRNG: 48,
 EUNATCH: 49,
 ENOCSI: 50,
 EL2HLT: 51,
 EDEADLK: 35,
 ENOLCK: 37,
 EBADE: 52,
 EBADR: 53,
 EXFULL: 54,
 ENOANO: 55,
 EBADRQC: 56,
 EBADSLT: 57,
 EDEADLOCK: 35,
 EBFONT: 59,
 ENOSTR: 60,
 ENODATA: 61,
 ETIME: 62,
 ENOSR: 63,
 ENONET: 64,
 ENOPKG: 65,
 EREMOTE: 66,
 ENOLINK: 67,
 EADV: 68,
 ESRMNT: 69,
 ECOMM: 70,
 EPROTO: 71,
 EMULTIHOP: 72,
 EDOTDOT: 73,
 EBADMSG: 74,
 ENOTUNIQ: 76,
 EBADFD: 77,
 EREMCHG: 78,
 ELIBACC: 79,
 ELIBBAD: 80,
 ELIBSCN: 81,
 ELIBMAX: 82,
 ELIBEXEC: 83,
 ENOSYS: 38,
 ENOTEMPTY: 39,
 ENAMETOOLONG: 36,
 ELOOP: 40,
 EOPNOTSUPP: 95,
 EPFNOSUPPORT: 96,
 ECONNRESET: 104,
 ENOBUFS: 105,
 EAFNOSUPPORT: 97,
 EPROTOTYPE: 91,
 ENOTSOCK: 88,
 ENOPROTOOPT: 92,
 ESHUTDOWN: 108,
 ECONNREFUSED: 111,
 EADDRINUSE: 98,
 ECONNABORTED: 103,
 ENETUNREACH: 101,
 ENETDOWN: 100,
 ETIMEDOUT: 110,
 EHOSTDOWN: 112,
 EHOSTUNREACH: 113,
 EINPROGRESS: 115,
 EALREADY: 114,
 EDESTADDRREQ: 89,
 EMSGSIZE: 90,
 EPROTONOSUPPORT: 93,
 ESOCKTNOSUPPORT: 94,
 EADDRNOTAVAIL: 99,
 ENETRESET: 102,
 EISCONN: 106,
 ENOTCONN: 107,
 ETOOMANYREFS: 109,
 EUSERS: 87,
 EDQUOT: 122,
 ESTALE: 116,
 ENOTSUP: 95,
 ENOMEDIUM: 123,
 EILSEQ: 84,
 EOVERFLOW: 75,
 ECANCELED: 125,
 ENOTRECOVERABLE: 131,
 EOWNERDEAD: 130,
 ESTRPIPE: 86
};
function _sysconf(name) {
 switch (name) {
 case 30:
  return PAGE_SIZE;
 case 132:
 case 133:
 case 12:
 case 137:
 case 138:
 case 15:
 case 235:
 case 16:
 case 17:
 case 18:
 case 19:
 case 20:
 case 149:
 case 13:
 case 10:
 case 236:
 case 153:
 case 9:
 case 21:
 case 22:
 case 159:
 case 154:
 case 14:
 case 77:
 case 78:
 case 139:
 case 80:
 case 81:
 case 79:
 case 82:
 case 68:
 case 67:
 case 164:
 case 11:
 case 29:
 case 47:
 case 48:
 case 95:
 case 52:
 case 51:
 case 46:
  return 200809;
 case 27:
 case 246:
 case 127:
 case 128:
 case 23:
 case 24:
 case 160:
 case 161:
 case 181:
 case 182:
 case 242:
 case 183:
 case 184:
 case 243:
 case 244:
 case 245:
 case 165:
 case 178:
 case 179:
 case 49:
 case 50:
 case 168:
 case 169:
 case 175:
 case 170:
 case 171:
 case 172:
 case 97:
 case 76:
 case 32:
 case 173:
 case 35:
  return -1;
 case 176:
 case 177:
 case 7:
 case 155:
 case 8:
 case 157:
 case 125:
 case 126:
 case 92:
 case 93:
 case 129:
 case 130:
 case 131:
 case 94:
 case 91:
  return 1;
 case 74:
 case 60:
 case 69:
 case 70:
 case 4:
  return 1024;
 case 31:
 case 42:
 case 72:
  return 32;
 case 87:
 case 26:
 case 33:
  return 2147483647;
 case 34:
 case 1:
  return 47839;
 case 38:
 case 36:
  return 99;
 case 43:
 case 37:
  return 2048;
 case 0:
  return 2097152;
 case 3:
  return 65536;
 case 28:
  return 32768;
 case 44:
  return 32767;
 case 75:
  return 16384;
 case 39:
  return 1e3;
 case 89:
  return 700;
 case 71:
  return 256;
 case 40:
  return 255;
 case 2:
  return 100;
 case 180:
  return 64;
 case 25:
  return 20;
 case 5:
  return 16;
 case 6:
  return 6;
 case 73:
  return 4;
 case 84:
  {
   if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
   return 1;
  }
 }
 ___setErrNo(ERRNO_CODES.EINVAL);
 return -1;
}
var awaitingDependencies = {};
var registeredTypes = {};
var typeDependencies = {};
var InternalError = undefined;
function throwInternalError(message) {
 throw new InternalError(message);
}
function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
 myTypes.forEach((function(type) {
  typeDependencies[type] = dependentTypes;
 }));
 function onComplete(typeConverters) {
  var myTypeConverters = getTypeConverters(typeConverters);
  if (myTypeConverters.length !== myTypes.length) {
   throwInternalError("Mismatched type converter count");
  }
  for (var i = 0; i < myTypes.length; ++i) {
   registerType(myTypes[i], myTypeConverters[i]);
  }
 }
 var typeConverters = new Array(dependentTypes.length);
 var unregisteredTypes = [];
 var registered = 0;
 dependentTypes.forEach((function(dt, i) {
  if (registeredTypes.hasOwnProperty(dt)) {
   typeConverters[i] = registeredTypes[dt];
  } else {
   unregisteredTypes.push(dt);
   if (!awaitingDependencies.hasOwnProperty(dt)) {
    awaitingDependencies[dt] = [];
   }
   awaitingDependencies[dt].push((function() {
    typeConverters[i] = registeredTypes[dt];
    ++registered;
    if (registered === unregisteredTypes.length) {
     onComplete(typeConverters);
    }
   }));
  }
 }));
 if (0 === unregisteredTypes.length) {
  onComplete(typeConverters);
 }
}
function registerType(rawType, registeredInstance, options) {
 options = options || {};
 if (!("argPackAdvance" in registeredInstance)) {
  throw new TypeError("registerType registeredInstance requires argPackAdvance");
 }
 var name = registeredInstance.name;
 if (!rawType) {
  throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
 }
 if (registeredTypes.hasOwnProperty(rawType)) {
  if (options.ignoreDuplicateRegistrations) {
   return;
  } else {
   throwBindingError("Cannot register type '" + name + "' twice");
  }
 }
 registeredTypes[rawType] = registeredInstance;
 delete typeDependencies[rawType];
 if (awaitingDependencies.hasOwnProperty(rawType)) {
  var callbacks = awaitingDependencies[rawType];
  delete awaitingDependencies[rawType];
  callbacks.forEach((function(cb) {
   cb();
  }));
 }
}
function __embind_register_void(rawType, name) {
 name = readLatin1String(name);
 registerType(rawType, {
  isVoid: true,
  name: name,
  "argPackAdvance": 0,
  "fromWireType": (function() {
   return undefined;
  }),
  "toWireType": (function(destructors, o) {
   return undefined;
  })
 });
}
function __ZSt18uncaught_exceptionv() {
 return !!__ZSt18uncaught_exceptionv.uncaught_exception;
}
var EXCEPTIONS = {
 last: 0,
 caught: [],
 infos: {},
 deAdjust: (function(adjusted) {
  if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
  for (var ptr in EXCEPTIONS.infos) {
   var info = EXCEPTIONS.infos[ptr];
   if (info.adjusted === adjusted) {
    return ptr;
   }
  }
  return adjusted;
 }),
 addRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount++;
 }),
 decRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  assert(info.refcount > 0);
  info.refcount--;
  if (info.refcount === 0) {
   if (info.destructor) {
    Runtime.dynCall("vi", info.destructor, [ ptr ]);
   }
   delete EXCEPTIONS.infos[ptr];
   ___cxa_free_exception(ptr);
  }
 }),
 clearRef: (function(ptr) {
  if (!ptr) return;
  var info = EXCEPTIONS.infos[ptr];
  info.refcount = 0;
 })
};
function ___resumeException(ptr) {
 if (!EXCEPTIONS.last) {
  EXCEPTIONS.last = ptr;
 }
 EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
function ___cxa_find_matching_catch() {
 var thrown = EXCEPTIONS.last;
 if (!thrown) {
  return (asm["setTempRet0"](0), 0) | 0;
 }
 var info = EXCEPTIONS.infos[thrown];
 var throwntype = info.type;
 if (!throwntype) {
  return (asm["setTempRet0"](0), thrown) | 0;
 }
 var typeArray = Array.prototype.slice.call(arguments);
 var pointer = Module["___cxa_is_pointer_type"](throwntype);
 if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
 HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
 thrown = ___cxa_find_matching_catch.buffer;
 for (var i = 0; i < typeArray.length; i++) {
  if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
   thrown = HEAP32[thrown >> 2];
   info.adjusted = thrown;
   return (asm["setTempRet0"](typeArray[i]), thrown) | 0;
  }
 }
 thrown = HEAP32[thrown >> 2];
 return (asm["setTempRet0"](throwntype), thrown) | 0;
}
function ___cxa_throw(ptr, type, destructor) {
 EXCEPTIONS.infos[ptr] = {
  ptr: ptr,
  adjusted: ptr,
  type: type,
  destructor: destructor,
  refcount: 0
 };
 EXCEPTIONS.last = ptr;
 if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
  __ZSt18uncaught_exceptionv.uncaught_exception = 1;
 } else {
  __ZSt18uncaught_exceptionv.uncaught_exception++;
 }
 throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
}
Module["_memset"] = _memset;
function getShiftFromSize(size) {
 switch (size) {
 case 1:
  return 0;
 case 2:
  return 1;
 case 4:
  return 2;
 case 8:
  return 3;
 default:
  throw new TypeError("Unknown type size: " + size);
 }
}
function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
 var shift = getShiftFromSize(size);
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": (function(wt) {
   return !!wt;
  }),
  "toWireType": (function(destructors, o) {
   return o ? trueValue : falseValue;
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": (function(pointer) {
   var heap;
   if (size === 1) {
    heap = HEAP8;
   } else if (size === 2) {
    heap = HEAP16;
   } else if (size === 4) {
    heap = HEAP32;
   } else {
    throw new TypeError("Unknown boolean type size: " + name);
   }
   return this["fromWireType"](heap[pointer >> shift]);
  }),
  destructorFunction: null
 });
}
function _abort() {
 Module["abort"]();
}
function runDestructors(destructors) {
 while (destructors.length) {
  var ptr = destructors.pop();
  var del = destructors.pop();
  del(ptr);
 }
}
var UnboundTypeError = undefined;
function throwUnboundTypeError(message, types) {
 var unboundTypes = [];
 var seen = {};
 function visit(type) {
  if (seen[type]) {
   return;
  }
  if (registeredTypes[type]) {
   return;
  }
  if (typeDependencies[type]) {
   typeDependencies[type].forEach(visit);
   return;
  }
  unboundTypes.push(type);
  seen[type] = true;
 }
 types.forEach(visit);
 throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([ ", " ]));
}
function upcastPointer(ptr, ptrClass, desiredClass) {
 while (ptrClass !== desiredClass) {
  if (!ptrClass.upcast) {
   throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
  }
  ptr = ptrClass.upcast(ptr);
  ptrClass = ptrClass.baseClass;
 }
 return ptr;
}
function validateThis(this_, classType, humanName) {
 if (!(this_ instanceof Object)) {
  throwBindingError(humanName + ' with invalid "this": ' + this_);
 }
 if (!(this_ instanceof classType.registeredClass.constructor)) {
  throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name);
 }
 if (!this_.$$.ptr) {
  throwBindingError("cannot call emscripten binding method " + humanName + " on deleted object");
 }
 return upcastPointer(this_.$$.ptr, this_.$$.ptrType.registeredClass, classType.registeredClass);
}
function __embind_register_class_property(classType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
 fieldName = readLatin1String(fieldName);
 getter = requireFunction(getterSignature, getter);
 whenDependentTypesAreResolved([], [ classType ], (function(classType) {
  classType = classType[0];
  var humanName = classType.name + "." + fieldName;
  var desc = {
   get: (function() {
    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [ getterReturnType, setterArgumentType ]);
   }),
   enumerable: true,
   configurable: true
  };
  if (setter) {
   desc.set = (function() {
    throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [ getterReturnType, setterArgumentType ]);
   });
  } else {
   desc.set = (function(v) {
    throwBindingError(humanName + " is a read-only property");
   });
  }
  Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
  whenDependentTypesAreResolved([], setter ? [ getterReturnType, setterArgumentType ] : [ getterReturnType ], (function(types) {
   var getterReturnType = types[0];
   var desc = {
    get: (function() {
     var ptr = validateThis(this, classType, humanName + " getter");
     return getterReturnType["fromWireType"](getter(getterContext, ptr));
    }),
    enumerable: true
   };
   if (setter) {
    setter = requireFunction(setterSignature, setter);
    var setterArgumentType = types[1];
    desc.set = (function(v) {
     var ptr = validateThis(this, classType, humanName + " setter");
     var destructors = [];
     setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, v));
     runDestructors(destructors);
    });
   }
   Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
   return [];
  }));
  return [];
 }));
}
function _free() {}
Module["_free"] = _free;
function _malloc(bytes) {
 var ptr = Runtime.dynamicAlloc(bytes + 8);
 return ptr + 8 & 4294967288;
}
Module["_malloc"] = _malloc;
function simpleReadValueFromPointer(pointer) {
 return this["fromWireType"](HEAPU32[pointer >> 2]);
}
function __embind_register_std_string(rawType, name) {
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": (function(value) {
   var length = HEAPU32[value >> 2];
   var a = new Array(length);
   for (var i = 0; i < length; ++i) {
    a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
   }
   _free(value);
   return a.join("");
  }),
  "toWireType": (function(destructors, value) {
   if (value instanceof ArrayBuffer) {
    value = new Uint8Array(value);
   }
   function getTAElement(ta, index) {
    return ta[index];
   }
   function getStringElement(string, index) {
    return string.charCodeAt(index);
   }
   var getElement;
   if (value instanceof Uint8Array) {
    getElement = getTAElement;
   } else if (value instanceof Int8Array) {
    getElement = getTAElement;
   } else if (typeof value === "string") {
    getElement = getStringElement;
   } else {
    throwBindingError("Cannot pass non-string to std::string");
   }
   var length = value.length;
   var ptr = _malloc(4 + length);
   HEAPU32[ptr >> 2] = length;
   for (var i = 0; i < length; ++i) {
    var charCode = getElement(value, i);
    if (charCode > 255) {
     _free(ptr);
     throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
    }
    HEAPU8[ptr + 4 + i] = charCode;
   }
   if (destructors !== null) {
    destructors.push(_free, ptr);
   }
   return ptr;
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": simpleReadValueFromPointer,
  destructorFunction: (function(ptr) {
   _free(ptr);
  })
 });
}
function __embind_register_std_wstring(rawType, charSize, name) {
 name = readLatin1String(name);
 var HEAP, shift;
 if (charSize === 2) {
  HEAP = HEAPU16;
  shift = 1;
 } else if (charSize === 4) {
  HEAP = HEAPU32;
  shift = 2;
 }
 registerType(rawType, {
  name: name,
  "fromWireType": (function(value) {
   var length = HEAPU32[value >> 2];
   var a = new Array(length);
   var start = value + 4 >> shift;
   for (var i = 0; i < length; ++i) {
    a[i] = String.fromCharCode(HEAP[start + i]);
   }
   _free(value);
   return a.join("");
  }),
  "toWireType": (function(destructors, value) {
   var length = value.length;
   var ptr = _malloc(4 + length * charSize);
   HEAPU32[ptr >> 2] = length;
   var start = ptr + 4 >> shift;
   for (var i = 0; i < length; ++i) {
    HEAP[start + i] = value.charCodeAt(i);
   }
   if (destructors !== null) {
    destructors.push(_free, ptr);
   }
   return ptr;
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": simpleReadValueFromPointer,
  destructorFunction: (function(ptr) {
   _free(ptr);
  })
 });
}
function _pthread_once(ptr, func) {
 if (!_pthread_once.seen) _pthread_once.seen = {};
 if (ptr in _pthread_once.seen) return;
 Runtime.dynCall("v", func);
 _pthread_once.seen[ptr] = 1;
}
function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
 structRegistrations[structType].fields.push({
  fieldName: readLatin1String(fieldName),
  getterReturnType: getterReturnType,
  getter: requireFunction(getterSignature, getter),
  getterContext: getterContext,
  setterArgumentType: setterArgumentType,
  setter: requireFunction(setterSignature, setter),
  setterContext: setterContext
 });
}
function ClassHandle_isAliasOf(other) {
 if (!(this instanceof ClassHandle)) {
  return false;
 }
 if (!(other instanceof ClassHandle)) {
  return false;
 }
 var leftClass = this.$$.ptrType.registeredClass;
 var left = this.$$.ptr;
 var rightClass = other.$$.ptrType.registeredClass;
 var right = other.$$.ptr;
 while (leftClass.baseClass) {
  left = leftClass.upcast(left);
  leftClass = leftClass.baseClass;
 }
 while (rightClass.baseClass) {
  right = rightClass.upcast(right);
  rightClass = rightClass.baseClass;
 }
 return leftClass === rightClass && left === right;
}
function shallowCopyInternalPointer(o) {
 return {
  count: o.count,
  deleteScheduled: o.deleteScheduled,
  preservePointerOnDelete: o.preservePointerOnDelete,
  ptr: o.ptr,
  ptrType: o.ptrType,
  smartPtr: o.smartPtr,
  smartPtrType: o.smartPtrType
 };
}
function throwInstanceAlreadyDeleted(obj) {
 function getInstanceTypeName(handle) {
  return handle.$$.ptrType.registeredClass.name;
 }
 throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
}
function ClassHandle_clone() {
 if (!this.$$.ptr) {
  throwInstanceAlreadyDeleted(this);
 }
 if (this.$$.preservePointerOnDelete) {
  this.$$.count.value += 1;
  return this;
 } else {
  var clone = Object.create(Object.getPrototypeOf(this), {
   $$: {
    value: shallowCopyInternalPointer(this.$$)
   }
  });
  clone.$$.count.value += 1;
  clone.$$.deleteScheduled = false;
  return clone;
 }
}
function runDestructor(handle) {
 var $$ = handle.$$;
 if ($$.smartPtr) {
  $$.smartPtrType.rawDestructor($$.smartPtr);
 } else {
  $$.ptrType.registeredClass.rawDestructor($$.ptr);
 }
}
function ClassHandle_delete() {
 if (!this.$$.ptr) {
  throwInstanceAlreadyDeleted(this);
 }
 if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
  throwBindingError("Object already scheduled for deletion");
 }
 this.$$.count.value -= 1;
 var toDelete = 0 === this.$$.count.value;
 if (toDelete) {
  runDestructor(this);
 }
 if (!this.$$.preservePointerOnDelete) {
  this.$$.smartPtr = undefined;
  this.$$.ptr = undefined;
 }
}
function ClassHandle_isDeleted() {
 return !this.$$.ptr;
}
var delayFunction = undefined;
var deletionQueue = [];
function flushPendingDeletes() {
 while (deletionQueue.length) {
  var obj = deletionQueue.pop();
  obj.$$.deleteScheduled = false;
  obj["delete"]();
 }
}
function ClassHandle_deleteLater() {
 if (!this.$$.ptr) {
  throwInstanceAlreadyDeleted(this);
 }
 if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
  throwBindingError("Object already scheduled for deletion");
 }
 deletionQueue.push(this);
 if (deletionQueue.length === 1 && delayFunction) {
  delayFunction(flushPendingDeletes);
 }
 this.$$.deleteScheduled = true;
 return this;
}
function init_ClassHandle() {
 ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
 ClassHandle.prototype["clone"] = ClassHandle_clone;
 ClassHandle.prototype["delete"] = ClassHandle_delete;
 ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
 ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater;
}
function ClassHandle() {}
var registeredPointers = {};
function ensureOverloadTable(proto, methodName, humanName) {
 if (undefined === proto[methodName].overloadTable) {
  var prevFunc = proto[methodName];
  proto[methodName] = (function() {
   if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
    throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
   }
   return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
  });
  proto[methodName].overloadTable = [];
  proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
 }
}
function exposePublicSymbol(name, value, numArguments) {
 if (Module.hasOwnProperty(name)) {
  if (undefined === numArguments || undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments]) {
   throwBindingError("Cannot register public name '" + name + "' twice");
  }
  ensureOverloadTable(Module, name, name);
  if (Module.hasOwnProperty(numArguments)) {
   throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
  }
  Module[name].overloadTable[numArguments] = value;
 } else {
  Module[name] = value;
  if (undefined !== numArguments) {
   Module[name].numArguments = numArguments;
  }
 }
}
function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
 this.name = name;
 this.constructor = constructor;
 this.instancePrototype = instancePrototype;
 this.rawDestructor = rawDestructor;
 this.baseClass = baseClass;
 this.getActualType = getActualType;
 this.upcast = upcast;
 this.downcast = downcast;
 this.pureVirtualFunctions = [];
}
function constNoSmartPtrRawPointerToWireType(destructors, handle) {
 if (handle === null) {
  if (this.isReference) {
   throwBindingError("null is not a valid " + this.name);
  }
  return 0;
 }
 if (!handle.$$) {
  throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
 }
 if (!handle.$$.ptr) {
  throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
 }
 var handleClass = handle.$$.ptrType.registeredClass;
 var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
 return ptr;
}
function genericPointerToWireType(destructors, handle) {
 if (handle === null) {
  if (this.isReference) {
   throwBindingError("null is not a valid " + this.name);
  }
  if (this.isSmartPointer) {
   var ptr = this.rawConstructor();
   if (destructors !== null) {
    destructors.push(this.rawDestructor, ptr);
   }
   return ptr;
  } else {
   return 0;
  }
 }
 if (!handle.$$) {
  throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
 }
 if (!handle.$$.ptr) {
  throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
 }
 if (!this.isConst && handle.$$.ptrType.isConst) {
  throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
 }
 var handleClass = handle.$$.ptrType.registeredClass;
 var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
 if (this.isSmartPointer) {
  if (undefined === handle.$$.smartPtr) {
   throwBindingError("Passing raw pointer to smart pointer is illegal");
  }
  switch (this.sharingPolicy) {
  case 0:
   if (handle.$$.smartPtrType === this) {
    ptr = handle.$$.smartPtr;
   } else {
    throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name);
   }
   break;
  case 1:
   ptr = handle.$$.smartPtr;
   break;
  case 2:
   if (handle.$$.smartPtrType === this) {
    ptr = handle.$$.smartPtr;
   } else {
    var clonedHandle = handle["clone"]();
    ptr = this.rawShare(ptr, __emval_register((function() {
     clonedHandle["delete"]();
    })));
    if (destructors !== null) {
     destructors.push(this.rawDestructor, ptr);
    }
   }
   break;
  default:
   throwBindingError("Unsupporting sharing policy");
  }
 }
 return ptr;
}
function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
 if (handle === null) {
  if (this.isReference) {
   throwBindingError("null is not a valid " + this.name);
  }
  return 0;
 }
 if (!handle.$$) {
  throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
 }
 if (!handle.$$.ptr) {
  throwBindingError("Cannot pass deleted object as a pointer of type " + this.name);
 }
 if (handle.$$.ptrType.isConst) {
  throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name);
 }
 var handleClass = handle.$$.ptrType.registeredClass;
 var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
 return ptr;
}
function RegisteredPointer_getPointee(ptr) {
 if (this.rawGetPointee) {
  ptr = this.rawGetPointee(ptr);
 }
 return ptr;
}
function RegisteredPointer_destructor(ptr) {
 if (this.rawDestructor) {
  this.rawDestructor(ptr);
 }
}
function RegisteredPointer_deleteObject(handle) {
 if (handle !== null) {
  handle["delete"]();
 }
}
function downcastPointer(ptr, ptrClass, desiredClass) {
 if (ptrClass === desiredClass) {
  return ptr;
 }
 if (undefined === desiredClass.baseClass) {
  return null;
 }
 var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
 if (rv === null) {
  return null;
 }
 return desiredClass.downcast(rv);
}
function getInheritedInstanceCount() {
 return Object.keys(registeredInstances).length;
}
function getLiveInheritedInstances() {
 var rv = [];
 for (var k in registeredInstances) {
  if (registeredInstances.hasOwnProperty(k)) {
   rv.push(registeredInstances[k]);
  }
 }
 return rv;
}
function setDelayFunction(fn) {
 delayFunction = fn;
 if (deletionQueue.length && delayFunction) {
  delayFunction(flushPendingDeletes);
 }
}
function init_embind() {
 Module["getInheritedInstanceCount"] = getInheritedInstanceCount;
 Module["getLiveInheritedInstances"] = getLiveInheritedInstances;
 Module["flushPendingDeletes"] = flushPendingDeletes;
 Module["setDelayFunction"] = setDelayFunction;
}
var registeredInstances = {};
function getBasestPointer(class_, ptr) {
 if (ptr === undefined) {
  throwBindingError("ptr should not be undefined");
 }
 while (class_.baseClass) {
  ptr = class_.upcast(ptr);
  class_ = class_.baseClass;
 }
 return ptr;
}
function getInheritedInstance(class_, ptr) {
 ptr = getBasestPointer(class_, ptr);
 return registeredInstances[ptr];
}
var _throwInternalError = undefined;
function makeClassHandle(prototype, record) {
 if (!record.ptrType || !record.ptr) {
  throwInternalError("makeClassHandle requires ptr and ptrType");
 }
 var hasSmartPtrType = !!record.smartPtrType;
 var hasSmartPtr = !!record.smartPtr;
 if (hasSmartPtrType !== hasSmartPtr) {
  throwInternalError("Both smartPtrType and smartPtr must be specified");
 }
 record.count = {
  value: 1
 };
 return Object.create(prototype, {
  $$: {
   value: record
  }
 });
}
function RegisteredPointer_fromWireType(ptr) {
 var rawPointer = this.getPointee(ptr);
 if (!rawPointer) {
  this.destructor(ptr);
  return null;
 }
 var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
 if (undefined !== registeredInstance) {
  if (0 === registeredInstance.$$.count.value) {
   registeredInstance.$$.ptr = rawPointer;
   registeredInstance.$$.smartPtr = ptr;
   return registeredInstance["clone"]();
  } else {
   var rv = registeredInstance["clone"]();
   this.destructor(ptr);
   return rv;
  }
 }
 function makeDefaultHandle() {
  if (this.isSmartPointer) {
   return makeClassHandle(this.registeredClass.instancePrototype, {
    ptrType: this.pointeeType,
    ptr: rawPointer,
    smartPtrType: this,
    smartPtr: ptr
   });
  } else {
   return makeClassHandle(this.registeredClass.instancePrototype, {
    ptrType: this,
    ptr: ptr
   });
  }
 }
 var actualType = this.registeredClass.getActualType(rawPointer);
 var registeredPointerRecord = registeredPointers[actualType];
 if (!registeredPointerRecord) {
  return makeDefaultHandle.call(this);
 }
 var toType;
 if (this.isConst) {
  toType = registeredPointerRecord.constPointerType;
 } else {
  toType = registeredPointerRecord.pointerType;
 }
 var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
 if (dp === null) {
  return makeDefaultHandle.call(this);
 }
 if (this.isSmartPointer) {
  return makeClassHandle(toType.registeredClass.instancePrototype, {
   ptrType: toType,
   ptr: dp,
   smartPtrType: this,
   smartPtr: ptr
  });
 } else {
  return makeClassHandle(toType.registeredClass.instancePrototype, {
   ptrType: toType,
   ptr: dp
  });
 }
}
function init_RegisteredPointer() {
 RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
 RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
 RegisteredPointer.prototype["argPackAdvance"] = 8;
 RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
 RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
 RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType;
}
function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
 this.name = name;
 this.registeredClass = registeredClass;
 this.isReference = isReference;
 this.isConst = isConst;
 this.isSmartPointer = isSmartPointer;
 this.pointeeType = pointeeType;
 this.sharingPolicy = sharingPolicy;
 this.rawGetPointee = rawGetPointee;
 this.rawConstructor = rawConstructor;
 this.rawShare = rawShare;
 this.rawDestructor = rawDestructor;
 if (!isSmartPointer && registeredClass.baseClass === undefined) {
  if (isConst) {
   this["toWireType"] = constNoSmartPtrRawPointerToWireType;
   this.destructorFunction = null;
  } else {
   this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
   this.destructorFunction = null;
  }
 } else {
  this["toWireType"] = genericPointerToWireType;
 }
}
function replacePublicSymbol(name, value, numArguments) {
 if (!Module.hasOwnProperty(name)) {
  throwInternalError("Replacing nonexistant public symbol");
 }
 if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
  Module[name].overloadTable[numArguments] = value;
 } else {
  Module[name] = value;
 }
}
function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
 name = readLatin1String(name);
 getActualType = requireFunction(getActualTypeSignature, getActualType);
 if (upcast) {
  upcast = requireFunction(upcastSignature, upcast);
 }
 if (downcast) {
  downcast = requireFunction(downcastSignature, downcast);
 }
 rawDestructor = requireFunction(destructorSignature, rawDestructor);
 var legalFunctionName = makeLegalFunctionName(name);
 exposePublicSymbol(legalFunctionName, (function() {
  throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [ baseClassRawType ]);
 }));
 whenDependentTypesAreResolved([ rawType, rawPointerType, rawConstPointerType ], baseClassRawType ? [ baseClassRawType ] : [], (function(base) {
  base = base[0];
  var baseClass;
  var basePrototype;
  if (baseClassRawType) {
   baseClass = base.registeredClass;
   basePrototype = baseClass.instancePrototype;
  } else {
   basePrototype = ClassHandle.prototype;
  }
  var constructor = createNamedFunction(legalFunctionName, (function() {
   if (Object.getPrototypeOf(this) !== instancePrototype) {
    throw new BindingError("Use 'new' to construct " + name);
   }
   if (undefined === registeredClass.constructor_body) {
    throw new BindingError(name + " has no accessible constructor");
   }
   var body = registeredClass.constructor_body[arguments.length];
   if (undefined === body) {
    throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
   }
   return body.apply(this, arguments);
  }));
  var instancePrototype = Object.create(basePrototype, {
   constructor: {
    value: constructor
   }
  });
  constructor.prototype = instancePrototype;
  var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
  var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
  var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
  var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
  registeredPointers[rawType] = {
   pointerType: pointerConverter,
   constPointerType: constPointerConverter
  };
  replacePublicSymbol(legalFunctionName, constructor);
  return [ referenceConverter, pointerConverter, constPointerConverter ];
 }));
}
Module["_strlen"] = _strlen;
var emval_free_list = [];
var emval_handle_array = [ {}, {
 value: undefined
}, {
 value: null
}, {
 value: true
}, {
 value: false
} ];
function __emval_decref(handle) {
 if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
  emval_handle_array[handle] = undefined;
  emval_free_list.push(handle);
 }
}
var ERRNO_MESSAGES = {
 0: "Success",
 1: "Not super-user",
 2: "No such file or directory",
 3: "No such process",
 4: "Interrupted system call",
 5: "I/O error",
 6: "No such device or address",
 7: "Arg list too long",
 8: "Exec format error",
 9: "Bad file number",
 10: "No children",
 11: "No more processes",
 12: "Not enough core",
 13: "Permission denied",
 14: "Bad address",
 15: "Block device required",
 16: "Mount device busy",
 17: "File exists",
 18: "Cross-device link",
 19: "No such device",
 20: "Not a directory",
 21: "Is a directory",
 22: "Invalid argument",
 23: "Too many open files in system",
 24: "Too many open files",
 25: "Not a typewriter",
 26: "Text file busy",
 27: "File too large",
 28: "No space left on device",
 29: "Illegal seek",
 30: "Read only file system",
 31: "Too many links",
 32: "Broken pipe",
 33: "Math arg out of domain of func",
 34: "Math result not representable",
 35: "File locking deadlock error",
 36: "File or path name too long",
 37: "No record locks available",
 38: "Function not implemented",
 39: "Directory not empty",
 40: "Too many symbolic links",
 42: "No message of desired type",
 43: "Identifier removed",
 44: "Channel number out of range",
 45: "Level 2 not synchronized",
 46: "Level 3 halted",
 47: "Level 3 reset",
 48: "Link number out of range",
 49: "Protocol driver not attached",
 50: "No CSI structure available",
 51: "Level 2 halted",
 52: "Invalid exchange",
 53: "Invalid request descriptor",
 54: "Exchange full",
 55: "No anode",
 56: "Invalid request code",
 57: "Invalid slot",
 59: "Bad font file fmt",
 60: "Device not a stream",
 61: "No data (for no delay io)",
 62: "Timer expired",
 63: "Out of streams resources",
 64: "Machine is not on the network",
 65: "Package not installed",
 66: "The object is remote",
 67: "The link has been severed",
 68: "Advertise error",
 69: "Srmount error",
 70: "Communication error on send",
 71: "Protocol error",
 72: "Multihop attempted",
 73: "Cross mount point (not really error)",
 74: "Trying to read unreadable message",
 75: "Value too large for defined data type",
 76: "Given log. name not unique",
 77: "f.d. invalid for this operation",
 78: "Remote address changed",
 79: "Can   access a needed shared lib",
 80: "Accessing a corrupted shared lib",
 81: ".lib section in a.out corrupted",
 82: "Attempting to link in too many libs",
 83: "Attempting to exec a shared library",
 84: "Illegal byte sequence",
 86: "Streams pipe error",
 87: "Too many users",
 88: "Socket operation on non-socket",
 89: "Destination address required",
 90: "Message too long",
 91: "Protocol wrong type for socket",
 92: "Protocol not available",
 93: "Unknown protocol",
 94: "Socket type not supported",
 95: "Not supported",
 96: "Protocol family not supported",
 97: "Address family not supported by protocol family",
 98: "Address already in use",
 99: "Address not available",
 100: "Network interface is not configured",
 101: "Network is unreachable",
 102: "Connection reset by network",
 103: "Connection aborted",
 104: "Connection reset by peer",
 105: "No buffer space available",
 106: "Socket is already connected",
 107: "Socket is not connected",
 108: "Can't send after socket shutdown",
 109: "Too many references",
 110: "Connection timed out",
 111: "Connection refused",
 112: "Host is down",
 113: "Host is unreachable",
 114: "Socket already connected",
 115: "Connection already in progress",
 116: "Stale file handle",
 122: "Quota exceeded",
 123: "No medium (in tape drive)",
 125: "Operation canceled",
 130: "Previous owner died",
 131: "State not recoverable"
};
var PATH = {
 splitPath: (function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 }),
 normalizeArray: (function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (; up--; up) {
    parts.unshift("..");
   }
  }
  return parts;
 }),
 normalize: (function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 }),
 dirname: (function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 }),
 basename: (function(path) {
  if (path === "/") return "/";
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 }),
 extname: (function(path) {
  return PATH.splitPath(path)[3];
 }),
 join: (function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 }),
 join2: (function(l, r) {
  return PATH.normalize(l + "/" + r);
 }),
 resolve: (function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
   return !!p;
  })), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 }),
 relative: (function(from, to) {
  from = PATH.resolve(from).substr(1);
  to = PATH.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (; start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (; end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 })
};
var TTY = {
 ttys: [],
 init: (function() {}),
 shutdown: (function() {}),
 register: (function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 }),
 stream_ops: {
  open: (function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   stream.tty = tty;
   stream.seekable = false;
  }),
  close: (function(stream) {
   if (stream.tty.output.length) {
    stream.tty.ops.put_char(stream.tty, 10);
   }
  }),
  read: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  }),
  write: (function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   for (var i = 0; i < length; i++) {
    try {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  })
 },
 default_tty_ops: {
  get_char: (function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     result = process["stdin"]["read"]();
     if (!result) {
      if (process["stdin"]["_readableState"] && process["stdin"]["_readableState"]["ended"]) {
       return null;
      }
      return undefined;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  }),
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["print"](tty.output.join(""));
    tty.output = [];
   } else {
    tty.output.push(TTY.utf8.processCChar(val));
   }
  })
 },
 default_tty1_ops: {
  put_char: (function(tty, val) {
   if (val === null || val === 10) {
    Module["printErr"](tty.output.join(""));
    tty.output = [];
   } else {
    tty.output.push(TTY.utf8.processCChar(val));
   }
  })
 }
};
var MEMFS = {
 ops_table: null,
 mount: (function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 }),
 getFileDataAsRegularArray: (function(node) {
  if (node.contents && node.contents.subarray) {
   var arr = [];
   for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
   return arr;
  }
  return node.contents;
 }),
 getFileDataAsTypedArray: (function(node) {
  if (!node.contents) return new Uint8Array;
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 }),
 expandFileStorage: (function(node, newCapacity) {
  if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
   node.contents = MEMFS.getFileDataAsRegularArray(node);
   node.usedBytes = node.contents.length;
  }
  if (!node.contents || node.contents.subarray) {
   var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
   if (prevCapacity >= newCapacity) return;
   var CAPACITY_DOUBLING_MAX = 1024 * 1024;
   newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
   if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
   var oldContents = node.contents;
   node.contents = new Uint8Array(newCapacity);
   if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
   return;
  }
  if (!node.contents && newCapacity > 0) node.contents = [];
  while (node.contents.length < newCapacity) node.contents.push(0);
 }),
 resizeFileStorage: (function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
   return;
  }
  if (!node.contents || node.contents.subarray) {
   var oldContents = node.contents;
   node.contents = new Uint8Array(new ArrayBuffer(newSize));
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
   return;
  }
  if (!node.contents) node.contents = [];
  if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
  node.usedBytes = newSize;
 }),
 node_ops: {
  getattr: (function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  }),
  setattr: (function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  }),
  lookup: (function(parent, name) {
   throw FS.genericErrors[ERRNO_CODES.ENOENT];
  }),
  mknod: (function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  }),
  rename: (function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   old_node.parent = new_dir;
  }),
  unlink: (function(parent, name) {
   delete parent.contents[name];
  }),
  rmdir: (function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   }
   delete parent.contents[name];
  }),
  readdir: (function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  }),
  symlink: (function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  }),
  readlink: (function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return node.link;
  })
 },
 stream_ops: {
  read: (function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   assert(size >= 0);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  }),
  write: (function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else for (var i = 0; i < length; i++) {
    node.contents[position + i] = buffer[offset + i];
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }),
  allocate: (function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  }),
  mmap: (function(stream, buffer, offset, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < stream.node.usedBytes) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = _malloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
    }
    buffer.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  })
 }
};
var IDBFS = {
 dbs: {},
 indexedDB: (function() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  var ret = null;
  if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 }),
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: (function(mount) {
  return MEMFS.mount.apply(null, arguments);
 }),
 syncfs: (function(mount, populate, callback) {
  IDBFS.getLocalSet(mount, (function(err, local) {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, (function(err, remote) {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   }));
  }));
 }),
 getDB: (function(name, callback) {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  req.onupgradeneeded = (function(e) {
   var db = e.target.result;
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   fileStore.createIndex("timestamp", "timestamp", {
    unique: false
   });
  });
  req.onsuccess = (function() {
   db = req.result;
   IDBFS.dbs[name] = db;
   callback(null, db);
  });
  req.onerror = (function() {
   callback(this.error);
  });
 }),
 getLocalSet: (function(mount, callback) {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return (function(p) {
    return PATH.join2(root, p);
   });
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    timestamp: stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 }),
 getRemoteSet: (function(mount, callback) {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, (function(err, db) {
   if (err) return callback(err);
   var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
   transaction.onerror = (function() {
    callback(this.error);
   });
   var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
   var index = store.index("timestamp");
   index.openKeyCursor().onsuccess = (function(event) {
    var cursor = event.target.result;
    if (!cursor) {
     return callback(null, {
      type: "remote",
      db: db,
      entries: entries
     });
    }
    entries[cursor.primaryKey] = {
     timestamp: cursor.key
    };
    cursor.continue();
   });
  }));
 }),
 loadLocalEntry: (function(path, callback) {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode,
    contents: node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 }),
 storeLocalEntry: (function(path, entry, callback) {
  try {
   if (FS.isDir(entry.mode)) {
    FS.mkdir(path, entry.mode);
   } else if (FS.isFile(entry.mode)) {
    FS.writeFile(path, entry.contents, {
     encoding: "binary",
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry.mode);
   FS.utime(path, entry.timestamp, entry.timestamp);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 removeLocalEntry: (function(path, callback) {
  try {
   var lookup = FS.lookupPath(path);
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 }),
 loadRemoteEntry: (function(store, path, callback) {
  var req = store.get(path);
  req.onsuccess = (function(event) {
   callback(null, event.target.result);
  });
  req.onerror = (function() {
   callback(this.error);
  });
 }),
 storeRemoteEntry: (function(store, path, entry, callback) {
  var req = store.put(entry, path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function() {
   callback(this.error);
  });
 }),
 removeRemoteEntry: (function(store, path, callback) {
  var req = store.delete(path);
  req.onsuccess = (function() {
   callback(null);
  });
  req.onerror = (function() {
   callback(this.error);
  });
 }),
 reconcile: (function(src, dst, callback) {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach((function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e.timestamp > e2.timestamp) {
    create.push(key);
    total++;
   }
  }));
  var remove = [];
  Object.keys(dst.entries).forEach((function(key) {
   var e = dst.entries[key];
   var e2 = src.entries[key];
   if (!e2) {
    remove.push(key);
    total++;
   }
  }));
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var completed = 0;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= total) {
    return callback(null);
   }
  }
  transaction.onerror = (function() {
   done(this.error);
  });
  create.sort().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    }));
   } else {
    IDBFS.loadLocalEntry(path, (function(err, entry) {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    }));
   }
  }));
  remove.sort().reverse().forEach((function(path) {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  }));
 })
};
var NODEFS = {
 isWindows: false,
 staticInit: (function() {
  NODEFS.isWindows = !!process.platform.match(/^win/);
 }),
 mount: (function(mount) {
  assert(ENVIRONMENT_IS_NODE);
  return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
 }),
 createNode: (function(parent, name, mode, dev) {
  if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = FS.createNode(parent, name, mode);
  node.node_ops = NODEFS.node_ops;
  node.stream_ops = NODEFS.stream_ops;
  return node;
 }),
 getMode: (function(path) {
  var stat;
  try {
   stat = fs.lstatSync(path);
   if (NODEFS.isWindows) {
    stat.mode = stat.mode | (stat.mode & 146) >> 1;
   }
  } catch (e) {
   if (!e.code) throw e;
   throw new FS.ErrnoError(ERRNO_CODES[e.code]);
  }
  return stat.mode;
 }),
 realPath: (function(node) {
  var parts = [];
  while (node.parent !== node) {
   parts.push(node.name);
   node = node.parent;
  }
  parts.push(node.mount.opts.root);
  parts.reverse();
  return PATH.join.apply(null, parts);
 }),
 flagsToPermissionStringMap: {
  0: "r",
  1: "r+",
  2: "r+",
  64: "r",
  65: "r+",
  66: "r+",
  129: "rx+",
  193: "rx+",
  514: "w+",
  577: "w",
  578: "w+",
  705: "wx",
  706: "wx+",
  1024: "a",
  1025: "a",
  1026: "a+",
  1089: "a",
  1090: "a+",
  1153: "ax",
  1154: "ax+",
  1217: "ax",
  1218: "ax+",
  4096: "rs",
  4098: "rs+"
 },
 flagsToPermissionString: (function(flags) {
  if (flags in NODEFS.flagsToPermissionStringMap) {
   return NODEFS.flagsToPermissionStringMap[flags];
  } else {
   return flags;
  }
 }),
 node_ops: {
  getattr: (function(node) {
   var path = NODEFS.realPath(node);
   var stat;
   try {
    stat = fs.lstatSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (NODEFS.isWindows && !stat.blksize) {
    stat.blksize = 4096;
   }
   if (NODEFS.isWindows && !stat.blocks) {
    stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
   }
   return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    atime: stat.atime,
    mtime: stat.mtime,
    ctime: stat.ctime,
    blksize: stat.blksize,
    blocks: stat.blocks
   };
  }),
  setattr: (function(node, attr) {
   var path = NODEFS.realPath(node);
   try {
    if (attr.mode !== undefined) {
     fs.chmodSync(path, attr.mode);
     node.mode = attr.mode;
    }
    if (attr.timestamp !== undefined) {
     var date = new Date(attr.timestamp);
     fs.utimesSync(path, date, date);
    }
    if (attr.size !== undefined) {
     fs.truncateSync(path, attr.size);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  lookup: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   var mode = NODEFS.getMode(path);
   return NODEFS.createNode(parent, name, mode);
  }),
  mknod: (function(parent, name, mode, dev) {
   var node = NODEFS.createNode(parent, name, mode, dev);
   var path = NODEFS.realPath(node);
   try {
    if (FS.isDir(node.mode)) {
     fs.mkdirSync(path, node.mode);
    } else {
     fs.writeFileSync(path, "", {
      mode: node.mode
     });
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return node;
  }),
  rename: (function(oldNode, newDir, newName) {
   var oldPath = NODEFS.realPath(oldNode);
   var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
   try {
    fs.renameSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  unlink: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.unlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  rmdir: (function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.rmdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readdir: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  symlink: (function(parent, newName, oldPath) {
   var newPath = PATH.join2(NODEFS.realPath(parent), newName);
   try {
    fs.symlinkSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  readlink: (function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  })
 },
 stream_ops: {
  open: (function(stream) {
   var path = NODEFS.realPath(stream.node);
   try {
    if (FS.isFile(stream.node.mode)) {
     stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  close: (function(stream) {
   try {
    if (FS.isFile(stream.node.mode) && stream.nfd) {
     fs.closeSync(stream.nfd);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }),
  read: (function(stream, buffer, offset, length, position) {
   if (length === 0) return 0;
   var nbuffer = new Buffer(length);
   var res;
   try {
    res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (res > 0) {
    for (var i = 0; i < res; i++) {
     buffer[offset + i] = nbuffer[i];
    }
   }
   return res;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
   var res;
   try {
    res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return res;
  }),
  llseek: (function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     try {
      var stat = fs.fstatSync(stream.nfd);
      position += stat.size;
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES[e.code]);
     }
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  })
 }
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);
function _fflush(stream) {}
var FS = {
 root: null,
 mounts: [],
 devices: [ null ],
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 handleFSError: (function(e) {
  if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
  return ___setErrNo(e.errno);
 }),
 lookupPath: (function(path, opts) {
  path = PATH.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
  }
  var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
   return !!p;
  })), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 }),
 getPath: (function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 }),
 hashName: (function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 }),
 hashAddNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 }),
 hashRemoveNode: (function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 }),
 lookupNode: (function(parent, name) {
  var err = FS.mayLookup(parent);
  if (err) {
   throw new FS.ErrnoError(err, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 }),
 createNode: (function(parent, name, mode, rdev) {
  if (!FS.FSNode) {
   FS.FSNode = (function(parent, name, mode, rdev) {
    if (!parent) {
     parent = this;
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
   });
   FS.FSNode.prototype = {};
   var readMode = 292 | 73;
   var writeMode = 146;
   Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: (function() {
      return (this.mode & readMode) === readMode;
     }),
     set: (function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
     })
    },
    write: {
     get: (function() {
      return (this.mode & writeMode) === writeMode;
     }),
     set: (function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
     })
    },
    isFolder: {
     get: (function() {
      return FS.isDir(this.mode);
     })
    },
    isDevice: {
     get: (function() {
      return FS.isChrdev(this.mode);
     })
    }
   });
  }
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 }),
 destroyNode: (function(node) {
  FS.hashRemoveNode(node);
 }),
 isRoot: (function(node) {
  return node === node.parent;
 }),
 isMountpoint: (function(node) {
  return !!node.mounted;
 }),
 isFile: (function(mode) {
  return (mode & 61440) === 32768;
 }),
 isDir: (function(mode) {
  return (mode & 61440) === 16384;
 }),
 isLink: (function(mode) {
  return (mode & 61440) === 40960;
 }),
 isChrdev: (function(mode) {
  return (mode & 61440) === 8192;
 }),
 isBlkdev: (function(mode) {
  return (mode & 61440) === 24576;
 }),
 isFIFO: (function(mode) {
  return (mode & 61440) === 4096;
 }),
 isSocket: (function(mode) {
  return (mode & 49152) === 49152;
 }),
 flagModes: {
  "r": 0,
  "rs": 1052672,
  "r+": 2,
  "w": 577,
  "wx": 705,
  "xw": 705,
  "w+": 578,
  "wx+": 706,
  "xw+": 706,
  "a": 1089,
  "ax": 1217,
  "xa": 1217,
  "a+": 1090,
  "ax+": 1218,
  "xa+": 1218
 },
 modeStringToFlags: (function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 }),
 flagsToPermissionString: (function(flag) {
  var accmode = flag & 2097155;
  var perms = [ "r", "w", "rw" ][accmode];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 }),
 nodePermissions: (function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return ERRNO_CODES.EACCES;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return ERRNO_CODES.EACCES;
  }
  return 0;
 }),
 mayLookup: (function(dir) {
  var err = FS.nodePermissions(dir, "x");
  if (err) return err;
  if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
  return 0;
 }),
 mayCreate: (function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return ERRNO_CODES.EEXIST;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 }),
 mayDelete: (function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var err = FS.nodePermissions(dir, "wx");
  if (err) {
   return err;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return ERRNO_CODES.ENOTDIR;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return ERRNO_CODES.EBUSY;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return 0;
 }),
 mayOpen: (function(node, flags) {
  if (!node) {
   return ERRNO_CODES.ENOENT;
  }
  if (FS.isLink(node.mode)) {
   return ERRNO_CODES.ELOOP;
  } else if (FS.isDir(node.mode)) {
   if ((flags & 2097155) !== 0 || flags & 512) {
    return ERRNO_CODES.EISDIR;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 }),
 MAX_OPEN_FDS: 4096,
 nextfd: (function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
 }),
 getStream: (function(fd) {
  return FS.streams[fd];
 }),
 createStream: (function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = (function() {});
   FS.FSStream.prototype = {};
   Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: (function() {
      return this.node;
     }),
     set: (function(val) {
      this.node = val;
     })
    },
    isRead: {
     get: (function() {
      return (this.flags & 2097155) !== 1;
     })
    },
    isWrite: {
     get: (function() {
      return (this.flags & 2097155) !== 0;
     })
    },
    isAppend: {
     get: (function() {
      return this.flags & 1024;
     })
    }
   });
  }
  var newStream = new FS.FSStream;
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 }),
 closeStream: (function(fd) {
  FS.streams[fd] = null;
 }),
 getStreamFromPtr: (function(ptr) {
  return FS.streams[ptr - 1];
 }),
 getPtrForStream: (function(stream) {
  return stream ? stream.fd + 1 : 0;
 }),
 chrdev_stream_ops: {
  open: (function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  }),
  llseek: (function() {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  })
 },
 major: (function(dev) {
  return dev >> 8;
 }),
 minor: (function(dev) {
  return dev & 255;
 }),
 makedev: (function(ma, mi) {
  return ma << 8 | mi;
 }),
 registerDevice: (function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 }),
 getDevice: (function(dev) {
  return FS.devices[dev];
 }),
 getMounts: (function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 }),
 syncfs: (function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= mounts.length) {
    callback(null);
   }
  }
  mounts.forEach((function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  }));
 }),
 mount: (function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 }),
 unmount: (function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach((function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  }));
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  assert(idx !== -1);
  node.mount.mounts.splice(idx, 1);
 }),
 lookup: (function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 }),
 mknod: (function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.mayCreate(parent, name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 }),
 create: (function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 }),
 mkdir: (function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 }),
 mkdev: (function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 }),
 symlink: (function(oldpath, newpath) {
  if (!PATH.resolve(oldpath)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  var newname = PATH.basename(newpath);
  var err = FS.mayCreate(parent, newname);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 }),
 rename: (function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  try {
   lookup = FS.lookupPath(old_path, {
    parent: true
   });
   old_dir = lookup.node;
   lookup = FS.lookupPath(new_path, {
    parent: true
   });
   new_dir = lookup.node;
  } catch (e) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  relative = PATH.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var err = FS.mayDelete(old_dir, old_name, isdir);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  if (new_dir !== old_dir) {
   err = FS.nodePermissions(old_dir, "w");
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 }),
 rmdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, true);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  return node.node_ops.readdir(node);
 }),
 unlink: (function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, false);
  if (err) {
   if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 }),
 readlink: (function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  return link.node_ops.readlink(link);
 }),
 stat: (function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  return node.node_ops.getattr(node);
 }),
 lstat: (function(path) {
  return FS.stat(path, true);
 }),
 chmod: (function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 }),
 lchmod: (function(path, mode) {
  FS.chmod(path, mode, true);
 }),
 fchmod: (function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chmod(stream.node, mode);
 }),
 chown: (function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 }),
 lchown: (function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 }),
 fchown: (function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  FS.chown(stream.node, uid, gid);
 }),
 truncate: (function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var err = FS.nodePermissions(node, "w");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 }),
 ftruncate: (function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  FS.truncate(stream.node, len);
 }),
 utime: (function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 }),
 open: (function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (!created) {
   var err = FS.mayOpen(node, flags);
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    Module["printErr"]("read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 }),
 close: (function(stream) {
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
 }),
 llseek: (function(stream, offset, whence) {
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 }),
 read: (function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 }),
 write: (function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if (stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = true;
  if (typeof position === "undefined") {
   position = stream.position;
   seeking = false;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 }),
 allocate: (function(stream, offset, length) {
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
  }
  stream.stream_ops.allocate(stream, offset, length);
 }),
 mmap: (function(stream, buffer, offset, length, position, prot, flags) {
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(ERRNO_CODES.EACCES);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
  }
  return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
 }),
 ioctl: (function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 }),
 readFile: (function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "r";
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = "";
   var utf8 = new Runtime.UTF8Processor;
   for (var i = 0; i < length; i++) {
    ret += utf8.processCChar(buf[i]);
   }
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 }),
 writeFile: (function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "w";
  opts.encoding = opts.encoding || "utf8";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var stream = FS.open(path, opts.flags, opts.mode);
  if (opts.encoding === "utf8") {
   var utf8 = new Runtime.UTF8Processor;
   var buf = new Uint8Array(utf8.processJSString(data));
   FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
  } else if (opts.encoding === "binary") {
   FS.write(stream, data, 0, data.length, 0, opts.canOwn);
  }
  FS.close(stream);
 }),
 cwd: (function() {
  return FS.currentPath;
 }),
 chdir: (function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
  }
  var err = FS.nodePermissions(lookup.node, "x");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  FS.currentPath = lookup.path;
 }),
 createDefaultDirectories: (function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 }),
 createDefaultDevices: (function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: (function() {
    return 0;
   }),
   write: (function() {
    return 0;
   })
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device;
  if (typeof crypto !== "undefined") {
   var randomBuffer = new Uint8Array(1);
   random_device = (function() {
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
   });
  } else if (ENVIRONMENT_IS_NODE) {
   random_device = (function() {
    return require("crypto").randomBytes(1)[0];
   });
  } else {
   random_device = (function() {
    return Math.random() * 256 | 0;
   });
  }
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 }),
 createStandardStreams: (function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", "r");
  HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
  assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
  var stdout = FS.open("/dev/stdout", "w");
  HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
  assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
  var stderr = FS.open("/dev/stderr", "w");
  HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
  assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")");
 }),
 ensureErrnoError: (function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = (function(errno) {
    this.errno = errno;
    for (var key in ERRNO_CODES) {
     if (ERRNO_CODES[key] === errno) {
      this.code = key;
      break;
     }
    }
   });
   this.setErrno(errno);
   this.message = ERRNO_MESSAGES[errno];
  };
  FS.ErrnoError.prototype = new Error;
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ ERRNO_CODES.ENOENT ].forEach((function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  }));
 }),
 staticInit: (function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
 }),
 init: (function(input, output, error) {
  assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 }),
 quit: (function() {
  FS.init.initialized = false;
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 }),
 getMode: (function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 }),
 joinPath: (function(parts, forceRelative) {
  var path = PATH.join.apply(null, parts);
  if (forceRelative && path[0] == "/") path = path.substr(1);
  return path;
 }),
 absolutePath: (function(relative, base) {
  return PATH.resolve(base, relative);
 }),
 standardizePath: (function(path) {
  return PATH.normalize(path);
 }),
 findObject: (function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   ___setErrNo(ret.error);
   return null;
  }
 }),
 analyzePath: (function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 }),
 createFolder: (function(parent, name, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.mkdir(path, mode);
 }),
 createPath: (function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 }),
 createFile: (function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 }),
 createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, "w");
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 }),
 createDevice: (function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: (function(stream) {
    stream.seekable = false;
   }),
   close: (function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   }),
   read: (function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   }),
   write: (function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES.EIO);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   })
  });
  return FS.mkdev(path, mode, dev);
 }),
 createLink: (function(parent, name, target, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  return FS.symlink(target, path);
 }),
 forceLoadFile: (function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  var success = true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (Module["read"]) {
   try {
    obj.contents = intArrayFromString(Module["read"](obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    success = false;
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
  if (!success) ___setErrNo(ERRNO_CODES.EIO);
  return success;
 }),
 createLazyFile: (function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest;
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = (function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   });
   var lazyArray = this;
   lazyArray.setDataGetter((function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   }));
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array;
   Object.defineProperty(lazyArray, "length", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._length;
    })
   });
   Object.defineProperty(lazyArray, "chunkSize", {
    get: (function() {
     if (!this.lengthKnown) {
      this.cacheLength();
     }
     return this._chunkSize;
    })
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperty(node, "usedBytes", {
   get: (function() {
    return this.contents.length;
   })
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach((function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    if (!FS.forceLoadFile(node)) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    return fn.apply(null, arguments);
   };
  }));
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   if (!FS.forceLoadFile(node)) {
    throw new FS.ErrnoError(ERRNO_CODES.EIO);
   }
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   assert(size >= 0);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 }),
 createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
  Browser.init();
  var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
  function processData(byteArray) {
   function finish(byteArray) {
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency("cp " + fullname);
   }
   var handled = false;
   Module["preloadPlugins"].forEach((function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, (function() {
      if (onerror) onerror();
      removeRunDependency("cp " + fullname);
     }));
     handled = true;
    }
   }));
   if (!handled) finish(byteArray);
  }
  addRunDependency("cp " + fullname);
  if (typeof url == "string") {
   Browser.asyncLoad(url, (function(byteArray) {
    processData(byteArray);
   }), onerror);
  } else {
   processData(url);
  }
 }),
 indexedDB: (function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 }),
 DB_NAME: (function() {
  return "EM_FS_" + window.location.pathname;
 }),
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   console.log("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }),
 loadFilesFromDB: (function(paths, onload, onerror) {
  onload = onload || (function() {});
  onerror = onerror || (function() {});
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach((function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   }));
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 })
};
function _mkport() {
 throw "TODO";
}
var SOCKFS = {
 mount: (function(mount) {
  Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
  Module["websocket"]._callbacks = {};
  Module["websocket"]["on"] = (function(event, callback) {
   if ("function" === typeof callback) {
    this._callbacks[event] = callback;
   }
   return this;
  });
  Module["websocket"].emit = (function(event, param) {
   if ("function" === typeof this._callbacks[event]) {
    this._callbacks[event].call(this, param);
   }
  });
  return FS.createNode(null, "/", 16384 | 511, 0);
 }),
 createSocket: (function(family, type, protocol) {
  var streaming = type == 1;
  if (protocol) {
   assert(streaming == (protocol == 6));
  }
  var sock = {
   family: family,
   type: type,
   protocol: protocol,
   server: null,
   error: null,
   peers: {},
   pending: [],
   recv_queue: [],
   sock_ops: SOCKFS.websocket_sock_ops
  };
  var name = SOCKFS.nextname();
  var node = FS.createNode(SOCKFS.root, name, 49152, 0);
  node.sock = sock;
  var stream = FS.createStream({
   path: name,
   node: node,
   flags: FS.modeStringToFlags("r+"),
   seekable: false,
   stream_ops: SOCKFS.stream_ops
  });
  sock.stream = stream;
  return sock;
 }),
 getSocket: (function(fd) {
  var stream = FS.getStream(fd);
  if (!stream || !FS.isSocket(stream.node.mode)) {
   return null;
  }
  return stream.node.sock;
 }),
 stream_ops: {
  poll: (function(stream) {
   var sock = stream.node.sock;
   return sock.sock_ops.poll(sock);
  }),
  ioctl: (function(stream, request, varargs) {
   var sock = stream.node.sock;
   return sock.sock_ops.ioctl(sock, request, varargs);
  }),
  read: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   var msg = sock.sock_ops.recvmsg(sock, length);
   if (!msg) {
    return 0;
   }
   buffer.set(msg.buffer, offset);
   return msg.buffer.length;
  }),
  write: (function(stream, buffer, offset, length, position) {
   var sock = stream.node.sock;
   return sock.sock_ops.sendmsg(sock, buffer, offset, length);
  }),
  close: (function(stream) {
   var sock = stream.node.sock;
   sock.sock_ops.close(sock);
  })
 },
 nextname: (function() {
  if (!SOCKFS.nextname.current) {
   SOCKFS.nextname.current = 0;
  }
  return "socket[" + SOCKFS.nextname.current++ + "]";
 }),
 websocket_sock_ops: {
  createPeer: (function(sock, addr, port) {
   var ws;
   if (typeof addr === "object") {
    ws = addr;
    addr = null;
    port = null;
   }
   if (ws) {
    if (ws._socket) {
     addr = ws._socket.remoteAddress;
     port = ws._socket.remotePort;
    } else {
     var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
     if (!result) {
      throw new Error("WebSocket URL must be in the format ws(s)://address:port");
     }
     addr = result[1];
     port = parseInt(result[2], 10);
    }
   } else {
    try {
     var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
     var url = "ws:#".replace("#", "//");
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["url"]) {
       url = Module["websocket"]["url"];
      }
     }
     if (url === "ws://" || url === "wss://") {
      var parts = addr.split("/");
      url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
     }
     var subProtocols = "binary";
     if (runtimeConfig) {
      if ("string" === typeof Module["websocket"]["subprotocol"]) {
       subProtocols = Module["websocket"]["subprotocol"];
      }
     }
     subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
     var opts = ENVIRONMENT_IS_NODE ? {
      "protocol": subProtocols.toString()
     } : subProtocols;
     var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
     ws = new WebSocket(url, opts);
     ws.binaryType = "arraybuffer";
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
    }
   }
   var peer = {
    addr: addr,
    port: port,
    socket: ws,
    dgram_send_queue: []
   };
   SOCKFS.websocket_sock_ops.addPeer(sock, peer);
   SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
   if (sock.type === 2 && typeof sock.sport !== "undefined") {
    peer.dgram_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255 ]));
   }
   return peer;
  }),
  getPeer: (function(sock, addr, port) {
   return sock.peers[addr + ":" + port];
  }),
  addPeer: (function(sock, peer) {
   sock.peers[peer.addr + ":" + peer.port] = peer;
  }),
  removePeer: (function(sock, peer) {
   delete sock.peers[peer.addr + ":" + peer.port];
  }),
  handlePeerEvents: (function(sock, peer) {
   var first = true;
   var handleOpen = (function() {
    Module["websocket"].emit("open", sock.stream.fd);
    try {
     var queued = peer.dgram_send_queue.shift();
     while (queued) {
      peer.socket.send(queued);
      queued = peer.dgram_send_queue.shift();
     }
    } catch (e) {
     peer.socket.close();
    }
   });
   function handleMessage(data) {
    assert(typeof data !== "string" && data.byteLength !== undefined);
    data = new Uint8Array(data);
    var wasfirst = first;
    first = false;
    if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
     var newport = data[8] << 8 | data[9];
     SOCKFS.websocket_sock_ops.removePeer(sock, peer);
     peer.port = newport;
     SOCKFS.websocket_sock_ops.addPeer(sock, peer);
     return;
    }
    sock.recv_queue.push({
     addr: peer.addr,
     port: peer.port,
     data: data
    });
    Module["websocket"].emit("message", sock.stream.fd);
   }
   if (ENVIRONMENT_IS_NODE) {
    peer.socket.on("open", handleOpen);
    peer.socket.on("message", (function(data, flags) {
     if (!flags.binary) {
      return;
     }
     handleMessage((new Uint8Array(data)).buffer);
    }));
    peer.socket.on("close", (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    }));
    peer.socket.on("error", (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    }));
   } else {
    peer.socket.onopen = handleOpen;
    peer.socket.onclose = (function() {
     Module["websocket"].emit("close", sock.stream.fd);
    });
    peer.socket.onmessage = function peer_socket_onmessage(event) {
     handleMessage(event.data);
    };
    peer.socket.onerror = (function(error) {
     sock.error = ERRNO_CODES.ECONNREFUSED;
     Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
    });
   }
  }),
  poll: (function(sock) {
   if (sock.type === 1 && sock.server) {
    return sock.pending.length ? 64 | 1 : 0;
   }
   var mask = 0;
   var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
   if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 64 | 1;
   }
   if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
    mask |= 4;
   }
   if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
    mask |= 16;
   }
   return mask;
  }),
  ioctl: (function(sock, request, arg) {
   switch (request) {
   case 21531:
    var bytes = 0;
    if (sock.recv_queue.length) {
     bytes = sock.recv_queue[0].data.length;
    }
    HEAP32[arg >> 2] = bytes;
    return 0;
   default:
    return ERRNO_CODES.EINVAL;
   }
  }),
  close: (function(sock) {
   if (sock.server) {
    try {
     sock.server.close();
    } catch (e) {}
    sock.server = null;
   }
   var peers = Object.keys(sock.peers);
   for (var i = 0; i < peers.length; i++) {
    var peer = sock.peers[peers[i]];
    try {
     peer.socket.close();
    } catch (e) {}
    SOCKFS.websocket_sock_ops.removePeer(sock, peer);
   }
   return 0;
  }),
  bind: (function(sock, addr, port) {
   if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   sock.saddr = addr;
   sock.sport = port || _mkport();
   if (sock.type === 2) {
    if (sock.server) {
     sock.server.close();
     sock.server = null;
    }
    try {
     sock.sock_ops.listen(sock, 0);
    } catch (e) {
     if (!(e instanceof FS.ErrnoError)) throw e;
     if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
    }
   }
  }),
  connect: (function(sock, addr, port) {
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
    var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
    if (dest) {
     if (dest.socket.readyState === dest.socket.CONNECTING) {
      throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
     }
    }
   }
   var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
   sock.daddr = peer.addr;
   sock.dport = peer.port;
   throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
  }),
  listen: (function(sock, backlog) {
   if (!ENVIRONMENT_IS_NODE) {
    throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
   }
   if (sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var WebSocketServer = require("ws").Server;
   var host = sock.saddr;
   sock.server = new WebSocketServer({
    host: host,
    port: sock.sport
   });
   Module["websocket"].emit("listen", sock.stream.fd);
   sock.server.on("connection", (function(ws) {
    if (sock.type === 1) {
     var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
     var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
     newsock.daddr = peer.addr;
     newsock.dport = peer.port;
     sock.pending.push(newsock);
     Module["websocket"].emit("connection", newsock.stream.fd);
    } else {
     SOCKFS.websocket_sock_ops.createPeer(sock, ws);
     Module["websocket"].emit("connection", sock.stream.fd);
    }
   }));
   sock.server.on("closed", (function() {
    Module["websocket"].emit("close", sock.stream.fd);
    sock.server = null;
   }));
   sock.server.on("error", (function(error) {
    sock.error = ERRNO_CODES.EHOSTUNREACH;
    Module["websocket"].emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
   }));
  }),
  accept: (function(listensock) {
   if (!listensock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   var newsock = listensock.pending.shift();
   newsock.stream.flags = listensock.stream.flags;
   return newsock;
  }),
  getname: (function(sock, peer) {
   var addr, port;
   if (peer) {
    if (sock.daddr === undefined || sock.dport === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    }
    addr = sock.daddr;
    port = sock.dport;
   } else {
    addr = sock.saddr || 0;
    port = sock.sport || 0;
   }
   return {
    addr: addr,
    port: port
   };
  }),
  sendmsg: (function(sock, buffer, offset, length, addr, port) {
   if (sock.type === 2) {
    if (addr === undefined || port === undefined) {
     addr = sock.daddr;
     port = sock.dport;
    }
    if (addr === undefined || port === undefined) {
     throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
    }
   } else {
    addr = sock.daddr;
    port = sock.dport;
   }
   var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
   if (sock.type === 1) {
    if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
    } else if (dest.socket.readyState === dest.socket.CONNECTING) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var data;
   if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
    data = buffer.slice(offset, offset + length);
   } else {
    data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
   }
   if (sock.type === 2) {
    if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
     if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
     }
     dest.dgram_send_queue.push(data);
     return length;
    }
   }
   try {
    dest.socket.send(data);
    return length;
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
  }),
  recvmsg: (function(sock, length) {
   if (sock.type === 1 && sock.server) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
   }
   var queued = sock.recv_queue.shift();
   if (!queued) {
    if (sock.type === 1) {
     var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
     if (!dest) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
     } else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
      return null;
     } else {
      throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
     }
    } else {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
   }
   var queuedLength = queued.data.byteLength || queued.data.length;
   var queuedOffset = queued.data.byteOffset || 0;
   var queuedBuffer = queued.data.buffer || queued.data;
   var bytesRead = Math.min(length, queuedLength);
   var res = {
    buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
    addr: queued.addr,
    port: queued.port
   };
   if (sock.type === 1 && bytesRead < queuedLength) {
    var bytesRemaining = queuedLength - bytesRead;
    queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
    sock.recv_queue.unshift(queued);
   }
   return res;
  })
 }
};
function _send(fd, buf, len, flags) {
 var sock = SOCKFS.getSocket(fd);
 if (!sock) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 return _write(fd, buf, len);
}
function _pwrite(fildes, buf, nbyte, offset) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte, offset);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _write(fildes, buf, nbyte) {
 var stream = FS.getStream(fildes);
 if (!stream) {
  ___setErrNo(ERRNO_CODES.EBADF);
  return -1;
 }
 try {
  var slab = HEAP8;
  return FS.write(stream, slab, buf, nbyte);
 } catch (e) {
  FS.handleFSError(e);
  return -1;
 }
}
function _fileno(stream) {
 stream = FS.getStreamFromPtr(stream);
 if (!stream) return -1;
 return stream.fd;
}
function _fputc(c, stream) {
 var chr = unSign(c & 255);
 HEAP8[_fputc.ret >> 0] = chr;
 var fd = _fileno(stream);
 var ret = _write(fd, _fputc.ret, 1);
 if (ret == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return -1;
 } else {
  return chr;
 }
}
var PTHREAD_SPECIFIC = {};
function _pthread_getspecific(key) {
 return PTHREAD_SPECIFIC[key] || 0;
}
var _fabs = Math_abs;
function _fwrite(ptr, size, nitems, stream) {
 var bytesToWrite = nitems * size;
 if (bytesToWrite == 0) return 0;
 var fd = _fileno(stream);
 var bytesWritten = _write(fd, ptr, bytesToWrite);
 if (bytesWritten == -1) {
  var streamObj = FS.getStreamFromPtr(stream);
  if (streamObj) streamObj.error = true;
  return 0;
 } else {
  return bytesWritten / size | 0;
 }
}
var _sqrt = Math_sqrt;
function count_emval_handles() {
 var count = 0;
 for (var i = 5; i < emval_handle_array.length; ++i) {
  if (emval_handle_array[i] !== undefined) {
   ++count;
  }
 }
 return count;
}
function get_first_emval() {
 for (var i = 1; i < emval_handle_array.length; ++i) {
  if (emval_handle_array[i] !== undefined) {
   return emval_handle_array[i];
  }
 }
 return null;
}
function init_emval() {
 Module["count_emval_handles"] = count_emval_handles;
 Module["get_first_emval"] = get_first_emval;
}
function __emval_register(value) {
 switch (value) {
 case undefined:
  {
   return 1;
  }
 case null:
  {
   return 2;
  }
 case true:
  {
   return 3;
  }
 case false:
  {
   return 4;
  }
 default:
  {
   var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
   emval_handle_array[handle] = {
    refcount: 1,
    value: value
   };
   return handle;
  }
 }
}
function getTypeName(type) {
 var ptr = ___getTypeName(type);
 var rv = readLatin1String(ptr);
 _free(ptr);
 return rv;
}
function requireRegisteredType(rawType, humanName) {
 var impl = registeredTypes[rawType];
 if (undefined === impl) {
  throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
 }
 return impl;
}
function __emval_take_value(type, argv) {
 type = requireRegisteredType(type, "_emval_take_value");
 var v = type["readValueFromPointer"](argv);
 return __emval_register(v);
}
function _embind_repr(v) {
 if (v === null) {
  return "null";
 }
 var t = typeof v;
 if (t === "object" || t === "array" || t === "function") {
  return v.toString();
 } else {
  return "" + v;
 }
}
function integerReadValueFromPointer(name, shift, signed) {
 switch (shift) {
 case 0:
  return signed ? function readS8FromPointer(pointer) {
   return HEAP8[pointer];
  } : function readU8FromPointer(pointer) {
   return HEAPU8[pointer];
  };
 case 1:
  return signed ? function readS16FromPointer(pointer) {
   return HEAP16[pointer >> 1];
  } : function readU16FromPointer(pointer) {
   return HEAPU16[pointer >> 1];
  };
 case 2:
  return signed ? function readS32FromPointer(pointer) {
   return HEAP32[pointer >> 2];
  } : function readU32FromPointer(pointer) {
   return HEAPU32[pointer >> 2];
  };
 default:
  throw new TypeError("Unknown integer type: " + name);
 }
}
function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
 name = readLatin1String(name);
 if (maxRange === -1) {
  maxRange = 4294967295;
 }
 var shift = getShiftFromSize(size);
 registerType(primitiveType, {
  name: name,
  "fromWireType": (function(value) {
   return value;
  }),
  "toWireType": (function(destructors, value) {
   if (typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
   }
   if (value < minRange || value > maxRange) {
    throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ", " + maxRange + "]!");
   }
   return value | 0;
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0),
  destructorFunction: null
 });
}
function _emscripten_set_main_loop_timing(mode, value) {
 Browser.mainLoop.timingMode = mode;
 Browser.mainLoop.timingValue = value;
 if (!Browser.mainLoop.func) {
  return 1;
 }
 if (mode == 0) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   setTimeout(Browser.mainLoop.runner, value);
  };
  Browser.mainLoop.method = "timeout";
 } else if (mode == 1) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
   Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "rAF";
 }
 return 0;
}
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
 Module["noExitRuntime"] = true;
 assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
 Browser.mainLoop.func = func;
 Browser.mainLoop.arg = arg;
 var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
 Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
   var start = Date.now();
   var blocker = Browser.mainLoop.queue.shift();
   blocker.func(blocker.arg);
   if (Browser.mainLoop.remainingBlockers) {
    var remaining = Browser.mainLoop.remainingBlockers;
    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
    if (blocker.counted) {
     Browser.mainLoop.remainingBlockers = next;
    } else {
     next = next + .5;
     Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
    }
   }
   console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
   Browser.mainLoop.updateStatus();
   setTimeout(Browser.mainLoop.runner, 0);
   return;
  }
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
   Browser.mainLoop.scheduler();
   return;
  }
  if (Browser.mainLoop.method === "timeout" && Module.ctx) {
   Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
   Browser.mainLoop.method = "";
  }
  Browser.mainLoop.runIter((function() {
   if (typeof arg !== "undefined") {
    Runtime.dynCall("vi", func, [ arg ]);
   } else {
    Runtime.dynCall("v", func);
   }
  }));
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  Browser.mainLoop.scheduler();
 };
 if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
 Browser.mainLoop.scheduler();
 if (simulateInfiniteLoop) {
  throw "SimulateInfiniteLoop";
 }
}
var Browser = {
 mainLoop: {
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  pause: (function() {
   Browser.mainLoop.scheduler = null;
   Browser.mainLoop.currentlyRunningMainloop++;
  }),
  resume: (function() {
   Browser.mainLoop.currentlyRunningMainloop++;
   var timingMode = Browser.mainLoop.timingMode;
   var timingValue = Browser.mainLoop.timingValue;
   var func = Browser.mainLoop.func;
   Browser.mainLoop.func = null;
   _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
   _emscripten_set_main_loop_timing(timingMode, timingValue);
  }),
  updateStatus: (function() {
   if (Module["setStatus"]) {
    var message = Module["statusMessage"] || "Please wait...";
    var remaining = Browser.mainLoop.remainingBlockers;
    var expected = Browser.mainLoop.expectedBlockers;
    if (remaining) {
     if (remaining < expected) {
      Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")");
     } else {
      Module["setStatus"](message);
     }
    } else {
     Module["setStatus"]("");
    }
   }
  }),
  runIter: (function(func) {
   if (ABORT) return;
   if (Module["preMainLoop"]) {
    var preRet = Module["preMainLoop"]();
    if (preRet === false) {
     return;
    }
   }
   try {
    func();
   } catch (e) {
    if (e instanceof ExitStatus) {
     return;
    } else {
     if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
     throw e;
    }
   }
   if (Module["postMainLoop"]) Module["postMainLoop"]();
  })
 },
 isFullScreen: false,
 pointerLock: false,
 moduleContextCreatedCallbacks: [],
 workers: [],
 init: (function() {
  if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
  if (Browser.initted) return;
  Browser.initted = true;
  try {
   new Blob;
   Browser.hasBlobConstructor = true;
  } catch (e) {
   Browser.hasBlobConstructor = false;
   console.log("warning: no blob constructor, cannot create blobs with mimetypes");
  }
  Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
  Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
  if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
   console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
   Module.noImageDecoding = true;
  }
  var imagePlugin = {};
  imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
   return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
  };
  imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
   var b = null;
   if (Browser.hasBlobConstructor) {
    try {
     b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
     if (b.size !== byteArray.length) {
      b = new Blob([ (new Uint8Array(byteArray)).buffer ], {
       type: Browser.getMimetype(name)
      });
     }
    } catch (e) {
     Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder");
    }
   }
   if (!b) {
    var bb = new Browser.BlobBuilder;
    bb.append((new Uint8Array(byteArray)).buffer);
    b = bb.getBlob();
   }
   var url = Browser.URLObject.createObjectURL(b);
   var img = new Image;
   img.onload = function img_onload() {
    assert(img.complete, "Image " + name + " could not be decoded");
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    Module["preloadedImages"][name] = canvas;
    Browser.URLObject.revokeObjectURL(url);
    if (onload) onload(byteArray);
   };
   img.onerror = function img_onerror(event) {
    console.log("Image " + url + " could not be decoded");
    if (onerror) onerror();
   };
   img.src = url;
  };
  Module["preloadPlugins"].push(imagePlugin);
  var audioPlugin = {};
  audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
   return !Module.noAudioDecoding && name.substr(-4) in {
    ".ogg": 1,
    ".wav": 1,
    ".mp3": 1
   };
  };
  audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
   var done = false;
   function finish(audio) {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = audio;
    if (onload) onload(byteArray);
   }
   function fail() {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = new Audio;
    if (onerror) onerror();
   }
   if (Browser.hasBlobConstructor) {
    try {
     var b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
    } catch (e) {
     return fail();
    }
    var url = Browser.URLObject.createObjectURL(b);
    var audio = new Audio;
    audio.addEventListener("canplaythrough", (function() {
     finish(audio);
    }), false);
    audio.onerror = function audio_onerror(event) {
     if (done) return;
     console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
     function encode64(data) {
      var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var PAD = "=";
      var ret = "";
      var leftchar = 0;
      var leftbits = 0;
      for (var i = 0; i < data.length; i++) {
       leftchar = leftchar << 8 | data[i];
       leftbits += 8;
       while (leftbits >= 6) {
        var curr = leftchar >> leftbits - 6 & 63;
        leftbits -= 6;
        ret += BASE[curr];
       }
      }
      if (leftbits == 2) {
       ret += BASE[(leftchar & 3) << 4];
       ret += PAD + PAD;
      } else if (leftbits == 4) {
       ret += BASE[(leftchar & 15) << 2];
       ret += PAD;
      }
      return ret;
     }
     audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
     finish(audio);
    };
    audio.src = url;
    Browser.safeSetTimeout((function() {
     finish(audio);
    }), 1e4);
   } else {
    return fail();
   }
  };
  Module["preloadPlugins"].push(audioPlugin);
  var canvas = Module["canvas"];
  function pointerLockChange() {
   Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas;
  }
  if (canvas) {
   canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function() {});
   canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function() {});
   canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
   document.addEventListener("pointerlockchange", pointerLockChange, false);
   document.addEventListener("mozpointerlockchange", pointerLockChange, false);
   document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
   document.addEventListener("mspointerlockchange", pointerLockChange, false);
   if (Module["elementPointerLock"]) {
    canvas.addEventListener("click", (function(ev) {
     if (!Browser.pointerLock && canvas.requestPointerLock) {
      canvas.requestPointerLock();
      ev.preventDefault();
     }
    }), false);
   }
  }
 }),
 createContext: (function(canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
  var ctx;
  var contextHandle;
  if (useWebGL) {
   var contextAttributes = {
    antialias: false,
    alpha: false
   };
   if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
     contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
   }
   contextHandle = GL.createContext(canvas, contextAttributes);
   if (contextHandle) {
    ctx = GL.getContext(contextHandle).GLctx;
   }
   canvas.style.backgroundColor = "black";
  } else {
   ctx = canvas.getContext("2d");
  }
  if (!ctx) return null;
  if (setInModule) {
   if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
   Module.ctx = ctx;
   if (useWebGL) GL.makeContextCurrent(contextHandle);
   Module.useWebGL = useWebGL;
   Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
    callback();
   }));
   Browser.init();
  }
  return ctx;
 }),
 destroyContext: (function(canvas, useWebGL, setInModule) {}),
 fullScreenHandlersInstalled: false,
 lockPointer: undefined,
 resizeCanvas: undefined,
 requestFullScreen: (function(lockPointer, resizeCanvas) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
  var canvas = Module["canvas"];
  function fullScreenChange() {
   Browser.isFullScreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function() {});
    canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullScreen = true;
    if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
   }
   if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullScreen);
   Browser.updateCanvasDimensions(canvas);
  }
  if (!Browser.fullScreenHandlersInstalled) {
   Browser.fullScreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullScreenChange, false);
   document.addEventListener("mozfullscreenchange", fullScreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
   document.addEventListener("MSFullscreenChange", fullScreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function() {
   canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
  }) : null);
  canvasContainer.requestFullScreen();
 }),
 nextRAF: 0,
 fakeRequestAnimationFrame: (function(func) {
  var now = Date.now();
  if (Browser.nextRAF === 0) {
   Browser.nextRAF = now + 1e3 / 60;
  } else {
   while (now + 2 >= Browser.nextRAF) {
    Browser.nextRAF += 1e3 / 60;
   }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
 }),
 requestAnimationFrame: function requestAnimationFrame(func) {
  if (typeof window === "undefined") {
   Browser.fakeRequestAnimationFrame(func);
  } else {
   if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame;
   }
   window.requestAnimationFrame(func);
  }
 },
 safeCallback: (function(func) {
  return (function() {
   if (!ABORT) return func.apply(null, arguments);
  });
 }),
 safeRequestAnimationFrame: (function(func) {
  return Browser.requestAnimationFrame((function() {
   if (!ABORT) func();
  }));
 }),
 safeSetTimeout: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setTimeout((function() {
   if (!ABORT) func();
  }), timeout);
 }),
 safeSetInterval: (function(func, timeout) {
  Module["noExitRuntime"] = true;
  return setInterval((function() {
   if (!ABORT) func();
  }), timeout);
 }),
 getMimetype: (function(name) {
  return {
   "jpg": "image/jpeg",
   "jpeg": "image/jpeg",
   "png": "image/png",
   "bmp": "image/bmp",
   "ogg": "audio/ogg",
   "wav": "audio/wav",
   "mp3": "audio/mpeg"
  }[name.substr(name.lastIndexOf(".") + 1)];
 }),
 getUserMedia: (function(func) {
  if (!window.getUserMedia) {
   window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"];
  }
  window.getUserMedia(func);
 }),
 getMovementX: (function(event) {
  return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
 }),
 getMovementY: (function(event) {
  return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
 }),
 getMouseWheelDelta: (function(event) {
  var delta = 0;
  switch (event.type) {
  case "DOMMouseScroll":
   delta = event.detail;
   break;
  case "mousewheel":
   delta = event.wheelDelta;
   break;
  case "wheel":
   delta = event["deltaY"];
   break;
  default:
   throw "unrecognized mouse wheel event: " + event.type;
  }
  return delta;
 }),
 mouseX: 0,
 mouseY: 0,
 mouseMovementX: 0,
 mouseMovementY: 0,
 touches: {},
 lastTouches: {},
 calculateMouseEvent: (function(event) {
  if (Browser.pointerLock) {
   if (event.type != "mousemove" && "mozMovementX" in event) {
    Browser.mouseMovementX = Browser.mouseMovementY = 0;
   } else {
    Browser.mouseMovementX = Browser.getMovementX(event);
    Browser.mouseMovementY = Browser.getMovementY(event);
   }
   if (typeof SDL != "undefined") {
    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
   } else {
    Browser.mouseX += Browser.mouseMovementX;
    Browser.mouseY += Browser.mouseMovementY;
   }
  } else {
   var rect = Module["canvas"].getBoundingClientRect();
   var cw = Module["canvas"].width;
   var ch = Module["canvas"].height;
   var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
   var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
   if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
    var touch = event.touch;
    if (touch === undefined) {
     return;
    }
    var adjustedX = touch.pageX - (scrollX + rect.left);
    var adjustedY = touch.pageY - (scrollY + rect.top);
    adjustedX = adjustedX * (cw / rect.width);
    adjustedY = adjustedY * (ch / rect.height);
    var coords = {
     x: adjustedX,
     y: adjustedY
    };
    if (event.type === "touchstart") {
     Browser.lastTouches[touch.identifier] = coords;
     Browser.touches[touch.identifier] = coords;
    } else if (event.type === "touchend" || event.type === "touchmove") {
     Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
     Browser.touches[touch.identifier] = {
      x: adjustedX,
      y: adjustedY
     };
    }
    return;
   }
   var x = event.pageX - (scrollX + rect.left);
   var y = event.pageY - (scrollY + rect.top);
   x = x * (cw / rect.width);
   y = y * (ch / rect.height);
   Browser.mouseMovementX = x - Browser.mouseX;
   Browser.mouseMovementY = y - Browser.mouseY;
   Browser.mouseX = x;
   Browser.mouseY = y;
  }
 }),
 xhrLoad: (function(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
   } else {
    onerror();
   }
  };
  xhr.onerror = onerror;
  xhr.send(null);
 }),
 asyncLoad: (function(url, onload, onerror, noRunDep) {
  Browser.xhrLoad(url, (function(arrayBuffer) {
   assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
   onload(new Uint8Array(arrayBuffer));
   if (!noRunDep) removeRunDependency("al " + url);
  }), (function(event) {
   if (onerror) {
    onerror();
   } else {
    throw 'Loading data file "' + url + '" failed.';
   }
  }));
  if (!noRunDep) addRunDependency("al " + url);
 }),
 resizeListeners: [],
 updateResizeListeners: (function() {
  var canvas = Module["canvas"];
  Browser.resizeListeners.forEach((function(listener) {
   listener(canvas.width, canvas.height);
  }));
 }),
 setCanvasSize: (function(width, height, noUpdates) {
  var canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
 }),
 windowedWidth: 0,
 windowedHeight: 0,
 setFullScreenCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags | 8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 setWindowedCanvasSize: (function() {
  if (typeof SDL != "undefined") {
   var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
   flags = flags & ~8388608;
   HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags;
  }
  Browser.updateResizeListeners();
 }),
 updateCanvasDimensions: (function(canvas, wNative, hNative) {
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   if (canvas.width != w) canvas.width = w;
   if (canvas.height != h) canvas.height = h;
   if (typeof canvas.style != "undefined") {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  } else {
   if (canvas.width != wNative) canvas.width = wNative;
   if (canvas.height != hNative) canvas.height = hNative;
   if (typeof canvas.style != "undefined") {
    if (w != wNative || h != hNative) {
     canvas.style.setProperty("width", w + "px", "important");
     canvas.style.setProperty("height", h + "px", "important");
    } else {
     canvas.style.removeProperty("width");
     canvas.style.removeProperty("height");
    }
   }
  }
 }),
 wgetRequests: {},
 nextWgetRequestHandle: 0,
 getNextWgetRequestHandle: (function() {
  var handle = Browser.nextWgetRequestHandle;
  Browser.nextWgetRequestHandle++;
  return handle;
 })
};
function _pthread_setspecific(key, value) {
 if (!(key in PTHREAD_SPECIFIC)) {
  return ERRNO_CODES.EINVAL;
 }
 PTHREAD_SPECIFIC[key] = value;
 return 0;
}
function __embind_register_emval(rawType, name) {
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": (function(handle) {
   var rv = emval_handle_array[handle].value;
   __emval_decref(handle);
   return rv;
  }),
  "toWireType": (function(destructors, value) {
   return __emval_register(value);
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": simpleReadValueFromPointer,
  destructorFunction: null
 });
}
function ___cxa_allocate_exception(size) {
 return _malloc(size);
}
function heap32VectorToArray(count, firstElement) {
 var array = [];
 for (var i = 0; i < count; i++) {
  array.push(HEAP32[(firstElement >> 2) + i]);
 }
 return array;
}
function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
 var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
 invoker = requireFunction(invokerSignature, invoker);
 whenDependentTypesAreResolved([], [ rawClassType ], (function(classType) {
  classType = classType[0];
  var humanName = "constructor " + classType.name;
  if (undefined === classType.registeredClass.constructor_body) {
   classType.registeredClass.constructor_body = [];
  }
  if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
   throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
  }
  classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
   throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes);
  };
  whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
   classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
    if (arguments.length !== argCount - 1) {
     throwBindingError(humanName + " called with " + arguments.length + " arguments, expected " + (argCount - 1));
    }
    var destructors = [];
    var args = new Array(argCount);
    args[0] = rawConstructor;
    for (var i = 1; i < argCount; ++i) {
     args[i] = argTypes[i]["toWireType"](destructors, arguments[i - 1]);
    }
    var ptr = invoker.apply(null, args);
    runDestructors(destructors);
    return argTypes[0]["fromWireType"](ptr);
   };
   return [];
  }));
  return [];
 }));
}
function floatReadValueFromPointer(name, shift) {
 switch (shift) {
 case 2:
  return (function(pointer) {
   return this["fromWireType"](HEAPF32[pointer >> 2]);
  });
 case 3:
  return (function(pointer) {
   return this["fromWireType"](HEAPF64[pointer >> 3]);
  });
 default:
  throw new TypeError("Unknown float type: " + name);
 }
}
function __embind_register_float(rawType, name, size) {
 var shift = getShiftFromSize(size);
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": (function(value) {
   return value;
  }),
  "toWireType": (function(destructors, value) {
   if (typeof value !== "number" && typeof value !== "boolean") {
    throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
   }
   return value;
  }),
  "argPackAdvance": 8,
  "readValueFromPointer": floatReadValueFromPointer(name, shift),
  destructorFunction: null
 });
}
var PTHREAD_SPECIFIC_NEXT_KEY = 1;
function _pthread_key_create(key, destructor) {
 if (key == 0) {
  return ERRNO_CODES.EINVAL;
 }
 HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
 PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
 PTHREAD_SPECIFIC_NEXT_KEY++;
 return 0;
}
function new_(constructor, argumentList) {
 if (!(constructor instanceof Function)) {
  throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function");
 }
 var dummy = createNamedFunction(constructor.name || "unknownFunctionName", (function() {}));
 dummy.prototype = constructor.prototype;
 var obj = new dummy;
 var r = constructor.apply(obj, argumentList);
 return r instanceof Object ? r : obj;
}
function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
 var argCount = argTypes.length;
 if (argCount < 2) {
  throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
 }
 var isClassMethodFunc = argTypes[1] !== null && classType !== null;
 var argsList = "";
 var argsListWired = "";
 for (var i = 0; i < argCount - 2; ++i) {
  argsList += (i !== 0 ? ", " : "") + "arg" + i;
  argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired";
 }
 var invokerFnBody = "return function " + makeLegalFunctionName(humanName) + "(" + argsList + ") {\n" + "if (arguments.length !== " + (argCount - 2) + ") {\n" + "throwBindingError('function " + humanName + " called with ' + arguments.length + ' arguments, expected " + (argCount - 2) + " args!');\n" + "}\n";
 var needsDestructorStack = false;
 for (var i = 1; i < argTypes.length; ++i) {
  if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
   needsDestructorStack = true;
   break;
  }
 }
 if (needsDestructorStack) {
  invokerFnBody += "var destructors = [];\n";
 }
 var dtorStack = needsDestructorStack ? "destructors" : "null";
 var args1 = [ "throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam" ];
 var args2 = [ throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1] ];
 if (isClassMethodFunc) {
  invokerFnBody += "var thisWired = classParam.toWireType(" + dtorStack + ", this);\n";
 }
 for (var i = 0; i < argCount - 2; ++i) {
  invokerFnBody += "var arg" + i + "Wired = argType" + i + ".toWireType(" + dtorStack + ", arg" + i + "); // " + argTypes[i + 2].name + "\n";
  args1.push("argType" + i);
  args2.push(argTypes[i + 2]);
 }
 if (isClassMethodFunc) {
  argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
 }
 var returns = argTypes[0].name !== "void";
 invokerFnBody += (returns ? "var rv = " : "") + "invoker(fn" + (argsListWired.length > 0 ? ", " : "") + argsListWired + ");\n";
 if (needsDestructorStack) {
  invokerFnBody += "runDestructors(destructors);\n";
 } else {
  for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
   var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
   if (argTypes[i].destructorFunction !== null) {
    invokerFnBody += paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
    args1.push(paramName + "_dtor");
    args2.push(argTypes[i].destructorFunction);
   }
  }
 }
 if (returns) {
  invokerFnBody += "var ret = retType.fromWireType(rv);\n" + "return ret;\n";
 } else {}
 invokerFnBody += "}\n";
 args1.push(invokerFnBody);
 var invokerFunction = new_(Function, args1).apply(null, args2);
 return invokerFunction;
}
function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn) {
 var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
 name = readLatin1String(name);
 rawInvoker = requireFunction(signature, rawInvoker);
 exposePublicSymbol(name, (function() {
  throwUnboundTypeError("Cannot call " + name + " due to unbound types", argTypes);
 }), argCount - 1);
 whenDependentTypesAreResolved([], argTypes, (function(argTypes) {
  var invokerArgsArray = [ argTypes[0], null ].concat(argTypes.slice(1));
  replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn), argCount - 1);
  return [];
 }));
}
function __reallyNegative(x) {
 return x < 0 || x === 0 && 1 / x === -Infinity;
}
function __formatString(format, varargs) {
 var textIndex = format;
 var argIndex = 0;
 function getNextArg(type) {
  var ret;
  if (type === "double") {
   ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3]);
  } else if (type == "i64") {
   ret = [ HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2] ];
  } else {
   type = "i32";
   ret = HEAP32[varargs + argIndex >> 2];
  }
  argIndex += Runtime.getNativeFieldSize(type);
  return ret;
 }
 var ret = [];
 var curr, next, currArg;
 while (1) {
  var startTextIndex = textIndex;
  curr = HEAP8[textIndex >> 0];
  if (curr === 0) break;
  next = HEAP8[textIndex + 1 >> 0];
  if (curr == 37) {
   var flagAlwaysSigned = false;
   var flagLeftAlign = false;
   var flagAlternative = false;
   var flagZeroPad = false;
   var flagPadSign = false;
   flagsLoop : while (1) {
    switch (next) {
    case 43:
     flagAlwaysSigned = true;
     break;
    case 45:
     flagLeftAlign = true;
     break;
    case 35:
     flagAlternative = true;
     break;
    case 48:
     if (flagZeroPad) {
      break flagsLoop;
     } else {
      flagZeroPad = true;
      break;
     }
    case 32:
     flagPadSign = true;
     break;
    default:
     break flagsLoop;
    }
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   }
   var width = 0;
   if (next == 42) {
    width = getNextArg("i32");
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
   } else {
    while (next >= 48 && next <= 57) {
     width = width * 10 + (next - 48);
     textIndex++;
     next = HEAP8[textIndex + 1 >> 0];
    }
   }
   var precisionSet = false, precision = -1;
   if (next == 46) {
    precision = 0;
    precisionSet = true;
    textIndex++;
    next = HEAP8[textIndex + 1 >> 0];
    if (next == 42) {
     precision = getNextArg("i32");
     textIndex++;
    } else {
     while (1) {
      var precisionChr = HEAP8[textIndex + 1 >> 0];
      if (precisionChr < 48 || precisionChr > 57) break;
      precision = precision * 10 + (precisionChr - 48);
      textIndex++;
     }
    }
    next = HEAP8[textIndex + 1 >> 0];
   }
   if (precision < 0) {
    precision = 6;
    precisionSet = false;
   }
   var argSize;
   switch (String.fromCharCode(next)) {
   case "h":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 104) {
     textIndex++;
     argSize = 1;
    } else {
     argSize = 2;
    }
    break;
   case "l":
    var nextNext = HEAP8[textIndex + 2 >> 0];
    if (nextNext == 108) {
     textIndex++;
     argSize = 8;
    } else {
     argSize = 4;
    }
    break;
   case "L":
   case "q":
   case "j":
    argSize = 8;
    break;
   case "z":
   case "t":
   case "I":
    argSize = 4;
    break;
   default:
    argSize = null;
   }
   if (argSize) textIndex++;
   next = HEAP8[textIndex + 1 >> 0];
   switch (String.fromCharCode(next)) {
   case "d":
   case "i":
   case "u":
   case "o":
   case "x":
   case "X":
   case "p":
    {
     var signed = next == 100 || next == 105;
     argSize = argSize || 4;
     var currArg = getNextArg("i" + argSize * 8);
     var origArg = currArg;
     var argText;
     if (argSize == 8) {
      currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
     }
     if (argSize <= 4) {
      var limit = Math.pow(256, argSize) - 1;
      currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
     }
     var currAbsArg = Math.abs(currArg);
     var prefix = "";
     if (next == 100 || next == 105) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else argText = reSign(currArg, 8 * argSize, 1).toString(10);
     } else if (next == 117) {
      if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else argText = unSign(currArg, 8 * argSize, 1).toString(10);
      currArg = Math.abs(currArg);
     } else if (next == 111) {
      argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8);
     } else if (next == 120 || next == 88) {
      prefix = flagAlternative && currArg != 0 ? "0x" : "";
      if (argSize == 8 && i64Math) {
       if (origArg[1]) {
        argText = (origArg[1] >>> 0).toString(16);
        var lower = (origArg[0] >>> 0).toString(16);
        while (lower.length < 8) lower = "0" + lower;
        argText += lower;
       } else {
        argText = (origArg[0] >>> 0).toString(16);
       }
      } else if (currArg < 0) {
       currArg = -currArg;
       argText = (currAbsArg - 1).toString(16);
       var buffer = [];
       for (var i = 0; i < argText.length; i++) {
        buffer.push((15 - parseInt(argText[i], 16)).toString(16));
       }
       argText = buffer.join("");
       while (argText.length < argSize * 2) argText = "f" + argText;
      } else {
       argText = currAbsArg.toString(16);
      }
      if (next == 88) {
       prefix = prefix.toUpperCase();
       argText = argText.toUpperCase();
      }
     } else if (next == 112) {
      if (currAbsArg === 0) {
       argText = "(nil)";
      } else {
       prefix = "0x";
       argText = currAbsArg.toString(16);
      }
     }
     if (precisionSet) {
      while (argText.length < precision) {
       argText = "0" + argText;
      }
     }
     if (currArg >= 0) {
      if (flagAlwaysSigned) {
       prefix = "+" + prefix;
      } else if (flagPadSign) {
       prefix = " " + prefix;
      }
     }
     if (argText.charAt(0) == "-") {
      prefix = "-" + prefix;
      argText = argText.substr(1);
     }
     while (prefix.length + argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad) {
        argText = "0" + argText;
       } else {
        prefix = " " + prefix;
       }
      }
     }
     argText = prefix + argText;
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "f":
   case "F":
   case "e":
   case "E":
   case "g":
   case "G":
    {
     var currArg = getNextArg("double");
     var argText;
     if (isNaN(currArg)) {
      argText = "nan";
      flagZeroPad = false;
     } else if (!isFinite(currArg)) {
      argText = (currArg < 0 ? "-" : "") + "inf";
      flagZeroPad = false;
     } else {
      var isGeneral = false;
      var effectivePrecision = Math.min(precision, 20);
      if (next == 103 || next == 71) {
       isGeneral = true;
       precision = precision || 1;
       var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
       if (precision > exponent && exponent >= -4) {
        next = (next == 103 ? "f" : "F").charCodeAt(0);
        precision -= exponent + 1;
       } else {
        next = (next == 103 ? "e" : "E").charCodeAt(0);
        precision--;
       }
       effectivePrecision = Math.min(precision, 20);
      }
      if (next == 101 || next == 69) {
       argText = currArg.toExponential(effectivePrecision);
       if (/[eE][-+]\d$/.test(argText)) {
        argText = argText.slice(0, -1) + "0" + argText.slice(-1);
       }
      } else if (next == 102 || next == 70) {
       argText = currArg.toFixed(effectivePrecision);
       if (currArg === 0 && __reallyNegative(currArg)) {
        argText = "-" + argText;
       }
      }
      var parts = argText.split("e");
      if (isGeneral && !flagAlternative) {
       while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
        parts[0] = parts[0].slice(0, -1);
       }
      } else {
       if (flagAlternative && argText.indexOf(".") == -1) parts[0] += ".";
       while (precision > effectivePrecision++) parts[0] += "0";
      }
      argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
      if (next == 69) argText = argText.toUpperCase();
      if (currArg >= 0) {
       if (flagAlwaysSigned) {
        argText = "+" + argText;
       } else if (flagPadSign) {
        argText = " " + argText;
       }
      }
     }
     while (argText.length < width) {
      if (flagLeftAlign) {
       argText += " ";
      } else {
       if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
        argText = argText[0] + "0" + argText.slice(1);
       } else {
        argText = (flagZeroPad ? "0" : " ") + argText;
       }
      }
     }
     if (next < 97) argText = argText.toUpperCase();
     argText.split("").forEach((function(chr) {
      ret.push(chr.charCodeAt(0));
     }));
     break;
    }
   case "s":
    {
     var arg = getNextArg("i8*");
     var argLength = arg ? _strlen(arg) : "(null)".length;
     if (precisionSet) argLength = Math.min(argLength, precision);
     if (!flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     if (arg) {
      for (var i = 0; i < argLength; i++) {
       ret.push(HEAPU8[arg++ >> 0]);
      }
     } else {
      ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true));
     }
     if (flagLeftAlign) {
      while (argLength < width--) {
       ret.push(32);
      }
     }
     break;
    }
   case "c":
    {
     if (flagLeftAlign) ret.push(getNextArg("i8"));
     while (--width > 0) {
      ret.push(32);
     }
     if (!flagLeftAlign) ret.push(getNextArg("i8"));
     break;
    }
   case "n":
    {
     var ptr = getNextArg("i32*");
     HEAP32[ptr >> 2] = ret.length;
     break;
    }
   case "%":
    {
     ret.push(curr);
     break;
    }
   default:
    {
     for (var i = startTextIndex; i < textIndex + 2; i++) {
      ret.push(HEAP8[i >> 0]);
     }
    }
   }
   textIndex += 2;
  } else {
   ret.push(curr);
   textIndex += 1;
  }
 }
 return ret;
}
function _fprintf(stream, format, varargs) {
 var result = __formatString(format, varargs);
 var stack = Runtime.stackSave();
 var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
 Runtime.stackRestore(stack);
 return ret;
}
function _vfprintf(s, f, va_arg) {
 return _fprintf(s, f, HEAP32[va_arg >> 2]);
}
function ___cxa_begin_catch(ptr) {
 __ZSt18uncaught_exceptionv.uncaught_exception--;
 EXCEPTIONS.caught.push(ptr);
 EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
 return ptr;
}
function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
 return dest;
}
Module["_memcpy"] = _memcpy;
function __embind_finalize_value_object(structType) {
 var reg = structRegistrations[structType];
 delete structRegistrations[structType];
 var rawConstructor = reg.rawConstructor;
 var rawDestructor = reg.rawDestructor;
 var fieldRecords = reg.fields;
 var fieldTypes = fieldRecords.map((function(field) {
  return field.getterReturnType;
 })).concat(fieldRecords.map((function(field) {
  return field.setterArgumentType;
 })));
 whenDependentTypesAreResolved([ structType ], fieldTypes, (function(fieldTypes) {
  var fields = {};
  fieldRecords.forEach((function(field, i) {
   var fieldName = field.fieldName;
   var getterReturnType = fieldTypes[i];
   var getter = field.getter;
   var getterContext = field.getterContext;
   var setterArgumentType = fieldTypes[i + fieldRecords.length];
   var setter = field.setter;
   var setterContext = field.setterContext;
   fields[fieldName] = {
    read: (function(ptr) {
     return getterReturnType["fromWireType"](getter(getterContext, ptr));
    }),
    write: (function(ptr, o) {
     var destructors = [];
     setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, o));
     runDestructors(destructors);
    })
   };
  }));
  return [ {
   name: reg.name,
   "fromWireType": (function(ptr) {
    var rv = {};
    for (var i in fields) {
     rv[i] = fields[i].read(ptr);
    }
    rawDestructor(ptr);
    return rv;
   }),
   "toWireType": (function(destructors, o) {
    for (var fieldName in fields) {
     if (!(fieldName in o)) {
      throw new TypeError("Missing field");
     }
    }
    var ptr = rawConstructor();
    for (fieldName in fields) {
     fields[fieldName].write(ptr, o[fieldName]);
    }
    if (destructors !== null) {
     destructors.push(rawDestructor, ptr);
    }
    return ptr;
   }),
   "argPackAdvance": 8,
   "readValueFromPointer": simpleReadValueFromPointer,
   destructorFunction: rawDestructor
  } ];
 }));
}
function _sbrk(bytes) {
 var self = _sbrk;
 if (!self.called) {
  DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
  self.called = true;
  assert(Runtime.dynamicAlloc);
  self.alloc = Runtime.dynamicAlloc;
  Runtime.dynamicAlloc = (function() {
   abort("cannot dynamically allocate, sbrk now has control");
  });
 }
 var ret = DYNAMICTOP;
 if (bytes != 0) self.alloc(bytes);
 return ret;
}
function ___errno_location() {
 return ___errno_state;
}
function __embind_register_memory_view(rawType, dataTypeIndex, name) {
 var typeMapping = [ Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array ];
 var TA = typeMapping[dataTypeIndex];
 function decodeMemoryView(handle) {
  handle = handle >> 2;
  var heap = HEAPU32;
  var size = heap[handle];
  var data = heap[handle + 1];
  return new TA(heap["buffer"], data, size);
 }
 name = readLatin1String(name);
 registerType(rawType, {
  name: name,
  "fromWireType": decodeMemoryView,
  "argPackAdvance": 8,
  "readValueFromPointer": decodeMemoryView
 }, {
  ignoreDuplicateRegistrations: true
 });
}
function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  HEAP32[ptr >> 2] = ret;
 }
 return ret;
}
function __emval_incref(handle) {
 if (handle > 4) {
  emval_handle_array[handle].refcount += 1;
 }
}
function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
 var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
 methodName = readLatin1String(methodName);
 rawInvoker = requireFunction(invokerSignature, rawInvoker);
 whenDependentTypesAreResolved([], [ rawClassType ], (function(classType) {
  classType = classType[0];
  var humanName = classType.name + "." + methodName;
  if (isPureVirtual) {
   classType.registeredClass.pureVirtualFunctions.push(methodName);
  }
  function unboundTypesHandler() {
   throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes);
  }
  var proto = classType.registeredClass.instancePrototype;
  var method = proto[methodName];
  if (undefined === method || undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
   unboundTypesHandler.argCount = argCount - 2;
   unboundTypesHandler.className = classType.name;
   proto[methodName] = unboundTypesHandler;
  } else {
   ensureOverloadTable(proto, methodName, humanName);
   proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
  }
  whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
   var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
   if (undefined === proto[methodName].overloadTable) {
    proto[methodName] = memberFunction;
   } else {
    proto[methodName].overloadTable[argCount - 2] = memberFunction;
   }
   return [];
  }));
  return [];
 }));
}
embind_init_charCodes();
BindingError = Module["BindingError"] = extendError(Error, "BindingError");
___errno_state = Runtime.staticAlloc(4);
HEAP32[___errno_state >> 2] = 0;
InternalError = Module["InternalError"] = extendError(Error, "InternalError");
UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
init_ClassHandle();
init_RegisteredPointer();
init_embind();
_fputc.ret = allocate([ 0 ], "i8", ALLOC_STATIC);
FS.staticInit();
__ATINIT__.unshift({
 func: (function() {
  if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 })
});
__ATMAIN__.push({
 func: (function() {
  FS.ignorePermissions = false;
 })
});
__ATEXIT__.push({
 func: (function() {
  FS.quit();
 })
});
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({
 func: (function() {
  TTY.init();
 })
});
__ATEXIT__.push({
 func: (function() {
  TTY.shutdown();
 })
});
TTY.utf8 = new Runtime.UTF8Processor;
if (ENVIRONMENT_IS_NODE) {
 var fs = require("fs");
 NODEFS.staticInit();
}
__ATINIT__.push({
 func: (function() {
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
 })
});
init_emval();
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) {
 Browser.requestFullScreen(lockPointer, resizeCanvas);
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
 Browser.requestAnimationFrame(func);
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
 Browser.setCanvasSize(width, height, noUpdates);
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
 Browser.mainLoop.pause();
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
 Browser.mainLoop.resume();
};
Module["getUserMedia"] = function Module_getUserMedia() {
 Browser.getUserMedia();
};
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
function invoke_iiii(index, a1, a2, a3) {
 try {
  return Module["dynCall_iiii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiii(index, a1, a2, a3, a4, a5) {
 try {
  Module["dynCall_viiiii"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_i(index) {
 try {
  return Module["dynCall_i"](index);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vi(index, a1) {
 try {
  Module["dynCall_vi"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_vii(index, a1, a2) {
 try {
  Module["dynCall_vii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiid(index, a1, a2, a3, a4, a5) {
 try {
  Module["dynCall_viiiid"](index, a1, a2, a3, a4, a5);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_ii(index, a1) {
 try {
  return Module["dynCall_ii"](index, a1);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiid(index, a1, a2, a3, a4) {
 try {
  Module["dynCall_viiid"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viii(index, a1, a2, a3) {
 try {
  Module["dynCall_viii"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_v(index) {
 try {
  Module["dynCall_v"](index);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viid(index, a1, a2, a3) {
 try {
  Module["dynCall_viid"](index, a1, a2, a3);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iiiii(index, a1, a2, a3, a4) {
 try {
  return Module["dynCall_iiiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
 try {
  Module["dynCall_viiiiii"](index, a1, a2, a3, a4, a5, a6);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_iii(index, a1, a2) {
 try {
  return Module["dynCall_iii"](index, a1, a2);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
function invoke_viiii(index, a1, a2, a3, a4) {
 try {
  Module["dynCall_viiii"](index, a1, a2, a3, a4);
 } catch (e) {
  if (typeof e !== "number" && e !== "longjmp") throw e;
  asm["setThrew"](1, 0);
 }
}
Module.asmGlobalArg = {
 "Math": Math,
 "Int8Array": Int8Array,
 "Int16Array": Int16Array,
 "Int32Array": Int32Array,
 "Uint8Array": Uint8Array,
 "Uint16Array": Uint16Array,
 "Uint32Array": Uint32Array,
 "Float32Array": Float32Array,
 "Float64Array": Float64Array
};
Module.asmLibraryArg = {
 "abort": abort,
 "assert": assert,
 "min": Math_min,
 "invoke_iiii": invoke_iiii,
 "invoke_viiiii": invoke_viiiii,
 "invoke_i": invoke_i,
 "invoke_vi": invoke_vi,
 "invoke_vii": invoke_vii,
 "invoke_viiiid": invoke_viiiid,
 "invoke_ii": invoke_ii,
 "invoke_viiid": invoke_viiid,
 "invoke_viii": invoke_viii,
 "invoke_v": invoke_v,
 "invoke_viid": invoke_viid,
 "invoke_iiiii": invoke_iiiii,
 "invoke_viiiiii": invoke_viiiiii,
 "invoke_iii": invoke_iii,
 "invoke_viiii": invoke_viiii,
 "_fabs": _fabs,
 "floatReadValueFromPointer": floatReadValueFromPointer,
 "simpleReadValueFromPointer": simpleReadValueFromPointer,
 "RegisteredPointer_getPointee": RegisteredPointer_getPointee,
 "throwInternalError": throwInternalError,
 "get_first_emval": get_first_emval,
 "getLiveInheritedInstances": getLiveInheritedInstances,
 "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv,
 "ClassHandle": ClassHandle,
 "getShiftFromSize": getShiftFromSize,
 "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
 "_sbrk": _sbrk,
 "___cxa_begin_catch": ___cxa_begin_catch,
 "_emscripten_memcpy_big": _emscripten_memcpy_big,
 "runDestructor": runDestructor,
 "_sysconf": _sysconf,
 "throwInstanceAlreadyDeleted": throwInstanceAlreadyDeleted,
 "__embind_register_std_string": __embind_register_std_string,
 "init_RegisteredPointer": init_RegisteredPointer,
 "ClassHandle_isAliasOf": ClassHandle_isAliasOf,
 "flushPendingDeletes": flushPendingDeletes,
 "makeClassHandle": makeClassHandle,
 "_write": _write,
 "whenDependentTypesAreResolved": whenDependentTypesAreResolved,
 "__embind_register_class_constructor": __embind_register_class_constructor,
 "init_ClassHandle": init_ClassHandle,
 "ClassHandle_clone": ClassHandle_clone,
 "_send": _send,
 "RegisteredClass": RegisteredClass,
 "___cxa_find_matching_catch": ___cxa_find_matching_catch,
 "__embind_register_value_object_field": __embind_register_value_object_field,
 "embind_init_charCodes": embind_init_charCodes,
 "___setErrNo": ___setErrNo,
 "__embind_register_bool": __embind_register_bool,
 "___resumeException": ___resumeException,
 "createNamedFunction": createNamedFunction,
 "__embind_register_class_property": __embind_register_class_property,
 "__embind_register_emval": __embind_register_emval,
 "__embind_finalize_value_object": __embind_finalize_value_object,
 "__emval_decref": __emval_decref,
 "_pthread_once": _pthread_once,
 "__embind_register_class": __embind_register_class,
 "constNoSmartPtrRawPointerToWireType": constNoSmartPtrRawPointerToWireType,
 "heap32VectorToArray": heap32VectorToArray,
 "ClassHandle_delete": ClassHandle_delete,
 "getInheritedInstanceCount": getInheritedInstanceCount,
 "RegisteredPointer_destructor": RegisteredPointer_destructor,
 "_fwrite": _fwrite,
 "_time": _time,
 "_fprintf": _fprintf,
 "new_": new_,
 "downcastPointer": downcastPointer,
 "replacePublicSymbol": replacePublicSymbol,
 "init_embind": init_embind,
 "ClassHandle_deleteLater": ClassHandle_deleteLater,
 "RegisteredPointer_deleteObject": RegisteredPointer_deleteObject,
 "ClassHandle_isDeleted": ClassHandle_isDeleted,
 "_vfprintf": _vfprintf,
 "__embind_register_integer": __embind_register_integer,
 "___cxa_allocate_exception": ___cxa_allocate_exception,
 "__emval_take_value": __emval_take_value,
 "_pwrite": _pwrite,
 "_fabsf": _fabsf,
 "__embind_register_value_object": __embind_register_value_object,
 "_embind_repr": _embind_repr,
 "_pthread_getspecific": _pthread_getspecific,
 "__embind_register_class_function": __embind_register_class_function,
 "RegisteredPointer": RegisteredPointer,
 "craftInvokerFunction": craftInvokerFunction,
 "runDestructors": runDestructors,
 "requireRegisteredType": requireRegisteredType,
 "makeLegalFunctionName": makeLegalFunctionName,
 "_pthread_key_create": _pthread_key_create,
 "upcastPointer": upcastPointer,
 "init_emval": init_emval,
 "shallowCopyInternalPointer": shallowCopyInternalPointer,
 "nonConstNoSmartPtrRawPointerToWireType": nonConstNoSmartPtrRawPointerToWireType,
 "_fputc": _fputc,
 "_abort": _abort,
 "throwBindingError": throwBindingError,
 "getTypeName": getTypeName,
 "validateThis": validateThis,
 "exposePublicSymbol": exposePublicSymbol,
 "RegisteredPointer_fromWireType": RegisteredPointer_fromWireType,
 "__embind_register_memory_view": __embind_register_memory_view,
 "getInheritedInstance": getInheritedInstance,
 "setDelayFunction": setDelayFunction,
 "extendError": extendError,
 "ensureOverloadTable": ensureOverloadTable,
 "__embind_register_void": __embind_register_void,
 "_fflush": _fflush,
 "__reallyNegative": __reallyNegative,
 "__emval_register": __emval_register,
 "__embind_register_std_wstring": __embind_register_std_wstring,
 "_fileno": _fileno,
 "__emval_incref": __emval_incref,
 "throwUnboundTypeError": throwUnboundTypeError,
 "readLatin1String": readLatin1String,
 "getBasestPointer": getBasestPointer,
 "_mkport": _mkport,
 "__embind_register_float": __embind_register_float,
 "integerReadValueFromPointer": integerReadValueFromPointer,
 "__embind_register_function": __embind_register_function,
 "_emscripten_set_main_loop": _emscripten_set_main_loop,
 "___errno_location": ___errno_location,
 "_pthread_setspecific": _pthread_setspecific,
 "genericPointerToWireType": genericPointerToWireType,
 "registerType": registerType,
 "___cxa_throw": ___cxa_throw,
 "count_emval_handles": count_emval_handles,
 "requireFunction": requireFunction,
 "__formatString": __formatString,
 "_sqrt": _sqrt,
 "STACKTOP": STACKTOP,
 "STACK_MAX": STACK_MAX,
 "tempDoublePtr": tempDoublePtr,
 "ABORT": ABORT,
 "NaN": NaN,
 "Infinity": Infinity,
 "_stderr": _stderr
};
// EMSCRIPTEN_START_ASM

var asm = (function(global,env,buffer) {

 "use asm";
 var a = new global.Int8Array(buffer);
 var b = new global.Int16Array(buffer);
 var c = new global.Int32Array(buffer);
 var d = new global.Uint8Array(buffer);
 var e = new global.Uint16Array(buffer);
 var f = new global.Uint32Array(buffer);
 var g = new global.Float32Array(buffer);
 var h = new global.Float64Array(buffer);
 var i = env.STACKTOP | 0;
 var j = env.STACK_MAX | 0;
 var k = env.tempDoublePtr | 0;
 var l = env.ABORT | 0;
 var m = env._stderr | 0;
 var n = 0;
 var o = 0;
 var p = 0;
 var q = 0;
 var r = +env.NaN, s = +env.Infinity;
 var t = 0, u = 0, v = 0, w = 0, x = 0.0, y = 0, z = 0, A = 0, B = 0.0;
 var C = 0;
 var D = 0;
 var E = 0;
 var F = 0;
 var G = 0;
 var H = 0;
 var I = 0;
 var J = 0;
 var K = 0;
 var L = 0;
 var M = global.Math.floor;
 var N = global.Math.abs;
 var O = global.Math.sqrt;
 var P = global.Math.pow;
 var Q = global.Math.cos;
 var R = global.Math.sin;
 var S = global.Math.tan;
 var T = global.Math.acos;
 var U = global.Math.asin;
 var V = global.Math.atan;
 var W = global.Math.atan2;
 var X = global.Math.exp;
 var Y = global.Math.log;
 var Z = global.Math.ceil;
 var _ = global.Math.imul;
 var $ = env.abort;
 var aa = env.assert;
 var ba = env.min;
 var ca = env.invoke_iiii;
 var da = env.invoke_viiiii;
 var ea = env.invoke_i;
 var fa = env.invoke_vi;
 var ga = env.invoke_vii;
 var ha = env.invoke_viiiid;
 var ia = env.invoke_ii;
 var ja = env.invoke_viiid;
 var ka = env.invoke_viii;
 var la = env.invoke_v;
 var ma = env.invoke_viid;
 var na = env.invoke_iiiii;
 var oa = env.invoke_viiiiii;
 var pa = env.invoke_iii;
 var qa = env.invoke_viiii;
 var ra = env._fabs;
 var sa = env.floatReadValueFromPointer;
 var ta = env.simpleReadValueFromPointer;
 var ua = env.RegisteredPointer_getPointee;
 var va = env.throwInternalError;
 var wa = env.get_first_emval;
 var xa = env.getLiveInheritedInstances;
 var ya = env.__ZSt18uncaught_exceptionv;
 var za = env.ClassHandle;
 var Aa = env.getShiftFromSize;
 var Ba = env._emscripten_set_main_loop_timing;
 var Ca = env._sbrk;
 var Da = env.___cxa_begin_catch;
 var Ea = env._emscripten_memcpy_big;
 var Fa = env.runDestructor;
 var Ga = env._sysconf;
 var Ha = env.throwInstanceAlreadyDeleted;
 var Ia = env.__embind_register_std_string;
 var Ja = env.init_RegisteredPointer;
 var Ka = env.ClassHandle_isAliasOf;
 var La = env.flushPendingDeletes;
 var Ma = env.makeClassHandle;
 var Na = env._write;
 var Oa = env.whenDependentTypesAreResolved;
 var Pa = env.__embind_register_class_constructor;
 var Qa = env.init_ClassHandle;
 var Ra = env.ClassHandle_clone;
 var Sa = env._send;
 var Ta = env.RegisteredClass;
 var Ua = env.___cxa_find_matching_catch;
 var Va = env.__embind_register_value_object_field;
 var Wa = env.embind_init_charCodes;
 var Xa = env.___setErrNo;
 var Ya = env.__embind_register_bool;
 var Za = env.___resumeException;
 var _a = env.createNamedFunction;
 var $a = env.__embind_register_class_property;
 var ab = env.__embind_register_emval;
 var bb = env.__embind_finalize_value_object;
 var cb = env.__emval_decref;
 var db = env._pthread_once;
 var eb = env.__embind_register_class;
 var fb = env.constNoSmartPtrRawPointerToWireType;
 var gb = env.heap32VectorToArray;
 var hb = env.ClassHandle_delete;
 var ib = env.getInheritedInstanceCount;
 var jb = env.RegisteredPointer_destructor;
 var kb = env._fwrite;
 var lb = env._time;
 var mb = env._fprintf;
 var nb = env.new_;
 var ob = env.downcastPointer;
 var pb = env.replacePublicSymbol;
 var qb = env.init_embind;
 var rb = env.ClassHandle_deleteLater;
 var sb = env.RegisteredPointer_deleteObject;
 var tb = env.ClassHandle_isDeleted;
 var ub = env._vfprintf;
 var vb = env.__embind_register_integer;
 var wb = env.___cxa_allocate_exception;
 var xb = env.__emval_take_value;
 var yb = env._pwrite;
 var zb = env._fabsf;
 var Ab = env.__embind_register_value_object;
 var Bb = env._embind_repr;
 var Cb = env._pthread_getspecific;
 var Db = env.__embind_register_class_function;
 var Eb = env.RegisteredPointer;
 var Fb = env.craftInvokerFunction;
 var Gb = env.runDestructors;
 var Hb = env.requireRegisteredType;
 var Ib = env.makeLegalFunctionName;
 var Jb = env._pthread_key_create;
 var Kb = env.upcastPointer;
 var Lb = env.init_emval;
 var Mb = env.shallowCopyInternalPointer;
 var Nb = env.nonConstNoSmartPtrRawPointerToWireType;
 var Ob = env._fputc;
 var Pb = env._abort;
 var Qb = env.throwBindingError;
 var Rb = env.getTypeName;
 var Sb = env.validateThis;
 var Tb = env.exposePublicSymbol;
 var Ub = env.RegisteredPointer_fromWireType;
 var Vb = env.__embind_register_memory_view;
 var Wb = env.getInheritedInstance;
 var Xb = env.setDelayFunction;
 var Yb = env.extendError;
 var Zb = env.ensureOverloadTable;
 var _b = env.__embind_register_void;
 var $b = env._fflush;
 var ac = env.__reallyNegative;
 var bc = env.__emval_register;
 var cc = env.__embind_register_std_wstring;
 var dc = env._fileno;
 var ec = env.__emval_incref;
 var fc = env.throwUnboundTypeError;
 var gc = env.readLatin1String;
 var hc = env.getBasestPointer;
 var ic = env._mkport;
 var jc = env.__embind_register_float;
 var kc = env.integerReadValueFromPointer;
 var lc = env.__embind_register_function;
 var mc = env._emscripten_set_main_loop;
 var nc = env.___errno_location;
 var oc = env._pthread_setspecific;
 var pc = env.genericPointerToWireType;
 var qc = env.registerType;
 var rc = env.___cxa_throw;
 var sc = env.count_emval_handles;
 var tc = env.requireFunction;
 var uc = env.__formatString;
 var vc = env._sqrt;
 var wc = 0.0;
 
// EMSCRIPTEN_START_FUNCS
function je(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
 b = i;
 do if (a >>> 0 < 245) {
  if (a >>> 0 < 11) a = 16; else a = a + 11 & -8;
  o = a >>> 3;
  n = c[932] | 0;
  p = n >>> o;
  if (p & 3) {
   f = (p & 1 ^ 1) + o | 0;
   e = f << 1;
   j = 3768 + (e << 2) | 0;
   e = 3768 + (e + 2 << 2) | 0;
   g = c[e >> 2] | 0;
   h = g + 8 | 0;
   d = c[h >> 2] | 0;
   do if ((j | 0) == (d | 0)) c[932] = n & ~(1 << f); else {
    if (d >>> 0 < (c[936] | 0) >>> 0) Pb();
    k = d + 12 | 0;
    if ((c[k >> 2] | 0) == (g | 0)) {
     c[k >> 2] = j;
     c[e >> 2] = d;
     break;
    } else Pb();
   } while (0);
   z = f << 3;
   c[g + 4 >> 2] = z | 3;
   z = g + (z | 4) | 0;
   c[z >> 2] = c[z >> 2] | 1;
   z = h;
   i = b;
   return z | 0;
  }
  if (a >>> 0 > (c[934] | 0) >>> 0) {
   if (p) {
    j = 2 << o;
    j = p << o & (j | 0 - j);
    j = (j & 0 - j) + -1 | 0;
    d = j >>> 12 & 16;
    j = j >>> d;
    h = j >>> 5 & 8;
    j = j >>> h;
    g = j >>> 2 & 4;
    j = j >>> g;
    f = j >>> 1 & 2;
    j = j >>> f;
    e = j >>> 1 & 1;
    e = (h | d | g | f | e) + (j >>> e) | 0;
    j = e << 1;
    f = 3768 + (j << 2) | 0;
    j = 3768 + (j + 2 << 2) | 0;
    g = c[j >> 2] | 0;
    d = g + 8 | 0;
    h = c[d >> 2] | 0;
    do if ((f | 0) == (h | 0)) c[932] = n & ~(1 << e); else {
     if (h >>> 0 < (c[936] | 0) >>> 0) Pb();
     k = h + 12 | 0;
     if ((c[k >> 2] | 0) == (g | 0)) {
      c[k >> 2] = f;
      c[j >> 2] = h;
      break;
     } else Pb();
    } while (0);
    h = e << 3;
    e = h - a | 0;
    c[g + 4 >> 2] = a | 3;
    f = g + a | 0;
    c[g + (a | 4) >> 2] = e | 1;
    c[g + h >> 2] = e;
    h = c[934] | 0;
    if (h) {
     g = c[937] | 0;
     k = h >>> 3;
     l = k << 1;
     h = 3768 + (l << 2) | 0;
     j = c[932] | 0;
     k = 1 << k;
     if (!(j & k)) {
      c[932] = j | k;
      u = 3768 + (l + 2 << 2) | 0;
      v = h;
     } else {
      j = 3768 + (l + 2 << 2) | 0;
      k = c[j >> 2] | 0;
      if (k >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
       u = j;
       v = k;
      }
     }
     c[u >> 2] = g;
     c[v + 12 >> 2] = g;
     c[g + 8 >> 2] = v;
     c[g + 12 >> 2] = h;
    }
    c[934] = e;
    c[937] = f;
    z = d;
    i = b;
    return z | 0;
   }
   n = c[933] | 0;
   if (n) {
    d = (n & 0 - n) + -1 | 0;
    y = d >>> 12 & 16;
    d = d >>> y;
    x = d >>> 5 & 8;
    d = d >>> x;
    z = d >>> 2 & 4;
    d = d >>> z;
    f = d >>> 1 & 2;
    d = d >>> f;
    e = d >>> 1 & 1;
    e = c[4032 + ((x | y | z | f | e) + (d >>> e) << 2) >> 2] | 0;
    d = (c[e + 4 >> 2] & -8) - a | 0;
    f = e;
    while (1) {
     g = c[f + 16 >> 2] | 0;
     if (!g) {
      g = c[f + 20 >> 2] | 0;
      if (!g) break;
     }
     f = (c[g + 4 >> 2] & -8) - a | 0;
     z = f >>> 0 < d >>> 0;
     d = z ? f : d;
     f = g;
     e = z ? g : e;
    }
    h = c[936] | 0;
    if (e >>> 0 < h >>> 0) Pb();
    f = e + a | 0;
    if (e >>> 0 >= f >>> 0) Pb();
    g = c[e + 24 >> 2] | 0;
    k = c[e + 12 >> 2] | 0;
    do if ((k | 0) == (e | 0)) {
     k = e + 20 | 0;
     j = c[k >> 2] | 0;
     if (!j) {
      k = e + 16 | 0;
      j = c[k >> 2] | 0;
      if (!j) {
       t = 0;
       break;
      }
     }
     while (1) {
      m = j + 20 | 0;
      l = c[m >> 2] | 0;
      if (l) {
       j = l;
       k = m;
       continue;
      }
      m = j + 16 | 0;
      l = c[m >> 2] | 0;
      if (!l) break; else {
       j = l;
       k = m;
      }
     }
     if (k >>> 0 < h >>> 0) Pb(); else {
      c[k >> 2] = 0;
      t = j;
      break;
     }
    } else {
     j = c[e + 8 >> 2] | 0;
     if (j >>> 0 < h >>> 0) Pb();
     l = j + 12 | 0;
     if ((c[l >> 2] | 0) != (e | 0)) Pb();
     h = k + 8 | 0;
     if ((c[h >> 2] | 0) == (e | 0)) {
      c[l >> 2] = k;
      c[h >> 2] = j;
      t = k;
      break;
     } else Pb();
    } while (0);
    do if (g) {
     j = c[e + 28 >> 2] | 0;
     h = 4032 + (j << 2) | 0;
     if ((e | 0) == (c[h >> 2] | 0)) {
      c[h >> 2] = t;
      if (!t) {
       c[933] = c[933] & ~(1 << j);
       break;
      }
     } else {
      if (g >>> 0 < (c[936] | 0) >>> 0) Pb();
      h = g + 16 | 0;
      if ((c[h >> 2] | 0) == (e | 0)) c[h >> 2] = t; else c[g + 20 >> 2] = t;
      if (!t) break;
     }
     if (t >>> 0 < (c[936] | 0) >>> 0) Pb();
     c[t + 24 >> 2] = g;
     g = c[e + 16 >> 2] | 0;
     do if (g) if (g >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
      c[t + 16 >> 2] = g;
      c[g + 24 >> 2] = t;
      break;
     } while (0);
     g = c[e + 20 >> 2] | 0;
     if (g) if (g >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
      c[t + 20 >> 2] = g;
      c[g + 24 >> 2] = t;
      break;
     }
    } while (0);
    if (d >>> 0 < 16) {
     z = d + a | 0;
     c[e + 4 >> 2] = z | 3;
     z = e + (z + 4) | 0;
     c[z >> 2] = c[z >> 2] | 1;
    } else {
     c[e + 4 >> 2] = a | 3;
     c[e + (a | 4) >> 2] = d | 1;
     c[e + (d + a) >> 2] = d;
     h = c[934] | 0;
     if (h) {
      g = c[937] | 0;
      k = h >>> 3;
      l = k << 1;
      h = 3768 + (l << 2) | 0;
      j = c[932] | 0;
      k = 1 << k;
      if (!(j & k)) {
       c[932] = j | k;
       s = 3768 + (l + 2 << 2) | 0;
       r = h;
      } else {
       k = 3768 + (l + 2 << 2) | 0;
       j = c[k >> 2] | 0;
       if (j >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
        s = k;
        r = j;
       }
      }
      c[s >> 2] = g;
      c[r + 12 >> 2] = g;
      c[g + 8 >> 2] = r;
      c[g + 12 >> 2] = h;
     }
     c[934] = d;
     c[937] = f;
    }
    z = e + 8 | 0;
    i = b;
    return z | 0;
   }
  }
 } else if (a >>> 0 > 4294967231) a = -1; else {
  r = a + 11 | 0;
  a = r & -8;
  t = c[933] | 0;
  if (t) {
   s = 0 - a | 0;
   r = r >>> 8;
   if (!r) u = 0; else if (a >>> 0 > 16777215) u = 31; else {
    y = (r + 1048320 | 0) >>> 16 & 8;
    z = r << y;
    x = (z + 520192 | 0) >>> 16 & 4;
    z = z << x;
    u = (z + 245760 | 0) >>> 16 & 2;
    u = 14 - (x | y | u) + (z << u >>> 15) | 0;
    u = a >>> (u + 7 | 0) & 1 | u << 1;
   }
   v = c[4032 + (u << 2) >> 2] | 0;
   a : do if (!v) {
    x = 0;
    r = 0;
   } else {
    if ((u | 0) == 31) r = 0; else r = 25 - (u >>> 1) | 0;
    x = 0;
    w = a << r;
    r = 0;
    while (1) {
     z = c[v + 4 >> 2] & -8;
     y = z - a | 0;
     if (y >>> 0 < s >>> 0) if ((z | 0) == (a | 0)) {
      s = y;
      x = v;
      r = v;
      break a;
     } else {
      s = y;
      r = v;
     }
     z = c[v + 20 >> 2] | 0;
     v = c[v + (w >>> 31 << 2) + 16 >> 2] | 0;
     x = (z | 0) == 0 | (z | 0) == (v | 0) ? x : z;
     if (!v) break; else w = w << 1;
    }
   } while (0);
   if ((x | 0) == 0 & (r | 0) == 0) {
    z = 2 << u;
    t = t & (z | 0 - z);
    if (!t) break;
    z = (t & 0 - t) + -1 | 0;
    v = z >>> 12 & 16;
    z = z >>> v;
    u = z >>> 5 & 8;
    z = z >>> u;
    w = z >>> 2 & 4;
    z = z >>> w;
    y = z >>> 1 & 2;
    z = z >>> y;
    x = z >>> 1 & 1;
    x = c[4032 + ((u | v | w | y | x) + (z >>> x) << 2) >> 2] | 0;
   }
   if (x) while (1) {
    z = (c[x + 4 >> 2] & -8) - a | 0;
    t = z >>> 0 < s >>> 0;
    s = t ? z : s;
    r = t ? x : r;
    t = c[x + 16 >> 2] | 0;
    if (t) {
     x = t;
     continue;
    }
    x = c[x + 20 >> 2] | 0;
    if (!x) break;
   }
   if (r) if (s >>> 0 < ((c[934] | 0) - a | 0) >>> 0) {
    f = c[936] | 0;
    if (r >>> 0 < f >>> 0) Pb();
    d = r + a | 0;
    if (r >>> 0 >= d >>> 0) Pb();
    e = c[r + 24 >> 2] | 0;
    g = c[r + 12 >> 2] | 0;
    do if ((g | 0) == (r | 0)) {
     h = r + 20 | 0;
     g = c[h >> 2] | 0;
     if (!g) {
      h = r + 16 | 0;
      g = c[h >> 2] | 0;
      if (!g) {
       q = 0;
       break;
      }
     }
     while (1) {
      k = g + 20 | 0;
      j = c[k >> 2] | 0;
      if (j) {
       g = j;
       h = k;
       continue;
      }
      k = g + 16 | 0;
      j = c[k >> 2] | 0;
      if (!j) break; else {
       g = j;
       h = k;
      }
     }
     if (h >>> 0 < f >>> 0) Pb(); else {
      c[h >> 2] = 0;
      q = g;
      break;
     }
    } else {
     h = c[r + 8 >> 2] | 0;
     if (h >>> 0 < f >>> 0) Pb();
     j = h + 12 | 0;
     if ((c[j >> 2] | 0) != (r | 0)) Pb();
     f = g + 8 | 0;
     if ((c[f >> 2] | 0) == (r | 0)) {
      c[j >> 2] = g;
      c[f >> 2] = h;
      q = g;
      break;
     } else Pb();
    } while (0);
    do if (e) {
     g = c[r + 28 >> 2] | 0;
     f = 4032 + (g << 2) | 0;
     if ((r | 0) == (c[f >> 2] | 0)) {
      c[f >> 2] = q;
      if (!q) {
       c[933] = c[933] & ~(1 << g);
       break;
      }
     } else {
      if (e >>> 0 < (c[936] | 0) >>> 0) Pb();
      f = e + 16 | 0;
      if ((c[f >> 2] | 0) == (r | 0)) c[f >> 2] = q; else c[e + 20 >> 2] = q;
      if (!q) break;
     }
     if (q >>> 0 < (c[936] | 0) >>> 0) Pb();
     c[q + 24 >> 2] = e;
     e = c[r + 16 >> 2] | 0;
     do if (e) if (e >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
      c[q + 16 >> 2] = e;
      c[e + 24 >> 2] = q;
      break;
     } while (0);
     e = c[r + 20 >> 2] | 0;
     if (e) if (e >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
      c[q + 20 >> 2] = e;
      c[e + 24 >> 2] = q;
      break;
     }
    } while (0);
    b : do if (s >>> 0 < 16) {
     z = s + a | 0;
     c[r + 4 >> 2] = z | 3;
     z = r + (z + 4) | 0;
     c[z >> 2] = c[z >> 2] | 1;
    } else {
     c[r + 4 >> 2] = a | 3;
     c[r + (a | 4) >> 2] = s | 1;
     c[r + (s + a) >> 2] = s;
     f = s >>> 3;
     if (s >>> 0 < 256) {
      g = f << 1;
      e = 3768 + (g << 2) | 0;
      h = c[932] | 0;
      f = 1 << f;
      do if (!(h & f)) {
       c[932] = h | f;
       p = 3768 + (g + 2 << 2) | 0;
       o = e;
      } else {
       g = 3768 + (g + 2 << 2) | 0;
       f = c[g >> 2] | 0;
       if (f >>> 0 >= (c[936] | 0) >>> 0) {
        p = g;
        o = f;
        break;
       }
       Pb();
      } while (0);
      c[p >> 2] = d;
      c[o + 12 >> 2] = d;
      c[r + (a + 8) >> 2] = o;
      c[r + (a + 12) >> 2] = e;
      break;
     }
     e = s >>> 8;
     if (!e) e = 0; else if (s >>> 0 > 16777215) e = 31; else {
      y = (e + 1048320 | 0) >>> 16 & 8;
      z = e << y;
      x = (z + 520192 | 0) >>> 16 & 4;
      z = z << x;
      e = (z + 245760 | 0) >>> 16 & 2;
      e = 14 - (x | y | e) + (z << e >>> 15) | 0;
      e = s >>> (e + 7 | 0) & 1 | e << 1;
     }
     f = 4032 + (e << 2) | 0;
     c[r + (a + 28) >> 2] = e;
     c[r + (a + 20) >> 2] = 0;
     c[r + (a + 16) >> 2] = 0;
     h = c[933] | 0;
     g = 1 << e;
     if (!(h & g)) {
      c[933] = h | g;
      c[f >> 2] = d;
      c[r + (a + 24) >> 2] = f;
      c[r + (a + 12) >> 2] = d;
      c[r + (a + 8) >> 2] = d;
      break;
     }
     f = c[f >> 2] | 0;
     if ((e | 0) == 31) e = 0; else e = 25 - (e >>> 1) | 0;
     c : do if ((c[f + 4 >> 2] & -8 | 0) == (s | 0)) n = f; else {
      e = s << e;
      while (1) {
       g = f + (e >>> 31 << 2) + 16 | 0;
       h = c[g >> 2] | 0;
       if (!h) break;
       if ((c[h + 4 >> 2] & -8 | 0) == (s | 0)) {
        n = h;
        break c;
       } else {
        e = e << 1;
        f = h;
       }
      }
      if (g >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
       c[g >> 2] = d;
       c[r + (a + 24) >> 2] = f;
       c[r + (a + 12) >> 2] = d;
       c[r + (a + 8) >> 2] = d;
       break b;
      }
     } while (0);
     e = n + 8 | 0;
     f = c[e >> 2] | 0;
     g = c[936] | 0;
     if (n >>> 0 < g >>> 0) Pb();
     if (f >>> 0 < g >>> 0) Pb(); else {
      c[f + 12 >> 2] = d;
      c[e >> 2] = d;
      c[r + (a + 8) >> 2] = f;
      c[r + (a + 12) >> 2] = n;
      c[r + (a + 24) >> 2] = 0;
      break;
     }
    } while (0);
    z = r + 8 | 0;
    i = b;
    return z | 0;
   }
  }
 } while (0);
 n = c[934] | 0;
 if (a >>> 0 <= n >>> 0) {
  e = n - a | 0;
  d = c[937] | 0;
  if (e >>> 0 > 15) {
   c[937] = d + a;
   c[934] = e;
   c[d + (a + 4) >> 2] = e | 1;
   c[d + n >> 2] = e;
   c[d + 4 >> 2] = a | 3;
  } else {
   c[934] = 0;
   c[937] = 0;
   c[d + 4 >> 2] = n | 3;
   z = d + (n + 4) | 0;
   c[z >> 2] = c[z >> 2] | 1;
  }
  z = d + 8 | 0;
  i = b;
  return z | 0;
 }
 n = c[935] | 0;
 if (a >>> 0 < n >>> 0) {
  y = n - a | 0;
  c[935] = y;
  z = c[938] | 0;
  c[938] = z + a;
  c[z + (a + 4) >> 2] = y | 1;
  c[z + 4 >> 2] = a | 3;
  z = z + 8 | 0;
  i = b;
  return z | 0;
 }
 do if (!(c[1050] | 0)) {
  n = Ga(30) | 0;
  if (!(n + -1 & n)) {
   c[1052] = n;
   c[1051] = n;
   c[1053] = -1;
   c[1054] = -1;
   c[1055] = 0;
   c[1043] = 0;
   c[1050] = (lb(0) | 0) & -16 ^ 1431655768;
   break;
  } else Pb();
 } while (0);
 q = a + 48 | 0;
 o = c[1052] | 0;
 r = a + 47 | 0;
 n = o + r | 0;
 o = 0 - o | 0;
 p = n & o;
 if (p >>> 0 <= a >>> 0) {
  z = 0;
  i = b;
  return z | 0;
 }
 s = c[1042] | 0;
 if (s) {
  y = c[1040] | 0;
  z = y + p | 0;
  if (z >>> 0 <= y >>> 0 | z >>> 0 > s >>> 0) {
   z = 0;
   i = b;
   return z | 0;
  }
 }
 d : do if (!(c[1043] & 4)) {
  t = c[938] | 0;
  e : do if (!t) m = 182; else {
   u = 4176 | 0;
   while (1) {
    v = c[u >> 2] | 0;
    if (v >>> 0 <= t >>> 0) {
     s = u + 4 | 0;
     if ((v + (c[s >> 2] | 0) | 0) >>> 0 > t >>> 0) break;
    }
    u = c[u + 8 >> 2] | 0;
    if (!u) {
     m = 182;
     break e;
    }
   }
   if (!u) m = 182; else {
    o = n - (c[935] | 0) & o;
    if (o >>> 0 < 2147483647) {
     n = Ca(o | 0) | 0;
     m = (n | 0) == ((c[u >> 2] | 0) + (c[s >> 2] | 0) | 0);
     s = n;
     t = o;
     n = m ? n : -1;
     o = m ? o : 0;
     m = 191;
    } else o = 0;
   }
  } while (0);
  do if ((m | 0) == 182) {
   n = Ca(0) | 0;
   if ((n | 0) == (-1 | 0)) o = 0; else {
    s = n;
    t = c[1051] | 0;
    o = t + -1 | 0;
    if (!(o & s)) o = p; else o = p - s + (o + s & 0 - t) | 0;
    t = c[1040] | 0;
    u = t + o | 0;
    if (o >>> 0 > a >>> 0 & o >>> 0 < 2147483647) {
     s = c[1042] | 0;
     if (s) if (u >>> 0 <= t >>> 0 | u >>> 0 > s >>> 0) {
      o = 0;
      break;
     }
     s = Ca(o | 0) | 0;
     m = (s | 0) == (n | 0);
     t = o;
     n = m ? n : -1;
     o = m ? o : 0;
     m = 191;
    } else o = 0;
   }
  } while (0);
  f : do if ((m | 0) == 191) {
   m = 0 - t | 0;
   if ((n | 0) != (-1 | 0)) {
    m = 202;
    break d;
   }
   do if ((s | 0) != (-1 | 0) & t >>> 0 < 2147483647 & t >>> 0 < q >>> 0) {
    n = c[1052] | 0;
    n = r - t + n & 0 - n;
    if (n >>> 0 < 2147483647) if ((Ca(n | 0) | 0) == (-1 | 0)) {
     Ca(m | 0) | 0;
     break f;
    } else {
     t = n + t | 0;
     break;
    }
   } while (0);
   if ((s | 0) != (-1 | 0)) {
    n = s;
    o = t;
    m = 202;
    break d;
   }
  } while (0);
  c[1043] = c[1043] | 4;
  m = 199;
 } else {
  o = 0;
  m = 199;
 } while (0);
 if ((m | 0) == 199) if (p >>> 0 < 2147483647) {
  n = Ca(p | 0) | 0;
  p = Ca(0) | 0;
  if ((p | 0) != (-1 | 0) & (n | 0) != (-1 | 0) & n >>> 0 < p >>> 0) {
   p = p - n | 0;
   q = p >>> 0 > (a + 40 | 0) >>> 0;
   if (q) {
    o = q ? p : o;
    m = 202;
   }
  }
 }
 if ((m | 0) == 202) {
  p = (c[1040] | 0) + o | 0;
  c[1040] = p;
  if (p >>> 0 > (c[1041] | 0) >>> 0) c[1041] = p;
  p = c[938] | 0;
  g : do if (!p) {
   z = c[936] | 0;
   if ((z | 0) == 0 | n >>> 0 < z >>> 0) c[936] = n;
   c[1044] = n;
   c[1045] = o;
   c[1047] = 0;
   c[941] = c[1050];
   c[940] = -1;
   d = 0;
   do {
    z = d << 1;
    y = 3768 + (z << 2) | 0;
    c[3768 + (z + 3 << 2) >> 2] = y;
    c[3768 + (z + 2 << 2) >> 2] = y;
    d = d + 1 | 0;
   } while ((d | 0) != 32);
   d = n + 8 | 0;
   if (!(d & 7)) d = 0; else d = 0 - d & 7;
   z = o + -40 - d | 0;
   c[938] = n + d;
   c[935] = z;
   c[n + (d + 4) >> 2] = z | 1;
   c[n + (o + -36) >> 2] = 40;
   c[939] = c[1054];
  } else {
   t = 4176 | 0;
   do {
    q = c[t >> 2] | 0;
    r = t + 4 | 0;
    s = c[r >> 2] | 0;
    if ((n | 0) == (q + s | 0)) {
     m = 214;
     break;
    }
    t = c[t + 8 >> 2] | 0;
   } while ((t | 0) != 0);
   if ((m | 0) == 214) if (!(c[t + 12 >> 2] & 8)) if (p >>> 0 >= q >>> 0 & p >>> 0 < n >>> 0) {
    c[r >> 2] = s + o;
    d = (c[935] | 0) + o | 0;
    e = p + 8 | 0;
    if (!(e & 7)) e = 0; else e = 0 - e & 7;
    z = d - e | 0;
    c[938] = p + e;
    c[935] = z;
    c[p + (e + 4) >> 2] = z | 1;
    c[p + (d + 4) >> 2] = 40;
    c[939] = c[1054];
    break;
   }
   if (n >>> 0 < (c[936] | 0) >>> 0) c[936] = n;
   q = n + o | 0;
   r = 4176 | 0;
   do {
    if ((c[r >> 2] | 0) == (q | 0)) {
     m = 224;
     break;
    }
    r = c[r + 8 >> 2] | 0;
   } while ((r | 0) != 0);
   if ((m | 0) == 224) if (!(c[r + 12 >> 2] & 8)) {
    c[r >> 2] = n;
    h = r + 4 | 0;
    c[h >> 2] = (c[h >> 2] | 0) + o;
    h = n + 8 | 0;
    if (!(h & 7)) h = 0; else h = 0 - h & 7;
    j = n + (o + 8) | 0;
    if (!(j & 7)) p = 0; else p = 0 - j & 7;
    q = n + (p + o) | 0;
    j = h + a | 0;
    k = n + j | 0;
    m = q - (n + h) - a | 0;
    c[n + (h + 4) >> 2] = a | 3;
    h : do if ((q | 0) == (c[938] | 0)) {
     z = (c[935] | 0) + m | 0;
     c[935] = z;
     c[938] = k;
     c[n + (j + 4) >> 2] = z | 1;
    } else {
     if ((q | 0) == (c[937] | 0)) {
      z = (c[934] | 0) + m | 0;
      c[934] = z;
      c[937] = k;
      c[n + (j + 4) >> 2] = z | 1;
      c[n + (z + j) >> 2] = z;
      break;
     }
     r = o + 4 | 0;
     t = c[n + (r + p) >> 2] | 0;
     if ((t & 3 | 0) == 1) {
      a = t & -8;
      s = t >>> 3;
      i : do if (t >>> 0 < 256) {
       g = c[n + ((p | 8) + o) >> 2] | 0;
       r = c[n + (o + 12 + p) >> 2] | 0;
       t = 3768 + (s << 1 << 2) | 0;
       do if ((g | 0) != (t | 0)) {
        if (g >>> 0 < (c[936] | 0) >>> 0) Pb();
        if ((c[g + 12 >> 2] | 0) == (q | 0)) break;
        Pb();
       } while (0);
       if ((r | 0) == (g | 0)) {
        c[932] = c[932] & ~(1 << s);
        break;
       }
       do if ((r | 0) == (t | 0)) l = r + 8 | 0; else {
        if (r >>> 0 < (c[936] | 0) >>> 0) Pb();
        s = r + 8 | 0;
        if ((c[s >> 2] | 0) == (q | 0)) {
         l = s;
         break;
        }
        Pb();
       } while (0);
       c[g + 12 >> 2] = r;
       c[l >> 2] = g;
      } else {
       l = c[n + ((p | 24) + o) >> 2] | 0;
       u = c[n + (o + 12 + p) >> 2] | 0;
       do if ((u | 0) == (q | 0)) {
        u = p | 16;
        t = n + (r + u) | 0;
        s = c[t >> 2] | 0;
        if (!s) {
         t = n + (u + o) | 0;
         s = c[t >> 2] | 0;
         if (!s) {
          g = 0;
          break;
         }
        }
        while (1) {
         v = s + 20 | 0;
         u = c[v >> 2] | 0;
         if (u) {
          s = u;
          t = v;
          continue;
         }
         v = s + 16 | 0;
         u = c[v >> 2] | 0;
         if (!u) break; else {
          s = u;
          t = v;
         }
        }
        if (t >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
         c[t >> 2] = 0;
         g = s;
         break;
        }
       } else {
        s = c[n + ((p | 8) + o) >> 2] | 0;
        if (s >>> 0 < (c[936] | 0) >>> 0) Pb();
        t = s + 12 | 0;
        if ((c[t >> 2] | 0) != (q | 0)) Pb();
        v = u + 8 | 0;
        if ((c[v >> 2] | 0) == (q | 0)) {
         c[t >> 2] = u;
         c[v >> 2] = s;
         g = u;
         break;
        } else Pb();
       } while (0);
       if (!l) break;
       s = c[n + (o + 28 + p) >> 2] | 0;
       t = 4032 + (s << 2) | 0;
       do if ((q | 0) == (c[t >> 2] | 0)) {
        c[t >> 2] = g;
        if (g) break;
        c[933] = c[933] & ~(1 << s);
        break i;
       } else {
        if (l >>> 0 < (c[936] | 0) >>> 0) Pb();
        s = l + 16 | 0;
        if ((c[s >> 2] | 0) == (q | 0)) c[s >> 2] = g; else c[l + 20 >> 2] = g;
        if (!g) break i;
       } while (0);
       if (g >>> 0 < (c[936] | 0) >>> 0) Pb();
       c[g + 24 >> 2] = l;
       q = p | 16;
       l = c[n + (q + o) >> 2] | 0;
       do if (l) if (l >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
        c[g + 16 >> 2] = l;
        c[l + 24 >> 2] = g;
        break;
       } while (0);
       l = c[n + (r + q) >> 2] | 0;
       if (!l) break;
       if (l >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
        c[g + 20 >> 2] = l;
        c[l + 24 >> 2] = g;
        break;
       }
      } while (0);
      q = n + ((a | p) + o) | 0;
      m = a + m | 0;
     }
     g = q + 4 | 0;
     c[g >> 2] = c[g >> 2] & -2;
     c[n + (j + 4) >> 2] = m | 1;
     c[n + (m + j) >> 2] = m;
     g = m >>> 3;
     if (m >>> 0 < 256) {
      a = g << 1;
      d = 3768 + (a << 2) | 0;
      l = c[932] | 0;
      g = 1 << g;
      do if (!(l & g)) {
       c[932] = l | g;
       e = 3768 + (a + 2 << 2) | 0;
       f = d;
      } else {
       l = 3768 + (a + 2 << 2) | 0;
       g = c[l >> 2] | 0;
       if (g >>> 0 >= (c[936] | 0) >>> 0) {
        e = l;
        f = g;
        break;
       }
       Pb();
      } while (0);
      c[e >> 2] = k;
      c[f + 12 >> 2] = k;
      c[n + (j + 8) >> 2] = f;
      c[n + (j + 12) >> 2] = d;
      break;
     }
     e = m >>> 8;
     do if (!e) e = 0; else {
      if (m >>> 0 > 16777215) {
       e = 31;
       break;
      }
      y = (e + 1048320 | 0) >>> 16 & 8;
      z = e << y;
      x = (z + 520192 | 0) >>> 16 & 4;
      z = z << x;
      e = (z + 245760 | 0) >>> 16 & 2;
      e = 14 - (x | y | e) + (z << e >>> 15) | 0;
      e = m >>> (e + 7 | 0) & 1 | e << 1;
     } while (0);
     l = 4032 + (e << 2) | 0;
     c[n + (j + 28) >> 2] = e;
     c[n + (j + 20) >> 2] = 0;
     c[n + (j + 16) >> 2] = 0;
     f = c[933] | 0;
     g = 1 << e;
     if (!(f & g)) {
      c[933] = f | g;
      c[l >> 2] = k;
      c[n + (j + 24) >> 2] = l;
      c[n + (j + 12) >> 2] = k;
      c[n + (j + 8) >> 2] = k;
      break;
     }
     l = c[l >> 2] | 0;
     if ((e | 0) == 31) e = 0; else e = 25 - (e >>> 1) | 0;
     j : do if ((c[l + 4 >> 2] & -8 | 0) == (m | 0)) d = l; else {
      e = m << e;
      while (1) {
       g = l + (e >>> 31 << 2) + 16 | 0;
       f = c[g >> 2] | 0;
       if (!f) break;
       if ((c[f + 4 >> 2] & -8 | 0) == (m | 0)) {
        d = f;
        break j;
       } else {
        e = e << 1;
        l = f;
       }
      }
      if (g >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
       c[g >> 2] = k;
       c[n + (j + 24) >> 2] = l;
       c[n + (j + 12) >> 2] = k;
       c[n + (j + 8) >> 2] = k;
       break h;
      }
     } while (0);
     f = d + 8 | 0;
     e = c[f >> 2] | 0;
     g = c[936] | 0;
     if (d >>> 0 < g >>> 0) Pb();
     if (e >>> 0 < g >>> 0) Pb(); else {
      c[e + 12 >> 2] = k;
      c[f >> 2] = k;
      c[n + (j + 8) >> 2] = e;
      c[n + (j + 12) >> 2] = d;
      c[n + (j + 24) >> 2] = 0;
      break;
     }
    } while (0);
    z = n + (h | 8) | 0;
    i = b;
    return z | 0;
   }
   g = 4176 | 0;
   while (1) {
    e = c[g >> 2] | 0;
    if (e >>> 0 <= p >>> 0) {
     f = c[g + 4 >> 2] | 0;
     d = e + f | 0;
     if (d >>> 0 > p >>> 0) break;
    }
    g = c[g + 8 >> 2] | 0;
   }
   g = e + (f + -39) | 0;
   if (!(g & 7)) g = 0; else g = 0 - g & 7;
   e = e + (f + -47 + g) | 0;
   e = e >>> 0 < (p + 16 | 0) >>> 0 ? p : e;
   f = e + 8 | 0;
   g = n + 8 | 0;
   if (!(g & 7)) g = 0; else g = 0 - g & 7;
   z = o + -40 - g | 0;
   c[938] = n + g;
   c[935] = z;
   c[n + (g + 4) >> 2] = z | 1;
   c[n + (o + -36) >> 2] = 40;
   c[939] = c[1054];
   c[e + 4 >> 2] = 27;
   c[f + 0 >> 2] = c[1044];
   c[f + 4 >> 2] = c[1045];
   c[f + 8 >> 2] = c[1046];
   c[f + 12 >> 2] = c[1047];
   c[1044] = n;
   c[1045] = o;
   c[1047] = 0;
   c[1046] = f;
   f = e + 28 | 0;
   c[f >> 2] = 7;
   if ((e + 32 | 0) >>> 0 < d >>> 0) do {
    z = f;
    f = f + 4 | 0;
    c[f >> 2] = 7;
   } while ((z + 8 | 0) >>> 0 < d >>> 0);
   if ((e | 0) != (p | 0)) {
    d = e - p | 0;
    e = p + (d + 4) | 0;
    c[e >> 2] = c[e >> 2] & -2;
    c[p + 4 >> 2] = d | 1;
    c[p + d >> 2] = d;
    e = d >>> 3;
    if (d >>> 0 < 256) {
     g = e << 1;
     d = 3768 + (g << 2) | 0;
     f = c[932] | 0;
     e = 1 << e;
     do if (!(f & e)) {
      c[932] = f | e;
      j = 3768 + (g + 2 << 2) | 0;
      k = d;
     } else {
      e = 3768 + (g + 2 << 2) | 0;
      f = c[e >> 2] | 0;
      if (f >>> 0 >= (c[936] | 0) >>> 0) {
       j = e;
       k = f;
       break;
      }
      Pb();
     } while (0);
     c[j >> 2] = p;
     c[k + 12 >> 2] = p;
     c[p + 8 >> 2] = k;
     c[p + 12 >> 2] = d;
     break;
    }
    e = d >>> 8;
    if (!e) e = 0; else if (d >>> 0 > 16777215) e = 31; else {
     y = (e + 1048320 | 0) >>> 16 & 8;
     z = e << y;
     x = (z + 520192 | 0) >>> 16 & 4;
     z = z << x;
     e = (z + 245760 | 0) >>> 16 & 2;
     e = 14 - (x | y | e) + (z << e >>> 15) | 0;
     e = d >>> (e + 7 | 0) & 1 | e << 1;
    }
    f = 4032 + (e << 2) | 0;
    c[p + 28 >> 2] = e;
    c[p + 20 >> 2] = 0;
    c[p + 16 >> 2] = 0;
    g = c[933] | 0;
    j = 1 << e;
    if (!(g & j)) {
     c[933] = g | j;
     c[f >> 2] = p;
     c[p + 24 >> 2] = f;
     c[p + 12 >> 2] = p;
     c[p + 8 >> 2] = p;
     break;
    }
    f = c[f >> 2] | 0;
    if ((e | 0) == 31) e = 0; else e = 25 - (e >>> 1) | 0;
    k : do if ((c[f + 4 >> 2] & -8 | 0) == (d | 0)) h = f; else {
     e = d << e;
     while (1) {
      g = f + (e >>> 31 << 2) + 16 | 0;
      j = c[g >> 2] | 0;
      if (!j) break;
      if ((c[j + 4 >> 2] & -8 | 0) == (d | 0)) {
       h = j;
       break k;
      } else {
       e = e << 1;
       f = j;
      }
     }
     if (g >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
      c[g >> 2] = p;
      c[p + 24 >> 2] = f;
      c[p + 12 >> 2] = p;
      c[p + 8 >> 2] = p;
      break g;
     }
    } while (0);
    e = h + 8 | 0;
    f = c[e >> 2] | 0;
    d = c[936] | 0;
    if (h >>> 0 < d >>> 0) Pb();
    if (f >>> 0 < d >>> 0) Pb(); else {
     c[f + 12 >> 2] = p;
     c[e >> 2] = p;
     c[p + 8 >> 2] = f;
     c[p + 12 >> 2] = h;
     c[p + 24 >> 2] = 0;
     break;
    }
   }
  } while (0);
  d = c[935] | 0;
  if (d >>> 0 > a >>> 0) {
   y = d - a | 0;
   c[935] = y;
   z = c[938] | 0;
   c[938] = z + a;
   c[z + (a + 4) >> 2] = y | 1;
   c[z + 4 >> 2] = a | 3;
   z = z + 8 | 0;
   i = b;
   return z | 0;
  }
 }
 c[(nc() | 0) >> 2] = 12;
 z = 0;
 i = b;
 return z | 0;
}
function _c(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, j = 0, k = 0, l = 0, n = 0, o = 0, p = 0.0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0.0, C = 0.0, D = 0.0, E = 0.0, F = 0.0, G = 0.0, H = 0.0, I = 0.0, J = 0, K = 0, L = 0;
 l = i;
 k = c[b + 8 >> 2] | 0;
 n = d << 2;
 j = je(n) | 0;
 o = je(_(n, e) | 0) | 0;
 c[j >> 2] = o;
 if ((d | 0) > 1) {
  q = 1;
  do {
   o = o + (e << 2) | 0;
   c[j + (q << 2) >> 2] = o;
   q = q + 1 | 0;
  } while ((q | 0) != (d | 0));
 }
 n = je(n) | 0;
 if ((d | 0) < (e | 0)) {
  kb(8, 23, 1, c[m >> 2] | 0) | 0;
  A = 0;
  c[a + 0 >> 2] = c[b + 0 >> 2];
  c[a + 4 >> 2] = c[b + 4 >> 2];
  c[a + 8 >> 2] = c[b + 8 >> 2];
  J = a + 12 | 0;
  c[J >> 2] = d;
  J = a + 16 | 0;
  c[J >> 2] = e;
  J = a + 20 | 0;
  c[J >> 2] = j;
  J = a + 24 | 0;
  c[J >> 2] = d;
  J = a + 28 | 0;
  c[J >> 2] = n;
  J = a + 32 | 0;
  c[J >> 2] = A;
  i = l;
  return;
 }
 o = je(e << 3) | 0;
 if ((e | 0) > 0) {
  q = e + -1 | 0;
  s = d + -1 | 0;
  p = 0.0;
  D = 0.0;
  r = 0;
  B = 0.0;
  do {
   u = r;
   r = r + 1 | 0;
   C = D * B;
   t = o + (u << 3) | 0;
   h[t >> 3] = C;
   if ((u | 0) < (d | 0)) {
    v = u;
    B = 0.0;
    do {
     B = B + +N(+(+g[(c[k + (v << 2) >> 2] | 0) + (u << 2) >> 2]));
     v = v + 1 | 0;
    } while ((v | 0) != (d | 0));
    if (B != 0.0) {
     v = u;
     E = 0.0;
     do {
      J = (c[k + (v << 2) >> 2] | 0) + (u << 2) | 0;
      I = +g[J >> 2] / B;
      g[J >> 2] = I;
      E = E + I * I;
      v = v + 1 | 0;
     } while ((v | 0) != (d | 0));
     v = (c[k + (u << 2) >> 2] | 0) + (u << 2) | 0;
     I = +g[v >> 2];
     F = I;
     G = +N(+(+O(+E)));
     if (!(I >= 0.0)) G = -G;
     D = -G;
     E = F * D - E;
     g[v >> 2] = F + G;
     if ((u | 0) != (q | 0) & (r | 0) < (e | 0)) {
      v = r;
      do {
       w = u;
       F = 0.0;
       do {
        J = c[k + (w << 2) >> 2] | 0;
        F = F + +g[J + (u << 2) >> 2] * +g[J + (v << 2) >> 2];
        w = w + 1 | 0;
       } while ((w | 0) != (d | 0));
       F = F / E;
       w = u;
       do {
        A = c[k + (w << 2) >> 2] | 0;
        J = A + (v << 2) | 0;
        g[J >> 2] = +g[J >> 2] + F * +g[A + (u << 2) >> 2];
        w = w + 1 | 0;
       } while ((w | 0) != (d | 0));
       v = v + 1 | 0;
      } while ((v | 0) != (e | 0));
      v = u;
     } else v = u;
     do {
      J = (c[k + (v << 2) >> 2] | 0) + (u << 2) | 0;
      g[J >> 2] = B * +g[J >> 2];
      v = v + 1 | 0;
     } while ((v | 0) != (d | 0));
    } else D = 0.0;
    D = B * D;
    v = n + (u << 2) | 0;
    g[v >> 2] = D;
    if ((u | 0) != (q | 0) & (r | 0) < (e | 0)) {
     w = c[k + (u << 2) >> 2] | 0;
     x = r;
     B = 0.0;
     do {
      B = B + +N(+(+g[w + (x << 2) >> 2]));
      x = x + 1 | 0;
     } while ((x | 0) != (e | 0));
     if (B != 0.0) {
      x = r;
      C = 0.0;
      do {
       J = w + (x << 2) | 0;
       I = +g[J >> 2] / B;
       g[J >> 2] = I;
       C = C + I * I;
       x = x + 1 | 0;
      } while ((x | 0) != (e | 0));
      x = w + (r << 2) | 0;
      I = +g[x >> 2];
      E = I;
      F = +N(+(+O(+C)));
      if (!(I >= 0.0)) F = -F;
      D = -F;
      C = E * D - C;
      E = E + F;
      g[x >> 2] = E;
      x = r;
      while (1) {
       h[o + (x << 3) >> 3] = E / C;
       x = x + 1 | 0;
       if ((x | 0) == (e | 0)) break;
       E = +g[w + (x << 2) >> 2];
      }
      if ((u | 0) != (s | 0) & (r | 0) < (d | 0)) {
       u = r;
       do {
        x = c[k + (u << 2) >> 2] | 0;
        y = r;
        C = 0.0;
        do {
         C = C + +g[x + (y << 2) >> 2] * +g[w + (y << 2) >> 2];
         y = y + 1 | 0;
        } while ((y | 0) != (e | 0));
        y = r;
        do {
         J = x + (y << 2) | 0;
         g[J >> 2] = +g[J >> 2] + C * +h[o + (y << 3) >> 3];
         y = y + 1 | 0;
        } while ((y | 0) != (e | 0));
        u = u + 1 | 0;
       } while ((u | 0) != (d | 0));
       u = r;
      } else u = r;
      do {
       J = w + (u << 2) | 0;
       g[J >> 2] = B * +g[J >> 2];
       u = u + 1 | 0;
      } while ((u | 0) != (e | 0));
      E = +g[v >> 2];
      C = +h[t >> 3];
     } else {
      E = D;
      D = 0.0;
     }
    } else {
     E = D;
     D = 0.0;
     B = 0.0;
    }
   } else {
    g[n + (u << 2) >> 2] = 0.0;
    E = 0.0;
    D = 0.0;
    B = 0.0;
   }
   I = +N(+E) + +N(+C);
   p = p > I ? p : I;
  } while ((r | 0) != (e | 0));
  r = q;
  s = e;
  while (1) {
   if ((r | 0) < (q | 0)) {
    if (D != 0.0 & (s | 0) < (e | 0)) {
     t = c[k + (r << 2) >> 2] | 0;
     v = t + (s << 2) | 0;
     u = s;
     do {
      g[(c[j + (u << 2) >> 2] | 0) + (r << 2) >> 2] = +g[t + (u << 2) >> 2] / +g[v >> 2] / D;
      u = u + 1 | 0;
     } while ((u | 0) != (e | 0));
     u = s;
     do {
      v = s;
      B = 0.0;
      do {
       B = B + +g[t + (v << 2) >> 2] * +g[(c[j + (v << 2) >> 2] | 0) + (u << 2) >> 2];
       v = v + 1 | 0;
      } while ((v | 0) != (e | 0));
      v = s;
      do {
       A = c[j + (v << 2) >> 2] | 0;
       J = A + (u << 2) | 0;
       g[J >> 2] = +g[J >> 2] + B * +g[A + (r << 2) >> 2];
       v = v + 1 | 0;
      } while ((v | 0) != (e | 0));
      u = u + 1 | 0;
     } while ((u | 0) != (e | 0));
    }
    if ((s | 0) < (e | 0)) {
     t = c[j + (r << 2) >> 2] | 0;
     do {
      g[(c[j + (s << 2) >> 2] | 0) + (r << 2) >> 2] = 0.0;
      g[t + (s << 2) >> 2] = 0.0;
      s = s + 1 | 0;
     } while ((s | 0) != (e | 0));
    }
   }
   g[(c[j + (r << 2) >> 2] | 0) + (r << 2) >> 2] = 1.0;
   if ((r | 0) > 0) {
    s = r;
    D = +h[o + (r << 3) >> 3];
    r = r + -1 | 0;
   } else {
    s = q;
    r = 0;
    break;
   }
  }
  while (1) {
   v = s + 1 | 0;
   B = +g[n + (s << 2) >> 2];
   t = (v | 0) < (e | 0);
   if ((s | 0) < (q | 0) & t) me((c[k + (s << 2) >> 2] | 0) + (e - r << 2) | 0, 0, r << 2 | 0) | 0;
   if (B != 0.0) {
    B = 1.0 / B;
    a : do if ((s | 0) != (q | 0) & t) {
     t = (c[k + (s << 2) >> 2] | 0) + (s << 2) | 0;
     u = (s | 0) < (d | 0);
     if ((v | 0) < (d | 0)) w = v; else while (1) {
      C = B * (0.0 / +g[t >> 2]);
      if (u) {
       w = s;
       do {
        A = c[k + (w << 2) >> 2] | 0;
        J = A + (v << 2) | 0;
        g[J >> 2] = +g[J >> 2] + C * +g[A + (s << 2) >> 2];
        w = w + 1 | 0;
       } while ((w | 0) != (d | 0));
      }
      v = v + 1 | 0;
      if ((v | 0) == (e | 0)) break a;
     }
     do {
      x = v;
      C = 0.0;
      do {
       J = c[k + (x << 2) >> 2] | 0;
       C = C + +g[J + (s << 2) >> 2] * +g[J + (w << 2) >> 2];
       x = x + 1 | 0;
      } while ((x | 0) != (d | 0));
      C = B * (C / +g[t >> 2]);
      if (u) {
       x = s;
       do {
        A = c[k + (x << 2) >> 2] | 0;
        J = A + (w << 2) | 0;
        g[J >> 2] = +g[J >> 2] + C * +g[A + (s << 2) >> 2];
        x = x + 1 | 0;
       } while ((x | 0) != (d | 0));
      }
      w = w + 1 | 0;
     } while ((w | 0) != (e | 0));
    } while (0);
    if ((s | 0) < (d | 0)) {
     t = s;
     do {
      J = (c[k + (t << 2) >> 2] | 0) + (s << 2) | 0;
      g[J >> 2] = B * +g[J >> 2];
      t = t + 1 | 0;
     } while ((t | 0) != (d | 0));
    }
   } else if ((s | 0) < (d | 0)) {
    t = s;
    do {
     g[(c[k + (t << 2) >> 2] | 0) + (s << 2) >> 2] = 0.0;
     t = t + 1 | 0;
    } while ((t | 0) != (d | 0));
   }
   J = (c[k + (s << 2) >> 2] | 0) + (s << 2) | 0;
   g[J >> 2] = +g[J >> 2] + 1.0;
   r = r + 1 | 0;
   if ((r | 0) == (e | 0)) break; else s = s + -1 | 0;
  }
  r = (d | 0) > 0;
  z = 0;
  do {
   w = n + (q << 2) | 0;
   s = q;
   q = q + -1 | 0;
   v = n + (q << 2) | 0;
   u = o + (q << 3) | 0;
   x = o + (s << 3) | 0;
   t = 0;
   while (1) {
    y = s;
    while (1) {
     if ((y | 0) <= -1) {
      f = 75;
      break;
     }
     z = y + -1 | 0;
     if (p + +N(+(+h[o + (y << 3) >> 3])) == p) break;
     if (p + +N(+(+g[n + (z << 2) >> 2])) == p) {
      f = 75;
      break;
     } else y = z;
    }
    b : do if ((f | 0) == 75) {
     f = 0;
     if ((y | 0) <= (s | 0)) {
      if (r) {
       A = y;
       D = 1.0;
      } else {
       A = y;
       D = 1.0;
       while (1) {
        B = D * +h[o + (A << 3) >> 3];
        C = +N(+B);
        if (p + C != p) {
         J = n + (A << 2) | 0;
         E = +g[J >> 2];
         D = +N(+E);
         if (C > D) {
          I = D / C;
          C = C * +O(+(I * I + 1.0));
         } else if (E != E | 0.0 != 0.0 | E == 0.0) C = 0.0; else {
          C = C / D;
          C = D * +O(+(C * C + 1.0));
         }
         g[J >> 2] = C;
         D = -(B * (1.0 / C));
        }
        if ((A | 0) >= (s | 0)) break b;
        A = A + 1 | 0;
       }
      }
      while (1) {
       B = D * +h[o + (A << 3) >> 3];
       C = +N(+B);
       if (p + C != p) {
        J = n + (A << 2) | 0;
        F = +g[J >> 2];
        D = F;
        E = +N(+F);
        if (C > E) {
         I = E / C;
         C = C * +O(+(I * I + 1.0));
        } else if (F != F | 0.0 != 0.0 | F == 0.0) C = 0.0; else {
         C = C / E;
         C = E * +O(+(C * C + 1.0));
        }
        g[J >> 2] = C;
        I = 1.0 / C;
        C = D * I;
        B = -(B * I);
        J = 0;
        do {
         K = c[k + (J << 2) >> 2] | 0;
         L = K + (z << 2) | 0;
         I = +g[L >> 2];
         K = K + (A << 2) | 0;
         H = +g[K >> 2];
         g[L >> 2] = C * I + H * B;
         g[K >> 2] = C * H - I * B;
         J = J + 1 | 0;
        } while ((J | 0) != (d | 0));
       } else B = D;
       if ((A | 0) >= (s | 0)) break b;
       A = A + 1 | 0;
       D = B;
      }
     }
    } while (0);
    B = +g[w >> 2];
    C = B;
    if ((y | 0) == (s | 0)) {
     f = 95;
     break;
    }
    B = +g[n + (y << 2) >> 2];
    E = +g[v >> 2];
    D = +h[u >> 3];
    F = +h[x >> 3];
    D = ((E - C) * (C + E) + (D - F) * (D + F)) / (E * F * 2.0);
    G = +N(+D);
    if (G > 1.0) {
     I = 1.0 / G;
     G = G * +O(+(I * I + 1.0));
    } else G = +O(+(G * G + 1.0));
    G = +N(+G);
    if (!(D >= 0.0)) G = -G;
    F = ((B - C) * (C + B) + F * (E / (D + G) - F)) / B;
    if ((y | 0) <= (q | 0)) {
     C = 1.0;
     z = y;
     E = 1.0;
     D = B;
     while (1) {
      A = z;
      z = z + 1 | 0;
      G = +h[o + (z << 3) >> 3];
      B = +g[n + (z << 2) >> 2];
      E = E * G;
      G = C * G;
      H = +N(+F);
      C = +N(+E);
      if (H > C) {
       I = C / H;
       H = H * +O(+(I * I + 1.0));
      } else if (E != E | 0.0 != 0.0 | E == 0.0) H = 0.0; else {
       H = H / C;
       H = C * +O(+(H * H + 1.0));
      }
      h[o + (A << 3) >> 3] = H;
      C = F / H;
      E = E / H;
      F = D * C + G * E;
      D = G * C - D * E;
      G = B * E;
      B = B * C;
      J = 0;
      do {
       L = c[j + (J << 2) >> 2] | 0;
       K = L + (A << 2) | 0;
       I = +g[K >> 2];
       L = L + (z << 2) | 0;
       H = +g[L >> 2];
       g[K >> 2] = C * I + E * H;
       g[L >> 2] = C * H - E * I;
       J = J + 1 | 0;
      } while ((J | 0) != (e | 0));
      I = +N(+F);
      H = +N(+G);
      do if (I > H) {
       H = H / I;
       H = I * +O(+(H * H + 1.0));
       f = 116;
      } else if (G != G | 0.0 != 0.0 | G == 0.0) {
       g[n + (A << 2) >> 2] = 0.0;
       break;
      } else {
       I = I / H;
       H = H * +O(+(I * I + 1.0));
       f = 116;
       break;
      } while (0);
      if ((f | 0) == 116) {
       f = 0;
       g[n + (A << 2) >> 2] = H;
       if (H != 0.0) {
        E = 1.0 / H;
        C = F * E;
        E = G * E;
       }
      }
      F = D * C + B * E;
      B = B * C - D * E;
      if (r) {
       J = 0;
       do {
        L = c[k + (J << 2) >> 2] | 0;
        K = L + (A << 2) | 0;
        I = +g[K >> 2];
        L = L + (z << 2) | 0;
        H = +g[L >> 2];
        g[K >> 2] = C * I + E * H;
        g[L >> 2] = C * H - E * I;
        J = J + 1 | 0;
       } while ((J | 0) != (d | 0));
      }
      if ((A | 0) >= (q | 0)) break; else D = B;
     }
    }
    h[o + (y << 3) >> 3] = 0.0;
    h[x >> 3] = F;
    g[w >> 2] = B;
    t = t + 1 | 0;
    if ((t | 0) >= 30) {
     z = q;
     break;
    } else z = q;
   }
   if ((f | 0) == 95) {
    f = 0;
    if (B < 0.0) {
     g[w >> 2] = -B;
     t = 0;
     do {
      L = (c[j + (t << 2) >> 2] | 0) + (s << 2) | 0;
      g[L >> 2] = -+g[L >> 2];
      t = t + 1 | 0;
     } while ((t | 0) != (e | 0));
    }
   }
  } while ((s | 0) > 0);
 }
 ke(o);
 K = 1;
 c[a + 0 >> 2] = c[b + 0 >> 2];
 c[a + 4 >> 2] = c[b + 4 >> 2];
 c[a + 8 >> 2] = c[b + 8 >> 2];
 L = a + 12 | 0;
 c[L >> 2] = d;
 L = a + 16 | 0;
 c[L >> 2] = e;
 L = a + 20 | 0;
 c[L >> 2] = j;
 L = a + 24 | 0;
 c[L >> 2] = d;
 L = a + 28 | 0;
 c[L >> 2] = n;
 L = a + 32 | 0;
 c[L >> 2] = K;
 i = l;
 return;
}
function ke(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0;
 b = i;
 if (!a) {
  i = b;
  return;
 }
 q = a + -8 | 0;
 r = c[936] | 0;
 if (q >>> 0 < r >>> 0) Pb();
 o = c[a + -4 >> 2] | 0;
 n = o & 3;
 if ((n | 0) == 1) Pb();
 j = o & -8;
 h = a + (j + -8) | 0;
 do if (!(o & 1)) {
  u = c[q >> 2] | 0;
  if (!n) {
   i = b;
   return;
  }
  q = -8 - u | 0;
  o = a + q | 0;
  n = u + j | 0;
  if (o >>> 0 < r >>> 0) Pb();
  if ((o | 0) == (c[937] | 0)) {
   d = a + (j + -4) | 0;
   if ((c[d >> 2] & 3 | 0) != 3) {
    d = o;
    m = n;
    break;
   }
   c[934] = n;
   c[d >> 2] = c[d >> 2] & -2;
   c[a + (q + 4) >> 2] = n | 1;
   c[h >> 2] = n;
   i = b;
   return;
  }
  t = u >>> 3;
  if (u >>> 0 < 256) {
   d = c[a + (q + 8) >> 2] | 0;
   m = c[a + (q + 12) >> 2] | 0;
   p = 3768 + (t << 1 << 2) | 0;
   if ((d | 0) != (p | 0)) {
    if (d >>> 0 < r >>> 0) Pb();
    if ((c[d + 12 >> 2] | 0) != (o | 0)) Pb();
   }
   if ((m | 0) == (d | 0)) {
    c[932] = c[932] & ~(1 << t);
    d = o;
    m = n;
    break;
   }
   if ((m | 0) == (p | 0)) s = m + 8 | 0; else {
    if (m >>> 0 < r >>> 0) Pb();
    p = m + 8 | 0;
    if ((c[p >> 2] | 0) == (o | 0)) s = p; else Pb();
   }
   c[d + 12 >> 2] = m;
   c[s >> 2] = d;
   d = o;
   m = n;
   break;
  }
  s = c[a + (q + 24) >> 2] | 0;
  t = c[a + (q + 12) >> 2] | 0;
  do if ((t | 0) == (o | 0)) {
   u = a + (q + 20) | 0;
   t = c[u >> 2] | 0;
   if (!t) {
    u = a + (q + 16) | 0;
    t = c[u >> 2] | 0;
    if (!t) {
     p = 0;
     break;
    }
   }
   while (1) {
    w = t + 20 | 0;
    v = c[w >> 2] | 0;
    if (v) {
     t = v;
     u = w;
     continue;
    }
    v = t + 16 | 0;
    w = c[v >> 2] | 0;
    if (!w) break; else {
     t = w;
     u = v;
    }
   }
   if (u >>> 0 < r >>> 0) Pb(); else {
    c[u >> 2] = 0;
    p = t;
    break;
   }
  } else {
   u = c[a + (q + 8) >> 2] | 0;
   if (u >>> 0 < r >>> 0) Pb();
   r = u + 12 | 0;
   if ((c[r >> 2] | 0) != (o | 0)) Pb();
   v = t + 8 | 0;
   if ((c[v >> 2] | 0) == (o | 0)) {
    c[r >> 2] = t;
    c[v >> 2] = u;
    p = t;
    break;
   } else Pb();
  } while (0);
  if (!s) {
   d = o;
   m = n;
  } else {
   t = c[a + (q + 28) >> 2] | 0;
   r = 4032 + (t << 2) | 0;
   if ((o | 0) == (c[r >> 2] | 0)) {
    c[r >> 2] = p;
    if (!p) {
     c[933] = c[933] & ~(1 << t);
     d = o;
     m = n;
     break;
    }
   } else {
    if (s >>> 0 < (c[936] | 0) >>> 0) Pb();
    r = s + 16 | 0;
    if ((c[r >> 2] | 0) == (o | 0)) c[r >> 2] = p; else c[s + 20 >> 2] = p;
    if (!p) {
     d = o;
     m = n;
     break;
    }
   }
   if (p >>> 0 < (c[936] | 0) >>> 0) Pb();
   c[p + 24 >> 2] = s;
   r = c[a + (q + 16) >> 2] | 0;
   do if (r) if (r >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
    c[p + 16 >> 2] = r;
    c[r + 24 >> 2] = p;
    break;
   } while (0);
   q = c[a + (q + 20) >> 2] | 0;
   if (!q) {
    d = o;
    m = n;
   } else if (q >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
    c[p + 20 >> 2] = q;
    c[q + 24 >> 2] = p;
    d = o;
    m = n;
    break;
   }
  }
 } else {
  d = q;
  m = j;
 } while (0);
 if (d >>> 0 >= h >>> 0) Pb();
 n = a + (j + -4) | 0;
 o = c[n >> 2] | 0;
 if (!(o & 1)) Pb();
 if (!(o & 2)) {
  if ((h | 0) == (c[938] | 0)) {
   w = (c[935] | 0) + m | 0;
   c[935] = w;
   c[938] = d;
   c[d + 4 >> 2] = w | 1;
   if ((d | 0) != (c[937] | 0)) {
    i = b;
    return;
   }
   c[937] = 0;
   c[934] = 0;
   i = b;
   return;
  }
  if ((h | 0) == (c[937] | 0)) {
   w = (c[934] | 0) + m | 0;
   c[934] = w;
   c[937] = d;
   c[d + 4 >> 2] = w | 1;
   c[d + w >> 2] = w;
   i = b;
   return;
  }
  m = (o & -8) + m | 0;
  n = o >>> 3;
  do if (o >>> 0 < 256) {
   k = c[a + j >> 2] | 0;
   j = c[a + (j | 4) >> 2] | 0;
   a = 3768 + (n << 1 << 2) | 0;
   if ((k | 0) != (a | 0)) {
    if (k >>> 0 < (c[936] | 0) >>> 0) Pb();
    if ((c[k + 12 >> 2] | 0) != (h | 0)) Pb();
   }
   if ((j | 0) == (k | 0)) {
    c[932] = c[932] & ~(1 << n);
    break;
   }
   if ((j | 0) == (a | 0)) l = j + 8 | 0; else {
    if (j >>> 0 < (c[936] | 0) >>> 0) Pb();
    a = j + 8 | 0;
    if ((c[a >> 2] | 0) == (h | 0)) l = a; else Pb();
   }
   c[k + 12 >> 2] = j;
   c[l >> 2] = k;
  } else {
   l = c[a + (j + 16) >> 2] | 0;
   o = c[a + (j | 4) >> 2] | 0;
   do if ((o | 0) == (h | 0)) {
    o = a + (j + 12) | 0;
    n = c[o >> 2] | 0;
    if (!n) {
     o = a + (j + 8) | 0;
     n = c[o >> 2] | 0;
     if (!n) {
      k = 0;
      break;
     }
    }
    while (1) {
     q = n + 20 | 0;
     p = c[q >> 2] | 0;
     if (p) {
      n = p;
      o = q;
      continue;
     }
     q = n + 16 | 0;
     p = c[q >> 2] | 0;
     if (!p) break; else {
      n = p;
      o = q;
     }
    }
    if (o >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
     c[o >> 2] = 0;
     k = n;
     break;
    }
   } else {
    q = c[a + j >> 2] | 0;
    if (q >>> 0 < (c[936] | 0) >>> 0) Pb();
    p = q + 12 | 0;
    if ((c[p >> 2] | 0) != (h | 0)) Pb();
    n = o + 8 | 0;
    if ((c[n >> 2] | 0) == (h | 0)) {
     c[p >> 2] = o;
     c[n >> 2] = q;
     k = o;
     break;
    } else Pb();
   } while (0);
   if (l) {
    o = c[a + (j + 20) >> 2] | 0;
    n = 4032 + (o << 2) | 0;
    if ((h | 0) == (c[n >> 2] | 0)) {
     c[n >> 2] = k;
     if (!k) {
      c[933] = c[933] & ~(1 << o);
      break;
     }
    } else {
     if (l >>> 0 < (c[936] | 0) >>> 0) Pb();
     n = l + 16 | 0;
     if ((c[n >> 2] | 0) == (h | 0)) c[n >> 2] = k; else c[l + 20 >> 2] = k;
     if (!k) break;
    }
    if (k >>> 0 < (c[936] | 0) >>> 0) Pb();
    c[k + 24 >> 2] = l;
    h = c[a + (j + 8) >> 2] | 0;
    do if (h) if (h >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
     c[k + 16 >> 2] = h;
     c[h + 24 >> 2] = k;
     break;
    } while (0);
    h = c[a + (j + 12) >> 2] | 0;
    if (h) if (h >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
     c[k + 20 >> 2] = h;
     c[h + 24 >> 2] = k;
     break;
    }
   }
  } while (0);
  c[d + 4 >> 2] = m | 1;
  c[d + m >> 2] = m;
  if ((d | 0) == (c[937] | 0)) {
   c[934] = m;
   i = b;
   return;
  }
 } else {
  c[n >> 2] = o & -2;
  c[d + 4 >> 2] = m | 1;
  c[d + m >> 2] = m;
 }
 h = m >>> 3;
 if (m >>> 0 < 256) {
  k = h << 1;
  e = 3768 + (k << 2) | 0;
  j = c[932] | 0;
  h = 1 << h;
  if (!(j & h)) {
   c[932] = j | h;
   f = 3768 + (k + 2 << 2) | 0;
   g = e;
  } else {
   j = 3768 + (k + 2 << 2) | 0;
   h = c[j >> 2] | 0;
   if (h >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
    f = j;
    g = h;
   }
  }
  c[f >> 2] = d;
  c[g + 12 >> 2] = d;
  c[d + 8 >> 2] = g;
  c[d + 12 >> 2] = e;
  i = b;
  return;
 }
 f = m >>> 8;
 if (!f) f = 0; else if (m >>> 0 > 16777215) f = 31; else {
  v = (f + 1048320 | 0) >>> 16 & 8;
  w = f << v;
  u = (w + 520192 | 0) >>> 16 & 4;
  w = w << u;
  f = (w + 245760 | 0) >>> 16 & 2;
  f = 14 - (u | v | f) + (w << f >>> 15) | 0;
  f = m >>> (f + 7 | 0) & 1 | f << 1;
 }
 g = 4032 + (f << 2) | 0;
 c[d + 28 >> 2] = f;
 c[d + 20 >> 2] = 0;
 c[d + 16 >> 2] = 0;
 j = c[933] | 0;
 h = 1 << f;
 a : do if (!(j & h)) {
  c[933] = j | h;
  c[g >> 2] = d;
  c[d + 24 >> 2] = g;
  c[d + 12 >> 2] = d;
  c[d + 8 >> 2] = d;
 } else {
  g = c[g >> 2] | 0;
  if ((f | 0) == 31) f = 0; else f = 25 - (f >>> 1) | 0;
  b : do if ((c[g + 4 >> 2] & -8 | 0) == (m | 0)) e = g; else {
   f = m << f;
   while (1) {
    j = g + (f >>> 31 << 2) + 16 | 0;
    h = c[j >> 2] | 0;
    if (!h) break;
    if ((c[h + 4 >> 2] & -8 | 0) == (m | 0)) {
     e = h;
     break b;
    } else {
     f = f << 1;
     g = h;
    }
   }
   if (j >>> 0 < (c[936] | 0) >>> 0) Pb(); else {
    c[j >> 2] = d;
    c[d + 24 >> 2] = g;
    c[d + 12 >> 2] = d;
    c[d + 8 >> 2] = d;
    break a;
   }
  } while (0);
  g = e + 8 | 0;
  f = c[g >> 2] | 0;
  h = c[936] | 0;
  if (e >>> 0 < h >>> 0) Pb();
  if (f >>> 0 < h >>> 0) Pb(); else {
   c[f + 12 >> 2] = d;
   c[g >> 2] = d;
   c[d + 8 >> 2] = f;
   c[d + 12 >> 2] = e;
   c[d + 24 >> 2] = 0;
   break;
  }
 } while (0);
 w = (c[940] | 0) + -1 | 0;
 c[940] = w;
 if (!w) d = 4184 | 0; else {
  i = b;
  return;
 }
 while (1) {
  d = c[d >> 2] | 0;
  if (!d) break; else d = d + 8 | 0;
 }
 c[940] = -1;
 i = b;
 return;
}
function xd() {
 var a = 0, b = 0, d = 0, e = 0;
 a = i;
 lc(32, 4, 640, 632, 1, 4);
 Ab(576, 40, 624, 1, 616, 11);
 b = je(4) | 0;
 a : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break a;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 24;
 d = je(4) | 0;
 b : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break b;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 24;
 Va(576, 56, 392, 608, 1, b | 0, 392, 600, 1, d | 0);
 b = je(4) | 0;
 c : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break c;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 0;
 d = je(4) | 0;
 d : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break d;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 0;
 Va(576, 64, 176, 592, 2, b | 0, 176, 584, 2, d | 0);
 b = je(4) | 0;
 e : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break e;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 12;
 d = je(4) | 0;
 f : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break f;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 12;
 Va(576, 72, 176, 592, 2, b | 0, 176, 584, 2, d | 0);
 b = je(4) | 0;
 g : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break g;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 32;
 d = je(4) | 0;
 h : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break h;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 32;
 Va(576, 80, 3448, 552, 3, b | 0, 3448, 544, 3, d | 0);
 bb(576);
 eb(392, 528, 496, 0, 472, 2, 72, 0, 72, 0, 88, 464, 12);
 b = je(4) | 0;
 i : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break i;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 4;
 Db(392, 96, 3, 448, 440, 4, b | 0, 0);
 b = je(4) | 0;
 j : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break j;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 1;
 Db(392, 104, 4, 424, 416, 1, b | 0, 0);
 b = je(4) | 0;
 k : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break k;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 0;
 d = je(4) | 0;
 l : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break l;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 0;
 $a(392, 112, 3448, 408, 4, b | 0, 3448, 400, 5, d | 0);
 Pa(392, 2, 376, 368, 5, 1);
 eb(176, 352, 320, 0, 296, 3, 72, 0, 72, 0, 120, 288, 13);
 b = je(4) | 0;
 m : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break m;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 5;
 Db(176, 96, 4, 240, 232, 2, b | 0, 0);
 b = je(4) | 0;
 n : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break n;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 2;
 Db(176, 104, 5, 208, 200, 1, b | 0, 0);
 b = je(4) | 0;
 o : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break o;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 0;
 d = je(4) | 0;
 p : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(4) | 0;
   if (d) break p;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[d >> 2] = 0;
 $a(176, 128, 3448, 192, 6, b | 0, 3448, 184, 6, d | 0);
 b = je(4) | 0;
 q : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(4) | 0;
   if (b) break q;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 c[b >> 2] = 0;
 d = je(4) | 0;
 if (d) {
  e = d;
  c[e >> 2] = 0;
  $a(176, 136, 3448, 192, 6, b | 0, 3448, 184, 6, e | 0);
  Pa(176, 3, 152, 144, 5, 7);
  i = a;
  return;
 }
 while (1) {
  d = c[718] | 0;
  c[718] = d + 0;
  if (!d) {
   e = 72;
   break;
  }
  Gc[d & 3]();
  d = je(4) | 0;
  if (d) {
   e = 73;
   break;
  }
 }
 if ((e | 0) == 72) {
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } else if ((e | 0) == 73) {
  c[d >> 2] = 0;
  $a(176, 136, 3448, 192, 6, b | 0, 3448, 184, 6, d | 0);
  Pa(176, 3, 152, 144, 5, 7);
  i = a;
  return;
 }
}
function $d(b, d, e, f, g) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 var h = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0;
 h = i;
 if ((b | 0) == (c[d + 8 >> 2] | 0)) {
  if ((c[d + 4 >> 2] | 0) != (e | 0)) {
   i = h;
   return;
  }
  e = d + 28 | 0;
  if ((c[e >> 2] | 0) == 1) {
   i = h;
   return;
  }
  c[e >> 2] = f;
  i = h;
  return;
 }
 if ((b | 0) != (c[d >> 2] | 0)) {
  u = c[b + 12 >> 2] | 0;
  l = b + (u << 3) + 16 | 0;
  be(b + 16 | 0, d, e, f, g);
  m = b + 24 | 0;
  if ((u | 0) <= 1) {
   i = h;
   return;
  }
  o = c[b + 8 >> 2] | 0;
  if (!(o & 2)) {
   n = d + 36 | 0;
   if ((c[n >> 2] | 0) != 1) {
    if (!(o & 1)) {
     o = d + 54 | 0;
     p = m;
     while (1) {
      if (a[o >> 0] | 0) {
       o = 43;
       break;
      }
      if ((c[n >> 2] | 0) == 1) {
       o = 43;
       break;
      }
      be(p, d, e, f, g);
      p = p + 8 | 0;
      if (p >>> 0 >= l >>> 0) {
       o = 43;
       break;
      }
     }
     if ((o | 0) == 43) {
      i = h;
      return;
     }
    }
    o = d + 24 | 0;
    q = d + 54 | 0;
    p = m;
    while (1) {
     if (a[q >> 0] | 0) {
      o = 43;
      break;
     }
     if ((c[n >> 2] | 0) == 1) if ((c[o >> 2] | 0) == 1) {
      o = 43;
      break;
     }
     be(p, d, e, f, g);
     p = p + 8 | 0;
     if (p >>> 0 >= l >>> 0) {
      o = 43;
      break;
     }
    }
    if ((o | 0) == 43) {
     i = h;
     return;
    }
   }
  }
  n = d + 54 | 0;
  while (1) {
   if (a[n >> 0] | 0) {
    o = 43;
    break;
   }
   be(m, d, e, f, g);
   m = m + 8 | 0;
   if (m >>> 0 >= l >>> 0) {
    o = 43;
    break;
   }
  }
  if ((o | 0) == 43) {
   i = h;
   return;
  }
 }
 if ((c[d + 16 >> 2] | 0) != (e | 0)) {
  l = d + 20 | 0;
  if ((c[l >> 2] | 0) != (e | 0)) {
   c[d + 32 >> 2] = f;
   m = d + 44 | 0;
   if ((c[m >> 2] | 0) == 4) {
    i = h;
    return;
   }
   u = c[b + 12 >> 2] | 0;
   q = b + (u << 3) + 16 | 0;
   a : do if ((u | 0) > 0) {
    r = d + 52 | 0;
    t = d + 53 | 0;
    s = d + 54 | 0;
    o = b + 8 | 0;
    n = d + 24 | 0;
    u = 0;
    p = 0;
    b = b + 16 | 0;
    b : do {
     a[r >> 0] = 0;
     a[t >> 0] = 0;
     ae(b, d, e, e, 1, g);
     if (a[s >> 0] | 0) break;
     do if (a[t >> 0] | 0) {
      if (!(a[r >> 0] | 0)) if (!(c[o >> 2] & 1)) {
       p = 1;
       break b;
      } else {
       p = 1;
       break;
      }
      if ((c[n >> 2] | 0) == 1) {
       o = 25;
       break a;
      }
      if (!(c[o >> 2] & 2)) {
       o = 25;
       break a;
      } else {
       u = 1;
       p = 1;
      }
     } while (0);
     b = b + 8 | 0;
    } while (b >>> 0 < q >>> 0);
    if (u) {
     k = p;
     o = 24;
    } else {
     j = p;
     o = 21;
    }
   } else {
    j = 0;
    o = 21;
   } while (0);
   if ((o | 0) == 21) {
    c[l >> 2] = e;
    u = d + 40 | 0;
    c[u >> 2] = (c[u >> 2] | 0) + 1;
    if ((c[d + 36 >> 2] | 0) == 1) if ((c[d + 24 >> 2] | 0) == 2) {
     a[d + 54 >> 0] = 1;
     if (j) o = 25; else o = 26;
    } else {
     k = j;
     o = 24;
    } else {
     k = j;
     o = 24;
    }
   }
   if ((o | 0) == 24) if (k) o = 25; else o = 26;
   if ((o | 0) == 25) {
    c[m >> 2] = 3;
    i = h;
    return;
   } else if ((o | 0) == 26) {
    c[m >> 2] = 4;
    i = h;
    return;
   }
  }
 }
 if ((f | 0) != 1) {
  i = h;
  return;
 }
 c[d + 32 >> 2] = 1;
 i = h;
 return;
}
function ce(b, d, e, f, g) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 var h = 0, j = 0, k = 0, l = 0, m = 0;
 h = i;
 if ((b | 0) == (c[d + 8 >> 2] | 0)) {
  if ((c[d + 4 >> 2] | 0) != (e | 0)) {
   i = h;
   return;
  }
  j = d + 28 | 0;
  if ((c[j >> 2] | 0) == 1) {
   i = h;
   return;
  }
  c[j >> 2] = f;
  i = h;
  return;
 }
 if ((b | 0) != (c[d >> 2] | 0)) {
  l = c[b + 8 >> 2] | 0;
  yc[c[(c[l >> 2] | 0) + 24 >> 2] & 3](l, d, e, f, g);
  i = h;
  return;
 }
 if ((c[d + 16 >> 2] | 0) != (e | 0)) {
  k = d + 20 | 0;
  if ((c[k >> 2] | 0) != (e | 0)) {
   c[d + 32 >> 2] = f;
   f = d + 44 | 0;
   if ((c[f >> 2] | 0) == 4) {
    i = h;
    return;
   }
   l = d + 52 | 0;
   a[l >> 0] = 0;
   m = d + 53 | 0;
   a[m >> 0] = 0;
   b = c[b + 8 >> 2] | 0;
   Jc[c[(c[b >> 2] | 0) + 20 >> 2] & 3](b, d, e, e, 1, g);
   if (!(a[m >> 0] | 0)) {
    b = 0;
    j = 13;
   } else if (!(a[l >> 0] | 0)) {
    b = 1;
    j = 13;
   }
   do if ((j | 0) == 13) {
    c[k >> 2] = e;
    m = d + 40 | 0;
    c[m >> 2] = (c[m >> 2] | 0) + 1;
    if ((c[d + 36 >> 2] | 0) == 1) if ((c[d + 24 >> 2] | 0) == 2) {
     a[d + 54 >> 0] = 1;
     if (b) break;
    } else j = 16; else j = 16;
    if ((j | 0) == 16) if (b) break;
    c[f >> 2] = 4;
    i = h;
    return;
   } while (0);
   c[f >> 2] = 3;
   i = h;
   return;
  }
 }
 if ((f | 0) != 1) {
  i = h;
  return;
 }
 c[d + 32 >> 2] = 1;
 i = h;
 return;
}
function Zd(d, e) {
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
 f = i;
 i = i + 64 | 0;
 m = f;
 g = c[d >> 2] | 0;
 h = d + (c[g + -8 >> 2] | 0) | 0;
 g = c[g + -4 >> 2] | 0;
 c[m >> 2] = e;
 c[m + 4 >> 2] = d;
 c[m + 8 >> 2] = 2968;
 p = m + 12 | 0;
 n = m + 16 | 0;
 o = m + 20 | 0;
 j = m + 24 | 0;
 d = m + 28 | 0;
 k = m + 32 | 0;
 l = m + 40 | 0;
 r = (g | 0) == (e | 0);
 e = p + 0 | 0;
 q = e + 40 | 0;
 do {
  c[e >> 2] = 0;
  e = e + 4 | 0;
 } while ((e | 0) < (q | 0));
 b[p + 40 >> 1] = 0;
 a[p + 42 >> 0] = 0;
 do if (r) {
  c[m + 48 >> 2] = 1;
  Jc[c[(c[g >> 2] | 0) + 20 >> 2] & 3](g, m, h, h, 1, 0);
  d = (c[j >> 2] | 0) == 1 ? h : 0;
 } else {
  yc[c[(c[g >> 2] | 0) + 24 >> 2] & 3](g, m, h, 1, 0);
  g = c[m + 36 >> 2] | 0;
  if (!g) {
   if ((c[l >> 2] | 0) != 1) {
    d = 0;
    break;
   }
   if ((c[d >> 2] | 0) != 1) {
    d = 0;
    break;
   }
   d = (c[k >> 2] | 0) == 1 ? c[o >> 2] | 0 : 0;
   break;
  } else if ((g | 0) != 1) {
   d = 0;
   break;
  }
  if ((c[j >> 2] | 0) != 1) {
   if (c[l >> 2] | 0) {
    d = 0;
    break;
   }
   if ((c[d >> 2] | 0) != 1) {
    d = 0;
    break;
   }
   if ((c[k >> 2] | 0) != 1) {
    d = 0;
    break;
   }
  }
  d = c[n >> 2] | 0;
 } while (0);
 i = f;
 return d | 0;
}
function Yd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0;
 e = i;
 i = i + 64 | 0;
 f = e;
 c[d >> 2] = c[c[d >> 2] >> 2];
 if ((a | 0) == (b | 0) | (b | 0) == 3336) d = 1; else if (!b) d = 0; else {
  b = Zd(b, 3136) | 0;
  if (!b) d = 0; else if (!(c[b + 8 >> 2] & ~c[a + 8 >> 2])) {
   a = c[a + 12 >> 2] | 0;
   g = b + 12 | 0;
   if ((a | 0) == 3320 ? 1 : (a | 0) == (c[g >> 2] | 0)) d = 1; else if (!a) d = 0; else {
    b = Zd(a, 3024) | 0;
    if (!b) d = 0; else {
     a = c[g >> 2] | 0;
     if (!a) d = 0; else {
      a = Zd(a, 3024) | 0;
      if (!a) d = 0; else {
       g = f + 0 | 0;
       h = g + 56 | 0;
       do {
        c[g >> 2] = 0;
        g = g + 4 | 0;
       } while ((g | 0) < (h | 0));
       c[f >> 2] = a;
       c[f + 8 >> 2] = b;
       c[f + 12 >> 2] = -1;
       c[f + 48 >> 2] = 1;
       Lc[c[(c[a >> 2] | 0) + 28 >> 2] & 7](a, f, c[d >> 2] | 0, 1);
       if ((c[f + 24 >> 2] | 0) == 1) {
        c[d >> 2] = c[f + 16 >> 2];
        d = 1;
       } else d = 0;
      }
     }
    }
   }
  } else d = 0;
 }
 i = e;
 return d | 0;
}
function ee(b, d, e, f, g, h) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 h = h | 0;
 var j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
 m = i;
 if ((b | 0) == (c[d + 8 >> 2] | 0)) {
  _d(d, e, f, g);
  i = m;
  return;
 }
 j = d + 52 | 0;
 l = a[j >> 0] | 0;
 o = d + 53 | 0;
 n = a[o >> 0] | 0;
 r = c[b + 12 >> 2] | 0;
 p = b + (r << 3) + 16 | 0;
 a[j >> 0] = 0;
 a[o >> 0] = 0;
 ae(b + 16 | 0, d, e, f, g, h);
 a : do if ((r | 0) > 1) {
  k = d + 24 | 0;
  q = b + 8 | 0;
  r = d + 54 | 0;
  b = b + 24 | 0;
  do {
   if (a[r >> 0] | 0) break a;
   if (!(a[j >> 0] | 0)) {
    if (a[o >> 0] | 0) if (!(c[q >> 2] & 1)) break a;
   } else {
    if ((c[k >> 2] | 0) == 1) break a;
    if (!(c[q >> 2] & 2)) break a;
   }
   a[j >> 0] = 0;
   a[o >> 0] = 0;
   ae(b, d, e, f, g, h);
   b = b + 8 | 0;
  } while (b >>> 0 < p >>> 0);
 } while (0);
 a[j >> 0] = l;
 a[o >> 0] = n;
 i = m;
 return;
}
function zd() {
 var a = 0;
 a = i;
 _b(3320, 656);
 Ya(3352, 664, 1, 1, 0);
 vb(3368, 672, 1, -128, 127);
 vb(3400, 680, 1, -128, 127);
 vb(3384, 696, 1, 0, 255);
 vb(3416, 712, 2, -32768, 32767);
 vb(3432, 720, 2, 0, 65535);
 vb(3448, 736, 4, -2147483648, 2147483647);
 vb(3464, 744, 4, 0, -1);
 vb(3480, 760, 4, -2147483648, 2147483647);
 vb(3496, 768, 4, 0, -1);
 jc(3512, 784, 4);
 jc(3528, 792, 8);
 Ia(2320, 800);
 Ia(2232, 816);
 cc(2144, 4, 856);
 ab(280, 872);
 Vb(2024, 0, 888);
 Vb(1984, 0, 920);
 Vb(1944, 1, 960);
 Vb(1904, 2, 1e3);
 Vb(1864, 3, 1032);
 Vb(1824, 4, 1072);
 Vb(1784, 5, 1104);
 Vb(1744, 4, 1144);
 Vb(1704, 5, 1176);
 Vb(1984, 0, 1216);
 Vb(1944, 1, 1248);
 Vb(1904, 2, 1288);
 Vb(1864, 3, 1328);
 Vb(1824, 4, 1368);
 Vb(1784, 5, 1408);
 Vb(1664, 6, 1448);
 Vb(1624, 7, 1480);
 Vb(1584, 7, 1512);
 i = a;
 return;
}
function Bd() {
 var a = 0, b = 0, d = 0, e = 0, f = 0;
 a = i;
 i = i + 16 | 0;
 b = a;
 a = a + 12 | 0;
 if (db(2528, 2) | 0) Ad(2536, b);
 d = Cb(c[630] | 0) | 0;
 if (!d) Ad(2504, b);
 d = c[d >> 2] | 0;
 if (!d) Ad(2504, b);
 f = d + 48 | 0;
 e = c[f >> 2] | 0;
 f = c[f + 4 >> 2] | 0;
 if (!((e & -256 | 0) == 1126902528 & (f | 0) == 1129074247)) {
  c[b >> 2] = 2352;
  Ad(2464, b);
 }
 if ((e | 0) == 1126902529 & (f | 0) == 1129074247) e = c[d + 44 >> 2] | 0; else e = d + 80 | 0;
 c[a >> 2] = e;
 f = c[d >> 2] | 0;
 d = c[f + 4 >> 2] | 0;
 if (Sd(2896, f, a) | 0) {
  f = c[a >> 2] | 0;
  f = Dc[c[(c[f >> 2] | 0) + 8 >> 2] & 3](f) | 0;
  c[b >> 2] = 2352;
  c[b + 4 >> 2] = d;
  c[b + 8 >> 2] = f;
  Ad(2368, b);
 } else {
  c[b >> 2] = 2352;
  c[b + 4 >> 2] = d;
  Ad(2416, b);
 }
}
function de(b, d, e, f, g) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 g = i;
 if ((c[d + 8 >> 2] | 0) == (b | 0)) {
  if ((c[d + 4 >> 2] | 0) != (e | 0)) {
   i = g;
   return;
  }
  d = d + 28 | 0;
  if ((c[d >> 2] | 0) == 1) {
   i = g;
   return;
  }
  c[d >> 2] = f;
  i = g;
  return;
 }
 if ((c[d >> 2] | 0) != (b | 0)) {
  i = g;
  return;
 }
 if ((c[d + 16 >> 2] | 0) != (e | 0)) {
  b = d + 20 | 0;
  if ((c[b >> 2] | 0) != (e | 0)) {
   c[d + 32 >> 2] = f;
   c[b >> 2] = e;
   b = d + 40 | 0;
   c[b >> 2] = (c[b >> 2] | 0) + 1;
   if ((c[d + 36 >> 2] | 0) == 1) if ((c[d + 24 >> 2] | 0) == 2) a[d + 54 >> 0] = 1;
   c[d + 44 >> 2] = 4;
   i = g;
   return;
  }
 }
 if ((f | 0) != 1) {
  i = g;
  return;
 }
 c[d + 32 >> 2] = 1;
 i = g;
 return;
}
function _d(b, d, e, f) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 var g = 0, h = 0;
 g = i;
 a[b + 53 >> 0] = 1;
 if ((c[b + 4 >> 2] | 0) != (e | 0)) {
  i = g;
  return;
 }
 a[b + 52 >> 0] = 1;
 e = b + 16 | 0;
 h = c[e >> 2] | 0;
 if (!h) {
  c[e >> 2] = d;
  c[b + 24 >> 2] = f;
  c[b + 36 >> 2] = 1;
  if (!((f | 0) == 1 ? (c[b + 48 >> 2] | 0) == 1 : 0)) {
   i = g;
   return;
  }
  a[b + 54 >> 0] = 1;
  i = g;
  return;
 }
 if ((h | 0) != (d | 0)) {
  h = b + 36 | 0;
  c[h >> 2] = (c[h >> 2] | 0) + 1;
  a[b + 54 >> 0] = 1;
  i = g;
  return;
 }
 d = b + 24 | 0;
 e = c[d >> 2] | 0;
 if ((e | 0) == 2) c[d >> 2] = f; else f = e;
 if (!((f | 0) == 1 ? (c[b + 48 >> 2] | 0) == 1 : 0)) {
  i = g;
  return;
 }
 a[b + 54 >> 0] = 1;
 i = g;
 return;
}
function Sd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0;
 e = i;
 i = i + 64 | 0;
 f = e;
 if ((a | 0) == (b | 0)) {
  h = 1;
  i = e;
  return h | 0;
 }
 if (!b) {
  h = 0;
  i = e;
  return h | 0;
 }
 b = Zd(b, 3024) | 0;
 if (!b) {
  h = 0;
  i = e;
  return h | 0;
 }
 h = f + 0 | 0;
 g = h + 56 | 0;
 do {
  c[h >> 2] = 0;
  h = h + 4 | 0;
 } while ((h | 0) < (g | 0));
 c[f >> 2] = b;
 c[f + 8 >> 2] = a;
 c[f + 12 >> 2] = -1;
 c[f + 48 >> 2] = 1;
 Lc[c[(c[b >> 2] | 0) + 28 >> 2] & 7](b, f, c[d >> 2] | 0, 1);
 if ((c[f + 24 >> 2] | 0) != 1) {
  h = 0;
  i = e;
  return h | 0;
 }
 c[d >> 2] = c[f + 16 >> 2];
 h = 1;
 i = e;
 return h | 0;
}
function wd(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0;
 f = i;
 i = i + 48 | 0;
 h = f + 36 | 0;
 g = f;
 c[h + 0 >> 2] = c[b + 0 >> 2];
 c[h + 4 >> 2] = c[b + 4 >> 2];
 c[h + 8 >> 2] = c[b + 8 >> 2];
 Lc[a & 7](g, h, d, e);
 d = je(36) | 0;
 a : do if (!d) {
  while (1) {
   e = c[718] | 0;
   c[718] = e + 0;
   if (!e) break;
   Gc[e & 3]();
   d = je(36) | 0;
   if (d) break a;
  }
  h = wb(4) | 0;
  c[h >> 2] = 2712;
  rc(h | 0, 2760, 1);
 } while (0);
 e = d + 0 | 0;
 a = g + 0 | 0;
 g = e + 36 | 0;
 do {
  c[e >> 2] = c[a >> 2];
  e = e + 4 | 0;
  a = a + 4 | 0;
 } while ((e | 0) < (g | 0));
 i = f;
 return d | 0;
}
function Xd(b, d, e, f) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 var g = 0, h = 0, j = 0;
 g = i;
 if ((b | 0) == (c[d + 8 >> 2] | 0)) {
  Td(d, e, f);
  i = g;
  return;
 }
 j = c[b + 12 >> 2] | 0;
 h = b + (j << 3) + 16 | 0;
 Wd(b + 16 | 0, d, e, f);
 if ((j | 0) <= 1) {
  i = g;
  return;
 }
 j = d + 54 | 0;
 b = b + 24 | 0;
 while (1) {
  Wd(b, d, e, f);
  if (a[j >> 0] | 0) {
   f = 7;
   break;
  }
  b = b + 8 | 0;
  if (b >>> 0 >= h >>> 0) {
   f = 7;
   break;
  }
 }
 if ((f | 0) == 7) {
  i = g;
  return;
 }
}
function oe(b, d, e) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0;
 if ((e | 0) >= 4096) return Ea(b | 0, d | 0, e | 0) | 0;
 f = b | 0;
 if ((b & 3) == (d & 3)) {
  while (b & 3) {
   if (!e) return f | 0;
   a[b >> 0] = a[d >> 0] | 0;
   b = b + 1 | 0;
   d = d + 1 | 0;
   e = e - 1 | 0;
  }
  while ((e | 0) >= 4) {
   c[b >> 2] = c[d >> 2];
   b = b + 4 | 0;
   d = d + 4 | 0;
   e = e - 4 | 0;
  }
 }
 while ((e | 0) > 0) {
  a[b >> 0] = a[d >> 0] | 0;
  b = b + 1 | 0;
  d = d + 1 | 0;
  e = e - 1 | 0;
 }
 return f | 0;
}
function le() {}
function me(b, d, e) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0;
 f = b + e | 0;
 if ((e | 0) >= 20) {
  d = d & 255;
  i = b & 3;
  h = d | d << 8 | d << 16 | d << 24;
  g = f & ~3;
  if (i) {
   i = b + 4 - i | 0;
   while ((b | 0) < (i | 0)) {
    a[b >> 0] = d;
    b = b + 1 | 0;
   }
  }
  while ((b | 0) < (g | 0)) {
   c[b >> 2] = h;
   b = b + 4 | 0;
  }
 }
 while ((b | 0) < (f | 0)) {
  a[b >> 0] = d;
  b = b + 1 | 0;
 }
 return b - e | 0;
}
function $c(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 f = i;
 i = i + 16 | 0;
 e = f;
 Fc[a & 7](e, b, d);
 d = je(12) | 0;
 a : do if (!d) {
  while (1) {
   d = c[718] | 0;
   c[718] = d + 0;
   if (!d) break;
   Gc[d & 3]();
   d = je(12) | 0;
   if (d) break a;
  }
  a = wb(4) | 0;
  c[a >> 2] = 2712;
  rc(a | 0, 2760, 1);
 } while (0);
 c[d + 0 >> 2] = c[e + 0 >> 2];
 c[d + 4 >> 2] = c[e + 4 >> 2];
 c[d + 8 >> 2] = c[e + 8 >> 2];
 i = f;
 return d | 0;
}
function Td(b, d, e) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0;
 f = i;
 g = b + 16 | 0;
 h = c[g >> 2] | 0;
 if (!h) {
  c[g >> 2] = d;
  c[b + 24 >> 2] = e;
  c[b + 36 >> 2] = 1;
  i = f;
  return;
 }
 if ((h | 0) != (d | 0)) {
  h = b + 36 | 0;
  c[h >> 2] = (c[h >> 2] | 0) + 1;
  c[b + 24 >> 2] = 2;
  a[b + 54 >> 0] = 1;
  i = f;
  return;
 }
 d = b + 24 | 0;
 if ((c[d >> 2] | 0) != 2) {
  i = f;
  return;
 }
 c[d >> 2] = e;
 i = f;
 return;
}
function hd(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0;
 e = i;
 i = i + 16 | 0;
 d = e;
 Bc[a & 1](d, b);
 b = je(8) | 0;
 a : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(8) | 0;
   if (b) break a;
  }
  a = wb(4) | 0;
  c[a >> 2] = 2712;
  rc(a | 0, 2760, 1);
 } while (0);
 f = d;
 d = c[f + 4 >> 2] | 0;
 a = b;
 c[a >> 2] = c[f >> 2];
 c[a + 4 >> 2] = d;
 i = e;
 return b | 0;
}
function Zc(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0;
 f = i;
 c[a >> 2] = b;
 c[a + 4 >> 2] = d;
 g = b << 2;
 e = je(g) | 0;
 g = je(_(g, d) | 0) | 0;
 c[e >> 2] = g;
 if ((b | 0) > 1) h = 1; else {
  h = a + 8 | 0;
  c[h >> 2] = e;
  i = f;
  return;
 }
 do {
  g = g + (d << 2) | 0;
  c[e + (h << 2) >> 2] = g;
  h = h + 1 | 0;
 } while ((h | 0) != (b | 0));
 h = a + 8 | 0;
 c[h >> 2] = e;
 i = f;
 return;
}
function sd(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0;
 d = i;
 a = b + (c[a >> 2] | 0) | 0;
 b = je(8) | 0;
 a : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(8) | 0;
   if (b) break a;
  }
  b = wb(4) | 0;
  c[b >> 2] = 2712;
  rc(b | 0, 2760, 1);
 } while (0);
 f = a;
 e = c[f + 4 >> 2] | 0;
 a = b;
 c[a >> 2] = c[f >> 2];
 c[a + 4 >> 2] = e;
 i = d;
 return b | 0;
}
function qd(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0;
 d = i;
 a = b + (c[a >> 2] | 0) | 0;
 b = je(12) | 0;
 a : do if (!b) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   b = je(12) | 0;
   if (b) break a;
  }
  b = wb(4) | 0;
  c[b >> 2] = 2712;
  rc(b | 0, 2760, 1);
 } while (0);
 c[b + 0 >> 2] = c[a + 0 >> 2];
 c[b + 4 >> 2] = c[a + 4 >> 2];
 c[b + 8 >> 2] = c[a + 8 >> 2];
 i = d;
 return b | 0;
}
function ud() {
 var a = 0, b = 0, d = 0, e = 0;
 a = i;
 e = je(36) | 0;
 a : do if (!e) {
  while (1) {
   b = c[718] | 0;
   c[718] = b + 0;
   if (!b) break;
   Gc[b & 3]();
   e = je(36) | 0;
   if (e) break a;
  }
  e = wb(4) | 0;
  c[e >> 2] = 2712;
  rc(e | 0, 2760, 1);
 } while (0);
 d = e + 0 | 0;
 b = d + 36 | 0;
 do {
  c[d >> 2] = 0;
  d = d + 4 | 0;
 } while ((d | 0) < (b | 0));
 i = a;
 return e | 0;
}
function Xc(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, h = 0;
 f = i;
 i = i + 16 | 0;
 h = f;
 if ((c[b >> 2] | 0) > (d | 0)) if ((c[b + 4 >> 2] | 0) > (e | 0)) {
  g[h >> 2] = +g[(c[(c[b + 8 >> 2] | 0) + (d << 2) >> 2] | 0) + (e << 2) >> 2];
  c[a >> 2] = xb(3512, h | 0) | 0;
  i = f;
  return;
 }
 c[a >> 2] = 1;
 i = f;
 return;
}
function ae(a, b, d, e, f, g) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 var h = 0, j = 0, k = 0;
 h = i;
 j = c[a + 4 >> 2] | 0;
 k = j >> 8;
 if (j & 1) k = c[(c[e >> 2] | 0) + k >> 2] | 0;
 a = c[a >> 2] | 0;
 Jc[c[(c[a >> 2] | 0) + 20 >> 2] & 3](a, b, d, e + k | 0, (j & 2 | 0) != 0 ? f : 2, g);
 i = h;
 return;
}
function Id() {
 var a = 0, b = 0;
 a = i;
 i = i + 16 | 0;
 if (db(2528, 2) | 0) Ad(2536, a);
 a = Cb(c[630] | 0) | 0;
 if (a) {
  a = c[a >> 2] | 0;
  if (a) {
   b = a + 48 | 0;
   if ((c[b >> 2] & -256 | 0) == 1126902528 ? (c[b + 4 >> 2] | 0) == 1129074247 : 0) Hd(c[a + 12 >> 2] | 0);
  }
 }
 b = c[586] | 0;
 c[586] = b + 0;
 Hd(b);
}
function be(a, b, d, e, f) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 var g = 0, h = 0, j = 0;
 g = i;
 h = c[a + 4 >> 2] | 0;
 j = h >> 8;
 if (h & 1) j = c[(c[d >> 2] | 0) + j >> 2] | 0;
 a = c[a >> 2] | 0;
 yc[c[(c[a >> 2] | 0) + 24 >> 2] & 3](a, b, d + j | 0, (h & 2 | 0) != 0 ? e : 2, f);
 i = g;
 return;
}
function fe(a, b, d, e, f, g) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 var h = 0;
 h = i;
 if ((a | 0) == (c[b + 8 >> 2] | 0)) {
  _d(b, d, e, f);
  i = h;
  return;
 } else {
  a = c[a + 8 >> 2] | 0;
  Jc[c[(c[a >> 2] | 0) + 20 >> 2] & 3](a, b, d, e, f, g);
  i = h;
  return;
 }
}
function Wd(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0;
 f = i;
 g = c[a + 4 >> 2] | 0;
 h = g >> 8;
 if (g & 1) h = c[(c[d >> 2] | 0) + h >> 2] | 0;
 a = c[a >> 2] | 0;
 Lc[c[(c[a >> 2] | 0) + 28 >> 2] & 7](a, b, d + h | 0, (g & 2 | 0) != 0 ? e : 2);
 i = f;
 return;
}
function Uc(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 e = i;
 i = i + 16 | 0;
 f = e;
 if ((c[b >> 2] | 0) > (d | 0)) {
  g[f >> 2] = +g[(c[b + 4 >> 2] | 0) + (d << 2) >> 2];
  c[a >> 2] = xb(3512, f | 0) | 0;
  i = e;
  return;
 } else {
  c[a >> 2] = 1;
  i = e;
  return;
 }
}
function Yc(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = +e;
 var f = 0;
 f = i;
 if ((c[a >> 2] | 0) <= (b | 0)) {
  i = f;
  return;
 }
 if ((c[a + 4 >> 2] | 0) <= (d | 0)) {
  i = f;
  return;
 }
 g[(c[(c[a + 8 >> 2] | 0) + (b << 2) >> 2] | 0) + (d << 2) >> 2] = e;
 i = f;
 return;
}
function he(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 e = i;
 i = i + 16 | 0;
 f = e;
 c[f >> 2] = c[d >> 2];
 a = xc[c[(c[a >> 2] | 0) + 16 >> 2] & 7](a, b, f) | 0;
 b = a & 1;
 if (!a) {
  i = e;
  return b | 0;
 }
 c[d >> 2] = c[f >> 2];
 i = e;
 return b | 0;
}
function Rc(b) {
 b = b | 0;
 a[k >> 0] = a[b >> 0];
 a[k + 1 >> 0] = a[b + 1 >> 0];
 a[k + 2 >> 0] = a[b + 2 >> 0];
 a[k + 3 >> 0] = a[b + 3 >> 0];
 a[k + 4 >> 0] = a[b + 4 >> 0];
 a[k + 5 >> 0] = a[b + 5 >> 0];
 a[k + 6 >> 0] = a[b + 6 >> 0];
 a[k + 7 >> 0] = a[b + 7 >> 0];
}
function Vd(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0;
 f = i;
 if ((a | 0) == (c[b + 8 >> 2] | 0)) {
  Td(b, d, e);
  i = f;
  return;
 } else {
  a = c[a + 8 >> 2] | 0;
  Lc[c[(c[a >> 2] | 0) + 28 >> 2] & 7](a, b, d, e);
  i = f;
  return;
 }
}
function yd(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0;
 b = i;
 d = c[a + 4 >> 2] | 0;
 e = (ne(d | 0) | 0) + 1 | 0;
 a = je(e) | 0;
 if (!a) {
  e = 0;
  i = b;
  return e | 0;
 }
 oe(a | 0, d | 0, e | 0) | 0;
 e = a;
 i = b;
 return e | 0;
}
function dd(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0;
 f = i;
 i = i + 16 | 0;
 g = f;
 Lc[c[a >> 2] & 7](g, b, d, e);
 ec(c[g >> 2] | 0);
 a = c[g >> 2] | 0;
 cb(a | 0);
 i = f;
 return a | 0;
}
function rd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0;
 e = i;
 b = b + (c[a >> 2] | 0) | 0;
 c[b + 0 >> 2] = c[d + 0 >> 2];
 c[b + 4 >> 2] = c[d + 4 >> 2];
 c[b + 8 >> 2] = c[d + 8 >> 2];
 i = e;
 return;
}
function ld(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 e = i;
 i = i + 16 | 0;
 f = e;
 Fc[c[a >> 2] & 7](f, b, d);
 ec(c[f >> 2] | 0);
 a = c[f >> 2] | 0;
 cb(a | 0);
 i = e;
 return a | 0;
}
function ge(a, b, d, e, f, g) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 g = i;
 if ((c[b + 8 >> 2] | 0) != (a | 0)) {
  i = g;
  return;
 }
 _d(b, d, e, f);
 i = g;
 return;
}
function Vc(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = +d;
 var e = 0;
 e = i;
 if ((c[a >> 2] | 0) <= (b | 0)) {
  i = e;
  return;
 }
 g[(c[a + 4 >> 2] | 0) + (b << 2) >> 2] = d;
 i = e;
 return;
}
function td(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 f = d;
 e = c[f + 4 >> 2] | 0;
 d = b + (c[a >> 2] | 0) | 0;
 c[d >> 2] = c[f >> 2];
 c[d + 4 >> 2] = e;
 return;
}
function Ud(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0;
 f = i;
 if ((c[b + 8 >> 2] | 0) != (a | 0)) {
  i = f;
  return;
 }
 Td(b, d, e);
 i = f;
 return;
}
function Ad(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0;
 d = i;
 i = i + 16 | 0;
 c[d >> 2] = b;
 b = c[m >> 2] | 0;
 ub(b | 0, a | 0, d | 0) | 0;
 Ob(10, b | 0) | 0;
 Pb();
}
function Be(a, b, c, d, e, f, g) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 Jc[a & 3](b | 0, c | 0, d | 0, e | 0, f | 0, g | 0);
}
function cd(a, b, d, e, f) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = +f;
 var g = 0;
 g = i;
 Ec[c[a >> 2] & 3](b, d, e, f);
 i = g;
 return;
}
function qe(a, b, c, d, e, f) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 yc[a & 3](b | 0, c | 0, d | 0, e | 0, f | 0);
}
function Qc(b) {
 b = b | 0;
 a[k >> 0] = a[b >> 0];
 a[k + 1 >> 0] = a[b + 1 >> 0];
 a[k + 2 >> 0] = a[b + 2 >> 0];
 a[k + 3 >> 0] = a[b + 3 >> 0];
}
function Dd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 i = i + 16 | 0;
 ke(a);
 if (!(oc(c[630] | 0, 0) | 0)) {
  i = b;
  return;
 } else Ad(2648, b);
}
function ue(a, b, c, d, e, f) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 f = +f;
 Cc[a & 1](b | 0, c | 0, d | 0, e | 0, +f);
}
function Ae(a, b, c, d, e) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 return Ic[a & 3](b | 0, c | 0, d | 0, e | 0) | 0;
}
function kd(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = +e;
 var f = 0;
 f = i;
 Hc[c[a >> 2] & 1](b, d, e);
 i = f;
 return;
}
function De(a, b, c, d, e) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 Lc[a & 7](b | 0, c | 0, d | 0, e | 0);
}
function ie(a) {
 a = a | 0;
 var b = 0;
 b = i;
 if (!a) a = 0; else a = (Zd(a, 3136) | 0) != 0;
 i = b;
 return a & 1 | 0;
}
function we(a, b, c, d, e) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = +e;
 Ec[a & 3](b | 0, c | 0, d | 0, +e);
}
function Cd() {
 var a = 0;
 a = i;
 i = i + 16 | 0;
 if (!(Jb(2520, 14) | 0)) {
  i = a;
  return;
 } else Ad(2592, a);
}
function pe(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 return xc[a & 7](b | 0, c | 0, d | 0) | 0;
}
function Qe(a, b, c, d, e, f) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 $(12);
}
function xe(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 Fc[a & 7](b | 0, c | 0, d | 0);
}
function ne(b) {
 b = b | 0;
 var c = 0;
 c = b;
 while (a[c >> 0] | 0) c = c + 1 | 0;
 return c - b | 0;
}
function pd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 c[b + (c[a >> 2] | 0) >> 2] = d;
 return;
}
function jd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 c[b + (c[a >> 2] | 0) >> 2] = d;
 return;
}
function bd(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 c[b + (c[a >> 2] | 0) >> 2] = d;
 return;
}
function ze(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = +d;
 Hc[a & 1](b | 0, c | 0, +d);
}
function Mc(a) {
 a = a | 0;
 var b = 0;
 b = i;
 i = i + a | 0;
 i = i + 15 & -16;
 return b | 0;
}
function Fe(a, b, c, d, e) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 $(1);
}
function Ce(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 return Kc[a & 7](b | 0, c | 0) | 0;
}
function Hd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 i = i + 16 | 0;
 Gc[a & 3]();
 Ad(2776, b);
}
function Pe(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 $(11);
 return 0;
}
function Je(a, b, c, d, e) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = +e;
 $(5);
}
function Rd(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 return (a | 0) == (b | 0) | 0;
}
function te(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 Bc[a & 1](b | 0, c | 0);
}
function od(a, b) {
 a = a | 0;
 b = b | 0;
 return c[b + (c[a >> 2] | 0) >> 2] | 0;
}
function id(a, b) {
 a = a | 0;
 b = b | 0;
 return c[b + (c[a >> 2] | 0) >> 2] | 0;
}
function ad(a, b) {
 a = a | 0;
 b = b | 0;
 return c[b + (c[a >> 2] | 0) >> 2] | 0;
}
function Se(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 $(14);
}
function vd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 if (a) ke(a);
 i = b;
 return;
}
function nd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 if (a) ke(a);
 i = b;
 return;
}
function gd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 if (a) ke(a);
 i = b;
 return;
}
function Le(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = +d;
 $(7);
}
function Ee(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 $(0);
 return 0;
}
function Pc(a, b) {
 a = a | 0;
 b = b | 0;
 if (!n) {
  n = a;
  o = b;
 }
}
function ve(a, b) {
 a = a | 0;
 b = b | 0;
 return Dc[a & 3](b | 0) | 0;
}
function Qd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Pd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Od(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Nd(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Md(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Ed(a) {
 a = a | 0;
 var b = 0;
 b = i;
 ke(a);
 i = b;
 return;
}
function Wc(a, b) {
 a = a | 0;
 b = b | 0;
 c[a >> 2] = b;
 return;
}
function Me(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 $(8);
}
function se(a, b) {
 a = a | 0;
 b = b | 0;
 Ac[a & 15](b | 0);
}
function Oe(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = +c;
 $(10);
}
function Re(a, b) {
 a = a | 0;
 b = b | 0;
 $(13);
 return 0;
}
function re(a) {
 a = a | 0;
 return zc[a & 1]() | 0;
}
function ed(a) {
 a = a | 0;
 Da(a | 0) | 0;
 Id();
}
function Ie(a, b) {
 a = a | 0;
 b = b | 0;
 $(4);
}
function Ke(a) {
 a = a | 0;
 $(6);
 return 0;
}
function ye(a) {
 a = a | 0;
 Gc[a & 3]();
}
function Gd(a) {
 a = a | 0;
 return 2728;
}
function md(a) {
 a = a | 0;
 return 392;
}
function fd(a) {
 a = a | 0;
 return 176;
}
function Ld(a) {
 a = a | 0;
 return;
}
function Kd(a) {
 a = a | 0;
 return;
}
function Jd(a) {
 a = a | 0;
 return;
}
function Fd(a) {
 a = a | 0;
 return;
}
function Sc(a) {
 a = a | 0;
 C = a;
}
function Oc(a) {
 a = a | 0;
 i = a;
}
function He(a) {
 a = a | 0;
 $(3);
}
function Ge() {
 $(2);
 return 0;
}
function Tc() {
 return C | 0;
}
function Nc() {
 return i | 0;
}
function Ne() {
 $(9);
}

// EMSCRIPTEN_END_FUNCS

 var xc = [ Ee, Sd, Yd, Rd, ld, $c, Ee, Ee ];
 var yc = [ Fe, de, ce, $d ];
 var zc = [ Ge, ud ];
 var Ac = [ He, Fd, Ed, Jd, Nd, Kd, Ld, Qd, Md, Od, Pd, vd, nd, gd, Dd, He ];
 var Bc = [ Ie, Wc ];
 var Cc = [ Je, cd ];
 var Dc = [ Ke, Gd, md, fd ];
 var Ec = [ Le, kd, Yc, Le ];
 var Fc = [ Me, td, rd, pd, Uc, jd, bd, Zc ];
 var Gc = [ Ne, Bd, Cd, Ne ];
 var Hc = [ Oe, Vc ];
 var Ic = [ Pe, wd, dd, Pe ];
 var Jc = [ Qe, ge, fe, ee ];
 var Kc = [ Re, sd, qd, od, id, hd, ad, Re ];
 var Lc = [ Se, Ud, Vd, Xd, _c, Xc, Se, Se ];
 return {
  ___cxa_can_catch: he,
  _free: ke,
  ___cxa_is_pointer_type: ie,
  _strlen: ne,
  _memset: me,
  _malloc: je,
  _memcpy: oe,
  ___getTypeName: yd,
  __GLOBAL__I_a: xd,
  __GLOBAL__I_a23: zd,
  runPostSets: le,
  stackAlloc: Mc,
  stackSave: Nc,
  stackRestore: Oc,
  setThrew: Pc,
  setTempRet0: Sc,
  getTempRet0: Tc,
  dynCall_iiii: pe,
  dynCall_viiiii: qe,
  dynCall_i: re,
  dynCall_vi: se,
  dynCall_vii: te,
  dynCall_viiiid: ue,
  dynCall_ii: ve,
  dynCall_viiid: we,
  dynCall_viii: xe,
  dynCall_v: ye,
  dynCall_viid: ze,
  dynCall_iiiii: Ae,
  dynCall_viiiiii: Be,
  dynCall_iii: Ce,
  dynCall_viiii: De
 };
})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var _free = Module["_free"] = asm["_free"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
var __GLOBAL__I_a = Module["__GLOBAL__I_a"] = asm["__GLOBAL__I_a"];
var __GLOBAL__I_a23 = Module["__GLOBAL__I_a23"] = asm["__GLOBAL__I_a23"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_viiiid = Module["dynCall_viiiid"] = asm["dynCall_viiiid"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viiid = Module["dynCall_viiid"] = asm["dynCall_viiid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_viid = Module["dynCall_viid"] = asm["dynCall_viid"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
var i64Math = null;
if (memoryInitializer) {
 if (typeof Module["locateFile"] === "function") {
  memoryInitializer = Module["locateFile"](memoryInitializer);
 } else if (Module["memoryInitializerPrefixURL"]) {
  memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer;
 }
 if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
  var data = Module["readBinary"](memoryInitializer);
  HEAPU8.set(data, STATIC_BASE);
 } else {
  addRunDependency("memory initializer");
  Browser.asyncLoad(memoryInitializer, (function(data) {
   HEAPU8.set(data, STATIC_BASE);
   removeRunDependency("memory initializer");
  }), (function(data) {
   throw "could not load memory initializer " + memoryInitializer;
  }));
 }
}
function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"] && shouldRunNow) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};
Module["callMain"] = Module.callMain = function callMain(args) {
 assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
 assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
 args = args || [];
 ensureInitRuntime();
 var argc = args.length + 1;
 function pad() {
  for (var i = 0; i < 4 - 1; i++) {
   argv.push(0);
  }
 }
 var argv = [ allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL) ];
 pad();
 for (var i = 0; i < argc - 1; i = i + 1) {
  argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
  pad();
 }
 argv.push(0);
 argv = allocate(argv, "i32", ALLOC_NORMAL);
 initialStackTop = STACKTOP;
 try {
  var ret = Module["_main"](argc, argv, 0);
  exit(ret);
 } catch (e) {
  if (e instanceof ExitStatus) {
   return;
  } else if (e == "SimulateInfiniteLoop") {
   Module["noExitRuntime"] = true;
   return;
  } else {
   if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [ e, e.stack ]);
   throw e;
  }
 } finally {
  calledMain = true;
 }
};
function run(args) {
 args = args || Module["arguments"];
 if (preloadStartTime === null) preloadStartTime = Date.now();
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
   Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms");
  }
  if (Module["_main"] && shouldRunNow) {
   Module["callMain"](args);
  }
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout((function() {
   setTimeout((function() {
    Module["setStatus"]("");
   }), 1);
   doRun();
  }), 1);
 } else {
  doRun();
 }
}
Module["run"] = Module.run = run;
function exit(status) {
 if (Module["noExitRuntime"]) {
  return;
 }
 ABORT = true;
 EXITSTATUS = status;
 STACKTOP = initialStackTop;
 exitRuntime();
 if (ENVIRONMENT_IS_NODE) {
  process["stdout"]["once"]("drain", (function() {
   process["exit"](status);
  }));
  console.log(" ");
  setTimeout((function() {
   process["exit"](status);
  }), 500);
 } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
  quit(status);
 }
 throw new ExitStatus(status);
}
Module["exit"] = Module.exit = exit;
function abort(text) {
 if (text) {
  Module.print(text);
  Module.printErr(text);
 }
 ABORT = true;
 EXITSTATUS = 1;
 var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
 throw "abort() at " + stackTrace() + extra;
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
 shouldRunNow = false;
}
run();
function fromMatrix(mat) {
 var a = [];
 for (var i = 0; i < mat.nrows; i++) {
  a.push([]);
  for (var j = 0; j < mat.ncols; j++) {
   a[i][j] = mat.get(i, j);
  }
 }
 return a;
}
function fromVector(vec) {
 var v = [];
 for (var i = 0; i < vec.length; i++) {
  v.push(vec.get(i));
 }
 return v;
}
Module["svd"] = (function(arr) {
 var m = arr.length;
 var n = arr[0].length;
 var mat = new Module["Matrix"](m, n);
 for (var i = 0; i < m; i++) {
  for (var j = 0; j < n; j++) {
   mat.set(i, j, arr[i][j]);
  }
 }
 var ret = Module["_svd"](mat, m, n);
 var o = {};
 o.u = fromMatrix(ret.u);
 o.v = fromMatrix(ret.v);
 o.w = fromVector(ret.w);
 o.r = ret.r;
 return o;
});




