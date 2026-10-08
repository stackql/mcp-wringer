"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/isexe/windows.js
var require_windows = __commonJS({
  "node_modules/isexe/windows.js"(exports2, module2) {
    "use strict";
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function checkPathExt(path, options) {
      var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
      if (!pathext) {
        return true;
      }
      pathext = pathext.split(";");
      if (pathext.indexOf("") !== -1) {
        return true;
      }
      for (var i = 0; i < pathext.length; i++) {
        var p = pathext[i].toLowerCase();
        if (p && path.substr(-p.length).toLowerCase() === p) {
          return true;
        }
      }
      return false;
    }
    function checkStat(stat, path, options) {
      if (!stat.isSymbolicLink() && !stat.isFile()) {
        return false;
      }
      return checkPathExt(path, options);
    }
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, path, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), path, options);
    }
  }
});

// node_modules/isexe/mode.js
var require_mode = __commonJS({
  "node_modules/isexe/mode.js"(exports2, module2) {
    "use strict";
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), options);
    }
    function checkStat(stat, options) {
      return stat.isFile() && checkMode(stat, options);
    }
    function checkMode(stat, options) {
      var mod = stat.mode;
      var uid = stat.uid;
      var gid = stat.gid;
      var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
      var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
      var u = parseInt("100", 8);
      var g = parseInt("010", 8);
      var o = parseInt("001", 8);
      var ug = u | g;
      var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
      return ret;
    }
  }
});

// node_modules/isexe/index.js
var require_isexe = __commonJS({
  "node_modules/isexe/index.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var core;
    if (process.platform === "win32" || global.TESTING_WINDOWS) {
      core = require_windows();
    } else {
      core = require_mode();
    }
    module2.exports = isexe;
    isexe.sync = sync;
    function isexe(path, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (!cb) {
        if (typeof Promise !== "function") {
          throw new TypeError("callback not provided");
        }
        return new Promise(function(resolve5, reject) {
          isexe(path, options || {}, function(er, is) {
            if (er) {
              reject(er);
            } else {
              resolve5(is);
            }
          });
        });
      }
      core(path, options || {}, function(er, is) {
        if (er) {
          if (er.code === "EACCES" || options && options.ignoreErrors) {
            er = null;
            is = false;
          }
        }
        cb(er, is);
      });
    }
    function sync(path, options) {
      try {
        return core.sync(path, options || {});
      } catch (er) {
        if (options && options.ignoreErrors || er.code === "EACCES") {
          return false;
        } else {
          throw er;
        }
      }
    }
  }
});

// node_modules/which/which.js
var require_which = __commonJS({
  "node_modules/which/which.js"(exports2, module2) {
    "use strict";
    var isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
    var path = require("path");
    var COLON = isWindows ? ";" : ":";
    var isexe = require_isexe();
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, opt) => {
      const colon = opt.colon || COLON;
      const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
        "").split(colon)
      ];
      const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
      const pathExt = isWindows ? pathExtExe.split(colon) : [""];
      if (isWindows) {
        if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
          pathExt.unshift("");
      }
      return {
        pathEnv,
        pathExt,
        pathExtExe
      };
    };
    var which = (cmd, opt, cb) => {
      if (typeof opt === "function") {
        cb = opt;
        opt = {};
      }
      if (!opt)
        opt = {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      const step = (i) => new Promise((resolve5, reject) => {
        if (i === pathEnv.length)
          return opt.all && found.length ? resolve5(found) : reject(getNotFoundError(cmd));
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        resolve5(subStep(p, i, 0));
      });
      const subStep = (p, i, ii) => new Promise((resolve5, reject) => {
        if (ii === pathExt.length)
          return resolve5(step(i + 1));
        const ext = pathExt[ii];
        isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
          if (!er && is) {
            if (opt.all)
              found.push(p + ext);
            else
              return resolve5(p + ext);
          }
          return resolve5(subStep(p, i, ii + 1));
        });
      });
      return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
    };
    var whichSync = (cmd, opt) => {
      opt = opt || {};
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (let i = 0; i < pathEnv.length; i++) {
        const ppRaw = pathEnv[i];
        const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
        const pCmd = path.join(pathPart, cmd);
        const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
        for (let j = 0; j < pathExt.length; j++) {
          const cur = p + pathExt[j];
          try {
            const is = isexe.sync(cur, { pathExt: pathExtExe });
            if (is) {
              if (opt.all)
                found.push(cur);
              else
                return cur;
            }
          } catch (ex) {
          }
        }
      }
      if (opt.all && found.length)
        return found;
      if (opt.nothrow)
        return null;
      throw getNotFoundError(cmd);
    };
    module2.exports = which;
    which.sync = whichSync;
  }
});

// node_modules/path-key/index.js
var require_path_key = __commonJS({
  "node_modules/path-key/index.js"(exports2, module2) {
    "use strict";
    var pathKey = (options = {}) => {
      const environment = options.env || process.env;
      const platform = options.platform || process.platform;
      if (platform !== "win32") {
        return "PATH";
      }
      return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
    };
    module2.exports = pathKey;
    module2.exports.default = pathKey;
  }
});

// node_modules/cross-spawn/lib/util/resolveCommand.js
var require_resolveCommand = __commonJS({
  "node_modules/cross-spawn/lib/util/resolveCommand.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var which = require_which();
    var getPathKey = require_path_key();
    function resolveCommandAttempt(parsed, withoutPathExt) {
      const env = parsed.options.env || process.env;
      const cwd = process.cwd();
      const hasCustomCwd = parsed.options.cwd != null;
      const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
      if (shouldSwitchCwd) {
        try {
          process.chdir(parsed.options.cwd);
        } catch (err) {
        }
      }
      let resolved;
      try {
        resolved = which.sync(parsed.command, {
          path: env[getPathKey({ env })],
          pathExt: withoutPathExt ? path.delimiter : void 0
        });
      } catch (e) {
      } finally {
        if (shouldSwitchCwd) {
          process.chdir(cwd);
        }
      }
      if (resolved) {
        resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
      }
      return resolved;
    }
    function resolveCommand(parsed) {
      return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
    }
    module2.exports = resolveCommand;
  }
});

// node_modules/cross-spawn/lib/util/escape.js
var require_escape = __commonJS({
  "node_modules/cross-spawn/lib/util/escape.js"(exports2, module2) {
    "use strict";
    var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
    function escapeCommand(arg) {
      arg = arg.replace(metaCharsRegExp, "^$1");
      return arg;
    }
    function escapeArgument(arg, doubleEscapeMetaChars) {
      arg = `${arg}`;
      arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
      arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
      arg = `"${arg}"`;
      arg = arg.replace(metaCharsRegExp, "^$1");
      if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, "^$1");
      }
      return arg;
    }
    module2.exports.command = escapeCommand;
    module2.exports.argument = escapeArgument;
  }
});

// node_modules/shebang-regex/index.js
var require_shebang_regex = __commonJS({
  "node_modules/shebang-regex/index.js"(exports2, module2) {
    "use strict";
    module2.exports = /^#!(.*)/;
  }
});

// node_modules/shebang-command/index.js
var require_shebang_command = __commonJS({
  "node_modules/shebang-command/index.js"(exports2, module2) {
    "use strict";
    var shebangRegex = require_shebang_regex();
    module2.exports = (string2 = "") => {
      const match = string2.match(shebangRegex);
      if (!match) {
        return null;
      }
      const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
      const binary = path.split("/").pop();
      if (binary === "env") {
        return argument;
      }
      return argument ? `${binary} ${argument}` : binary;
    };
  }
});

// node_modules/cross-spawn/lib/util/readShebang.js
var require_readShebang = __commonJS({
  "node_modules/cross-spawn/lib/util/readShebang.js"(exports2, module2) {
    "use strict";
    var fs = require("fs");
    var shebangCommand = require_shebang_command();
    function readShebang(command) {
      const size = 150;
      const buffer = Buffer.alloc(size);
      let fd;
      try {
        fd = fs.openSync(command, "r");
        fs.readSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
      } catch (e) {
      }
      return shebangCommand(buffer.toString());
    }
    module2.exports = readShebang;
  }
});

// node_modules/cross-spawn/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cross-spawn/lib/parse.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var resolveCommand = require_resolveCommand();
    var escape2 = require_escape();
    var readShebang = require_readShebang();
    var isWin = process.platform === "win32";
    var isExecutableRegExp = /\.(?:com|exe)$/i;
    var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
    function detectShebang(parsed) {
      parsed.file = resolveCommand(parsed);
      const shebang = parsed.file && readShebang(parsed.file);
      if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        return resolveCommand(parsed);
      }
      return parsed.file;
    }
    function parseNonShell(parsed) {
      if (!isWin) {
        return parsed;
      }
      const commandFile = detectShebang(parsed);
      const needsShell = !isExecutableRegExp.test(commandFile);
      if (parsed.options.forceShell || needsShell) {
        const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
        parsed.command = path.normalize(parsed.command);
        parsed.command = escape2.command(parsed.command);
        parsed.args = parsed.args.map((arg) => escape2.argument(arg, needsDoubleEscapeMetaChars));
        const shellCommand = [parsed.command].concat(parsed.args).join(" ");
        parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true;
      }
      return parsed;
    }
    function parse(command, args, options) {
      if (args && !Array.isArray(args)) {
        options = args;
        args = null;
      }
      args = args ? args.slice(0) : [];
      options = Object.assign({}, options);
      const parsed = {
        command,
        args,
        options,
        file: void 0,
        original: {
          command,
          args
        }
      };
      return options.shell ? parsed : parseNonShell(parsed);
    }
    module2.exports = parse;
  }
});

// node_modules/cross-spawn/lib/enoent.js
var require_enoent = __commonJS({
  "node_modules/cross-spawn/lib/enoent.js"(exports2, module2) {
    "use strict";
    var isWin = process.platform === "win32";
    function notFoundError(original, syscall) {
      return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
        code: "ENOENT",
        errno: "ENOENT",
        syscall: `${syscall} ${original.command}`,
        path: original.command,
        spawnargs: original.args
      });
    }
    function hookChildProcess(cp, parsed) {
      if (!isWin) {
        return;
      }
      const originalEmit = cp.emit;
      cp.emit = function(name, arg1) {
        if (name === "exit") {
          const err = verifyENOENT(arg1, parsed);
          if (err) {
            return originalEmit.call(cp, "error", err);
          }
        }
        return originalEmit.apply(cp, arguments);
      };
    }
    function verifyENOENT(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
      }
      return null;
    }
    function verifyENOENTSync(status, parsed) {
      if (isWin && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawnSync");
      }
      return null;
    }
    module2.exports = {
      hookChildProcess,
      verifyENOENT,
      verifyENOENTSync,
      notFoundError
    };
  }
});

// node_modules/cross-spawn/index.js
var require_cross_spawn = __commonJS({
  "node_modules/cross-spawn/index.js"(exports2, module2) {
    "use strict";
    var cp = require("child_process");
    var parse = require_parse();
    var enoent = require_enoent();
    function spawn(command, args, options) {
      const parsed = parse(command, args, options);
      const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
      enoent.hookChildProcess(spawned, parsed);
      return spawned;
    }
    function spawnSync(command, args, options) {
      const parsed = parse(command, args, options);
      const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
      result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
      return result;
    }
    module2.exports = spawn;
    module2.exports.spawn = spawn;
    module2.exports.sync = spawnSync;
    module2.exports._parse = parse;
    module2.exports._enoent = enoent;
  }
});

// node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/ajv/dist/compile/codegen/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.regexpCode = exports2.getEsmExportName = exports2.getProperty = exports2.safeStringify = exports2.stringify = exports2.strConcat = exports2.addCodeArg = exports2.str = exports2._ = exports2.nil = exports2._Code = exports2.Name = exports2.IDENTIFIER = exports2._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports2._CodeOrName = _CodeOrName;
    exports2.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s) {
        super();
        if (!exports2.IDENTIFIER.test(s))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports2.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
          if (c instanceof Name)
            names[c.str] = (names[c.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports2._Code = _Code;
    exports2.nil = new _Code("");
    function _(strs, ...args) {
      const code = [strs[0]];
      let i = 0;
      while (i < args.length) {
        addCodeArg(code, args[i]);
        code.push(strs[++i]);
      }
      return new _Code(code);
    }
    exports2._ = _;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify2(strs[0])];
      let i = 0;
      while (i < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i]);
        expr.push(plus, safeStringify2(strs[++i]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports2.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports2.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i = 1;
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1]);
          if (res !== void 0) {
            expr.splice(i - 1, 3, res);
            continue;
          }
          expr[i++] = "+";
        }
        i++;
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""')
        return a;
      if (a === '""')
        return b;
      if (typeof a == "string") {
        if (b instanceof Name || a[a.length - 1] !== '"')
          return;
        if (typeof b != "string")
          return `${a.slice(0, -1)}${b}"`;
        if (b[0] === '"')
          return a.slice(0, -1) + b.slice(1);
        return;
      }
      if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
        return `"${a}${b.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
    }
    exports2.strConcat = strConcat;
    function interpolate(x) {
      return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify2(Array.isArray(x) ? x.join(",") : x);
    }
    function stringify2(x) {
      return new _Code(safeStringify2(x));
    }
    exports2.stringify = stringify2;
    function safeStringify2(x) {
      return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports2.safeStringify = safeStringify2;
    function getProperty(key) {
      return typeof key == "string" && exports2.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
    }
    exports2.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports2.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports2.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports2.regexpCode = regexpCode;
  }
});

// node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/ajv/dist/compile/codegen/scope.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueScope = exports2.ValueScopeName = exports2.Scope = exports2.varKinds = exports2.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports2.UsedValueState = UsedValueState = {}));
    exports2.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports2.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports2.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s.length;
        s[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c = valueCode(name);
            if (c) {
              const def = this.opts.es5 ? exports2.varKinds.var : exports2.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
            } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports2.ValueScope = ValueScope;
  }
});

// node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/ajv/dist/compile/codegen/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.or = exports2.and = exports2.not = exports2.CodeGen = exports2.operators = exports2.varKinds = exports2.ValueScopeName = exports2.ValueScope = exports2.Scope = exports2.Name = exports2.regexpCode = exports2.stringify = exports2.getProperty = exports2.nil = exports2.strConcat = exports2.str = exports2._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports2, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports2, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports2, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports2, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports2, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports2, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports2, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports2.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n) => code + n.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i].optimizeNodes();
          if (Array.isArray(n))
            nodes.splice(i, 1, ...n);
          else if (n)
            nodes[i] = n;
          else
            nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i];
          if (n.optimizeNames(names, constants))
            continue;
          subtractNames(names, n.names);
          nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e = this.else;
        if (e) {
          const ns = e.optimizeNodes();
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e) {
          if (cond === false)
            return e instanceof _If ? e : e.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e instanceof _If ? [e] : e.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant2) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant2)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports2.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == "function")
          c();
        else if (c !== code_1.nil)
          this._leafNode(new AnyCode(c));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
            this.var(name, (0, code_1._)`${arr}[${i}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode;
        if (n instanceof N1 || N2 && n instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n = this._currNode;
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports2.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) + (from[n] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name)
          c = replaceName(c);
        if (c instanceof code_1._Code)
          items.push(...c._items);
        else
          items.push(c);
        return items;
      }, []));
      function replaceName(n) {
        const c = constants[n.str];
        if (c === void 0 || names[n.str] !== 1)
          return n;
        delete names[n.str];
        return c;
      }
      function canOptimize(e) {
        return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) - (from[n] || 0);
    }
    function not(x) {
      return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
    }
    exports2.not = not;
    var andCode = mappend(exports2.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports2.and = and;
    var orCode = mappend(exports2.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports2.or = or;
    function mappend(op) {
      return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
    }
    function par(x) {
      return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
    }
  }
});

// node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/ajv/dist/compile/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkStrictMode = exports2.getErrorPath = exports2.Type = exports2.useFunc = exports2.setEvaluated = exports2.evaluatedPropsToName = exports2.mergeEvaluated = exports2.eachItem = exports2.unescapeJsonPointer = exports2.escapeJsonPointer = exports2.escapeFragment = exports2.unescapeFragment = exports2.schemaRefOrVal = exports2.schemaHasRulesButRef = exports2.schemaHasRules = exports2.checkUnknownRules = exports2.alwaysValidSchema = exports2.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports2.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports2.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports2.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports2.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports2.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports2.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports2.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports2.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports2.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports2.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    exports2.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports2.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports2.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    exports2.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    exports2.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports2.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports2.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports2.checkStrictMode = checkStrictMode;
  }
});

// node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/ajv/dist/compile/names.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports2.default = names;
  }
});

// node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "node_modules/ajv/dist/compile/errors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendErrors = exports2.resetErrorsCount = exports2.reportExtraError = exports2.reportError = exports2.keyword$DataError = exports2.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports2.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports2.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports2.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports2.reportError = reportError;
    function reportExtraError(cxt, error = exports2.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports2.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports2.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports2.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E.propertyName, propertyName]);
    }
  }
});

// node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/ajv/dist/compile/validate/boolSchema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.boolOrEmptySchema = exports2.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports2.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports2.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/ajv/dist/compile/rules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getRules = exports2.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    exports2.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports2.getRules = getRules;
  }
});

// node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/ajv/dist/compile/validate/applicability.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.shouldUseRule = exports2.shouldUseGroup = exports2.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports2.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports2.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports2.shouldUseRule = shouldUseRule;
  }
});

// node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/ajv/dist/compile/validate/dataType.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.reportTypeError = exports2.checkDataTypes = exports2.checkDataType = exports2.coerceAndCheckDataType = exports2.getJSONTypes = exports2.getSchemaTypes = exports2.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports2.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports2.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports2.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports2.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports2.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    exports2.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports2.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/ajv/dist/compile/validate/defaults.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    exports2.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateUnion = exports2.validateArray = exports2.usePattern = exports2.callValidateCode = exports2.schemaProperties = exports2.allSchemaProperties = exports2.noPropertyInData = exports2.propertyInData = exports2.isOwnProperty = exports2.hasPropFunc = exports2.reportMissingProp = exports2.checkMissingProp = exports2.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports2.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports2.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports2.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports2.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports2.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports2.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports2.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    exports2.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    exports2.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports2.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
      });
    }
    exports2.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports2.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports2.validateUnion = validateUnion;
  }
});

// node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/ajv/dist/compile/validate/keyword.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateKeywordUsage = exports2.validSchemaType = exports2.funcKeywordCode = exports2.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports2.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports2.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports2.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports2.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/ajv/dist/compile/validate/subschema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendSubschemaMode = exports2.extendSubschemaData = exports2.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports2.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports2.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports2.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/json-schema-traverse/index.js"(exports2, module2) {
    "use strict";
    var traverse = module2.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/ajv/dist/compile/resolve.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getSchemaRefs = exports2.resolveUrl = exports2.normalizeId = exports2._getFullPath = exports2.getFullPath = exports2.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports2.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p = resolver.parse(id);
      return _getFullPath(resolver, p);
    }
    exports2.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    exports2._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports2.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports2.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports2.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/ajv/dist/compile/validate/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getData = exports2.KeywordCxt = exports2.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports2.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports2.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports2.getData = getData;
  }
});

// node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/ajv/dist/runtime/validation_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports2.default = ValidationError;
  }
});

// node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/ajv/dist/compile/ref_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports2.default = MissingRefError;
  }
});

// node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/ajv/dist/compile/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveSchema = exports2.getCompilingSchema = exports2.resolveRef = exports2.compileSchema = exports2.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports2.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports2.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve5.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports2.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports2.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve5(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    exports2.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/ajv/dist/refs/data.json"(exports2, module2) {
    module2.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/fast-uri/lib/utils.js"(exports2, module2) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isPort = RegExp.prototype.test.bind(/^\d*$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
    var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
    var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
    var BYTE_HEX = new Array(256);
    {
      const HEX_DIGITS = "0123456789ABCDEF";
      for (let i = 0; i < 256; i++) {
        BYTE_HEX[i] = "%" + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 15];
      }
    }
    function percentEncodeNonAscii(cp) {
      if (cp < 2048) {
        return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
      }
      if (cp < 65536) {
        return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
      }
      return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
    }
    function stringArrayToHexStripped(input2) {
      let acc = "";
      let code = 0;
      let i = 0;
      for (i = 0; i < input2.length; i++) {
        code = input2[i].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input2[i];
        break;
      }
      for (i += 1; i < input2.length; i++) {
        code = input2[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input2[i];
      }
      return acc;
    }
    var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
    var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
    var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function isZoneIdentifier(zone) {
      if (zone.length === 0) return false;
      for (let i = 0; i < zone.length; i++) {
        if (isZoneCharacter(zone[i])) continue;
        if (zone[i] === "%" && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
          i += 2;
          continue;
        }
        return false;
      }
      return true;
    }
    function compressIPv6ZeroRun(hextets) {
      let bestStart = -1;
      let bestLength = 0;
      let runStart = -1;
      let runLength = 0;
      for (let i = 0; i < hextets.length; i++) {
        if (hextets[i] === "0") {
          if (runStart === -1) runStart = i;
          runLength++;
          if (runLength > bestLength) {
            bestLength = runLength;
            bestStart = runStart;
          }
        } else {
          runStart = -1;
          runLength = 0;
        }
      }
      if (bestLength < 2) return hextets.join(":");
      const head = hextets.slice(0, bestStart).join(":");
      const tail = hextets.slice(bestStart + bestLength).join(":");
      return head + "::" + tail;
    }
    function normalizeIPv6Address(input2) {
      const compression = input2.indexOf("::");
      if (compression !== -1 && input2.indexOf("::", compression + 1) !== -1) return void 0;
      const left = compression === -1 ? input2.split(":") : input2.slice(0, compression).split(":");
      const right = compression === -1 ? [] : input2.slice(compression + 2).split(":");
      if (compression !== -1) {
        if (left.length === 1 && left[0] === "") left.length = 0;
        if (right.length === 1 && right[0] === "") right.length = 0;
      }
      const parts = left.concat(right);
      let hextetCount = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "") return void 0;
        if (part.indexOf(".") !== -1) {
          if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
          hextetCount += 2;
          continue;
        }
        if (!isHextet(part)) return void 0;
        parts[i] = parseInt(part, 16).toString(16);
        hextetCount++;
      }
      if (compression === -1) {
        if (hextetCount !== 8) return void 0;
        return compressIPv6ZeroRun(parts);
      }
      if (hextetCount >= 8) return void 0;
      const expanded = parts.slice(0, left.length);
      for (let i = hextetCount; i < 8; i++) expanded.push("0");
      for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
      return compressIPv6ZeroRun(expanded);
    }
    function normalizeIPv6(host) {
      const bracketed = host[0] === "[" && host[host.length - 1] === "]";
      const hasBracket = host[0] === "[" || host[host.length - 1] === "]";
      if (hasBracket && !bracketed) return { host, isIPV6: false, error: true };
      let input2 = bracketed ? host.slice(1, -1) : host;
      if (bracketed && isIPvFuture(input2)) {
        input2 = input2.toLowerCase();
        return { host: `[${input2}]`, escapedHost: input2, isIPV6: false, isIPVFuture: true };
      }
      if (findToken(input2, ":") < 2) {
        return { host, isIPV6: false, error: bracketed };
      }
      let zoneIdentifier = "";
      const zoneSeparator = input2.indexOf("%");
      if (zoneSeparator !== -1) {
        const separatorLength = input2.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
        zoneIdentifier = input2.slice(zoneSeparator + separatorLength);
        if (!isZoneIdentifier(zoneIdentifier)) return { host, isIPV6: false, error: true };
        input2 = input2.slice(0, zoneSeparator);
      }
      const address = normalizeIPv6Address(input2);
      if (address === void 0) return { host, isIPV6: false, error: true };
      return {
        host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
        escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
        isIPV6: true
      };
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path) {
      let input2 = path;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input2.length) {
        if (len === 1) {
          if (input2 === ".") {
            break;
          } else if (input2 === "/") {
            output.push("/");
            break;
          } else {
            output.push(input2);
            break;
          }
        } else if (len === 2) {
          if (input2[0] === ".") {
            if (input2[1] === ".") {
              break;
            } else if (input2[1] === "/") {
              input2 = input2.slice(2);
              continue;
            }
          } else if (input2[0] === "/") {
            if (input2[1] === "." || input2[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input2 === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input2[0] === ".") {
          if (input2[1] === ".") {
            if (input2[2] === "/") {
              input2 = input2.slice(3);
              continue;
            }
          } else if (input2[1] === "/") {
            input2 = input2.slice(2);
            continue;
          }
        } else if (input2[0] === "/") {
          if (input2[1] === ".") {
            if (input2[2] === "/") {
              input2 = input2.slice(2);
              continue;
            } else if (input2[2] === ".") {
              if (input2[3] === "/") {
                input2 = input2.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input2.indexOf("/", 1)) === -1) {
          output.push(input2);
          break;
        } else {
          output.push(input2.slice(0, nextSlash));
          input2 = input2.slice(nextSlash);
        }
      }
      return output.join("");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input2, decodeUnreserved = false) {
      if (input2.indexOf("%") === -1) {
        return input2;
      }
      let output = "";
      for (let i = 0; i < input2.length; i++) {
        if (input2[i] === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        output += input2[i];
      }
      return output;
    }
    function normalizePathEncoding(input2) {
      let output = "";
      for (let i = 0; i < input2.length; i++) {
        const ch = input2[i];
        if (ch === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isPathCharacter(ch)) {
          output += ch;
        } else {
          const code = input2.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input2.length) {
            const low = input2.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function serializePathEncoding(input2, pathNoScheme = false) {
      let output = "";
      let firstSegment = pathNoScheme && input2[0] !== "/";
      for (let i = 0; i < input2.length; i++) {
        const ch = input2[i];
        if (ch === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (ch === "/") {
          firstSegment = false;
        }
        if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) {
          output += ch;
        } else {
          const code = input2.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input2.length) {
            const low = input2.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeComponent(input2, isAllowed) {
      let output = "";
      for (let i = 0; i < input2.length; i++) {
        const ch = input2[i];
        if (ch === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (isAllowed(ch)) {
          output += ch;
        } else {
          const code = input2.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input2.length) {
            const low = input2.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeUserinfo(input2) {
      return encodeComponent(input2, isUserinfoCharacter);
    }
    function encodeQuery(input2) {
      return encodeComponent(input2, isQueryFragmentCharacter);
    }
    function encodeFragment(input2) {
      return encodeComponent(input2, isQueryFragmentCharacter);
    }
    function isEscapeSafe(cp) {
      return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
    }
    function normalizeQueryFragmentEncoding(input2) {
      let output = "";
      for (let i = 0; i < input2.length; i++) {
        const ch = input2[i];
        if (ch === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isQueryFragmentCharacter(ch)) {
          output += ch;
        } else {
          const code = input2.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input2.length) {
            const low = input2.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function escapePreservingEscapes(input2) {
      let output = "";
      for (let i = 0; i < input2.length; i++) {
        if (input2[i] === "%" && i + 2 < input2.length) {
          const hex = input2.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        output += escape(input2[i]);
      }
      return output;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(encodeUserinfo(component.userinfo));
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = component.host;
        if (!isIPv4(host)) {
          let ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
            host = normalizePercentEncoding(host, true);
            ipV6res = normalizeIPv6(host);
          }
          if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        const port = String(component.port);
        if (!isPort(port)) {
          throw new TypeError("URI port is malformed.");
        }
        uriTokens.push(":");
        uriTokens.push(port);
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module2.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      serializePathEncoding,
      normalizeQueryFragmentEncoding,
      encodeUserinfo,
      encodeQuery,
      encodeFragment,
      escapePreservingEscapes,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/fast-uri/lib/schemes.js"(exports2, module2) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const queryIndex = wsComponent.resourceName.indexOf("?");
        const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
        wsComponent.path = path && path !== "/" ? path : void 0;
        wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches && matches[0] === urnComponent.path) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http2 = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https2 = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http2.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http: http2,
        https: https2,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module2.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/fast-uri/index.js"(exports2, module2) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
    var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
    function decodeValidScheme(scheme) {
      const decodedScheme = unescape(String(scheme));
      if (!VALID_SCHEME.test(decodedScheme)) {
        throw new TypeError(MALFORMED_SCHEME_ERROR);
      }
      return decodedScheme;
    }
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve5(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const {
        parsed: baseParsed,
        malformedAuthorityOrPort: baseMalformed,
        malformedPercentEncoding: baseMalformedPercentEncoding,
        malformedSchemeSpecific: baseMalformedSchemeSpecific,
        malformedHost: baseMalformedHost,
        malformedScheme: baseMalformedScheme
      } = parseWithStatus(baseURI, schemelessOptions);
      const {
        parsed: relativeParsed,
        malformedAuthorityOrPort: relativeMalformed,
        malformedPercentEncoding: relativeMalformedPercentEncoding,
        malformedSchemeSpecific: relativeMalformedSchemeSpecific,
        malformedHost: relativeMalformedHost,
        malformedScheme: relativeMalformedScheme
      } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
      const resolvedHost = resolved.host;
      const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
      canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
      const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !new RegExp("\\P{ASCII}", "u").test(resolvedHost);
      if (resolved.error && !encodedASCIIHost) {
        throw new Error(resolved.error);
      }
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      if (component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
      }
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
      const pathNoScheme = !options.skipEscape && component.scheme === void 0 && !hasAuthority;
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = serializePathEncoding(component.path, pathNoScheme);
        } else {
          component.path = normalizePercentEncoding(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (pathNoScheme) {
          s = serializePathEncoding(s, true);
        }
        if (authority === void 0 && s[0] === "/" && s[1] === "/") {
          s = "/%2F" + s.slice(2);
        }
        uriTokens.push(s);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", encodeQuery(component.query));
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", encodeFragment(component.fragment));
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function hasMalformedPercentEncoding(component) {
      if (component === void 0) return false;
      let percent = component.indexOf("%");
      while (percent !== -1) {
        if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
          return true;
        }
        percent = component.indexOf("%", percent + 3);
      }
      return false;
    }
    function isIPLiteral(host) {
      return host[0] === "[" && host[host.length - 1] === "]";
    }
    function hasMalformedComponentPercentEncoding(matches) {
      const host = matches[4];
      return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
    }
    function canonicalizeHost(parsed, options, schemeHandler, isIP) {
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
          parsed.host = new URL("http://" + parsed.host).hostname;
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
          return true;
        }
      }
      return false;
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let malformedPercentEncoding = false;
      let malformedSchemeSpecific = false;
      let malformedHost = false;
      let malformedIPLiteral = false;
      let malformedScheme = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (parsed.scheme !== void 0) {
          const decodedScheme = unescape(parsed.scheme);
          if (VALID_SCHEME.test(decodedScheme)) {
            parsed.scheme = decodedScheme.toLowerCase();
          } else {
            parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
            malformedScheme = true;
          }
        }
        malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
        if (malformedPercentEncoding) {
          parsed.error = parsed.error || "URI contains malformed percent-encoding.";
        }
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const bracketedIPLiteral = isIPLiteral(parsed.host);
            const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
            const ipv6result = normalizeIPv6(parsed.host);
            isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
            malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
            parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
            if (malformedIPLiteral) {
              parsed.error = parsed.error || "URI host is malformed.";
              malformedAuthorityOrPort = true;
            }
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!malformedIPLiteral) {
          malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
        }
        if (uri.indexOf("%") !== -1 && parsed.host !== void 0 && !malformedIPLiteral) {
          let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
          if (!isIP) {
            host = normalizePercentEncoding(host.toLowerCase());
          }
          parsed.host = reescapeHostDelimiters(host, isIP);
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.query) {
            parsed.query = normalizeQueryFragmentEncoding(parsed.query);
          }
          if (parsed.fragment) {
            parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
          if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) {
            malformedSchemeSpecific = true;
          }
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme };
    }
    function parse(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri !== "string" && typeof uri !== "object") {
        return void 0;
      }
      let value;
      try {
        value = typeof uri === "string" ? uri : serialize(uri, opts);
      } catch {
        return void 0;
      }
      const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
      return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve: resolve5,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module2.exports = fastUri;
    module2.exports.default = fastUri;
    module2.exports.fastUri = fastUri;
  }
});

// node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/ajv/dist/runtime/uri.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports2.default = uri;
  }
});

// node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/ajv/dist/core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s = o.strict;
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v;
        if (typeof schemaKeyRef == "string") {
          v = this.getSchema(schemaKeyRef);
          if (!v)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v = this.compile(schemaKeyRef);
        }
        const valid = v(data);
        if (!("$async" in v))
          this.errors = v.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e) {
            if (!(e instanceof ref_error_1.default))
              throw e;
            checkLoaded.call(this, e);
            await loadMissingSchema.call(this, e.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p = this._loading[ref];
          if (p)
            return p;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions) {
        for (const def of definitions)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i >= 0)
            group.rules.splice(i, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas2, regex) {
        for (const keyRef in schemas2) {
          const sch = schemas2[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas2[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas2[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv.ValidationError = validation_error_1.default;
    Ajv.MissingRefError = ref_error_1.default;
    exports2.default = Ajv;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/ref.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.callRef = exports2.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports2.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports2.callRef = callRef;
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports2.default = core;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports2.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/required.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports2.default = equal;
  }
});

// node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/const.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/enum.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports2.default = validation;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
          cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports2.validateAdditionalItems = validateAdditionalItems;
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports2.validateTuple = validateTuple;
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateSchemaDeps = exports2.validatePropertyDeps = exports2.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports2.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports2.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports2.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports2.validateSchemaDeps = validateSchemaDeps;
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/not.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/if.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports2.default = getApplicator;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js
var require_dynamicAnchor = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.dynamicAnchor = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicAnchor",
      schemaType: "string",
      code: (cxt) => dynamicAnchor(cxt, cxt.schema)
    };
    function dynamicAnchor(cxt, anchor) {
      const { gen, it } = cxt;
      it.schemaEnv.root.dynamicAnchors[anchor] = true;
      const v = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
      const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
      gen.if((0, codegen_1._)`!${v}`, () => gen.assign(v, validate));
    }
    exports2.dynamicAnchor = dynamicAnchor;
    function _getValidate(cxt) {
      const { schemaEnv, schema, self } = cxt.it;
      const { root, baseId, localRefs, meta } = schemaEnv.root;
      const { schemaId } = self.opts;
      const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
      compile_1.compileSchema.call(self, sch);
      return (0, ref_1.getValidate)(cxt, sch);
    }
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js
var require_dynamicRef = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.dynamicRef = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicRef",
      schemaType: "string",
      code: (cxt) => dynamicRef(cxt, cxt.schema)
    };
    function dynamicRef(cxt, ref) {
      const { gen, keyword, it } = cxt;
      if (ref[0] !== "#")
        throw new Error(`"${keyword}" only supports hash fragment reference`);
      const anchor = ref.slice(1);
      if (it.allErrors) {
        _dynamicRef();
      } else {
        const valid = gen.let("valid", false);
        _dynamicRef(valid);
        cxt.ok(valid);
      }
      function _dynamicRef(valid) {
        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
          const v = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
          gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
        } else {
          _callRef(it.validateName, valid)();
        }
      }
      function _callRef(validate, valid) {
        return valid ? () => gen.block(() => {
          (0, ref_1.callRef)(cxt, validate);
          gen.let(valid, true);
        }) : () => (0, ref_1.callRef)(cxt, validate);
      }
    }
    exports2.dynamicRef = dynamicRef;
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js
var require_recursiveAnchor = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var util_1 = require_util();
    var def = {
      keyword: "$recursiveAnchor",
      schemaType: "boolean",
      code(cxt) {
        if (cxt.schema)
          (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
        else
          (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js
var require_recursiveRef = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicRef_1 = require_dynamicRef();
    var def = {
      keyword: "$recursiveRef",
      schemaType: "string",
      code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/index.js
var require_dynamic = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var dynamicRef_1 = require_dynamicRef();
    var recursiveAnchor_1 = require_recursiveAnchor();
    var recursiveRef_1 = require_recursiveRef();
    var dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
    exports2.default = dynamic;
  }
});

// node_modules/ajv/dist/vocabularies/validation/dependentRequired.js
var require_dependentRequired = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/dependentRequired.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentRequired",
      type: "object",
      schemaType: "object",
      error: dependencies_1.error,
      code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js
var require_dependentSchemas = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentSchemas",
      type: "object",
      schemaType: "object",
      code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitContains.js
var require_limitContains = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitContains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["maxContains", "minContains"],
      type: "array",
      schemaType: "number",
      code({ keyword, parentSchema, it }) {
        if (parentSchema.contains === void 0) {
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/next.js
var require_next = __commonJS({
  "node_modules/ajv/dist/vocabularies/next.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependentRequired_1 = require_dependentRequired();
    var dependentSchemas_1 = require_dependentSchemas();
    var limitContains_1 = require_limitContains();
    var next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
    exports2.default = next;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
var require_unevaluatedProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var error = {
      message: "must NOT have unevaluated properties",
      params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
    };
    var def = {
      keyword: "unevaluatedProperties",
      type: "object",
      schemaType: ["boolean", "object"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1.Name) {
          gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        } else if (props !== true) {
          gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
        }
        it.props = true;
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
          if (schema === false) {
            cxt.setParams({ unevaluatedProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (!(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            cxt.subschema({
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str
            }, valid);
            if (!allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
          return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
          const ps = [];
          for (const p in evaluatedProps) {
            if (evaluatedProps[p] === true)
              ps.push((0, codegen_1._)`${key} !== ${p}`);
          }
          return (0, codegen_1.and)(...ps);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
var require_unevaluatedItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "unevaluatedItems",
      type: "array",
      schemaType: ["boolean", "object"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        const items = it.items || 0;
        if (items === true)
          return;
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        if (schema === false) {
          cxt.setParams({ len: items });
          cxt.fail((0, codegen_1._)`${len} > ${items}`);
        } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
          gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
          cxt.ok(valid);
        }
        it.items = true;
        function validateItems(valid, from) {
          gen.forRange("i", from, len, (i) => {
            cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1.Type.Num }, valid);
            if (!it.allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/index.js
var require_unevaluated = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var unevaluatedProperties_1 = require_unevaluatedProperties();
    var unevaluatedItems_1 = require_unevaluatedItems();
    var unevaluated = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
    exports2.default = unevaluated;
  }
});

// node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/format.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports2.default = format;
  }
});

// node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/ajv/dist/vocabularies/metadata.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.contentVocabulary = exports2.metadataVocabulary = void 0;
    exports2.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports2.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/ajv/dist/vocabularies/draft2020.js
var require_draft2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/draft2020.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var dynamic_1 = require_dynamic();
    var next_1 = require_next();
    var unevaluated_1 = require_unevaluated();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft2020Vocabularies = [
      dynamic_1.default,
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(true),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary,
      next_1.default,
      unevaluated_1.default
    ];
    exports2.default = draft2020Vocabularies;
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports2.DiscrError = DiscrError = {}));
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf.length; i++) {
            let sch = oneOf[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/schema.json
var require_schema = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/schema.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true,
        "https://json-schema.org/draft/2020-12/vocab/applicator": true,
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
        "https://json-schema.org/draft/2020-12/vocab/validation": true,
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Core and Validation specifications meta-schema",
      allOf: [
        { $ref: "meta/core" },
        { $ref: "meta/applicator" },
        { $ref: "meta/unevaluated" },
        { $ref: "meta/validation" },
        { $ref: "meta/meta-data" },
        { $ref: "meta/format-annotation" },
        { $ref: "meta/content" }
      ],
      type: ["object", "boolean"],
      $comment: "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
      properties: {
        definitions: {
          $comment: '"definitions" has been replaced by "$defs".',
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          deprecated: true,
          default: {}
        },
        dependencies: {
          $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
          type: "object",
          additionalProperties: {
            anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }]
          },
          deprecated: true,
          default: {}
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          $ref: "meta/core#/$defs/anchorString",
          deprecated: true
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          $ref: "meta/core#/$defs/uriReferenceString",
          deprecated: true
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json
var require_applicator2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/applicator",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/applicator": true
      },
      $dynamicAnchor: "meta",
      title: "Applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        prefixItems: { $ref: "#/$defs/schemaArray" },
        items: { $dynamicRef: "#meta" },
        contains: { $dynamicRef: "#meta" },
        additionalProperties: { $dynamicRef: "#meta" },
        properties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependentSchemas: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        propertyNames: { $dynamicRef: "#meta" },
        if: { $dynamicRef: "#meta" },
        then: { $dynamicRef: "#meta" },
        else: { $dynamicRef: "#meta" },
        allOf: { $ref: "#/$defs/schemaArray" },
        anyOf: { $ref: "#/$defs/schemaArray" },
        oneOf: { $ref: "#/$defs/schemaArray" },
        not: { $dynamicRef: "#meta" }
      },
      $defs: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $dynamicRef: "#meta" }
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
var require_unevaluated2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true
      },
      $dynamicAnchor: "meta",
      title: "Unevaluated applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        unevaluatedItems: { $dynamicRef: "#meta" },
        unevaluatedProperties: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json
var require_content = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/content",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Content vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        contentEncoding: { type: "string" },
        contentMediaType: { type: "string" },
        contentSchema: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json
var require_core3 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/core",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true
      },
      $dynamicAnchor: "meta",
      title: "Core vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        $id: {
          $ref: "#/$defs/uriReferenceString",
          $comment: "Non-empty fragments not allowed.",
          pattern: "^[^#]*#?$"
        },
        $schema: { $ref: "#/$defs/uriString" },
        $ref: { $ref: "#/$defs/uriReferenceString" },
        $anchor: { $ref: "#/$defs/anchorString" },
        $dynamicRef: { $ref: "#/$defs/uriReferenceString" },
        $dynamicAnchor: { $ref: "#/$defs/anchorString" },
        $vocabulary: {
          type: "object",
          propertyNames: { $ref: "#/$defs/uriString" },
          additionalProperties: {
            type: "boolean"
          }
        },
        $comment: {
          type: "string"
        },
        $defs: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" }
        }
      },
      $defs: {
        anchorString: {
          type: "string",
          pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
        },
        uriString: {
          type: "string",
          format: "uri"
        },
        uriReferenceString: {
          type: "string",
          format: "uri-reference"
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json
var require_format_annotation = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true
      },
      $dynamicAnchor: "meta",
      title: "Format vocabulary meta-schema for annotation results",
      type: ["object", "boolean"],
      properties: {
        format: { type: "string" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
var require_meta_data = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true
      },
      $dynamicAnchor: "meta",
      title: "Meta-data vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        deprecated: {
          type: "boolean",
          default: false
        },
        readOnly: {
          type: "boolean",
          default: false
        },
        writeOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json
var require_validation2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/validation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/validation": true
      },
      $dynamicAnchor: "meta",
      title: "Validation vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        type: {
          anyOf: [
            { $ref: "#/$defs/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/$defs/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        const: true,
        enum: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/$defs/nonNegativeInteger" },
        minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        maxItems: { $ref: "#/$defs/nonNegativeInteger" },
        minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        maxContains: { $ref: "#/$defs/nonNegativeInteger" },
        minContains: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 1
        },
        maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
        minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        required: { $ref: "#/$defs/stringArray" },
        dependentRequired: {
          type: "object",
          additionalProperties: {
            $ref: "#/$defs/stringArray"
          }
        }
      },
      $defs: {
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 0
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/index.js
var require_json_schema_2020_12 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var metaSchema = require_schema();
    var applicator = require_applicator2();
    var unevaluated = require_unevaluated2();
    var content = require_content();
    var core = require_core3();
    var format = require_format_annotation();
    var metadata = require_meta_data();
    var validation = require_validation2();
    var META_SUPPORT_DATA = ["/properties"];
    function addMetaSchema2020($data) {
      ;
      [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation)
      ].forEach((sch) => this.addMetaSchema(sch, void 0, false));
      return this;
      function with$data(ajv2, sch) {
        return $data ? ajv2.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
      }
    }
    exports2.default = addMetaSchema2020;
  }
});

// node_modules/ajv/dist/2020.js
var require__ = __commonJS({
  "node_modules/ajv/dist/2020.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MissingRefError = exports2.ValidationError = exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = exports2.Ajv2020 = void 0;
    var core_1 = require_core();
    var draft2020_1 = require_draft2020();
    var discriminator_1 = require_discriminator();
    var json_schema_2020_12_1 = require_json_schema_2020_12();
    var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
    var Ajv20203 = class extends core_1.default {
      constructor(opts = {}) {
        super({
          ...opts,
          dynamicRef: true,
          next: true,
          unevaluated: true
        });
      }
      _addVocabularies() {
        super._addVocabularies();
        draft2020_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        const { $data, meta } = this.opts;
        if (!meta)
          return;
        json_schema_2020_12_1.default.call(this, $data);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports2.Ajv2020 = Ajv20203;
    module2.exports = exports2 = Ajv20203;
    module2.exports.Ajv2020 = Ajv20203;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = Ajv20203;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports2, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports2, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// src/action/index.ts
var import_node_crypto4 = require("crypto");
var import_promises8 = require("fs/promises");
var import_node_path8 = require("path");

// src/core/errors.ts
var WringerError = class extends Error {
  code;
  constructor(code, message, options) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
};
var RegistryError = class extends WringerError {
  constructor(message) {
    super("REGISTRY_ERROR", message);
  }
};
var ScenarioError = class extends WringerError {
  constructor(message) {
    super("SCENARIO_ERROR", message);
  }
};
var TargetError = class extends WringerError {
  constructor(message, options) {
    super("TARGET_ERROR", message, options);
  }
};
var TransportError = class extends WringerError {
  constructor(message, options) {
    super("TRANSPORT_ERROR", message, options);
  }
};
var CoverageError = class extends WringerError {
  constructor(message, options) {
    super("COVERAGE_ERROR", message, options);
  }
};

// src/core/seed.ts
var import_node_crypto = require("crypto");
function createRootSeed(value) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4294967295) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return value;
  }
  if (value !== void 0) {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > 4294967295) {
      throw new ScenarioError("Seed must be an unsigned 32-bit integer.");
    }
    return parsed;
  }
  return (0, import_node_crypto.randomBytes)(4).readUInt32LE(0);
}
function deriveSeed(rootSeed, ...labels) {
  const digest = (0, import_node_crypto.createHash)("sha256").update(String(rootSeed)).update("\0").update(labels.join("\0")).digest();
  return digest.readUInt32LE(0) & 2147483647;
}

// src/core/run.ts
var import_promises4 = require("fs/promises");
var import_node_os2 = require("os");
var import_node_perf_hooks3 = require("perf_hooks");
var import_node_path4 = require("path");

// src/core/safety.ts
function assertScenarioSafety(scenario, surface, policy = {}) {
  const toolByName = new Map(surface.tools.map((tool) => [tool.name, tool]));
  const allowedTools = new Set(policy.allowTools ?? []);
  for (const step of scenario.steps) {
    const rawMayContainCall = step.type === "send-raw" && mayContainToolCall(step.bytesBase64);
    const message = step.type === "send" ? asRecord(step.message) : step.type === "send-raw" ? parseRawMessage(step.bytesBase64) : void 0;
    if (rawMayContainCall && message === void 0) {
      throw new ScenarioError("Safety policy refused unparseable raw bytes that may contain a tools/call request.");
    }
    if (message?.method !== "tools/call") {
      continue;
    }
    const params = asRecord(message.params);
    const name = params?.name;
    if (typeof name !== "string") {
      throw new ScenarioError("Safety policy refused a tools/call request without an exact tool name.");
    }
    const tool = toolByName.get(name);
    if (tool?.safety === "read-only") {
      continue;
    }
    if (allowedTools.has(name)) {
      continue;
    }
    const reason = tool?.safety === "requires-exact-name-allow" ? "destructive tools require an exact-name allow entry" : "tools without a read-only annotation require an allow entry";
    throw new ScenarioError(`Safety policy refused tool '${name}': ${reason}.`);
  }
}
function parseRawMessage(bytesBase64) {
  try {
    const parsed = JSON.parse(Buffer.from(bytesBase64, "base64").toString("utf8"));
    return isRecord(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function mayContainToolCall(bytesBase64) {
  const text = Buffer.from(bytesBase64, "base64").toString("utf8");
  return /tools\\?\/call/.test(text) || text.includes("tools") && text.includes("call");
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/core/corpus.ts
var import_node_crypto2 = require("crypto");
var import_promises = require("fs/promises");
var import_node_path = require("path");
async function recordNovelScenario(directory, scenario, trace, seed) {
  const signature = responseSignature(trace);
  await (0, import_promises.mkdir)(directory, { recursive: true });
  const entries = await (0, import_promises.readdir)(directory);
  if (entries.includes(`${signature}.scenario.json`)) {
    return false;
  }
  const path = (0, import_node_path.join)(directory, `${signature}.scenario.json`);
  let file;
  try {
    file = await (0, import_promises.open)(path, "wx");
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      return false;
    }
    throw error;
  }
  try {
    await file.writeFile(`${JSON.stringify({ seed, scenario }, null, 2)}
`, "utf8");
  } finally {
    await file.close();
  }
  return true;
}
function responseSignature(trace) {
  const bytes = Buffer.concat(trace.events.filter((event) => event.channel === "stdout").map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
  const responses = [];
  for (const line of bytes.toString("utf8").split("\n")) {
    if (line.length === 0) {
      continue;
    }
    try {
      const message = JSON.parse(line);
      if (!isRecord2(message) || !("result" in message) && !("error" in message)) {
        continue;
      }
      const withoutId = Object.fromEntries(Object.entries(message).filter(([key]) => key !== "id"));
      responses.push(sortJson(withoutId));
    } catch {
      responses.push({ malformed: (0, import_node_crypto2.createHash)("sha256").update(line).digest("hex") });
    }
  }
  return (0, import_node_crypto2.createHash)("sha256").update(JSON.stringify(responses)).digest("hex");
}
function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord2(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}

// src/core/registry.ts
var ExtensionRegistry = class {
  #entries = /* @__PURE__ */ new Map();
  register(name, extension) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new RegistryError(`Invalid extension name '${name}'. Names must be lowercase kebab-case.`);
    }
    if (this.#entries.has(name)) {
      throw new RegistryError(`Extension '${name}' is already registered.`);
    }
    this.#entries.set(name, extension);
  }
  get(name) {
    const extension = this.#entries.get(name);
    if (extension === void 0) {
      throw new RegistryError(`Unknown extension '${name}'. Available: ${this.names().join(", ")}.`);
    }
    return extension;
  }
  names() {
    return [...this.#entries.keys()].sort();
  }
};

// spec/2025-11-25/rules.json
var rules_default = {
  revision: "2025-11-25",
  errorCodes: {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internalError: -32603
  },
  responseSchemas: {
    initialize: "InitializeResult",
    ping: "EmptyResult",
    "tools/call": "CallToolResult",
    "tools/list": "ListToolsResult",
    "resources/list": "ListResourcesResult",
    "prompts/list": "ListPromptsResult"
  },
  rules: [
    {
      id: "crash.process-exit",
      severity: "high",
      title: "Target exited during a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio"
    },
    {
      id: "hang.request-timeout",
      severity: "high",
      title: "Target did not answer a request",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/lifecycle.mdx#operation"
    },
    {
      id: "liveness.probe-failed",
      severity: "high",
      title: "Target failed its liveness probe",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/utilities/ping.mdx"
    },
    {
      id: "state-consistency.baseline-changed",
      severity: "high",
      title: "Baseline response changed after a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request and response objects; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/lifecycle.mdx#operation"
    },
    {
      id: "stdout-pollution.non-protocol-bytes",
      severity: "medium",
      title: "Target wrote non-protocol bytes to stdout",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio"
    },
    {
      id: "jsonrpc-contract.invalid-message",
      severity: "medium",
      title: "Target emitted an invalid JSON-RPC message",
      cite: "JSON-RPC 2.0 \xA74 Request, notification, and response objects"
    },
    {
      id: "schema-response.invalid-result",
      severity: "medium",
      title: "Target response does not match the revision schema",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/schema.mdx"
    },
    {
      id: "error-code.unexpected-code",
      severity: "low",
      title: "Target returned the wrong JSON-RPC error code",
      cite: "JSON-RPC 2.0 \xA75.1 Error object"
    },
    {
      id: "error-leak.sensitive-detail",
      severity: "low",
      title: "Target exposed internal error details",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/server/tools.mdx#error-handling (diagnostic heuristic; detailed errors are not prohibited by this section)"
    },
    {
      id: "accepted-malformed.success-response",
      severity: "info",
      title: "Target accepted a malformed request",
      cite: "JSON-RPC 2.0 \xA74.2 Notification; \xA75.1 Invalid Request"
    },
    {
      id: "resource-usage.outlier",
      severity: "info",
      title: "Target produced an unusually large trace",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#stdio (observational only; the transport defines no size limit)"
    },
    {
      id: "http.response-media-type",
      severity: "medium",
      title: "HTTP request response used an unsupported media type",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#streamable-http"
    },
    {
      id: "http.notification-response",
      severity: "medium",
      title: "HTTP notification did not receive an empty 202 response",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#sending-messages-to-the-server"
    },
    {
      id: "http.response-body-invalid",
      severity: "medium",
      title: "HTTP response body did not contain valid JSON-RPC data",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2025-11-25/basic/transports.mdx#sending-messages-to-the-server"
    }
  ]
};

// spec/2026-07-28/rules.json
var rules_default2 = {
  revision: "2026-07-28",
  errorCodes: {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601,
    invalidParams: -32602,
    internalError: -32603
  },
  responseSchemas: {
    "server/discover": "DiscoverResult",
    "tools/call": "CallToolResult",
    "tools/list": "ListToolsResult",
    "resources/list": "ListResourcesResult",
    "prompts/list": "ListPromptsResult"
  },
  rules: [
    {
      id: "crash.process-exit",
      severity: "high",
      title: "Target exited during a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx"
    },
    {
      id: "hang.request-timeout",
      severity: "high",
      title: "Target did not answer a request",
      cite: "JSON-RPC 2.0 \xA74 Request object; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/versioning.mdx#protocol-version-negotiation"
    },
    {
      id: "liveness.probe-failed",
      severity: "high",
      title: "Target failed its liveness probe",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/discover.mdx#request"
    },
    {
      id: "state-consistency.baseline-changed",
      severity: "high",
      title: "Baseline response changed after a scenario",
      cite: "JSON-RPC 2.0 \xA74 Request and response objects; https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/discover.mdx#response"
    },
    {
      id: "stdout-pollution.non-protocol-bytes",
      severity: "medium",
      title: "Target wrote non-protocol bytes to stdout",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx"
    },
    {
      id: "jsonrpc-contract.invalid-message",
      severity: "medium",
      title: "Target emitted an invalid JSON-RPC message",
      cite: "JSON-RPC 2.0 \xA74 Request, notification, and response objects"
    },
    {
      id: "schema-response.invalid-result",
      severity: "medium",
      title: "Target response does not match the revision schema",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/schema.mdx"
    },
    {
      id: "error-code.unexpected-code",
      severity: "low",
      title: "Target returned the wrong JSON-RPC error code",
      cite: "JSON-RPC 2.0 \xA75.1 Error object"
    },
    {
      id: "error-leak.sensitive-detail",
      severity: "low",
      title: "Target exposed internal error details",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/server/tools.mdx#error-handling (diagnostic heuristic; detailed errors are not prohibited by this section)"
    },
    {
      id: "accepted-malformed.success-response",
      severity: "info",
      title: "Target accepted a malformed request",
      cite: "JSON-RPC 2.0 \xA74.2 Notification; \xA75.1 Invalid Request"
    },
    {
      id: "resource-usage.outlier",
      severity: "info",
      title: "Target produced an unusually large trace",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/stdio.mdx (observational only; the transport defines no size limit)"
    },
    {
      id: "http.response-media-type",
      severity: "medium",
      title: "HTTP request response used an unsupported media type",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    },
    {
      id: "http.notification-response",
      severity: "medium",
      title: "HTTP notification did not receive an empty 202 response",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    },
    {
      id: "http.response-body-invalid",
      severity: "medium",
      title: "HTTP response body did not contain valid JSON-RPC data",
      cite: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/0a11bf68c7ec4473526ec15589f592afcd12d1e8/docs/specification/2026-07-28/basic/transports/streamable-http.mdx#sending-messages"
    }
  ]
};

// src/spec/rules.ts
var specRules = {
  "2025-11-25": loadRules(rules_default, "2025-11-25"),
  "2026-07-28": loadRules(rules_default2, "2026-07-28")
};
function loadRules(value, revision) {
  if (!isRecord3(value) || value.revision !== revision || !isRecord3(value.errorCodes) || !isRecord3(value.responseSchemas) || !Array.isArray(value.rules)) {
    throw new Error(`Invalid rules data for spec revision ${revision}.`);
  }
  const errorCodes = value.errorCodes;
  const codeValues = {
    parseError: readCode(errorCodes.parseError, "parseError", revision),
    invalidRequest: readCode(errorCodes.invalidRequest, "invalidRequest", revision),
    methodNotFound: readCode(errorCodes.methodNotFound, "methodNotFound", revision),
    invalidParams: readCode(errorCodes.invalidParams, "invalidParams", revision),
    internalError: readCode(errorCodes.internalError, "internalError", revision)
  };
  const responseSchemas = {};
  for (const [method, schema] of Object.entries(value.responseSchemas)) {
    if (typeof schema !== "string" || schema.length === 0) {
      throw new Error(`Rules for ${revision} have an invalid response schema for ${method}.`);
    }
    responseSchemas[method] = schema;
  }
  const rules = {};
  for (const item of value.rules) {
    if (!isRecord3(item) || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.cite !== "string" || item.cite.length === 0 || !isSeverity(item.severity)) {
      throw new Error(`Rules for ${revision} contain an incomplete oracle rule.`);
    }
    if (rules[item.id] !== void 0) {
      throw new Error(`Rules for ${revision} contain duplicate rule '${item.id}'.`);
    }
    rules[item.id] = {
      id: item.id,
      severity: item.severity,
      title: item.title,
      cite: item.cite
    };
  }
  return {
    revision,
    errorCodes: {
      parseError: codeValues.parseError,
      invalidRequest: codeValues.invalidRequest,
      methodNotFound: codeValues.methodNotFound,
      invalidParams: codeValues.invalidParams,
      internalError: codeValues.internalError
    },
    responseSchemas,
    rules
  };
}
function readCode(value, key, revision) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Rules for ${revision} have an invalid JSON-RPC error code for ${key}.`);
  }
  return value;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSeverity(value) {
  return value === "high" || value === "medium" || value === "low" || value === "info";
}

// src/spec/profiles.ts
var implementation = {
  name: "mcp-wringer",
  version: "0.1.0"
};
var capabilities = {};
var legacyProfile = {
  revision: "2025-11-25",
  rules: specRules["2025-11-25"],
  lifecycleSteps(prefix) {
    const initializeId = `${prefix}-initialize`;
    return [
      {
        type: "send",
        message: {
          jsonrpc: "2.0",
          id: initializeId,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities,
            clientInfo: implementation
          }
        }
      },
      { type: "await-response", id: initializeId },
      {
        type: "send",
        message: {
          jsonrpc: "2.0",
          method: "notifications/initialized"
        }
      }
    ];
  },
  request(method, id, params) {
    return {
      jsonrpc: "2.0",
      id,
      method,
      ...params === void 0 ? {} : { params }
    };
  },
  livenessProbe(id) {
    return this.request("ping", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list"
};
var statelessProfile = {
  revision: "2026-07-28",
  rules: specRules["2026-07-28"],
  lifecycleSteps() {
    return [];
  },
  request(method, id, params) {
    const requestParams = typeof params === "object" && params !== null && !Array.isArray(params) ? params : {};
    return {
      jsonrpc: "2.0",
      id,
      method,
      params: {
        ...requestParams,
        _meta: {
          "io.modelcontextprotocol/clientCapabilities": capabilities,
          "io.modelcontextprotocol/clientInfo": implementation,
          "io.modelcontextprotocol/protocolVersion": "2026-07-28"
        }
      }
    };
  },
  livenessProbe(id) {
    return this.request("server/discover", id);
  },
  toolListMethod: "tools/list",
  resourceListMethod: "resources/list",
  promptListMethod: "prompts/list"
};
var specProfiles = new ExtensionRegistry();
specProfiles.register(legacyProfile.revision, legacyProfile);
specProfiles.register(statelessProfile.revision, statelessProfile);

// src/transports/stdio/runner.ts
var import_node_perf_hooks = require("perf_hooks");

// src/target/spawn.ts
var import_cross_spawn = __toESM(require_cross_spawn(), 1);
var import_node_child_process = require("child_process");
function spawnTarget(options) {
  const env = options.inheritEnvironment ? { ...process.env, ...options.env } : { ...minimalEnvironment(), ...options.env };
  return (0, import_cross_spawn.default)(options.command, options.args, {
    cwd: options.cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32"
  });
}
async function terminateTarget(child) {
  if (child.exitCode !== null || child.signalCode !== null || child.pid === void 0) {
    return;
  }
  if (process.platform === "win32") {
    const taskkillPath = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\taskkill.exe` : "taskkill.exe";
    await new Promise((resolve5, reject) => {
      (0, import_node_child_process.execFile)(taskkillPath, ["/PID", String(child.pid), "/T", "/F"], (error) => {
        if (error && child.exitCode === null && child.signalCode === null) {
          reject(new TargetError(`Could not terminate target process tree: ${error.message}`, { cause: error }));
          return;
        }
        resolve5();
      });
    });
    return;
  }
  const exited = new Promise((resolve5) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve5();
    } else {
      child.once("exit", () => resolve5());
    }
  });
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (!isNodeError2(error) || error.code !== "ESRCH") {
      throw new TargetError(`Could not terminate target process group: ${errorMessage(error)}`, { cause: error });
    }
  }
  let timer;
  const didExit = await Promise.race([
    exited.then(() => true),
    new Promise((resolve5) => {
      timer = setTimeout(() => resolve5(false), 1e3);
    })
  ]);
  if (timer !== void 0) {
    clearTimeout(timer);
  }
  if (!didExit && child.pid !== void 0) {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (!isNodeError2(error) || error.code !== "ESRCH") {
        throw new TargetError(`Could not force-terminate target process group: ${errorMessage(error)}`, { cause: error });
      }
    }
    await exited;
  }
}
function minimalEnvironment() {
  const keys = process.platform === "win32" ? ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"] : ["PATH", "HOME", "TMPDIR"];
  const env = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value !== void 0) {
      env[key] = value;
    }
  }
  return env;
}
function isNodeError2(error) {
  return error instanceof Error && "code" in error;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/transports/stdio/runner.ts
var StdioScenarioSession = class {
  #child;
  #frames = new AsyncQueue();
  #unmatched = /* @__PURE__ */ new Map();
  #recorder;
  #startedAt;
  #timeoutMs;
  #exitPromise;
  #outputBuffer = Buffer.alloc(0);
  #spawnError;
  #exitStatus;
  #closeFailure;
  #closed = false;
  constructor(options) {
    this.#child = spawnTarget(options);
    this.#startedAt = import_node_perf_hooks.performance.now();
    this.#timeoutMs = options.timeoutMs ?? 5e3;
    this.#recorder = new TraceRecorder(
      options.scenario.id,
      options.scenario.specRevision,
      this.#startedAt,
      [
        ...Object.values(options.env ?? {}),
        ...options.inheritEnvironment ? Object.values(process.env).filter((value) => value !== void 0) : []
      ]
    );
    this.#exitPromise = new Promise((resolve5) => {
      this.#child.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve5(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
      this.#frames.close(error);
    });
    this.#child.stdin?.on("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`stdin error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdin failed: ${error.message}`, { cause: error }));
    });
    this.#child.stdout?.on("data", (chunk) => {
      this.#recorder.add("stdout", chunk);
      this.#outputBuffer = Buffer.concat([this.#outputBuffer, chunk]);
      let newline = this.#outputBuffer.indexOf(10);
      while (newline >= 0) {
        this.#frames.push(this.#outputBuffer.subarray(0, newline + 1));
        this.#outputBuffer = this.#outputBuffer.subarray(newline + 1);
        newline = this.#outputBuffer.indexOf(10);
      }
    });
    this.#child.stdout?.on("error", (error) => {
      this.#recorder.add("process", Buffer.from(`stdout error=${error.message}`));
      this.#frames.close(new TransportError(`Target stdout failed: ${error.message}`, { cause: error }));
    });
    this.#child.stderr?.on("data", (chunk) => this.#recorder.add("stderr", chunk));
    this.#child.stderr?.on("error", (error) => this.#recorder.add("process", Buffer.from(`stderr error=${error.message}`)));
    this.#child.once("close", () => {
      if (this.#outputBuffer.length > 0) {
        this.#frames.push(this.#outputBuffer);
      }
      if (!this.#closed) {
        this.#frames.close(this.#spawnError);
      }
    });
  }
  async execute(scenario, options = {}) {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the stdio target session is closed.");
    }
    if (scenario.specRevision !== this.#recorder.getRevision()) {
      throw new ScenarioError("All scenarios in a stdio target session must use the same spec revision.");
    }
    const startedAt = import_node_perf_hooks.performance.now();
    const eventStart = this.#recorder.eventCount();
    const byteStart = this.#recorder.byteCounts();
    const responses = [];
    let failure;
    this.#unmatched.clear();
    try {
      await waitForSpawn(this.#child, this.#spawnError, this.#timeoutMs);
      for (const step of scenario.steps) {
        try {
          const response = await executeStep(step, this.#child, this.#frames, this.#unmatched, this.#recorder);
          if (response !== void 0) {
            responses.push(response);
          }
        } catch (error) {
          if (!(error instanceof TransportError)) {
            throw error;
          }
          failure = classifyFailure(error, this.#exitStatus);
          break;
        }
      }
      if (failure?.kind === "transport-error" && /EPIPE/u.test(failure.message) && this.#exitStatus === void 0) {
        await Promise.race([
          this.#exitPromise,
          new Promise((resolve5) => setTimeout(resolve5, 100))
        ]);
        if (this.#exitStatus !== void 0) {
          failure = { ...failure, kind: "target-exit" };
        }
      }
      if (options.closeAfterScenario ?? true) {
        await this.close(failure !== void 0);
      }
    } catch (error) {
      await this.close(true);
      throw error;
    }
    const byteCounts = this.#recorder.byteCounts();
    const finalFailure = failure ?? this.#closeFailure;
    return {
      trace: this.#recorder.toTrace(scenario.id, eventStart),
      responses,
      outcome: {
        ...finalFailure === void 0 ? {} : { failure: finalFailure },
        exitCode: this.#exitStatus?.code ?? null,
        signal: this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, import_node_perf_hooks.performance.now() - startedAt),
        stdoutBytes: byteCounts.stdoutBytes - byteStart.stdoutBytes,
        stderrBytes: byteCounts.stderrBytes - byteStart.stderrBytes
      },
      transport: "stdio"
    };
  }
  async close(terminate = false) {
    if (this.#closed) {
      return;
    }
    if (terminate) {
      await terminateTarget(this.#child);
    } else {
      if (!this.#child.stdin?.destroyed) {
        this.#child.stdin?.end();
      }
      try {
        await waitForExit(this.#exitPromise, this.#timeoutMs);
      } catch (error) {
        if (!(error instanceof TargetError)) {
          throw error;
        }
        this.#closeFailure = { kind: "timeout", phase: "shutdown", message: error.message };
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }
};
async function runStdioScenario(options) {
  const session = new StdioScenarioSession(options);
  return session.execute(options.scenario);
}
async function executeStep(step, child, frames, unmatched, recorder) {
  switch (step.type) {
    case "send": {
      if (step.wire !== void 0 && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(`${JSON.stringify(step.message)}
`, "utf8");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : void 0, child, recorder);
      return void 0;
    }
    case "send-raw": {
      if (step.wire !== void 0 && step.wire.transport !== "stdio") {
        throw new ScenarioError(`Wire fault '${step.wire.transport}' cannot run over stdio.`);
      }
      const bytes = Buffer.from(step.bytesBase64, "base64");
      await writeBytes(bytes, step.wire?.transport === "stdio" ? step.wire : void 0, child, recorder);
      return void 0;
    }
    case "await-response":
      return readResponse(frames, unmatched, step.id, step.timeoutMs ?? 5e3);
    case "transport":
      if (step.operation !== "close-stdin") {
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over stdio.`);
      }
      child.stdin?.end();
      return void 0;
    case "delay":
      await new Promise((resolve5) => setTimeout(resolve5, step.durationMs));
      return void 0;
  }
}
async function writeBytes(bytes, wire, child, recorder) {
  const stdin = child.stdin;
  if (stdin === null || stdin.destroyed || stdin.writableEnded) {
    throw new TransportError("Cannot write to the target because stdin is closed.");
  }
  const sizes = wire?.chunks ?? [bytes.length];
  let offset = 0;
  for (const size of sizes) {
    if (offset >= bytes.length) {
      break;
    }
    const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + size));
    offset += chunk.length;
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
    if (wire?.delayMs && offset < bytes.length) {
      await new Promise((resolve5) => setTimeout(resolve5, wire.delayMs));
    }
  }
  if (offset < bytes.length) {
    const chunk = bytes.subarray(offset);
    recorder.add("stdin", chunk);
    await writeChunk(stdin, chunk);
  }
}
async function writeChunk(stream2, chunk) {
  await new Promise((resolve5, reject) => {
    stream2.write(chunk, (error) => {
      if (error) {
        reject(new TransportError(`Failed writing to target stdin: ${error.message}`, { cause: error }));
        return;
      }
      resolve5();
    });
  });
}
async function readResponse(frames, unmatched, expectedId, timeoutMs) {
  if (expectedId !== void 0) {
    const stashed = unmatched.get(expectedId);
    if (stashed !== void 0) {
      unmatched.delete(expectedId);
      return stashed;
    }
  }
  const deadline = import_node_perf_hooks.performance.now() + timeoutMs;
  while (true) {
    const remaining = deadline - import_node_perf_hooks.performance.now();
    if (remaining <= 0) {
      throw new TransportError(`Timed out waiting for response${expectedId === void 0 ? "" : ` ${String(expectedId)}`}.`);
    }
    const frame = await frames.shift(remaining);
    let message;
    try {
      message = JSON.parse(frame.toString("utf8"));
    } catch (error) {
      throw new TransportError(`Target wrote a non-JSON stdio frame: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (expectedId === void 0 || isRecord4(message) && message.id === expectedId) {
      return message;
    }
    if (isRecord4(message) && (typeof message.id === "string" || typeof message.id === "number")) {
      unmatched.set(message.id, message);
    }
  }
}
async function waitForSpawn(child, spawnError, timeoutMs) {
  if (spawnError) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== void 0) {
    return;
  }
  try {
    await withTimeout(
      new Promise((resolve5, reject) => {
        child.once("spawn", resolve5);
        child.once("error", reject);
      }),
      timeoutMs,
      "Timed out starting target."
    );
  } catch (error) {
    if (error instanceof TargetError) {
      throw error;
    }
    throw new TargetError(`Could not start target: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error
    });
  }
}
async function waitForExit(exitPromise, timeoutMs) {
  await withTimeout(exitPromise, timeoutMs, "Target did not exit after stdin closed.");
}
async function withTimeout(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new TargetError(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer !== void 0) {
      clearTimeout(timer);
    }
  }
}
var AsyncQueue = class {
  #items = [];
  #waiters = [];
  #closedError;
  push(item) {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter.resolve(item);
    } else {
      this.#items.push(item);
    }
  }
  close(error) {
    this.#closedError = error ?? new TransportError("Target closed stdout before replying.");
    for (const waiter of this.#waiters.splice(0)) {
      waiter.reject(this.#closedError);
    }
  }
  shift(timeoutMs) {
    const item = this.#items.shift();
    if (item !== void 0) {
      return Promise.resolve(item);
    }
    if (this.#closedError) {
      return Promise.reject(this.#closedError);
    }
    return new Promise((resolve5, reject) => {
      const waiter = { resolve: resolve5, reject };
      this.#waiters.push(waiter);
      const timer = setTimeout(() => {
        const index = this.#waiters.indexOf(waiter);
        if (index >= 0) {
          this.#waiters.splice(index, 1);
        }
        reject(new TransportError("Timed out waiting for a stdio frame."));
      }, timeoutMs);
      const resolveWithClear = waiter.resolve;
      waiter.resolve = (queuedItem) => {
        clearTimeout(timer);
        resolveWithClear(queuedItem);
      };
      const rejectWithClear = waiter.reject;
      waiter.reject = (error) => {
        clearTimeout(timer);
        rejectWithClear(error);
      };
    });
  }
};
var TraceRecorder = class {
  #events = [];
  #startedAt;
  #scenarioId;
  #revision;
  #redactors = /* @__PURE__ */ new Map();
  #stdoutBytes = 0;
  #stderrBytes = 0;
  #order = 0;
  constructor(scenarioId, revision, startedAt, secrets) {
    this.#scenarioId = scenarioId;
    this.#revision = revision;
    this.#startedAt = startedAt;
    this.#redactors.set("stdout", new ByteRedactor(secrets));
    this.#redactors.set("stderr", new ByteRedactor(secrets));
  }
  add(channel, bytes) {
    const offsetMs = Math.max(0, import_node_perf_hooks.performance.now() - this.#startedAt);
    if (channel === "stdout") {
      this.#stdoutBytes += bytes.length;
    } else if (channel === "stderr") {
      this.#stderrBytes += bytes.length;
    }
    const safeBytes = channel === "stdout" || channel === "stderr" ? this.#redactors.get(channel)?.push(bytes) ?? bytes : bytes;
    if (safeBytes.length > 0) {
      this.#push(channel, safeBytes, offsetMs);
    }
  }
  flush() {
    for (const channel of ["stdout", "stderr"]) {
      const remaining = this.#redactors.get(channel)?.flush();
      if (remaining && remaining.length > 0) {
        this.#push(channel, remaining, import_node_perf_hooks.performance.now() - this.#startedAt);
      }
    }
  }
  getRevision() {
    return this.#revision;
  }
  eventCount() {
    return this.#events.length;
  }
  toTrace(scenarioId = this.#scenarioId, fromIndex = 0) {
    return {
      formatVersion: 1,
      scenarioId,
      specRevision: this.#revision,
      transport: "stdio",
      events: this.#events.slice(fromIndex).map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
        ...event.http === void 0 ? {} : { http: event.http }
      }))
    };
  }
  byteCounts() {
    return { stdoutBytes: this.#stdoutBytes, stderrBytes: this.#stderrBytes };
  }
  #push(channel, bytes, offsetMs) {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event = {
      offsetMs,
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      order: this.#order++
    };
    this.#events.push(event);
    this.#events.sort((a, b) => a.offsetMs - b.offsetMs || a.order - b.order);
  }
};
var ByteRedactor = class {
  #secrets;
  #holdback;
  #pending = Buffer.alloc(0);
  constructor(secrets) {
    this.#secrets = secrets.filter((secret) => secret.length > 0).map((secret) => Buffer.from(secret, "utf8"));
    this.#holdback = Math.max(0, ...this.#secrets.map((secret) => secret.length - 1));
  }
  push(bytes) {
    const combined = Buffer.concat([this.#pending, bytes]);
    let safeLength = Math.max(0, combined.length - this.#holdback);
    let adjusted = true;
    while (adjusted) {
      adjusted = false;
      for (const secret of this.#secrets) {
        let position = combined.indexOf(secret);
        while (position >= 0) {
          if (position < safeLength && position + secret.length > safeLength) {
            safeLength = position;
            adjusted = true;
          }
          position = combined.indexOf(secret, position + 1);
        }
      }
    }
    const redacted = this.#redact(combined);
    const safe = redacted.subarray(0, safeLength);
    this.#pending = combined.subarray(safeLength);
    return safe;
  }
  flush() {
    const safe = this.#redact(this.#pending);
    this.#pending = Buffer.alloc(0);
    return safe;
  }
  #redact(bytes) {
    if (this.#secrets.length === 0) {
      return bytes;
    }
    const result = Buffer.from(bytes);
    for (const secret of this.#secrets) {
      let position = result.indexOf(secret);
      while (position >= 0) {
        result.fill(42, position, position + secret.length);
        position = result.indexOf(secret, position + secret.length);
      }
    }
    return result;
  }
};
function classifyFailure(error, exitStatus) {
  const message = error.message;
  if (/timed out/i.test(message)) {
    return { kind: "timeout", phase: "response", message };
  }
  if (exitStatus !== void 0) {
    return { kind: "target-exit", phase: "transport", message };
  }
  return { kind: "transport-error", phase: "transport", message };
}
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/transports/http/runner.ts
var import_node_http = __toESM(require("http"), 1);
var import_node_https = __toESM(require("https"), 1);
var import_node_net = __toESM(require("net"), 1);
var import_node_tls = __toESM(require("tls"), 1);
var import_node_perf_hooks2 = require("perf_hooks");
var MAX_RESPONSE_BYTES = 2097152;
var OVERSIZED_BODY_BYTES = MAX_RESPONSE_BYTES + 1;
var HttpScenarioSession = class {
  #options;
  #url;
  #child;
  #recorder;
  #exitPromise;
  #pendingResponses = [];
  #observedResponses = [];
  #exchanges = [];
  #revision;
  #sessionId;
  #exitStatus;
  #spawnError;
  #closed = false;
  #ready = false;
  #requestedTermination = false;
  constructor(options) {
    this.#options = options;
    this.#revision = options.scenario.specRevision;
    this.#url = parseTargetUrl(options.url);
    if (options.command === void 0 && options.args !== void 0) {
      throw new ScenarioError("HTTP target args require a spawned target command.");
    }
    if (options.command !== void 0 && options.args === void 0) {
      throw new ScenarioError("A spawned HTTP target requires an argument array.");
    }
    if (options.command === void 0 && !options.allowNonLoopback && !isLoopbackHost(this.#url.hostname)) {
      throw new TargetError("Attach mode refuses non-loopback HTTP targets; pass allowNonLoopback to authorize it.");
    }
    this.#recorder = new HttpTraceRecorder(options.env ?? {}, options.inheritEnvironment ?? false);
    if (options.command === void 0) {
      this.#child = void 0;
      this.#exitPromise = void 0;
      return;
    }
    this.#child = spawnTarget({
      command: options.command,
      args: options.args ?? [],
      ...options.env === void 0 ? {} : { env: options.env },
      ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment }
    });
    this.#exitPromise = new Promise((resolve5) => {
      this.#child?.once("exit", (code, signal) => {
        this.#exitStatus = { code, signal };
        this.#recorder.add("process", Buffer.from(`exit code=${String(code)} signal=${String(signal)}`));
        resolve5(this.#exitStatus);
      });
    });
    this.#child.once("error", (error) => {
      this.#spawnError = error;
      this.#recorder.add("process", Buffer.from(`spawn error=${error.message}`));
    });
    this.#child.stdout?.on("data", () => void 0);
    this.#child.stderr?.on("data", () => void 0);
  }
  async execute(scenario, options = {}) {
    if (this.#closed) {
      throw new TargetError("Cannot execute a scenario after the HTTP target session is closed.");
    }
    if (scenario.specRevision !== this.#options.scenario.specRevision) {
      throw new ScenarioError("All scenarios in an HTTP target session must use the same spec revision.");
    }
    const startedAt = import_node_perf_hooks2.performance.now();
    const eventStart = this.#recorder.eventCount();
    const exchangeStart = this.#exchanges.length;
    const responseStart = this.#observedResponses.length;
    let failure;
    try {
      await this.#ensureReady();
      for (const step of scenario.steps) {
        try {
          await this.#executeStep(step, scenario);
        } catch (error) {
          if (!(error instanceof TransportError)) {
            throw error;
          }
          failure = this.#classifyFailure(error);
          break;
        }
      }
      if (failure !== void 0 && this.#exitPromise !== void 0 && this.#exitStatus === void 0) {
        await Promise.race([
          this.#exitPromise,
          new Promise((resolve5) => setTimeout(resolve5, 100))
        ]);
      }
      if (options.closeAfterScenario ?? true) {
        await this.close(true);
      }
    } catch (error) {
      await this.close(true);
      throw error;
    }
    const responses = this.#observedResponses.splice(responseStart);
    const processFailure = this.#exitStatus !== void 0 && !this.#requestedTermination && (this.#exitStatus.code !== 0 || this.#exitStatus.signal !== null) ? {
      kind: "target-exit",
      phase: "response",
      message: `Target exited with code=${String(this.#exitStatus.code)} signal=${String(this.#exitStatus.signal)}.`
    } : void 0;
    return {
      trace: this.#recorder.toTrace(scenario.id, scenario.specRevision, eventStart),
      responses,
      outcome: {
        ...processFailure === void 0 ? failure === void 0 ? {} : { failure } : { failure: processFailure },
        exitCode: this.#requestedTermination ? null : this.#exitStatus?.code ?? null,
        signal: this.#requestedTermination ? null : this.#exitStatus?.signal ?? null,
        durationMs: Math.max(0, import_node_perf_hooks2.performance.now() - startedAt),
        stdoutBytes: 0,
        stderrBytes: 0
      },
      transport: "streamable-http",
      httpExchanges: this.#exchanges.slice(exchangeStart)
    };
  }
  async close(terminate = false) {
    if (this.#closed) {
      return;
    }
    if (this.#child !== void 0) {
      if (terminate) {
        this.#requestedTermination = this.#exitStatus === void 0 && this.#child.exitCode === null && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      } else if (this.#exitPromise !== void 0) {
        this.#requestedTermination = this.#exitStatus === void 0 && this.#child.exitCode === null && this.#child.signalCode === null;
        await terminateTarget(this.#child);
      }
    }
    this.#recorder.flush();
    this.#closed = true;
  }
  async #ensureReady() {
    if (this.#ready) {
      if (this.#exitStatus !== void 0) {
        throw new TargetError("The spawned HTTP target exited before the scenario started.");
      }
      return;
    }
    if (this.#child === void 0) {
      this.#ready = true;
      return;
    }
    if (this.#spawnError !== void 0) {
      throw new TargetError(`Could not start target: ${this.#spawnError.message}`, { cause: this.#spawnError });
    }
    await waitForSpawn2(this.#child, this.#spawnError, this.#options.timeoutMs ?? 5e3);
    await waitForHttpListener(this.#url, this.#child, Math.max(5e3, this.#options.timeoutMs ?? 5e3));
    this.#ready = true;
  }
  async #executeStep(step, scenario) {
    switch (step.type) {
      case "send":
        await this.#sendMessage(
          Buffer.from(JSON.stringify(step.message)),
          step.message,
          step.wire,
          scenario,
          getResponseTimeout(scenario, step.message, this.#options.timeoutMs ?? 5e3)
        );
        return;
      case "send-raw":
        {
          const body = Buffer.from(step.bytesBase64, "base64");
          await this.#sendMessage(
            body,
            void 0,
            step.wire,
            scenario,
            getResponseTimeout(scenario, parseRequestMessage(body), this.#options.timeoutMs ?? 5e3)
          );
        }
        return;
      case "await-response":
        this.#takeResponse(step.id);
        return;
      case "transport":
        throw new ScenarioError(`Transport operation '${step.operation}' cannot run over Streamable HTTP.`);
      case "delay":
        await new Promise((resolve5) => setTimeout(resolve5, step.durationMs));
        return;
    }
  }
  async #sendMessage(body, message, wire, scenario, timeoutMs) {
    if (wire !== void 0 && wire.transport !== "streamable-http") {
      throw new ScenarioError(`Wire fault '${wire.transport}' cannot run over Streamable HTTP.`);
    }
    const fault = wire?.fault;
    const headers = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
    addMirroredHeaders(headers, scenario.specRevision, message, body);
    const method = fault === "wrong-method" ? "PUT" : "POST";
    applyHeaderFault(headers, fault, scenario.specRevision);
    if (fault === "truncated-body" || fault === "abort-response") {
      const raw = buildRawRequest(this.#url, method, headers, body, fault === "truncated-body");
      const exchange = await rawHttpRequest(
        this.#url,
        raw,
        timeoutMs,
        fault === "abort-response"
      );
      this.#recordExchange(method, headers, body, exchange, fault);
      this.#queueMessages(exchange.responseBody, exchange.responseHeaders, exchange.responseStatus);
      return;
    }
    if (fault === "oversized-body") {
      body = Buffer.alloc(OVERSIZED_BODY_BYTES, 65);
    }
    const requestCount = fault === "concurrent-requests" ? 2 : 1;
    const results = await Promise.all(Array.from({ length: requestCount }, () => sendHttpRequest(this.#url, method, headers, body, timeoutMs)));
    for (const result of results) {
      this.#recordExchange(method, headers, body, result, fault);
      if (result.responseStatus === 404 && this.#sessionId !== void 0 && scenarioIsLegacy(scenario.specRevision) && requestCount === 1 && message !== void 0 && isRecord5(message) && message.method !== "initialize") {
        this.#sessionId = void 0;
        await this.#startNewSession(scenario.specRevision);
        const retryHeaders = createRequestHeaders(this.#options.url, scenario.specRevision, this.#sessionId);
        const retry = await sendHttpRequest(this.#url, method, retryHeaders, body, this.#options.timeoutMs ?? 5e3);
        this.#recordExchange(method, retryHeaders, body, retry, fault);
        this.#queueMessages(retry.responseBody, retry.responseHeaders, retry.responseStatus);
        continue;
      }
      if (result.responseStatus === 202 && result.responseBody.length === 0) {
        continue;
      }
      if (fault === "concurrent-requests" && result.responseStatus >= 500) {
        continue;
      }
      this.#queueMessages(result.responseBody, result.responseHeaders, result.responseStatus);
    }
  }
  async #startNewSession(revision) {
    if (revision !== "2025-11-25") {
      return;
    }
    const lifecycle = specProfiles.get(revision).lifecycleSteps(`${this.#options.scenario.id}-http-reinitialize`);
    for (const step of lifecycle) {
      if (step.type !== "send") {
        continue;
      }
      const body = Buffer.from(JSON.stringify(step.message));
      const headers = createRequestHeaders(this.#options.url, revision, this.#sessionId);
      const result = await sendHttpRequest(this.#url, "POST", headers, body, this.#options.timeoutMs ?? 5e3);
      this.#recordExchange("POST", headers, body, result, "automatic-session-reinitialize");
      if (result.responseStatus < 200 || result.responseStatus >= 300) {
        throw new TransportError(`HTTP session reinitialization failed with status ${result.responseStatus}.`);
      }
    }
  }
  #recordExchange(method, headers, body, result, requestFault) {
    const safeHeaders = redactHeaders(headers, this.#options.env);
    const safeResponseHeaders = redactHeaders(result.responseHeaders, this.#options.env);
    const safeRequestBody = redactBuffer(body, this.#options.env);
    const safeResponseBody = redactBuffer(Buffer.from(result.responseBody), this.#options.env).toString("utf8");
    this.#recorder.addHttp("http-request", safeRequestBody, { method, headers: safeHeaders });
    this.#recorder.addHttp("http-response", Buffer.from(safeResponseBody), {
      method,
      headers: safeResponseHeaders,
      statusCode: result.responseStatus
    });
    this.#exchanges.push({
      ...result,
      requestMethod: method,
      requestHeaders: safeHeaders,
      requestBody: safeRequestBody.toString("utf8"),
      responseHeaders: safeResponseHeaders,
      responseBody: safeResponseBody,
      ...requestFault === void 0 ? {} : { requestFault }
    });
    const sessionId = headerValue(result.responseHeaders, "mcp-session-id");
    if (scenarioIsLegacy(this.#revision) && sessionId !== void 0) {
      this.#sessionId = sessionId;
    }
  }
  #queueMessages(body, headers, statusCode) {
    const success = statusCode >= 200 && statusCode < 300;
    const contentType = headerValue(headers, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (body.length === 0) {
      return;
    }
    const messages = [];
    if (contentType === "text/event-stream" && success) {
      for (const data of parseSseData(body)) {
        parseJsonMessages(data, messages);
      }
    } else if (contentType === "application/json" || contentType === void 0 && success) {
      parseJsonMessages(body, messages);
    }
    const accepted = success ? messages : messages.filter((message) => isRecord5(message) && isRecord5(message.error));
    this.#pendingResponses.push(...accepted);
    this.#observedResponses.push(...accepted);
  }
  #takeResponse(id) {
    const index = this.#pendingResponses.findIndex((value) => {
      if (id === void 0) {
        return true;
      }
      return isRecord5(value) && value.id === id;
    });
    if (index < 0) {
      throw new TransportError(
        `The HTTP response did not contain JSON-RPC response${id === void 0 ? "" : ` ${String(id)}`}.`
      );
    }
    this.#pendingResponses.splice(index, 1);
  }
  #classifyFailure(error) {
    if (this.#exitStatus !== void 0) {
      return { kind: "target-exit", phase: "response", message: error.message };
    }
    return {
      kind: /timed out/iu.test(error.message) ? "timeout" : "transport-error",
      phase: "response",
      message: error.message
    };
  }
};
async function runHttpScenario(options) {
  const session = new HttpScenarioSession(options);
  return session.execute(options.scenario);
}
function createRequestHeaders(url, revision, sessionId) {
  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": revision,
    Host: new URL(url).host,
    Connection: "close"
  };
  if (sessionId !== void 0 && revision === "2025-11-25") {
    headers["MCP-Session-Id"] = sessionId;
  }
  return headers;
}
var NAME_HEADER_METHODS = {
  "tools/call": "name",
  "prompts/get": "name",
  "resources/read": "uri"
};
function addMirroredHeaders(headers, revision, message, body) {
  if (scenarioIsLegacy(revision)) {
    return;
  }
  let value = message;
  if (value === void 0) {
    try {
      value = JSON.parse(body.toString("utf8"));
    } catch {
      return;
    }
  }
  if (!isRecord5(value) || typeof value.method !== "string") {
    return;
  }
  if (isPlainHeaderValue(value.method)) {
    headers["Mcp-Method"] = value.method;
  }
  const nameField = NAME_HEADER_METHODS[value.method];
  const params = value.params;
  if (nameField !== void 0 && isRecord5(params) && typeof params[nameField] === "string") {
    headers["Mcp-Name"] = encodeHeaderValue(params[nameField]);
  }
}
function isPlainHeaderValue(value) {
  return /^[\x21-\x7E](?:[\x20-\x7E\t]*[\x21-\x7E])?$/u.test(value) && !(value.startsWith("=?base64?") && value.endsWith("?="));
}
function encodeHeaderValue(value) {
  return isPlainHeaderValue(value) ? value : `=?base64?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
function applyHeaderFault(headers, fault, revision) {
  switch (fault) {
    case "missing-accept":
      delete headers.Accept;
      break;
    case "invalid-accept":
      headers.Accept = "text/plain";
      break;
    case "missing-content-type":
      delete headers["Content-Type"];
      break;
    case "invalid-content-type":
      headers["Content-Type"] = "text/plain";
      break;
    case "missing-protocol-version":
      delete headers["MCP-Protocol-Version"];
      break;
    case "mismatched-protocol-version":
      headers["MCP-Protocol-Version"] = revision === "2025-11-25" ? "2026-07-28" : "2025-11-25";
      break;
    case "invalid-session-id":
      if (revision === "2025-11-25") {
        headers["MCP-Session-Id"] = "wringer-invalid-session";
      }
      break;
  }
}
function sendHttpRequest(url, method, headers, body, timeoutMs) {
  const client = url.protocol === "https:" ? import_node_https.default : import_node_http.default;
  return new Promise((resolve5, reject) => {
    let responseBody = Buffer.alloc(0);
    let settled = false;
    const request = client.request(url, { method, headers, timeout: timeoutMs }, (response) => {
      response.on("data", (chunk) => {
        responseBody = Buffer.concat([responseBody, chunk]);
        if (responseBody.length > MAX_RESPONSE_BYTES) {
          request.destroy(new TransportError(`HTTP response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
        }
      });
      response.once("aborted", () => {
        settled = true;
        resolve5({
          requestMethod: method,
          requestHeaders: { ...headers },
          requestBody: body.toString("utf8"),
          responseStatus: response.statusCode ?? 0,
          responseHeaders: normalizeHeaders(response.headers),
          responseBody: responseBody.toString("utf8"),
          responseAborted: true
        });
      });
      response.once("error", (error) => {
        if (!settled) {
          settled = true;
          reject(new TransportError(`HTTP response failed: ${error.message}`, { cause: error }));
        }
      });
      response.once("end", () => {
        settled = true;
        resolve5({
          requestMethod: method,
          requestHeaders: { ...headers },
          requestBody: body.toString("utf8"),
          responseStatus: response.statusCode ?? 0,
          responseHeaders: normalizeHeaders(response.headers),
          responseBody: responseBody.toString("utf8")
        });
      });
    });
    request.once("timeout", () => request.destroy(new TransportError("Timed out waiting for the HTTP response.")));
    request.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error instanceof TransportError ? error : new TransportError(`HTTP request failed: ${error.message}`, { cause: error }));
      }
    });
    request.end(body);
  });
}
function buildRawRequest(url, method, headers, body, truncate) {
  const requestHeaders = { ...headers };
  requestHeaders.Connection = "close";
  requestHeaders["Content-Length"] = String(body.length + (truncate ? 20 : 0));
  const target = `${url.pathname}${url.search}`;
  const headerBytes = Buffer.from(
    `${method} ${target || "/"} HTTP/1.1\r
${Object.entries(requestHeaders).map(([key, value]) => `${key}: ${value}\r
`).join("")}\r
`,
    "utf8"
  );
  return Buffer.concat([headerBytes, body]);
}
function rawHttpRequest(url, requestBytes, timeoutMs, abortAfterHeaders) {
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  return new Promise((resolve5, reject) => {
    const socket = url.protocol === "https:" ? import_node_tls.default.connect({ host: url.hostname, port, servername: url.hostname }) : import_node_net.default.createConnection({ host: url.hostname, port });
    const chunks = [];
    let totalBytes = 0;
    let settled = false;
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      if (!settled) {
        settled = true;
        reject(new TransportError("Timed out waiting for the raw HTTP response."));
      }
    });
    if (url.protocol === "https:") {
      socket.once("secureConnect", () => socket.end(requestBytes));
    } else {
      socket.once("connect", () => socket.end(requestBytes));
    }
    socket.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        socket.destroy();
        if (!settled) {
          settled = true;
          reject(new TransportError(`HTTP response exceeded ${MAX_RESPONSE_BYTES} bytes.`));
        }
        return;
      }
      chunks.push(chunk);
      if (abortAfterHeaders && Buffer.concat(chunks).includes(Buffer.from("\r\n\r\n"))) {
        socket.destroy();
        if (!settled) {
          settled = true;
          resolve5(parseRawResponse(Buffer.concat(chunks)));
        }
      }
    });
    socket.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(new TransportError(`Raw HTTP request failed: ${error.message}`, { cause: error }));
      }
    });
    socket.once("end", () => {
      if (!settled) {
        settled = true;
        resolve5(parseRawResponse(Buffer.concat(chunks)));
      }
    });
    socket.once("close", () => {
      if (!settled) {
        settled = true;
        resolve5(parseRawResponse(Buffer.concat(chunks)));
      }
    });
  });
}
function parseRawResponse(bytes) {
  const separator = bytes.indexOf(Buffer.from("\r\n\r\n"));
  if (separator < 0) {
    return {
      requestMethod: "POST",
      requestHeaders: {},
      requestBody: "",
      responseStatus: 0,
      responseHeaders: {},
      responseBody: bytes.toString("utf8")
    };
  }
  const headerText = bytes.subarray(0, separator).toString("latin1");
  const [statusLine = "", ...headerLines] = headerText.split("\r\n");
  const statusMatch = /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s+(.*))?$/u.exec(statusLine);
  const headers = {};
  for (const line of headerLines) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
    }
  }
  return {
    requestMethod: "POST",
    requestHeaders: {},
    requestBody: "",
    responseStatus: statusMatch?.[1] === void 0 ? 0 : Number(statusMatch[1]),
    responseHeaders: headers,
    responseBody: bytes.subarray(separator + 4).toString("utf8")
  };
}
async function waitForSpawn2(child, spawnError, timeoutMs) {
  if (spawnError !== void 0) {
    throw new TargetError(`Could not start target: ${spawnError.message}`, { cause: spawnError });
  }
  if (child.pid !== void 0) {
    return;
  }
  await new Promise((resolve5, reject) => {
    const timer = setTimeout(() => reject(new TargetError("Timed out starting HTTP target.")), timeoutMs);
    child.once("spawn", () => {
      clearTimeout(timer);
      resolve5();
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new TargetError(`Could not start target: ${error.message}`, { cause: error }));
    });
  });
}
async function waitForHttpListener(url, child, timeoutMs) {
  const deadline = import_node_perf_hooks2.performance.now() + timeoutMs;
  const port = Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  while (import_node_perf_hooks2.performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new TargetError("The spawned HTTP target exited before its endpoint became ready.");
    }
    const connected = await new Promise((resolve5) => {
      const socket = import_node_net.default.createConnection({ host: url.hostname, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve5(true);
      });
      socket.once("error", () => resolve5(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve5(false);
      });
    });
    if (connected) {
      return;
    }
    await new Promise((resolve5) => setTimeout(resolve5, 50));
  }
  throw new TargetError(`HTTP target did not become ready at ${url.origin} within ${timeoutMs} ms.`);
}
function parseTargetUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new ScenarioError(`Invalid HTTP target URL: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    throw new ScenarioError("HTTP target URL must use HTTP(S) and must not contain credentials.");
  }
  return url;
}
function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (host === "localhost" || host === "::1") {
    return true;
  }
  const octets = host.split(".");
  return octets.length === 4 && Number(octets[0]) === 127 && octets.every((octet) => /^\d{1,3}$/u.test(octet) && Number(octet) <= 255);
}
function parseSseData(body) {
  const messages = [];
  let dataLines = [];
  for (const line of body.split(/\r?\n/u)) {
    if (line.length === 0) {
      if (dataLines.length > 0) {
        messages.push(dataLines.join("\n"));
        dataLines = [];
      }
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).replace(/^ /u, ""));
    }
  }
  if (dataLines.length > 0) {
    messages.push(dataLines.join("\n"));
  }
  return messages;
}
function getResponseTimeout(scenario, message, fallback) {
  if (!isRecord5(message) || typeof message.id !== "string" && typeof message.id !== "number") {
    return fallback;
  }
  const responseStep = scenario.steps.find(
    (step) => step.type === "await-response" && step.id === message.id
  );
  return responseStep?.timeoutMs ?? fallback;
}
function parseRequestMessage(body) {
  try {
    const value = JSON.parse(body.toString("utf8"));
    return isJsonValue(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
function parseJsonMessages(body, messages) {
  try {
    const value = JSON.parse(body);
    if (isJsonValue(value)) {
      messages.push(value);
    }
  } catch {
    return;
  }
}
function normalizeHeaders(headers) {
  const normalized = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== void 0) {
      normalized[name.toLowerCase()] = value;
    }
  }
  return normalized;
}
function headerValue(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
function redactHeaders(headers, env) {
  const secrets = Object.values(env ?? {}).filter((value) => value.length > 0);
  const result = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name.toLowerCase()] = Array.isArray(value) ? value.map((item) => redactString(item, secrets)) : redactString(value, secrets);
  }
  if (result["mcp-session-id"] !== void 0) {
    result["mcp-session-id"] = "[redacted]";
  }
  return result;
}
function redactBuffer(value, env) {
  return Buffer.from(redactString(value.toString("utf8"), Object.values(env ?? {}).filter((secret) => secret.length > 0)));
}
function redactString(value, secrets) {
  return secrets.reduce((result, secret) => result.replaceAll(secret, "[redacted]"), value);
}
function scenarioIsLegacy(revision) {
  return revision === "2025-11-25";
}
function isRecord5(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isRecord5(value) && Object.values(value).every(isJsonValue);
}
var HttpTraceRecorder = class {
  #events = [];
  #secrets;
  #order = 0;
  constructor(env, inheritEnvironment) {
    this.#secrets = [
      ...Object.values(env),
      ...inheritEnvironment ? Object.values(process.env).filter((value) => value !== void 0) : []
    ].filter((value) => value.length > 0);
  }
  add(channel, bytes) {
    this.#push(channel, Buffer.from(redactString(bytes.toString("utf8"), this.#secrets)));
  }
  addHttp(channel, bytes, metadata) {
    const safeBytes = Buffer.from(redactString(bytes.toString("utf8"), this.#secrets));
    const safeMetadata = {
      ...metadata,
      headers: redactHeaders(metadata.headers, Object.fromEntries(this.#secrets.map((secret, index) => [`SECRET_${index}`, secret])))
    };
    this.#push(channel, safeBytes, safeMetadata);
  }
  flush() {
  }
  eventCount() {
    return this.#events.length;
  }
  toTrace(scenarioId, revision, fromIndex) {
    return {
      formatVersion: 1,
      scenarioId,
      specRevision: revision,
      transport: "streamable-http",
      events: this.#events.slice(fromIndex).map((event) => ({
        offsetMs: event.offsetMs,
        channel: event.channel,
        encoding: event.encoding,
        data: event.data,
        ...event.http === void 0 ? {} : { http: event.http }
      }))
    };
  }
  #push(channel, bytes, metadata) {
    const text = bytes.toString("utf8");
    const encoding = Buffer.from(text, "utf8").equals(bytes) ? "utf8" : "base64";
    const event = {
      offsetMs: Math.max(0, import_node_perf_hooks2.performance.now() - this.#startedAt),
      channel,
      encoding,
      data: encoding === "utf8" ? text : bytes.toString("base64"),
      ...metadata === void 0 ? {} : { http: metadata },
      order: this.#order++
    };
    this.#events.push(event);
  }
  #startedAt = import_node_perf_hooks2.performance.now();
};

// src/transports/registry.ts
var transportRegistry = new ExtensionRegistry();
transportRegistry.register("stdio", {
  createSession(options) {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return new StdioScenarioSession(options);
  },
  run(options) {
    if (options.transport === "streamable-http") {
      throw new ScenarioError("The stdio transport requires a spawned command target.");
    }
    return runStdioScenario(options);
  }
});
transportRegistry.register("streamable-http", {
  createSession(options) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return new HttpScenarioSession(options);
  },
  run(options) {
    if (options.transport !== "streamable-http") {
      throw new ScenarioError("The Streamable HTTP transport requires an HTTP target URL.");
    }
    return runHttpScenario(options);
  }
});

// src/cli/inspect.ts
async function inspectServer(specRevision, targetOrCommand, args, options = {}) {
  const target = typeof targetOrCommand === "string" ? {
    transport: "stdio",
    command: targetOrCommand,
    args: args ?? [],
    ...options
  } : targetOrCommand;
  const profile = specProfiles.get(specRevision);
  const methods = [
    profile.toolListMethod,
    profile.resourceListMethod,
    profile.promptListMethod
  ];
  const steps = profile.lifecycleSteps("inspect");
  methods.forEach((method, index) => {
    const id = `inspect-${index + 1}`;
    steps.push(
      { type: "send", message: profile.request(method, id) },
      { type: "await-response", id }
    );
  });
  const scenario = {
    formatVersion: 1,
    id: `inspect-${specRevision}`,
    specRevision,
    description: "Read-only MCP surface inspection.",
    steps
  };
  const { responses } = await transportRegistry.get(target.transport ?? "stdio").run({
    ...target,
    scenario
  });
  const rejection = responses.find((response) => isRecord6(response) && isRecord6(response.error));
  if (rejection !== void 0 && isRecord6(rejection) && isRecord6(rejection.error)) {
    const { code, message } = rejection.error;
    throw new TargetError(
      `Target rejected inspection for spec revision ${specRevision}: error ${String(code)} ${typeof message === "string" ? message : ""}`.trimEnd()
    );
  }
  if (responses.length !== methods.length + (specRevision === "2025-11-25" ? 1 : 0)) {
    throw new ScenarioError("Target did not return all expected responses during inspection.");
  }
  const listResponses = responses.slice(responses.length - methods.length);
  const tools = getArray(listResponses[0], "tools").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string") {
      return [];
    }
    const annotations = isRecord6(item.annotations) ? item.annotations : {};
    const safety = annotations.destructiveHint === true ? "requires-exact-name-allow" : annotations.readOnlyHint === true ? "read-only" : "requires-explicit-allow";
    const inputSchema = item.inputSchema;
    return [{
      name: item.name,
      safety,
      ...inputSchema === void 0 ? {} : { inputSchema }
    }];
  });
  const resources = getArray(listResponses[1], "resources").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string" || typeof item.uri !== "string") {
      return [];
    }
    return [{ name: item.name, uri: item.uri }];
  });
  const prompts = getArray(listResponses[2], "prompts").flatMap((item) => {
    if (!isRecord6(item) || typeof item.name !== "string") {
      return [];
    }
    return [{ name: item.name }];
  });
  return { specRevision, tools, resources, prompts };
}
function getArray(response, key) {
  if (!isRecord6(response) || !isRecord6(response.result) || !Array.isArray(response.result[key])) {
    throw new ScenarioError(`Inspection response is missing result.${key}.`);
  }
  return response.result[key];
}
function isRecord6(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// node_modules/pure-rand/lib/esm/generator/congruential32.js
var MULTIPLIER = 214013;
var INCREMENT = 2531011;
var MASK = 4294967295;
var MASK_2 = -2147483649;
var MULTIPLIER_2 = -1443076087;
var INCREMENT_2 = 505908858;
var MULTIPLIER_3 = 1170746341;
var INCREMENT_3 = -755606699;
var JUMP_MULTIPLIER = 1994129409;
var JUMP_INCREMENT = 916127744;
var LinearCongruential32 = class LinearCongruential322 {
  constructor(seed) {
    this.seed = seed;
  }
  clone() {
    return new LinearCongruential322(this.seed);
  }
  next() {
    const s0 = this.seed;
    const s1 = Math.imul(s0, MULTIPLIER) + INCREMENT | 0;
    const s2 = Math.imul(s0, MULTIPLIER_2) + INCREMENT_2 | 0;
    const s3 = Math.imul(s0, MULTIPLIER_3) + INCREMENT_3 | 0;
    this.seed = s3;
    const v1 = (s1 & MASK_2) >> 16;
    const v2 = (s2 & MASK_2) >> 16;
    return (s3 & MASK_2) >> 16 | v2 << 15 | v1 << 30;
  }
  jump() {
    this.seed = Math.imul(this.seed, JUMP_MULTIPLIER) + JUMP_INCREMENT & MASK;
  }
  getState() {
    return [this.seed];
  }
};
function congruential32(seed) {
  return new LinearCongruential32(seed);
}

// node_modules/pure-rand/lib/esm/generator/mersenne.js
var N = 624;
var M = 397;
var A = 2567483615;
var F = 1812433253;
var U = 11;
var S = 7;
var B = 2636928640;
var T = 15;
var C = 4022730752;
var L = 18;
var MASK_LOWER = 2147483647;
var MASK_UPPER = 2147483648;
var JUMP_COEFS = "SUSgbA\\W`E[]KN2RUSo8XVU?HKBFRl11E\\KoWOg5B]XEWG;BE;1:oVK[`B^Z9Qd23^XTnhL>]Unda4f[X;_j9H5QD=cN<5H`3bW>9bk1mjoI2fK0obmAAINOV:>Mek_V9dd<hZ\\gC3?Fm7FEk07QH_3PLm^@?^i\\QMkgP<]oLHmFnlecg5F@7U^@4jhZ?WZS0k@GHehmM36:5^9;>Hmm`co>k:KOSkSbIINb1VFf>LXgP>GUAQTD>Ci>XMGkUflLlb?_FaFUk@?5N7i70@;1o68ah@I<HFH7R2^J:G][Gf962ITWID9GWK8ElD2G5=DcHcL]cA]P2n7A=[<bInM;IHDQnJMReRXDWbVldnGEIPij`E08Xdci3@0c:IBbD4:Nk]?lEN9j^;T`0blZX7eiWE8c`<ak7j05FZi>AjUDh?M1B?^??FAXKThf<aBOXZf7jXYGK>R<;NHk3S9YhM7STJ6`:MIE`S@7298X8W>PNK=@;lLX<i\\TXLL<W@X[X54H]in8M;;n?kkQbajgAMY=Tf9b;ZKf0QUB2FHYWfnfkDoU9YkcLd95T>lK6GM1YL\\lid:J>KYS=iJ]Y>QlF>?R5_[5QeYC=66;A32Ac>OHk_ne^0g>bK:g;KFPgbGUcPR_Z=TX3H9d03bKZ2IhEPKBo>LSGWd0iFdV8C<Y:<>T[O6lC\\blaZ>GoAYP4clf^j1IfnZJ]QeDe2X<HE[LJNWnaCg[P]Co^:IRbWPY?97UePBlZNNHY6LOBM8P>=h?Ye:_f_Sb9Ki5GDYBF4dWeMfdg^ccPllNWM7G1\\UMdoYeOOD5^e@foA22G?ADYo5:FVG[bWo96;>3kc_c1Ab30>30;1@4F8g2hY?DJ4[LOL;ZLLKo2]jo>[KMDUcR279N_kF=3WL@Dd620bMTdA\\U9k``ef2iD9JgJ8CZBHS>F^Uk;<laeaeHS<15OSeS`PcSSKBRBFY]aQ=EgUXGNg=?d56`KA@2BejY0^[_DCX`L=CGMT=BW^6S1i@2ATBVk>3_ocRA>2U:4GPQ6o>5jX2HIcV3S@On6KB<[SKB?FC_AAji9agbBFkAi\\;4I\\UJ]c36Ub@[;gQACVGY<V]SDJBUU]La\\_a@JdOO8gm2T0DJMa:8Hf7>E]noQ[1Kambn??QQ]S?1i0oMGOijb\\aGY6lQ^CJ?9bFle8<eH4UUjBINX;n8@VOA5ah^URV49B[A?ONHhHAC1J5;;h0SXYlG^0W=eJdHh^K4SGe=1HZLLam;D<Q3AOdbPcdX``82\\jo0En8jRVGC73WMCF9`d:0heS?80?C188cSn7H9<daZ]MgS4Pb^1HkA:1PU^5>^h_g[RQV@PnYBRI_]`B]Bh@Uk03eXGY`I16L76H28X`R>IROMeNVUdU[:lghLhPCQZ:4a<30YBZCYnXe[?;jc8gKI2QH2MjnWBm4nGCZW`aVU2a;P<AMI25mlW_Nm][2?b6o851X@lAm]YZ`bWRF1g<Ga:T]1NXH5Veja5P9S9>:aNg:Th1Y=5o78K>LQ8hW@5S?I83Lk5Xk;j5@I3o[d:4RjE^oS30:WP9gC\\i8aSI>QRE@4lP:7lDg8g2`Ql[2I8aBU\\BQ?B4_clL9Q]S;^e1Ob5[>3JER2`c7B=o]fPOWO<DGi;Niba1PoWPPE_Q3aX0OB0mZej\\f_M[J4Y6]1`h2MkF[GiW8Q^d3^_=<I1N2Q7]2<2j[iP7V3V821FaI]A`93bC^Z\\G=WJ;^Ih?B97_iIF@\\Dl<eK1je8SNTWo_=XFMZH<<JYLZ^YQMPgYOV45K_:]kSI8^XlO0]GY=VUfe_C_F6TOcoAlVUH:o=WhhT@K`2KFhe<3\\KXQ>W:M?S_4S5d@J^`[AGA7@3]DnGSCO`\\?E8HT75^d9\\:m\\m1egIfk8cd6bD9\\eU8\\n[Pb0Cgd^S0n9kGJHb]i5XodlKHc34Fhi9K>0U5WK`>7Ff2^KL=WC6:kc?e5C^a1T1:4:^S5flXlGNIj08AfO?Dh7T7dWO>E]NI9?ob7B7P_h[4TEP[EU;GllFTnSmg9:\\[N]<SAoKP_kPlG56A:I3T6EG8Hj=XnUE`KT5U@OQ?]7[N^MFN1_NU4KO_3::Le`8IL9[1Z1H1;V3SC\\N3]S@4U[F2mhT5dYM7[4Pg_Na0_8WTH0`bgceQS8]EG;XgD4Ib4iLTP@kE79Mn>AYRJA1U5^Blhgno:aHVYc03c3J0Vc9FjEV^M75Zfd8kVC9>iJDk`AJ[6f7DK2D^DL\\AX:6b5h31XH;RQB\\N<ZSM=J;6L[`UW^eOIFc1Y]6_dfedIe4ARh72mTXC0WND_IDHVCZRDE0eODARCEETQI5TPUQE=jEH5bS?LP[ai`F5ABRYDo2o\\@=]GT?_9;hc4Lm:\\SF9k1T<0E@fX9BG[]g0nY7k[Qmi@la8`PF0j6@Q?Ii7bLkXQ<lLHf]`:DCh@9JY5>hEVLTdhL\\b1EB0lLh<=WaO@F<;8g<d:@e:LA:cFIEdmQh7hNHfSRToW?8N4:Z1K;XEDRO;OIDh<UdVln?bjgL>?VE98[B\\K<BVjkG8LiSX;fb>jf?DUK00Aih<WY6QD6cEnHBZ8iN_fd<G8Ci`11RUW2QlW]IXV:m?;J0GXXHfGNQ>:D`=fLPbO?VOTEYLj^cNj5PM>jKB5HVjJ4U7lXaTQNL9<@\\1`m\\Ug@VQHd7>jW=ca0`miF7;N0F=GjoQ`RFchKMGTmn8cF@Oh4GGCm7m2`U9j93Tb>=kSERjE_J939F01I1;`<ijk_=_Vn=7RVAI6fnQI5KlF:C44bN<<8K=Z<2TP<1]5?<dB>^LA=ebloE2Y2:9lkh0\\<YKbHD97iE`<C5oj^1>X:??`H6BXF2hG1Q[dF0Q=>W=J?7C\\k1T?<;R44oW?1hY^G8Zm]ZKnfOf0eCFYo6?=D8?<`6HU5SXh1;=:23LmV_FSi;OJfV<^?GkIDPISeHg1LaGE:V3Y3K3H<QJfbY?=;ldZRhnhQT_mGXDLFXXhSONE6Do_0iNZagB:BPGOTH;VhHUTd6LhQm^[;dO]5Hlkg<R:F<Kn\\:I:EGojgWZ2X@SYO_dlH;G8S<>oEKabY`:oU;=JW7ig?S?EYb86b7n8ce\\]IRa]koiWY<RfO;5kUI;7lVeC?[@ZaXDiF04B8R]bg@>O<mQDoUcBLcf^f>m2kMBUloD>Ze@NN^Z11TM`inXYhE_I=kA`:ZF4d\\>`L@;ZP[`ENU5cL[BV6\\Z?Di76:jg3hE6oG6jFc8kP=[GS1;WSedYQW1:U4\\OF32GgmMC<AjO]872bdBb`bKAA?8j78b>T3VfcUB2m4J^CPRU;8dScI]LU]^bBYA5_3:Y0N5i^?200000";
var MersenneTwister = class MersenneTwister2 {
  constructor(states, index) {
    this.states = states;
    this.index = index;
  }
  clone() {
    return new MersenneTwister2(this.states.slice(), this.index);
  }
  next() {
    let y = this.states[this.index];
    y ^= y >>> U;
    y ^= y << S & B;
    y ^= y << T & C;
    y ^= y >>> L;
    this.index = twistedNext(this.states, this.index);
    return y;
  }
  getState() {
    return [this.index, ...this.states];
  }
  jump() {
    const originalStates = this.states.slice();
    const originalIndex = this.index;
    this.index = twistedNext(this.states, this.index);
    for (let i = 19932; i > 0; --i) {
      if (JUMP_COEFS.charCodeAt(i / 6 | 0) - 48 & 1 << i % 6) addState(this.states, this.index, originalStates, originalIndex);
      this.index = twistedNext(this.states, this.index);
    }
    addState(this.states, this.index, originalStates, originalIndex);
  }
};
function addState(mt, idx, originalMt, originalIdx) {
  let i = 0;
  if (originalIdx >= idx) {
    for (; i < N - originalIdx; i++) mt[i + idx] ^= originalMt[i + originalIdx];
    for (; i < N - idx; i++) mt[i + idx] ^= originalMt[i + originalIdx - N];
    for (; i < N; i++) mt[i + idx - N] ^= originalMt[i + originalIdx - N];
  } else {
    for (; i < N - idx; i++) mt[i + idx] ^= originalMt[i + originalIdx];
    for (; i < N - originalIdx; i++) mt[i + idx - N] ^= originalMt[i + originalIdx];
    for (; i < N; i++) mt[i + idx - N] ^= originalMt[i + originalIdx - N];
  }
}
function twistedNext(mt, idx) {
  if (idx < N - M) {
    const y = mt[idx] & MASK_UPPER | mt[idx + 1] & MASK_LOWER;
    mt[idx] = mt[idx + M] ^ y >>> 1 ^ -(y & 1) & A;
    return idx + 1;
  } else if (idx < N - 1) {
    const y = mt[idx] & MASK_UPPER | mt[idx + 1] & MASK_LOWER;
    mt[idx] = mt[idx + M - N] ^ y >>> 1 ^ -(y & 1) & A;
    return idx + 1;
  } else {
    const y = mt[idx] & MASK_UPPER | mt[0] & MASK_LOWER;
    mt[idx] = mt[M - 1] ^ y >>> 1 ^ -(y & 1) & A;
    return 0;
  }
}
function twist(mt) {
  for (let idx = 0; idx !== N; ++idx) twistedNext(mt, idx);
}
function mersenne(seed) {
  const out = [seed | 0];
  for (let idx = 1; idx !== N; ++idx) {
    const xored = out[idx - 1] ^ out[idx - 1] >>> 30;
    out.push(Math.imul(F, xored) + idx | 0);
  }
  twist(out);
  return new MersenneTwister(out, 0);
}

// node_modules/pure-rand/lib/esm/generator/xorshift128plus.js
var jumps = [
  1667051007,
  2321340297,
  1548169110,
  304075285
];
var XorShift128Plus = class XorShift128Plus2 {
  constructor(s01, s00, s11, s10) {
    this.s01 = s01;
    this.s00 = s00;
    this.s11 = s11;
    this.s10 = s10;
  }
  clone() {
    return new XorShift128Plus2(this.s01, this.s00, this.s11, this.s10);
  }
  next() {
    const a0 = this.s00 ^ this.s00 << 23;
    const a1 = this.s01 ^ (this.s01 << 23 | this.s00 >>> 9);
    const s10 = this.s10;
    const s11 = this.s11;
    const out = this.s00 + s10 | 0;
    this.s01 = s11;
    this.s00 = s10;
    this.s11 = a1 ^ s11 ^ a1 >>> 18 ^ s11 >>> 5;
    this.s10 = a0 ^ s10 ^ (a0 >>> 18 | a1 << 14) ^ (s10 >>> 5 | s11 << 27);
    return out;
  }
  jump() {
    let ns01 = 0;
    let ns00 = 0;
    let ns11 = 0;
    let ns10 = 0;
    let s01 = this.s01;
    let s00 = this.s00;
    let s11 = this.s11;
    let s10 = this.s10;
    for (let i = 0; i !== 4; ++i) {
      const ji = jumps[i];
      for (let mask = 1; mask; mask <<= 1) {
        if (ji & mask) {
          ns01 ^= s01;
          ns00 ^= s00;
          ns11 ^= s11;
          ns10 ^= s10;
        }
        const a0 = s00 ^ s00 << 23;
        const a1 = s01 ^ (s01 << 23 | s00 >>> 9);
        s01 = s11;
        s00 = s10;
        s10 = a0 ^ s10 ^ (a0 >>> 18 | a1 << 14) ^ (s10 >>> 5 | s11 << 27);
        s11 = a1 ^ s11 ^ a1 >>> 18 ^ s11 >>> 5;
      }
    }
    this.s01 = ns01;
    this.s00 = ns00;
    this.s11 = ns11;
    this.s10 = ns10;
  }
  getState() {
    return [
      this.s01,
      this.s00,
      this.s11,
      this.s10
    ];
  }
};
function xorshift128plus(seed) {
  return new XorShift128Plus(-1, ~seed, seed | 0, 0);
}

// node_modules/pure-rand/lib/esm/generator/xoroshiro128plus.js
var jumps2 = [
  3639956645,
  3750757012,
  1261568508,
  386426335
];
var XoroShiro128Plus = class XoroShiro128Plus2 {
  constructor(s01, s00, s11, s10) {
    this.s01 = s01;
    this.s00 = s00;
    this.s11 = s11;
    this.s10 = s10;
  }
  clone() {
    return new XoroShiro128Plus2(this.s01, this.s00, this.s11, this.s10);
  }
  next() {
    const out = this.s00 + this.s10 | 0;
    const a0 = this.s10 ^ this.s00;
    const a1 = this.s11 ^ this.s01;
    const s00 = this.s00;
    const s01 = this.s01;
    this.s00 = s00 << 24 ^ s01 >>> 8 ^ a0 ^ a0 << 16;
    this.s01 = s01 << 24 ^ s00 >>> 8 ^ a1 ^ (a1 << 16 | a0 >>> 16);
    this.s10 = a1 << 5 ^ a0 >>> 27;
    this.s11 = a0 << 5 ^ a1 >>> 27;
    return out;
  }
  jump() {
    let ns01 = 0;
    let ns00 = 0;
    let ns11 = 0;
    let ns10 = 0;
    let s01 = this.s01;
    let s00 = this.s00;
    let s11 = this.s11;
    let s10 = this.s10;
    for (let i = 0; i !== 4; ++i) {
      const ji = jumps2[i];
      for (let mask = 1; mask; mask <<= 1) {
        if (ji & mask) {
          ns01 ^= s01;
          ns00 ^= s00;
          ns11 ^= s11;
          ns10 ^= s10;
        }
        const a0 = s10 ^ s00;
        const a1 = s11 ^ s01;
        const s00_ = s00;
        const s01_ = s01;
        s00 = s00_ << 24 ^ s01_ >>> 8 ^ a0 ^ a0 << 16;
        s01 = s01_ << 24 ^ s00_ >>> 8 ^ a1 ^ (a1 << 16 | a0 >>> 16);
        s10 = a1 << 5 ^ a0 >>> 27;
        s11 = a0 << 5 ^ a1 >>> 27;
      }
    }
    this.s01 = ns01;
    this.s00 = ns00;
    this.s11 = ns11;
    this.s10 = ns10;
  }
  getState() {
    return [
      this.s01,
      this.s00,
      this.s11,
      this.s10
    ];
  }
};
function xoroshiro128plus(seed) {
  return new XoroShiro128Plus(-1, ~seed, seed | 0, 0);
}

// node_modules/pure-rand/lib/esm/utils/skipN.js
function skipN(rng, num) {
  for (let idx = 0; idx !== num; ++idx) rng.next();
}

// node_modules/pure-rand/lib/esm/distribution/uniformBigInt.js
var SBigInt = BigInt;
var NumValues = 4294967296n;
function uniformBigInt(rng, from, to) {
  const diff = to - from + 1n;
  let FinalNumValues = NumValues;
  let NumIterations = 1;
  while (FinalNumValues < diff) {
    FinalNumValues <<= 32n;
    ++NumIterations;
  }
  let value = generateNext(NumIterations, rng);
  if (value < diff) return value + from;
  if (value + diff < FinalNumValues) return value % diff + from;
  const MaxAcceptedRandom = FinalNumValues - FinalNumValues % diff;
  while (value >= MaxAcceptedRandom) value = generateNext(NumIterations, rng);
  return value % diff + from;
}
function generateNext(NumIterations, rng) {
  let value = SBigInt(rng.next() + 2147483648);
  for (let num = 1; num < NumIterations; ++num) {
    const out = rng.next();
    value = (value << 32n) + SBigInt(out + 2147483648);
  }
  return value;
}

// node_modules/pure-rand/lib/esm/distribution/uniformInt.js
function uniformIntInternal(rng, rangeSize) {
  const MaxAllowed = rangeSize > 2 ? ~~(4294967296 / rangeSize) * rangeSize : 4294967296;
  let deltaV = rng.next() + 2147483648;
  while (deltaV >= MaxAllowed) deltaV = rng.next() + 2147483648;
  return deltaV % rangeSize;
}
function fromNumberToArrayInt64(out, n) {
  if (n < 0) {
    const posN = -n;
    out.sign = -1;
    out.data[0] = ~~(posN / 4294967296);
    out.data[1] = posN >>> 0;
  } else {
    out.sign = 1;
    out.data[0] = ~~(n / 4294967296);
    out.data[1] = n >>> 0;
  }
  return out;
}
function substractArrayInt64(out, arrayIntA, arrayIntB) {
  const lowA = arrayIntA.data[1];
  const highA = arrayIntA.data[0];
  const signA = arrayIntA.sign;
  const lowB = arrayIntB.data[1];
  const highB = arrayIntB.data[0];
  const signB = arrayIntB.sign;
  out.sign = 1;
  if (signA === 1 && signB === -1) {
    const low2 = lowA + lowB;
    const high = highA + highB + (low2 > 4294967295 ? 1 : 0);
    out.data[0] = high >>> 0;
    out.data[1] = low2 >>> 0;
    return out;
  }
  let lowFirst = lowA;
  let highFirst = highA;
  let lowSecond = lowB;
  let highSecond = highB;
  if (signA === -1) {
    lowFirst = lowB;
    highFirst = highB;
    lowSecond = lowA;
    highSecond = highA;
  }
  let reminderLow = 0;
  let low = lowFirst - lowSecond;
  if (low < 0) {
    reminderLow = 1;
    low = low >>> 0;
  }
  out.data[0] = highFirst - highSecond - reminderLow;
  out.data[1] = low;
  return out;
}
function uniformArrayIntInternal(rng, out, rangeSize) {
  const maxIndex0 = rangeSize[0] + 1;
  out[0] = uniformIntInternal(rng, maxIndex0);
  out[1] = uniformIntInternal(rng, 4294967296);
  while (out[0] >= rangeSize[0] && (out[0] !== rangeSize[0] || out[1] >= rangeSize[1])) {
    out[0] = uniformIntInternal(rng, maxIndex0);
    out[1] = uniformIntInternal(rng, 4294967296);
  }
  return out;
}
var safeNumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
var sharedA = {
  sign: 1,
  data: [0, 0]
};
var sharedB = {
  sign: 1,
  data: [0, 0]
};
var sharedC = {
  sign: 1,
  data: [0, 0]
};
var sharedData = [0, 0];
function uniformLargeIntInternal(rng, from, to, rangeSize) {
  const rangeSizeArrayIntValue = rangeSize <= safeNumberMaxSafeInteger ? fromNumberToArrayInt64(sharedC, rangeSize) : substractArrayInt64(sharedC, fromNumberToArrayInt64(sharedA, to), fromNumberToArrayInt64(sharedB, from));
  if (rangeSizeArrayIntValue.data[1] === 4294967295) {
    rangeSizeArrayIntValue.data[0] += 1;
    rangeSizeArrayIntValue.data[1] = 0;
  } else rangeSizeArrayIntValue.data[1] += 1;
  uniformArrayIntInternal(rng, sharedData, rangeSizeArrayIntValue.data);
  return sharedData[0] * 4294967296 + sharedData[1] + from;
}
function uniformInt(rng, from, to) {
  const rangeSize = to - from;
  if (rangeSize <= 4294967295) return uniformIntInternal(rng, rangeSize + 1) + from;
  return uniformLargeIntInternal(rng, from, to, rangeSize);
}

// node_modules/fast-check/lib/fast-check.js
var SharedFootPrint = /* @__PURE__ */ Symbol.for("fast-check/PreconditionFailure");
var PreconditionFailure = class extends Error {
  constructor(interruptExecution = false) {
    super();
    this.interruptExecution = interruptExecution;
    this.footprint = SharedFootPrint;
  }
  static isFailure(err) {
    return err !== null && err !== void 0 && err.footprint === SharedFootPrint;
  }
};
var Nil = class {
  [Symbol.iterator]() {
    return this;
  }
  next(value) {
    return {
      value,
      done: true
    };
  }
};
var nil = new Nil();
function nilHelper() {
  return nil;
}
function* mapHelper(g, f) {
  for (const v of g) yield f(v);
}
function* flatMapHelper(g, f) {
  for (const v of g) yield* f(v);
}
function* filterHelper(g, f) {
  for (const v of g) if (f(v)) yield v;
}
function* takeNHelper(g, n) {
  for (let i = 0; i < n; ++i) {
    const cur = g.next();
    if (cur.done) break;
    yield cur.value;
  }
}
function* takeWhileHelper(g, f) {
  let cur = g.next();
  while (!cur.done && f(cur.value)) {
    yield cur.value;
    cur = g.next();
  }
}
function* joinHelper(g, others) {
  for (let cur = g.next(); !cur.done; cur = g.next()) yield cur.value;
  for (const s of others) for (let cur = s.next(); !cur.done; cur = s.next()) yield cur.value;
}
var safeSymbolIterator$1 = Symbol.iterator;
var Stream = class Stream2 {
  /**
  * Create an empty stream of T
  * @remarks Since 0.0.1
  */
  static nil() {
    return new Stream2(nilHelper());
  }
  /**
  * Create a stream of T from a variable number of elements
  *
  * @param elements - Elements used to create the Stream
  * @remarks Since 2.12.0
  */
  static of(...elements) {
    return new Stream2(elements[safeSymbolIterator$1]());
  }
  /**
  * Create a Stream based on `g`
  * @param g - Underlying data of the Stream
  */
  constructor(g) {
    this.g = g;
  }
  next() {
    return this.g.next();
  }
  [Symbol.iterator]() {
    return this.g;
  }
  /**
  * Map all elements of the Stream using `f`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Mapper function
  * @remarks Since 0.0.1
  */
  map(f) {
    return new Stream2(mapHelper(this.g, f));
  }
  /**
  * Flat map all elements of the Stream using `f`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Mapper function
  * @remarks Since 0.0.1
  */
  flatMap(f) {
    return new Stream2(flatMapHelper(this.g, f));
  }
  /**
  * Drop elements from the Stream while `f(element) === true`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Drop condition
  * @remarks Since 0.0.1
  */
  dropWhile(f) {
    let foundEligible = false;
    function* helper(v) {
      if (foundEligible || !f(v)) {
        foundEligible = true;
        yield v;
      }
    }
    return this.flatMap(helper);
  }
  /**
  * Drop `n` first elements of the Stream
  *
  * WARNING: It closes the current stream
  *
  * @param n - Number of elements to drop
  * @remarks Since 0.0.1
  */
  drop(n) {
    if (n <= 0) return this;
    let idx = 0;
    function helper() {
      return idx++ < n;
    }
    return this.dropWhile(helper);
  }
  /**
  * Take elements from the Stream while `f(element) === true`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Take condition
  * @remarks Since 0.0.1
  */
  takeWhile(f) {
    return new Stream2(takeWhileHelper(this.g, f));
  }
  /**
  * Take `n` first elements of the Stream
  *
  * WARNING: It closes the current stream
  *
  * @param n - Number of elements to take
  * @remarks Since 0.0.1
  */
  take(n) {
    return new Stream2(takeNHelper(this.g, n));
  }
  filter(f) {
    return new Stream2(filterHelper(this.g, f));
  }
  /**
  * Check whether all elements of the Stream are successful for `f`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Condition to check
  * @remarks Since 0.0.1
  */
  every(f) {
    for (const v of this.g) if (!f(v)) return false;
    return true;
  }
  /**
  * Check whether one of the elements of the Stream is successful for `f`
  *
  * WARNING: It closes the current stream
  *
  * @param f - Condition to check
  * @remarks Since 0.0.1
  */
  has(f) {
    for (const v of this.g) if (f(v)) return [true, v];
    return [false, null];
  }
  /**
  * Join `others` Stream to the current Stream
  *
  * WARNING: It closes the current stream and the other ones (as soon as it iterates over them)
  *
  * @param others - Streams to join to the current Stream
  * @remarks Since 0.0.1
  */
  join(...others) {
    return new Stream2(joinHelper(this.g, others));
  }
  /**
  * Take the `nth` element of the Stream of the last (if it does not exist)
  *
  * WARNING: It closes the current stream
  *
  * @param nth - Position of the element to extract
  * @remarks Since 0.0.12
  */
  getNthOrLast(nth) {
    let remaining = nth;
    let last = null;
    for (const v of this.g) {
      if (remaining-- === 0) return v;
      last = v;
    }
    return last;
  }
};
function stream(g) {
  return new Stream(g);
}
var cloneMethod = /* @__PURE__ */ Symbol.for("fast-check/cloneMethod");
function hasCloneMethod(instance) {
  return instance !== null && (typeof instance === "object" || typeof instance === "function") && cloneMethod in instance && typeof instance[cloneMethod] === "function";
}
function cloneIfNeeded(instance) {
  return hasCloneMethod(instance) ? instance[cloneMethod]() : instance;
}
var safeObjectDefineProperty$4 = Object.defineProperty;
var Value = class {
  /**
  * @param value_ - Internal value of the shrinkable
  * @param context - Context associated to the generated value (useful for shrink)
  * @param customGetValue - Limited to internal usages (to ease migration to next), it will be removed on next major
  */
  constructor(value_, context, customGetValue) {
    this.value_ = value_;
    this.context = context;
    this.hasToBeCloned = customGetValue !== void 0 || hasCloneMethod(value_);
    this.readOnce = false;
    this.value = value_;
    if (this.hasToBeCloned) safeObjectDefineProperty$4(this, "value", {
      get: customGetValue !== void 0 ? customGetValue : this.getValue,
      enumerable: false,
      configurable: false
    });
  }
  /** @internal */
  getValue() {
    if (this.hasToBeCloned) {
      if (!this.readOnce) {
        this.readOnce = true;
        return this.value_;
      }
      return this.value_[cloneMethod]();
    }
    return this.value_;
  }
};
var Arbitrary = class {
  filter(refinement) {
    return new FilterArbitrary(this, refinement);
  }
  /**
  * Create another arbitrary by mapping all produced values using the provided `mapper`
  * Values produced by the new arbitrary are the result of applying `mapper` value by value
  *
  * @example
  * ```typescript
  * const rgbChannels: Arbitrary<{r:number,g:number,b:number}> = ...;
  * const color: Arbitrary<string> = rgbChannels.map(ch => `#${(ch.r*65536 + ch.g*256 + ch.b).toString(16).padStart(6, '0')}`);
  * // transform an Arbitrary producing {r,g,b} integers into an Arbitrary of '#rrggbb'
  * ```
  *
  * @param mapper - Map function, to produce a new element based on an old one
  * @param unmapper - Optional unmap function, it will never be used except when shrinking user defined values. Must throw if value is not compatible (since 3.0.0)
  * @returns New arbitrary with mapped elements
  *
  * @remarks Since 0.0.1
  */
  map(mapper, unmapper) {
    return new MapArbitrary(this, mapper, unmapper);
  }
  /**
  * Create another arbitrary by mapping a value from a base Arbirary using the provided `fmapper`
  * Values produced by the new arbitrary are the result of the arbitrary generated by applying `fmapper` to a value
  * @example
  * ```typescript
  * const arrayAndLimitArbitrary = fc.nat().chain((c: number) => fc.tuple( fc.array(fc.nat(c)), fc.constant(c)));
  * ```
  *
  * @param chainer - Chain function, to produce a new Arbitrary using a value from another Arbitrary
  * @returns New arbitrary of new type
  *
  * @remarks Since 1.2.0
  */
  chain(chainer) {
    return new ChainArbitrary(this, chainer);
  }
};
var ChainArbitrary = class extends Arbitrary {
  constructor(arb, chainer) {
    super();
    this.arb = arb;
    this.chainer = chainer;
  }
  generate(mrng, biasFactor) {
    const clonedMrng = mrng.clone();
    const src = this.arb.generate(mrng, biasFactor);
    return this.valueChainer(src, mrng, clonedMrng, biasFactor);
  }
  canShrinkWithoutContext(_value) {
    return false;
  }
  shrink(value, context) {
    if (this.isSafeContext(context)) return (!context.stoppedForOriginal ? this.arb.shrink(context.originalValue, context.originalContext).map((v) => this.valueChainer(v, context.clonedMrng.clone(), context.clonedMrng, context.originalBias)) : Stream.nil()).join(context.chainedArbitrary.shrink(value, context.chainedContext).map((dst) => {
      const newContext = {
        ...context,
        chainedContext: dst.context,
        stoppedForOriginal: true
      };
      return new Value(dst.value_, newContext);
    }));
    return Stream.nil();
  }
  valueChainer(v, generateMrng, clonedMrng, biasFactor) {
    const chainedArbitrary = this.chainer(v.value_);
    const dst = chainedArbitrary.generate(generateMrng, biasFactor);
    const context = {
      originalBias: biasFactor,
      originalValue: v.value_,
      originalContext: v.context,
      stoppedForOriginal: false,
      chainedArbitrary,
      chainedContext: dst.context,
      clonedMrng
    };
    return new Value(dst.value_, context);
  }
  isSafeContext(context) {
    return context !== null && context !== void 0 && typeof context === "object" && "originalBias" in context && "originalValue" in context && "originalContext" in context && "stoppedForOriginal" in context && "chainedArbitrary" in context && "chainedContext" in context && "clonedMrng" in context;
  }
};
function mapperWithCloneIfNeeded(v, mapper) {
  const sourceValue = v.value;
  const mappedValue = mapper(sourceValue);
  if (v.hasToBeCloned && (typeof mappedValue === "object" && mappedValue !== null || typeof mappedValue === "function") && Object.isExtensible(mappedValue) && !hasCloneMethod(mappedValue)) Object.defineProperty(mappedValue, cloneMethod, { get: () => () => mapperWithCloneIfNeeded(v, mapper)[0] });
  return [mappedValue, sourceValue];
}
function valueMapper(v, mapper) {
  const [mappedValue, sourceValue] = mapperWithCloneIfNeeded(v, mapper);
  return new Value(mappedValue, {
    originalValue: sourceValue,
    originalContext: v.context
  });
}
var MapArbitrary = class extends Arbitrary {
  constructor(arb, mapper, unmapper) {
    super();
    this.arb = arb;
    this.mapper = mapper;
    this.unmapper = unmapper;
    this.bindValueMapper = (v) => valueMapper(v, mapper);
  }
  generate(mrng, biasFactor) {
    const g = this.arb.generate(mrng, biasFactor);
    if (!g.hasToBeCloned) {
      const sourceValue = g.value;
      return new Value(this.mapper(sourceValue), {
        originalValue: sourceValue,
        originalContext: g.context
      });
    }
    return valueMapper(g, this.mapper);
  }
  canShrinkWithoutContext(value) {
    if (this.unmapper !== void 0) try {
      const unmapped = this.unmapper(value);
      return this.arb.canShrinkWithoutContext(unmapped);
    } catch {
      return false;
    }
    return false;
  }
  shrink(value, context) {
    if (this.isSafeContext(context)) return this.arb.shrink(context.originalValue, context.originalContext).map(this.bindValueMapper);
    if (this.unmapper !== void 0) {
      const unmapped = this.unmapper(value);
      return this.arb.shrink(unmapped, void 0).map(this.bindValueMapper);
    }
    return Stream.nil();
  }
  isSafeContext(context) {
    return context !== null && context !== void 0 && typeof context === "object" && "originalValue" in context && "originalContext" in context;
  }
};
var FilterArbitrary = class extends Arbitrary {
  constructor(arb, refinement) {
    super();
    this.arb = arb;
    this.refinement = refinement;
    this.bindRefinementOnValue = (v) => this.refinementOnValue(v);
  }
  generate(mrng, biasFactor) {
    while (true) {
      const g = this.arb.generate(mrng, biasFactor);
      if (this.refinementOnValue(g)) return g;
    }
  }
  canShrinkWithoutContext(value) {
    return this.arb.canShrinkWithoutContext(value) && this.refinement(value);
  }
  shrink(value, context) {
    return this.arb.shrink(value, context).filter(this.bindRefinementOnValue);
  }
  refinementOnValue(v) {
    return this.refinement(v.value);
  }
};
function isArbitrary(instance) {
  return typeof instance === "object" && instance !== null && "generate" in instance && "shrink" in instance && "canShrinkWithoutContext" in instance;
}
var untouchedApply = Function.prototype.apply;
var ApplySymbol = /* @__PURE__ */ Symbol("apply");
function safeExtractApply(f) {
  try {
    return f.apply;
  } catch {
    return;
  }
}
function safeApplyHacky(f, instance, args) {
  const ff = f;
  ff[ApplySymbol] = untouchedApply;
  const out = ff[ApplySymbol](instance, args);
  delete ff[ApplySymbol];
  return out;
}
function safeApply(f, instance, args) {
  if (safeExtractApply(f) === untouchedApply) return f.apply(instance, args);
  return safeApplyHacky(f, instance, args);
}
var SArray = Array;
var SBigInt2 = BigInt;
var SBoolean = Boolean;
var SDate = Date;
var SError = Error;
var SFloat32Array = Float32Array;
var SFloat64Array = Float64Array;
var SInt8Array = Int8Array;
var SInt16Array = Int16Array;
var SInt32Array = Int32Array;
var SNumber = Number;
var SString = String;
var SSet = Set;
var SUint8Array = Uint8Array;
var SUint8ClampedArray = Uint8ClampedArray;
var SUint16Array = Uint16Array;
var SUint32Array = Uint32Array;
var SMap$2 = Map;
var SSymbol = Symbol;
var untouchedForEach = Array.prototype.forEach;
var untouchedIndexOf = Array.prototype.indexOf;
var untouchedJoin = Array.prototype.join;
var untouchedMap = Array.prototype.map;
var untouchedFlat = Array.prototype.flat;
var untouchedFilter = Array.prototype.filter;
var untouchedPush = Array.prototype.push;
var untouchedPop = Array.prototype.pop;
var untouchedSplice = Array.prototype.splice;
var untouchedSlice = Array.prototype.slice;
var untouchedSort = Array.prototype.sort;
var untouchedEvery = Array.prototype.every;
function extractIndexOf(instance) {
  try {
    return instance.indexOf;
  } catch {
    return;
  }
}
function extractJoin(instance) {
  try {
    return instance.join;
  } catch {
    return;
  }
}
function extractMap(instance) {
  try {
    return instance.map;
  } catch {
    return;
  }
}
function extractFilter(instance) {
  try {
    return instance.filter;
  } catch {
    return;
  }
}
function extractPush(instance) {
  try {
    return instance.push;
  } catch {
    return;
  }
}
function extractPop(instance) {
  try {
    return instance.pop;
  } catch {
    return;
  }
}
function extractSlice(instance) {
  try {
    return instance.slice;
  } catch {
    return;
  }
}
function extractEvery(instance) {
  try {
    return instance.every;
  } catch {
    return;
  }
}
function safeIndexOf(instance, ...args) {
  if (extractIndexOf(instance) === untouchedIndexOf) return instance.indexOf(...args);
  return safeApply(untouchedIndexOf, instance, args);
}
function safeJoin(instance, ...args) {
  if (extractJoin(instance) === untouchedJoin) return instance.join(...args);
  return safeApply(untouchedJoin, instance, args);
}
function safeMap(instance, fn) {
  if (extractMap(instance) === untouchedMap) return instance.map(fn);
  return safeApply(untouchedMap, instance, [fn]);
}
function safeFilter(instance, predicate) {
  if (extractFilter(instance) === untouchedFilter) return instance.filter(predicate);
  return safeApply(untouchedFilter, instance, [predicate]);
}
function safePush(instance, ...args) {
  if (extractPush(instance) === untouchedPush) return instance.push(...args);
  return safeApply(untouchedPush, instance, args);
}
function safePop$1(instance) {
  if (extractPop(instance) === untouchedPop) return instance.pop();
  return safeApply(untouchedPop, instance, []);
}
function safeSlice(instance, ...args) {
  if (extractSlice(instance) === untouchedSlice) return instance.slice(...args);
  return safeApply(untouchedSlice, instance, args);
}
function safeEvery(instance, ...args) {
  if (extractEvery(instance) === untouchedEvery) return instance.every(...args);
  return safeApply(untouchedEvery, instance, args);
}
var untouchedGetTime = Date.prototype.getTime;
var untouchedToISOString = Date.prototype.toISOString;
function extractGetTime(instance) {
  try {
    return instance.getTime;
  } catch {
    return;
  }
}
function extractToISOString(instance) {
  try {
    return instance.toISOString;
  } catch {
    return;
  }
}
function safeGetTime(instance) {
  if (extractGetTime(instance) === untouchedGetTime) return instance.getTime();
  return safeApply(untouchedGetTime, instance, []);
}
function safeToISOString(instance) {
  if (extractToISOString(instance) === untouchedToISOString) return instance.toISOString();
  return safeApply(untouchedToISOString, instance, []);
}
var untouchedAdd = Set.prototype.add;
var untouchedHas = Set.prototype.has;
function extractAdd(instance) {
  try {
    return instance.add;
  } catch {
    return;
  }
}
function extractHas(instance) {
  try {
    return instance.has;
  } catch (err) {
    return;
  }
}
function safeAdd(instance, value) {
  if (extractAdd(instance) === untouchedAdd) return instance.add(value);
  return safeApply(untouchedAdd, instance, [value]);
}
function safeHas(instance, value) {
  if (extractHas(instance) === untouchedHas) return instance.has(value);
  return safeApply(untouchedHas, instance, [value]);
}
var untouchedSet = WeakMap.prototype.set;
var untouchedGet = WeakMap.prototype.get;
function extractSet(instance) {
  try {
    return instance.set;
  } catch (err) {
    return;
  }
}
function extractGet(instance) {
  try {
    return instance.get;
  } catch (err) {
    return;
  }
}
function safeSet(instance, key, value) {
  if (extractSet(instance) === untouchedSet) return instance.set(key, value);
  return safeApply(untouchedSet, instance, [key, value]);
}
function safeGet(instance, key) {
  if (extractGet(instance) === untouchedGet) return instance.get(key);
  return safeApply(untouchedGet, instance, [key]);
}
var untouchedMapSet = Map.prototype.set;
var untouchedMapGet = Map.prototype.get;
var untouchedMapHas = Map.prototype.has;
function extractMapSet(instance) {
  try {
    return instance.set;
  } catch (err) {
    return;
  }
}
function extractMapGet(instance) {
  try {
    return instance.get;
  } catch (err) {
    return;
  }
}
function safeMapSet(instance, key, value) {
  if (extractMapSet(instance) === untouchedMapSet) return instance.set(key, value);
  return safeApply(untouchedMapSet, instance, [key, value]);
}
function safeMapGet(instance, key) {
  if (extractMapGet(instance) === untouchedMapGet) return instance.get(key);
  return safeApply(untouchedMapGet, instance, [key]);
}
var untouchedSplit = String.prototype.split;
var untouchedStartsWith = String.prototype.startsWith;
var untouchedEndsWith = String.prototype.endsWith;
var untouchedSubstring = String.prototype.substring;
var untouchedToLowerCase = String.prototype.toLowerCase;
var untouchedToUpperCase = String.prototype.toUpperCase;
var untouchedPadStart = String.prototype.padStart;
var untouchedCharCodeAt = String.prototype.charCodeAt;
var untouchedNormalize = String.prototype.normalize;
var untouchedReplace = String.prototype.replace;
function extractSubstring(instance) {
  try {
    return instance.substring;
  } catch {
    return;
  }
}
function extractNormalize(instance) {
  try {
    return instance.normalize;
  } catch (err) {
    return;
  }
}
function safeSubstring(instance, ...args) {
  if (extractSubstring(instance) === untouchedSubstring) return instance.substring(...args);
  return safeApply(untouchedSubstring, instance, args);
}
function safeNormalize(instance, form) {
  if (extractNormalize(instance) === untouchedNormalize) return instance.normalize(form);
  return safeApply(untouchedNormalize, instance, [form]);
}
var untouchedNumberToString = Number.prototype.toString;
var untouchedToString = Object.prototype.toString;
function safeToString(instance) {
  return safeApply(untouchedToString, instance, []);
}
var untouchedErrorToString = Error.prototype.toString;
var LazyIterableIterator = class {
  constructor(producer) {
    this.producer = producer;
  }
  [Symbol.iterator]() {
    if (this.it === void 0) this.it = this.producer();
    return this.it;
  }
  next() {
    if (this.it === void 0) this.it = this.producer();
    return this.it.next();
  }
};
function makeLazy(producer) {
  return new LazyIterableIterator(producer);
}
var safeArrayIsArray$4 = Array.isArray;
var safeObjectDefineProperty$3 = Object.defineProperty;
function tupleMakeItCloneable(vs, ctxs, values) {
  return safeObjectDefineProperty$3(vs, cloneMethod, { value: () => {
    const cloned = [];
    for (let idx = 0; idx !== values.length; ++idx) {
      let current = values[idx];
      if (current === void 0) current = new Value(vs[idx], ctxs[idx]);
      safePush(cloned, current.value);
    }
    tupleMakeItCloneable(cloned, ctxs, values);
    return cloned;
  } });
}
function tupleShrink(arbs, value, context) {
  const shrinks = [];
  const safeContext = safeArrayIsArray$4(context) ? context : [];
  for (let idx = 0; idx !== arbs.length; ++idx) safePush(shrinks, makeLazy(() => arbs[idx].shrink(value[idx], safeContext[idx]).map((v) => {
    let cloneable = false;
    const vs = [];
    const ctxs = [];
    const mapped = [];
    for (let nestedIdx = 0; nestedIdx !== arbs.length; ++nestedIdx) {
      const nestedV = nestedIdx === idx ? v : new Value(cloneIfNeeded(value[nestedIdx]), safeContext[nestedIdx]);
      if (nestedV.hasToBeCloned) {
        cloneable = true;
        mapped[nestedIdx] = nestedV;
      }
      safePush(vs, nestedV.value);
      safePush(ctxs, nestedV.context);
    }
    if (cloneable) tupleMakeItCloneable(vs, ctxs, mapped);
    return new Value(vs, ctxs);
  })));
  return Stream.nil().join(...shrinks);
}
var TupleArbitrary = class extends Arbitrary {
  constructor(arbs) {
    super();
    this.arbs = arbs;
    for (let idx = 0; idx !== arbs.length; ++idx) {
      const arb = arbs[idx];
      if (arb === null || arb === void 0 || arb.generate === null || arb.generate === void 0) throw new Error(`Invalid parameter encountered at index ${idx}: expecting an Arbitrary`);
    }
  }
  generate(mrng, biasFactor) {
    let cloneable = false;
    const vs = [];
    const ctxs = [];
    const mapped = [];
    for (let idx = 0; idx !== this.arbs.length; ++idx) {
      const v = this.arbs[idx].generate(mrng, biasFactor);
      if (v.hasToBeCloned) {
        cloneable = true;
        mapped[idx] = v;
      }
      safePush(vs, v.value);
      safePush(ctxs, v.context);
    }
    if (cloneable) tupleMakeItCloneable(vs, ctxs, mapped);
    return new Value(vs, ctxs);
  }
  canShrinkWithoutContext(value) {
    if (!safeArrayIsArray$4(value) || value.length !== this.arbs.length) return false;
    for (let index = 0; index !== this.arbs.length; ++index) if (!this.arbs[index].canShrinkWithoutContext(value[index])) return false;
    return true;
  }
  shrink(value, context) {
    return tupleShrink(this.arbs, value, context);
  }
};
function tuple(...arbs) {
  return new TupleArbitrary(arbs);
}
var safeMathLog$3 = Math.log;
function runIdToFrequency(runId) {
  return 2 + ~~(safeMathLog$3(runId + 1) * 0.4342944819032518);
}
var globalParameters = {};
function readConfigureGlobal() {
  return globalParameters;
}
var UndefinedContextPlaceholder = /* @__PURE__ */ Symbol("UndefinedContextPlaceholder");
function noUndefinedAsContext(value) {
  if (value.context !== void 0) return value;
  if (value.hasToBeCloned) return new Value(value.value_, UndefinedContextPlaceholder, () => value.value);
  return new Value(value.value_, UndefinedContextPlaceholder);
}
var dummyHook = () => {
};
var Property = class {
  constructor(arb, predicate) {
    this.arb = arb;
    this.predicate = predicate;
    const { beforeEach = dummyHook, afterEach = dummyHook, asyncBeforeEach, asyncAfterEach } = readConfigureGlobal() || {};
    if (asyncBeforeEach !== void 0) throw SError(`"asyncBeforeEach" can't be set when running synchronous properties`);
    if (asyncAfterEach !== void 0) throw SError(`"asyncAfterEach" can't be set when running synchronous properties`);
    this.beforeEachHook = beforeEach;
    this.afterEachHook = afterEach;
  }
  isAsync() {
    return false;
  }
  generate(mrng, runId) {
    return noUndefinedAsContext(this.arb.generate(mrng, runId !== void 0 ? runIdToFrequency(runId) : void 0));
  }
  shrink(value) {
    if (value.context === void 0 && !this.arb.canShrinkWithoutContext(value.value_)) return Stream.nil();
    const safeContext = value.context !== UndefinedContextPlaceholder ? value.context : void 0;
    return this.arb.shrink(value.value_, safeContext).map(noUndefinedAsContext);
  }
  runBeforeEach() {
    this.beforeEachHook();
  }
  runAfterEach() {
    this.afterEachHook();
  }
  run(v) {
    try {
      const output = this.predicate(v);
      return output === void 0 || output === true ? null : { error: new SError("Property failed by returning false") };
    } catch (err) {
      if (PreconditionFailure.isFailure(err)) return err;
      return { error: err };
    }
  }
  beforeEach(hookFunction) {
    const previousBeforeEachHook = this.beforeEachHook;
    this.beforeEachHook = () => hookFunction(previousBeforeEachHook);
    return this;
  }
  afterEach(hookFunction) {
    const previousAfterEachHook = this.afterEachHook;
    this.afterEachHook = () => hookFunction(previousAfterEachHook);
    return this;
  }
};
function adaptRandomGeneratorTo8x(rng) {
  if ("unsafeNext" in rng) {
    if (rng.unsafeJump === void 0) return {
      clone: () => adaptRandomGeneratorTo8x(rng),
      next: () => rng.unsafeNext(),
      getState: () => rng.getState()
    };
    return {
      clone: () => adaptRandomGeneratorTo8x(rng),
      next: () => rng.unsafeNext(),
      jump: () => rng.unsafeJump(),
      getState: () => rng.getState()
    };
  }
  return rng;
}
function adaptRandomGeneratorToInternal(rng) {
  if ("jump" in rng && typeof rng.jump === "function") return rng;
  return {
    clone: () => adaptRandomGeneratorToInternal(rng),
    next: () => rng.next(),
    jump: () => skipN(rng, 42),
    getState: () => rng.getState()
  };
}
function adaptRandomGenerator(rng) {
  return adaptRandomGeneratorToInternal(adaptRandomGeneratorTo8x(rng));
}
var safeDateNow$1 = Date.now;
var safeMathMin$6 = Math.min;
var safeMathRandom = Math.random;
var QualifiedParameters = class {
  constructor(op) {
    const p = op || {};
    this.seed = readSeed(p);
    this.randomType = readRandomType(p);
    this.numRuns = readNumRuns(p);
    this.verbose = readVerbose(p);
    this.maxSkipsPerRun = p.maxSkipsPerRun !== void 0 ? p.maxSkipsPerRun : 100;
    this.timeout = safeTimeout(p.timeout);
    this.skipAllAfterTimeLimit = safeTimeout(p.skipAllAfterTimeLimit);
    this.interruptAfterTimeLimit = safeTimeout(p.interruptAfterTimeLimit);
    this.markInterruptAsFailure = p.markInterruptAsFailure === true;
    this.skipEqualValues = p.skipEqualValues === true;
    this.ignoreEqualValues = p.ignoreEqualValues === true;
    this.logger = p.logger !== void 0 ? p.logger : (v) => {
      console.log(v);
    };
    this.path = p.path !== void 0 ? p.path : "";
    this.unbiased = p.unbiased === true;
    this.examples = p.examples !== void 0 ? p.examples : [];
    this.endOnFailure = p.endOnFailure === true;
    this.reporter = p.reporter;
    this.asyncReporter = p.asyncReporter;
    this.includeErrorInReport = p.includeErrorInReport === true;
    this.plugins = p.plugins !== void 0 ? p.plugins : [];
  }
  toParameters() {
    return {
      seed: this.seed,
      randomType: this.randomType,
      numRuns: this.numRuns,
      maxSkipsPerRun: this.maxSkipsPerRun,
      timeout: this.timeout,
      skipAllAfterTimeLimit: this.skipAllAfterTimeLimit,
      interruptAfterTimeLimit: this.interruptAfterTimeLimit,
      markInterruptAsFailure: this.markInterruptAsFailure,
      skipEqualValues: this.skipEqualValues,
      ignoreEqualValues: this.ignoreEqualValues,
      path: this.path,
      logger: this.logger,
      unbiased: this.unbiased,
      verbose: this.verbose,
      examples: this.examples,
      endOnFailure: this.endOnFailure,
      reporter: this.reporter,
      asyncReporter: this.asyncReporter,
      includeErrorInReport: this.includeErrorInReport,
      plugins: this.plugins
    };
  }
};
function createQualifiedRandomGenerator(random) {
  return (seed) => {
    return adaptRandomGenerator(random(seed));
  };
}
function readSeed(p) {
  if (p.seed === void 0) return safeDateNow$1() ^ safeMathRandom() * 4294967296;
  const seed32 = p.seed | 0;
  if (p.seed === seed32) return seed32;
  return seed32 ^ (p.seed - seed32) * 4294967296;
}
function readRandomType(p) {
  if (p.randomType === void 0) return xorshift128plus;
  if (typeof p.randomType === "string") switch (p.randomType) {
    case "mersenne":
      return createQualifiedRandomGenerator(mersenne);
    case "congruential":
    case "congruential32":
      return createQualifiedRandomGenerator(congruential32);
    case "xorshift128plus":
      return xorshift128plus;
    case "xoroshiro128plus":
      return xoroshiro128plus;
    default:
      throw new Error(`Invalid random specified: '${p.randomType}'`);
  }
  const mrng = p.randomType(0);
  if ("min" in mrng && mrng.min !== -2147483648) throw new Error(`Invalid random number generator: min must equal -0x80000000, got ${String(mrng.min)}`);
  if ("max" in mrng && mrng.max !== 2147483647) throw new Error(`Invalid random number generator: max must equal 0x7fffffff, got ${String(mrng.max)}`);
  if (mrng === adaptRandomGenerator(mrng)) return p.randomType;
  return createQualifiedRandomGenerator(p.randomType);
}
function readNumRuns(p) {
  const defaultValue = 100;
  if (p.numRuns !== void 0) return p.numRuns;
  if (p.num_runs !== void 0) return p.num_runs;
  return defaultValue;
}
function readVerbose(p) {
  if (p.verbose === void 0) return 0;
  if (typeof p.verbose === "boolean") return p.verbose === true ? 1 : 0;
  if (p.verbose <= 0) return 0;
  if (p.verbose >= 2) return 2;
  return p.verbose | 0;
}
function safeTimeout(value) {
  if (value === void 0) return;
  return safeMathMin$6(value, 2147483647);
}
function read(op) {
  return new QualifiedParameters(op);
}
var UnbiasedProperty = class {
  constructor(property) {
    this.property = property;
  }
  isAsync() {
    return this.property.isAsync();
  }
  generate(mrng, _runId) {
    return this.property.generate(mrng, void 0);
  }
  shrink(value) {
    return this.property.shrink(value);
  }
  run(v) {
    return this.property.run(v);
  }
  runBeforeEach() {
    return this.property.runBeforeEach();
  }
  runAfterEach() {
    return this.property.runAfterEach();
  }
};
var safeArrayFrom = Array.from;
var safeBufferIsBuffer = typeof Buffer !== "undefined" ? Buffer.isBuffer : void 0;
var safeJsonStringify$1 = JSON.stringify;
var safeNumberIsNaN$5 = Number.isNaN;
var safeObjectKeys$5 = Object.keys;
var safeObjectGetOwnPropertySymbols$2 = Object.getOwnPropertySymbols;
var safeObjectGetOwnPropertyDescriptor$3 = Object.getOwnPropertyDescriptor;
var safeObjectGetPrototypeOf$2 = Object.getPrototypeOf;
var safeNegativeInfinity$7 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$8 = Number.POSITIVE_INFINITY;
var toStringMethod = /* @__PURE__ */ Symbol.for("fast-check/toStringMethod");
function hasToStringMethod(instance) {
  return instance !== null && (typeof instance === "object" || typeof instance === "function") && toStringMethod in instance && typeof instance[toStringMethod] === "function";
}
var asyncToStringMethod = /* @__PURE__ */ Symbol.for("fast-check/asyncToStringMethod");
function hasAsyncToStringMethod(instance) {
  return instance !== null && (typeof instance === "object" || typeof instance === "function") && asyncToStringMethod in instance && typeof instance[asyncToStringMethod] === "function";
}
var findSymbolNameRegex = /^Symbol\((.*)\)$/;
function getSymbolDescription(s) {
  if (s.description !== void 0) return s.description;
  const m = findSymbolNameRegex.exec(SString(s));
  return m && m[1].length ? m[1] : null;
}
function stringifyNumber(numValue) {
  switch (numValue) {
    case 0:
      return 1 / numValue === safeNegativeInfinity$7 ? "-0" : "0";
    case safeNegativeInfinity$7:
      return "Number.NEGATIVE_INFINITY";
    case safePositiveInfinity$8:
      return "Number.POSITIVE_INFINITY";
    default:
      return numValue === numValue ? SString(numValue) : "Number.NaN";
  }
}
function isSparseArray(arr) {
  let previousNumberedIndex = -1;
  for (const index in arr) {
    const numberedIndex = Number(index);
    if (numberedIndex !== previousNumberedIndex + 1) return true;
    previousNumberedIndex = numberedIndex;
  }
  return previousNumberedIndex + 1 !== arr.length;
}
function stringifyInternal(value, previousValues, getAsyncContent) {
  const currentValues = [...previousValues, value];
  if (typeof value === "object") {
    if (safeIndexOf(previousValues, value) !== -1) return "[cyclic]";
  }
  if (hasAsyncToStringMethod(value)) {
    const content = getAsyncContent(value);
    if (content.state === "fulfilled") return content.value;
  }
  if (hasToStringMethod(value)) try {
    return value[toStringMethod]();
  } catch {
  }
  switch (safeToString(value)) {
    case "[object Array]": {
      const arr = value;
      if (arr.length >= 50 && isSparseArray(arr)) {
        const assignments = [];
        for (const index in arr) if (!safeNumberIsNaN$5(Number(index))) safePush(assignments, `${index}:${stringifyInternal(arr[index], currentValues, getAsyncContent)}`);
        return assignments.length !== 0 ? `Object.assign(Array(${arr.length}),{${safeJoin(assignments, ",")}})` : `Array(${arr.length})`;
      }
      const stringifiedArray = safeJoin(safeMap(arr, (v) => stringifyInternal(v, currentValues, getAsyncContent)), ",");
      return arr.length === 0 || arr.length - 1 in arr ? `[${stringifiedArray}]` : `[${stringifiedArray},]`;
    }
    case "[object BigInt]":
      return `${value}n`;
    case "[object Boolean]": {
      const unboxedToString = value == true ? "true" : "false";
      return typeof value === "boolean" ? unboxedToString : `new Boolean(${unboxedToString})`;
    }
    case "[object Date]": {
      const d = value;
      return safeNumberIsNaN$5(safeGetTime(d)) ? `new Date(NaN)` : `new Date(${safeJsonStringify$1(safeToISOString(d))})`;
    }
    case "[object Map]":
      return `new Map(${stringifyInternal(Array.from(value), currentValues, getAsyncContent)})`;
    case "[object Null]":
      return `null`;
    case "[object Number]":
      return typeof value === "number" ? stringifyNumber(value) : `new Number(${stringifyNumber(Number(value))})`;
    case "[object Object]": {
      try {
        const toStringAccessor = value.toString;
        if (typeof toStringAccessor === "function" && toStringAccessor !== Object.prototype.toString) return value.toString();
      } catch {
        return "[object Object]";
      }
      const mapper = (k) => `${k === "__proto__" ? '["__proto__"]' : typeof k === "symbol" ? `[${stringifyInternal(k, currentValues, getAsyncContent)}]` : safeJsonStringify$1(k)}:${stringifyInternal(value[k], currentValues, getAsyncContent)}`;
      return "{" + safeJoin([
        ...safeObjectGetPrototypeOf$2(value) === null ? ["__proto__:null"] : [],
        ...safeMap(safeObjectKeys$5(value), mapper),
        ...safeMap(safeFilter(safeObjectGetOwnPropertySymbols$2(value), (s) => {
          const descriptor = safeObjectGetOwnPropertyDescriptor$3(value, s);
          return descriptor && descriptor.enumerable;
        }), mapper)
      ], ",") + "}";
    }
    case "[object Set]":
      return `new Set(${stringifyInternal(Array.from(value), currentValues, getAsyncContent)})`;
    case "[object String]":
      return typeof value === "string" ? safeJsonStringify$1(value) : `new String(${safeJsonStringify$1(value)})`;
    case "[object Symbol]": {
      const s = value;
      if (SSymbol.keyFor(s) !== void 0) return `Symbol.for(${safeJsonStringify$1(SSymbol.keyFor(s))})`;
      const desc = getSymbolDescription(s);
      if (desc === null) return "Symbol()";
      return s === (desc.startsWith("Symbol.") && SSymbol[desc.substring(7)]) ? desc : `Symbol(${safeJsonStringify$1(desc)})`;
    }
    case "[object Promise]": {
      const promiseContent = getAsyncContent(value);
      switch (promiseContent.state) {
        case "fulfilled":
          return `Promise.resolve(${stringifyInternal(promiseContent.value, currentValues, getAsyncContent)})`;
        case "rejected":
          return `Promise.reject(${stringifyInternal(promiseContent.value, currentValues, getAsyncContent)})`;
        case "pending":
          return `new Promise(() => {/*pending*/})`;
        default:
          return `new Promise(() => {/*unknown*/})`;
      }
    }
    case "[object Error]":
      if (value instanceof Error) return `new Error(${stringifyInternal(value.message, currentValues, getAsyncContent)})`;
      break;
    case "[object Undefined]":
      return `undefined`;
    case "[object Int8Array]":
    case "[object Uint8Array]":
    case "[object Uint8ClampedArray]":
    case "[object Int16Array]":
    case "[object Uint16Array]":
    case "[object Int32Array]":
    case "[object Uint32Array]":
    case "[object Float32Array]":
    case "[object Float64Array]":
    case "[object BigInt64Array]":
    case "[object BigUint64Array]": {
      if (typeof safeBufferIsBuffer === "function" && safeBufferIsBuffer(value)) return `Buffer.from(${value.buffer.detached ? "/*detached ArrayBuffer*/" : stringifyInternal(safeArrayFrom(value.values()), currentValues, getAsyncContent)})`;
      const valuePrototype = safeObjectGetPrototypeOf$2(value);
      const className = valuePrototype && valuePrototype.constructor && valuePrototype.constructor.name;
      if (typeof className === "string") {
        const typedArray2 = value;
        if (typedArray2.buffer.detached) return `${className}.from(/*detached ArrayBuffer*/)`;
        const valuesFromTypedArr = typedArray2.values();
        return `${className}.from(${stringifyInternal(safeArrayFrom(valuesFromTypedArr), currentValues, getAsyncContent)})`;
      }
      break;
    }
  }
  try {
    return value.toString();
  } catch {
    return safeToString(value);
  }
}
function stringify(value) {
  return stringifyInternal(value, [], () => ({
    state: "unknown",
    value: void 0
  }));
}
var safeDateNow = Date.now;
var MIN_INT = -2147483648;
var MAX_INT = 2147483647;
var DBL_FACTOR = Math.pow(2, 27);
var DBL_DIVISOR = Math.pow(2, -53);
var Random = class Random2 {
  /**
  * Create a mutable random number generator by cloning the passed one and mutate it
  * @param sourceRng - Immutable random generator from pure-rand library, will not be altered (a clone will be)
  */
  constructor(sourceRng) {
    this.internalRng = adaptRandomGenerator(sourceRng.clone());
  }
  /**
  * Clone the random number generator
  */
  clone() {
    return new Random2(this.internalRng);
  }
  /**
  * Generate an integer having `bits` random bits
  * @param bits - Number of bits to generate
  * @deprecated Prefer {@link nextInt} with explicit bounds: `nextInt(0, (1 << bits) - 1)`
  */
  next(bits) {
    return uniformInt(this.internalRng, 0, (1 << bits) - 1);
  }
  /**
  * Generate a random boolean
  * @deprecated Prefer {@link nextInt} with explicit bounds: `nextInt(0, 1) === 1`
  */
  nextBoolean() {
    return uniformInt(this.internalRng, 0, 1) === 1;
  }
  nextInt(min, max) {
    return uniformInt(this.internalRng, min === void 0 ? MIN_INT : min, max === void 0 ? MAX_INT : max);
  }
  /**
  * Generate a random bigint between min (included) and max (included)
  * @param min - Minimal bigint value
  * @param max - Maximal bigint value
  */
  nextBigInt(min, max) {
    return uniformBigInt(this.internalRng, min, max);
  }
  /**
  * Generate a random floating point number between 0.0 (included) and 1.0 (excluded)
  * @deprecated Prefer {@link nextInt} with explicit bounds
  */
  nextDouble() {
    const a = this.next(26);
    const b = this.next(27);
    return (a * DBL_FACTOR + b) * DBL_DIVISOR;
  }
  /**
  * Extract the internal state of the internal RandomGenerator backing the current instance of Random
  */
  getState() {
    if ("getState" in this.internalRng && typeof this.internalRng.getState === "function") return this.internalRng.getState();
  }
};
function tossNext(generator, rng, index) {
  rng.jump();
  return generator.generate(new Random(rng), index);
}
function* toss(generator, seed, random, examples) {
  for (let idx = 0; idx !== examples.length; ++idx) yield new Value(examples[idx], void 0);
  for (let idx = 0, rng = random(seed); ; ++idx) yield tossNext(generator, rng, idx);
}
function lazyGenerate(generator, rng, idx) {
  return () => generator.generate(new Random(rng), idx);
}
function* lazyToss(generator, seed, random, examples) {
  yield* safeMap(examples, (e) => () => new Value(e, void 0));
  let idx = 0;
  const rng = adaptRandomGenerator(random(seed));
  for (; ; ) {
    rng.jump();
    yield lazyGenerate(generator, rng, idx++);
  }
}
function produce(producer) {
  return producer();
}
function pathWalk(path, initialProducers, shrink) {
  const producers = initialProducers;
  const segments = path.split(":").map((text) => +text);
  if (segments.length === 0) return producers.map(produce);
  if (!segments.every((v) => !Number.isNaN(v))) throw new Error(`Unable to replay, got invalid path=${path}`);
  let values = producers.drop(segments[0]).map(produce);
  for (const s of segments.slice(1)) {
    const valueToShrink = values.getNthOrLast(0);
    if (valueToShrink === null) throw new Error(`Unable to replay, got wrong path=${path}`);
    values = shrink(valueToShrink).drop(s);
  }
  return values;
}
function toProperty(generator, qParams) {
  const prop = !Object.prototype.hasOwnProperty.call(generator, "isAsync") ? new Property(generator, () => true) : generator;
  return qParams.unbiased === true ? new UnbiasedProperty(prop) : prop;
}
function streamSample(generator, params) {
  const qParams = read(typeof params === "number" ? {
    ...readConfigureGlobal(),
    numRuns: params
  } : {
    ...readConfigureGlobal(),
    ...params
  });
  const nextProperty = toProperty(generator, qParams);
  const shrink = nextProperty.shrink.bind(nextProperty);
  return (qParams.path.length === 0 ? stream(toss(nextProperty, qParams.seed, qParams.randomType, qParams.examples)) : pathWalk(qParams.path, stream(lazyToss(nextProperty, qParams.seed, qParams.randomType, qParams.examples)), shrink)).take(qParams.numRuns).map((s) => s.value_);
}
function sample(generator, params) {
  return [...streamSample(generator, params)];
}
var safeMathFloor$6 = Math.floor;
var safeMathLog$2 = Math.log;
function integerLogLike(v) {
  return safeMathFloor$6(safeMathLog$2(v) / safeMathLog$2(2));
}
function bigIntLogLike(v) {
  if (v === SBigInt2(0)) return SBigInt2(0);
  return SBigInt2(SString(v).length);
}
function biasNumericRange(min, max, logLike) {
  if (min === max) return [{
    min,
    max
  }];
  if (min < 0 && max > 0) {
    const logMin = logLike(-min);
    const logMax = logLike(max);
    return [
      {
        min: -logMin,
        max: logMax
      },
      {
        min: max - logMax,
        max
      },
      {
        min,
        max: min + logMin
      }
    ];
  }
  const logGap = logLike(max - min);
  const arbCloseToMin = {
    min,
    max: min + logGap
  };
  const arbCloseToMax = {
    min: max - logGap,
    max
  };
  return min < 0 ? [arbCloseToMax, arbCloseToMin] : [arbCloseToMin, arbCloseToMax];
}
var safeMathCeil = Math.ceil;
var safeMathFloor$5 = Math.floor;
function halvePosInteger(n) {
  return safeMathFloor$5(n / 2);
}
function halveNegInteger(n) {
  return safeMathCeil(n / 2);
}
function shrinkInteger(current, target, tryTargetAsap) {
  const realGap = current - target;
  function* shrinkDecr() {
    let previous = tryTargetAsap ? void 0 : target;
    const gap = tryTargetAsap ? realGap : halvePosInteger(realGap);
    for (let toremove = gap; toremove > 0; toremove = halvePosInteger(toremove)) {
      const next = toremove === realGap ? target : current - toremove;
      yield new Value(next, previous);
      previous = next;
    }
  }
  function* shrinkIncr() {
    let previous = tryTargetAsap ? void 0 : target;
    const gap = tryTargetAsap ? realGap : halveNegInteger(realGap);
    for (let toremove = gap; toremove < 0; toremove = halveNegInteger(toremove)) {
      const next = toremove === realGap ? target : current - toremove;
      yield new Value(next, previous);
      previous = next;
    }
  }
  return realGap > 0 ? stream(shrinkDecr()) : stream(shrinkIncr());
}
var safeMathSign = Math.sign;
var safeNumberIsInteger$6 = Number.isInteger;
var safeObjectIs$6 = Object.is;
var IntegerArbitrary = class IntegerArbitrary2 extends Arbitrary {
  constructor(min, max) {
    super();
    this.min = min;
    this.max = max;
    this.ranges = biasNumericRange(min, max, integerLogLike);
  }
  generate(mrng, biasFactor) {
    if (biasFactor === void 0 || mrng.nextInt(1, biasFactor) !== 1) return new Value(mrng.nextInt(this.min, this.max), void 0);
    const ranges = this.ranges;
    if (ranges.length === 1) {
      const range2 = ranges[0];
      return new Value(mrng.nextInt(range2.min, range2.max), void 0);
    }
    const id = mrng.nextInt(-2 * (ranges.length - 1), ranges.length - 2);
    const range = id < 0 ? ranges[0] : ranges[id + 1];
    return new Value(mrng.nextInt(range.min, range.max), void 0);
  }
  canShrinkWithoutContext(value) {
    return typeof value === "number" && safeNumberIsInteger$6(value) && !safeObjectIs$6(value, -0) && this.min <= value && value <= this.max;
  }
  shrink(current, context) {
    if (!IntegerArbitrary2.isValidContext(current, context)) return shrinkInteger(current, this.min <= 0 && this.max >= 0 ? 0 : this.min < 0 ? this.max : this.min, true);
    if (this.isLastChanceTry(current, context)) return Stream.of(new Value(context, void 0));
    return shrinkInteger(current, context, false);
  }
  isLastChanceTry(current, context) {
    if (current > 0) return current === context + 1 && current > this.min;
    if (current < 0) return current === context - 1 && current < this.max;
    return false;
  }
  static isValidContext(current, context) {
    if (context === void 0) return false;
    if (typeof context !== "number") throw new Error(`Invalid context type passed to IntegerArbitrary (#1)`);
    if (context !== 0 && safeMathSign(current) !== safeMathSign(context)) throw new Error(`Invalid context value passed to IntegerArbitrary (#2)`);
    return true;
  }
};
var safeNumberIsInteger$5 = Number.isInteger;
function buildCompleteIntegerConstraints(constraints) {
  return {
    min: constraints.min !== void 0 ? constraints.min : -2147483648,
    max: constraints.max !== void 0 ? constraints.max : 2147483647
  };
}
function integer(constraints = {}) {
  const fullConstraints = buildCompleteIntegerConstraints(constraints);
  if (fullConstraints.min > fullConstraints.max) throw new Error("fc.integer maximum value should be equal or greater than the minimum one");
  if (!safeNumberIsInteger$5(fullConstraints.min)) throw new Error("fc.integer minimum value should be an integer");
  if (!safeNumberIsInteger$5(fullConstraints.max)) throw new Error("fc.integer maximum value should be an integer");
  return new IntegerArbitrary(fullConstraints.min, fullConstraints.max);
}
var depthContextCache = /* @__PURE__ */ new Map();
function getDepthContextFor(contextMeta) {
  if (contextMeta === void 0) return { depth: 0 };
  if (typeof contextMeta !== "string") return contextMeta;
  const cachedContext = safeMapGet(depthContextCache, contextMeta);
  if (cachedContext !== void 0) return cachedContext;
  const context = { depth: 0 };
  safeMapSet(depthContextCache, contextMeta, context);
  return context;
}
function createDepthIdentifier() {
  return { depth: 0 };
}
var NoopSlicedGenerator = class {
  constructor(arb, mrng, biasFactor) {
    this.arb = arb;
    this.mrng = mrng;
    this.biasFactor = biasFactor;
  }
  attemptExact() {
  }
  next() {
    return this.arb.generate(this.mrng, this.biasFactor);
  }
};
var safeMathMin$5 = Math.min;
var safeMathMax$2 = Math.max;
var SlicedBasedGenerator = class {
  constructor(arb, mrng, slices, biasFactor) {
    this.arb = arb;
    this.mrng = mrng;
    this.slices = slices;
    this.biasFactor = biasFactor;
    this.activeSliceIndex = 0;
    this.nextIndexInSlice = 0;
    this.lastIndexInSlice = -1;
  }
  attemptExact(targetLength) {
    if (targetLength !== 0 && this.mrng.nextInt(1, this.biasFactor) === 1) {
      const eligibleIndices = [];
      for (let index = 0; index !== this.slices.length; ++index) if (this.slices[index].length === targetLength) safePush(eligibleIndices, index);
      if (eligibleIndices.length === 0) return;
      this.activeSliceIndex = eligibleIndices[this.mrng.nextInt(0, eligibleIndices.length - 1)];
      this.nextIndexInSlice = 0;
      this.lastIndexInSlice = targetLength - 1;
    }
  }
  next() {
    if (this.nextIndexInSlice <= this.lastIndexInSlice) return new Value(this.slices[this.activeSliceIndex][this.nextIndexInSlice++], void 0);
    if (this.mrng.nextInt(1, this.biasFactor) !== 1) return this.arb.generate(this.mrng, this.biasFactor);
    this.activeSliceIndex = this.mrng.nextInt(0, this.slices.length - 1);
    const slice = this.slices[this.activeSliceIndex];
    if (this.mrng.nextInt(1, this.biasFactor) !== 1) {
      this.nextIndexInSlice = 1;
      this.lastIndexInSlice = slice.length - 1;
      return new Value(slice[0], void 0);
    }
    const rangeBoundaryA = this.mrng.nextInt(0, slice.length - 1);
    const rangeBoundaryB = this.mrng.nextInt(0, slice.length - 1);
    this.nextIndexInSlice = safeMathMin$5(rangeBoundaryA, rangeBoundaryB);
    this.lastIndexInSlice = safeMathMax$2(rangeBoundaryA, rangeBoundaryB);
    return new Value(slice[this.nextIndexInSlice++], void 0);
  }
};
function buildSlicedGenerator(arb, mrng, slices, biasFactor) {
  if (biasFactor === void 0 || slices.length === 0 || mrng.nextInt(1, biasFactor) !== 1) return new NoopSlicedGenerator(arb, mrng, biasFactor);
  return new SlicedBasedGenerator(arb, mrng, slices, biasFactor);
}
var safeMathFloor$4 = Math.floor;
var safeMathLog$1 = Math.log;
var safeArrayIsArray$2 = Array.isArray;
function biasedMaxLength(minLength, maxLength) {
  if (minLength === maxLength) return minLength;
  return minLength + safeMathFloor$4(safeMathLog$1(maxLength - minLength) / safeMathLog$1(2));
}
var ArrayArbitrary = class ArrayArbitrary2 extends Arbitrary {
  constructor(arb, minLength, maxGeneratedLength, maxLength, depthIdentifier, setBuilder, customSlices) {
    super();
    this.arb = arb;
    this.minLength = minLength;
    this.maxGeneratedLength = maxGeneratedLength;
    this.maxLength = maxLength;
    this.setBuilder = setBuilder;
    this.customSlices = customSlices;
    this.lengthArb = integer({
      min: minLength,
      max: maxGeneratedLength
    });
    this.depthContext = getDepthContextFor(depthIdentifier);
    this.cachedBiasedMaxLength = biasedMaxLength(minLength, maxGeneratedLength);
  }
  preFilter(tab) {
    if (this.setBuilder === void 0) return tab;
    const s = this.setBuilder();
    for (let index = 0; index !== tab.length; ++index) s.tryAdd(tab[index]);
    return s.getData();
  }
  static makeItCloneable(vs, shrinkables) {
    vs[cloneMethod] = () => {
      const cloned = [];
      for (let idx = 0; idx !== shrinkables.length; ++idx) safePush(cloned, shrinkables[idx].value);
      this.makeItCloneable(cloned, shrinkables);
      return cloned;
    };
    return vs;
  }
  generateNItemsNoDuplicates(setBuilder, N2, mrng, biasFactorItems) {
    let numSkippedInRow = 0;
    const s = setBuilder();
    const slicedGenerator = buildSlicedGenerator(this.arb, mrng, this.customSlices, biasFactorItems);
    while (s.size() < N2 && numSkippedInRow < this.maxGeneratedLength) {
      const current = slicedGenerator.next();
      if (s.tryAdd(current)) numSkippedInRow = 0;
      else numSkippedInRow += 1;
    }
    return s.getData();
  }
  safeGenerateNItemsNoDuplicates(setBuilder, N2, mrng, biasFactorItems) {
    const depthImpact = N2 - this.cachedBiasedMaxLength;
    if (depthImpact <= 0) return this.generateNItemsNoDuplicates(setBuilder, N2, mrng, biasFactorItems);
    this.depthContext.depth += depthImpact;
    try {
      return this.generateNItemsNoDuplicates(setBuilder, N2, mrng, biasFactorItems);
    } finally {
      this.depthContext.depth -= depthImpact;
    }
  }
  generateNItems(N2, mrng, biasFactorItems) {
    const items = [];
    const slicedGenerator = buildSlicedGenerator(this.arb, mrng, this.customSlices, biasFactorItems);
    slicedGenerator.attemptExact(N2);
    for (let index = 0; index !== N2; ++index) safePush(items, slicedGenerator.next());
    return items;
  }
  safeGenerateNItems(N2, mrng, biasFactorItems) {
    const depthImpact = N2 - this.cachedBiasedMaxLength;
    if (depthImpact <= 0) return this.generateNItems(N2, mrng, biasFactorItems);
    this.depthContext.depth += depthImpact;
    try {
      return this.generateNItems(N2, mrng, biasFactorItems);
    } finally {
      this.depthContext.depth -= depthImpact;
    }
  }
  wrapper(itemsRaw, shrunkOnce, itemsRawLengthContext, startIndex) {
    const items = shrunkOnce ? this.preFilter(itemsRaw) : itemsRaw;
    let cloneable = false;
    const vs = [];
    const itemsContexts = [];
    for (let idx = 0; idx !== items.length; ++idx) {
      const s = items[idx];
      cloneable = cloneable || s.hasToBeCloned;
      safePush(vs, s.value);
      safePush(itemsContexts, s.context);
    }
    if (cloneable) ArrayArbitrary2.makeItCloneable(vs, items);
    return new Value(vs, {
      shrunkOnce,
      lengthContext: itemsRaw.length === items.length && itemsRawLengthContext !== void 0 ? itemsRawLengthContext : void 0,
      itemsContexts,
      startIndex
    });
  }
  generate(mrng, biasFactor) {
    let targetSize;
    let biasFactorItems;
    if (biasFactor === void 0) targetSize = this.lengthArb.generate(mrng, void 0).value;
    else if (this.minLength === this.maxGeneratedLength) {
      targetSize = this.lengthArb.generate(mrng, void 0).value;
      biasFactorItems = biasFactor;
    } else if (mrng.nextInt(1, biasFactor) !== 1) targetSize = this.lengthArb.generate(mrng, void 0).value;
    else if (mrng.nextInt(1, biasFactor) !== 1) {
      targetSize = this.lengthArb.generate(mrng, void 0).value;
      biasFactorItems = biasFactor;
    } else {
      const maxBiasedLength = this.cachedBiasedMaxLength;
      targetSize = integer({
        min: this.minLength,
        max: maxBiasedLength
      }).generate(mrng, void 0).value;
      biasFactorItems = biasFactor;
    }
    const items = this.setBuilder !== void 0 ? this.safeGenerateNItemsNoDuplicates(this.setBuilder, targetSize, mrng, biasFactorItems) : this.safeGenerateNItems(targetSize, mrng, biasFactorItems);
    return this.wrapper(items, false, void 0, 0);
  }
  canShrinkWithoutContext(value) {
    if (!safeArrayIsArray$2(value) || this.minLength > value.length || value.length > this.maxLength) return false;
    for (let index = 0; index !== value.length; ++index) {
      if (!(index in value)) return false;
      if (!this.arb.canShrinkWithoutContext(value[index])) return false;
    }
    return this.preFilter(safeMap(value, (item) => new Value(item, void 0))).length === value.length;
  }
  shrinkItemByItem(value, safeContext, endIndex) {
    const shrinks = [];
    for (let index = safeContext.startIndex; index < endIndex; ++index) safePush(shrinks, makeLazy(() => this.arb.shrink(value[index], safeContext.itemsContexts[index]).map((v) => {
      const beforeCurrent = safeMap(safeSlice(value, 0, index), (v2, i) => new Value(cloneIfNeeded(v2), safeContext.itemsContexts[i]));
      const afterCurrent = safeMap(safeSlice(value, index + 1), (v2, i) => new Value(cloneIfNeeded(v2), safeContext.itemsContexts[i + index + 1]));
      return [
        [
          ...beforeCurrent,
          v,
          ...afterCurrent
        ],
        void 0,
        index
      ];
    })));
    return Stream.nil().join(...shrinks);
  }
  shrinkImpl(value, context) {
    if (value.length === 0) return Stream.nil();
    const safeContext = context !== void 0 ? context : {
      shrunkOnce: false,
      lengthContext: void 0,
      itemsContexts: [],
      startIndex: 0
    };
    return this.lengthArb.shrink(value.length, safeContext.lengthContext).drop(safeContext.shrunkOnce && safeContext.lengthContext === void 0 && value.length > this.minLength + 1 ? 1 : 0).map((lengthValue) => {
      const sliceStart = value.length - lengthValue.value;
      return [
        safeMap(safeSlice(value, sliceStart), (v, index) => new Value(cloneIfNeeded(v), safeContext.itemsContexts[index + sliceStart])),
        lengthValue.context,
        0
      ];
    }).join(makeLazy(() => value.length > this.minLength ? this.shrinkItemByItem(value, safeContext, 1) : this.shrinkItemByItem(value, safeContext, value.length))).join(value.length > this.minLength ? makeLazy(() => {
      const subContext = {
        shrunkOnce: false,
        lengthContext: void 0,
        itemsContexts: safeSlice(safeContext.itemsContexts, 1),
        startIndex: 0
      };
      return this.shrinkImpl(safeSlice(value, 1), subContext).filter((v) => this.minLength <= v[0].length + 1).map((v) => {
        return [
          [new Value(cloneIfNeeded(value[0]), safeContext.itemsContexts[0]), ...v[0]],
          void 0,
          0
        ];
      });
    }) : Stream.nil());
  }
  shrink(value, context) {
    return this.shrinkImpl(value, context).map((contextualValue) => this.wrapper(contextualValue[0], true, contextualValue[1], contextualValue[2]));
  }
};
var safeMathFloor$3 = Math.floor;
var safeMathMin$4 = Math.min;
var MaxLengthUpperBound = 2147483647;
var orderedSize = [
  "xsmall",
  "small",
  "medium",
  "large",
  "xlarge"
];
var orderedRelativeSize = [
  "-4",
  "-3",
  "-2",
  "-1",
  "=",
  "+1",
  "+2",
  "+3",
  "+4"
];
var DefaultSize = "small";
function maxLengthFromMinLength(minLength, size) {
  switch (size) {
    case "xsmall":
      return safeMathFloor$3(1.1 * minLength) + 1;
    case "small":
      return 2 * minLength + 10;
    case "medium":
      return 11 * minLength + 100;
    case "large":
      return 101 * minLength + 1e3;
    case "xlarge":
      return 1001 * minLength + 1e4;
    default:
      throw new Error(`Unable to compute lengths based on received size: ${size}`);
  }
}
function relativeSizeToSize(size, defaultSize) {
  const sizeInRelative = safeIndexOf(orderedRelativeSize, size);
  if (sizeInRelative === -1) return size;
  const defaultSizeInSize = safeIndexOf(orderedSize, defaultSize);
  if (defaultSizeInSize === -1) throw new Error(`Unable to offset size based on the unknown defaulted one: ${defaultSize}`);
  const resultingSizeInSize = defaultSizeInSize + sizeInRelative - 4;
  return resultingSizeInSize < 0 ? orderedSize[0] : resultingSizeInSize >= orderedSize.length ? orderedSize[orderedSize.length - 1] : orderedSize[resultingSizeInSize];
}
function maxGeneratedLengthFromSizeForArbitrary(size, minLength, maxLength, specifiedMaxLength) {
  const { baseSize: defaultSize = DefaultSize, defaultSizeToMaxWhenMaxSpecified } = readConfigureGlobal() || {};
  const definedSize = size !== void 0 ? size : specifiedMaxLength && defaultSizeToMaxWhenMaxSpecified ? "max" : defaultSize;
  if (definedSize === "max") return maxLength;
  const finalSize = relativeSizeToSize(definedSize, defaultSize);
  return safeMathMin$4(maxLengthFromMinLength(minLength, finalSize), maxLength);
}
function depthBiasFromSizeForArbitrary(depthSizeOrSize, specifiedMaxDepth) {
  if (typeof depthSizeOrSize === "number") return 1 / depthSizeOrSize;
  const { baseSize: defaultSize = DefaultSize, defaultSizeToMaxWhenMaxSpecified } = readConfigureGlobal() || {};
  const definedSize = depthSizeOrSize !== void 0 ? depthSizeOrSize : specifiedMaxDepth && defaultSizeToMaxWhenMaxSpecified ? "max" : defaultSize;
  if (definedSize === "max") return 0;
  switch (relativeSizeToSize(definedSize, defaultSize)) {
    case "xsmall":
      return 1;
    case "small":
      return 0.5;
    case "medium":
      return 0.25;
    case "large":
      return 0.125;
    case "xlarge":
      return 0.0625;
  }
}
function array(arb, constraints = {}) {
  const size = constraints.size;
  const minLength = constraints.minLength || 0;
  const maxLengthOrUnset = constraints.maxLength;
  const depthIdentifier = constraints.depthIdentifier;
  const maxLength = maxLengthOrUnset !== void 0 ? maxLengthOrUnset : MaxLengthUpperBound;
  return new ArrayArbitrary(arb, minLength, maxGeneratedLengthFromSizeForArbitrary(size, minLength, maxLength, maxLengthOrUnset !== void 0), maxLength, depthIdentifier, void 0, constraints.experimentalCustomSlices || []);
}
function halveBigInt(n) {
  return n / SBigInt2(2);
}
function shrinkBigInt(current, target, tryTargetAsap) {
  const realGap = current - target;
  function* shrinkDecr() {
    let previous = tryTargetAsap ? void 0 : target;
    const gap = tryTargetAsap ? realGap : halveBigInt(realGap);
    for (let toremove = gap; toremove > 0; toremove = halveBigInt(toremove)) {
      const next = current - toremove;
      yield new Value(next, previous);
      previous = next;
    }
  }
  function* shrinkIncr() {
    let previous = tryTargetAsap ? void 0 : target;
    const gap = tryTargetAsap ? realGap : halveBigInt(realGap);
    for (let toremove = gap; toremove < 0; toremove = halveBigInt(toremove)) {
      const next = current - toremove;
      yield new Value(next, previous);
      previous = next;
    }
  }
  return realGap > 0 ? stream(shrinkDecr()) : stream(shrinkIncr());
}
var BigIntArbitrary = class BigIntArbitrary2 extends Arbitrary {
  constructor(min, max) {
    super();
    this.min = min;
    this.max = max;
  }
  generate(mrng, biasFactor) {
    const range = this.computeGenerateRange(mrng, biasFactor);
    return new Value(mrng.nextBigInt(range.min, range.max), void 0);
  }
  computeGenerateRange(mrng, biasFactor) {
    if (biasFactor === void 0 || mrng.nextInt(1, biasFactor) !== 1) return {
      min: this.min,
      max: this.max
    };
    const ranges = biasNumericRange(this.min, this.max, bigIntLogLike);
    if (ranges.length === 1) return ranges[0];
    const id = mrng.nextInt(-2 * (ranges.length - 1), ranges.length - 2);
    return id < 0 ? ranges[0] : ranges[id + 1];
  }
  canShrinkWithoutContext(value) {
    return typeof value === "bigint" && this.min <= value && value <= this.max;
  }
  shrink(current, context) {
    if (!BigIntArbitrary2.isValidContext(current, context)) return shrinkBigInt(current, this.defaultTarget(), true);
    if (this.isLastChanceTry(current, context)) return Stream.of(new Value(context, void 0));
    return shrinkBigInt(current, context, false);
  }
  defaultTarget() {
    if (this.min <= 0 && this.max >= 0) return SBigInt2(0);
    return this.min < 0 ? this.max : this.min;
  }
  isLastChanceTry(current, context) {
    if (current > 0) return current === context + SBigInt2(1) && current > this.min;
    if (current < 0) return current === context - SBigInt2(1) && current < this.max;
    return false;
  }
  static isValidContext(current, context) {
    if (context === void 0) return false;
    if (typeof context !== "bigint") throw new Error(`Invalid context type passed to BigIntArbitrary (#1)`);
    const differentSigns = current > 0 && context < 0 || current < 0 && context > 0;
    if (context !== SBigInt2(0) && differentSigns) throw new Error(`Invalid context value passed to BigIntArbitrary (#2)`);
    return true;
  }
};
function buildCompleteBigIntConstraints(constraints) {
  const DefaultMin = SBigInt2(-1) << SBigInt2(255);
  const DefaultMax = (SBigInt2(1) << SBigInt2(255)) - SBigInt2(1);
  const min = constraints.min;
  const max = constraints.max;
  return {
    min: min !== void 0 ? min : DefaultMin - (max !== void 0 && max < SBigInt2(0) ? max * max : SBigInt2(0)),
    max: max !== void 0 ? max : DefaultMax + (min !== void 0 && min > SBigInt2(0) ? min * min : SBigInt2(0))
  };
}
function extractBigIntConstraints(args) {
  if (args[0] === void 0) return {};
  if (args[1] === void 0) return args[0];
  return {
    min: args[0],
    max: args[1]
  };
}
function bigInt(...args) {
  const constraints = buildCompleteBigIntConstraints(extractBigIntConstraints(args));
  if (constraints.min > constraints.max) throw new Error("fc.bigInt expects max to be greater than or equal to min");
  return new BigIntArbitrary(constraints.min, constraints.max);
}
var stableObjectGetPrototypeOf$1 = Object.getPrototypeOf;
var NoBiasArbitrary = class extends Arbitrary {
  constructor(arb) {
    super();
    this.arb = arb;
  }
  generate(mrng, _biasFactor) {
    return this.arb.generate(mrng, void 0);
  }
  canShrinkWithoutContext(value) {
    return this.arb.canShrinkWithoutContext(value);
  }
  shrink(value, context) {
    return this.arb.shrink(value, context);
  }
};
function noBias(arb) {
  if (stableObjectGetPrototypeOf$1(arb) === NoBiasArbitrary.prototype && arb.generate === NoBiasArbitrary.prototype.generate && arb.canShrinkWithoutContext === NoBiasArbitrary.prototype.canShrinkWithoutContext && arb.shrink === NoBiasArbitrary.prototype.shrink) return arb;
  return new NoBiasArbitrary(arb);
}
function booleanMapper(v) {
  return v === 1;
}
function booleanUnmapper(v) {
  if (typeof v !== "boolean") throw new Error("Unsupported input type");
  return v === true ? 1 : 0;
}
function boolean() {
  return noBias(integer({
    min: 0,
    max: 1
  }).map(booleanMapper, booleanUnmapper));
}
var safeObjectIs$5 = Object.is;
var FastConstantValuesLookup = class {
  constructor(values) {
    this.values = values;
    this.fastValues = new SSet(this.values);
    let hasMinusZero = false;
    let hasPlusZero = false;
    if (safeHas(this.fastValues, 0)) for (let idx = 0; idx !== this.values.length; ++idx) {
      const value = this.values[idx];
      hasMinusZero = hasMinusZero || safeObjectIs$5(value, -0);
      hasPlusZero = hasPlusZero || safeObjectIs$5(value, 0);
    }
    this.hasMinusZero = hasMinusZero;
    this.hasPlusZero = hasPlusZero;
  }
  has(value) {
    if (value === 0) {
      if (safeObjectIs$5(value, 0)) return this.hasPlusZero;
      return this.hasMinusZero;
    }
    return safeHas(this.fastValues, value);
  }
};
var ConstantArbitrary = class extends Arbitrary {
  constructor(values) {
    super();
    this.values = values;
  }
  generate(mrng, _biasFactor) {
    const idx = this.values.length === 1 ? 0 : mrng.nextInt(0, this.values.length - 1);
    const value = this.values[idx];
    if (!hasCloneMethod(value)) return new Value(value, idx);
    return new Value(value, idx, () => value[cloneMethod]());
  }
  canShrinkWithoutContext(value) {
    if (this.values.length === 1) return safeObjectIs$5(this.values[0], value);
    if (this.fastValues === void 0) this.fastValues = new FastConstantValuesLookup(this.values);
    return this.fastValues.has(value);
  }
  shrink(value, context) {
    if (context === 0 || safeObjectIs$5(value, this.values[0])) return Stream.nil();
    return Stream.of(new Value(this.values[0], 0));
  }
};
function constantFrom(...values) {
  if (values.length === 0) throw new Error("fc.constantFrom expects at least one parameter");
  return new ConstantArbitrary(values);
}
function constant(value) {
  return new ConstantArbitrary([value]);
}
var ContextImplem = class ContextImplem2 {
  constructor() {
    this.receivedLogs = [];
  }
  log(data) {
    this.receivedLogs.push(data);
  }
  size() {
    return this.receivedLogs.length;
  }
  toString() {
    return JSON.stringify({ logs: this.receivedLogs });
  }
  [cloneMethod]() {
    return new ContextImplem2();
  }
};
var safeNaN$2 = NaN;
var safeNumberIsNaN$4 = Number.isNaN;
function timeToDateMapper(time) {
  return new SDate(time);
}
function timeToDateUnmapper(value) {
  if (!(value instanceof SDate) || value.constructor !== SDate) throw new SError("Not a valid value for date unmapper");
  return safeGetTime(value);
}
function timeToDateMapperWithNaN(valueForNaN) {
  return (time) => {
    return time === valueForNaN ? new SDate(safeNaN$2) : timeToDateMapper(time);
  };
}
function timeToDateUnmapperWithNaN(valueForNaN) {
  return (value) => {
    const time = timeToDateUnmapper(value);
    return safeNumberIsNaN$4(time) ? valueForNaN : time;
  };
}
var safeNumberIsNaN$3 = Number.isNaN;
function date(constraints = {}) {
  const intMin = constraints.min !== void 0 ? safeGetTime(constraints.min) : -864e13;
  const intMax = constraints.max !== void 0 ? safeGetTime(constraints.max) : 864e13;
  const noInvalidDate = constraints.noInvalidDate;
  if (safeNumberIsNaN$3(intMin)) throw new Error("fc.date min must be valid instance of Date");
  if (safeNumberIsNaN$3(intMax)) throw new Error("fc.date max must be valid instance of Date");
  if (intMin > intMax) throw new Error("fc.date max must be greater or equal to min");
  if (noInvalidDate) return integer({
    min: intMin,
    max: intMax
  }).map(timeToDateMapper, timeToDateUnmapper);
  const valueForNaN = intMax + 1;
  return integer({
    min: intMin,
    max: intMax + 1
  }).map(timeToDateMapperWithNaN(valueForNaN), timeToDateUnmapperWithNaN(valueForNaN));
}
var CustomEqualSet = class {
  constructor(isEqual) {
    this.isEqual = isEqual;
    this.data = [];
  }
  tryAdd(value) {
    for (let idx = 0; idx !== this.data.length; ++idx) if (this.isEqual(this.data[idx], value)) return false;
    safePush(this.data, value);
    return true;
  }
  size() {
    return this.data.length;
  }
  getData() {
    return this.data;
  }
};
var safeNumberIsNaN$2 = Number.isNaN;
var StrictlyEqualSet = class {
  constructor(selector) {
    this.selector = selector;
    this.selectedItemsExceptNaN = new SSet();
    this.data = [];
  }
  tryAdd(value) {
    const selected = this.selector(value);
    if (safeNumberIsNaN$2(selected)) {
      safePush(this.data, value);
      return true;
    }
    const sizeBefore = this.selectedItemsExceptNaN.size;
    safeAdd(this.selectedItemsExceptNaN, selected);
    if (sizeBefore !== this.selectedItemsExceptNaN.size) {
      safePush(this.data, value);
      return true;
    }
    return false;
  }
  size() {
    return this.data.length;
  }
  getData() {
    return this.data;
  }
};
var safeObjectIs$3 = Object.is;
var SameValueSet = class {
  constructor(selector) {
    this.selector = selector;
    this.selectedItemsExceptMinusZero = new SSet();
    this.data = [];
    this.hasMinusZero = false;
  }
  tryAdd(value) {
    const selected = this.selector(value);
    if (safeObjectIs$3(selected, -0)) {
      if (this.hasMinusZero) return false;
      safePush(this.data, value);
      this.hasMinusZero = true;
      return true;
    }
    const sizeBefore = this.selectedItemsExceptMinusZero.size;
    safeAdd(this.selectedItemsExceptMinusZero, selected);
    if (sizeBefore !== this.selectedItemsExceptMinusZero.size) {
      safePush(this.data, value);
      return true;
    }
    return false;
  }
  size() {
    return this.data.length;
  }
  getData() {
    return this.data;
  }
};
var SameValueZeroSet = class {
  constructor(selector) {
    this.selector = selector;
    this.selectedItems = new SSet();
    this.data = [];
  }
  tryAdd(value) {
    const selected = this.selector(value);
    const sizeBefore = this.selectedItems.size;
    safeAdd(this.selectedItems, selected);
    if (sizeBefore !== this.selectedItems.size) {
      safePush(this.data, value);
      return true;
    }
    return false;
  }
  size() {
    return this.data.length;
  }
  getData() {
    return this.data;
  }
};
function buildUniqueArraySetBuilder(constraints) {
  if (typeof constraints.comparator === "function") {
    if (constraints.selector === void 0) {
      const comparator2 = constraints.comparator;
      const isEqualForBuilder2 = (nextA, nextB) => comparator2(nextA.value_, nextB.value_);
      return () => new CustomEqualSet(isEqualForBuilder2);
    }
    const comparator = constraints.comparator;
    const selector2 = constraints.selector;
    const refinedSelector2 = (next) => selector2(next.value_);
    const isEqualForBuilder = (nextA, nextB) => comparator(refinedSelector2(nextA), refinedSelector2(nextB));
    return () => new CustomEqualSet(isEqualForBuilder);
  }
  const selector = constraints.selector || ((v) => v);
  const refinedSelector = (next) => selector(next.value_);
  switch (constraints.comparator) {
    case "IsStrictlyEqual":
      return () => new StrictlyEqualSet(refinedSelector);
    case "SameValueZero":
      return () => new SameValueZeroSet(refinedSelector);
    case "SameValue":
    case void 0:
      return () => new SameValueSet(refinedSelector);
  }
}
function uniqueArray(arb, constraints = {}) {
  const minLength = constraints.minLength !== void 0 ? constraints.minLength : 0;
  const maxLength = constraints.maxLength !== void 0 ? constraints.maxLength : MaxLengthUpperBound;
  const maxGeneratedLength = maxGeneratedLengthFromSizeForArbitrary(constraints.size, minLength, maxLength, constraints.maxLength !== void 0);
  const depthIdentifier = constraints.depthIdentifier;
  const arrayArb = new ArrayArbitrary(arb, minLength, maxGeneratedLength, maxLength, depthIdentifier, buildUniqueArraySetBuilder(constraints), []);
  if (minLength === 0) return arrayArb;
  return arrayArb.filter((tab) => tab.length >= minLength);
}
var safeObjectCreate$5 = Object.create;
var safeObjectDefineProperty$2 = Object.defineProperty;
var safeObjectGetOwnPropertyDescriptor$2 = Object.getOwnPropertyDescriptor;
var safeObjectGetPrototypeOf$1 = Object.getPrototypeOf;
var safeObjectPrototype$1 = Object.prototype;
var safeReflectOwnKeys = Reflect.ownKeys;
function keyValuePairsToObjectMapper(definition) {
  const obj = definition[1] ? safeObjectCreate$5(null) : {};
  const keyValues = definition[0];
  for (let idx = 0; idx !== keyValues.length; ++idx) {
    const key = keyValues[idx][0];
    if (key === "__proto__") safeObjectDefineProperty$2(obj, key, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: keyValues[idx][1]
    });
    else obj[key] = keyValues[idx][1];
  }
  return obj;
}
function isValidPropertyNameFilter(descriptor) {
  return descriptor !== void 0 && !!descriptor.configurable && !!descriptor.enumerable && !!descriptor.writable && descriptor.get === void 0 && descriptor.set === void 0;
}
function keyValuePairsToObjectUnmapper(value) {
  if (typeof value !== "object" || value === null) throw new SError("Incompatible instance received: should be a non-null object");
  const hasNullPrototype = safeObjectGetPrototypeOf$1(value) === null;
  const hasObjectPrototype = safeObjectGetPrototypeOf$1(value) === safeObjectPrototype$1;
  if (!hasNullPrototype && !hasObjectPrototype) throw new SError("Incompatible instance received: should be of exact type Object");
  const propertyDescriptors = safeMap(safeReflectOwnKeys(value), (key) => [key, safeObjectGetOwnPropertyDescriptor$2(value, key)]);
  if (!safeEvery(propertyDescriptors, ([, descriptor]) => isValidPropertyNameFilter(descriptor))) throw new SError("Incompatible instance received: should contain only c/e/w properties without get/set");
  return [safeMap(propertyDescriptors, ([key, descriptor]) => [key, descriptor.value]), hasNullPrototype];
}
function dictionaryKeyExtractor(entry) {
  return entry[0];
}
function dictionary(keyArb, valueArb, constraints = {}) {
  const noNullPrototype = !!constraints.noNullPrototype;
  return tuple(uniqueArray(tuple(keyArb, valueArb), {
    minLength: constraints.minKeys,
    maxLength: constraints.maxKeys,
    size: constraints.size,
    selector: dictionaryKeyExtractor,
    depthIdentifier: constraints.depthIdentifier
  }), noNullPrototype ? constant(false) : boolean()).map(keyValuePairsToObjectMapper, keyValuePairsToObjectUnmapper);
}
var safePositiveInfinity$7 = Number.POSITIVE_INFINITY;
var safeMaxSafeInteger$2 = Number.MAX_SAFE_INTEGER;
var safeNumberIsInteger$4 = Number.isInteger;
var safeMathFloor$2 = Math.floor;
var safeMathPow = Math.pow;
var safeMathMin$3 = Math.min;
var FrequencyArbitrary = class FrequencyArbitrary2 extends Arbitrary {
  static from(warbs, constraints, label) {
    if (warbs.length === 0) throw new Error(`${label} expects at least one weighted arbitrary`);
    let totalWeight = 0;
    for (let idx = 0; idx !== warbs.length; ++idx) {
      if (warbs[idx].arbitrary === void 0) throw new Error(`${label} expects arbitraries to be specified`);
      const currentWeight = warbs[idx].weight;
      totalWeight += currentWeight;
      if (!safeNumberIsInteger$4(currentWeight)) throw new Error(`${label} expects weights to be integer values`);
      if (currentWeight < 0) throw new Error(`${label} expects weights to be superior or equal to 0`);
    }
    if (totalWeight <= 0) throw new Error(`${label} expects the sum of weights to be strictly superior to 0`);
    const sanitizedConstraints = {
      depthBias: depthBiasFromSizeForArbitrary(constraints.depthSize, constraints.maxDepth !== void 0),
      maxDepth: constraints.maxDepth !== void 0 ? constraints.maxDepth : safePositiveInfinity$7,
      withCrossShrink: !!constraints.withCrossShrink
    };
    return new FrequencyArbitrary2(warbs, sanitizedConstraints, getDepthContextFor(constraints.depthIdentifier));
  }
  constructor(warbs, constraints, context) {
    super();
    this.warbs = warbs;
    this.constraints = constraints;
    this.context = context;
    let currentWeight = 0;
    this.cumulatedWeights = [];
    for (let idx = 0; idx !== warbs.length; ++idx) {
      currentWeight += warbs[idx].weight;
      safePush(this.cumulatedWeights, currentWeight);
    }
    this.totalWeight = currentWeight;
  }
  generate(mrng, biasFactor) {
    if (this.mustGenerateFirst()) return this.safeGenerateForIndex(mrng, 0, biasFactor);
    const selected = mrng.nextInt(this.computeNegDepthBenefit(), this.totalWeight - 1);
    for (let idx = 0; idx !== this.cumulatedWeights.length; ++idx) if (selected < this.cumulatedWeights[idx]) return this.safeGenerateForIndex(mrng, idx, biasFactor);
    throw new Error(`Unable to generate from fc.frequency`);
  }
  canShrinkWithoutContext(value) {
    return this.canShrinkWithoutContextIndex(value) !== -1;
  }
  shrink(value, context) {
    if (context !== void 0) {
      const safeContext = context;
      const selectedIndex = safeContext.selectedIndex;
      const originalBias = safeContext.originalBias;
      const originalShrinks = this.warbs[selectedIndex].arbitrary.shrink(value, safeContext.originalContext).map((v) => this.mapIntoValue(selectedIndex, v, null, originalBias));
      if (safeContext.clonedMrngForFallbackFirst !== null) {
        if (safeContext.cachedGeneratedForFirst === void 0) safeContext.cachedGeneratedForFirst = this.safeGenerateForIndex(safeContext.clonedMrngForFallbackFirst, 0, originalBias);
        const valueFromFirst = safeContext.cachedGeneratedForFirst;
        return Stream.of(valueFromFirst).join(originalShrinks);
      }
      return originalShrinks;
    }
    const potentialSelectedIndex = this.canShrinkWithoutContextIndex(value);
    if (potentialSelectedIndex === -1) return Stream.nil();
    return this.defaultShrinkForFirst(potentialSelectedIndex).join(this.warbs[potentialSelectedIndex].arbitrary.shrink(value, void 0).map((v) => this.mapIntoValue(potentialSelectedIndex, v, null, void 0)));
  }
  /** Generate shrink values for first arbitrary when no context and no value was provided */
  defaultShrinkForFirst(selectedIndex) {
    ++this.context.depth;
    try {
      if (!this.mustFallbackToFirstInShrink(selectedIndex) || this.warbs[0].fallbackValue === void 0) return Stream.nil();
    } finally {
      --this.context.depth;
    }
    const rawShrinkValue = new Value(this.warbs[0].fallbackValue.default, void 0);
    return Stream.of(this.mapIntoValue(0, rawShrinkValue, null, void 0));
  }
  /** Extract the index of the generator that would have been able to gennrate the value */
  canShrinkWithoutContextIndex(value) {
    if (this.mustGenerateFirst()) return this.warbs[0].arbitrary.canShrinkWithoutContext(value) ? 0 : -1;
    try {
      ++this.context.depth;
      for (let idx = 0; idx !== this.warbs.length; ++idx) {
        const warb = this.warbs[idx];
        if (warb.weight !== 0 && warb.arbitrary.canShrinkWithoutContext(value)) return idx;
      }
      return -1;
    } finally {
      --this.context.depth;
    }
  }
  /** Map the output of one of the children with the context of frequency */
  mapIntoValue(idx, value, clonedMrngForFallbackFirst, biasFactor) {
    const context = {
      selectedIndex: idx,
      originalBias: biasFactor,
      originalContext: value.context,
      clonedMrngForFallbackFirst
    };
    return new Value(value.value, context);
  }
  /** Generate using Arbitrary at index idx and safely handle depth context */
  safeGenerateForIndex(mrng, idx, biasFactor) {
    ++this.context.depth;
    try {
      const value = this.warbs[idx].arbitrary.generate(mrng, biasFactor);
      const clonedMrngForFallbackFirst = this.mustFallbackToFirstInShrink(idx) ? mrng.clone() : null;
      return this.mapIntoValue(idx, value, clonedMrngForFallbackFirst, biasFactor);
    } finally {
      --this.context.depth;
    }
  }
  /** Check if generating a value based on the first arbitrary is compulsory */
  mustGenerateFirst() {
    return this.constraints.maxDepth <= this.context.depth;
  }
  /** Check if fallback on first arbitrary during shrinking is required */
  mustFallbackToFirstInShrink(idx) {
    return idx !== 0 && this.constraints.withCrossShrink && this.warbs[0].weight !== 0;
  }
  /** Compute the benefit for the current depth */
  computeNegDepthBenefit() {
    const depthBias = this.constraints.depthBias;
    if (depthBias <= 0 || this.warbs[0].weight === 0) return 0;
    const depthBenefit = safeMathFloor$2(safeMathPow(1 + depthBias, this.context.depth)) - 1;
    return -safeMathMin$3(this.totalWeight * depthBenefit, safeMaxSafeInteger$2) || 0;
  }
};
function isOneOfContraints(param) {
  return param !== null && param !== void 0 && typeof param === "object" && !("generate" in param) && !("arbitrary" in param) && !("weight" in param);
}
function toWeightedArbitrary(maybeWeightedArbitrary) {
  if (isArbitrary(maybeWeightedArbitrary)) return {
    arbitrary: maybeWeightedArbitrary,
    weight: 1
  };
  return maybeWeightedArbitrary;
}
function oneof(...args) {
  const constraints = args[0];
  if (isOneOfContraints(constraints)) {
    const weightedArbs2 = safeMap(safeSlice(args, 1), toWeightedArbitrary);
    return FrequencyArbitrary.from(weightedArbs2, constraints, "fc.oneof");
  }
  const weightedArbs = safeMap(args, toWeightedArbitrary);
  return FrequencyArbitrary.from(weightedArbs, {}, "fc.oneof");
}
var safeNumberIsInteger$3 = Number.isInteger;
function nat(arg) {
  const max = typeof arg === "number" ? arg : arg && arg.max !== void 0 ? arg.max : 2147483647;
  if (max < 0) throw new Error("fc.nat value should be greater than or equal to 0");
  if (!safeNumberIsInteger$3(max)) throw new Error("fc.nat maximum value should be an integer");
  return new IntegerArbitrary(0, max);
}
var safeObjectIs$2 = Object.is;
function buildDichotomyEntries(entries) {
  let currentFrom = 0;
  const dichotomyEntries = [];
  for (const entry of entries) {
    const from = currentFrom;
    currentFrom = from + entry.num;
    const to = currentFrom - 1;
    dichotomyEntries.push({
      from,
      to,
      entry
    });
  }
  return dichotomyEntries;
}
function findDichotomyEntry(dichotomyEntries, choiceIndex) {
  let min = 0;
  let max = dichotomyEntries.length;
  while (max - min > 1) {
    const mid = ~~((min + max) / 2);
    if (choiceIndex < dichotomyEntries[mid].from) max = mid;
    else min = mid;
  }
  return dichotomyEntries[min];
}
function indexToMappedConstantMapperFor(entries) {
  const dichotomyEntries = buildDichotomyEntries(entries);
  return function indexToMappedConstantMapper(choiceIndex) {
    const dichotomyEntry = findDichotomyEntry(dichotomyEntries, choiceIndex);
    return dichotomyEntry.entry.build(choiceIndex - dichotomyEntry.from);
  };
}
function buildReverseMapping(entries) {
  const reverseMapping = {
    mapping: new SMap$2(),
    negativeZeroIndex: void 0
  };
  let choiceIndex = 0;
  for (let entryIdx = 0; entryIdx !== entries.length; ++entryIdx) {
    const entry = entries[entryIdx];
    for (let idxInEntry = 0; idxInEntry !== entry.num; ++idxInEntry) {
      const value = entry.build(idxInEntry);
      if (value === 0 && 1 / value === SNumber.NEGATIVE_INFINITY) reverseMapping.negativeZeroIndex = choiceIndex;
      else safeMapSet(reverseMapping.mapping, value, choiceIndex);
      ++choiceIndex;
    }
  }
  return reverseMapping;
}
function indexToMappedConstantUnmapperFor(entries) {
  let reverseMapping = null;
  return function indexToMappedConstantUnmapper(value) {
    if (reverseMapping === null) reverseMapping = buildReverseMapping(entries);
    const choiceIndex = safeObjectIs$2(value, -0) ? reverseMapping.negativeZeroIndex : safeMapGet(reverseMapping.mapping, value);
    if (choiceIndex === void 0) throw new SError("Unknown value encountered cannot be built using this mapToConstant");
    return choiceIndex;
  };
}
function computeNumChoices(options) {
  if (options.length === 0) throw new SError(`fc.mapToConstant expects at least one option`);
  let numChoices = 0;
  for (let idx = 0; idx !== options.length; ++idx) {
    if (options[idx].num < 0) throw new SError(`fc.mapToConstant expects all options to have a number of entries greater or equal to zero`);
    numChoices += options[idx].num;
  }
  if (numChoices === 0) throw new SError(`fc.mapToConstant expects at least one choice among options`);
  return numChoices;
}
function mapToConstant(...entries) {
  return nat({ max: computeNumChoices(entries) - 1 }).map(indexToMappedConstantMapperFor(entries), indexToMappedConstantUnmapperFor(entries));
}
function tokenizeString(patternsArb, value, minLength, maxLength) {
  if (value.length === 0) {
    if (minLength > 0) return;
    return [];
  }
  if (maxLength <= 0) return;
  const stack = [{
    endIndexChunks: 0,
    nextStartIndex: 1,
    chunks: []
  }];
  while (stack.length > 0) {
    const last = safePop$1(stack);
    for (let index = last.nextStartIndex; index <= value.length; ++index) {
      const chunk = safeSubstring(value, last.endIndexChunks, index);
      if (patternsArb.canShrinkWithoutContext(chunk)) {
        const newChunks = [...last.chunks, chunk];
        if (index === value.length) {
          if (newChunks.length < minLength) break;
          return newChunks;
        }
        safePush(stack, {
          endIndexChunks: last.endIndexChunks,
          nextStartIndex: index + 1,
          chunks: last.chunks
        });
        if (newChunks.length < maxLength) safePush(stack, {
          endIndexChunks: index,
          nextStartIndex: index + 1,
          chunks: newChunks
        });
        break;
      }
    }
  }
}
function patternsToStringMapper(tab) {
  return safeJoin(tab, "");
}
function minLengthFrom(constraints) {
  return constraints.minLength !== void 0 ? constraints.minLength : 0;
}
function maxLengthFrom(constraints) {
  return constraints.maxLength !== void 0 ? constraints.maxLength : MaxLengthUpperBound;
}
function patternsToStringUnmapperIsValidLength(tokens, constraints) {
  return minLengthFrom(constraints) <= tokens.length && tokens.length <= maxLengthFrom(constraints);
}
function patternsToStringUnmapperFor(patternsArb, constraints) {
  return function patternsToStringUnmapper(value) {
    if (typeof value !== "string") throw new SError("Unsupported value");
    const tokens = tokenizeString(patternsArb, value, minLengthFrom(constraints), maxLengthFrom(constraints));
    if (tokens === void 0) throw new SError("Unable to unmap received string");
    return tokens;
  };
}
var dangerousStrings = [
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
  "__proto__",
  "constructor",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "toString",
  "valueOf",
  "apply",
  "arguments",
  "bind",
  "call",
  "caller",
  "length",
  "name",
  "prototype",
  "key",
  "ref"
];
var slicesPerArbitrary = /* @__PURE__ */ new WeakMap();
function createSlicesForStringNoConstraints(charArbitrary) {
  const slicesForString = [];
  for (const dangerous of dangerousStrings) {
    const candidate = tokenizeString(charArbitrary, dangerous, 0, MaxLengthUpperBound);
    if (candidate !== void 0) safePush(slicesForString, candidate);
  }
  return slicesForString;
}
function createSlicesForString(charArbitrary, constraints) {
  let slices = safeGet(slicesPerArbitrary, charArbitrary);
  if (slices === void 0) {
    slices = createSlicesForStringNoConstraints(charArbitrary);
    safeSet(slicesPerArbitrary, charArbitrary, slices);
  }
  const slicesForConstraints = [];
  for (const slice of slices) if (patternsToStringUnmapperIsValidLength(slice, constraints)) safePush(slicesForConstraints, slice);
  return slicesForConstraints;
}
var asciiAlphabetRanges = [[0, 127]];
var fullAlphabetRanges = [[0, 55295], [57344, 1114111]];
var autonomousGraphemeRanges = [
  [32, 126],
  [160, 172],
  [174, 767],
  [880, 887],
  [890, 895],
  [900, 906],
  [908],
  [910, 929],
  [931, 1154],
  [1162, 1327],
  [1329, 1366],
  [1369, 1418],
  [1421, 1423],
  [1470],
  [1472],
  [1475],
  [1478],
  [1488, 1514],
  [1519, 1524],
  [1542, 1551],
  [1563],
  [1565, 1610],
  [1632, 1647],
  [1649, 1749],
  [1758],
  [1765, 1766],
  [1769],
  [1774, 1805],
  [1808],
  [1810, 1839],
  [1869, 1957],
  [1969],
  [1984, 2026],
  [2036, 2042],
  [2046, 2069],
  [2074],
  [2084],
  [2088],
  [2096, 2110],
  [2112, 2136],
  [2142],
  [2144, 2154],
  [2160, 2190],
  [2208, 2249],
  [2308, 2361],
  [2365],
  [2384],
  [2392, 2401],
  [2404, 2432],
  [2437, 2444],
  [2447, 2448],
  [2451, 2472],
  [2474, 2480],
  [2482],
  [2486, 2489],
  [2493],
  [2510],
  [2524, 2525],
  [2527, 2529],
  [2534, 2557],
  [2565, 2570],
  [2575, 2576],
  [2579, 2600],
  [2602, 2608],
  [2610, 2611],
  [2613, 2614],
  [2616, 2617],
  [2649, 2652],
  [2654],
  [2662, 2671],
  [2674, 2676],
  [2678],
  [2693, 2701],
  [2703, 2705],
  [2707, 2728],
  [2730, 2736],
  [2738, 2739],
  [2741, 2745],
  [2749],
  [2768],
  [2784, 2785],
  [2790, 2801],
  [2809],
  [2821, 2828],
  [2831, 2832],
  [2835, 2856],
  [2858, 2864],
  [2866, 2867],
  [2869, 2873],
  [2877],
  [2908, 2909],
  [2911, 2913],
  [2918, 2935],
  [2947],
  [2949, 2954],
  [2958, 2960],
  [2962, 2965],
  [2969, 2970],
  [2972],
  [2974, 2975],
  [2979, 2980],
  [2984, 2986],
  [2990, 3001],
  [3024],
  [3046, 3066],
  [3077, 3084],
  [3086, 3088],
  [3090, 3112],
  [3114, 3129],
  [3133],
  [3160, 3162],
  [3165],
  [3168, 3169],
  [3174, 3183],
  [3191, 3200],
  [3204, 3212],
  [3214, 3216],
  [3218, 3240],
  [3242, 3251],
  [3253, 3257],
  [3261],
  [3293, 3294],
  [3296, 3297],
  [3302, 3311],
  [3313, 3314],
  [3332, 3340],
  [3342, 3344],
  [3346, 3386],
  [3389],
  [3407],
  [3412, 3414],
  [3416, 3425],
  [3430, 3455],
  [3461, 3478],
  [3482, 3505],
  [3507, 3515],
  [3517],
  [3520, 3526],
  [3558, 3567],
  [3572],
  [3585, 3632],
  [3634],
  [3647, 3654],
  [3663, 3675],
  [3713, 3714],
  [3716],
  [3718, 3722],
  [3724, 3747],
  [3749],
  [3751, 3760],
  [3762],
  [3773],
  [3776, 3780],
  [3782],
  [3792, 3801],
  [3804, 3807],
  [3840, 3863],
  [3866, 3892],
  [3894],
  [3896],
  [3898, 3901],
  [3904, 3911],
  [3913, 3948],
  [3973],
  [3976, 3980],
  [4030, 4037],
  [4039, 4044],
  [4046, 4058],
  [4096, 4138],
  [4159, 4181],
  [4186, 4189],
  [4193],
  [4197, 4198],
  [4206, 4208],
  [4213, 4225],
  [4238],
  [4240, 4249],
  [4254, 4293],
  [4295],
  [4301],
  [4304, 4351],
  [4608, 4680],
  [4682, 4685],
  [4688, 4694],
  [4696],
  [4698, 4701],
  [4704, 4744],
  [4746, 4749],
  [4752, 4784],
  [4786, 4789],
  [4792, 4798],
  [4800],
  [4802, 4805],
  [4808, 4822],
  [4824, 4880],
  [4882, 4885],
  [4888, 4954],
  [4960, 4988],
  [4992, 5017],
  [5024, 5109],
  [5112, 5117],
  [5120, 5788],
  [5792, 5880],
  [5888, 5905],
  [5919, 5937],
  [5941, 5942],
  [5952, 5969],
  [5984, 5996],
  [5998, 6e3],
  [6016, 6067],
  [6100, 6108],
  [6112, 6121],
  [6128, 6137],
  [6144, 6154],
  [6160, 6169],
  [6176, 6264],
  [6272, 6276],
  [6279, 6312],
  [6314],
  [6320, 6389],
  [6400, 6430],
  [6464],
  [6468, 6509],
  [6512, 6516],
  [6528, 6571],
  [6576, 6601],
  [6608, 6618],
  [6622, 6678],
  [6686, 6740],
  [6784, 6793],
  [6800, 6809],
  [6816, 6829],
  [6917, 6963],
  [6981, 6988],
  [6992, 7018],
  [7028, 7038],
  [7043, 7072],
  [7086, 7141],
  [7164, 7203],
  [7227, 7241],
  [7245, 7304],
  [7312, 7354],
  [7357, 7367],
  [7379],
  [7401, 7404],
  [7406, 7411],
  [7413, 7414],
  [7418],
  [7424, 7615],
  [7680, 7957],
  [7960, 7965],
  [7968, 8005],
  [8008, 8013],
  [8016, 8023],
  [8025],
  [8027],
  [8029],
  [8031, 8061],
  [8064, 8116],
  [8118, 8132],
  [8134, 8147],
  [8150, 8155],
  [8157, 8175],
  [8178, 8180],
  [8182, 8190],
  [8192, 8202],
  [8208, 8233],
  [8239, 8287],
  [8304, 8305],
  [8308, 8334],
  [8336, 8348],
  [8352, 8384],
  [8448, 8587],
  [8592, 9254],
  [9280, 9290],
  [9312, 11123],
  [11126, 11157],
  [11159, 11502],
  [11506, 11507],
  [11513, 11557],
  [11559],
  [11565],
  [11568, 11623],
  [11631, 11632],
  [11648, 11670],
  [11680, 11686],
  [11688, 11694],
  [11696, 11702],
  [11704, 11710],
  [11712, 11718],
  [11720, 11726],
  [11728, 11734],
  [11736, 11742],
  [11776, 11869],
  [11904, 11929],
  [11931, 12019],
  [12032, 12245],
  [12272, 12329],
  [12336, 12351],
  [12353, 12438],
  [12443, 12543],
  [12549, 12591],
  [12593, 12686],
  [12688, 12771],
  [12783, 12830],
  [12832, 13312],
  [19903, 19968],
  [40959, 42124],
  [42128, 42182],
  [42192, 42539],
  [42560, 42606],
  [42611],
  [42622, 42653],
  [42656, 42735],
  [42738, 42743],
  [42752, 42954],
  [42960, 42961],
  [42963],
  [42965, 42969],
  [42994, 43009],
  [43011, 43013],
  [43015, 43018],
  [43020, 43042],
  [43048, 43051],
  [43056, 43065],
  [43072, 43127],
  [43138, 43187],
  [43214, 43225],
  [43250, 43262],
  [43264, 43301],
  [43310, 43334],
  [43359],
  [43396, 43442],
  [43457, 43469],
  [43471, 43481],
  [43486, 43492],
  [43494, 43518],
  [43520, 43560],
  [43584, 43586],
  [43588, 43595],
  [43600, 43609],
  [43612, 43642],
  [43646, 43695],
  [43697],
  [43701, 43702],
  [43705, 43709],
  [43712],
  [43714],
  [43739, 43754],
  [43760, 43764],
  [43777, 43782],
  [43785, 43790],
  [43793, 43798],
  [43808, 43814],
  [43816, 43822],
  [43824, 43883],
  [43888, 44002],
  [44011],
  [44016, 44025],
  [44032],
  [55203],
  [63744, 64109],
  [64112, 64217],
  [64256, 64262],
  [64275, 64279],
  [64285],
  [64287, 64310],
  [64312, 64316],
  [64318],
  [64320, 64321],
  [64323, 64324],
  [64326, 64450],
  [64467, 64911],
  [64914, 64967],
  [64975],
  [65008, 65023],
  [65040, 65049],
  [65072, 65106],
  [65108, 65126],
  [65128, 65131],
  [65136, 65140],
  [65142, 65276],
  [65281, 65437],
  [65440, 65470],
  [65474, 65479],
  [65482, 65487],
  [65490, 65495],
  [65498, 65500],
  [65504, 65510],
  [65512, 65518],
  [65532, 65533],
  [65536, 65547],
  [65549, 65574],
  [65576, 65594],
  [65596, 65597],
  [65599, 65613],
  [65616, 65629],
  [65664, 65786],
  [65792, 65794],
  [65799, 65843],
  [65847, 65934],
  [65936, 65948],
  [65952],
  [66e3, 66044],
  [66176, 66204],
  [66208, 66256],
  [66273, 66299],
  [66304, 66339],
  [66349, 66378],
  [66384, 66421],
  [66432, 66461],
  [66463, 66499],
  [66504, 66517],
  [66560, 66717],
  [66720, 66729],
  [66736, 66771],
  [66776, 66811],
  [66816, 66855],
  [66864, 66915],
  [66927, 66938],
  [66940, 66954],
  [66956, 66962],
  [66964, 66965],
  [66967, 66977],
  [66979, 66993],
  [66995, 67001],
  [67003, 67004],
  [67072, 67382],
  [67392, 67413],
  [67424, 67431],
  [67456, 67461],
  [67463, 67504],
  [67506, 67514],
  [67584, 67589],
  [67592],
  [67594, 67637],
  [67639, 67640],
  [67644],
  [67647, 67669],
  [67671, 67742],
  [67751, 67759],
  [67808, 67826],
  [67828, 67829],
  [67835, 67867],
  [67871, 67897],
  [67903],
  [67968, 68023],
  [68028, 68047],
  [68050, 68096],
  [68112, 68115],
  [68117, 68119],
  [68121, 68149],
  [68160, 68168],
  [68176, 68184],
  [68192, 68255],
  [68288, 68324],
  [68331, 68342],
  [68352, 68405],
  [68409, 68437],
  [68440, 68466],
  [68472, 68497],
  [68505, 68508],
  [68521, 68527],
  [68608, 68680],
  [68736, 68786],
  [68800, 68850],
  [68858, 68899],
  [68912, 68921],
  [69216, 69246],
  [69248, 69289],
  [69293],
  [69296, 69297],
  [69376, 69415],
  [69424, 69445],
  [69457, 69465],
  [69488, 69505],
  [69510, 69513],
  [69552, 69579],
  [69600, 69622],
  [69635, 69687],
  [69703, 69709],
  [69714, 69743],
  [69745, 69746],
  [69749],
  [69763, 69807],
  [69819, 69820],
  [69822, 69825],
  [69840, 69864],
  [69872, 69881],
  [69891, 69926],
  [69942, 69956],
  [69959],
  [69968, 70002],
  [70004, 70006],
  [70019, 70066],
  [70081],
  [70084, 70088],
  [70093],
  [70096, 70111],
  [70113, 70132],
  [70144, 70161],
  [70163, 70187],
  [70200, 70205],
  [70207, 70208],
  [70272, 70278],
  [70280],
  [70282, 70285],
  [70287, 70301],
  [70303, 70313],
  [70320, 70366],
  [70384, 70393],
  [70405, 70412],
  [70415, 70416],
  [70419, 70440],
  [70442, 70448],
  [70450, 70451],
  [70453, 70457],
  [70461],
  [70480],
  [70493, 70497],
  [70656, 70708],
  [70727, 70747],
  [70749],
  [70751, 70753],
  [70784, 70831],
  [70852, 70855],
  [70864, 70873],
  [71040, 71086],
  [71105, 71131],
  [71168, 71215],
  [71233, 71236],
  [71248, 71257],
  [71264, 71276],
  [71296, 71338],
  [71352, 71353],
  [71360, 71369],
  [71424, 71450],
  [71472, 71494],
  [71680, 71723],
  [71739],
  [71840, 71922],
  [71935, 71942],
  [71945],
  [71948, 71955],
  [71957, 71958],
  [71960, 71983],
  [72004, 72006],
  [72016, 72025],
  [72096, 72103],
  [72106, 72144],
  [72161, 72163],
  [72192],
  [72203, 72242],
  [72255, 72262],
  [72272],
  [72284, 72323],
  [72346, 72354],
  [72368, 72440],
  [72448, 72457],
  [72704, 72712],
  [72714, 72750],
  [72768, 72773],
  [72784, 72812],
  [72816, 72847],
  [72960, 72966],
  [72968, 72969],
  [72971, 73008],
  [73040, 73049],
  [73056, 73061],
  [73063, 73064],
  [73066, 73097],
  [73112],
  [73120, 73129],
  [73440, 73458],
  [73463, 73464],
  [73476, 73488],
  [73490, 73523],
  [73539, 73561],
  [73648],
  [73664, 73713],
  [73727, 74649],
  [74752, 74862],
  [74864, 74868],
  [74880, 75075],
  [77712, 77810],
  [77824, 78895],
  [78913, 78918],
  [82944, 83526],
  [92160, 92728],
  [92736, 92766],
  [92768, 92777],
  [92782, 92862],
  [92864, 92873],
  [92880, 92909],
  [92917],
  [92928, 92975],
  [92983, 92997],
  [93008, 93017],
  [93019, 93025],
  [93027, 93047],
  [93053, 93071],
  [93760, 93850],
  [93952, 94026],
  [94032],
  [94099, 94111],
  [94176, 94179],
  [94208],
  [100343],
  [100352, 101589],
  [101632],
  [101640],
  [110576, 110579],
  [110581, 110587],
  [110589, 110590],
  [110592, 110882],
  [110898],
  [110928, 110930],
  [110933],
  [110948, 110951],
  [110960, 111355],
  [113664, 113770],
  [113776, 113788],
  [113792, 113800],
  [113808, 113817],
  [113820],
  [113823],
  [118608, 118723],
  [118784, 119029],
  [119040, 119078],
  [119081, 119140],
  [119146, 119148],
  [119171, 119172],
  [119180, 119209],
  [119214, 119274],
  [119296, 119361],
  [119365],
  [119488, 119507],
  [119520, 119539],
  [119552, 119638],
  [119648, 119672],
  [119808, 119892],
  [119894, 119964],
  [119966, 119967],
  [119970],
  [119973, 119974],
  [119977, 119980],
  [119982, 119993],
  [119995],
  [119997, 120003],
  [120005, 120069],
  [120071, 120074],
  [120077, 120084],
  [120086, 120092],
  [120094, 120121],
  [120123, 120126],
  [120128, 120132],
  [120134],
  [120138, 120144],
  [120146, 120485],
  [120488, 120779],
  [120782, 121343],
  [121399, 121402],
  [121453, 121460],
  [121462, 121475],
  [121477, 121483],
  [122624, 122654],
  [122661, 122666],
  [122928, 122989],
  [123136, 123180],
  [123191, 123197],
  [123200, 123209],
  [123214, 123215],
  [123536, 123565],
  [123584, 123627],
  [123632, 123641],
  [123647],
  [124112, 124139],
  [124144, 124153],
  [124896, 124902],
  [124904, 124907],
  [124909, 124910],
  [124912, 124926],
  [124928, 125124],
  [125127, 125135],
  [125184, 125251],
  [125259],
  [125264, 125273],
  [125278, 125279],
  [126065, 126132],
  [126209, 126269],
  [126464, 126467],
  [126469, 126495],
  [126497, 126498],
  [126500],
  [126503],
  [126505, 126514],
  [126516, 126519],
  [126521],
  [126523],
  [126530],
  [126535],
  [126537],
  [126539],
  [126541, 126543],
  [126545, 126546],
  [126548],
  [126551],
  [126553],
  [126555],
  [126557],
  [126559],
  [126561, 126562],
  [126564],
  [126567, 126570],
  [126572, 126578],
  [126580, 126583],
  [126585, 126588],
  [126590],
  [126592, 126601],
  [126603, 126619],
  [126625, 126627],
  [126629, 126633],
  [126635, 126651],
  [126704, 126705],
  [126976, 127019],
  [127024, 127123],
  [127136, 127150],
  [127153, 127167],
  [127169, 127183],
  [127185, 127221],
  [127232, 127405],
  [127488, 127490],
  [127504, 127547],
  [127552, 127560],
  [127568, 127569],
  [127584, 127589],
  [127744, 127994],
  [128e3, 128727],
  [128732, 128748],
  [128752, 128764],
  [128768, 128886],
  [128891, 128985],
  [128992, 129003],
  [129008],
  [129024, 129035],
  [129040, 129095],
  [129104, 129113],
  [129120, 129159],
  [129168, 129197],
  [129200, 129201],
  [129280, 129619],
  [129632, 129645],
  [129648, 129660],
  [129664, 129672],
  [129680, 129725],
  [129727, 129733],
  [129742, 129755],
  [129760, 129768],
  [129776, 129784],
  [129792, 129938],
  [129940, 129994],
  [130032, 130041],
  [131072],
  [173791],
  [173824],
  [177977],
  [177984],
  [178205],
  [178208],
  [183969],
  [183984],
  [191456],
  [191472],
  [192093],
  [194560, 195101],
  [196608],
  [201546],
  [201552],
  [205743]
];
var autonomousDecomposableGraphemeRanges = [
  [192, 197],
  [199, 207],
  [209, 214],
  [217, 221],
  [224, 229],
  [231, 239],
  [241, 246],
  [249, 253],
  [255, 271],
  [274, 293],
  [296, 304],
  [308, 311],
  [313, 318],
  [323, 328],
  [332, 337],
  [340, 357],
  [360, 382],
  [416, 417],
  [431, 432],
  [461, 476],
  [478, 483],
  [486, 496],
  [500, 501],
  [504, 539],
  [542, 543],
  [550, 563],
  [901, 902],
  [904, 906],
  [908],
  [910, 912],
  [938, 944],
  [970, 974],
  [979, 980],
  [1024, 1025],
  [1027],
  [1031],
  [1036, 1038],
  [1049],
  [1081],
  [1104, 1105],
  [1107],
  [1111],
  [1116, 1118],
  [1142, 1143],
  [1217, 1218],
  [1232, 1235],
  [1238, 1239],
  [1242, 1247],
  [1250, 1255],
  [1258, 1269],
  [1272, 1273],
  [1570, 1574],
  [1728],
  [1730],
  [1747],
  [2345],
  [2353],
  [2356],
  [2392, 2399],
  [2524, 2525],
  [2527],
  [2611],
  [2614],
  [2649, 2651],
  [2654],
  [2908, 2909],
  [2964],
  [3907],
  [3917],
  [3922],
  [3927],
  [3932],
  [3945],
  [4134],
  [6918],
  [6920],
  [6922],
  [6924],
  [6926],
  [6930],
  [7680, 7833],
  [7835],
  [7840, 7929],
  [7936, 7957],
  [7960, 7965],
  [7968, 8005],
  [8008, 8013],
  [8016, 8023],
  [8025],
  [8027],
  [8029],
  [8031, 8048],
  [8050],
  [8052],
  [8054],
  [8056],
  [8058],
  [8060],
  [8064, 8116],
  [8118, 8122],
  [8124],
  [8129, 8132],
  [8134, 8136],
  [8138],
  [8140, 8146],
  [8150, 8154],
  [8157, 8162],
  [8164, 8170],
  [8172, 8173],
  [8178, 8180],
  [8182, 8184],
  [8186],
  [8188],
  [8602, 8603],
  [8622],
  [8653, 8655],
  [8708],
  [8713],
  [8716],
  [8740],
  [8742],
  [8769],
  [8772],
  [8775],
  [8777],
  [8800],
  [8802],
  [8813, 8817],
  [8820, 8821],
  [8824, 8825],
  [8832, 8833],
  [8836, 8837],
  [8840, 8841],
  [8876, 8879],
  [8928, 8931],
  [8938, 8941],
  [10972],
  [12364],
  [12366],
  [12368],
  [12370],
  [12372],
  [12374],
  [12376],
  [12378],
  [12380],
  [12382],
  [12384],
  [12386],
  [12389],
  [12391],
  [12393],
  [12400, 12401],
  [12403, 12404],
  [12406, 12407],
  [12409, 12410],
  [12412, 12413],
  [12436],
  [12446],
  [12460],
  [12462],
  [12464],
  [12466],
  [12468],
  [12470],
  [12472],
  [12474],
  [12476],
  [12478],
  [12480],
  [12482],
  [12485],
  [12487],
  [12489],
  [12496, 12497],
  [12499, 12500],
  [12502, 12503],
  [12505, 12506],
  [12508, 12509],
  [12532],
  [12535, 12538],
  [12542],
  [44032],
  [55203],
  [64285],
  [64287],
  [64298, 64310],
  [64312, 64316],
  [64318],
  [64320, 64321],
  [64323, 64324],
  [64326, 64334],
  [69786],
  [69788],
  [69803],
  [119134, 119140],
  [119227, 119232]
];
var safeStringFromCodePoint$3 = String.fromCodePoint;
var safeMathMin$2 = Math.min;
var safeMathMax$1 = Math.max;
function convertGraphemeRangeToMapToConstantEntry(range) {
  if (range.length === 1) {
    const codePointString = safeStringFromCodePoint$3(range[0]);
    return {
      num: 1,
      build: () => codePointString
    };
  }
  const rangeStart = range[0];
  return {
    num: range[1] - range[0] + 1,
    build: (idInGroup) => safeStringFromCodePoint$3(rangeStart + idInGroup)
  };
}
function intersectGraphemeRanges(rangesA, rangesB) {
  const mergedRanges = [];
  let cursorA = 0;
  let cursorB = 0;
  while (cursorA < rangesA.length && cursorB < rangesB.length) {
    const rangeA = rangesA[cursorA];
    const rangeAMin = rangeA[0];
    const rangeAMax = rangeA.length === 1 ? rangeA[0] : rangeA[1];
    const rangeB = rangesB[cursorB];
    const rangeBMin = rangeB[0];
    const rangeBMax = rangeB.length === 1 ? rangeB[0] : rangeB[1];
    if (rangeAMax < rangeBMin) cursorA += 1;
    else if (rangeBMax < rangeAMin) cursorB += 1;
    else {
      let min = safeMathMax$1(rangeAMin, rangeBMin);
      const max = safeMathMin$2(rangeAMax, rangeBMax);
      if (mergedRanges.length >= 1) {
        const lastMergedRange = mergedRanges[mergedRanges.length - 1];
        if ((lastMergedRange.length === 1 ? lastMergedRange[0] : lastMergedRange[1]) + 1 === min) {
          min = lastMergedRange[0];
          safePop$1(mergedRanges);
        }
      }
      safePush(mergedRanges, min === max ? [min] : [min, max]);
      if (rangeAMax <= max) cursorA += 1;
      if (rangeBMax <= max) cursorB += 1;
    }
  }
  return mergedRanges;
}
var registeredStringUnitInstancesMap = /* @__PURE__ */ Object.create(null);
function getAlphabetRanges(alphabet) {
  switch (alphabet) {
    case "full":
      return fullAlphabetRanges;
    case "ascii":
      return asciiAlphabetRanges;
  }
}
function getOrCreateStringUnitInstance(type, alphabet) {
  const key = `${type}:${alphabet}`;
  const registered = registeredStringUnitInstancesMap[key];
  if (registered !== void 0) return registered;
  const alphabetRanges = getAlphabetRanges(alphabet);
  const ranges = type === "binary" ? alphabetRanges : intersectGraphemeRanges(alphabetRanges, autonomousGraphemeRanges);
  const entries = [];
  for (const range of ranges) safePush(entries, convertGraphemeRangeToMapToConstantEntry(range));
  if (type === "grapheme") {
    const decomposedRanges = intersectGraphemeRanges(alphabetRanges, autonomousDecomposableGraphemeRanges);
    for (const range of decomposedRanges) {
      const rawEntry = convertGraphemeRangeToMapToConstantEntry(range);
      safePush(entries, {
        num: rawEntry.num,
        build: (idInGroup) => safeNormalize(rawEntry.build(idInGroup), "NFD")
      });
    }
  }
  const stringUnitInstance = mapToConstant(...entries);
  registeredStringUnitInstancesMap[key] = stringUnitInstance;
  return stringUnitInstance;
}
function stringUnit(type, alphabet) {
  return getOrCreateStringUnitInstance(type, alphabet);
}
function extractUnitArbitrary(constraints) {
  if (typeof constraints.unit === "object") return constraints.unit;
  switch (constraints.unit) {
    case "grapheme":
      return stringUnit("grapheme", "full");
    case "grapheme-composite":
      return stringUnit("composite", "full");
    case "grapheme-ascii":
    case void 0:
      return stringUnit("grapheme", "ascii");
    case "binary":
      return stringUnit("binary", "full");
    case "binary-ascii":
      return stringUnit("binary", "ascii");
  }
}
function string(constraints = {}) {
  const charArbitrary = extractUnitArbitrary(constraints);
  const unmapper = patternsToStringUnmapperFor(charArbitrary, constraints);
  const experimentalCustomSlices = createSlicesForString(charArbitrary, constraints);
  return array(charArbitrary, {
    ...constraints,
    experimentalCustomSlices
  }).map(patternsToStringMapper, unmapper);
}
var safeStringFromCharCode$1 = String.fromCharCode;
var safeNegativeInfinity$6 = SNumber.NEGATIVE_INFINITY;
var safePositiveInfinity$6 = SNumber.POSITIVE_INFINITY;
var safeEpsilon = SNumber.EPSILON;
var INDEX_POSITIVE_INFINITY$1 = SBigInt2(2146435072) * SBigInt2(4294967296);
var INDEX_NEGATIVE_INFINITY$1 = -INDEX_POSITIVE_INFINITY$1 - SBigInt2(1);
var num2Pow52 = 4503599627370496;
var big2Pow52Mask = SBigInt2(4503599627370495);
var big2Pow53 = SBigInt2("9007199254740992");
var f64 = /* @__PURE__ */ new Float64Array(1);
var u32$1 = new Uint32Array(f64.buffer, f64.byteOffset);
function bitCastDoubleToUInt64(f) {
  f64[0] = f;
  return [u32$1[1], u32$1[0]];
}
function decomposeDouble(d) {
  const { 0: hi, 1: lo } = bitCastDoubleToUInt64(d);
  const signBit = hi >>> 31;
  const exponentBits = hi >>> 20 & 2047;
  const significandBits = (hi & 1048575) * 4294967296 + lo;
  const exponent = exponentBits === 0 ? -1022 : exponentBits - 1023;
  let significand = exponentBits === 0 ? 0 : 1;
  significand += significandBits * safeEpsilon;
  significand *= signBit === 0 ? 1 : -1;
  return {
    exponent,
    significand
  };
}
function indexInDoubleFromDecomp(exponent, significand) {
  if (exponent === -1022) return SBigInt2(significand * num2Pow52);
  return SBigInt2((significand - 1) * num2Pow52) + (SBigInt2(exponent + 1023) << SBigInt2(52));
}
function doubleToIndex(d) {
  if (d === safePositiveInfinity$6) return INDEX_POSITIVE_INFINITY$1;
  if (d === safeNegativeInfinity$6) return INDEX_NEGATIVE_INFINITY$1;
  const decomp = decomposeDouble(d);
  const exponent = decomp.exponent;
  const significand = decomp.significand;
  if (d > 0 || d === 0 && 1 / d === safePositiveInfinity$6) return indexInDoubleFromDecomp(exponent, significand);
  else return -indexInDoubleFromDecomp(exponent, -significand) - SBigInt2(1);
}
function indexToDouble(index) {
  if (index < 0) return -indexToDouble(-index - SBigInt2(1));
  if (index === INDEX_POSITIVE_INFINITY$1) return safePositiveInfinity$6;
  if (index < big2Pow53) return SNumber(index) * 2 ** -1074;
  const postIndex = index - big2Pow53;
  const exponent = -1021 + SNumber(postIndex >> SBigInt2(52));
  return (1 + SNumber(postIndex & big2Pow52Mask) * safeEpsilon) * 2 ** exponent;
}
var safeNumberIsInteger$2 = Number.isInteger;
var safeObjectIs$1 = Object.is;
var safeNegativeInfinity$5 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$5 = Number.POSITIVE_INFINITY;
function refineConstraintsForFloatingOnly(constraints, maxValue, maxNonIntegerValue2, onlyIntegersAfterThisValue2) {
  const { noDefaultInfinity = false, minExcluded = false, maxExcluded = false, min = noDefaultInfinity ? -maxValue : safeNegativeInfinity$5, max = noDefaultInfinity ? maxValue : safePositiveInfinity$5 } = constraints;
  const effectiveMin = minExcluded ? min < -maxNonIntegerValue2 ? -onlyIntegersAfterThisValue2 : Math.max(min, -maxNonIntegerValue2) : min === safeNegativeInfinity$5 ? Math.max(min, -onlyIntegersAfterThisValue2) : Math.max(min, -maxNonIntegerValue2);
  const effectiveMax = maxExcluded ? max > maxNonIntegerValue2 ? onlyIntegersAfterThisValue2 : Math.min(max, maxNonIntegerValue2) : max === safePositiveInfinity$5 ? Math.min(max, onlyIntegersAfterThisValue2) : Math.min(max, maxNonIntegerValue2);
  return {
    noDefaultInfinity: false,
    minExcluded: minExcluded || (min !== safeNegativeInfinity$5 || minExcluded) && safeNumberIsInteger$2(effectiveMin),
    maxExcluded: maxExcluded || (max !== safePositiveInfinity$5 || maxExcluded) && safeNumberIsInteger$2(effectiveMax),
    min: safeObjectIs$1(effectiveMin, -0) ? 0 : effectiveMin,
    max: safeObjectIs$1(effectiveMax, 0) ? -0 : effectiveMax,
    noNaN: constraints.noNaN || false
  };
}
var safeNegativeInfinity$4 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$4 = Number.POSITIVE_INFINITY;
var safeMaxValue$2 = Number.MAX_VALUE;
var maxNonIntegerValue$1 = 45035996273704955e-1;
var onlyIntegersAfterThisValue$1 = 4503599627370496;
function refineConstraintsForDoubleOnly(constraints) {
  return refineConstraintsForFloatingOnly(constraints, safeMaxValue$2, maxNonIntegerValue$1, onlyIntegersAfterThisValue$1);
}
function doubleOnlyMapper(value) {
  return value === 4503599627370496 ? safePositiveInfinity$4 : value === -4503599627370496 ? safeNegativeInfinity$4 : value;
}
function doubleOnlyUnmapper(value) {
  if (typeof value !== "number") throw new Error("Unsupported type");
  return value === safePositiveInfinity$4 ? onlyIntegersAfterThisValue$1 : value === safeNegativeInfinity$4 ? -4503599627370496 : value;
}
var safeNumberIsInteger$1 = Number.isInteger;
var safeNumberIsNaN$1 = Number.isNaN;
var safeNegativeInfinity$3 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$3 = Number.POSITIVE_INFINITY;
var safeMaxValue$1 = Number.MAX_VALUE;
var safeNaN$1 = NaN;
function safeDoubleToIndex(d, constraintsLabel) {
  if (safeNumberIsNaN$1(d)) throw new Error("fc.double constraints." + constraintsLabel + " must be a 64-bit float");
  return doubleToIndex(d);
}
function unmapperDoubleToIndex(value) {
  if (typeof value !== "number") throw new Error("Unsupported type");
  return doubleToIndex(value);
}
function numberIsNotInteger$1(value) {
  return !safeNumberIsInteger$1(value);
}
function anyDouble(constraints) {
  const { noDefaultInfinity = false, noNaN = false, minExcluded = false, maxExcluded = false, min = noDefaultInfinity ? -safeMaxValue$1 : safeNegativeInfinity$3, max = noDefaultInfinity ? safeMaxValue$1 : safePositiveInfinity$3 } = constraints;
  const minIndexRaw = safeDoubleToIndex(min, "min");
  const minIndex = minExcluded ? minIndexRaw + SBigInt2(1) : minIndexRaw;
  const maxIndexRaw = safeDoubleToIndex(max, "max");
  const maxIndex = maxExcluded ? maxIndexRaw - SBigInt2(1) : maxIndexRaw;
  if (maxIndex < minIndex) throw new Error("fc.double constraints.min must be smaller or equal to constraints.max");
  if (noNaN) return bigInt({
    min: minIndex,
    max: maxIndex
  }).map(indexToDouble, unmapperDoubleToIndex);
  const positiveMaxIdx = maxIndex > SBigInt2(0);
  const minIndexWithNaN = positiveMaxIdx ? minIndex : minIndex - SBigInt2(1);
  const maxIndexWithNaN = positiveMaxIdx ? maxIndex + SBigInt2(1) : maxIndex;
  return bigInt({
    min: minIndexWithNaN,
    max: maxIndexWithNaN
  }).map((index) => {
    if (maxIndex < index || index < minIndex) return safeNaN$1;
    else return indexToDouble(index);
  }, (value) => {
    if (typeof value !== "number") throw new Error("Unsupported type");
    if (safeNumberIsNaN$1(value)) return maxIndex !== maxIndexWithNaN ? maxIndexWithNaN : minIndexWithNaN;
    return doubleToIndex(value);
  });
}
function double(constraints = {}) {
  if (!constraints.noInteger) return anyDouble(constraints);
  return anyDouble(refineConstraintsForDoubleOnly(constraints)).map(doubleOnlyMapper, doubleOnlyUnmapper).filter(numberIsNotInteger$1);
}
var safeNegativeInfinity$2 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$2 = Number.POSITIVE_INFINITY;
var safeMathImul = Math.imul;
var MAX_VALUE_32 = 2 ** 127 * (1 + (2 ** 23 - 1) / 2 ** 23);
var INDEX_POSITIVE_INFINITY = 2139095040;
var INDEX_NEGATIVE_INFINITY = -2139095041;
var f32 = /* @__PURE__ */ new Float32Array(1);
var u32 = new Uint32Array(f32.buffer, f32.byteOffset);
function bitCastFloatToUInt32(f) {
  f32[0] = f;
  return u32[0];
}
function decomposeFloat(f) {
  const bits = bitCastFloatToUInt32(f);
  const signBit = bits >>> 31;
  const exponentBits = bits >>> 23 & 255;
  const significandBits = bits & 8388607;
  const exponent = exponentBits === 0 ? -126 : exponentBits - 127;
  let significand = exponentBits === 0 ? 0 : 1;
  significand += significandBits / 2 ** 23;
  significand *= signBit === 0 ? 1 : -1;
  return {
    exponent,
    significand
  };
}
function indexInFloatFromDecomp(exponent, significand) {
  if (exponent === -126) return significand * 8388608;
  return safeMathImul(exponent + 127, 8388608) + (significand - 1) * 8388608;
}
function floatToIndex(f) {
  if (f === safePositiveInfinity$2) return INDEX_POSITIVE_INFINITY;
  if (f === safeNegativeInfinity$2) return INDEX_NEGATIVE_INFINITY;
  const decomp = decomposeFloat(f);
  const exponent = decomp.exponent;
  const significand = decomp.significand;
  if (f > 0 || f === 0 && 1 / f === safePositiveInfinity$2) return indexInFloatFromDecomp(exponent, significand);
  else return -indexInFloatFromDecomp(exponent, -significand) - 1;
}
function indexToFloat(index) {
  if (index < 0) return -indexToFloat(-index - 1);
  if (index === INDEX_POSITIVE_INFINITY) return safePositiveInfinity$2;
  if (index < 16777216) return index * 2 ** -149;
  const postIndex = index - 16777216;
  const exponent = -125 + (postIndex >> 23);
  return (1 + (postIndex & 8388607) / 8388608) * 2 ** exponent;
}
var safeNegativeInfinity$1 = Number.NEGATIVE_INFINITY;
var safePositiveInfinity$1 = Number.POSITIVE_INFINITY;
var safeMaxValue = MAX_VALUE_32;
var maxNonIntegerValue = 83886075e-1;
var onlyIntegersAfterThisValue = 8388608;
function refineConstraintsForFloatOnly(constraints) {
  return refineConstraintsForFloatingOnly(constraints, safeMaxValue, maxNonIntegerValue, onlyIntegersAfterThisValue);
}
function floatOnlyMapper(value) {
  return value === 8388608 ? safePositiveInfinity$1 : value === -8388608 ? safeNegativeInfinity$1 : value;
}
function floatOnlyUnmapper(value) {
  if (typeof value !== "number") throw new Error("Unsupported type");
  return value === safePositiveInfinity$1 ? onlyIntegersAfterThisValue : value === safeNegativeInfinity$1 ? -8388608 : value;
}
var safeNumberIsInteger = Number.isInteger;
var safeNumberIsNaN = Number.isNaN;
var safeMathFround = Math.fround;
var safeNegativeInfinity = Number.NEGATIVE_INFINITY;
var safePositiveInfinity = Number.POSITIVE_INFINITY;
var safeNaN = NaN;
function safeFloatToIndex(f, constraintsLabel) {
  const errorMessage2 = "fc.float constraints." + constraintsLabel + " must be a 32-bit float - you can convert any double to a 32-bit float by using `Math.fround(myDouble)`";
  if (safeNumberIsNaN(f) || safeMathFround(f) !== f) throw new Error(errorMessage2);
  return floatToIndex(f);
}
function unmapperFloatToIndex(value) {
  if (typeof value !== "number") throw new Error("Unsupported type");
  return floatToIndex(value);
}
function numberIsNotInteger(value) {
  return !safeNumberIsInteger(value);
}
function anyFloat(constraints) {
  const { noDefaultInfinity = false, noNaN = false, minExcluded = false, maxExcluded = false, min = noDefaultInfinity ? -MAX_VALUE_32 : safeNegativeInfinity, max = noDefaultInfinity ? MAX_VALUE_32 : safePositiveInfinity } = constraints;
  const minIndexRaw = safeFloatToIndex(min, "min");
  const minIndex = minExcluded ? minIndexRaw + 1 : minIndexRaw;
  const maxIndexRaw = safeFloatToIndex(max, "max");
  const maxIndex = maxExcluded ? maxIndexRaw - 1 : maxIndexRaw;
  if (minIndex > maxIndex) throw new Error("fc.float constraints.min must be smaller or equal to constraints.max");
  if (noNaN) return integer({
    min: minIndex,
    max: maxIndex
  }).map(indexToFloat, unmapperFloatToIndex);
  const minIndexWithNaN = maxIndex > 0 ? minIndex : minIndex - 1;
  const maxIndexWithNaN = maxIndex > 0 ? maxIndex + 1 : maxIndex;
  return integer({
    min: minIndexWithNaN,
    max: maxIndexWithNaN
  }).map((index) => {
    if (index > maxIndex || index < minIndex) return safeNaN;
    else return indexToFloat(index);
  }, (value) => {
    if (typeof value !== "number") throw new Error("Unsupported type");
    if (safeNumberIsNaN(value)) return maxIndex !== maxIndexWithNaN ? maxIndexWithNaN : minIndexWithNaN;
    return floatToIndex(value);
  });
}
function float(constraints = {}) {
  if (!constraints.noInteger) return anyFloat(constraints);
  return anyFloat(refineConstraintsForFloatOnly(constraints)).map(floatOnlyMapper, floatOnlyUnmapper).filter(numberIsNotInteger);
}
var safeMinSafeInteger = Number.MIN_SAFE_INTEGER;
var safeMaxSafeInteger$1 = Number.MAX_SAFE_INTEGER;
function maxSafeInteger() {
  return new IntegerArbitrary(safeMinSafeInteger, safeMaxSafeInteger$1);
}
var safeMaxSafeInteger = Number.MAX_SAFE_INTEGER;
var safeNumberParseInt = Number.parseInt;
var LazyArbitrary = class extends Arbitrary {
  constructor(name) {
    super();
    this.name = name;
    this.underlying = null;
  }
  generate(mrng, biasFactor) {
    if (this.underlying === null) throw new Error(`Lazy arbitrary ${JSON.stringify(this.name)} not correctly initialized`);
    return this.underlying.generate(mrng, biasFactor);
  }
  canShrinkWithoutContext(value) {
    if (this.underlying === null) throw new Error(`Lazy arbitrary ${JSON.stringify(this.name)} not correctly initialized`);
    return this.underlying.canShrinkWithoutContext(value);
  }
  shrink(value, context) {
    if (this.underlying === null) throw new Error(`Lazy arbitrary ${JSON.stringify(this.name)} not correctly initialized`);
    return this.underlying.shrink(value, context);
  }
};
var safeGetOwnPropertyNames = Object.getOwnPropertyNames;
function createLazyArbsPool() {
  const lazyArbsPool = new SMap$2();
  const getLazyFromPool = (key) => {
    let lazyArb = safeMapGet(lazyArbsPool, key);
    if (lazyArb !== void 0) return lazyArb;
    lazyArb = new LazyArbitrary(String(key));
    safeMapSet(lazyArbsPool, key, lazyArb);
    return lazyArb;
  };
  return getLazyFromPool;
}
function letrec(builder) {
  const getLazyFromPool = createLazyArbsPool();
  const strictArbs = builder(getLazyFromPool);
  const declaredArbitraryNames = safeGetOwnPropertyNames(strictArbs);
  for (const name of declaredArbitraryNames) {
    const lazyArb = getLazyFromPool(name);
    lazyArb.underlying = strictArbs[name];
  }
  return strictArbs;
}
var safeObjectPrototype = Object.prototype;
function arrayToMapMapper(data) {
  return new Map(data);
}
function arrayToMapUnmapper(value) {
  if (typeof value !== "object" || value === null) throw new Error("Incompatible instance received: should be a non-null object");
  if (!("constructor" in value) || value.constructor !== Map) throw new Error("Incompatible instance received: should be of exact type Map");
  return Array.from(value);
}
function mapKeyExtractor(entry) {
  return entry[0];
}
function map(keyArb, valueArb, constraints = {}) {
  return uniqueArray(tuple(keyArb, valueArb), {
    minLength: constraints.minKeys,
    maxLength: constraints.maxKeys,
    size: constraints.size,
    selector: mapKeyExtractor,
    depthIdentifier: constraints.depthIdentifier,
    comparator: "SameValueZero"
  }).map(arrayToMapMapper, arrayToMapUnmapper);
}
function toTypedMapper$1(data) {
  return SFloat32Array.from(data);
}
function fromTypedUnmapper$1(value) {
  if (!(value instanceof SFloat32Array)) throw new Error("Unexpected type");
  return [...value];
}
function float32Array(constraints = {}) {
  return array(float(constraints), constraints).map(toTypedMapper$1, fromTypedUnmapper$1);
}
function toTypedMapper(data) {
  return SFloat64Array.from(data);
}
function fromTypedUnmapper(value) {
  if (!(value instanceof SFloat64Array)) throw new Error("Unexpected type");
  return [...value];
}
function float64Array(constraints = {}) {
  return array(double(constraints), constraints).map(toTypedMapper, fromTypedUnmapper);
}
function typedIntArrayArbitraryArbitraryBuilder(constraints, defaultMin, defaultMax, TypedArrayClass, arbitraryBuilder) {
  const generatorName = TypedArrayClass.name;
  const { min = defaultMin, max = defaultMax, ...arrayConstraints } = constraints;
  if (min > max) throw new Error(`Invalid range passed to ${generatorName}: min must be lower than or equal to max`);
  if (min < defaultMin) throw new Error(`Invalid min value passed to ${generatorName}: min must be greater than or equal to ${defaultMin}`);
  if (max > defaultMax) throw new Error(`Invalid max value passed to ${generatorName}: max must be lower than or equal to ${defaultMax}`);
  return array(arbitraryBuilder({
    min,
    max
  }), arrayConstraints).map((data) => TypedArrayClass.from(data), (value) => {
    if (!(value instanceof TypedArrayClass)) throw new Error("Invalid type");
    return [...value];
  });
}
function int16Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, -32768, 32767, SInt16Array, integer);
}
function int32Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, -2147483648, 2147483647, SInt32Array, integer);
}
function int8Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, -128, 127, SInt8Array, integer);
}
function uint16Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, 0, 65535, SUint16Array, integer);
}
function uint32Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, 0, 4294967295, SUint32Array, integer);
}
function uint8Array(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, 0, 255, SUint8Array, integer);
}
function uint8ClampedArray(constraints = {}) {
  return typedIntArrayArbitraryArbitraryBuilder(constraints, 0, 255, SUint8ClampedArray, integer);
}
function isSafeContext(context) {
  return context !== void 0;
}
function toGeneratorValue(value) {
  if (value.hasToBeCloned) return new Value(value.value_, { generatorContext: value.context }, () => value.value);
  return new Value(value.value_, { generatorContext: value.context });
}
function toShrinkerValue(value) {
  if (value.hasToBeCloned) return new Value(value.value_, { shrinkerContext: value.context }, () => value.value);
  return new Value(value.value_, { shrinkerContext: value.context });
}
var WithShrinkFromOtherArbitrary = class extends Arbitrary {
  constructor(generatorArbitrary, shrinkerArbitrary) {
    super();
    this.generatorArbitrary = generatorArbitrary;
    this.shrinkerArbitrary = shrinkerArbitrary;
  }
  generate(mrng, biasFactor) {
    return toGeneratorValue(this.generatorArbitrary.generate(mrng, biasFactor));
  }
  canShrinkWithoutContext(value) {
    return this.shrinkerArbitrary.canShrinkWithoutContext(value);
  }
  shrink(value, context) {
    if (!isSafeContext(context)) return this.shrinkerArbitrary.shrink(value, void 0).map(toShrinkerValue);
    if ("generatorContext" in context) return this.generatorArbitrary.shrink(value, context.generatorContext).map(toGeneratorValue);
    return this.shrinkerArbitrary.shrink(value, context.shrinkerContext).map(toShrinkerValue);
  }
};
function restrictedIntegerArbitraryBuilder(min, maxGenerated, max) {
  const generatorArbitrary = integer({
    min,
    max: maxGenerated
  });
  if (maxGenerated === max) return generatorArbitrary;
  return new WithShrinkFromOtherArbitrary(generatorArbitrary, integer({
    min,
    max
  }));
}
var safeMathMin$1 = Math.min;
var safeMathMax = Math.max;
var safeArrayIsArray$1 = SArray.isArray;
var safeObjectEntries = Object.entries;
function extractMaxIndex(indexesAndValues) {
  let maxIndex = -1;
  for (let index = 0; index !== indexesAndValues.length; ++index) maxIndex = safeMathMax(maxIndex, indexesAndValues[index][0]);
  return maxIndex;
}
function arrayFromItems(length, indexesAndValues) {
  const array2 = SArray(length);
  for (let index = 0; index !== indexesAndValues.length; ++index) {
    const it = indexesAndValues[index];
    if (it[0] < length) array2[it[0]] = it[1];
  }
  return array2;
}
function sparseArray(arb, constraints = {}) {
  const { size, minNumElements = 0, maxLength = MaxLengthUpperBound, maxNumElements = maxLength, noTrailingHole, depthIdentifier } = constraints;
  const maxGeneratedLength = maxGeneratedLengthFromSizeForArbitrary(size, maxGeneratedLengthFromSizeForArbitrary(size, minNumElements, maxNumElements, constraints.maxNumElements !== void 0), maxLength, constraints.maxLength !== void 0);
  if (minNumElements > maxLength) throw new Error(`The minimal number of non-hole elements cannot be higher than the maximal length of the array`);
  if (minNumElements > maxNumElements) throw new Error(`The minimal number of non-hole elements cannot be higher than the maximal number of non-holes`);
  const resultedMaxNumElements = safeMathMin$1(maxNumElements, maxLength);
  const resultedSizeMaxNumElements = constraints.maxNumElements !== void 0 || size !== void 0 ? size : "=";
  const sparseArrayNoTrailingHole = uniqueArray(tuple(restrictedIntegerArbitraryBuilder(0, safeMathMax(maxGeneratedLength - 1, 0), safeMathMax(maxLength - 1, 0)), arb), {
    size: resultedSizeMaxNumElements,
    minLength: minNumElements,
    maxLength: resultedMaxNumElements,
    selector: (item) => item[0],
    depthIdentifier
  }).map((items) => {
    return arrayFromItems(extractMaxIndex(items) + 1, items);
  }, (value) => {
    if (!safeArrayIsArray$1(value)) throw new Error("Not supported entry type");
    if (noTrailingHole && value.length !== 0 && !(value.length - 1 in value)) throw new Error("No trailing hole");
    return safeMap(safeObjectEntries(value), (entry) => [Number(entry[0]), entry[1]]);
  });
  if (noTrailingHole || maxLength === minNumElements) return sparseArrayNoTrailingHole;
  return tuple(sparseArrayNoTrailingHole, restrictedIntegerArbitraryBuilder(minNumElements, maxGeneratedLength, maxLength)).map((data) => {
    const sparse = data[0];
    const targetLength = data[1];
    if (sparse.length >= targetLength) return sparse;
    const longerSparse = safeSlice(sparse);
    longerSparse.length = targetLength;
    return longerSparse;
  }, (value) => {
    if (!safeArrayIsArray$1(value)) throw new Error("Not supported entry type");
    return [value, value.length];
  });
}
function arrayToSetMapper(data) {
  return new Set(data);
}
function arrayToSetUnmapper(value) {
  if (typeof value !== "object" || value === null) throw new Error("Incompatible instance received: should be a non-null object");
  if (!("constructor" in value) || value.constructor !== Set) throw new Error("Incompatible instance received: should be of exact type Set");
  return Array.from(value);
}
function set(arb, constraints = {}) {
  return uniqueArray(arb, {
    minLength: constraints.minLength,
    maxLength: constraints.maxLength,
    size: constraints.size,
    depthIdentifier: constraints.depthIdentifier,
    comparator: "SameValueZero"
  }).map(arrayToSetMapper, arrayToSetUnmapper);
}
function dictOf(ka, va, maxKeys, size, depthIdentifier, withNullPrototype) {
  return dictionary(ka, va, {
    maxKeys,
    noNullPrototype: !withNullPrototype,
    size,
    depthIdentifier
  });
}
function typedArray(constraints) {
  return oneof(int8Array(constraints), uint8Array(constraints), uint8ClampedArray(constraints), int16Array(constraints), uint16Array(constraints), int32Array(constraints), uint32Array(constraints), float32Array(constraints), float64Array(constraints));
}
function anyArbitraryBuilder(constraints) {
  const arbitrariesForBase = constraints.values;
  const depthSize = constraints.depthSize;
  const depthIdentifier = createDepthIdentifier();
  const maxDepth = constraints.maxDepth;
  const maxKeys = constraints.maxKeys;
  const size = constraints.size;
  const baseArb = oneof(...arbitrariesForBase, ...constraints.withBigInt ? [bigInt()] : [], ...constraints.withDate ? [date()] : []);
  return letrec((tie) => ({
    anything: oneof({
      maxDepth,
      depthSize,
      depthIdentifier
    }, baseArb, tie("array"), tie("object"), ...constraints.withMap ? [tie("map")] : [], ...constraints.withSet ? [tie("set")] : [], ...constraints.withObjectString ? [tie("anything").map((o) => stringify(o))] : [], ...constraints.withTypedArray ? [typedArray({
      maxLength: maxKeys,
      size
    })] : [], ...constraints.withSparseArray ? [sparseArray(tie("anything"), {
      maxNumElements: maxKeys,
      size,
      depthIdentifier
    })] : []),
    keys: constraints.withObjectString ? oneof({
      arbitrary: constraints.key,
      weight: 10
    }, {
      arbitrary: tie("anything").map((o) => stringify(o)),
      weight: 1
    }) : constraints.key,
    array: array(tie("anything"), {
      maxLength: maxKeys,
      size,
      depthIdentifier
    }),
    set: set(tie("anything"), {
      maxLength: maxKeys,
      size,
      depthIdentifier
    }),
    map: oneof(map(tie("keys"), tie("anything"), {
      maxKeys,
      size,
      depthIdentifier
    }), map(tie("anything"), tie("anything"), {
      maxKeys,
      size,
      depthIdentifier
    })),
    object: dictOf(tie("keys"), tie("anything"), maxKeys, size, depthIdentifier, constraints.withNullPrototype)
  })).anything;
}
function unboxedToBoxedMapper(value) {
  switch (typeof value) {
    case "boolean":
      return new SBoolean(value);
    case "number":
      return new SNumber(value);
    case "string":
      return new SString(value);
    default:
      return value;
  }
}
function unboxedToBoxedUnmapper(value) {
  if (typeof value !== "object" || value === null || !("constructor" in value)) return value;
  return value.constructor === SBoolean || value.constructor === SNumber || value.constructor === SString ? value.valueOf() : value;
}
function boxedArbitraryBuilder(arb) {
  return arb.map(unboxedToBoxedMapper, unboxedToBoxedUnmapper);
}
function defaultValues(constraints, stringArbitrary) {
  return [
    boolean(),
    maxSafeInteger(),
    double(),
    stringArbitrary(constraints),
    oneof(stringArbitrary(constraints), constant(null), constant(void 0))
  ];
}
function boxArbitraries(arbs) {
  return arbs.map((arb) => boxedArbitraryBuilder(arb));
}
function boxArbitrariesIfNeeded(arbs, boxEnabled) {
  return boxEnabled ? boxArbitraries(arbs).concat(arbs) : arbs;
}
function toQualifiedObjectConstraints(settings = {}) {
  const valueConstraints = {
    size: settings.size,
    unit: "stringUnit" in settings ? settings.stringUnit : settings.withUnicodeString ? "binary" : void 0
  };
  return {
    key: settings.key !== void 0 ? settings.key : string(valueConstraints),
    values: boxArbitrariesIfNeeded(settings.values !== void 0 ? settings.values : defaultValues(valueConstraints, string), settings.withBoxedValues === true),
    depthSize: settings.depthSize,
    maxDepth: settings.maxDepth,
    maxKeys: settings.maxKeys,
    size: settings.size,
    withSet: settings.withSet === true,
    withMap: settings.withMap === true,
    withObjectString: settings.withObjectString === true,
    withNullPrototype: settings.withNullPrototype === true,
    withBigInt: settings.withBigInt === true,
    withDate: settings.withDate === true,
    withTypedArray: settings.withTypedArray === true,
    withSparseArray: settings.withSparseArray === true
  };
}
function jsonConstraintsBuilder(stringArbitrary, constraints) {
  const { depthSize, maxDepth } = constraints;
  return {
    key: stringArbitrary,
    values: [
      boolean(),
      double({
        noDefaultInfinity: true,
        noNaN: true
      }),
      stringArbitrary,
      constant(null)
    ],
    depthSize,
    maxDepth
  };
}
function anything(constraints) {
  return anyArbitraryBuilder(toQualifiedObjectConstraints(constraints));
}
function jsonValue(constraints = {}) {
  const noUnicodeString = constraints.noUnicodeString === void 0 || constraints.noUnicodeString === true;
  return anything(jsonConstraintsBuilder("stringUnit" in constraints ? string({ unit: constraints.stringUnit }) : noUnicodeString ? string() : string({ unit: "binary" }), constraints));
}
var safeStringFromCharCode = String.fromCharCode;
var encodeSymbolLookupTable = {
  10: "A",
  11: "B",
  12: "C",
  13: "D",
  14: "E",
  15: "F",
  16: "G",
  17: "H",
  18: "J",
  19: "K",
  20: "M",
  21: "N",
  22: "P",
  23: "Q",
  24: "R",
  25: "S",
  26: "T",
  27: "V",
  28: "W",
  29: "X",
  30: "Y",
  31: "Z"
};
function encodeSymbol(symbol) {
  return symbol < 10 ? SString(symbol) : encodeSymbolLookupTable[symbol];
}
function pad(value, paddingLength) {
  let extraPadding = "";
  while (value.length + extraPadding.length < paddingLength) extraPadding += "0";
  return extraPadding + value;
}
function smallUintToBase32StringMapper(num) {
  let base32Str = "";
  for (let remaining = num; remaining !== 0; ) {
    const next = remaining >> 5;
    base32Str = encodeSymbol(remaining - (next << 5)) + base32Str;
    remaining = next;
  }
  return base32Str;
}
function uintToBase32StringMapper(num, paddingLength) {
  const head = ~~(num / 1073741824);
  const tail = num & 1073741823;
  return pad(smallUintToBase32StringMapper(head), paddingLength - 6) + pad(smallUintToBase32StringMapper(tail), 6);
}
function paddedUintToBase32StringMapper(paddingLength) {
  return function padded(num) {
    return uintToBase32StringMapper(num, paddingLength);
  };
}
var padded10Mapper = paddedUintToBase32StringMapper(10);
var padded8Mapper = paddedUintToBase32StringMapper(8);
var BINARY_PROP_NAMES_TO_ALIASES = {
  ASCII: "ASCII",
  ASCII_Hex_Digit: "AHex",
  Alphabetic: "Alpha",
  Any: "Any",
  Assigned: "Assigned",
  Bidi_Control: "Bidi_C",
  Bidi_Mirrored: "Bidi_M",
  Case_Ignorable: "CI",
  Cased: "Cased",
  Changes_When_Casefolded: "CWCF",
  Changes_When_Casemapped: "CWCM",
  Changes_When_Lowercased: "CWL",
  Changes_When_NFKC_Casefolded: "CWKCF",
  Changes_When_Titlecased: "CWT",
  Changes_When_Uppercased: "CWU",
  Dash: "Dash",
  Default_Ignorable_Code_Point: "DI",
  Deprecated: "Dep",
  Diacritic: "Dia",
  Emoji: "Emoji",
  Emoji_Component: "Emoji_Component",
  Emoji_Modifier: "Emoji_Modifier",
  Emoji_Modifier_Base: "Emoji_Modifier_Base",
  Emoji_Presentation: "Emoji_Presentation",
  Extended_Pictographic: "Extended_Pictographic",
  Extender: "Ext",
  Grapheme_Base: "Gr_Base",
  Grapheme_Extend: "Gr_Ext",
  Hex_Digit: "Hex",
  IDS_Binary_Operator: "IDSB",
  IDS_Trinary_Operator: "IDST",
  ID_Continue: "IDC",
  ID_Start: "IDS",
  Ideographic: "Ideo",
  Join_Control: "Join_C",
  Logical_Order_Exception: "LOE",
  Lowercase: "Lower",
  Math: "Math",
  Noncharacter_Code_Point: "NChar",
  Pattern_Syntax: "Pat_Syn",
  Pattern_White_Space: "Pat_WS",
  Quotation_Mark: "QMark",
  Radical: "Radical",
  Regional_Indicator: "RI",
  Sentence_Terminal: "STerm",
  Soft_Dotted: "SD",
  Terminal_Punctuation: "Term",
  Unified_Ideograph: "UIdeo",
  Uppercase: "Upper",
  Variation_Selector: "VS",
  White_Space: "space",
  XID_Continue: "XIDC",
  XID_Start: "XIDS"
};
var BINARY_ALIASES_TO_PROP_NAMES = inverseMap(BINARY_PROP_NAMES_TO_ALIASES);
var GENERAL_CATEGORY_VALUE_TO_ALIASES = {
  Cased_Letter: "LC",
  Close_Punctuation: "Pe",
  Connector_Punctuation: "Pc",
  Control: ["Cc", "cntrl"],
  Currency_Symbol: "Sc",
  Dash_Punctuation: "Pd",
  Decimal_Number: ["Nd", "digit"],
  Enclosing_Mark: "Me",
  Final_Punctuation: "Pf",
  Format: "Cf",
  Initial_Punctuation: "Pi",
  Letter: "L",
  Letter_Number: "Nl",
  Line_Separator: "Zl",
  Lowercase_Letter: "Ll",
  Mark: ["M", "Combining_Mark"],
  Math_Symbol: "Sm",
  Modifier_Letter: "Lm",
  Modifier_Symbol: "Sk",
  Nonspacing_Mark: "Mn",
  Number: "N",
  Open_Punctuation: "Ps",
  Other: "C",
  Other_Letter: "Lo",
  Other_Number: "No",
  Other_Punctuation: "Po",
  Other_Symbol: "So",
  Paragraph_Separator: "Zp",
  Private_Use: "Co",
  Punctuation: ["P", "punct"],
  Separator: "Z",
  Space_Separator: "Zs",
  Spacing_Mark: "Mc",
  Surrogate: "Cs",
  Symbol: "S",
  Titlecase_Letter: "Lt",
  Unassigned: "Cn",
  Uppercase_Letter: "Lu"
};
var GENERAL_CATEGORY_VALUE_ALIASES_TO_VALUES = inverseMap(GENERAL_CATEGORY_VALUE_TO_ALIASES);
var SCRIPT_VALUE_TO_ALIASES = {
  Adlam: "Adlm",
  Ahom: "Ahom",
  Anatolian_Hieroglyphs: "Hluw",
  Arabic: "Arab",
  Armenian: "Armn",
  Avestan: "Avst",
  Balinese: "Bali",
  Bamum: "Bamu",
  Bassa_Vah: "Bass",
  Batak: "Batk",
  Bengali: "Beng",
  Bhaiksuki: "Bhks",
  Bopomofo: "Bopo",
  Brahmi: "Brah",
  Braille: "Brai",
  Buginese: "Bugi",
  Buhid: "Buhd",
  Canadian_Aboriginal: "Cans",
  Carian: "Cari",
  Caucasian_Albanian: "Aghb",
  Chakma: "Cakm",
  Cham: "Cham",
  Cherokee: "Cher",
  Common: "Zyyy",
  Coptic: ["Copt", "Qaac"],
  Cuneiform: "Xsux",
  Cypriot: "Cprt",
  Cyrillic: "Cyrl",
  Deseret: "Dsrt",
  Devanagari: "Deva",
  Dogra: "Dogr",
  Duployan: "Dupl",
  Egyptian_Hieroglyphs: "Egyp",
  Elbasan: "Elba",
  Ethiopic: "Ethi",
  Georgian: "Geor",
  Glagolitic: "Glag",
  Gothic: "Goth",
  Grantha: "Gran",
  Greek: "Grek",
  Gujarati: "Gujr",
  Gunjala_Gondi: "Gong",
  Gurmukhi: "Guru",
  Han: "Hani",
  Hangul: "Hang",
  Hanifi_Rohingya: "Rohg",
  Hanunoo: "Hano",
  Hatran: "Hatr",
  Hebrew: "Hebr",
  Hiragana: "Hira",
  Imperial_Aramaic: "Armi",
  Inherited: ["Zinh", "Qaai"],
  Inscriptional_Pahlavi: "Phli",
  Inscriptional_Parthian: "Prti",
  Javanese: "Java",
  Kaithi: "Kthi",
  Kannada: "Knda",
  Katakana: "Kana",
  Kayah_Li: "Kali",
  Kharoshthi: "Khar",
  Khmer: "Khmr",
  Khojki: "Khoj",
  Khudawadi: "Sind",
  Lao: "Laoo",
  Latin: "Latn",
  Lepcha: "Lepc",
  Limbu: "Limb",
  Linear_A: "Lina",
  Linear_B: "Linb",
  Lisu: "Lisu",
  Lycian: "Lyci",
  Lydian: "Lydi",
  Mahajani: "Mahj",
  Makasar: "Maka",
  Malayalam: "Mlym",
  Mandaic: "Mand",
  Manichaean: "Mani",
  Marchen: "Marc",
  Medefaidrin: "Medf",
  Masaram_Gondi: "Gonm",
  Meetei_Mayek: "Mtei",
  Mende_Kikakui: "Mend",
  Meroitic_Cursive: "Merc",
  Meroitic_Hieroglyphs: "Mero",
  Miao: "Plrd",
  Modi: "Modi",
  Mongolian: "Mong",
  Mro: "Mroo",
  Multani: "Mult",
  Myanmar: "Mymr",
  Nabataean: "Nbat",
  New_Tai_Lue: "Talu",
  Newa: "Newa",
  Nko: "Nkoo",
  Nushu: "Nshu",
  Ogham: "Ogam",
  Ol_Chiki: "Olck",
  Old_Hungarian: "Hung",
  Old_Italic: "Ital",
  Old_North_Arabian: "Narb",
  Old_Permic: "Perm",
  Old_Persian: "Xpeo",
  Old_Sogdian: "Sogo",
  Old_South_Arabian: "Sarb",
  Old_Turkic: "Orkh",
  Oriya: "Orya",
  Osage: "Osge",
  Osmanya: "Osma",
  Pahawh_Hmong: "Hmng",
  Palmyrene: "Palm",
  Pau_Cin_Hau: "Pauc",
  Phags_Pa: "Phag",
  Phoenician: "Phnx",
  Psalter_Pahlavi: "Phlp",
  Rejang: "Rjng",
  Runic: "Runr",
  Samaritan: "Samr",
  Saurashtra: "Saur",
  Sharada: "Shrd",
  Shavian: "Shaw",
  Siddham: "Sidd",
  SignWriting: "Sgnw",
  Sinhala: "Sinh",
  Sogdian: "Sogd",
  Sora_Sompeng: "Sora",
  Soyombo: "Soyo",
  Sundanese: "Sund",
  Syloti_Nagri: "Sylo",
  Syriac: "Syrc",
  Tagalog: "Tglg",
  Tagbanwa: "Tagb",
  Tai_Le: "Tale",
  Tai_Tham: "Lana",
  Tai_Viet: "Tavt",
  Takri: "Takr",
  Tamil: "Taml",
  Tangut: "Tang",
  Telugu: "Telu",
  Thaana: "Thaa",
  Thai: "Thai",
  Tibetan: "Tibt",
  Tifinagh: "Tfng",
  Tirhuta: "Tirh",
  Ugaritic: "Ugar",
  Vai: "Vaii",
  Warang_Citi: "Wara",
  Yi: "Yiii",
  Zanabazar_Square: "Zanb"
};
var SCRIPT_VALUE_ALIASES_TO_VALUES = inverseMap(SCRIPT_VALUE_TO_ALIASES);
function inverseMap(data) {
  const inverse = {};
  for (const name of Object.keys(data)) {
    const value = data[name];
    if (Array.isArray(value)) for (let i = 0; i !== value.length; ++i) inverse[value[i]] = name;
    else inverse[value] = name;
  }
  return inverse;
}
var safeStringFromCodePoint$2 = String.fromCodePoint;
var safeStringFromCodePoint$1 = String.fromCodePoint;
var safeStringFromCodePoint = String.fromCodePoint;
var wordChars = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"];
var digitChars = [..."0123456789"];
var spaceChars = [..." 	\r\n\v\f"];
var newLineChars = [..."\r\n"];
var terminatorChars = [...""];
var newLineAndTerminatorChars = [...newLineChars, ...terminatorChars];
var wordCharsSet = new SSet(wordChars);
var digitCharsSet = new SSet(digitChars);
var spaceCharsSet = new SSet(spaceChars);
var terminatorCharsSet = new SSet(terminatorChars);
var newLineAndTerminatorCharsSet = new SSet(newLineAndTerminatorChars);
var safePerformanceNow = typeof performance !== "undefined" ? performance.now.bind(performance) : Date.now.bind(Date);

// src/generators/argument-strategies.ts
var argumentStrategyRegistry = new ExtensionRegistry();
var genericStrategy = {
  matches() {
    return true;
  },
  generate(context) {
    return generateSchemaValue(context.schema, context.seed, 0);
  }
};
argumentStrategyRegistry.register("generic-json-schema", genericStrategy);
function generateToolArguments(toolName, schemaValue, seed, selections) {
  const schema = isRecord7(schemaValue) ? schemaValue : { type: "object", properties: {} };
  if (schema.type !== "object") {
    throw new ScenarioError(`Tool '${toolName}' input schema must describe an object.`);
  }
  const properties = isRecord7(schema.properties) ? schema.properties : {};
  const candidates = selections === void 0 ? argumentStrategyRegistry.names().map((name) => ({
    name,
    enabled: true,
    options: {}
  })) : selections.filter((selection) => selection.enabled);
  const args = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord7(propertySchema)) {
      continue;
    }
    args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
  }
  const required = Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === "string") : [];
  for (const key of required) {
    if (!(key in args)) {
      const propertySchema = properties[key];
      if (!isRecord7(propertySchema)) {
        throw new ScenarioError(`Required argument '${key}' for tool '${toolName}' has no usable schema.`);
      }
      args[key] = generatePropertyValue(toolName, key, propertySchema, seed, candidates);
    }
  }
  return args;
}
function generatePropertyValue(toolName, key, schema, seed, selections) {
  const path = `/properties/${escapePointer(key)}`;
  for (const selection of selections) {
    const strategy = argumentStrategyRegistry.get(selection.name);
    const context = {
      toolName,
      path,
      schema,
      options: selection.options
    };
    if (strategy.matches(context)) {
      return ensureJsonValue(strategy.generate({
        ...context,
        seed: deriveSeed(seed, toolName, path)
      }));
    }
  }
  throw new ScenarioError(`No argument strategy matched '${toolName}${path}'.`);
}
function generateSchemaValue(schema, seed, depth) {
  if (depth > 8) {
    return ensureJsonValue(sample(jsonValue({ maxDepth: 2 }), { seed, numRuns: 1 })[0] ?? null);
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const choices = schema.enum.filter(isJsonValue2);
    return sample2(constantFrom(...choices), seed);
  }
  if ("const" in schema && isJsonValue2(schema.const)) {
    return schema.const;
  }
  for (const keyword of ["anyOf", "oneOf"]) {
    const alternatives = schema[keyword];
    if (Array.isArray(alternatives) && alternatives.some(isRecord7)) {
      const alternativesForSchema = alternatives.filter(isRecord7);
      const selected = sample2(integer({ min: 0, max: alternativesForSchema.length - 1 }), seed);
      return generateSchemaValue(alternativesForSchema[selected] ?? {}, deriveSeed(seed, keyword), depth + 1);
    }
  }
  const types = typeof schema.type === "string" ? [schema.type] : Array.isArray(schema.type) ? schema.type.filter((value) => typeof value === "string") : ["object"];
  const selectedType = sample2(constantFrom(...types), seed);
  switch (selectedType) {
    case "object":
      return generateObject(schema, seed, depth);
    case "array":
      return generateArray(schema, seed, depth);
    case "string":
      return generateString(schema, seed);
    case "integer":
      return generateNumber(schema, seed, true);
    case "number":
      return generateNumber(schema, seed, false);
    case "boolean":
      return sample2(boolean(), seed);
    case "null":
      return null;
    default:
      return ensureJsonValue(sample(jsonValue({ maxDepth: 3 }), { seed, numRuns: 1 })[0] ?? null);
  }
}
function generateObject(schema, seed, depth) {
  const properties = isRecord7(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((key) => typeof key === "string") : []);
  const value = {};
  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    if (!isRecord7(propertySchema)) {
      continue;
    }
    if (required.has(key) || sample2(boolean(), deriveSeed(seed, "include", key))) {
      value[key] = generateSchemaValue(propertySchema, deriveSeed(seed, "property", key), depth + 1);
    }
  }
  return value;
}
function generateArray(schema, seed, depth) {
  const min = integerValue(schema.minItems, 0, 0, 4);
  const max = integerValue(schema.maxItems, Math.max(1, min), min, 4);
  const length = sample2(integer({ min, max }), seed);
  const itemSchema = isRecord7(schema.items) ? schema.items : {};
  return Array.from({ length }, (_, index) => generateSchemaValue(itemSchema, deriveSeed(seed, "item", String(index)), depth + 1));
}
function generateString(schema, seed) {
  const minLength = integerValue(schema.minLength, 0, 0, 32);
  const maxLength = integerValue(schema.maxLength, Math.max(minLength, 16), minLength, 64);
  const pattern = typeof schema.pattern === "string" ? new RegExp(schema.pattern) : void 0;
  let arbitrary = string({ minLength, maxLength });
  if (pattern !== void 0) {
    arbitrary = arbitrary.filter((value) => pattern.test(value));
  }
  return sample2(arbitrary, seed);
}
function generateNumber(schema, seed, integer2) {
  const minimum = finiteNumber(schema.minimum) ?? finiteNumber(schema.exclusiveMinimum) ?? -100;
  const maximum = finiteNumber(schema.maximum) ?? finiteNumber(schema.exclusiveMaximum) ?? 100;
  if (minimum > maximum) {
    throw new ScenarioError("Cannot generate a number from an inverted JSON Schema range.");
  }
  if (integer2) {
    const min = Math.ceil(minimum);
    const max = Math.floor(maximum);
    if (min > max) {
      throw new ScenarioError("Cannot generate an integer from the JSON Schema range.");
    }
    return sample2(integer({ min, max }), seed);
  }
  return sample2(double({ min: minimum, max: maximum, noNaN: true }), seed);
}
function sample2(arbitrary, seed) {
  const value = sample(arbitrary, { seed, numRuns: 1 })[0];
  if (value === void 0) {
    throw new ScenarioError("JSON Schema argument strategy could not produce a value.");
  }
  return value;
}
function ensureJsonValue(value) {
  if (!isJsonValue2(value)) {
    throw new ScenarioError("Argument strategy returned a value that is not JSON-serializable.");
  }
  return value;
}
function isJsonValue2(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue2);
  }
  return isRecord7(value) && Object.values(value).every(isJsonValue2);
}
function isRecord7(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function integerValue(value, fallback, min, max) {
  return typeof value === "number" && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function escapePointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

// src/generators/index.ts
var generatorNames = [
  "schema-valid",
  "schema-mutated",
  "jsonrpc-envelope",
  "raw-json",
  "sequence",
  "tool-args",
  "resources",
  "prompts",
  "wire-fault"
];
var generatorRegistry = new ExtensionRegistry();
function register(name, generator) {
  generatorRegistry.register(name, generator);
}
for (const name of generatorNames) {
  register(name, { generate: (context) => generateByName(name, context) });
}
function generateScenarios(revision, surface, seed, count, names = generatorNames, transport = "stdio", argumentStrategies, startIndex = 0, allowTools) {
  const available = new Set(generatorRegistry.names());
  const selected = names.filter((name) => available.has(name));
  if (selected.length === 0 || count <= 0) {
    return [];
  }
  const scenarios = [];
  for (let offset = 0; scenarios.length < count; offset += 1) {
    const caseIndex = startIndex + offset;
    const name = selected[offset % selected.length];
    if (name === void 0) {
      break;
    }
    const context = {
      seed: deriveSeed(seed, name, String(caseIndex)),
      revision,
      surface,
      caseIndex,
      transport,
      ...argumentStrategies === void 0 ? {} : { argumentStrategies },
      ...allowTools === void 0 ? {} : { allowTools }
    };
    scenarios.push(generatorRegistry.get(name).generate(context));
  }
  return scenarios;
}
function generateByName(name, context) {
  const profile = specProfiles.get(context.revision);
  const id = `seed-${context.seed}-${name}-${context.caseIndex}`;
  let steps;
  switch (name) {
    case "schema-valid": {
      const methods = [profile.toolListMethod, profile.resourceListMethod, profile.promptListMethod];
      const method = sample3(constantFrom(...methods), context.seed);
      steps = requestSteps(profile, method, `${id}-request`);
      break;
    }
    case "schema-mutated": {
      const request = profile.request("tools/list", `${id}-mutated`);
      steps = [
        { type: "send", message: { ...asObject(request), jsonrpc: "1.0" } },
        { type: "await-response", id: `${id}-mutated`, timeoutMs: 250 }
      ];
      break;
    }
    case "jsonrpc-envelope": {
      const invalidId = `${id}-invalid-envelope`;
      steps = [
        {
          type: "send",
          message: { jsonrpc: "1.0", id: invalidId, method: "fixture/invalid-envelope" }
        },
        { type: "await-response", id: invalidId, timeoutMs: 250 },
        {
          type: "send",
          message: { jsonrpc: "2.0", id: `${id}-unknown`, method: "fixture/unknown-method" }
        },
        { type: "await-response", id: `${id}-unknown`, timeoutMs: 250 }
      ];
      break;
    }
    case "raw-json":
      steps = [
        { type: "send-raw", bytesBase64: Buffer.from("{not-json}\n").toString("base64") },
        ...requestSteps(profile, profile.toolListMethod, `${id}-after-raw`)
      ];
      break;
    case "sequence": {
      const first = profile.request(profile.toolListMethod, `${id}-tools`);
      const second = profile.request(profile.resourceListMethod, `${id}-resources`);
      const third = profile.request(profile.promptListMethod, `${id}-prompts`);
      steps = [first, second, third].flatMap((message) => requestSteps(profile, methodOf(message), idOf(message)));
      break;
    }
    case "tool-args":
      steps = toolCallSteps(context, id);
      break;
    case "resources":
      steps = resourceSteps(context, id);
      break;
    case "prompts":
      steps = promptSteps(context, id);
      break;
    case "wire-fault":
      steps = context.transport === "streamable-http" ? httpWireFaultSteps(context, id) : wireFaultSteps(context, id);
      break;
  }
  const bootstrap = context.revision === "2026-07-28" ? [
    { type: "send", message: profile.request("server/discover", `${id}-discover`) },
    { type: "await-response", id: `${id}-discover` }
  ] : [];
  return {
    formatVersion: 1,
    id,
    specRevision: context.revision,
    description: `Generated by ${name}.`,
    steps: [...profile.lifecycleSteps(`${id}-lifecycle`), ...bootstrap, ...steps]
  };
}
function toolCallSteps(context, id) {
  const allowed = new Set(context.allowTools ?? []);
  const tool = pickBySeed(
    context.surface.tools.filter((candidate) => candidate.safety === "read-only" || allowed.has(candidate.name)).sort((left, right) => compareStrings(left.name, right.name)),
    context.seed,
    "tool"
  );
  if (tool === void 0) {
    return requestSteps(specProfiles.get(context.revision), "tools/list", `${id}-tools`);
  }
  const argumentsValue = generateToolArguments(tool.name, tool.inputSchema, context.seed, context.argumentStrategies);
  const profile = specProfiles.get(context.revision);
  return requestSteps(profile, "tools/call", `${id}-call`, { name: tool.name, arguments: argumentsValue });
}
function resourceSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const resource = pickBySeed(
    [...context.surface.resources].sort((left, right) => compareStrings(left.uri, right.uri)),
    context.seed,
    "resource"
  );
  if (resource === void 0) {
    return requestSteps(profile, profile.resourceListMethod, `${id}-resources`);
  }
  return requestSteps(profile, "resources/read", `${id}-read`, { uri: resource.uri });
}
function promptSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const prompt = pickBySeed(
    [...context.surface.prompts].sort((left, right) => compareStrings(left.name, right.name)),
    context.seed,
    "prompt"
  );
  if (prompt === void 0) {
    return requestSteps(profile, profile.promptListMethod, `${id}-prompts`);
  }
  return requestSteps(profile, "prompts/get", `${id}-get`, { name: prompt.name, arguments: {} });
}
function httpWireFaultSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const request = profile.request("tools/list", `${id}-wire`);
  const faults = [
    "missing-accept",
    "missing-content-type",
    "invalid-content-type",
    "missing-protocol-version",
    "mismatched-protocol-version",
    context.revision === "2025-11-25" ? "invalid-session-id" : "wrong-method",
    "truncated-body",
    "oversized-body",
    "abort-response",
    "concurrent-requests"
  ];
  const fault = faults[context.caseIndex % faults.length] ?? faults[0] ?? "missing-accept";
  return [
    {
      type: "send",
      message: request,
      wire: { transport: "streamable-http", fault }
    },
    { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
  ];
}
function wireFaultSteps(context, id) {
  const profile = specProfiles.get(context.revision);
  const request = profile.request("tools/list", `${id}-wire`);
  const bytes = Buffer.from(`${JSON.stringify(request)}
`);
  const text = bytes.toString("utf8");
  switch (context.caseIndex % 10) {
    case 0:
      return [{
        type: "send",
        message: request,
        wire: { transport: "stdio", chunks: [1, 2, 3], delayMs: 500 }
      }, { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }];
    case 1: {
      const second = profile.request("resources/list", `${id}-wire-second`);
      const coalesced = `${text}${JSON.stringify(second)}
`;
      return [
        { type: "send-raw", bytesBase64: Buffer.from(coalesced).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 },
        { type: "await-response", id: `${id}-wire-second`, timeoutMs: 1e3 }
      ];
    }
    case 2:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(JSON.stringify(request)).toString("base64") },
        { type: "transport", operation: "close-stdin" }
      ];
    case 3:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${text}
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 4:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify(request)}\r
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 5:
      return [
        { type: "send-raw", bytesBase64: Buffer.from([255, 10]).toString("base64") },
        ...requestSteps(profile, "tools/list", `${id}-after-binary`)
      ];
    case 6:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`\uFEFF${text}`).toString("base64") },
        ...requestSteps(profile, "tools/list", `${id}-after-bom`)
      ];
    case 7:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(`${JSON.stringify({ ...asObject(request), padding: "x".repeat(7e4) })}
`).toString("base64") },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
    case 8:
      return [
        { type: "send-raw", bytesBase64: Buffer.from(text.slice(0, -2)).toString("base64") },
        { type: "transport", operation: "close-stdin" }
      ];
    default:
      return [
        {
          type: "send",
          message: request,
          wire: { transport: "stdio", chunks: [1], delayMs: 60 }
        },
        { type: "await-response", id: `${id}-wire`, timeoutMs: 1e3 }
      ];
  }
}
function requestSteps(profile, method, id, params) {
  return [
    { type: "send", message: profile.request(method, id, params) },
    { type: "await-response", id, timeoutMs: 1e3 }
  ];
}
function sample3(arbitrary, seed) {
  const value = sample(arbitrary, { seed, numRuns: 1 })[0];
  if (value === void 0) {
    throw new Error("Could not sample a value for a generated scenario.");
  }
  return value;
}
function pickBySeed(items, seed, label) {
  if (items.length <= 1) {
    return items[0];
  }
  return items[deriveSeed(seed, "select", label) % items.length];
}
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function asObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function methodOf(value) {
  const object = asObject(value);
  return typeof object.method === "string" ? object.method : "unknown";
}
function idOf(value) {
  const object = asObject(value);
  return typeof object.id === "string" || typeof object.id === "number" ? object.id : "generated";
}

// src/coverage-feedback/registry.ts
var coverageProviderRegistry = new ExtensionRegistry();

// src/coverage-feedback/go-cover.ts
var import_node_child_process2 = require("child_process");
var import_promises2 = require("fs/promises");
var import_node_os = require("os");
var import_node_path2 = require("path");
var import_node_util = require("util");
var execFileAsync = (0, import_node_util.promisify)(import_node_child_process2.execFile);
var goCoverageProvider = {
  environmentVariable: "GOCOVERDIR",
  async collect(directory) {
    const entries = await (0, import_promises2.readdir)(directory);
    if (!entries.some((name) => name.startsWith("covmeta.")) || !entries.some((name) => name.startsWith("covcounters."))) {
      throw new CoverageError(
        "Go coverage data is missing. Build the target with 'go build -cover' and ensure it exits cleanly."
      );
    }
    const temporaryDirectory = await (0, import_promises2.mkdtemp)((0, import_node_path2.join)((0, import_node_os.tmpdir)(), "mcp-wringer-go-cover-"));
    const profilePath = (0, import_node_path2.join)(temporaryDirectory, "coverage.out");
    try {
      try {
        await execFileAsync("go", ["tool", "covdata", "textfmt", `-i=${directory}`, `-o=${profilePath}`], {
          windowsHide: true,
          maxBuffer: 4 * 1024 * 1024
        });
      } catch (error) {
        throw new CoverageError(
          `Could not read Go coverage data. Build the target with 'go build -cover' and ensure Go is on PATH: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        );
      }
      const profile = await (0, import_promises2.readFile)(profilePath, "utf8");
      const covered = /* @__PURE__ */ new Set();
      for (const line of profile.split(/\r?\n/u)) {
        if (line.length === 0 || line.startsWith("mode:")) {
          continue;
        }
        const match = /^(.+):(\d+)\.(\d+),(\d+)\.(\d+) (\d+) (\d+)$/u.exec(line);
        if (match === null) {
          throw new CoverageError(`Go coverage profile contains an unrecognized entry: '${line}'.`);
        }
        if (Number(match[7]) > 0) {
          covered.add(`${match[1]}:${match[2]}.${match[3]}-${match[4]}.${match[5]}`);
        }
      }
      return covered;
    } finally {
      await (0, import_promises2.rm)(temporaryDirectory, { recursive: true, force: true });
    }
  }
};

// src/coverage-feedback/node-v8.ts
var import_promises3 = require("fs/promises");
var import_node_path3 = require("path");
var nodeV8CoverageProvider = {
  environmentVariable: "NODE_V8_COVERAGE",
  async collect(directory) {
    const files = (await (0, import_promises3.readdir)(directory)).filter((name) => name.endsWith(".json")).sort();
    if (files.length === 0) {
      throw new CoverageError("Node V8 coverage produced no JSON files; ensure the target is a Node process.");
    }
    const covered = /* @__PURE__ */ new Set();
    for (const name of files) {
      const path = (0, import_node_path3.join)(directory, name);
      let document;
      try {
        const value = JSON.parse(await (0, import_promises3.readFile)(path, "utf8"));
        if (!isCoverageDocument(value)) {
          throw new Error("Expected a V8 coverage document with a result array.");
        }
        document = value;
      } catch (error) {
        throw new CoverageError(
          `Could not parse Node V8 coverage file '${path}': ${error instanceof Error ? error.message : String(error)}`,
          { cause: error }
        );
      }
      for (const script of document.result) {
        if (script.url === void 0) {
          continue;
        }
        for (const fn of script.functions ?? []) {
          for (const range of fn.ranges ?? []) {
            if (range.count !== void 0 && range.count > 0 && range.startOffset !== void 0 && range.endOffset !== void 0) {
              covered.add(`${script.url}:${range.startOffset}-${range.endOffset}`);
            }
          }
        }
      }
    }
    return covered;
  }
};
function isCoverageDocument(value) {
  return isRecord8(value) && Array.isArray(value.result) && value.result.every((script) => isRecord8(script) && (script.url === void 0 || typeof script.url === "string") && (script.functions === void 0 || Array.isArray(script.functions) && script.functions.every((fn) => isRecord8(fn) && (fn.ranges === void 0 || Array.isArray(fn.ranges) && fn.ranges.every((range) => isRecord8(range) && isOptionalNonnegativeInteger(range.startOffset) && isOptionalNonnegativeInteger(range.endOffset) && isOptionalNonnegativeInteger(range.count))))));
}
function isRecord8(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isOptionalNonnegativeInteger(value) {
  return value === void 0 || typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

// src/coverage-feedback/index.ts
coverageProviderRegistry.register("go-cover", goCoverageProvider);
coverageProviderRegistry.register("node-v8", nodeV8CoverageProvider);

// src/oracles/registry.ts
var oracleRegistry = new ExtensionRegistry();

// src/oracles/schema-validator.ts
var import__ = __toESM(require__(), 1);

// spec/2025-11-25/schema.json
var schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: {
    Annotations: {
      description: "Optional annotations for the client. The client can use annotations to inform how objects are used or displayed",
      properties: {
        audience: {
          description: 'Describes who the intended audience of this object or data is.\n\nIt can include multiple entries to indicate content useful for multiple audiences (e.g., `["user", "assistant"]`).',
          items: {
            $ref: "#/$defs/Role"
          },
          type: "array"
        },
        lastModified: {
          description: 'The moment the resource was last modified, as an ISO 8601 formatted string.\n\nShould be an ISO 8601 formatted string (e.g., "2025-01-12T15:00:58Z").\n\nExamples: last activity timestamp in an open file, timestamp when the resource\nwas attached, etc.',
          type: "string"
        },
        priority: {
          description: 'Describes how important this data is for operating the server.\n\nA value of 1 means "most important," and indicates that the data is\neffectively required, while 0 means "least important," and indicates that\nthe data is entirely optional.',
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    AudioContent: {
      description: "Audio provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded audio data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the audio. Different providers may support different audio types.",
          type: "string"
        },
        type: {
          const: "audio",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    BaseMetadata: {
      description: "Base interface for metadata with name (identifier) and title (display name) properties.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    BlobResourceContents: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        blob: {
          description: "A base64-encoded string representing the binary data of the item.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "blob",
        "uri"
      ],
      type: "object"
    },
    BooleanSchema: {
      properties: {
        default: {
          type: "boolean"
        },
        description: {
          type: "string"
        },
        title: {
          type: "string"
        },
        type: {
          const: "boolean",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    CallToolRequest: {
      description: "Used by the client to invoke a tool provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/call",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CallToolRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CallToolRequestParams: {
      description: "Parameters for a `tools/call` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        arguments: {
          additionalProperties: {},
          description: "Arguments to use for the tool call.",
          type: "object"
        },
        name: {
          description: "The name of the tool.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    CallToolResult: {
      description: "The server's response to a tool call.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          description: "A list of content objects that represent the unstructured result of the tool call.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool call ended in an error.\n\nIf not set, this is assumed to be false (the call was successful).\n\nAny errors that originate from the tool SHOULD be reported inside the result\nobject, with `isError` set to true, _not_ as an MCP protocol-level error\nresponse. Otherwise, the LLM would not be able to see that an error occurred\nand self-correct.\n\nHowever, any errors in _finding_ the tool, an error indicating that the\nserver does not support tool calls, or any other exceptional conditions,\nshould be reported as an MCP error response.",
          type: "boolean"
        },
        structuredContent: {
          additionalProperties: {},
          description: "An optional JSON object that represents the structured result of the tool call.",
          type: "object"
        }
      },
      required: [
        "content"
      ],
      type: "object"
    },
    CancelTaskRequest: {
      description: "A request to cancel a task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/cancel",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to cancel.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelTaskResult: {
      allOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "The response to a tasks/cancel request."
    },
    CancelledNotification: {
      description: "This notification can be sent by either side to indicate that it is cancelling a previously-issued request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.\n\nA client MUST NOT attempt to cancel its `initialize` request.\n\nFor task cancellation, use the `tasks/cancel` request instead of this notification.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelledNotificationParams: {
      description: "Parameters for a `notifications/cancelled` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        reason: {
          description: "An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.",
          type: "string"
        },
        requestId: {
          $ref: "#/$defs/RequestId",
          description: "The ID of the request to cancel.\n\nThis MUST correspond to the ID of a request previously issued in the same direction.\nThis MUST be provided for cancelling non-task requests.\nThis MUST NOT be used for cancelling tasks (use the `tasks/cancel` request instead)."
        }
      },
      type: "object"
    },
    ClientCapabilities: {
      description: "Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.",
      properties: {
        elicitation: {
          description: "Present if the client supports elicitation from the server.",
          properties: {
            form: {
              additionalProperties: true,
              properties: {},
              type: "object"
            },
            url: {
              additionalProperties: true,
              properties: {},
              type: "object"
            }
          },
          type: "object"
        },
        experimental: {
          additionalProperties: {
            additionalProperties: true,
            properties: {},
            type: "object"
          },
          description: "Experimental, non-standard capabilities that the client supports.",
          type: "object"
        },
        roots: {
          description: "Present if the client supports listing roots.",
          properties: {
            listChanged: {
              description: "Whether the client supports notifications for changes to the roots list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        sampling: {
          description: "Present if the client supports sampling from an LLM.",
          properties: {
            context: {
              additionalProperties: true,
              description: 'Whether the client supports context inclusion via includeContext parameter.\nIf not declared, servers SHOULD only use `includeContext: "none"` (or omit it).',
              properties: {},
              type: "object"
            },
            tools: {
              additionalProperties: true,
              description: "Whether the client supports tool use via tools and toolChoice parameters.",
              properties: {},
              type: "object"
            }
          },
          type: "object"
        },
        tasks: {
          description: "Present if the client supports task-augmented requests.",
          properties: {
            cancel: {
              additionalProperties: true,
              description: "Whether this client supports tasks/cancel.",
              properties: {},
              type: "object"
            },
            list: {
              additionalProperties: true,
              description: "Whether this client supports tasks/list.",
              properties: {},
              type: "object"
            },
            requests: {
              description: "Specifies which request types can be augmented with tasks.",
              properties: {
                elicitation: {
                  description: "Task support for elicitation-related requests.",
                  properties: {
                    create: {
                      additionalProperties: true,
                      description: "Whether the client supports task-augmented elicitation/create requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                },
                sampling: {
                  description: "Task support for sampling-related requests.",
                  properties: {
                    createMessage: {
                      additionalProperties: true,
                      description: "Whether the client supports task-augmented sampling/createMessage requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                }
              },
              type: "object"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ClientNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/InitializedNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/TaskStatusNotification"
        },
        {
          $ref: "#/$defs/RootsListChangedNotification"
        }
      ]
    },
    ClientRequest: {
      anyOf: [
        {
          $ref: "#/$defs/InitializeRequest"
        },
        {
          $ref: "#/$defs/PingRequest"
        },
        {
          $ref: "#/$defs/ListResourcesRequest"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesRequest"
        },
        {
          $ref: "#/$defs/ReadResourceRequest"
        },
        {
          $ref: "#/$defs/SubscribeRequest"
        },
        {
          $ref: "#/$defs/UnsubscribeRequest"
        },
        {
          $ref: "#/$defs/ListPromptsRequest"
        },
        {
          $ref: "#/$defs/GetPromptRequest"
        },
        {
          $ref: "#/$defs/ListToolsRequest"
        },
        {
          $ref: "#/$defs/CallToolRequest"
        },
        {
          $ref: "#/$defs/GetTaskRequest"
        },
        {
          $ref: "#/$defs/GetTaskPayloadRequest"
        },
        {
          $ref: "#/$defs/CancelTaskRequest"
        },
        {
          $ref: "#/$defs/ListTasksRequest"
        },
        {
          $ref: "#/$defs/SetLevelRequest"
        },
        {
          $ref: "#/$defs/CompleteRequest"
        }
      ]
    },
    ClientResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/GetTaskResult",
          description: "The response to a tasks/get request."
        },
        {
          $ref: "#/$defs/GetTaskPayloadResult"
        },
        {
          $ref: "#/$defs/CancelTaskResult",
          description: "The response to a tasks/cancel request."
        },
        {
          $ref: "#/$defs/ListTasksResult"
        },
        {
          $ref: "#/$defs/CreateMessageResult"
        },
        {
          $ref: "#/$defs/ListRootsResult"
        },
        {
          $ref: "#/$defs/ElicitResult"
        }
      ]
    },
    CompleteRequest: {
      description: "A request from the client to the server, to ask for completion options.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "completion/complete",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CompleteRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CompleteRequestParams: {
      description: "Parameters for a `completion/complete` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        argument: {
          description: "The argument's information",
          properties: {
            name: {
              description: "The name of the argument",
              type: "string"
            },
            value: {
              description: "The value of the argument to use for completion matching.",
              type: "string"
            }
          },
          required: [
            "name",
            "value"
          ],
          type: "object"
        },
        context: {
          description: "Additional, optional context for completions",
          properties: {
            arguments: {
              additionalProperties: {
                type: "string"
              },
              description: "Previously-resolved variables in a URI template or prompt.",
              type: "object"
            }
          },
          type: "object"
        },
        ref: {
          anyOf: [
            {
              $ref: "#/$defs/PromptReference"
            },
            {
              $ref: "#/$defs/ResourceTemplateReference"
            }
          ]
        }
      },
      required: [
        "argument",
        "ref"
      ],
      type: "object"
    },
    CompleteResult: {
      description: "The server's response to a completion/complete request",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        completion: {
          properties: {
            hasMore: {
              description: "Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.",
              type: "boolean"
            },
            total: {
              description: "The total number of completion options available. This can exceed the number of values actually sent in the response.",
              type: "integer"
            },
            values: {
              description: "An array of completion values. Must not exceed 100 items.",
              items: {
                type: "string"
              },
              type: "array"
            }
          },
          required: [
            "values"
          ],
          type: "object"
        }
      },
      required: [
        "completion"
      ],
      type: "object"
    },
    ContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ResourceLink"
        },
        {
          $ref: "#/$defs/EmbeddedResource"
        }
      ]
    },
    CreateMessageRequest: {
      description: "A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "sampling/createMessage",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CreateMessageRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CreateMessageRequestParams: {
      description: "Parameters for a `sampling/createMessage` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        includeContext: {
          description: 'A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.\nThe client MAY ignore this request.\n\nDefault is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client\ndeclares ClientCapabilities.sampling.context. These values may be removed in future spec releases.',
          enum: [
            "allServers",
            "none",
            "thisServer"
          ],
          type: "string"
        },
        maxTokens: {
          description: "The requested maximum number of tokens to sample (to prevent runaway completions).\n\nThe client MAY choose to sample fewer tokens than the requested maximum.",
          type: "integer"
        },
        messages: {
          items: {
            $ref: "#/$defs/SamplingMessage"
          },
          type: "array"
        },
        metadata: {
          additionalProperties: true,
          description: "Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.",
          properties: {},
          type: "object"
        },
        modelPreferences: {
          $ref: "#/$defs/ModelPreferences",
          description: "The server's preferences for which model to select. The client MAY ignore these preferences."
        },
        stopSequences: {
          items: {
            type: "string"
          },
          type: "array"
        },
        systemPrompt: {
          description: "An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        },
        temperature: {
          type: "number"
        },
        toolChoice: {
          $ref: "#/$defs/ToolChoice",
          description: 'Controls how the model uses tools.\nThe client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.\nDefault is `{ mode: "auto" }`.'
        },
        tools: {
          description: "Tools that the model may use during generation.\nThe client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.",
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "maxTokens",
        "messages"
      ],
      type: "object"
    },
    CreateMessageResult: {
      description: "The client's response to a sampling/createMessage request from the server.\nThe client should inform the user before returning the sampled message, to allow them\nto inspect the response (human in the loop) and decide whether to allow the server to see it.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        model: {
          description: "The name of the model that generated the message.",
          type: "string"
        },
        role: {
          $ref: "#/$defs/Role"
        },
        stopReason: {
          description: `The reason why sampling stopped, if known.

Standard values:
- "endTurn": Natural end of the assistant's turn
- "stopSequence": A stop sequence was encountered
- "maxTokens": Maximum token limit was reached
- "toolUse": The model wants to use one or more tools

This field is an open string to allow for provider-specific stop reasons.`,
          type: "string"
        }
      },
      required: [
        "content",
        "model",
        "role"
      ],
      type: "object"
    },
    CreateTaskResult: {
      description: "A response to a task-augmented request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        task: {
          $ref: "#/$defs/Task"
        }
      },
      required: [
        "task"
      ],
      type: "object"
    },
    Cursor: {
      description: "An opaque token used to represent a cursor for pagination.",
      type: "string"
    },
    ElicitRequest: {
      description: "A request from the server to elicit additional information from the user via the client.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "elicitation/create",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ElicitRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ElicitRequestFormParams: {
      description: "The parameters for a request to elicit non-sensitive information from the user via a form in the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        message: {
          description: "The message to present to the user describing what information is being requested.",
          type: "string"
        },
        mode: {
          const: "form",
          description: "The elicitation mode.",
          type: "string"
        },
        requestedSchema: {
          description: "A restricted subset of JSON Schema.\nOnly top-level properties are allowed, without nesting.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                $ref: "#/$defs/PrimitiveSchemaDefinition"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "properties",
            "type"
          ],
          type: "object"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      required: [
        "message",
        "requestedSchema"
      ],
      type: "object"
    },
    ElicitRequestParams: {
      anyOf: [
        {
          $ref: "#/$defs/ElicitRequestURLParams"
        },
        {
          $ref: "#/$defs/ElicitRequestFormParams"
        }
      ],
      description: "The parameters for a request to elicit additional information from the user via the client."
    },
    ElicitRequestURLParams: {
      description: "The parameters for a request to elicit information from the user via a URL in the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        elicitationId: {
          description: "The ID of the elicitation, which must be unique within the context of the server.\nThe client MUST treat this ID as an opaque value.",
          type: "string"
        },
        message: {
          description: "The message to present to the user explaining why the interaction is needed.",
          type: "string"
        },
        mode: {
          const: "url",
          description: "The elicitation mode.",
          type: "string"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        },
        url: {
          description: "The URL that the user should navigate to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "elicitationId",
        "message",
        "mode",
        "url"
      ],
      type: "object"
    },
    ElicitResult: {
      description: "The client's response to an elicitation request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        action: {
          description: 'The user action in response to the elicitation.\n- "accept": User submitted the form/confirmed the action\n- "decline": User explicitly decline the action\n- "cancel": User dismissed without making an explicit choice',
          enum: [
            "accept",
            "cancel",
            "decline"
          ],
          type: "string"
        },
        content: {
          additionalProperties: {
            anyOf: [
              {
                items: {
                  type: "string"
                },
                type: "array"
              },
              {
                type: [
                  "string",
                  "integer",
                  "boolean"
                ]
              }
            ]
          },
          description: 'The submitted form data, only present when action is "accept" and mode was "form".\nContains values matching the requested schema.\nOmitted for out-of-band mode responses.',
          type: "object"
        }
      },
      required: [
        "action"
      ],
      type: "object"
    },
    ElicitationCompleteNotification: {
      description: "An optional notification from the server to the client, informing it of a completion of a out-of-band elicitation request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/elicitation/complete",
          type: "string"
        },
        params: {
          properties: {
            elicitationId: {
              description: "The ID of the elicitation that completed.",
              type: "string"
            }
          },
          required: [
            "elicitationId"
          ],
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    EmbeddedResource: {
      description: "The contents of a resource, embedded into a prompt or tool call result.\n\nIt is up to the client how best to render embedded resources for the benefit\nof the LLM and/or the user.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        resource: {
          anyOf: [
            {
              $ref: "#/$defs/TextResourceContents"
            },
            {
              $ref: "#/$defs/BlobResourceContents"
            }
          ]
        },
        type: {
          const: "resource",
          type: "string"
        }
      },
      required: [
        "resource",
        "type"
      ],
      type: "object"
    },
    EmptyResult: {
      $ref: "#/$defs/Result"
    },
    EnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ]
    },
    Error: {
      properties: {
        code: {
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    GetPromptRequest: {
      description: "Used by the client to get a prompt provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/get",
          type: "string"
        },
        params: {
          $ref: "#/$defs/GetPromptRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetPromptRequestParams: {
      description: "Parameters for a `prompts/get` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        arguments: {
          additionalProperties: {
            type: "string"
          },
          description: "Arguments to use for templating the prompt.",
          type: "object"
        },
        name: {
          description: "The name of the prompt or prompt template.",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    GetPromptResult: {
      description: "The server's response to a prompts/get request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        description: {
          description: "An optional description for the prompt.",
          type: "string"
        },
        messages: {
          items: {
            $ref: "#/$defs/PromptMessage"
          },
          type: "array"
        }
      },
      required: [
        "messages"
      ],
      type: "object"
    },
    GetTaskPayloadRequest: {
      description: "A request to retrieve the result of a completed task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/result",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to retrieve results for.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetTaskPayloadResult: {
      additionalProperties: {},
      description: "The response to a tasks/result request.\nThe structure matches the result type of the original request.\nFor example, a tools/call task would return the CallToolResult structure.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    GetTaskRequest: {
      description: "A request to retrieve the state of a task.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/get",
          type: "string"
        },
        params: {
          properties: {
            taskId: {
              description: "The task identifier to query.",
              type: "string"
            }
          },
          required: [
            "taskId"
          ],
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetTaskResult: {
      allOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "The response to a tasks/get request."
    },
    Icon: {
      description: "An optionally-sized icon that can be displayed in a user interface.",
      properties: {
        mimeType: {
          description: 'Optional MIME type override if the source MIME type is missing or generic.\nFor example: `"image/png"`, `"image/jpeg"`, or `"image/svg+xml"`.',
          type: "string"
        },
        sizes: {
          description: 'Optional array of strings that specify sizes at which the icon can be used.\nEach string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.\n\nIf not provided, the client should assume that the icon can be used at any size.',
          items: {
            type: "string"
          },
          type: "array"
        },
        src: {
          description: "A standard URI pointing to an icon resource. May be an HTTP/HTTPS URL or a\n`data:` URI with Base64-encoded image data.\n\nConsumers SHOULD takes steps to ensure URLs serving icons are from the\nsame domain as the client/server or a trusted domain.\n\nConsumers SHOULD take appropriate precautions when consuming SVGs as they can contain\nexecutable JavaScript.",
          format: "uri",
          type: "string"
        },
        theme: {
          description: "Optional specifier for the theme this icon is designed for. `light` indicates\nthe icon is designed to be used with a light background, and `dark` indicates\nthe icon is designed to be used with a dark background.\n\nIf not provided, the client should assume the icon can be used with any theme.",
          enum: [
            "dark",
            "light"
          ],
          type: "string"
        }
      },
      required: [
        "src"
      ],
      type: "object"
    },
    Icons: {
      description: "Base interface to add `icons` property.",
      properties: {
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        }
      },
      type: "object"
    },
    ImageContent: {
      description: "An image provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded image data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the image. Different providers may support different image types.",
          type: "string"
        },
        type: {
          const: "image",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    Implementation: {
      description: "Describes the MCP implementation.",
      properties: {
        description: {
          description: "An optional human-readable description of what this implementation does.\n\nThis can be used by clients or servers to provide context about their purpose\nand capabilities. For example, a server might describe the types of resources\nor tools it provides, while a client might describe its intended use case.",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        version: {
          type: "string"
        },
        websiteUrl: {
          description: "An optional URL of the website for this implementation.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "version"
      ],
      type: "object"
    },
    InitializeRequest: {
      description: "This request is sent from the client to the server when it first connects, asking it to begin initialization.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "initialize",
          type: "string"
        },
        params: {
          $ref: "#/$defs/InitializeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    InitializeRequestParams: {
      description: "Parameters for an `initialize` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        capabilities: {
          $ref: "#/$defs/ClientCapabilities"
        },
        clientInfo: {
          $ref: "#/$defs/Implementation"
        },
        protocolVersion: {
          description: "The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.",
          type: "string"
        }
      },
      required: [
        "capabilities",
        "clientInfo",
        "protocolVersion"
      ],
      type: "object"
    },
    InitializeResult: {
      description: "After receiving an initialize request from the client, the server sends this response.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        capabilities: {
          $ref: "#/$defs/ServerCapabilities"
        },
        instructions: {
          description: `Instructions describing how to use the server and its features.

This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.`,
          type: "string"
        },
        protocolVersion: {
          description: "The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.",
          type: "string"
        },
        serverInfo: {
          $ref: "#/$defs/Implementation"
        }
      },
      required: [
        "capabilities",
        "protocolVersion",
        "serverInfo"
      ],
      type: "object"
    },
    InitializedNotification: {
      description: "This notification is sent from the client to the server after initialization has finished.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/initialized",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCErrorResponse: {
      description: "A response to a request that indicates an error occurred.",
      properties: {
        error: {
          $ref: "#/$defs/Error"
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    JSONRPCMessage: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCRequest"
        },
        {
          $ref: "#/$defs/JSONRPCNotification"
        },
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "Refers to any valid JSON-RPC object that can be decoded off the wire, or encoded to be sent."
    },
    JSONRPCNotification: {
      description: "A notification which does not expect a response.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCRequest: {
      description: "A request that expects a response.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCResponse: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "A response to a request, containing either the result or error."
    },
    JSONRPCResultResponse: {
      description: "A successful (non-error) response to a request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/Result"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    LegacyTitledEnumSchema: {
      description: "Use TitledSingleSelectEnumSchema instead.\nThis interface will be removed in a future version.",
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        enum: {
          items: {
            type: "string"
          },
          type: "array"
        },
        enumNames: {
          description: "(Legacy) Display names for enum values.\nNon-standard according to JSON schema 2020-12.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    },
    ListPromptsRequest: {
      description: "Sent from the client to request a list of prompts and prompt templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListPromptsResult: {
      description: "The server's response to a prompts/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        prompts: {
          items: {
            $ref: "#/$defs/Prompt"
          },
          type: "array"
        }
      },
      required: [
        "prompts"
      ],
      type: "object"
    },
    ListResourceTemplatesRequest: {
      description: "Sent from the client to request a list of resource templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/templates/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListResourceTemplatesResult: {
      description: "The server's response to a resources/templates/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resourceTemplates: {
          items: {
            $ref: "#/$defs/ResourceTemplate"
          },
          type: "array"
        }
      },
      required: [
        "resourceTemplates"
      ],
      type: "object"
    },
    ListResourcesRequest: {
      description: "Sent from the client to request a list of resources the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListResourcesResult: {
      description: "The server's response to a resources/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resources: {
          items: {
            $ref: "#/$defs/Resource"
          },
          type: "array"
        }
      },
      required: [
        "resources"
      ],
      type: "object"
    },
    ListRootsRequest: {
      description: "Sent from the server to request a list of root URIs from the client. Roots allow\nservers to ask for specific directories or files to operate on. A common example\nfor roots is providing a set of repositories or directories a server should operate\non.\n\nThis request is typically used when the server needs to understand the file system\nstructure or access specific locations that the client has permission to read from.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "roots/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListRootsResult: {
      description: "The client's response to a roots/list request from the server.\nThis result contains an array of Root objects, each representing a root directory\nor file that the server can operate on.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        roots: {
          items: {
            $ref: "#/$defs/Root"
          },
          type: "array"
        }
      },
      required: [
        "roots"
      ],
      type: "object"
    },
    ListTasksRequest: {
      description: "A request to retrieve a list of tasks.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tasks/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListTasksResult: {
      description: "The response to a tasks/list request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        tasks: {
          items: {
            $ref: "#/$defs/Task"
          },
          type: "array"
        }
      },
      required: [
        "tasks"
      ],
      type: "object"
    },
    ListToolsRequest: {
      description: "Sent from the client to request a list of tools the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ListToolsResult: {
      description: "The server's response to a tools/list request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        tools: {
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "tools"
      ],
      type: "object"
    },
    LoggingLevel: {
      description: "The severity of a log message.\n\nThese map to syslog message severities, as specified in RFC-5424:\nhttps://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1",
      enum: [
        "alert",
        "critical",
        "debug",
        "emergency",
        "error",
        "info",
        "notice",
        "warning"
      ],
      type: "string"
    },
    LoggingMessageNotification: {
      description: "JSONRPCNotification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/message",
          type: "string"
        },
        params: {
          $ref: "#/$defs/LoggingMessageNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    LoggingMessageNotificationParams: {
      description: "Parameters for a `notifications/message` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        data: {
          description: "The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here."
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The severity of this log message."
        },
        logger: {
          description: "An optional name of the logger issuing this message.",
          type: "string"
        }
      },
      required: [
        "data",
        "level"
      ],
      type: "object"
    },
    ModelHint: {
      description: "Hints to use for model selection.\n\nKeys not declared here are currently left unspecified by the spec and are up\nto the client to interpret.",
      properties: {
        name: {
          description: "A hint for a model name.\n\nThe client SHOULD treat this as a substring of a model name; for example:\n - `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`\n - `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.\n - `claude` should match any Claude model\n\nThe client MAY also map the string to a different provider's model name or a different model family, as long as it fills a similar niche; for example:\n - `gemini-1.5-flash` could match `claude-3-haiku-20240307`",
          type: "string"
        }
      },
      type: "object"
    },
    ModelPreferences: {
      description: `The server's preferences for model selection, requested of the client during sampling.

Because LLMs can vary along multiple dimensions, choosing the "best" model is
rarely straightforward.  Different models excel in different areas\u2014some are
faster but less capable, others are more capable but more expensive, and so
on. This interface allows servers to express their priorities across multiple
dimensions to help clients make an appropriate selection for their use case.

These preferences are always advisory. The client MAY ignore them. It is also
up to the client to decide how to interpret these preferences and how to
balance them against other considerations.`,
      properties: {
        costPriority: {
          description: "How much to prioritize cost when selecting a model. A value of 0 means cost\nis not important, while a value of 1 means cost is the most important\nfactor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        hints: {
          description: "Optional hints to use for model selection.\n\nIf multiple hints are specified, the client MUST evaluate them in order\n(such that the first match is taken).\n\nThe client SHOULD prioritize these hints over the numeric priorities, but\nMAY still use the priorities to select from ambiguous matches.",
          items: {
            $ref: "#/$defs/ModelHint"
          },
          type: "array"
        },
        intelligencePriority: {
          description: "How much to prioritize intelligence and capabilities when selecting a\nmodel. A value of 0 means intelligence is not important, while a value of 1\nmeans intelligence is the most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        speedPriority: {
          description: "How much to prioritize sampling speed (latency) when selecting a model. A\nvalue of 0 means speed is not important, while a value of 1 means speed is\nthe most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    MultiSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        }
      ]
    },
    Notification: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    NotificationParams: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    NumberSchema: {
      properties: {
        default: {
          type: "number"
        },
        description: {
          type: "string"
        },
        maximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        title: {
          type: "string"
        },
        type: {
          enum: [
            "integer",
            "number"
          ],
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    PaginatedRequest: {
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PaginatedRequestParams: {
      description: "Common parameters for paginated requests.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        cursor: {
          description: "An opaque token representing the current pagination position.\nIf provided, the server should return results starting after this cursor.",
          type: "string"
        }
      },
      type: "object"
    },
    PaginatedResult: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        }
      },
      type: "object"
    },
    PingRequest: {
      description: "A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "ping",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PrimitiveSchemaDefinition: {
      anyOf: [
        {
          $ref: "#/$defs/StringSchema"
        },
        {
          $ref: "#/$defs/NumberSchema"
        },
        {
          $ref: "#/$defs/BooleanSchema"
        },
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ],
      description: "Restricted schema definitions that only allow primitive types\nwithout nested objects or arrays."
    },
    ProgressNotification: {
      description: "An out-of-band notification used to inform the receiver of a progress update for a long-running request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/progress",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ProgressNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ProgressNotificationParams: {
      description: "Parameters for a `notifications/progress` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        message: {
          description: "An optional message describing the current progress.",
          type: "string"
        },
        progress: {
          description: "The progress thus far. This should increase every time progress is made, even if the total is unknown.",
          type: "number"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "The progress token which was given in the initial request, used to associate this notification with the request that is proceeding."
        },
        total: {
          description: "Total number of items to process (or total progress required), if known.",
          type: "number"
        }
      },
      required: [
        "progress",
        "progressToken"
      ],
      type: "object"
    },
    ProgressToken: {
      description: "A progress token, used to associate progress notifications with the original request.",
      type: [
        "string",
        "integer"
      ]
    },
    Prompt: {
      description: "A prompt or prompt template that the server offers.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        arguments: {
          description: "A list of arguments to use for templating the prompt.",
          items: {
            $ref: "#/$defs/PromptArgument"
          },
          type: "array"
        },
        description: {
          description: "An optional description of what this prompt provides",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptArgument: {
      description: "Describes an argument that a prompt can accept.",
      properties: {
        description: {
          description: "A human-readable description of the argument.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        required: {
          description: "Whether this argument must be provided.",
          type: "boolean"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/prompts/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PromptMessage: {
      description: "Describes a message returned as part of a prompt.\n\nThis is similar to `SamplingMessage`, but also supports the embedding of\nresources from the MCP server.",
      properties: {
        content: {
          $ref: "#/$defs/ContentBlock"
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    PromptReference: {
      description: "Identifies a prompt.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "ref/prompt",
          type: "string"
        }
      },
      required: [
        "name",
        "type"
      ],
      type: "object"
    },
    ReadResourceRequest: {
      description: "Sent from the client to the server, to read a specific resource URI.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/read",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ReadResourceRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ReadResourceRequestParams: {
      description: "Parameters for a `resources/read` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ReadResourceResult: {
      description: "The server's response to a resources/read request from the client.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        contents: {
          items: {
            anyOf: [
              {
                $ref: "#/$defs/TextResourceContents"
              },
              {
                $ref: "#/$defs/BlobResourceContents"
              }
            ]
          },
          type: "array"
        }
      },
      required: [
        "contents"
      ],
      type: "object"
    },
    RelatedTaskMetadata: {
      description: "Metadata for associating messages with a task.\nInclude this in the `_meta` field under the key `io.modelcontextprotocol/related-task`.",
      properties: {
        taskId: {
          description: "The task identifier this message is associated with.",
          type: "string"
        }
      },
      required: [
        "taskId"
      ],
      type: "object"
    },
    Request: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    RequestId: {
      description: "A uniquely identifying ID for a request in JSON-RPC.",
      type: [
        "string",
        "integer"
      ]
    },
    RequestParams: {
      description: "Common params for any request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    Resource: {
      description: "A known resource that the server is capable of reading.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "uri"
      ],
      type: "object"
    },
    ResourceContents: {
      description: "The contents of a specific resource or sub-resource.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceLink: {
      description: "A resource that the server is capable of reading, included in a prompt or tool call result.\n\nNote: resource links returned by tools are not guaranteed to appear in the results of `resources/list` requests.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "resource_link",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ResourceRequestParams: {
      description: "Common parameters when working with resources.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceTemplate: {
      description: "A template description for resources available on the server.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this template is for.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uriTemplate: {
          description: "A URI template (according to RFC 6570) that can be used to construct resource URIs.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "name",
        "uriTemplate"
      ],
      type: "object"
    },
    ResourceTemplateReference: {
      description: "A reference to a resource or resource template definition.",
      properties: {
        type: {
          const: "ref/resource",
          type: "string"
        },
        uri: {
          description: "The URI or URI template of the resource.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceUpdatedNotification: {
      description: "A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/updated",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ResourceUpdatedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ResourceUpdatedNotificationParams: {
      description: "Parameters for a `notifications/resources/updated` notification.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        uri: {
          description: "The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Result: {
      additionalProperties: {},
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        }
      },
      type: "object"
    },
    Role: {
      description: "The sender or recipient of messages and data in a conversation.",
      enum: [
        "assistant",
        "user"
      ],
      type: "string"
    },
    Root: {
      description: "Represents a root directory or file that the server can operate on.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        name: {
          description: "An optional name for the root. This can be used to provide a human-readable\nidentifier for the root, which may be useful for display purposes or for\nreferencing the root in other parts of the application.",
          type: "string"
        },
        uri: {
          description: "The URI identifying the root. This *must* start with file:// for now.\nThis restriction may be relaxed in future versions of the protocol to allow\nother URI schemes.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    RootsListChangedNotification: {
      description: "A notification from the client to the server, informing it that the list of roots has changed.\nThis notification should be sent whenever the client adds, removes, or modifies any root.\nThe server should then request an updated list of roots using the ListRootsRequest.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/roots/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    SamplingMessage: {
      description: "Describes a message issued to or received from an LLM API.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    SamplingMessageContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ToolUseContent"
        },
        {
          $ref: "#/$defs/ToolResultContent"
        }
      ]
    },
    ServerCapabilities: {
      description: "Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.",
      properties: {
        completions: {
          additionalProperties: true,
          description: "Present if the server supports argument autocompletion suggestions.",
          properties: {},
          type: "object"
        },
        experimental: {
          additionalProperties: {
            additionalProperties: true,
            properties: {},
            type: "object"
          },
          description: "Experimental, non-standard capabilities that the server supports.",
          type: "object"
        },
        logging: {
          additionalProperties: true,
          description: "Present if the server supports sending log messages to the client.",
          properties: {},
          type: "object"
        },
        prompts: {
          description: "Present if the server offers any prompt templates.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the prompt list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        resources: {
          description: "Present if the server offers any resources to read.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the resource list.",
              type: "boolean"
            },
            subscribe: {
              description: "Whether this server supports subscribing to resource updates.",
              type: "boolean"
            }
          },
          type: "object"
        },
        tasks: {
          description: "Present if the server supports task-augmented requests.",
          properties: {
            cancel: {
              additionalProperties: true,
              description: "Whether this server supports tasks/cancel.",
              properties: {},
              type: "object"
            },
            list: {
              additionalProperties: true,
              description: "Whether this server supports tasks/list.",
              properties: {},
              type: "object"
            },
            requests: {
              description: "Specifies which request types can be augmented with tasks.",
              properties: {
                tools: {
                  description: "Task support for tool-related requests.",
                  properties: {
                    call: {
                      additionalProperties: true,
                      description: "Whether the server supports task-augmented tools/call requests.",
                      properties: {},
                      type: "object"
                    }
                  },
                  type: "object"
                }
              },
              type: "object"
            }
          },
          type: "object"
        },
        tools: {
          description: "Present if the server offers any tools to call.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the tool list.",
              type: "boolean"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ServerNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/ResourceListChangedNotification"
        },
        {
          $ref: "#/$defs/ResourceUpdatedNotification"
        },
        {
          $ref: "#/$defs/PromptListChangedNotification"
        },
        {
          $ref: "#/$defs/ToolListChangedNotification"
        },
        {
          $ref: "#/$defs/TaskStatusNotification"
        },
        {
          $ref: "#/$defs/LoggingMessageNotification"
        },
        {
          $ref: "#/$defs/ElicitationCompleteNotification"
        }
      ]
    },
    ServerRequest: {
      anyOf: [
        {
          $ref: "#/$defs/PingRequest"
        },
        {
          $ref: "#/$defs/GetTaskRequest"
        },
        {
          $ref: "#/$defs/GetTaskPayloadRequest"
        },
        {
          $ref: "#/$defs/CancelTaskRequest"
        },
        {
          $ref: "#/$defs/ListTasksRequest"
        },
        {
          $ref: "#/$defs/CreateMessageRequest"
        },
        {
          $ref: "#/$defs/ListRootsRequest"
        },
        {
          $ref: "#/$defs/ElicitRequest"
        }
      ]
    },
    ServerResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/InitializeResult"
        },
        {
          $ref: "#/$defs/ListResourcesResult"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesResult"
        },
        {
          $ref: "#/$defs/ReadResourceResult"
        },
        {
          $ref: "#/$defs/ListPromptsResult"
        },
        {
          $ref: "#/$defs/GetPromptResult"
        },
        {
          $ref: "#/$defs/ListToolsResult"
        },
        {
          $ref: "#/$defs/CallToolResult"
        },
        {
          $ref: "#/$defs/GetTaskResult",
          description: "The response to a tasks/get request."
        },
        {
          $ref: "#/$defs/GetTaskPayloadResult"
        },
        {
          $ref: "#/$defs/CancelTaskResult",
          description: "The response to a tasks/cancel request."
        },
        {
          $ref: "#/$defs/ListTasksResult"
        },
        {
          $ref: "#/$defs/CompleteResult"
        }
      ]
    },
    SetLevelRequest: {
      description: "A request from the client to the server, to enable or adjust logging.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "logging/setLevel",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SetLevelRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SetLevelRequestParams: {
      description: "Parameters for a `logging/setLevel` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/message."
        }
      },
      required: [
        "level"
      ],
      type: "object"
    },
    SingleSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        }
      ]
    },
    StringSchema: {
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        format: {
          enum: [
            "date",
            "date-time",
            "email",
            "uri"
          ],
          type: "string"
        },
        maxLength: {
          type: "integer"
        },
        minLength: {
          type: "integer"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    SubscribeRequest: {
      description: "Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/subscribe",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscribeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscribeRequestParams: {
      description: "Parameters for a `resources/subscribe` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Task: {
      description: "Data associated with a task.",
      properties: {
        createdAt: {
          description: "ISO 8601 timestamp when the task was created.",
          type: "string"
        },
        lastUpdatedAt: {
          description: "ISO 8601 timestamp when the task was last updated.",
          type: "string"
        },
        pollInterval: {
          description: "Suggested polling interval in milliseconds.",
          type: "integer"
        },
        status: {
          $ref: "#/$defs/TaskStatus",
          description: "Current task state."
        },
        statusMessage: {
          description: 'Optional human-readable message describing the current task state.\nThis can provide context for any status, including:\n- Reasons for "cancelled" status\n- Summaries for "completed" status\n- Diagnostic information for "failed" status (e.g., error details, what went wrong)',
          type: "string"
        },
        taskId: {
          description: "The task identifier.",
          type: "string"
        },
        ttl: {
          description: "Actual retention duration from creation in milliseconds, null for unlimited.",
          type: [
            "integer",
            "null"
          ]
        }
      },
      required: [
        "createdAt",
        "lastUpdatedAt",
        "status",
        "taskId",
        "ttl"
      ],
      type: "object"
    },
    TaskAugmentedRequestParams: {
      description: "Common params for any task-augmented request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        task: {
          $ref: "#/$defs/TaskMetadata",
          description: "If specified, the caller is requesting task-augmented execution for this request.\nThe request will return a CreateTaskResult immediately, and the actual result can be\nretrieved later via tasks/result.\n\nTask augmentation is subject to capability negotiation - receivers MUST declare support\nfor task augmentation of specific request types in their capabilities."
        }
      },
      type: "object"
    },
    TaskMetadata: {
      description: "Metadata for augmenting a request with task execution.\nInclude this in the `task` field of the request parameters.",
      properties: {
        ttl: {
          description: "Requested duration in milliseconds to retain task from creation.",
          type: "integer"
        }
      },
      type: "object"
    },
    TaskStatus: {
      description: "The status of a task.",
      enum: [
        "cancelled",
        "completed",
        "failed",
        "input_required",
        "working"
      ],
      type: "string"
    },
    TaskStatusNotification: {
      description: "An optional notification from the receiver to the requestor, informing them that a task's status has changed. Receivers are not required to send these notifications.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tasks/status",
          type: "string"
        },
        params: {
          $ref: "#/$defs/TaskStatusNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    TaskStatusNotificationParams: {
      allOf: [
        {
          $ref: "#/$defs/NotificationParams"
        },
        {
          $ref: "#/$defs/Task"
        }
      ],
      description: "Parameters for a `notifications/tasks/status` notification."
    },
    TextContent: {
      description: "Text provided to or from an LLM.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        text: {
          description: "The text content of the message.",
          type: "string"
        },
        type: {
          const: "text",
          type: "string"
        }
      },
      required: [
        "text",
        "type"
      ],
      type: "object"
    },
    TextResourceContents: {
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        text: {
          description: "The text of the item. This must only be set if the item can actually be represented as text (not binary data).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "text",
        "uri"
      ],
      type: "object"
    },
    TitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for array items with enum options and display labels.",
          properties: {
            anyOf: {
              description: "Array of enum options with values and display labels.",
              items: {
                properties: {
                  const: {
                    description: "The constant enum value.",
                    type: "string"
                  },
                  title: {
                    description: "Display title for this option.",
                    type: "string"
                  }
                },
                required: [
                  "const",
                  "title"
                ],
                type: "object"
              },
              type: "array"
            }
          },
          required: [
            "anyOf"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    TitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        oneOf: {
          description: "Array of enum options with values and display labels.",
          items: {
            properties: {
              const: {
                description: "The enum value.",
                type: "string"
              },
              title: {
                description: "Display label for this option.",
                type: "string"
              }
            },
            required: [
              "const",
              "title"
            ],
            type: "object"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "oneOf",
        "type"
      ],
      type: "object"
    },
    Tool: {
      description: "Definition for a tool the client can call.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        annotations: {
          $ref: "#/$defs/ToolAnnotations",
          description: "Optional additional tool information.\n\nDisplay name precedence order is: title, annotations.title, then name."
        },
        description: {
          description: `A human-readable description of the tool.

This can be used by clients to improve the LLM's understanding of available tools. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        execution: {
          $ref: "#/$defs/ToolExecution",
          description: "Execution-related properties for this tool."
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        inputSchema: {
          description: "A JSON Schema object defining the expected parameters for the tool.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                additionalProperties: true,
                properties: {},
                type: "object"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        outputSchema: {
          description: `An optional JSON Schema object defining the structure of the tool's output returned in
the structuredContent field of a CallToolResult.

Defaults to JSON Schema 2020-12 when no explicit $schema is provided.
Currently restricted to type: "object" at the root level.`,
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                additionalProperties: true,
                properties: {},
                type: "object"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for Tool,\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "inputSchema",
        "name"
      ],
      type: "object"
    },
    ToolAnnotations: {
      description: "Additional properties describing a Tool to clients.\n\nNOTE: all properties in ToolAnnotations are **hints**.\nThey are not guaranteed to provide a faithful description of\ntool behavior (including descriptive properties like `title`).\n\nClients should never make tool use decisions based on ToolAnnotations\nreceived from untrusted servers.",
      properties: {
        destructiveHint: {
          description: "If true, the tool may perform destructive updates to its environment.\nIf false, the tool performs only additive updates.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: true",
          type: "boolean"
        },
        idempotentHint: {
          description: "If true, calling the tool repeatedly with the same arguments\nwill have no additional effect on its environment.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: false",
          type: "boolean"
        },
        openWorldHint: {
          description: `If true, this tool may interact with an "open world" of external
entities. If false, the tool's domain of interaction is closed.
For example, the world of a web search tool is open, whereas that
of a memory tool is not.

Default: true`,
          type: "boolean"
        },
        readOnlyHint: {
          description: "If true, the tool does not modify its environment.\n\nDefault: false",
          type: "boolean"
        },
        title: {
          description: "A human-readable title for the tool.",
          type: "string"
        }
      },
      type: "object"
    },
    ToolChoice: {
      description: "Controls tool selection behavior for sampling requests.",
      properties: {
        mode: {
          description: 'Controls the tool use ability of the model:\n- "auto": Model decides whether to use tools (default)\n- "required": Model MUST use at least one tool before completing\n- "none": Model MUST NOT use any tools',
          enum: [
            "auto",
            "none",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolExecution: {
      description: "Execution-related properties for a tool.",
      properties: {
        taskSupport: {
          description: 'Indicates whether this tool supports task-augmented execution.\nThis allows clients to handle long-running operations through polling\nthe task system.\n\n- "forbidden": Tool does not support task-augmented execution (default when absent)\n- "optional": Tool may support task-augmented execution\n- "required": Tool requires task-augmented execution\n\nDefault: "forbidden"',
          enum: [
            "forbidden",
            "optional",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tools/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ToolResultContent: {
      description: "The result of a tool use, provided by the user back to the assistant.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "Optional metadata about the tool result. Clients SHOULD preserve this field when\nincluding tool results in subsequent sampling requests to enable caching optimizations.\n\nSee [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        content: {
          description: "The unstructured result content of the tool use.\n\nThis has the same format as CallToolResult.content and can include text, images,\naudio, resource links, and embedded resources.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool use resulted in an error.\n\nIf true, the content typically describes the error that occurred.\nDefault: false",
          type: "boolean"
        },
        structuredContent: {
          additionalProperties: {},
          description: "An optional structured result object.\n\nIf the tool defined an outputSchema, this SHOULD conform to that schema.",
          type: "object"
        },
        toolUseId: {
          description: "The ID of the tool use this result corresponds to.\n\nThis MUST match the ID from a previous ToolUseContent.",
          type: "string"
        },
        type: {
          const: "tool_result",
          type: "string"
        }
      },
      required: [
        "content",
        "toolUseId",
        "type"
      ],
      type: "object"
    },
    ToolUseContent: {
      description: "A request from the assistant to call a tool.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "Optional metadata about the tool use. Clients SHOULD preserve this field when\nincluding tool uses in subsequent sampling requests to enable caching optimizations.\n\nSee [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          type: "object"
        },
        id: {
          description: "A unique identifier for this tool use.\n\nThis ID is used to match tool results to their corresponding tool uses.",
          type: "string"
        },
        input: {
          additionalProperties: {},
          description: "The arguments to pass to the tool, conforming to the tool's input schema.",
          type: "object"
        },
        name: {
          description: "The name of the tool to call.",
          type: "string"
        },
        type: {
          const: "tool_use",
          type: "string"
        }
      },
      required: [
        "id",
        "input",
        "name",
        "type"
      ],
      type: "object"
    },
    URLElicitationRequiredError: {
      description: "An error response that indicates that the server requires the client to provide additional information via an elicitation request.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32042,
                  type: "integer"
                },
                data: {
                  additionalProperties: {},
                  properties: {
                    elicitations: {
                      items: {
                        $ref: "#/$defs/ElicitRequestURLParams"
                      },
                      type: "array"
                    }
                  },
                  required: [
                    "elicitations"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    UnsubscribeRequest: {
      description: "Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/unsubscribe",
          type: "string"
        },
        params: {
          $ref: "#/$defs/UnsubscribeRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    UnsubscribeRequestParams: {
      description: "Parameters for a `resources/unsubscribe` request.",
      properties: {
        _meta: {
          additionalProperties: {},
          description: "See [General fields: `_meta`](/specification/2025-11-25/basic/index#meta) for notes on `_meta` usage.",
          properties: {
            progressToken: {
              $ref: "#/$defs/ProgressToken",
              description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
            }
          },
          type: "object"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    UntitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for the array items.",
          properties: {
            enum: {
              description: "Array of enum values to choose from.",
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "string",
              type: "string"
            }
          },
          required: [
            "enum",
            "type"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    UntitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        enum: {
          description: "Array of enum values to choose from.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    }
  }
};

// spec/2026-07-28/schema.json
var schema_default2 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $defs: {
    Annotations: {
      description: "Optional annotations for the client. The client can use annotations to inform how objects are used or displayed",
      properties: {
        audience: {
          description: 'Describes who the intended audience of this object or data is.\n\nIt can include multiple entries to indicate content useful for multiple audiences (e.g., `["user", "assistant"]`).',
          items: {
            $ref: "#/$defs/Role"
          },
          type: "array"
        },
        lastModified: {
          description: 'The moment the resource was last modified, as an ISO 8601 formatted string.\n\nShould be an ISO 8601 formatted string (e.g., "2025-01-12T15:00:58Z").\n\nExamples: last activity timestamp in an open file, timestamp when the resource\nwas attached, etc.',
          type: "string"
        },
        priority: {
          description: 'Describes how important this data is for operating the server.\n\nA value of 1 means "most important," and indicates that the data is\neffectively required, while 0 means "least important," and indicates that\nthe data is entirely optional.',
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    AudioContent: {
      description: "Audio provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded audio data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the audio. Different providers may support different audio types.",
          type: "string"
        },
        type: {
          const: "audio",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    BaseMetadata: {
      description: "Base interface for metadata with name (identifier) and title (display name) properties.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    BlobResourceContents: {
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        blob: {
          description: "A base64-encoded string representing the binary data of the item.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "blob",
        "uri"
      ],
      type: "object"
    },
    BooleanSchema: {
      properties: {
        default: {
          type: "boolean"
        },
        description: {
          type: "string"
        },
        title: {
          type: "string"
        },
        type: {
          const: "boolean",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    CacheableResult: {
      description: "A result that supports a time-to-live (TTL) hint for client-side caching.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    CallToolRequest: {
      description: "Used by the client to invoke a tool provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/call",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CallToolRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CallToolRequestParams: {
      description: "Parameters for a `tools/call` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        arguments: {
          additionalProperties: {},
          description: "Arguments to use for the tool call.",
          type: "object"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        name: {
          description: "The name of the tool.",
          type: "string"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta",
        "name"
      ],
      type: "object"
    },
    CallToolResult: {
      description: "The result returned by the server for a {@link CallToolRequesttools/call} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        content: {
          description: "A list of content objects that represent the unstructured result of the tool call.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool call ended in an error.\n\nIf not set, this is assumed to be false (the call was successful).\n\nAny errors that originate from the tool SHOULD be reported inside the result\nobject, with `isError` set to true, _not_ as an MCP protocol-level error\nresponse. Otherwise, the LLM would not be able to see that an error occurred\nand self-correct.\n\nHowever, any errors in _finding_ the tool, an error indicating that the\nserver does not support tool calls, or any other exceptional conditions,\nshould be reported as an MCP error response.",
          type: "boolean"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        structuredContent: {
          description: "An optional JSON value that represents the structured result of the tool call.\n\nThis can be any JSON value (object, array, string, number, boolean, or null)\nthat conforms to the tool's outputSchema if one is defined."
        }
      },
      required: [
        "content",
        "resultType"
      ],
      type: "object"
    },
    CallToolResultResponse: {
      description: "A successful response from the server for a {@link CallToolRequesttools/call} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/CallToolResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    CancelledNotification: {
      description: "This notification is sent by the client to indicate that it is cancelling a request it previously issued.\n\nOn stdio, the server also sends this notification, solely to terminate a {@link SubscriptionsListenRequestsubscriptions/listen} stream: it references the ID of the `subscriptions/listen` request that opened the stream. Servers MUST NOT use this notification to cancel any other request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CancelledNotificationParams: {
      description: "Parameters for a `notifications/cancelled` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        reason: {
          description: "An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.",
          type: "string"
        },
        requestId: {
          $ref: "#/$defs/RequestId",
          description: "The ID of the request to cancel.\n\nThis MUST correspond to the ID of a request the client previously issued."
        }
      },
      required: [
        "requestId"
      ],
      type: "object"
    },
    ClientCapabilities: {
      description: "Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.",
      properties: {
        elicitation: {
          description: "Present if the client supports elicitation from the server.",
          properties: {
            form: {
              $ref: "#/$defs/JSONObject"
            },
            url: {
              $ref: "#/$defs/JSONObject"
            }
          },
          type: "object"
        },
        experimental: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: "Experimental, non-standard capabilities that the client supports.",
          type: "object"
        },
        extensions: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: 'Optional MCP extensions that the client supports. Keys are extension identifiers\n(e.g., "io.modelcontextprotocol/oauth-client-credentials"), and values are\nper-extension settings objects. An empty object indicates support with no settings.\n\nKeys MUST follow the {@link MetaObject`_meta` key naming rules}, with a\nmandatory prefix.',
          type: "object"
        },
        roots: {
          description: "Present if the client supports listing roots.",
          properties: {},
          type: "object"
        },
        sampling: {
          description: "Present if the client supports sampling from an LLM.",
          properties: {
            context: {
              $ref: "#/$defs/JSONObject",
              description: 'Whether the client supports context inclusion via `includeContext` parameter.\nIf not declared, servers SHOULD only use `includeContext: "none"` (or omit it).'
            },
            tools: {
              $ref: "#/$defs/JSONObject",
              description: "Whether the client supports tool use via `tools` and `toolChoice` parameters."
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ClientNotification: {
      description: "This notification is sent by the client to indicate that it is cancelling a request it previously issued.\n\nOn stdio, the server also sends this notification, solely to terminate a {@link SubscriptionsListenRequestsubscriptions/listen} stream: it references the ID of the `subscriptions/listen` request that opened the stream. Servers MUST NOT use this notification to cancel any other request.\n\nThe request SHOULD still be in-flight, but due to communication latency, it is always possible that this notification MAY arrive after the request has already finished.\n\nThis notification indicates that the result will be unused, so any associated processing SHOULD cease.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/cancelled",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CancelledNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ClientRequest: {
      anyOf: [
        {
          $ref: "#/$defs/DiscoverRequest"
        },
        {
          $ref: "#/$defs/ListResourcesRequest"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesRequest"
        },
        {
          $ref: "#/$defs/ReadResourceRequest"
        },
        {
          $ref: "#/$defs/SubscriptionsListenRequest"
        },
        {
          $ref: "#/$defs/ListPromptsRequest"
        },
        {
          $ref: "#/$defs/GetPromptRequest"
        },
        {
          $ref: "#/$defs/ListToolsRequest"
        },
        {
          $ref: "#/$defs/CallToolRequest"
        },
        {
          $ref: "#/$defs/CompleteRequest"
        }
      ]
    },
    ClientResult: {
      $ref: "#/$defs/Result",
      description: "Common result fields."
    },
    CompleteRequest: {
      description: "A request from the client to the server, to ask for completion options.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "completion/complete",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CompleteRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    CompleteRequestParams: {
      description: "Parameters for a `completion/complete` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        argument: {
          description: "The argument's information",
          properties: {
            name: {
              description: "The name of the argument",
              type: "string"
            },
            value: {
              description: "The value of the argument to use for completion matching.",
              type: "string"
            }
          },
          required: [
            "name",
            "value"
          ],
          type: "object"
        },
        context: {
          description: "Additional, optional context for completions",
          properties: {
            arguments: {
              additionalProperties: {
                type: "string"
              },
              description: "Previously-resolved variables in a URI template or prompt.",
              type: "object"
            }
          },
          type: "object"
        },
        ref: {
          anyOf: [
            {
              $ref: "#/$defs/PromptReference"
            },
            {
              $ref: "#/$defs/ResourceTemplateReference"
            }
          ]
        }
      },
      required: [
        "_meta",
        "argument",
        "ref"
      ],
      type: "object"
    },
    CompleteResult: {
      description: "The result returned by the server for a {@link CompleteRequestcompletion/complete} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        completion: {
          properties: {
            hasMore: {
              description: "Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.",
              type: "boolean"
            },
            total: {
              description: "The total number of completion options available. This can exceed the number of values actually sent in the response.",
              type: "integer"
            },
            values: {
              description: "An array of completion values. Must not exceed 100 items.",
              items: {
                type: "string"
              },
              maxItems: 100,
              type: "array"
            }
          },
          required: [
            "values"
          ],
          type: "object"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "completion",
        "resultType"
      ],
      type: "object"
    },
    CompleteResultResponse: {
      description: "A successful response from the server for a {@link CompleteRequestcompletion/complete} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/CompleteResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ResourceLink"
        },
        {
          $ref: "#/$defs/EmbeddedResource"
        }
      ]
    },
    CreateMessageRequest: {
      description: "A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.",
      properties: {
        method: {
          const: "sampling/createMessage",
          type: "string"
        },
        params: {
          $ref: "#/$defs/CreateMessageRequestParams"
        }
      },
      required: [
        "method",
        "params"
      ],
      type: "object"
    },
    CreateMessageRequestParams: {
      description: "Parameters for a `sampling/createMessage` request.",
      properties: {
        includeContext: {
          description: 'A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.\nThe client MAY ignore this request.\n\nDefault is `"none"`. The values `"thisServer"` and `"allServers"` are deprecated (SEP-2596): servers SHOULD\nomit this field or use `"none"`, and SHOULD only use the deprecated values if the client declares\n{@link ClientCapabilities.sampling.context}.',
          enum: [
            "allServers",
            "none",
            "thisServer"
          ],
          type: "string"
        },
        maxTokens: {
          description: "The requested maximum number of tokens to sample (to prevent runaway completions).\n\nThe client MAY choose to sample fewer tokens than the requested maximum.",
          type: "integer"
        },
        messages: {
          items: {
            $ref: "#/$defs/SamplingMessage"
          },
          type: "array"
        },
        metadata: {
          $ref: "#/$defs/JSONObject",
          description: "Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific."
        },
        modelPreferences: {
          $ref: "#/$defs/ModelPreferences",
          description: "The server's preferences for which model to select. The client MAY ignore these preferences."
        },
        stopSequences: {
          items: {
            type: "string"
          },
          type: "array"
        },
        systemPrompt: {
          description: "An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.",
          type: "string"
        },
        temperature: {
          type: "number"
        },
        toolChoice: {
          $ref: "#/$defs/ToolChoice",
          description: 'Controls how the model uses tools.\nThe client MUST return an error if this field is provided but {@link ClientCapabilities.sampling.tools} is not declared.\nDefault is `{ mode: "auto" }`.'
        },
        tools: {
          description: "Tools that the model may use during generation.\nThe client MUST return an error if this field is provided but {@link ClientCapabilities.sampling.tools} is not declared.",
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        }
      },
      required: [
        "maxTokens",
        "messages"
      ],
      type: "object"
    },
    CreateMessageResult: {
      description: "The result returned by the client for a {@link CreateMessageRequestsampling/createMessage} request.\nThe client should inform the user before returning the sampled message, to allow them\nto inspect the response (human in the loop) and decide whether to allow the server to see it.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        model: {
          description: "The name of the model that generated the message.",
          type: "string"
        },
        role: {
          $ref: "#/$defs/Role"
        },
        stopReason: {
          description: 'The reason why sampling stopped, if known.\n\nStandard values:\n- `"endTurn"`: Natural end of the assistant\'s turn\n- `"stopSequence"`: A stop sequence was encountered\n- `"maxTokens"`: Maximum token limit was reached\n- `"toolUse"`: The model wants to use one or more tools\n\nThis field is an open string to allow for provider-specific stop reasons.',
          type: "string"
        }
      },
      required: [
        "content",
        "model",
        "role"
      ],
      type: "object"
    },
    Cursor: {
      description: "An opaque token used to represent a cursor for pagination.",
      type: "string"
    },
    DiscoverRequest: {
      description: "A request from the client asking the server to advertise its supported\nprotocol versions, capabilities, and other metadata. Servers **MUST**\nimplement `server/discover`. Clients **MAY** call it but are not required\nto \u2014 version negotiation can also happen inline via per-request `_meta`.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "server/discover",
          type: "string"
        },
        params: {
          $ref: "#/$defs/RequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    DiscoverResult: {
      description: "The result returned by the server for a {@link DiscoverRequestserver/discover} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        capabilities: {
          $ref: "#/$defs/ServerCapabilities",
          description: "The capabilities of the server."
        },
        instructions: {
          description: "Natural-language guidance describing the server and its features.\n\nThis can be used by clients to improve an LLM's understanding of\navailable tools (e.g., by including it in a system prompt). It should\nfocus on information that helps the model use the server effectively\nand should not duplicate information already in tool descriptions.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        supportedVersions: {
          description: "MCP Protocol Versions this server supports. The client should choose a\nversion from this list for use in subsequent requests.",
          items: {
            type: "string"
          },
          type: "array"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "capabilities",
        "resultType",
        "supportedVersions",
        "ttlMs"
      ],
      type: "object"
    },
    DiscoverResultResponse: {
      description: "A successful response from the server for a {@link DiscoverRequestserver/discover} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/DiscoverResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ElicitRequest: {
      description: "A request from the server to elicit additional information from the user via the client.",
      properties: {
        method: {
          const: "elicitation/create",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ElicitRequestParams"
        }
      },
      required: [
        "method",
        "params"
      ],
      type: "object"
    },
    ElicitRequestFormParams: {
      description: "The parameters for a request to elicit non-sensitive information from the user via a form in the client.",
      properties: {
        message: {
          description: "The message to present to the user describing what information is being requested.",
          type: "string"
        },
        mode: {
          const: "form",
          description: "The elicitation mode.",
          type: "string"
        },
        requestedSchema: {
          description: "A restricted subset of JSON Schema.\nOnly top-level properties are allowed, without nesting.",
          properties: {
            $schema: {
              type: "string"
            },
            properties: {
              additionalProperties: {
                $ref: "#/$defs/PrimitiveSchemaDefinition"
              },
              type: "object"
            },
            required: {
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "properties",
            "type"
          ],
          type: "object"
        }
      },
      required: [
        "message",
        "requestedSchema"
      ],
      type: "object"
    },
    ElicitRequestParams: {
      anyOf: [
        {
          $ref: "#/$defs/ElicitRequestFormParams"
        },
        {
          $ref: "#/$defs/ElicitRequestURLParams"
        }
      ],
      description: "The parameters for a request to elicit additional information from the user via the client."
    },
    ElicitRequestURLParams: {
      description: "The parameters for a request to elicit information from the user via a URL in the client.",
      properties: {
        message: {
          description: "The message to present to the user explaining why the interaction is needed.",
          type: "string"
        },
        mode: {
          const: "url",
          description: "The elicitation mode.",
          type: "string"
        },
        url: {
          description: "The URL that the user should navigate to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "message",
        "mode",
        "url"
      ],
      type: "object"
    },
    ElicitResult: {
      description: "The result returned by the client for an {@link ElicitRequestelicitation/create} request.",
      properties: {
        action: {
          description: 'The user action in response to the elicitation.\n- `"accept"`: User submitted the form/confirmed the action\n- `"decline"`: User explicitly declined the action\n- `"cancel"`: User dismissed without making an explicit choice',
          enum: [
            "accept",
            "cancel",
            "decline"
          ],
          type: "string"
        },
        content: {
          additionalProperties: {
            anyOf: [
              {
                items: {
                  type: "string"
                },
                type: "array"
              },
              {
                type: [
                  "string",
                  "integer",
                  "boolean"
                ]
              }
            ]
          },
          description: 'The submitted form data, only present when action is `"accept"` and mode was `"form"`.\nContains values matching the requested schema.\nOmitted for out-of-band mode responses.',
          type: "object"
        }
      },
      required: [
        "action"
      ],
      type: "object"
    },
    EmbeddedResource: {
      description: "The contents of a resource, embedded into a prompt or tool call result.\n\nIt is up to the client how best to render embedded resources for the benefit\nof the LLM and/or the user.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        resource: {
          anyOf: [
            {
              $ref: "#/$defs/TextResourceContents"
            },
            {
              $ref: "#/$defs/BlobResourceContents"
            }
          ]
        },
        type: {
          const: "resource",
          type: "string"
        }
      },
      required: [
        "resource",
        "type"
      ],
      type: "object"
    },
    EmptyResult: {
      $ref: "#/$defs/Result",
      description: "Common result fields."
    },
    EnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ]
    },
    Error: {
      properties: {
        code: {
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    GetPromptRequest: {
      description: "Used by the client to get a prompt provided by the server.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/get",
          type: "string"
        },
        params: {
          $ref: "#/$defs/GetPromptRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    GetPromptRequestParams: {
      description: "Parameters for a `prompts/get` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        arguments: {
          additionalProperties: {
            type: "string"
          },
          description: "Arguments to use for templating the prompt.",
          type: "object"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        name: {
          description: "The name of the prompt or prompt template.",
          type: "string"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta",
        "name"
      ],
      type: "object"
    },
    GetPromptResult: {
      description: "The result returned by the server for a {@link GetPromptRequestprompts/get} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        description: {
          description: "An optional description for the prompt.",
          type: "string"
        },
        messages: {
          items: {
            $ref: "#/$defs/PromptMessage"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "messages",
        "resultType"
      ],
      type: "object"
    },
    GetPromptResultResponse: {
      description: "A successful response from the server for a {@link GetPromptRequestprompts/get} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/GetPromptResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    HeaderMismatchError: {
      description: "Returned when a server rejects a request because the values in the HTTP\nheaders do not match the corresponding values in the request body, or\nbecause required headers are missing or malformed. For HTTP, the response\nstatus code MUST be `400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32020,
                  type: "integer"
                }
              },
              required: [
                "code"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    Icon: {
      description: "An optionally-sized icon that can be displayed in a user interface.",
      properties: {
        mimeType: {
          description: 'Optional MIME type override if the source MIME type is missing or generic.\nFor example: `"image/png"`, `"image/jpeg"`, or `"image/svg+xml"`.',
          type: "string"
        },
        sizes: {
          description: 'Optional array of strings that specify sizes at which the icon can be used.\nEach string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.\n\nIf not provided, the client should assume that the icon can be used at any size.',
          items: {
            type: "string"
          },
          type: "array"
        },
        src: {
          description: "A standard URI pointing to an icon resource. May be an HTTP/HTTPS URL or a\n`data:` URI with Base64-encoded image data.\n\nConsumers SHOULD take steps to ensure URLs serving icons are from the\nsame domain as the client/server or a trusted domain.\n\nConsumers SHOULD take appropriate precautions when consuming SVGs as they can contain\nexecutable JavaScript.",
          format: "uri",
          type: "string"
        },
        theme: {
          description: 'Optional specifier for the theme this icon is designed for. `"light"` indicates\nthe icon is designed to be used with a light background, and `"dark"` indicates\nthe icon is designed to be used with a dark background.\n\nIf not provided, the client should assume the icon can be used with any theme.',
          enum: [
            "dark",
            "light"
          ],
          type: "string"
        }
      },
      required: [
        "src"
      ],
      type: "object"
    },
    Icons: {
      description: "Base interface to add `icons` property.",
      properties: {
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        }
      },
      type: "object"
    },
    ImageContent: {
      description: "An image provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        data: {
          description: "The base64-encoded image data.",
          format: "byte",
          type: "string"
        },
        mimeType: {
          description: "The MIME type of the image. Different providers may support different image types.",
          type: "string"
        },
        type: {
          const: "image",
          type: "string"
        }
      },
      required: [
        "data",
        "mimeType",
        "type"
      ],
      type: "object"
    },
    Implementation: {
      description: "Describes the MCP implementation.",
      properties: {
        description: {
          description: "An optional human-readable description of what this implementation does.\n\nThis can be used by clients or servers to provide context about their purpose\nand capabilities. For example, a server might describe the types of resources\nor tools it provides, while a client might describe its intended use case.",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        version: {
          description: "The version of this implementation.",
          type: "string"
        },
        websiteUrl: {
          description: "An optional URL of the website for this implementation.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "version"
      ],
      type: "object"
    },
    InputRequest: {
      anyOf: [
        {
          $ref: "#/$defs/CreateMessageRequest"
        },
        {
          $ref: "#/$defs/ListRootsRequest"
        },
        {
          $ref: "#/$defs/ElicitRequest"
        }
      ]
    },
    InputRequests: {
      additionalProperties: {
        $ref: "#/$defs/InputRequest"
      },
      description: "A map of server-initiated requests that the client must fulfill.\nKeys are server-assigned identifiers; values are the request objects.",
      type: "object"
    },
    InputRequiredResult: {
      description: "An InputRequiredResult sent by the server to indicate that additional input is needed\nbefore the request can be completed.\n\nAt least one of `inputRequests` or `requestState` MUST be present.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        inputRequests: {
          $ref: "#/$defs/InputRequests"
        },
        requestState: {
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    InputResponse: {
      anyOf: [
        {
          $ref: "#/$defs/CreateMessageResult"
        },
        {
          $ref: "#/$defs/ListRootsResult"
        },
        {
          $ref: "#/$defs/ElicitResult"
        }
      ]
    },
    InputResponseRequestParams: {
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        requestState: {
          type: "string"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    InputResponses: {
      additionalProperties: {
        $ref: "#/$defs/InputResponse"
      },
      description: "A map of client responses to server-initiated requests.\nKeys correspond to the keys in the {@link InputRequests} map;\nvalues are the client's result for each request.",
      type: "object"
    },
    InternalError: {
      description: "A JSON-RPC error indicating that an internal error occurred on the receiver. This error is returned when the receiver encounters an unexpected condition that prevents it from fulfilling the request.",
      properties: {
        code: {
          const: -32603,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    InvalidParamsError: {
      description: "A JSON-RPC error indicating that the method parameters are invalid or malformed.\n\nIn MCP, this error is returned in various contexts when request parameters fail validation:\n\n- **Tools**: Unknown tool name or invalid tool arguments\n- **Prompts**: Unknown prompt name or missing required arguments\n- **Pagination**: Invalid or expired cursor values\n- **Logging**: Invalid log level\n- **Elicitation**: Server requests an elicitation mode not declared in client capabilities\n- **Sampling**: Missing tool result or tool results mixed with other content",
      properties: {
        code: {
          const: -32602,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    InvalidRequestError: {
      description: "A JSON-RPC error indicating that the request is not a valid request object. This error is returned when the message structure does not conform to the JSON-RPC 2.0 specification requirements for a request (e.g., missing required fields like `jsonrpc` or `method`, or using invalid types for these fields).",
      properties: {
        code: {
          const: -32600,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    JSONArray: {
      items: {
        $ref: "#/$defs/JSONValue"
      },
      type: "array"
    },
    JSONObject: {
      additionalProperties: {
        $ref: "#/$defs/JSONValue"
      },
      type: "object"
    },
    JSONRPCErrorResponse: {
      description: "A response to a request that indicates an error occurred.",
      properties: {
        error: {
          $ref: "#/$defs/Error"
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    JSONRPCMessage: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCRequest"
        },
        {
          $ref: "#/$defs/JSONRPCNotification"
        },
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "Refers to any valid JSON-RPC object that can be decoded off the wire, or encoded to be sent."
    },
    JSONRPCNotification: {
      description: "A notification which does not expect a response.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCRequest: {
      description: "A request that expects a response.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    JSONRPCResponse: {
      anyOf: [
        {
          $ref: "#/$defs/JSONRPCResultResponse"
        },
        {
          $ref: "#/$defs/JSONRPCErrorResponse"
        }
      ],
      description: "A response to a request, containing either the result or error."
    },
    JSONRPCResultResponse: {
      description: "A successful (non-error) response to a request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/Result"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    JSONValue: {
      anyOf: [
        {
          $ref: "#/$defs/JSONObject"
        },
        {
          items: {
            $ref: "#/$defs/JSONValue"
          },
          type: "array"
        },
        {
          type: [
            "string",
            "integer",
            "boolean"
          ]
        }
      ]
    },
    LegacyTitledEnumSchema: {
      description: "Use {@link TitledSingleSelectEnumSchema} instead.\nThis interface will be removed in a future version.",
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        enum: {
          items: {
            type: "string"
          },
          type: "array"
        },
        enumNames: {
          description: "(Legacy) Display names for enum values.\nNon-standard according to JSON schema 2020-12.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    },
    ListPromptsRequest: {
      description: "Sent from the client to request a list of prompts and prompt templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "prompts/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListPromptsResult: {
      description: "The result returned by the server for a {@link ListPromptsRequestprompts/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        prompts: {
          items: {
            $ref: "#/$defs/Prompt"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "prompts",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListPromptsResultResponse: {
      description: "A successful response from the server for a {@link ListPromptsRequestprompts/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListPromptsResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListResourceTemplatesRequest: {
      description: "Sent from the client to request a list of resource templates the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/templates/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListResourceTemplatesResult: {
      description: "The result returned by the server for a {@link ListResourceTemplatesRequestresources/templates/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resourceTemplates: {
          items: {
            $ref: "#/$defs/ResourceTemplate"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resourceTemplates",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListResourceTemplatesResultResponse: {
      description: "A successful response from the server for a {@link ListResourceTemplatesRequestresources/templates/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListResourceTemplatesResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListResourcesRequest: {
      description: "Sent from the client to request a list of resources the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListResourcesResult: {
      description: "The result returned by the server for a {@link ListResourcesRequestresources/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resources: {
          items: {
            $ref: "#/$defs/Resource"
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resources",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ListResourcesResultResponse: {
      description: "A successful response from the server for a {@link ListResourcesRequestresources/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListResourcesResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    ListRootsRequest: {
      description: "Sent from the server to request a list of root URIs from the client. Roots allow\nservers to ask for specific directories or files to operate on. A common example\nfor roots is providing a set of repositories or directories a server should operate\non.\n\nThis request is typically used when the server needs to understand the file system\nstructure or access specific locations that the client has permission to read from.",
      properties: {
        method: {
          const: "roots/list",
          type: "string"
        },
        params: {
          properties: {
            _meta: {
              $ref: "#/$defs/MetaObject"
            }
          },
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    ListRootsResult: {
      description: "The result returned by the client for a {@link ListRootsRequestroots/list} request.\nThis result contains an array of {@link Root} objects, each representing a root directory\nor file that the server can operate on.",
      properties: {
        roots: {
          items: {
            $ref: "#/$defs/Root"
          },
          type: "array"
        }
      },
      required: [
        "roots"
      ],
      type: "object"
    },
    ListToolsRequest: {
      description: "Sent from the client to request a list of tools the server has.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "tools/list",
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ListToolsResult: {
      description: "The result returned by the server for a {@link ListToolsRequesttools/list} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        tools: {
          items: {
            $ref: "#/$defs/Tool"
          },
          type: "array"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "resultType",
        "tools",
        "ttlMs"
      ],
      type: "object"
    },
    ListToolsResultResponse: {
      description: "A successful response from the server for a {@link ListToolsRequesttools/list} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/ListToolsResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    LoggingLevel: {
      description: "The severity of a log message.\n\nThese map to syslog message severities, as specified in RFC-5424:\nhttps://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1",
      enum: [
        "alert",
        "critical",
        "debug",
        "emergency",
        "error",
        "info",
        "notice",
        "warning"
      ],
      type: "string"
    },
    LoggingMessageNotification: {
      description: 'JSONRPCNotification of a log message passed from server to client. The client opts in by setting `"io.modelcontextprotocol/logLevel"` in a request\'s `_meta`.',
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/message",
          type: "string"
        },
        params: {
          $ref: "#/$defs/LoggingMessageNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    LoggingMessageNotificationParams: {
      description: "Parameters for a `notifications/message` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        data: {
          description: "The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here."
        },
        level: {
          $ref: "#/$defs/LoggingLevel",
          description: "The severity of this log message."
        },
        logger: {
          description: "An optional name of the logger issuing this message.",
          type: "string"
        }
      },
      required: [
        "data",
        "level"
      ],
      type: "object"
    },
    MetaObject: {
      description: "Represents the contents of a `_meta` field, which clients and servers use to attach additional metadata to their interactions.\n\nCertain key names are reserved by MCP for protocol-level metadata; implementations MUST NOT make assumptions about values at these keys. Additionally, specific schema definitions may reserve particular names for purpose-specific metadata, as declared in those definitions.\n\nValid keys have two segments:\n\n**Prefix:**\n- Optional \u2014 if specified, MUST be a series of _labels_ separated by dots (`.`), followed by a slash (`/`).\n- Labels MUST start with a letter and end with a letter or digit. Interior characters may be letters, digits, or hyphens (`-`).\n- Implementations SHOULD use reverse DNS notation (e.g., `com.example/` rather than `example.com/`).\n- Any prefix where the second label is `modelcontextprotocol` or `mcp` is **reserved** for MCP use. For example: `io.modelcontextprotocol/`, `dev.mcp/`, `org.modelcontextprotocol.api/`, and `com.mcp.tools/` are all reserved. However, `com.example.mcp/` is NOT reserved, as the second label is `example`.\n\n**Name:**\n- Unless empty, MUST start and end with an alphanumeric character (`[a-z0-9A-Z]`).\n- Interior characters may be alphanumeric, hyphens (`-`), underscores (`_`), or dots (`.`).",
      type: "object"
    },
    MethodNotFoundError: {
      description: "A JSON-RPC error indicating that the requested method does not exist or is not available.\n\nIn MCP, a server returns this error when a client invokes a method the server does not implement \u2014 either a genuinely unknown method, or one gated behind a server capability the server did not advertise (e.g., calling `prompts/list` when the `prompts` capability was not advertised).\n\nA request that requires a client capability the client did not declare is signalled instead by {@link MissingRequiredClientCapabilityError} (`-32021`).",
      properties: {
        code: {
          const: -32601,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    MissingRequiredClientCapabilityError: {
      description: "Returned when processing a request requires a capability the client did not\ndeclare in `clientCapabilities`. For HTTP, the response status code MUST be\n`400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32021,
                  type: "integer"
                },
                data: {
                  properties: {
                    requiredCapabilities: {
                      $ref: "#/$defs/ClientCapabilities",
                      description: "The capabilities the server requires from the client to process this request."
                    }
                  },
                  required: [
                    "requiredCapabilities"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    ModelHint: {
      description: "Hints to use for model selection.\n\nKeys not declared here are currently left unspecified by the spec and are up\nto the client to interpret.",
      properties: {
        name: {
          description: "A hint for a model name.\n\nThe client SHOULD treat this as a substring of a model name; for example:\n - `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`\n - `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.\n - `claude` should match any Claude model\n\nThe client MAY also map the string to a different provider's model name or a different model family, as long as it fills a similar niche; for example:\n - `gemini-1.5-flash` could match `claude-3-haiku-20240307`",
          type: "string"
        }
      },
      type: "object"
    },
    ModelPreferences: {
      description: `The server's preferences for model selection, requested of the client during sampling.

Because LLMs can vary along multiple dimensions, choosing the "best" model is
rarely straightforward.  Different models excel in different areas\u2014some are
faster but less capable, others are more capable but more expensive, and so
on. This interface allows servers to express their priorities across multiple
dimensions to help clients make an appropriate selection for their use case.

These preferences are always advisory. The client MAY ignore them. It is also
up to the client to decide how to interpret these preferences and how to
balance them against other considerations.`,
      properties: {
        costPriority: {
          description: "How much to prioritize cost when selecting a model. A value of 0 means cost\nis not important, while a value of 1 means cost is the most important\nfactor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        hints: {
          description: "Optional hints to use for model selection.\n\nIf multiple hints are specified, the client MUST evaluate them in order\n(such that the first match is taken).\n\nThe client SHOULD prioritize these hints over the numeric priorities, but\nMAY still use the priorities to select from ambiguous matches.",
          items: {
            $ref: "#/$defs/ModelHint"
          },
          type: "array"
        },
        intelligencePriority: {
          description: "How much to prioritize intelligence and capabilities when selecting a\nmodel. A value of 0 means intelligence is not important, while a value of 1\nmeans intelligence is the most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        },
        speedPriority: {
          description: "How much to prioritize sampling speed (latency) when selecting a model. A\nvalue of 0 means speed is not important, while a value of 1 means speed is\nthe most important factor.",
          maximum: 1,
          minimum: 0,
          type: "number"
        }
      },
      type: "object"
    },
    MultiSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        }
      ]
    },
    Notification: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    NotificationMetaObject: {
      description: "Extends {@link MetaObject} with additional notification-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/subscriptionId": {
          $ref: "#/$defs/RequestId",
          description: "Identifies the subscription stream a notification was delivered on. The\nserver MUST include this key on every notification delivered via a\n{@link SubscriptionsListenRequestsubscriptions/listen} stream, so the\nclient can correlate the notification with the originating subscription.\nThe key is absent on notifications not delivered via a subscription\nstream (e.g. progress notifications for an in-flight request), which is\nwhy it is optional here.\n\nThe value is the JSON-RPC ID of the `subscriptions/listen` request that\nopened the stream."
        }
      },
      type: "object"
    },
    NotificationParams: {
      description: "Common params for any notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        }
      },
      type: "object"
    },
    NumberSchema: {
      properties: {
        default: {
          type: "number"
        },
        description: {
          type: "string"
        },
        maximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        title: {
          type: "string"
        },
        type: {
          enum: [
            "integer",
            "number"
          ],
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    PaginatedRequest: {
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          type: "string"
        },
        params: {
          $ref: "#/$defs/PaginatedRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    PaginatedRequestParams: {
      description: "Common params for paginated requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        cursor: {
          description: "An opaque token representing the current pagination position.\nIf provided, the server should return results starting after this cursor.",
          type: "string"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    PaginatedResult: {
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        nextCursor: {
          description: "An opaque token representing the pagination position after the last returned result.\nIf present, there may be more results available.",
          type: "string"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    ParseError: {
      description: "A JSON-RPC error indicating that invalid JSON was received by the server. This error is returned when the server cannot parse the JSON text of a message.",
      properties: {
        code: {
          const: -32700,
          description: "The error type that occurred.",
          type: "integer"
        },
        data: {
          description: "Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.)."
        },
        message: {
          description: "A short description of the error. The message SHOULD be limited to a concise single sentence.",
          type: "string"
        }
      },
      required: [
        "code",
        "message"
      ],
      type: "object"
    },
    PrimitiveSchemaDefinition: {
      anyOf: [
        {
          $ref: "#/$defs/StringSchema"
        },
        {
          $ref: "#/$defs/NumberSchema"
        },
        {
          $ref: "#/$defs/BooleanSchema"
        },
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/UntitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledMultiSelectEnumSchema"
        },
        {
          $ref: "#/$defs/LegacyTitledEnumSchema"
        }
      ],
      description: "Restricted schema definitions that only allow primitive types\nwithout nested objects or arrays."
    },
    ProgressNotification: {
      description: "An out-of-band notification used to inform the receiver of a progress update for a long-running request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/progress",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ProgressNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ProgressNotificationParams: {
      description: "Parameters for a {@link ProgressNotificationnotifications/progress} notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        message: {
          description: "An optional message describing the current progress.",
          type: "string"
        },
        progress: {
          description: "The progress thus far. This should increase every time progress is made, even if the total is unknown.",
          type: "number"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "The progress token which was given in the initial request, used to associate this notification with the request that is proceeding."
        },
        total: {
          description: "Total number of items to process (or total progress required), if known.",
          type: "number"
        }
      },
      required: [
        "progress",
        "progressToken"
      ],
      type: "object"
    },
    ProgressToken: {
      description: "A progress token, used to associate progress notifications with the original request.",
      type: [
        "string",
        "integer"
      ]
    },
    Prompt: {
      description: "A prompt or prompt template that the server offers.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        arguments: {
          description: "A list of arguments to use for templating the prompt.",
          items: {
            $ref: "#/$defs/PromptArgument"
          },
          type: "array"
        },
        description: {
          description: "An optional description of what this prompt provides",
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptArgument: {
      description: "Describes an argument that a prompt can accept.",
      properties: {
        description: {
          description: "A human-readable description of the argument.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        required: {
          description: "Whether this argument must be provided.",
          type: "boolean"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "name"
      ],
      type: "object"
    },
    PromptListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of prompts it offers has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `promptsListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/prompts/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    PromptMessage: {
      description: "Describes a message returned as part of a prompt.\n\nThis is similar to {@link SamplingMessage}, but also supports the embedding of\nresources from the MCP server.",
      properties: {
        content: {
          $ref: "#/$defs/ContentBlock"
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    PromptReference: {
      description: "Identifies a prompt.",
      properties: {
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "ref/prompt",
          type: "string"
        }
      },
      required: [
        "name",
        "type"
      ],
      type: "object"
    },
    ReadResourceRequest: {
      description: "Sent from the client to the server, to read a specific resource URI.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "resources/read",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ReadResourceRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ReadResourceRequestParams: {
      description: "Parameters for a `resources/read` request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        inputResponses: {
          $ref: "#/$defs/InputResponses"
        },
        requestState: {
          type: "string"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "_meta",
        "uri"
      ],
      type: "object"
    },
    ReadResourceResult: {
      description: "The result returned by the server for a {@link ReadResourceRequestresources/read} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        cacheScope: {
          description: 'Indicates the intended scope of the cached response, analogous to HTTP\n`Cache-Control: public` vs `Cache-Control: private`.\n\n- `"public"`: The response does not contain user-specific data. Any\n  client or intermediary (e.g., shared gateway, caching proxy) MAY cache\n  the response and serve it across authorization contexts.\n- `"private"`: The response MAY be cached and reused only within the\n  same authorization context. Caches MUST NOT be shared across\n  authorization contexts (e.g., a different access token requires a\n  different cache).',
          enum: [
            "private",
            "public"
          ],
          type: "string"
        },
        contents: {
          items: {
            anyOf: [
              {
                $ref: "#/$defs/TextResourceContents"
              },
              {
                $ref: "#/$defs/BlobResourceContents"
              }
            ]
          },
          type: "array"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        },
        ttlMs: {
          description: "A hint from the server indicating how long (in milliseconds) the\nclient MAY cache this response before re-fetching. Semantics are\nanalogous to HTTP Cache-Control max-age.\n\n- If 0, The response SHOULD be considered immediately stale,\n  The client MAY re-fetch every time the result is needed.\n- If positive, the client SHOULD consider the result fresh for this many\n  milliseconds after receiving the response.",
          minimum: 0,
          type: "integer"
        }
      },
      required: [
        "cacheScope",
        "contents",
        "resultType",
        "ttlMs"
      ],
      type: "object"
    },
    ReadResourceResultResponse: {
      description: "A successful response from the server for a {@link ReadResourceRequestresources/read} request.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          anyOf: [
            {
              $ref: "#/$defs/InputRequiredResult"
            },
            {
              $ref: "#/$defs/ReadResourceResult"
            }
          ]
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    Request: {
      properties: {
        method: {
          type: "string"
        },
        params: {
          additionalProperties: {},
          type: "object"
        }
      },
      required: [
        "method"
      ],
      type: "object"
    },
    RequestId: {
      description: "A uniquely identifying ID for a request in JSON-RPC.",
      type: [
        "string",
        "integer"
      ]
    },
    RequestMetaObject: {
      description: "Extends {@link MetaObject} with additional request-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/clientCapabilities": {
          $ref: "#/$defs/ClientCapabilities",
          description: "The client's capabilities for this specific request. Required.\n\nCapabilities are declared per-request rather than once at initialization;\nan empty object means the client supports no optional capabilities.\nServers MUST NOT infer capabilities from prior requests."
        },
        "io.modelcontextprotocol/clientInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the client software making the request. Clients SHOULD\ninclude this field on every request unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the client and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Servers\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        },
        "io.modelcontextprotocol/logLevel": {
          $ref: "#/$defs/LoggingLevel",
          description: "The desired log level for this request. Optional.\n\nIf absent, the server MUST NOT send any {@link LoggingMessageNotificationnotifications/message}\nnotifications for this request. The client opts in to log messages by\nexplicitly setting a level. Replaces the former `logging/setLevel` RPC."
        },
        "io.modelcontextprotocol/protocolVersion": {
          description: "The MCP Protocol Version being used for this request. Required.\n\nFor the HTTP transport, this value MUST match the `MCP-Protocol-Version`\nheader; otherwise the server MUST return a `400 Bad Request`. If the\nserver does not support the requested version, it MUST return an\n{@link UnsupportedProtocolVersionError}.",
          type: "string"
        },
        progressToken: {
          $ref: "#/$defs/ProgressToken",
          description: "If specified, the caller is requesting out-of-band progress notifications for this request (as represented by {@link ProgressNotificationnotifications/progress}). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications."
        }
      },
      required: [
        "io.modelcontextprotocol/clientCapabilities",
        "io.modelcontextprotocol/protocolVersion"
      ],
      type: "object"
    },
    RequestParams: {
      description: "Common params for any request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        }
      },
      required: [
        "_meta"
      ],
      type: "object"
    },
    Resource: {
      description: "A known resource that the server is capable of reading.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "uri"
      ],
      type: "object"
    },
    ResourceContents: {
      description: "The contents of a specific resource or sub-resource.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    ResourceLink: {
      description: "A resource that the server is capable of reading, included in a prompt or tool call result.\n\nNote: resource links returned by tools are not guaranteed to appear in the results of {@link ListResourcesRequestresources/list} requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this resource represents.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        size: {
          description: "The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.\n\nThis can be used by Hosts to display file sizes and estimate context window usage.",
          type: "integer"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        type: {
          const: "resource_link",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "name",
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `resourcesListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ResourceRequestParams: {
      description: "Common params for resource-related requests.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        uri: {
          description: "The URI of the resource. The URI can use any protocol; it is up to the server how to interpret it.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "_meta",
        "uri"
      ],
      type: "object"
    },
    ResourceTemplate: {
      description: "A template description for resources available on the server.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        description: {
          description: `A description of what this template is for.

This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        mimeType: {
          description: "The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.",
          type: "string"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        },
        uriTemplate: {
          description: "A URI template (according to RFC 6570) that can be used to construct resource URIs.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "name",
        "uriTemplate"
      ],
      type: "object"
    },
    ResourceTemplateReference: {
      description: "A reference to a resource or resource template definition.",
      properties: {
        type: {
          const: "ref/resource",
          type: "string"
        },
        uri: {
          description: "The URI or URI template of the resource.",
          format: "uri-template",
          type: "string"
        }
      },
      required: [
        "type",
        "uri"
      ],
      type: "object"
    },
    ResourceUpdatedNotification: {
      description: "A notification from the server to the client, informing it that a resource has changed and may need to be read again. This is only sent for resources the client opted in to via the `resourceSubscriptions` field of a {@link SubscriptionsListenRequestsubscriptions/listen} request.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/resources/updated",
          type: "string"
        },
        params: {
          $ref: "#/$defs/ResourceUpdatedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    ResourceUpdatedNotificationParams: {
      description: "Parameters for a `notifications/resources/updated` notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        uri: {
          description: "The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    Result: {
      additionalProperties: {},
      description: "Common result fields.",
      properties: {
        _meta: {
          $ref: "#/$defs/ResultMetaObject"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "resultType"
      ],
      type: "object"
    },
    ResultMetaObject: {
      description: "Extends {@link MetaObject} with additional result-specific fields. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/serverInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the server software producing the response. Servers SHOULD\ninclude this field on every response unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the server and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Clients\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        }
      },
      type: "object"
    },
    ResultType: {
      description: "Indicates the type of a {@link Result} object, allowing the client to\ndetermine how to parse the response.\n\ncomplete - the request completed successfully and the result contains the final content.\ninput_required - the request requires additional input and the result contains an {@link InputRequiredResult} object with instructions for the client to provide additional input before retrying the original request.",
      type: "string"
    },
    Role: {
      description: "The sender or recipient of messages and data in a conversation.",
      enum: [
        "assistant",
        "user"
      ],
      type: "string"
    },
    Root: {
      description: "Represents a root directory or file that the server can operate on.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        name: {
          description: "An optional name for the root. This can be used to provide a human-readable\nidentifier for the root, which may be useful for display purposes or for\nreferencing the root in other parts of the application.",
          type: "string"
        },
        uri: {
          description: "The URI identifying the root. This *must* start with `file://` for now.\nThis restriction may be relaxed in future versions of the protocol to allow\nother URI schemes.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "uri"
      ],
      type: "object"
    },
    SamplingMessage: {
      description: "Describes a message issued to or received from an LLM API.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        content: {
          anyOf: [
            {
              $ref: "#/$defs/TextContent"
            },
            {
              $ref: "#/$defs/ImageContent"
            },
            {
              $ref: "#/$defs/AudioContent"
            },
            {
              $ref: "#/$defs/ToolUseContent"
            },
            {
              $ref: "#/$defs/ToolResultContent"
            },
            {
              items: {
                $ref: "#/$defs/SamplingMessageContentBlock"
              },
              type: "array"
            }
          ]
        },
        role: {
          $ref: "#/$defs/Role"
        }
      },
      required: [
        "content",
        "role"
      ],
      type: "object"
    },
    SamplingMessageContentBlock: {
      anyOf: [
        {
          $ref: "#/$defs/TextContent"
        },
        {
          $ref: "#/$defs/ImageContent"
        },
        {
          $ref: "#/$defs/AudioContent"
        },
        {
          $ref: "#/$defs/ToolUseContent"
        },
        {
          $ref: "#/$defs/ToolResultContent"
        }
      ]
    },
    ServerCapabilities: {
      description: "Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.",
      properties: {
        completions: {
          $ref: "#/$defs/JSONObject",
          description: "Present if the server supports argument autocompletion suggestions."
        },
        experimental: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: "Experimental, non-standard capabilities that the server supports.",
          type: "object"
        },
        extensions: {
          additionalProperties: {
            $ref: "#/$defs/JSONObject"
          },
          description: 'Optional MCP extensions that the server supports. Keys are extension identifiers\n(e.g., "io.modelcontextprotocol/tasks"), and values are per-extension settings\nobjects. An empty object indicates support with no settings.\n\nKeys MUST follow the {@link MetaObject`_meta` key naming rules}, with a\nmandatory prefix.',
          type: "object"
        },
        logging: {
          $ref: "#/$defs/JSONObject",
          description: "Present if the server supports sending log messages to the client."
        },
        prompts: {
          description: "Present if the server offers any prompt templates.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the prompt list.",
              type: "boolean"
            }
          },
          type: "object"
        },
        resources: {
          description: "Present if the server offers any resources to read.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the resource list.",
              type: "boolean"
            },
            subscribe: {
              description: "Whether this server supports subscribing to resource updates.",
              type: "boolean"
            }
          },
          type: "object"
        },
        tools: {
          description: "Present if the server offers any tools to call.",
          properties: {
            listChanged: {
              description: "Whether this server supports notifications for changes to the tool list.",
              type: "boolean"
            }
          },
          type: "object"
        }
      },
      type: "object"
    },
    ServerNotification: {
      anyOf: [
        {
          $ref: "#/$defs/CancelledNotification"
        },
        {
          $ref: "#/$defs/ProgressNotification"
        },
        {
          $ref: "#/$defs/ResourceListChangedNotification"
        },
        {
          $ref: "#/$defs/SubscriptionsAcknowledgedNotification"
        },
        {
          $ref: "#/$defs/ResourceUpdatedNotification"
        },
        {
          $ref: "#/$defs/PromptListChangedNotification"
        },
        {
          $ref: "#/$defs/ToolListChangedNotification"
        },
        {
          $ref: "#/$defs/LoggingMessageNotification"
        }
      ]
    },
    ServerResult: {
      anyOf: [
        {
          $ref: "#/$defs/Result"
        },
        {
          $ref: "#/$defs/InputRequiredResult"
        },
        {
          $ref: "#/$defs/DiscoverResult"
        },
        {
          $ref: "#/$defs/ListResourcesResult"
        },
        {
          $ref: "#/$defs/ListResourceTemplatesResult"
        },
        {
          $ref: "#/$defs/ReadResourceResult"
        },
        {
          $ref: "#/$defs/SubscriptionsListenResult"
        },
        {
          $ref: "#/$defs/ListPromptsResult"
        },
        {
          $ref: "#/$defs/GetPromptResult"
        },
        {
          $ref: "#/$defs/ListToolsResult"
        },
        {
          $ref: "#/$defs/CallToolResult"
        },
        {
          $ref: "#/$defs/CompleteResult"
        }
      ]
    },
    SingleSelectEnumSchema: {
      anyOf: [
        {
          $ref: "#/$defs/UntitledSingleSelectEnumSchema"
        },
        {
          $ref: "#/$defs/TitledSingleSelectEnumSchema"
        }
      ]
    },
    StringSchema: {
      properties: {
        default: {
          type: "string"
        },
        description: {
          type: "string"
        },
        format: {
          enum: [
            "date",
            "date-time",
            "email",
            "uri"
          ],
          type: "string"
        },
        maxLength: {
          type: "integer"
        },
        minLength: {
          type: "integer"
        },
        title: {
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "type"
      ],
      type: "object"
    },
    SubscriptionFilter: {
      description: "The set of notification types a client may opt in to on a\n{@link SubscriptionsListenRequestsubscriptions/listen} request.\n\nEach notification type is **opt-in**; the server **MUST NOT** send\nnotification types the client has not explicitly requested here.",
      properties: {
        promptsListChanged: {
          description: "If true, receive {@link PromptListChangedNotificationnotifications/prompts/list_changed}.",
          type: "boolean"
        },
        resourceSubscriptions: {
          description: "Subscribe to {@link ResourceUpdatedNotificationnotifications/resources/updated} for these resource URIs.\nReplaces the former `resources/subscribe` RPC.",
          items: {
            type: "string"
          },
          type: "array"
        },
        resourcesListChanged: {
          description: "If true, receive {@link ResourceListChangedNotificationnotifications/resources/list_changed}.",
          type: "boolean"
        },
        toolsListChanged: {
          description: "If true, receive {@link ToolListChangedNotificationnotifications/tools/list_changed}.",
          type: "boolean"
        }
      },
      type: "object"
    },
    SubscriptionsAcknowledgedNotification: {
      description: "Sent by the server to acknowledge that a\n{@link SubscriptionsListenRequestsubscriptions/listen} subscription has been\nestablished and to report which notification types it agreed to honor.\n\nThis notification MUST be the first message the server sends carrying the\nsubscription's ID in `io.modelcontextprotocol/subscriptionId`. The server MUST\nNOT send any notification on the subscription before acknowledging it. On\nstdio, where every subscription shares one channel, this ordering is defined\nper subscription ID and not per channel: messages belonging to other\nsubscriptions MAY be interleaved before it.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/subscriptions/acknowledged",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscriptionsAcknowledgedNotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscriptionsAcknowledgedNotificationParams: {
      description: "Parameters for a {@link SubscriptionsAcknowledgedNotificationnotifications/subscriptions/acknowledged} notification.",
      properties: {
        _meta: {
          $ref: "#/$defs/NotificationMetaObject"
        },
        notifications: {
          $ref: "#/$defs/SubscriptionFilter",
          description: "The subset of requested notification types the server agreed to honor.\nOnly includes notification types the server actually supports; if the\nclient requested an unsupported type (e.g., `promptsListChanged` when\nthe server has no prompts), it is omitted from this set."
        }
      },
      required: [
        "notifications"
      ],
      type: "object"
    },
    SubscriptionsListenRequest: {
      description: "Sent from the client to open a long-lived channel for receiving notifications\noutside the context of a specific request. Replaces the previous HTTP GET\nendpoint and ensures consistent behavior between HTTP and STDIO.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "subscriptions/listen",
          type: "string"
        },
        params: {
          $ref: "#/$defs/SubscriptionsListenRequestParams"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "method",
        "params"
      ],
      type: "object"
    },
    SubscriptionsListenRequestParams: {
      description: "Parameters for a {@link SubscriptionsListenRequestsubscriptions/listen} request.",
      properties: {
        _meta: {
          $ref: "#/$defs/RequestMetaObject"
        },
        notifications: {
          $ref: "#/$defs/SubscriptionFilter",
          description: "The notifications the client opts in to on this stream. The server\n**MUST NOT** send notification types the client has not explicitly\nrequested."
        }
      },
      required: [
        "_meta",
        "notifications"
      ],
      type: "object"
    },
    SubscriptionsListenResult: {
      description: "The response to a {@link SubscriptionsListenRequestsubscriptions/listen}\nrequest, signalling that the subscription has ended gracefully (for example,\nduring server shutdown). Because the listen stream is long-lived, this result\nis sent only when the server tears the subscription down; an abrupt transport\nclose carries no response. The result body is otherwise empty.",
      properties: {
        _meta: {
          $ref: "#/$defs/SubscriptionsListenResultMetaObject"
        },
        resultType: {
          description: 'Indicates the type of the result, which allows the client to determine\nhow to parse the result object.\n\nServers implementing this protocol version MUST include this field.\nFor backward compatibility, when a client receives a result from a\nserver implementing an earlier protocol version (which does not include\n`resultType`), the client MUST treat the absent field as `"complete"`.',
          type: "string"
        }
      },
      required: [
        "_meta",
        "resultType"
      ],
      type: "object"
    },
    SubscriptionsListenResultMetaObject: {
      description: "Extends {@link ResultMetaObject} with the subscription-stream identifier carried by a\n{@link SubscriptionsListenResult}. All key naming rules from `MetaObject` apply.",
      properties: {
        "io.modelcontextprotocol/serverInfo": {
          $ref: "#/$defs/Implementation",
          description: "Identifies the server software producing the response. Servers SHOULD\ninclude this field on every response unless specifically configured not\nto do so.\n\nThe {@link Implementation} schema requires `name` and `version`; other\nfields are optional.\n\nThe value is self-reported by the server and is not verified by the\nprotocol. It is intended for display, logging, and debugging. Clients\nSHOULD NOT use it to change their behavior, and SHOULD NOT rely on it for\nsecurity decisions."
        },
        "io.modelcontextprotocol/subscriptionId": {
          $ref: "#/$defs/RequestId",
          description: "Identifies the subscription stream this response closes, so the client can\ncorrelate it with the originating subscription \u2014 mirroring the same key on\nthe stream's notifications. The value is the JSON-RPC ID of the\n`subscriptions/listen` request that opened the stream (and equals this\nresponse's `id`)."
        }
      },
      required: [
        "io.modelcontextprotocol/subscriptionId"
      ],
      type: "object"
    },
    SubscriptionsListenResultResponse: {
      description: "A successful response from the server for a {@link SubscriptionsListenRequestsubscriptions/listen}\nrequest, sent when the server tears the subscription down gracefully.",
      properties: {
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        result: {
          $ref: "#/$defs/SubscriptionsListenResult"
        }
      },
      required: [
        "id",
        "jsonrpc",
        "result"
      ],
      type: "object"
    },
    TextContent: {
      description: "Text provided to or from an LLM.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/Annotations",
          description: "Optional annotations for the client."
        },
        text: {
          description: "The text content of the message.",
          type: "string"
        },
        type: {
          const: "text",
          type: "string"
        }
      },
      required: [
        "text",
        "type"
      ],
      type: "object"
    },
    TextResourceContents: {
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        mimeType: {
          description: "The MIME type of this resource, if known.",
          type: "string"
        },
        text: {
          description: "The text of the item. This must only be set if the item can actually be represented as text (not binary data).",
          type: "string"
        },
        uri: {
          description: "The URI of this resource.",
          format: "uri",
          type: "string"
        }
      },
      required: [
        "text",
        "uri"
      ],
      type: "object"
    },
    TitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for array items with enum options and display labels.",
          properties: {
            anyOf: {
              description: "Array of enum options with values and display labels.",
              items: {
                properties: {
                  const: {
                    description: "The constant enum value.",
                    type: "string"
                  },
                  title: {
                    description: "Display title for this option.",
                    type: "string"
                  }
                },
                required: [
                  "const",
                  "title"
                ],
                type: "object"
              },
              type: "array"
            }
          },
          required: [
            "anyOf"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    TitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration with display titles for each option.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        oneOf: {
          description: "Array of enum options with values and display labels.",
          items: {
            properties: {
              const: {
                description: "The enum value.",
                type: "string"
              },
              title: {
                description: "Display label for this option.",
                type: "string"
              }
            },
            required: [
              "const",
              "title"
            ],
            type: "object"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "oneOf",
        "type"
      ],
      type: "object"
    },
    Tool: {
      description: "Definition for a tool the client can call.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject"
        },
        annotations: {
          $ref: "#/$defs/ToolAnnotations",
          description: "Optional additional tool information.\n\nDisplay name precedence order is: `title`, `annotations.title`, then `name`."
        },
        description: {
          description: `A human-readable description of the tool.

This can be used by clients to improve the LLM's understanding of available tools. It can be thought of like a "hint" to the model.`,
          type: "string"
        },
        icons: {
          description: "Optional set of sized icons that the client can display in a user interface.\n\nClients that support rendering icons MUST support at least the following MIME types:\n- `image/png` - PNG images (safe, universal compatibility)\n- `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)\n\nClients that support rendering icons SHOULD also support:\n- `image/svg+xml` - SVG images (scalable but requires security precautions)\n- `image/webp` - WebP images (modern, efficient format)",
          items: {
            $ref: "#/$defs/Icon"
          },
          type: "array"
        },
        inputSchema: {
          additionalProperties: {},
          description: 'A JSON Schema object defining the expected parameters for the tool.\n\nTool arguments are always JSON objects, so `type: "object"` is required at the root.\nBeyond that, any JSON Schema 2020-12 keyword may appear alongside `type` \u2014 including\ncomposition keywords (`oneOf`, `anyOf`, `allOf`, `not`), conditional keywords\n(`if`/`then`/`else`), reference keywords (`$ref`, `$defs`, `$anchor`), and any other\nstandard validation or annotation keywords.\n\nProperty schemas may carry an `x-mcp-header` annotation to mirror the\nargument value into an HTTP header on the Streamable HTTP transport. See\nthe Streamable HTTP transport specification for the validity and\nextraction rules.\n\nDefaults to JSON Schema 2020-12 when no explicit `$schema` is provided.',
          properties: {
            $schema: {
              type: "string"
            },
            type: {
              const: "object",
              type: "string"
            }
          },
          required: [
            "type"
          ],
          type: "object"
        },
        name: {
          description: "Intended for programmatic or logical use, but used as a display name in past specs or fallback (if title isn't present).",
          type: "string"
        },
        outputSchema: {
          additionalProperties: {},
          description: "An optional JSON Schema object defining the structure of the tool's output returned in\nthe structuredContent field of a {@link CallToolResult}. This can be any valid JSON Schema 2020-12.\n\nDefaults to JSON Schema 2020-12 when no explicit `$schema` is provided.",
          properties: {
            $schema: {
              type: "string"
            }
          },
          type: "object"
        },
        title: {
          description: "Intended for UI and end-user contexts \u2014 optimized to be human-readable and easily understood,\neven by those unfamiliar with domain-specific terminology.\n\nIf not provided, the name should be used for display (except for {@link Tool},\nwhere `annotations.title` should be given precedence over using `name`,\nif present).",
          type: "string"
        }
      },
      required: [
        "inputSchema",
        "name"
      ],
      type: "object"
    },
    ToolAnnotations: {
      description: "Additional properties describing a {@link Tool} to clients.\n\nNOTE: all properties in `ToolAnnotations` are **hints**.\nThey are not guaranteed to provide a faithful description of\ntool behavior (including descriptive properties like `title`).\n\nClients should never make tool use decisions based on `ToolAnnotations`\nreceived from untrusted servers.",
      properties: {
        destructiveHint: {
          description: "If true, the tool may perform destructive updates to its environment.\nIf false, the tool performs only additive updates.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: true",
          type: "boolean"
        },
        idempotentHint: {
          description: "If true, calling the tool repeatedly with the same arguments\nwill have no additional effect on its environment.\n\n(This property is meaningful only when `readOnlyHint == false`)\n\nDefault: false",
          type: "boolean"
        },
        openWorldHint: {
          description: `If true, this tool may interact with an "open world" of external
entities. If false, the tool's domain of interaction is closed.
For example, the world of a web search tool is open, whereas that
of a memory tool is not.

Default: true`,
          type: "boolean"
        },
        readOnlyHint: {
          description: "If true, the tool does not modify its environment.\n\nDefault: false",
          type: "boolean"
        },
        title: {
          description: "A human-readable title for the tool.",
          type: "string"
        }
      },
      type: "object"
    },
    ToolChoice: {
      description: "Controls tool selection behavior for sampling requests.",
      properties: {
        mode: {
          description: 'Controls the tool use ability of the model:\n- `"auto"`: Model decides whether to use tools (default)\n- `"required"`: Model MUST use at least one tool before completing\n- `"none"`: Model MUST NOT use any tools',
          enum: [
            "auto",
            "none",
            "required"
          ],
          type: "string"
        }
      },
      type: "object"
    },
    ToolListChangedNotification: {
      description: "An optional notification from the server to the client, informing it that the list of tools it offers has changed. This is only delivered on a {@link SubscriptionsListenRequestsubscriptions/listen} stream when the client requested it via the `toolsListChanged` filter field.",
      properties: {
        jsonrpc: {
          const: "2.0",
          type: "string"
        },
        method: {
          const: "notifications/tools/list_changed",
          type: "string"
        },
        params: {
          $ref: "#/$defs/NotificationParams"
        }
      },
      required: [
        "jsonrpc",
        "method"
      ],
      type: "object"
    },
    ToolResultContent: {
      description: "The result of a tool use, provided by the user back to the assistant.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject",
          description: "Optional metadata about the tool result. Clients SHOULD preserve this field when\nincluding tool results in subsequent sampling requests to enable caching optimizations."
        },
        content: {
          description: "The unstructured result content of the tool use.\n\nThis has the same format as {@link CallToolResult.content} and can include text, images,\naudio, resource links, and embedded resources.",
          items: {
            $ref: "#/$defs/ContentBlock"
          },
          type: "array"
        },
        isError: {
          description: "Whether the tool use resulted in an error.\n\nIf true, the content typically describes the error that occurred.\nDefault: false",
          type: "boolean"
        },
        structuredContent: {
          description: "An optional structured result value.\n\nThis can be any JSON value (object, array, string, number, boolean, or null).\nIf the tool defined an {@link Tool.outputSchema}, this SHOULD conform to that schema."
        },
        toolUseId: {
          description: "The ID of the tool use this result corresponds to.\n\nThis MUST match the ID from a previous {@link ToolUseContent}.",
          type: "string"
        },
        type: {
          const: "tool_result",
          type: "string"
        }
      },
      required: [
        "content",
        "toolUseId",
        "type"
      ],
      type: "object"
    },
    ToolUseContent: {
      description: "A request from the assistant to call a tool.",
      properties: {
        _meta: {
          $ref: "#/$defs/MetaObject",
          description: "Optional metadata about the tool use. Clients SHOULD preserve this field when\nincluding tool uses in subsequent sampling requests to enable caching optimizations."
        },
        id: {
          description: "A unique identifier for this tool use.\n\nThis ID is used to match tool results to their corresponding tool uses.",
          type: "string"
        },
        input: {
          additionalProperties: {},
          description: "The arguments to pass to the tool, conforming to the tool's input schema.",
          type: "object"
        },
        name: {
          description: "The name of the tool to call.",
          type: "string"
        },
        type: {
          const: "tool_use",
          type: "string"
        }
      },
      required: [
        "id",
        "input",
        "name",
        "type"
      ],
      type: "object"
    },
    UnsupportedProtocolVersionError: {
      description: "Returned when the request's protocol version is unknown to the server or\nunsupported (e.g., a known experimental or draft version the server has\nchosen not to implement). For HTTP, the response status code MUST be\n`400 Bad Request`.",
      properties: {
        error: {
          allOf: [
            {
              $ref: "#/$defs/Error"
            },
            {
              properties: {
                code: {
                  const: -32022,
                  type: "integer"
                },
                data: {
                  properties: {
                    requested: {
                      description: "The protocol version that was requested by the client.",
                      type: "string"
                    },
                    supported: {
                      description: "Protocol versions the server supports. The client should choose a\nmutually supported version from this list and retry.",
                      items: {
                        type: "string"
                      },
                      type: "array"
                    }
                  },
                  required: [
                    "requested",
                    "supported"
                  ],
                  type: "object"
                }
              },
              required: [
                "code",
                "data"
              ],
              type: "object"
            }
          ]
        },
        id: {
          $ref: "#/$defs/RequestId"
        },
        jsonrpc: {
          const: "2.0",
          type: "string"
        }
      },
      required: [
        "error",
        "jsonrpc"
      ],
      type: "object"
    },
    UntitledMultiSelectEnumSchema: {
      description: "Schema for multiple-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          items: {
            type: "string"
          },
          type: "array"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        items: {
          description: "Schema for the array items.",
          properties: {
            enum: {
              description: "Array of enum values to choose from.",
              items: {
                type: "string"
              },
              type: "array"
            },
            type: {
              const: "string",
              type: "string"
            }
          },
          required: [
            "enum",
            "type"
          ],
          type: "object"
        },
        maxItems: {
          description: "Maximum number of items to select.",
          type: "integer"
        },
        minItems: {
          description: "Minimum number of items to select.",
          type: "integer"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "array",
          type: "string"
        }
      },
      required: [
        "items",
        "type"
      ],
      type: "object"
    },
    UntitledSingleSelectEnumSchema: {
      description: "Schema for single-selection enumeration without display titles for options.",
      properties: {
        default: {
          description: "Optional default value.",
          type: "string"
        },
        description: {
          description: "Optional description for the enum field.",
          type: "string"
        },
        enum: {
          description: "Array of enum values to choose from.",
          items: {
            type: "string"
          },
          type: "array"
        },
        title: {
          description: "Optional title for the enum field.",
          type: "string"
        },
        type: {
          const: "string",
          type: "string"
        }
      },
      required: [
        "enum",
        "type"
      ],
      type: "object"
    }
  }
};

// src/oracles/schema-validator.ts
var schemaIds = {
  "2025-11-25": "https://mcp-wringer.invalid/spec/2025-11-25",
  "2026-07-28": "https://mcp-wringer.invalid/spec/2026-07-28"
};
var schemas = {
  "2025-11-25": schema_default,
  "2026-07-28": schema_default2
};
var ajv = new import__.Ajv2020({ allErrors: true, strict: false, validateFormats: false });
var validators = /* @__PURE__ */ new Map();
for (const revision of Object.keys(schemaIds)) {
  const schema = schemas[revision];
  const schemaId = schemaIds[revision];
  ajv.addSchema({ ...schema, $id: schemaId }, schemaId);
}
function validateAgainstSchema(revision, definition, value) {
  const key = `${revision}:${definition}`;
  let validator = validators.get(key);
  if (validator === void 0) {
    const compiled = ajv.compile({
      $ref: `${schemaIds[revision]}#/$defs/${definition}`
    });
    validators.set(key, compiled);
    validator = compiled;
  }
  const valid = validator(value);
  return {
    valid,
    errors: valid ? [] : (validator.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
  };
}

// src/oracles/builtins.ts
var MAX_TRACE_BYTES = 1048576;
function createOracles() {
  return [
    ["crash", {
      evaluate(context) {
        const { outcome } = context;
        const exitedDuringScenario = outcome.failure?.kind === "target-exit";
        const exitedWithError = outcome.exitCode !== null && outcome.exitCode !== 0 && (outcome.failure === void 0 || outcome.failure.kind === "target-exit");
        const exitedBySignal = outcome.signal !== null && (outcome.failure === void 0 || outcome.failure.kind === "target-exit");
        const exitedUnsuccessfully = exitedWithError || exitedBySignal;
        if (!exitedDuringScenario && !exitedUnsuccessfully) {
          return [];
        }
        return [draft(
          context,
          "crash.process-exit",
          "target-exited",
          "The target process exited unexpectedly while executing the scenario.",
          stableTraceEvidence(context, true)
        )];
      }
    }],
    ["hang", {
      evaluate(context) {
        if (context.outcome.failure?.kind !== "timeout" || context.outcome.failure.phase !== "response") {
          return [];
        }
        const requests = sentRequests(context.scenario);
        const responseMessages = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord2(line.value);
          return message !== void 0 && ("result" in message || "error" in message) ? [message] : [];
        });
        const responseIds = responseMessages.flatMap((message) => {
          const id = readId(message.id);
          return id === void 0 ? [] : [id];
        });
        const request = requests.find((item) => {
          const id = item.id;
          return id !== void 0 && context.scenario.steps.some((step) => step.type === "await-response" && step.id === id) && !responseIds.some((responseId) => idKey(responseId) === idKey(id));
        });
        if (request === void 0) {
          return [];
        }
        const unmatchedResponse = responseMessages.some((message) => {
          const id = readId(message.id);
          if (id === void 0) {
            return true;
          }
          return !requests.some((sent) => sent.id !== void 0 && idKey(sent.id) === idKey(id));
        });
        if (unmatchedResponse) {
          return [];
        }
        return [draft(
          context,
          "hang.request-timeout",
          `request-timeout:${request.method ?? "unknown-method"}`,
          `The target did not answer the ${request.method ?? "unknown"} request before its timeout.`
        )];
      }
    }],
    ["liveness", {
      evaluate(context) {
        if (context.livenessProbe?.passed !== false) {
          return [];
        }
        return [draft(
          context,
          "liveness.probe-failed",
          "probe-failed",
          "The target failed its revision-specific liveness probe after the scenario."
        )];
      }
    }],
    ["state-consistency", {
      evaluate(context) {
        const comparison = context.baselineComparison;
        if (comparison === void 0 || canonicalJson(comparison.before) === canonicalJson(comparison.after)) {
          return [];
        }
        return [draft(
          context,
          "state-consistency.baseline-changed",
          "baseline-response-changed",
          "The baseline response changed after the scenario."
        )];
      }
    }],
    ["stdout-pollution", {
      evaluate(context) {
        const lines = parseStdout(context.trace);
        if (!lines.some((line) => line.error !== void 0 || !isJsonRpcMessage(line.value))) {
          return [];
        }
        return [draft(
          context,
          "stdout-pollution.non-protocol-bytes",
          "non-protocol-stdout",
          "The target wrote bytes to stdout that are not a JSON-RPC message."
        )];
      }
    }],
    ["jsonrpc-contract", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const seenResponses = /* @__PURE__ */ new Set();
        const concurrentHttpRequests = context.transport === "streamable-http" && context.scenario.steps.some((step) => (step.type === "send" || step.type === "send-raw") && step.wire?.transport === "streamable-http" && step.wire.fault === "concurrent-requests");
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord2(line.value);
          if (message === void 0 || !("result" in message || "error" in message)) {
            continue;
          }
          const id = readId(message.id);
          const key = id === void 0 ? void 0 : idKey(id);
          const request = key === void 0 ? void 0 : requestById.get(key);
          const nullIdError = isNullIdError(message);
          let violation;
          if (line.error !== void 0 || message.jsonrpc !== "2.0" || "result" in message && "error" in message) {
            violation = "invalid-response";
          } else if (nullIdError) {
            violation = void 0;
          } else if (id === void 0 || key === void 0) {
            violation = "invalid-response";
          } else if (request === void 0) {
            violation = "unmatched-response-id";
          } else if (seenResponses.has(key) && !concurrentHttpRequests) {
            violation = "duplicate-response";
          } else {
            seenResponses.add(key);
          }
          if (violation !== void 0) {
            findings.push(draft(
              context,
              "jsonrpc-contract.invalid-message",
              violation,
              `The target emitted a JSON-RPC response with a ${violation.replaceAll("-", " ")}.`
            ));
          }
        }
        return findings;
      }
    }],
    ["schema-response", {
      evaluate(context) {
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          if (line.error !== void 0 || !isJsonRpcMessage(line.value)) {
            continue;
          }
          if (isRecord9(line.value) && isNullIdError(line.value)) {
            continue;
          }
          const messageValidation = validateAgainstSchema(context.rules.revision, "JSONRPCMessage", line.value);
          if (!messageValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-message:${firstError(messageValidation.errors)}`,
              `The target emitted a message that does not match the revision's JSON-RPC schema: ${firstError(messageValidation.errors)}.`
            ));
            continue;
          }
          const message = asRecord2(line.value);
          if (message === void 0 || !("result" in message)) {
            continue;
          }
          const id = readId(message.id);
          const request = id === void 0 ? void 0 : requestById.get(idKey(id));
          const schemaName = request?.method === void 0 ? void 0 : context.rules.responseSchemas[request.method];
          if (schemaName === void 0) {
            continue;
          }
          const resultValidation = validateAgainstSchema(context.rules.revision, schemaName, message.result);
          if (!resultValidation.valid) {
            findings.push(draft(
              context,
              "schema-response.invalid-result",
              `invalid-result:${request?.method ?? "unknown-method"}:${schemaName}:${firstError(resultValidation.errors)}`,
              `The result for ${request?.method ?? "unknown"} does not match the ${schemaName} schema: ${firstError(resultValidation.errors)}.`
            ));
          }
        }
        return findings;
      }
    }],
    ["error-code", {
      evaluate(context) {
        const expectedById = new Map(
          (context.expectedErrors ?? []).map((expectation) => [idKey(expectation.id), expectation.code])
        );
        const requests = sentRequests(context.scenario);
        const requestById = indexRequestsById(requests);
        const findings = [];
        for (const line of parseResponseMessages(context)) {
          const message = asRecord2(line.value);
          const error = message === void 0 ? void 0 : asRecord2(message.error);
          const id = message === void 0 ? void 0 : readId(message.id);
          if (error === void 0 || typeof error.code !== "number" || id === void 0) {
            continue;
          }
          const expectedCode = expectedById.get(idKey(id));
          if (expectedCode === void 0 || expectedCode === error.code) {
            continue;
          }
          const method = requestById.get(idKey(id))?.method ?? "unknown-method";
          findings.push(draft(
            context,
            "error-code.unexpected-code",
            `error-code:${method}:${expectedCode}`,
            `The ${method} request returned error code ${error.code}; the expected code is ${expectedCode}.`
          ));
        }
        return findings;
      }
    }],
    ["error-leak", {
      evaluate(context) {
        const leaked = parseResponseMessages(context).some((line) => {
          const message = asRecord2(line.value);
          const error = message === void 0 ? void 0 : asRecord2(message.error);
          if (error === void 0) {
            return false;
          }
          const details = `${String(error.message ?? "")} ${safeStringify(error.data)}`;
          return /(?:\bat\s+.+:\d+:\d+|(?:[A-Za-z]:\\|\/(?:home|Users|private|var|opt|workspace)\/)[^\s"'<>]+)/i.test(details);
        });
        return leaked ? [draft(
          context,
          "error-leak.sensitive-detail",
          "stack-or-absolute-path",
          "An error response exposed a stack frame or an absolute filesystem path."
        )] : [];
      }
    }],
    ["accepted-malformed", {
      evaluate(context) {
        const malformed = sentRequests(context.scenario).filter((request) => request.message.jsonrpc !== "2.0" || typeof request.message.method !== "string" || request.message.id !== void 0 && readId(request.message.id) === void 0);
        const responses = parseResponseMessages(context).flatMap((line) => {
          const message = asRecord2(line.value);
          return message !== void 0 && "result" in message ? [message] : [];
        });
        if (!malformed.some((request) => request.id === void 0 || responses.some((response) => readId(response.id) === request.id))) {
          return [];
        }
        return [draft(
          context,
          "accepted-malformed.success-response",
          "malformed-request-accepted",
          "The target returned a success result for a malformed JSON-RPC request."
        )];
      }
    }],
    ["http-transport", {
      evaluate(context) {
        if (context.transport !== "streamable-http" || context.httpExchanges === void 0) {
          return [];
        }
        const findings = [];
        for (const exchange of context.httpExchanges) {
          if (exchange.requestMethod !== "POST" || exchange.requestFault !== void 0 || exchange.responseAborted === true) {
            continue;
          }
          let request;
          try {
            request = JSON.parse(exchange.requestBody);
          } catch {
            continue;
          }
          const message = asRecord2(request);
          if (message === void 0) {
            continue;
          }
          const isNotification = !("id" in message);
          if (isNotification) {
            if (exchange.responseStatus >= 200 && exchange.responseStatus < 300 && (exchange.responseStatus !== 202 || exchange.responseBody.length !== 0)) {
              findings.push(draft(
                context,
                "http.notification-response",
                `notification-response:${message.method ?? "unknown-method"}`,
                "The server accepted an HTTP notification without returning 202 Accepted and an empty body."
              ));
            }
            continue;
          }
          if (exchange.responseStatus < 200 || exchange.responseStatus >= 300) {
            continue;
          }
          const contentType = readHeader(exchange.responseHeaders, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
          if (contentType !== "application/json" && contentType !== "text/event-stream") {
            findings.push(draft(
              context,
              "http.response-media-type",
              `response-media-type:${contentType ?? "missing"}`,
              "The server returned a successful HTTP response without an allowed JSON or event-stream media type."
            ));
            continue;
          }
          const responseMessages = contentType === "application/json" ? [exchange.responseBody] : parseHttpEventData(exchange.responseBody);
          const validBody = responseMessages.length > 0 && responseMessages.every((body) => {
            try {
              return isJsonRpcMessage(JSON.parse(body));
            } catch {
              return false;
            }
          });
          if (!validBody) {
            findings.push(draft(
              context,
              "http.response-body-invalid",
              `response-body-invalid:${contentType}`,
              "The server returned a successful HTTP response whose body did not contain a JSON-RPC message."
            ));
          }
        }
        return findings;
      }
    }],
    ["resource-usage", {
      evaluate(context) {
        const traceBytes = context.transport === "stdio" ? context.outcome.stdoutBytes + context.outcome.stderrBytes : (context.httpExchanges ?? []).reduce(
          (total, exchange) => total + Buffer.byteLength(exchange.responseBody),
          0
        );
        if (traceBytes <= MAX_TRACE_BYTES) {
          return [];
        }
        return [draft(
          context,
          "resource-usage.outlier",
          "trace-output-over-1mib",
          `The target produced ${traceBytes} bytes of transport output during this scenario.`
        )];
      }
    }]
  ];
}
function registerBuiltInOracles() {
  for (const [name, oracle] of createOracles()) {
    if (!oracleRegistry.names().includes(name)) {
      oracleRegistry.register(name, oracle);
    }
  }
}
function draft(context, ruleId, signature, message, evidence) {
  const selectedEvidence = evidence ?? stableTraceEvidence(context);
  return {
    ruleId,
    signature,
    message,
    ...selectedEvidence.length === 0 ? {} : { evidence: selectedEvidence }
  };
}
function stableTraceEvidence(context, includeProcess = false) {
  const evidence = [];
  if (context.transport === "streamable-http") {
    evidence.push(...context.trace.events.filter((event) => event.channel === "http-request" || event.channel === "http-response").map((event) => ({ ...event, offsetMs: 0 })));
    if (includeProcess) {
      evidence.push(...context.trace.events.filter((event) => event.channel === "process").map((event) => ({ ...event, offsetMs: 0 })));
    }
    return evidence;
  }
  const channels = ["stdin", "stdout", "stderr"];
  for (const channel of channels) {
    const channelEvents = context.trace.events.filter((event) => event.channel === channel);
    if (channelEvents.length === 0) {
      continue;
    }
    const bytes = Buffer.concat(channelEvents.map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data)));
    const text = bytes.toString("utf8");
    const isUtf8 = Buffer.from(text, "utf8").equals(bytes);
    evidence.push({
      offsetMs: 0,
      channel,
      encoding: isUtf8 ? "utf8" : "base64",
      data: isUtf8 ? text : bytes.toString("base64")
    });
  }
  if (includeProcess) {
    evidence.push(...context.trace.events.filter((event) => event.channel === "process").map((event) => ({ ...event, offsetMs: 0 })));
  }
  return evidence;
}
function parseResponseMessages(context) {
  return context.transport === "stdio" ? parseStdout(context.trace) : context.responses.map((value) => ({ value }));
}
function readHeader(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
function parseHttpEventData(body) {
  const messages = [];
  let data = [];
  for (const line of body.split(/\r?\n/u)) {
    if (line.length === 0) {
      if (data.length > 0 && data.join("\n").length > 0) {
        messages.push(data.join("\n"));
        data = [];
      }
    } else if (line.startsWith("data:")) {
      data.push(line.slice(5).replace(/^ /u, ""));
    }
  }
  if (data.length > 0 && data.join("\n").length > 0) {
    messages.push(data.join("\n"));
  }
  return messages;
}
function parseStdout(trace) {
  const bytes = Buffer.concat(
    trace.events.filter((event) => event.channel === "stdout").map((event) => event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data))
  );
  const lines = [];
  let offset = 0;
  while (offset < bytes.length) {
    const newline = bytes.indexOf(10, offset);
    const end = newline < 0 ? bytes.length : newline;
    const raw = bytes.subarray(offset, end);
    offset = newline < 0 ? bytes.length : newline + 1;
    if (raw.length === 0 || raw.length === 1 && raw[0] === 13) {
      continue;
    }
    try {
      lines.push({ value: JSON.parse(raw.toString("utf8")) });
    } catch (error) {
      lines.push({ error: error instanceof Error ? error.message : String(error) });
    }
  }
  return lines;
}
function sentRequests(scenario) {
  const requests = [];
  for (const step of scenario.steps) {
    if (step.type === "send") {
      const message = asRecord2(step.message);
      if (message !== void 0) {
        requests.push(toSentRequest(message));
      }
    } else if (step.type === "send-raw") {
      const bytes = Buffer.from(step.bytesBase64, "base64");
      for (const frame of bytes.toString("utf8").split("\n")) {
        if (frame.trim().length === 0) {
          continue;
        }
        try {
          const message = asRecord2(JSON.parse(frame));
          if (message !== void 0) {
            requests.push(toSentRequest(message));
          }
        } catch {
          continue;
        }
      }
    }
  }
  return requests;
}
function toSentRequest(message) {
  const id = readId(message.id);
  return {
    ...id === void 0 ? {} : { id },
    ...typeof message.method === "string" ? { method: message.method } : {},
    message
  };
}
function indexRequestsById(requests) {
  const index = /* @__PURE__ */ new Map();
  for (const request of requests) {
    if (request.id !== void 0) {
      index.set(idKey(request.id), request);
    }
  }
  return index;
}
function isJsonRpcMessage(value) {
  if (!isRecord9(value) || value.jsonrpc !== "2.0") {
    return false;
  }
  if (typeof value.method === "string") {
    return value.id === void 0 || readId(value.id) !== void 0;
  }
  if (isNullIdError(value)) {
    return true;
  }
  return readId(value.id) !== void 0 && "result" in value !== "error" in value;
}
function isNullIdError(value) {
  return value.id === null && "error" in value && !("result" in value);
}
function readId(value) {
  return typeof value === "string" || typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function idKey(value) {
  return `${typeof value}:${String(value)}`;
}
function asRecord2(value) {
  return isRecord9(value) ? value : void 0;
}
function isRecord9(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function firstError(errors) {
  return errors[0] ?? "schema mismatch";
}
function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function safeStringify(value) {
  return JSON.stringify(value) ?? "";
}
registerBuiltInOracles();

// src/oracles/findings.ts
var import_node_crypto3 = require("crypto");
var MAX_EVIDENCE_BYTES = 512;
function createFinding(context, draft2, severityOverride) {
  const rule = context.rules.rules[draft2.ruleId];
  if (rule === void 0) {
    throw new Error(`Spec rules for ${context.rules.revision} do not define '${draft2.ruleId}'.`);
  }
  const id = (0, import_node_crypto3.createHash)("sha256").update(`${draft2.ruleId}\0${draft2.signature}`).digest("hex");
  return {
    id,
    ruleId: draft2.ruleId,
    severity: severityOverride ?? rule.severity,
    title: rule.title,
    message: draft2.message,
    cite: rule.cite,
    occurrences: 1,
    evidence: (draft2.evidence ?? []).map(toEvidenceExcerpt)
  };
}
function deduplicateFindings(findings) {
  const unique = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    const previous = unique.get(finding.id);
    if (previous === void 0) {
      unique.set(finding.id, finding);
      continue;
    }
    const evidence = new Map(
      [...previous.evidence, ...finding.evidence].map((excerpt) => [
        `${excerpt.channel}:${excerpt.encoding}:${excerpt.sha256}`,
        excerpt
      ])
    );
    unique.set(finding.id, {
      ...previous,
      occurrences: previous.occurrences + finding.occurrences,
      evidence: [...evidence.values()]
    });
  }
  return [...unique.values()].sort((left, right) => left.id.localeCompare(right.id));
}
function toEvidenceExcerpt(event) {
  const bytes = event.encoding === "base64" ? Buffer.from(event.data, "base64") : Buffer.from(event.data, "utf8");
  const excerpt = bytes.subarray(0, MAX_EVIDENCE_BYTES);
  const utf8 = excerpt.toString("utf8");
  const encoding = event.encoding === "base64" || !Buffer.from(utf8, "utf8").equals(excerpt) ? "base64" : "utf8";
  return {
    channel: event.channel,
    encoding,
    data: encoding === "base64" ? excerpt.toString("base64") : utf8,
    originalLengthBytes: bytes.length,
    sha256: (0, import_node_crypto3.createHash)("sha256").update(bytes).digest("hex"),
    truncated: bytes.length > excerpt.length,
    ...event.http === void 0 ? {} : { http: event.http }
  };
}

// src/oracles/index.ts
function evaluateOracles(context, selections) {
  const enabledSelections = selections?.filter((selection) => selection.enabled);
  const active = enabledSelections ?? oracleRegistry.names().map((name) => ({ name, enabled: true }));
  const severityOverrides = /* @__PURE__ */ new Map();
  for (const selection of enabledSelections ?? []) {
    for (const [ruleId, severity] of Object.entries(selection.severityOverrides ?? {})) {
      severityOverrides.set(ruleId, severity);
    }
  }
  const findings = active.flatMap(({ name }) => oracleRegistry.get(name).evaluate(context).map((draft2) => createFinding(context, draft2, severityOverrides.get(draft2.ruleId))));
  return deduplicateFindings(findings);
}

// src/core/run.ts
var WIRE_GENERATOR_WEIGHT = 10;
var defaultGeneratorSequence = [
  "schema-valid",
  "schema-mutated",
  "jsonrpc-envelope",
  "raw-json",
  "sequence",
  "tool-args",
  "resources",
  "prompts",
  ...Array.from({ length: WIRE_GENERATOR_WEIGHT }, () => "wire-fault")
];
var profiles = {
  quick: { cases: 18, durationMs: 3e4 },
  standard: { cases: 256, durationMs: 12e4 },
  deep: { cases: 2e3, durationMs: 6e5 }
};
async function runFuzz(options) {
  const baselineIds = options.baselinePath === void 0 ? void 0 : await readBaseline(options.baselinePath);
  const profileName = options.profile ?? "quick";
  const defaults = profiles[profileName];
  const caseLimit = options.cases ?? defaults.cases;
  const durationLimitMs = options.durationMs ?? defaults.durationMs;
  const workers = options.workers ?? 1;
  const confirmations = options.confirmations ?? 2;
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || !Number.isFinite(durationLimitMs) || durationLimitMs < 1 || !Number.isInteger(workers) || workers < 1 || workers > 32 || !Number.isInteger(confirmations) || confirmations < 1 || confirmations > 5) {
    throw new ScenarioError("Run budgets must be positive, and workers must be between 1 and 32.");
  }
  const seed = createRootSeed(options.seed);
  const startedAt = import_node_perf_hooks3.performance.now();
  const diagnostics = [];
  let surface = options.surface;
  if (surface === void 0) {
    try {
      surface = await inspectServer(options.revision, getTargetOptions(options));
    } catch (error) {
      if (!(error instanceof ScenarioError)) {
        throw error;
      }
      diagnostics.push(`Surface discovery failed; running only generators that do not need discovery: ${error.message}`);
      surface = {
        specRevision: options.revision,
        tools: [],
        resources: [],
        prompts: []
      };
    }
  }
  if (surface.specRevision !== options.revision) {
    throw new ScenarioError("Discovered surface revision does not match the selected specification profile.");
  }
  const restartPolicy = options.restartPolicy ?? "per-case";
  if (restartPolicy !== "per-case" && workers !== 1) {
    throw new ScenarioError("Restart policies 'on-failure' and 'never' require workers=1.");
  }
  const target = getTargetOptions(options);
  const transportName = target.transport ?? "stdio";
  const coverageSelection = options.coverageFeedback;
  let coverageProvider;
  let coverageDirectory;
  let coverageTarget;
  if (coverageSelection !== void 0) {
    if (target.transport !== "stdio" || workers !== 1 || restartPolicy !== "per-case") {
      throw new CoverageError(
        "Coverage feedback requires a spawned stdio target, workers=1, and restartPolicy='per-case'."
      );
    }
    if (!Number.isInteger(coverageSelection.batchSize) || coverageSelection.batchSize < 1 || coverageSelection.batchSize > 100) {
      throw new CoverageError("Coverage feedback batchSize must be an integer from 1 to 100.");
    }
    coverageProvider = coverageProviderRegistry.get(coverageSelection.provider);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(coverageProvider.environmentVariable)) {
      throw new CoverageError(
        `Coverage provider '${coverageSelection.provider}' declares an invalid environment variable name.`
      );
    }
    const configuredCoverageVariable = findEnvironmentVariable(target.env, coverageProvider.environmentVariable);
    const inheritedCoverageVariable = options.inheritEnvironment ? findEnvironmentVariable(process.env, coverageProvider.environmentVariable) : void 0;
    if (configuredCoverageVariable !== void 0 || inheritedCoverageVariable !== void 0) {
      throw new CoverageError(
        `Do not set ${configuredCoverageVariable ?? inheritedCoverageVariable} in target environment while coverage feedback is enabled.`
      );
    }
    coverageDirectory = await (0, import_promises4.mkdtemp)((0, import_node_path4.join)((0, import_node_os2.tmpdir)(), "mcp-wringer-coverage-"));
    coverageTarget = {
      ...target,
      env: {
        ...target.env,
        [coverageProvider.environmentVariable]: coverageDirectory
      }
    };
  }
  const scenarios = coverageSelection === void 0 ? generateScenarios(
    options.revision,
    surface,
    seed,
    caseLimit,
    options.generatorSequence ?? defaultGeneratorSequence,
    transportName,
    options.argumentStrategies,
    0,
    options.safety?.allowTools
  ) : [];
  const deadline = startedAt + durationLimitMs;
  const caseResults = Array.from({ length: caseLimit });
  let nextIndex = 0;
  let corpusEntriesAdded = 0;
  const corpusDirectory = options.corpusDirectory ?? (0, import_node_path4.resolve)(".mcp-wringer", "corpus");
  const adapter = transportRegistry.get(transportName);
  const recordCase = async (generated, index, session, runTarget = target) => {
    const scenario = addHealthChecks(generated, session === void 0);
    assertScenarioSafety(scenario, surface, options.safety);
    const currentSession = session ?? adapter.createSession({ ...runTarget, scenario });
    const result = await currentSession.execute(scenario, {
      closeAfterScenario: restartPolicy === "per-case" || coverageSelection !== void 0
    });
    const context = createOracleContext(scenario, result, options.revision);
    const findings2 = evaluateOracles(context, options.oracleSelections);
    caseResults[index] = { scenario, context, findings: findings2 };
    if (await recordNovelScenario(corpusDirectory, scenario, result.trace, seed)) {
      corpusEntriesAdded += 1;
    }
    if (restartPolicy === "per-case" || coverageSelection !== void 0) {
      return {};
    }
    const targetExited = result.outcome.exitCode !== null || result.outcome.signal !== null;
    if (restartPolicy === "on-failure" && (findings2.length > 0 || result.outcome.failure !== void 0 || targetExited)) {
      await currentSession.close(true);
      return {};
    }
    if (targetExited) {
      diagnostics.push(`Target exited during case ${scenario.id}; later cases were not run under restartPolicy=${restartPolicy}.`);
      await currentSession.close(true);
      return { stop: true };
    }
    return { session: currentSession };
  };
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= scenarios.length || import_node_perf_hooks3.performance.now() >= deadline) {
        return;
      }
      const scenario = scenarios[index];
      if (scenario !== void 0) {
        await recordCase(scenario, index);
      }
    }
  };
  let coverageFeedbackResult;
  if (coverageSelection !== void 0 && coverageProvider !== void 0 && coverageDirectory !== void 0 && coverageTarget !== void 0) {
    const selectedSequence = options.generatorSequence ?? defaultGeneratorSequence;
    const availableNames = generatorRegistry.names();
    const weights = /* @__PURE__ */ new Map();
    for (const name of selectedSequence) {
      if (availableNames.includes(name)) {
        weights.set(name, (weights.get(name) ?? 0) + 1);
      }
    }
    if (weights.size === 0) {
      await (0, import_promises4.rm)(coverageDirectory, { recursive: true, force: true });
      throw new CoverageError("Coverage feedback requires at least one registered generator in generatorSequence.");
    }
    const generatorOrder = [...weights.keys()];
    const generatorStats = new Map(generatorOrder.map((name) => [name, { batches: 0, newFeatures: 0 }]));
    const allFeatures = /* @__PURE__ */ new Set();
    let totalNewFeatures = 0;
    let batches = 0;
    const generatorBatches = [];
    let caseIndex = 0;
    try {
      while (caseIndex < caseLimit && import_node_perf_hooks3.performance.now() < deadline) {
        const selectedGenerator = chooseCoverageGenerator(generatorOrder, weights, generatorStats, batches);
        const batchSize = Math.min(coverageSelection.batchSize, caseLimit - caseIndex);
        const batchStartIndex = caseIndex;
        const batchScenarios = generateScenarios(
          options.revision,
          surface,
          seed,
          batchSize,
          [selectedGenerator],
          transportName,
          options.argumentStrategies,
          caseIndex,
          options.safety?.allowTools
        );
        let session;
        let completedCases = 0;
        try {
          for (let offset = 0; offset < batchScenarios.length && import_node_perf_hooks3.performance.now() < deadline; offset += 1) {
            const scenario = batchScenarios[offset];
            if (scenario === void 0) {
              continue;
            }
            const index = caseIndex + offset;
            const outcome = await recordCase(scenario, index, session, coverageTarget);
            session = outcome.session;
            if (caseResults[index] !== void 0) {
              completedCases += 1;
            }
            if (outcome.stop) {
              break;
            }
          }
        } finally {
          if (session !== void 0) {
            await session.close();
          }
        }
        caseIndex += completedCases;
        if (completedCases === 0) {
          break;
        }
        const batchTargetFailed = caseResults.slice(batchStartIndex, batchStartIndex + completedCases).some((item) => item !== void 0 && (item.context.outcome.failure !== void 0 || item.context.outcome.exitCode !== null || item.context.outcome.signal !== null));
        let currentFeatures;
        let coverageUnavailable = false;
        try {
          currentFeatures = await coverageProvider.collect(coverageDirectory);
        } catch (error) {
          if (!(error instanceof CoverageError) || !batchTargetFailed) {
            throw error;
          }
          diagnostics.push(
            `Coverage feedback was unavailable after a failed target batch: ${error.message}`
          );
          currentFeatures = /* @__PURE__ */ new Set();
          coverageUnavailable = true;
        }
        if (batchTargetFailed && currentFeatures.size === 0 && !coverageUnavailable) {
          diagnostics.push("Coverage feedback reported no executed features after a failed target batch.");
        }
        let newlyCovered = 0;
        for (const feature of currentFeatures) {
          if (!allFeatures.has(feature)) {
            allFeatures.add(feature);
            newlyCovered += 1;
          }
        }
        const stats = generatorStats.get(selectedGenerator);
        if (stats === void 0) {
          throw new CoverageError(`Coverage scheduler lost generator '${selectedGenerator}'.`);
        }
        stats.batches += 1;
        stats.newFeatures += newlyCovered;
        totalNewFeatures += newlyCovered;
        batches += 1;
        generatorBatches.push(selectedGenerator);
      }
      coverageFeedbackResult = {
        provider: coverageSelection.provider,
        batches,
        generatorBatches,
        features: allFeatures.size,
        newFeatures: totalNewFeatures
      };
    } finally {
      await (0, import_promises4.rm)(coverageDirectory, { recursive: true, force: true });
    }
  } else if (restartPolicy === "per-case") {
    await Promise.all(Array.from({ length: Math.min(workers, scenarios.length) }, worker));
  } else {
    let session;
    try {
      for (let index = 0; index < scenarios.length && import_node_perf_hooks3.performance.now() < deadline; index += 1) {
        const scenario = scenarios[index];
        if (scenario === void 0) {
          continue;
        }
        const outcome = await recordCase(scenario, index, session);
        session = outcome.session;
        if (outcome.stop) {
          break;
        }
      }
    } finally {
      if (session !== void 0) {
        await session.close();
      }
    }
  }
  const executed = caseResults.filter((item) => item !== void 0);
  const firstFindingCases = {};
  for (let index = 0; index < caseResults.length; index += 1) {
    for (const finding of caseResults[index]?.findings ?? []) {
      firstFindingCases[finding.ruleId] ??= index + 1;
    }
  }
  const observedFindings = deduplicateFindings(executed.flatMap((item) => item.findings));
  const findings = [];
  const reproducers = [];
  for (const finding of observedFindings) {
    const origin = executed.find((item) => item.findings.some((candidate) => candidate.id === finding.id));
    if (origin === void 0) {
      continue;
    }
    let confirmationCount = 0;
    for (let attempt = 0; attempt < confirmations; attempt += 1) {
      if (import_node_perf_hooks3.performance.now() >= deadline) {
        break;
      }
      const replay = await runSingleScenario({
        ...target,
        revision: options.revision,
        scenario: origin.scenario,
        surface,
        ...options.env === void 0 ? {} : { env: options.env },
        ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment },
        ...options.safety === void 0 ? {} : { safety: options.safety },
        ...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs },
        ...options.oracleSelections === void 0 ? {} : { oracleSelections: options.oracleSelections }
      });
      if (replay.findings.some((candidate) => candidate.id === finding.id)) {
        confirmationCount += 1;
      }
    }
    if (confirmationCount === confirmations) {
      findings.push(finding);
      reproducers.push({ findingId: finding.id, scenario: origin.scenario });
    } else {
      diagnostics.push(
        `Finding ${finding.id} (${finding.ruleId}) reproduced on only ${confirmationCount} of ${confirmations} confirmation attempts and is flaky.`
      );
    }
  }
  const baseline = baselineIds === void 0 ? void 0 : compareBaseline(baselineIds, findings);
  if (baseline !== void 0) {
    for (const id of baseline.newFindingIds) {
      diagnostics.push(`Finding ${id} is new relative to the configured baseline.`);
    }
    for (const id of baseline.staleFindingIds) {
      diagnostics.push(`Baseline finding ${id} is stale because it did not reproduce.`);
    }
  }
  return {
    seed,
    profile: profileName,
    casesRun: executed.length,
    durationMs: Math.max(0, import_node_perf_hooks3.performance.now() - startedAt),
    findings,
    diagnostics,
    corpusEntriesAdded,
    reproducers,
    ...Object.keys(firstFindingCases).length === 0 ? {} : { firstFindingCases: Object.fromEntries(Object.entries(firstFindingCases).sort(([left], [right]) => left.localeCompare(right))) },
    ...coverageFeedbackResult === void 0 ? {} : { coverageFeedback: coverageFeedbackResult },
    ...baseline === void 0 ? {} : { baseline }
  };
}
async function readBaseline(baselinePath) {
  let text;
  try {
    text = await (0, import_promises4.readFile)((0, import_node_path4.resolve)(baselinePath), "utf8");
  } catch (error) {
    throw new ScenarioError(
      `Could not read baseline '${baselinePath}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!isRecord10(value) || value.formatVersion !== 1 || !Array.isArray(value.findingIds) || !value.findingIds.every((id) => typeof id === "string" && id.length > 0) || new Set(value.findingIds).size !== value.findingIds.length) {
    throw new ScenarioError(
      `Baseline '${baselinePath}' must contain formatVersion 1 and a unique string array named findingIds.`
    );
  }
  return value.findingIds;
}
function compareBaseline(findingIds, findings) {
  const baselineIds = new Set(findingIds);
  const currentIds = new Set(findings.map((finding) => finding.id));
  return {
    newFindingIds: [...currentIds].filter((id) => !baselineIds.has(id)).sort(),
    staleFindingIds: [...baselineIds].filter((id) => !currentIds.has(id)).sort()
  };
}
function chooseCoverageGenerator(generatorOrder, weights, stats, totalBatches) {
  let selected;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const name of generatorOrder) {
    const current = stats.get(name);
    if (current === void 0) {
      continue;
    }
    if (current.batches === 0) {
      return name;
    }
    const weight = weights.get(name) ?? 1;
    const exploitation = current.newFeatures / current.batches;
    const exploration = Math.sqrt(2 * Math.log(totalBatches + 1) / current.batches) * Math.sqrt(weight);
    const score = exploitation + exploration;
    if (score > bestScore) {
      selected = name;
      bestScore = score;
    }
  }
  if (selected === void 0) {
    throw new CoverageError("Coverage scheduler could not select a registered generator.");
  }
  return selected;
}
function findEnvironmentVariable(environment, requestedName) {
  return Object.keys(environment ?? {}).find((name) => name.toUpperCase() === requestedName.toUpperCase());
}
async function runSingleScenario(options) {
  const scenario = addHealthChecks(options.scenario);
  assertScenarioSafety(scenario, options.surface, options.safety);
  const target = getTargetOptions(options);
  const result = await transportRegistry.get(target.transport ?? "stdio").run({ ...target, scenario });
  const context = createOracleContext(scenario, result, options.revision);
  return { scenario, result, context, findings: evaluateOracles(context, options.oracleSelections) };
}
function addHealthChecks(scenario, includeLifecycle = true) {
  if (scenario.steps.some((step) => step.type === "send" && isRecord10(step.message) && [scenario.id + "-baseline-before", scenario.id + "-liveness", scenario.id + "-baseline-after"].includes(String(step.message.id)))) {
    return scenario;
  }
  const profile = specProfiles.get(scenario.specRevision);
  const lifecycleStepCount = profile.lifecycleSteps(`${scenario.id}-lifecycle`).length;
  const hasDiscoveryBootstrap = scenario.specRevision === "2026-07-28" && scenario.steps[0]?.type === "send" && isRecord10(scenario.steps[0].message) && scenario.steps[0].message.method === "server/discover" && scenario.steps[0].message.id === `${scenario.id}-discover` && scenario.steps[1]?.type === "await-response" && scenario.steps[1].id === scenario.steps[0].message.id;
  const prefixStepCount = lifecycleStepCount + (hasDiscoveryBootstrap ? 2 : 0);
  const prefix = includeLifecycle ? scenario.steps.slice(0, prefixStepCount) : [];
  const existingSteps = scenario.steps.slice(prefixStepCount);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const closesInput = existingSteps.some((step) => step.type === "transport" && step.operation === "close-stdin");
  const healthSteps = [
    { type: "send", message: profile.request(profile.toolListMethod, beforeId) },
    { type: "await-response", id: beforeId, timeoutMs: 1e3 },
    ...existingSteps
  ];
  if (closesInput) {
    return { ...scenario, steps: [...prefix, ...healthSteps] };
  }
  healthSteps.push(
    { type: "send", message: profile.livenessProbe(livenessId) },
    { type: "await-response", id: livenessId, timeoutMs: 1e3 },
    { type: "send", message: profile.request(profile.toolListMethod, afterId) },
    { type: "await-response", id: afterId, timeoutMs: 1e3 }
  );
  return { ...scenario, steps: [...prefix, ...healthSteps] };
}
function createOracleContext(scenario, result, revision) {
  const profile = specProfiles.get(revision);
  const beforeId = `${scenario.id}-baseline-before`;
  const livenessId = `${scenario.id}-liveness`;
  const afterId = `${scenario.id}-baseline-after`;
  const before = getResultById(result.responses, beforeId);
  const liveness = getResponseById(result.responses, livenessId);
  const after = getResultById(result.responses, afterId);
  return {
    scenario,
    ...result,
    rules: profile.rules,
    ...result.httpExchanges === void 0 ? {} : { httpExchanges: result.httpExchanges },
    ...liveness === void 0 ? {} : {
      livenessProbe: {
        passed: !isErrorResponse(liveness)
      }
    },
    ...before === void 0 || after === void 0 ? {} : { baselineComparison: { before, after } },
    expectedErrors: expectedInvalidRequestErrors(scenario, profile.rules.errorCodes.invalidRequest)
  };
}
function getTargetOptions(options) {
  const common = {
    ...options.env === void 0 ? {} : { env: options.env },
    ...options.inheritEnvironment === void 0 ? {} : { inheritEnvironment: options.inheritEnvironment },
    ...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs }
  };
  if (options.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: options.url,
      ...options.command === void 0 ? {} : { command: options.command },
      ...options.args === void 0 ? {} : { args: options.args },
      ...options.allowNonLoopback === void 0 ? {} : { allowNonLoopback: options.allowNonLoopback },
      ...common
    };
  }
  return {
    transport: "stdio",
    command: options.command,
    args: options.args,
    ...common
  };
}
function expectedInvalidRequestErrors(scenario, code) {
  const expected = [];
  for (const step of scenario.steps) {
    if (step.type !== "send" || !isRecord10(step.message)) {
      continue;
    }
    const id = step.message.id;
    if (step.message.jsonrpc !== "2.0" && (typeof id === "string" || typeof id === "number")) {
      expected.push({ id, code });
    }
  }
  return expected;
}
function getResultById(responses, id) {
  const response = getResponseById(responses, id);
  if (response === void 0 || !isRecord10(response) || !("result" in response)) {
    return void 0;
  }
  return response.result;
}
function getResponseById(responses, id) {
  return responses.find((response) => isRecord10(response) && response.id === id);
}
function isErrorResponse(value) {
  return isRecord10(value) && "error" in value;
}
function isRecord10(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/config/load.ts
var import_promises5 = require("fs/promises");
var import_node_path6 = require("path");
var import__2 = __toESM(require__(), 1);

// src/reporters/console.ts
var severityOrder = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3
};
var consoleReporter = {
  render(findings) {
    const ordered = [...findings].sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity] || left.id.localeCompare(right.id));
    const lines = [`mcp-wringer: ${ordered.length} finding${ordered.length === 1 ? "" : "s"}`];
    for (const finding of ordered) {
      lines.push(
        `${finding.severity.toUpperCase()} ${finding.ruleId} ${finding.id}`,
        `  ${finding.message}`,
        `  ${finding.cite}`,
        `  occurrences: ${finding.occurrences}`
      );
    }
    return `${lines.join("\n")}
`;
  }
};

// src/reporters/json.ts
var jsonReporter = {
  render(findings) {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    return `${JSON.stringify({ formatVersion: 1, findings: ordered }, null, 2)}
`;
  }
};

// src/reporters/junit.ts
var junitReporter = {
  fileExtension: "xml",
  render(findings) {
    const ordered = [...findings].sort((left, right) => left.id.localeCompare(right.id));
    const testCases = ordered.map(
      (finding) => `    <testcase classname="${escapeXml(finding.ruleId)}" name="${escapeXml(finding.id)}"><failure type="${escapeXml(finding.severity)}" message="${escapeXml(finding.title)}">${escapeXml(finding.message)} [${escapeXml(finding.cite)}]</failure></testcase>`
    );
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      `  <testsuite name="mcp-wringer" tests="${ordered.length}" failures="${ordered.length}" errors="0" skipped="0">`,
      ...testCases,
      "  </testsuite>",
      "</testsuites>",
      ""
    ].join("\n");
  }
};
function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

// src/reporters/markdown.ts
var markdownReporter = {
  fileExtension: "md",
  render(findings) {
    const rows = [...findings].sort((left, right) => left.id.localeCompare(right.id)).map(
      (finding) => `| ${escapeCell(finding.severity)} | ${escapeCell(finding.ruleId)} | ${escapeCell(finding.title)} | ${escapeCell(finding.message)} | ${escapeCell(finding.cite)} |`
    );
    return [
      "# MCP Wringer findings",
      "",
      `Confirmed findings: ${findings.length}`,
      "",
      "| Severity | Rule | Title | Finding | Specification citation |",
      "|---|---|---|---|---|",
      ...rows,
      ""
    ].join("\n");
  }
};
function escapeCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
}

// src/reporters/registry.ts
var reporterRegistry = new ExtensionRegistry();

// src/reporters/sarif.ts
var severityLevels = {
  high: "error",
  medium: "warning",
  low: "warning",
  info: "note"
};
var sarifReporter = {
  fileExtension: "sarif",
  render(findings) {
    const rules = [...new Map(
      findings.map((finding) => [finding.ruleId, {
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.message }
      }])
    ).values()].sort((left, right) => left.id.localeCompare(right.id));
    const ruleIndices = new Map(rules.map((rule, index) => [rule.id, index]));
    const results = [...findings].sort((left, right) => left.id.localeCompare(right.id)).map((finding) => ({
      ruleId: finding.ruleId,
      ruleIndex: ruleIndices.get(finding.ruleId),
      level: severityLevels[finding.severity],
      message: { text: finding.message },
      partialFingerprints: { "mcp-wringer/finding-id": finding.id }
    }));
    return `${JSON.stringify({
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "@stackql/mcp-wringer",
            version: "0.1.0",
            rules
          }
        },
        results
      }]
    }, null, 2)}
`;
  }
};

// src/reporters/index.ts
reporterRegistry.register("console", consoleReporter);
reporterRegistry.register("json", jsonReporter);
reporterRegistry.register("junit", junitReporter);
reporterRegistry.register("markdown", markdownReporter);
reporterRegistry.register("sarif", sarifReporter);

// src/plugin/loader.ts
var import_node_path5 = require("path");
var import_node_url = require("url");

// src/config/profiles.ts
var profileRegistry = new ExtensionRegistry();
profileRegistry.register("quick", { cases: 18, durationMs: 3e4 });
profileRegistry.register("standard", { cases: 256, durationMs: 12e4 });
profileRegistry.register("deep", { cases: 2e3, durationMs: 6e5 });

// src/plugin/index.ts
var WRINGER_PLUGIN_API_VERSION = "0.1";
var pluginApi = {
  apiVersion: WRINGER_PLUGIN_API_VERSION,
  registerGenerator(name, generator) {
    generatorRegistry.register(name, generator);
  },
  registerArgumentStrategy(name, strategy) {
    argumentStrategyRegistry.register(name, strategy);
  },
  registerOracle(name, oracle) {
    oracleRegistry.register(name, oracle);
  },
  registerReporter(name, reporter) {
    reporterRegistry.register(name, reporter);
  },
  registerCoverageProvider(name, provider) {
    coverageProviderRegistry.register(name, provider);
  },
  registerProfile(name, profile) {
    profileRegistry.register(name, profile);
  }
};

// src/plugin/loader.ts
var loadedPlugins = /* @__PURE__ */ new Set();
async function loadConfiguredPlugins(specifiers, baseDirectory) {
  for (const specifier of specifiers) {
    const moduleUrl = getPluginUrl(specifier, baseDirectory);
    if (loadedPlugins.has(moduleUrl)) {
      continue;
    }
    let loaded;
    try {
      loaded = await import(moduleUrl);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Could not load configured plugin '${specifier}': ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
    const plugin = getDefaultPlugin(loaded, specifier);
    if (plugin.apiVersion !== WRINGER_PLUGIN_API_VERSION) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' requires API ${plugin.apiVersion}; this version supports ${WRINGER_PLUGIN_API_VERSION}.`
      );
    }
    try {
      plugin.register(pluginApi);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' failed while registering: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
    loadedPlugins.add(moduleUrl);
  }
}
function getPluginUrl(specifier, baseDirectory) {
  if (specifier.startsWith("file:")) {
    return new URL(specifier).href;
  }
  if (specifier.startsWith(".") || (0, import_node_path5.isAbsolute)(specifier) || specifier.includes("\\")) {
    return (0, import_node_url.pathToFileURL)((0, import_node_path5.resolve)(baseDirectory, specifier)).href;
  }
  return specifier;
}
function getDefaultPlugin(value, specifier) {
  if (!isRecord11(value) || !("default" in value) || !isRecord11(value.default)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' must provide a default plugin object.`);
  }
  const candidate = value.default;
  if (!isWringerPlugin(candidate)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' has an invalid default export.`);
  }
  return candidate;
}
function isWringerPlugin(value) {
  return value.apiVersion === WRINGER_PLUGIN_API_VERSION && typeof value.name === "string" && value.name.length > 0 && typeof value.register === "function";
}
function isRecord11(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/config/definition.ts
var severitySchema = {
  type: "string",
  enum: ["high", "medium", "low", "info"]
};
var optionsSchema = {
  type: "object",
  additionalProperties: true
};
var extensionSelection = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    enabled: { type: "boolean", default: true },
    options: { ...optionsSchema, default: {} }
  },
  required: ["name", "enabled", "options"]
};
var generatorSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    weight: { type: "integer", minimum: 1, default: 1 }
  },
  required: [...extensionSelection.required, "weight"]
};
var oracleSelection = {
  ...extensionSelection,
  properties: {
    ...extensionSelection.properties,
    severityOverrides: {
      type: "object",
      additionalProperties: severitySchema,
      default: {}
    }
  },
  required: [...extensionSelection.required, "severityOverrides"]
};
var commonProperties = {
  specRevision: {
    type: "string",
    enum: ["2025-11-25", "2026-07-28"],
    default: "2025-11-25",
    description: "MCP specification revision used for lifecycle and response validation."
  },
  seed: {
    oneOf: [{ type: "integer" }, { type: "string" }],
    description: "Root seed. Omit to generate a seed at run time."
  },
  cases: {
    type: "integer",
    minimum: 1,
    default: 18,
    description: "Maximum scenarios to execute."
  },
  durationMs: {
    type: "integer",
    minimum: 1,
    default: 3e4,
    description: "Maximum run duration in milliseconds."
  },
  workers: {
    type: "integer",
    minimum: 1,
    maximum: 32,
    default: 1,
    description: "Number of independent target workers."
  },
  restartPolicy: {
    type: "string",
    enum: ["per-case", "on-failure", "never"],
    default: "per-case",
    description: "When to restart a spawned target between scenarios."
  },
  timeoutMs: {
    type: "integer",
    minimum: 1,
    default: 5e3,
    description: "Default per-request and target startup timeout in milliseconds."
  },
  confirmations: {
    type: "integer",
    minimum: 1,
    maximum: 5,
    default: 2,
    description: "Fresh-target replays required to confirm a finding."
  },
  transport: {
    type: "string",
    enum: ["stdio", "streamable-http"],
    default: "stdio",
    description: "Transport used to communicate with the target."
  },
  url: {
    type: "string",
    pattern: "^https?://",
    description: "Streamable HTTP endpoint. Non-loopback attach requires explicit authorization."
  },
  command: {
    type: "string",
    minLength: 1,
    description: "Executable used to start a spawned target."
  },
  args: {
    type: "array",
    items: { type: "string" },
    default: [],
    description: "Argument array for the spawned target command."
  },
  env: {
    type: "object",
    additionalProperties: { type: "string" },
    default: {},
    description: "Environment variables passed to the spawned target."
  },
  inheritEnvironment: {
    type: "boolean",
    default: false,
    description: "Pass the caller's environment to the target in addition to configured values."
  },
  allowNonLoopback: {
    type: "boolean",
    default: false,
    description: "Authorize attach mode to connect to a non-loopback HTTP address."
  },
  allowTools: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Exact tool names permitted when they are not annotated read-only."
  },
  argumentStrategies: {
    type: "array",
    items: extensionSelection,
    default: [],
    description: "Argument strategy registry selections. Empty enables all registered strategies."
  },
  coverageFeedback: {
    type: "object",
    additionalProperties: false,
    properties: {
      enabled: {
        type: "boolean",
        default: false,
        description: "Enable experimental coverage-guided generator scheduling."
      },
      provider: {
        type: "string",
        minLength: 1,
        default: "node-v8",
        description: "Coverage provider used to collect target coverage at batch boundaries."
      },
      batchSize: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 8,
        description: "Scenarios per generator batch before coverage feedback is applied."
      }
    },
    required: ["enabled", "provider", "batchSize"],
    default: { enabled: false, provider: "node-v8", batchSize: 8 },
    description: "Experimental coverage feedback. Requires a spawned stdio target, one worker, and restartPolicy 'per-case'."
  },
  failOn: {
    ...severitySchema,
    default: "high",
    description: "Lowest finding severity that makes the CLI exit with code 1."
  },
  reportDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/reports",
    description: "Directory for run reports and reproducer files."
  },
  corpusDirectory: {
    type: "string",
    minLength: 1,
    default: ".mcp-wringer/corpus",
    description: "Directory for response-novelty corpus entries."
  },
  baselinePath: {
    type: "string",
    minLength: 1,
    description: "JSON file containing finding IDs to use as the baseline."
  },
  plugins: {
    type: "array",
    items: { type: "string", minLength: 1 },
    uniqueItems: true,
    default: [],
    description: "Explicit plugin module paths or package specifiers to load."
  },
  generators: {
    type: "array",
    items: generatorSelection,
    default: [],
    description: "Generator registry selections. Empty uses the built-in default schedule."
  },
  oracles: {
    type: "array",
    items: oracleSelection,
    default: [],
    description: "Oracle registry selections. Empty enables every registered oracle."
  },
  reporters: {
    type: "array",
    items: extensionSelection,
    default: [
      { name: "console", enabled: true, options: {} },
      { name: "json", enabled: true, options: {} }
    ],
    description: "Report formats selected by registry name."
  }
};
var configDefinition = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
  title: "MCP Wringer configuration",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      default: "https://raw.githubusercontent.com/stackql/mcp-wringer/main/config.schema.json",
      description: "JSON Schema used by editors to validate this file."
    },
    profile: {
      type: "string",
      minLength: 1,
      default: "quick",
      description: "Named partial configuration profile."
    },
    profiles: {
      type: "object",
      default: {},
      additionalProperties: { $ref: "#/$defs/profile" },
      description: "User-defined named partial configuration profiles."
    },
    ...commonProperties
  },
  required: [
    "$schema",
    "profile",
    "profiles",
    "specRevision",
    "cases",
    "durationMs",
    "workers",
    "restartPolicy",
    "timeoutMs",
    "confirmations",
    "transport",
    "args",
    "env",
    "inheritEnvironment",
    "allowNonLoopback",
    "allowTools",
    "argumentStrategies",
    "coverageFeedback",
    "failOn",
    "reportDirectory",
    "corpusDirectory",
    "plugins",
    "generators",
    "oracles",
    "reporters"
  ],
  $defs: {
    profile: {
      type: "object",
      additionalProperties: false,
      properties: commonProperties
    }
  }
};

// src/config/load.ts
var defaultConfigPath = "mcp-wringer.config.json";
async function loadConfiguration(options = {}) {
  const environment = options.environment ?? process.env;
  const envConfigPath = environment.MCP_WRINGER_CONFIG;
  const configPath = options.configPath ?? envConfigPath;
  const path = (0, import_node_path6.resolve)(configPath ?? defaultConfigPath);
  const fileConfig = await readConfigFile(path, configPath !== void 0);
  validatePartialConfig(fileConfig, path);
  const environmentConfig = readEnvironmentConfig(environment);
  const defaults = createDefaultConfig();
  const selection = mergeConfig(defaults, fileConfig, environmentConfig, options.overrides ?? {});
  const pluginSpecifiers = selection.plugins;
  await loadConfiguredPlugins(pluginSpecifiers, configPath === void 0 ? process.cwd() : (0, import_node_path6.dirname)(path));
  const selectedProfile = selection.profile;
  const fileProfiles = isRecord12(fileConfig.profiles) ? fileConfig.profiles : {};
  const profile = fileProfiles[selectedProfile] ?? getRegisteredProfile(selectedProfile);
  const config = mergeConfig(defaults, profile, fileConfig, environmentConfig, options.overrides ?? {});
  normalizeExtensionDefaults(config);
  validateResolvedConfig(config);
  validateExtensionNames(config);
  const origins = {};
  markOrigins(defaults, "", "defaults", origins);
  markOrigins(profile, "", `profile:${selectedProfile}`, origins);
  markOrigins(fileConfig, "", "config file", origins);
  markOrigins(environmentConfig, "", "environment", origins);
  markOrigins(options.overrides ?? {}, "", "command line", origins);
  return {
    config,
    origins,
    ...fileConfigPathWasRead(configPath, environment, path) ? { path } : {}
  };
}
function fileConfigPathWasRead(configPath, environment, resolvedPath) {
  return configPath !== void 0 || environment.MCP_WRINGER_CONFIG !== void 0 || resolvedPath === (0, import_node_path6.resolve)(defaultConfigPath);
}
async function readConfigFile(path, required) {
  let contents;
  try {
    contents = await (0, import_promises5.readFile)(path, "utf8");
  } catch (error) {
    if (!required && isNodeError3(error) && error.code === "ENOENT") {
      return {};
    }
    throw new WringerError(
      "CONFIG_ERROR",
      `Could not read configuration file '${path}': ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  let value;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new WringerError(
      "CONFIG_ERROR",
      `Configuration file '${path}' is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!isRecord12(value)) {
    throw new WringerError("CONFIG_ERROR", `Configuration file '${path}' must contain a JSON object.`);
  }
  return value;
}
function createDefaultConfig() {
  const validator = new import__2.Ajv2020({ allErrors: true, useDefaults: true, strict: false }).compile(configDefinition);
  const value = {};
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "built-in defaults"));
  }
  return value;
}
function validatePartialConfig(value, path) {
  const withDefaults = mergeConfig(createDefaultConfig(), value);
  const validator = new import__2.Ajv2020({ allErrors: true, useDefaults: true, strict: false }).compile(configDefinition);
  if (!validator(withDefaults)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, path));
  }
}
function validateResolvedConfig(value) {
  const validator = new import__2.Ajv2020({ allErrors: true, strict: false }).compile(configDefinition);
  if (!validator(value)) {
    throw new WringerError("CONFIG_ERROR", formatValidationErrors(validator.errors, value, "resolved configuration"));
  }
}
function readEnvironmentConfig(environment) {
  const value = {};
  for (const key of Object.keys(configDefinition.properties)) {
    if (key === "$schema" || key === "profiles") {
      continue;
    }
    const name = `MCP_WRINGER_${toEnvironmentName(key)}`;
    const raw = environment[name];
    if (raw === void 0) {
      continue;
    }
    value[key] = parseEnvironmentValue(raw, key);
  }
  return value;
}
function parseEnvironmentValue(value, key) {
  if (["seed"].includes(key)) {
    const numeric = Number(value);
    return value.trim() !== "" && Number.isSafeInteger(numeric) ? numeric : value;
  }
  if (["cases", "durationMs", "workers", "timeoutMs", "confirmations"].includes(key)) {
    if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be a positive integer.`);
    }
    return Number(value);
  }
  if (["inheritEnvironment", "allowNonLoopback"].includes(key)) {
    if (value !== "true" && value !== "false") {
      throw new WringerError("CONFIG_ERROR", `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must be true or false.`);
    }
    return value === "true";
  }
  if (["args", "env", "allowTools", "argumentStrategies", "coverageFeedback", "plugins", "generators", "oracles", "reporters", "profiles"].includes(key)) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new WringerError(
        "CONFIG_ERROR",
        `Environment variable MCP_WRINGER_${toEnvironmentName(key)} must contain JSON: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }
  return value;
}
function toEnvironmentName(key) {
  return key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase();
}
function mergeConfig(...layers) {
  const merged = {};
  for (const layer of layers) {
    mergeObject(merged, layer);
  }
  return merged;
}
function mergeObject(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isRecord12(value) && isRecord12(target[key])) {
      mergeObject(target[key], value);
    } else if (isRecord12(value)) {
      const nested = {};
      mergeObject(nested, value);
      target[key] = nested;
    } else {
      target[key] = value;
    }
  }
}
function normalizeExtensionDefaults(config) {
  config.argumentStrategies = config.argumentStrategies.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {}
  }));
  config.generators = config.generators.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    weight: selection.weight ?? 1,
    options: selection.options ?? {}
  }));
  config.oracles = config.oracles.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {},
    severityOverrides: selection.severityOverrides ?? {}
  }));
  config.reporters = config.reporters.map((selection) => ({
    ...selection,
    enabled: selection.enabled ?? true,
    options: selection.options ?? {}
  }));
}
function validateExtensionNames(config) {
  for (const selection of config.argumentStrategies) {
    assertRegistered("argument strategy", selection.name, argumentStrategyRegistry.names());
  }
  assertRegistered("coverage provider", config.coverageFeedback.provider, coverageProviderRegistry.names());
  if (config.argumentStrategies.length > 0 && !config.argumentStrategies.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one argument strategy must be enabled.");
  }
  for (const selection of config.generators) {
    assertRegistered("generator", selection.name, generatorRegistry.names());
  }
  for (const selection of config.oracles) {
    assertRegistered("oracle", selection.name, oracleRegistry.names());
    const ruleNames = Object.keys(specProfiles.get(config.specRevision).rules.rules);
    for (const ruleId of Object.keys(selection.severityOverrides)) {
      if (!ruleNames.includes(ruleId)) {
        const suggestion = nearestName(ruleId, ruleNames);
        throw new WringerError(
          "CONFIG_ERROR",
          `Unknown oracle rule '${ruleId}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
        );
      }
    }
  }
  for (const selection of config.reporters) {
    assertRegistered("reporter", selection.name, reporterRegistry.names());
  }
  const enabledGenerators = config.generators.filter((selection) => selection.enabled);
  if (config.generators.length > 0 && enabledGenerators.length === 0) {
    throw new WringerError("CONFIG_ERROR", "At least one generator must be enabled.");
  }
  if (!config.reporters.some((selection) => selection.enabled)) {
    throw new WringerError("CONFIG_ERROR", "At least one reporter must be enabled.");
  }
}
function assertRegistered(kind, name, available) {
  if (available.includes(name)) {
    return;
  }
  const suggestion = nearestName(name, available);
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown ${kind} '${name}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
  );
}
function getRegisteredProfile(name) {
  if (profileRegistry.names().includes(name)) {
    return profileRegistry.get(name);
  }
  const suggestion = nearestName(name, profileRegistry.names());
  throw new WringerError(
    "CONFIG_ERROR",
    `Unknown profile '${name}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`
  );
}
function nearestName(value, options) {
  const ranked = options.map((option) => ({ option, distance: editDistance(value.toLowerCase(), option.toLowerCase()) })).sort((left, right) => left.distance - right.distance || left.option.localeCompare(right.option));
  const best = ranked[0];
  return best !== void 0 && best.distance <= Math.max(2, Math.ceil(value.length / 3)) ? best.option : void 0;
}
function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0] ?? 0;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex] ?? 0;
      row[rightIndex] = Math.min(
        current + 1,
        (row[rightIndex - 1] ?? 0) + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}
function markOrigins(value, prefix, origin, origins) {
  if (isRecord12(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && prefix.length > 0) {
      origins[prefix] = origin;
    }
    for (const [key, child] of entries) {
      markOrigins(child, prefix.length === 0 ? key : `${prefix}.${key}`, origin, origins);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => markOrigins(child, `${prefix}.${index}`, origin, origins));
    if (value.length === 0) {
      origins[prefix] = origin;
    }
    return;
  }
  origins[prefix] = origin;
}
function formatValidationErrors(errors, value, label) {
  const error = errors?.[0];
  if (error === void 0) {
    return `Invalid ${label}.`;
  }
  if (error.keyword === "additionalProperties" && isRecord12(value)) {
    const unknown = error.params?.additionalProperty;
    if (typeof unknown === "string") {
      const suggestion = nearestName(unknown, Object.keys(configDefinition.properties));
      return `Unknown configuration key '${unknown}'.${suggestion === void 0 ? "" : ` Did you mean '${suggestion}'?`}`;
    }
  }
  const path = error.instancePath ?? "";
  return `Invalid ${label}${path.length === 0 ? "" : ` at ${path}`}: ${error.message ?? "validation failed"}.`;
}
function isRecord12(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError3(error) {
  return error instanceof Error && "code" in error;
}

// src/reporters/run.ts
var import_promises7 = require("fs/promises");
var import_node_path7 = require("path");

// src/core/reproducer.ts
var import_promises6 = require("fs/promises");

// src/core/scenario.ts
var BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function validateScenario(value) {
  if (!isRecord13(value) || value.formatVersion !== 1 || typeof value.id !== "string") {
    throw new ScenarioError("Scenario must have formatVersion 1 and a string id.");
  }
  assertOnlyKeys(value, ["formatVersion", "id", "specRevision", "description", "steps"], "Scenario");
  if (value.id.length === 0 || value.description !== void 0 && typeof value.description !== "string") {
    throw new ScenarioError("Scenario id must not be empty and description must be a string when present.");
  }
  if (!isSpecRevision(value.specRevision)) {
    throw new ScenarioError("Scenario has an unsupported specRevision.");
  }
  if (!Array.isArray(value.steps)) {
    throw new ScenarioError("Scenario steps must be an array.");
  }
  value.steps.forEach((step, index) => validateStep(step, index));
}
function validateReproducer(value) {
  if (!isRecord13(value) || value.formatVersion !== 1 || !isSpecRevision(value.specRevision)) {
    throw new ScenarioError("Reproducer must have formatVersion 1 and a supported specRevision.");
  }
  assertOnlyKeys(value, ["formatVersion", "specRevision", "seed", "target", "scenario"], "Reproducer");
  if (value.seed !== void 0 && (typeof value.seed !== "number" || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 4294967295)) {
    throw new ScenarioError("Reproducer seed must be an unsigned 32-bit integer when present.");
  }
  if (!isRecord13(value.target)) {
    throw new ScenarioError("Reproducer target must be an object.");
  }
  const target = value.target;
  const isHttp = target.transport === "streamable-http";
  const isStdio = target.transport === "stdio" || target.transport === void 0;
  if (!isHttp && !isStdio || isHttp && (typeof target.url !== "string" || !isHttpUrl(target.url) || target.command !== void 0 && (typeof target.command !== "string" || target.command.length === 0) || target.args !== void 0 && (!Array.isArray(target.args) || !target.args.every((arg) => typeof arg === "string")) || target.command === void 0 !== (target.args === void 0)) || isStdio && (typeof target.command !== "string" || target.command.length === 0 || !Array.isArray(target.args) || !target.args.every((arg) => typeof arg === "string"))) {
    throw new ScenarioError("Reproducer target must contain a valid stdio command or HTTP URL.");
  }
  assertOnlyKeys(
    target,
    isHttp ? ["transport", "url", "command", "args", "environmentNames"] : ["transport", "command", "args", "environmentNames"],
    "Reproducer target"
  );
  if (!Array.isArray(target.environmentNames) || !target.environmentNames.every((name) => typeof name === "string") || new Set(target.environmentNames).size !== target.environmentNames.length) {
    throw new ScenarioError("Reproducer target environmentNames must contain unique strings.");
  }
  validateScenario(value.scenario);
  if (value.scenario.specRevision !== value.specRevision) {
    throw new ScenarioError("Reproducer and scenario specRevision values must match.");
  }
}
function validateStep(value, index) {
  if (!isRecord13(value) || typeof value.type !== "string") {
    throw new ScenarioError(`Scenario step ${index} must be an object with a type.`);
  }
  switch (value.type) {
    case "send":
      assertOnlyKeys(value, ["type", "message", "wire"], `Scenario step ${index}`);
      if (!("message" in value) || !isJsonValue3(value.message)) {
        throw new ScenarioError(`Scenario step ${index} must contain a JSON message.`);
      }
      validateWire(value.wire, index);
      return;
    case "send-raw":
      assertOnlyKeys(value, ["type", "bytesBase64", "wire"], `Scenario step ${index}`);
      if (typeof value.bytesBase64 !== "string" || !BASE64_PATTERN.test(value.bytesBase64)) {
        throw new ScenarioError(`Scenario step ${index} has invalid base64 bytes.`);
      }
      validateWire(value.wire, index);
      return;
    case "await-response":
      assertOnlyKeys(value, ["type", "id", "timeoutMs"], `Scenario step ${index}`);
      if (value.id !== void 0 && typeof value.id !== "string" && typeof value.id !== "number") {
        throw new ScenarioError(`Scenario step ${index} has an invalid response id.`);
      }
      if (value.timeoutMs !== void 0 && !isPositiveNumber(value.timeoutMs)) {
        throw new ScenarioError(`Scenario step ${index} timeoutMs must be positive.`);
      }
      return;
    case "transport":
      assertOnlyKeys(value, ["type", "operation"], `Scenario step ${index}`);
      if (value.operation !== "close-stdin") {
        throw new ScenarioError(`Scenario step ${index} has an unsupported transport operation.`);
      }
      return;
    case "delay":
      assertOnlyKeys(value, ["type", "durationMs"], `Scenario step ${index}`);
      if (!isPositiveNumber(value.durationMs)) {
        throw new ScenarioError(`Scenario step ${index} durationMs must be positive.`);
      }
      return;
    default:
      throw new ScenarioError(`Scenario step ${index} has unknown type '${value.type}'.`);
  }
}
function validateWire(value, index) {
  if (value === void 0) {
    return;
  }
  if (!isRecord13(value) || value.transport !== "stdio" && value.transport !== "streamable-http") {
    throw new ScenarioError(`Scenario step ${index} has an invalid wire descriptor.`);
  }
  if (value.transport === "stdio") {
    assertOnlyKeys(value, ["transport", "chunks", "delayMs"], `Scenario step ${index} wire descriptor`);
    if (value.chunks !== void 0 && (!Array.isArray(value.chunks) || !value.chunks.every((chunk) => Number.isInteger(chunk) && chunk > 0))) {
      throw new ScenarioError(`Scenario step ${index} stdio chunks must be positive integers.`);
    }
    if (value.delayMs !== void 0 && (typeof value.delayMs !== "number" || !Number.isFinite(value.delayMs) || value.delayMs < 0)) {
      throw new ScenarioError(`Scenario step ${index} stdio delayMs must not be negative.`);
    }
    return;
  }
  assertOnlyKeys(value, ["transport", "fault", "options"], `Scenario step ${index} wire descriptor`);
  if (typeof value.fault !== "string" || value.fault.length === 0) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire descriptors require a fault name.`);
  }
  if (value.options !== void 0 && (!isRecord13(value.options) || !isJsonValue3(value.options))) {
    throw new ScenarioError(`Scenario step ${index} HTTP wire options must be a JSON object.`);
  }
}
function isSpecRevision(value) {
  return value === "2025-11-25" || value === "2026-07-28";
}
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}
function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function isRecord13(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isJsonValue3(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue3);
  }
  if (isRecord13(value)) {
    return Object.values(value).every(isJsonValue3);
  }
  return false;
}
function assertOnlyKeys(value, allowed, label) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    throw new ScenarioError(`${label} contains unsupported field(s): ${unexpected.join(", ")}.`);
  }
}

// src/core/reproducer.ts
async function saveReproducer(path, reproducer) {
  validateReproducer(reproducer);
  await (0, import_promises6.writeFile)(path, `${JSON.stringify(reproducer, null, 2)}
`, "utf8");
}
function createReproducer(scenario, target, seed) {
  const environmentNames = [...new Set(target.environmentNames ?? [])].sort();
  const descriptor = "transport" in target && target.transport === "streamable-http" ? {
    transport: "streamable-http",
    url: target.url,
    ...target.command === void 0 ? {} : { command: target.command },
    ...target.args === void 0 ? {} : { args: [...target.args] },
    environmentNames
  } : {
    transport: "stdio",
    command: target.command,
    args: [...target.args],
    environmentNames
  };
  return {
    formatVersion: 1,
    specRevision: scenario.specRevision,
    ...seed === void 0 ? {} : { seed },
    target: descriptor,
    scenario
  };
}

// src/reporters/run.ts
async function writeRunReports(options) {
  const { directory, run } = options;
  const reproducerDirectory = (0, import_node_path7.join)(directory, "reproducers");
  await (0, import_promises7.mkdir)(reproducerDirectory, { recursive: true });
  const findingsPath = (0, import_node_path7.join)(directory, "findings.json");
  const metadataPath = (0, import_node_path7.join)(directory, "run-metadata.json");
  const findingsDocument = {
    formatVersion: 1,
    seed: run.seed,
    findings: sortFindings(run.findings)
  };
  const metadata = {
    formatVersion: 1,
    seed: run.seed,
    profile: run.profile,
    casesRun: run.casesRun,
    durationMs: run.durationMs,
    corpusEntriesAdded: run.corpusEntriesAdded,
    diagnostics: run.diagnostics,
    ...run.firstFindingCases === void 0 ? {} : { firstFindingCases: run.firstFindingCases },
    ...run.coverageFeedback === void 0 ? {} : { coverageFeedback: run.coverageFeedback },
    ...run.baseline === void 0 ? {} : { baseline: run.baseline }
  };
  await (0, import_promises7.writeFile)(metadataPath, `${JSON.stringify(metadata, null, 2)}
`, "utf8");
  const paths = [];
  const selections = options.reporters ?? [{ name: "json", enabled: true, options: {} }];
  if (selections.some((selection) => selection.enabled && selection.name === "json")) {
    await (0, import_promises7.writeFile)(findingsPath, `${JSON.stringify(findingsDocument, null, 2)}
`, "utf8");
    paths.push(findingsPath);
  }
  paths.push(metadataPath);
  for (const selection of selections) {
    if (!selection.enabled || selection.name === "console" || selection.name === "json") {
      continue;
    }
    const reporter = reporterRegistry.get(selection.name);
    const extension = reporter.fileExtension ?? "txt";
    const path = (0, import_node_path7.join)(directory, `${selection.name}.${extension}`);
    await (0, import_promises7.writeFile)(path, reporter.render(run.findings, selection.options), "utf8");
    paths.push(path);
  }
  const target = {
    ...options.target,
    environmentNames: [...new Set(options.environmentNames)].sort()
  };
  for (const item of run.reproducers) {
    const reproducer = createReproducer(item.scenario, target, run.seed);
    const path = (0, import_node_path7.join)(reproducerDirectory, `${item.findingId}.repro.json`);
    await saveReproducer(path, reproducer);
    paths.push(path);
  }
  return paths;
}
function sortFindings(findings) {
  return [...findings].sort((left, right) => left.id.localeCompare(right.id));
}

// src/action/index.ts
var severities = ["high", "medium", "low", "info"];
async function main() {
  const overrides = {};
  const configPath = input("config_path");
  const profile = input("profile");
  const seedInput = input("seed");
  const failOn = input("fail_on");
  const reportDirectory = input("report_directory");
  const command = input("command");
  const argsInput = input("args");
  const url = input("url");
  const args = argsInput.length === 0 ? [] : parseStringArray(argsInput, "args");
  if (profile.length > 0) {
    overrides.profile = profile;
  }
  if (seedInput.length > 0) {
    overrides.seed = seedInput;
  }
  if (failOn.length > 0) {
    if (!severities.includes(failOn)) {
      throw new WringerError("USAGE_ERROR", "The fail_on input must be high, medium, low, or info.");
    }
    overrides.failOn = failOn;
  }
  if (reportDirectory.length > 0) {
    overrides.reportDirectory = reportDirectory;
  }
  if (command.length > 0) {
    overrides.command = command;
    if (argsInput.length > 0) {
      overrides.args = args;
    }
  } else if (argsInput.length > 0) {
    overrides.args = args;
  }
  if (url.length > 0) {
    overrides.transport = "streamable-http";
    overrides.url = url;
  }
  if (input("allow_non_loopback") === "true") {
    overrides.allowNonLoopback = true;
  }
  const loaded = await loadConfiguration({
    ...configPath.length === 0 ? {} : { configPath },
    overrides
  });
  const config = loaded.config;
  const target = getTarget(config, parseEnvironment(input("env")));
  const seed = createRootSeed(config.seed);
  process.stderr.write(`Seed: ${seed}
`);
  const reporters = ensureActionReporters(config.reporters);
  const result = await runFuzz({
    ...target,
    revision: config.specRevision,
    seed,
    profile: config.profile,
    cases: config.cases,
    durationMs: config.durationMs,
    workers: config.workers,
    restartPolicy: config.restartPolicy,
    timeoutMs: config.timeoutMs,
    confirmations: config.confirmations,
    env: target.env ?? {},
    inheritEnvironment: config.inheritEnvironment,
    safety: { allowTools: config.allowTools },
    corpusDirectory: config.corpusDirectory,
    ...config.baselinePath === void 0 ? {} : { baselinePath: config.baselinePath },
    ...config.generators.length === 0 ? {} : {
      generatorSequence: config.generators.filter((selection) => selection.enabled).flatMap((selection) => Array.from({ length: selection.weight }, () => selection.name))
    },
    ...config.argumentStrategies.length === 0 ? {} : { argumentStrategies: config.argumentStrategies },
    ...config.oracles.length === 0 ? {} : { oracleSelections: config.oracles },
    ...config.coverageFeedback.enabled ? {
      coverageFeedback: {
        provider: config.coverageFeedback.provider,
        batchSize: config.coverageFeedback.batchSize
      }
    } : {}
  });
  const reportDirectoryPath = (0, import_node_path8.resolve)(config.reportDirectory);
  const environmentNames = [
    .../* @__PURE__ */ new Set([
      ...Object.keys(target.env ?? {}),
      ...config.inheritEnvironment ? Object.keys(process.env) : []
    ])
  ].sort();
  await writeRunReports({
    directory: reportDirectoryPath,
    run: result,
    target: toReproducerTarget(target),
    environmentNames,
    reporters
  });
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath === void 0 || summaryPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_STEP_SUMMARY is not set.");
  }
  await (0, import_promises8.appendFile)(summaryPath, await (0, import_promises8.readFile)((0, import_node_path8.join)(reportDirectoryPath, "markdown.md"), "utf8"), "utf8");
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of result.findings) {
    counts[finding.severity] += 1;
  }
  for (const [name, value] of Object.entries({
    finding_count: String(result.findings.length),
    high_count: String(counts.high),
    medium_count: String(counts.medium),
    low_count: String(counts.low),
    info_count: String(counts.info),
    sarif_path: (0, import_node_path8.join)(reportDirectoryPath, "sarif.sarif"),
    report_directory: reportDirectoryPath,
    seed: String(result.seed)
  })) {
    await setOutput(name, value);
  }
  for (const diagnostic of result.diagnostics) {
    process.stderr.write(`Diagnostic: ${diagnostic}
`);
  }
  const threshold = config.failOn;
  const hasFailingFinding = result.findings.some((finding) => severities.indexOf(finding.severity) <= severities.indexOf(threshold));
  const hasBaselineMismatch = result.baseline !== void 0 && (result.baseline.newFindingIds.length > 0 || result.baseline.staleFindingIds.length > 0);
  if (hasFailingFinding || hasBaselineMismatch) {
    process.exitCode = 1;
  }
}
function getTarget(config, inputEnvironment) {
  const env = { ...config.env, ...inputEnvironment };
  const common = {
    env,
    inheritEnvironment: config.inheritEnvironment,
    timeoutMs: config.timeoutMs
  };
  if (config.transport === "streamable-http") {
    if (config.url === void 0) {
      throw new WringerError("CONFIG_ERROR", "Streamable HTTP requires a configured or action-input URL.");
    }
    return {
      transport: "streamable-http",
      url: config.url,
      ...config.command === void 0 ? {} : { command: config.command, args: config.args },
      allowNonLoopback: config.allowNonLoopback,
      ...common
    };
  }
  if (config.command === void 0) {
    throw new WringerError("USAGE_ERROR", "The command input or a configured command is required for stdio.");
  }
  if (config.url !== void 0 || config.allowNonLoopback) {
    throw new WringerError("CONFIG_ERROR", "URL and non-loopback settings require transport streamable-http.");
  }
  return {
    transport: "stdio",
    command: config.command,
    args: config.args,
    ...common
  };
}
function ensureActionReporters(configured) {
  const reporters = configured.map((selection) => ({ ...selection }));
  for (const name of ["sarif", "markdown"]) {
    const existing = reporters.find((selection) => selection.name === name);
    if (existing === void 0) {
      reporters.push({ name, enabled: true, options: {} });
    } else {
      existing.enabled = true;
    }
  }
  return reporters;
}
function toReproducerTarget(target) {
  if (target.transport === "streamable-http") {
    return {
      transport: "streamable-http",
      url: target.url,
      ...target.command === void 0 ? {} : { command: target.command, args: target.args ?? [] },
      environmentNames: []
    };
  }
  return {
    transport: "stdio",
    command: target.command,
    args: target.args,
    environmentNames: []
  };
}
function input(name) {
  const normalized = name.toUpperCase().replaceAll("-", "_");
  return process.env[`INPUT_${normalized}`] ?? process.env[`INPUT_${name.toUpperCase()}`] ?? "";
}
function parseStringArray(value, inputName) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The ${inputName} input must be a JSON string array: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", `The ${inputName} input must be a JSON string array.`);
  }
  return parsed;
}
function parseEnvironment(value) {
  if (value.length === 0) {
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new WringerError(
      "USAGE_ERROR",
      `The env input must be a JSON object of string values: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  if (!isRecord14(parsed) || !Object.values(parsed).every((item) => typeof item === "string")) {
    throw new WringerError("USAGE_ERROR", "The env input must be a JSON object of string values.");
  }
  return parsed;
}
async function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath === void 0 || outputPath.length === 0) {
    throw new WringerError("ACTION_ERROR", "GITHUB_OUTPUT is not set.");
  }
  let delimiter = `MCP_WRINGER_${(0, import_node_crypto4.randomUUID)().replaceAll("-", "")}`;
  while (value.includes(delimiter)) {
    delimiter = `MCP_WRINGER_${(0, import_node_crypto4.randomUUID)().replaceAll("-", "")}`;
  }
  await (0, import_promises8.appendFile)(outputPath, `${name}<<${delimiter}
${value}
${delimiter}
`, "utf8");
}
function isRecord14(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mcp-wringer action: ${message}
`);
  process.exitCode = 1;
});
