/*!
 * Copyright po-to.org All Rights Reserved.
 * https://github.com/po-to/
 * Licensed under the MIT license
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    var CacheDataProps = ['cipher', 'expired', 'version', 'encryption', 'wtime', 'rtime'];
    var CacheOptionsProps = ['value', 'expired', 'version', 'encryption'];
    function nowTime() {
        return Math.floor(Date.now() / 1000);
    }
    var CacheResult = (function () {
        function CacheResult(value, version, from) {
            this.value = value;
            this.version = version;
            this.from = from;
        }
        CacheResult.prototype.toData = function () {
            if (this._data === undefined) {
                var n = this.value.indexOf(",");
                var code = this.value.substr(n + 1);
                var type = this.value.substr(0, n);
                this._data = parseContent(type, code);
            }
            return this._data;
        };
        return CacheResult;
    }());
    exports.CacheResult = CacheResult;
    function parseContent(contentType, content) {
        var serialization = config.serializations[contentType];
        return serialization ? serialization.decode(content) : content;
    }
    exports.parseContent = parseContent;
    var CacheContent = (function () {
        function CacheContent(data, dataType, expired, version, encryption) {
            this.data = data;
            this.dataType = dataType;
            this.expired = expired;
            this.version = version;
            this.encryption = encryption;
        }
        CacheContent.prototype.toValue = function () {
            if (this._str === undefined && this.data !== undefined) {
                var dataType = this.dataType || 'text';
                if (typeof (this.data) == 'string') {
                    this._str = dataType + "," + this.data;
                }
                else {
                    var serialization = config.serializations[dataType];
                    this._str = dataType + "," + (serialization ? serialization.encode(this.data) : this.data.toString());
                }
            }
            return this._str;
        };
        CacheContent.prototype.toOptions = function () {
            var options = assign(CacheOptionsProps, {}, this);
            options.value = this.toValue();
            return options;
        };
        return CacheContent;
    }());
    exports.CacheContent = CacheContent;
    var CacheItem = (function () {
        function CacheItem(item) {
            this._checkValidTime = -1;
            this.expired = '20';
            this.version = '';
            this.encryption = false;
            this.wtime = '0';
            this.rtime = '0';
            if (item) {
                if (item instanceof CacheItem) {
                    assign(CacheItem.Props, this, item.toPropsData());
                }
                else {
                    this.expired = item.expired;
                    this.version = item.version;
                    this.encryption = item.encryption;
                    this.wtime = item.wtime;
                    this.rtime = item.rtime;
                    this._cipher = item.cipher;
                }
            }
        }
        CacheItem.prototype.getValue = function () {
            if (this._value === undefined) {
                if (this.encryption && this._cipher) {
                    this._value = config.encryption.decrypt(this._cipher);
                }
                else {
                    this._value = this._cipher + '';
                }
            }
            return this._value;
        };
        CacheItem.prototype.getCipher = function () {
            if (this._cipher === undefined) {
                if (this.encryption && this._value) {
                    this._cipher = config.encryption.encrypt(this._value);
                }
                else {
                    this._cipher = this._value + '';
                }
            }
            return this._cipher;
        };
        CacheItem.prototype.getValid = function () {
            var now = Date.now();
            if (now - this._checkValidTime > 1000) {
                this._valid = this._countValid();
                this._checkValidTime = now;
            }
            return this._valid;
        };
        CacheItem.prototype._countValid = function () {
            var valid = true;
            var num = parseInt(this.expired);
            if (!isNaN(num)) {
                if (num > 0) {
                    valid = (nowTime() - parseInt(this.wtime)) < parseInt(this.expired);
                }
                else if (num = 0) {
                    valid = false;
                }
                else {
                    valid = true;
                }
            }
            else {
                valid = new Date() < new Date(this.expired);
            }
            if (!valid && !this.version) {
                return -1;
            }
            return valid ? 1 : 0;
        };
        CacheItem.prototype.toObject = function () {
            var valid = this.getValid();
            if (valid == -1) {
                return null;
            }
            else if (valid == 0) {
                return { value: this.getValue(), version: this.version };
            }
            else {
                return { value: this.getValue(), version: '' };
            }
        };
        CacheItem.prototype.toCacheData = function () {
            return {
                cipher: this.getCipher(),
                expired: this.expired,
                version: this.version,
                encryption: this.encryption,
                wtime: this.wtime,
                rtime: this.rtime
            };
        };
        CacheItem.prototype.toPropsData = function () {
            return assign(CacheItem.Props, {}, this);
        };
        CacheItem.prototype.setCacheOptions = function (options) {
            this.rtime = this.wtime = nowTime() + '';
            if (options.value !== undefined) {
                if (options.value != this._value) {
                    this._value = options.value;
                    this._cipher = undefined;
                }
            }
            if (options.encryption !== undefined) {
                if (options.encryption != this.encryption) {
                    this.encryption = options.encryption;
                    this._cipher = undefined;
                }
            }
            if (options.expired !== undefined) {
                this.expired = options.expired;
            }
            if (options.version !== undefined) {
                this.version = options.version;
            }
        };
        CacheItem.prototype.clone = function () {
            return new CacheItem(this);
        };
        CacheItem.prototype.updateReadTime = function () {
            this.rtime = nowTime() + '';
        };
        return CacheItem;
    }());
    CacheItem.Props = ['_value', '_cipher', '_valid', '_checkValidTime', 'expired', 'version', 'encryption', 'wtime', 'rtime'];
    function assign(props, target) {
        var objs = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            objs[_i - 2] = arguments[_i];
        }
        for (var _a = 0, objs_1 = objs; _a < objs_1.length; _a++) {
            var obj = objs_1[_a];
            for (var _b = 0, props_1 = props; _b < props_1.length; _b++) {
                var key = props_1[_b];
                if (obj.hasOwnProperty(key)) {
                    target[key] = obj[key];
                }
            }
        }
        return target;
    }
    function objectAssign(target) {
        var objs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            objs[_i - 1] = arguments[_i];
        }
        for (var _a = 0, objs_2 = objs; _a < objs_2.length; _a++) {
            var obj = objs_2[_a];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    target[key] = obj[key];
                }
            }
        }
        return target;
    }
    var RamEntity = (function () {
        function RamEntity() {
            this._data = {};
        }
        RamEntity.prototype.getItem = function (key) {
            var data = this._data[key];
            if (!data) {
                return null;
            }
            return assign(CacheDataProps, {}, data);
        };
        RamEntity.prototype.setItem = function (key, data) {
            this._data[key] = assign(CacheDataProps, {}, data);
        };
        RamEntity.prototype.removeItem = function (key) {
            delete this._data[key];
        };
        RamEntity.prototype.keys = function () {
            return Object.keys(this._data);
        };
        RamEntity.prototype.clear = function () {
            this._data = {};
        };
        return RamEntity;
    }());
    var StorageEntity = (function () {
        function StorageEntity(storage) {
            this.storage = storage;
        }
        StorageEntity.prototype.keys = function () {
            var list = [];
            for (var i = 0, k = this.storage.length; i < k; i++) {
                var key = this.storage.key(i) || '';
                if (key.indexOf(config.namespace) == 0) {
                    list.push(key.substr(config.namespace.length));
                }
            }
            return list;
        };
        StorageEntity.prototype.clear = function () {
            for (var _i = 0, _a = this.keys(); _i < _a.length; _i++) {
                var key = _a[_i];
                this.removeItem(key);
            }
        };
        StorageEntity.prototype.getItem = function (key) {
            var str = this.storage.getItem(config.namespace + key);
            if (!str) {
                return null;
            }
            var n = str.indexOf("|");
            var _a = str.substr(0, n).split(','), expired = _a[0], version = _a[1], encryptionString = _a[2], wtime = _a[3], rtime = _a[4];
            var encryption = encryptionString ? true : false;
            var cipher = str.substr(n + 1);
            return { cipher: cipher, expired: expired, version: version, encryption: encryption, wtime: wtime, rtime: rtime };
        };
        StorageEntity.prototype.setItem = function (key, data) {
            key = config.namespace + key;
            var value = data.expired + "," + data.version + "," + (data.encryption ? '1' : '') + "," + data.wtime + "," + data.rtime + "|" + data.cipher;
            this.storage.setItem(key, value);
        };
        StorageEntity.prototype.removeItem = function (key) {
            this.storage.removeItem(config.namespace + key);
        };
        return StorageEntity;
    }());
    var Shim = (function () {
        function Shim(enity) {
            this.enity = enity;
            this._data = {};
            this._clearUpUnitNum = 1 * 1024 * 1024;
        }
        Shim.prototype.clear = function () {
            this._data = {};
            this.enity.clear();
        };
        Shim.prototype._clearUp = function (size) {
            var keys = this.enity.keys();
            var free = 0;
            var recover = function (item) {
                free += item.getCipher().length;
            };
            var list = [];
            for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                var key = keys_1[_i];
                var item = this._getItem(key, recover);
                if (item) {
                    list.push({ key: key, rtime: parseInt(item.rtime), item: item });
                }
            }
            if (free - size < this._clearUpUnitNum) {
                list.sort(function (o, p) {
                    var a = o.rtime;
                    var b = p.rtime;
                    if (a == b) {
                        return 0;
                    }
                    return (a < b ? -1 : 1);
                });
                for (var _a = 0, list_1 = list; _a < list_1.length; _a++) {
                    var obj = list_1[_a];
                    var key = obj.key;
                    this._data[key] = null;
                    this.enity.removeItem(key);
                    recover(obj.item);
                    if (free - size >= this._clearUpUnitNum) {
                        return;
                    }
                }
            }
        };
        Shim.prototype.getItem = function (key) {
            var item = this._getItem(key);
            if (item) {
                item.updateReadTime();
                this._setItem(key, item);
                return item.toObject();
            }
            else {
                return null;
            }
        };
        Shim.prototype._getItem = function (key, recover) {
            if (!this._data.hasOwnProperty(key)) {
                var item_1 = this.enity.getItem(key);
                this._data[key] = item_1 ? new CacheItem(item_1) : null;
            }
            var item = this._data[key];
            if (!item) {
                return null;
            }
            var valid = item.getValid();
            if (valid == -1) {
                this._data[key] = null;
                this.enity.removeItem(key);
                recover && recover(item);
                return null;
            }
            return item.clone();
        };
        Shim.prototype.setItem = function (key, options) {
            var item = this._getItem(key);
            if (!item) {
                item = new CacheItem();
            }
            item.setCacheOptions(options);
            return this._setItem(key, item);
        };
        Shim.prototype._setItem = function (key, item) {
            var cacheData = item.toCacheData();
            try {
                this.enity.setItem(key, cacheData);
            }
            catch (error) {
                this._clearUp(cacheData.cipher.length);
                try {
                    this.enity.setItem(key, cacheData);
                }
                catch (error) {
                    return false;
                }
            }
            this._data[key] = item;
            return true;
        };
        Shim.prototype.removeItem = function (key) {
            this.enity.removeItem(key);
        };
        return Shim;
    }());
    var config = {
        namespace: '_pt_',
        encryption: {
            encrypt: function (str) { return str; },
            decrypt: function (str) { return str; }
        },
        serializations: {
            json: {
                encode: function (data) { return JSON.stringify(data); },
                decode: function (str) { return JSON.parse(str); }
            },
            text: {
                encode: function (data) { return data; },
                decode: function (str) { return str; }
            }
        },
        mappingKey: function (key) { return key; },
    };
    var CacheType;
    (function (CacheType) {
        CacheType[CacheType["Ram"] = 0] = "Ram";
        CacheType[CacheType["Session"] = 1] = "Session";
        CacheType[CacheType["Local"] = 2] = "Local";
    })(CacheType = exports.CacheType || (exports.CacheType = {}));
    ;
    var pool = {};
    pool[CacheType.Ram] = new Shim(new RamEntity());
    pool[CacheType.Session] = new Shim(new StorageEntity(sessionStorage));
    pool[CacheType.Local] = new Shim(new StorageEntity(localStorage));
    function setConfig(options) {
        if (options.namespace) {
            config.namespace = options.namespace;
        }
        if (options.encryption) {
            config.encryption = options.encryption;
        }
        if (options.mappingKey) {
            config.mappingKey = options.mappingKey;
        }
        if (options.serializations) {
            objectAssign(config.serializations, options.serializations);
        }
        if (options.request) {
            request = options.request;
        }
    }
    exports.setConfig = setConfig;
    function getItem(key, type) {
        key = config.mappingKey(key);
        var cacheObject;
        if (type !== undefined) {
            cacheObject = pool[type].getItem(key);
        }
        else {
            type = CacheType.Ram;
            cacheObject = pool[type].getItem(key);
            if (!cacheObject) {
                type = CacheType.Session;
                cacheObject = pool[type].getItem(key);
            }
            if (!cacheObject) {
                type = CacheType.Local;
                cacheObject = pool[type].getItem(key);
            }
        }
        if (cacheObject) {
            return new CacheResult(cacheObject.value, cacheObject.version, type);
        }
        else {
            return null;
        }
    }
    exports.getItem = getItem;
    function setItem(key, content, type) {
        key = config.mappingKey(key);
        var options = content.toOptions();
        if (type === undefined) {
            type = CacheType.Ram;
        }
        return pool[type].setItem(key, options);
    }
    exports.setItem = setItem;
    function removeItem(key, type) {
        key = config.mappingKey(key);
        if (type !== undefined) {
            pool[type].removeItem(key);
        }
        else {
            pool[CacheType.Ram].removeItem(key);
            pool[CacheType.Session].removeItem(key);
            pool[CacheType.Local].removeItem(key);
        }
    }
    exports.removeItem = removeItem;
    function clear(type) {
        if (type !== undefined) {
            pool[type].clear();
        }
        else {
            pool[CacheType.Ram].clear();
            pool[CacheType.Session].clear();
            pool[CacheType.Local].clear();
        }
    }
    exports.clear = clear;
    var request;
    function load(requestOptions, succss, fail) {
        return new Promise(function (resolve, reject) {
            var returnResult = function (data) {
                var result = requestOptions.render ? requestOptions.render(data) : data;
                if (result instanceof Error) {
                    fail && fail(result);
                    reject(result);
                }
                else {
                    succss && succss(result);
                    resolve(result);
                }
            };
            var cacheResult = getItem(requestOptions.url);
            if (cacheResult && !cacheResult.version) {
                returnResult(cacheResult.toData());
            }
            else {
                if (cacheResult && cacheResult.version) {
                    requestOptions.version = cacheResult.version;
                }
                request(requestOptions, function (requestResult) {
                    var data, dataType, type, expired, version, encryption;
                    var cacheData = requestResult.cache;
                    var result;
                    if (cacheData) {
                        type = cacheData.type;
                        expired = cacheData.expired;
                        version = cacheData.version;
                        encryption = cacheData.encryption;
                        if (type === undefined && requestResult.notModified && cacheResult) {
                            type = cacheResult.from;
                        }
                    }
                    if (!requestResult.notModified) {
                        data = requestResult.data;
                        dataType = requestResult.dataType;
                        if (typeof data == 'string') {
                            result = parseContent(dataType, data);
                        }
                        else {
                            result = data;
                        }
                    }
                    else if (cacheResult) {
                        result = cacheResult.toData();
                    }
                    else {
                        result = null;
                    }
                    if (type !== undefined) {
                        setItem(requestOptions.url, new CacheContent(data, dataType, expired, version, encryption), type);
                    }
                    returnResult(result);
                }, returnResult);
            }
        });
    }
    exports.load = load;
});
