/*!
 * Copyright po-to.org All Rights Reserved.
 * https://github.com/po-to/
 * Licensed under the MIT license
 */

export interface Encryption {
    encrypt: (value: string) => string;
    decrypt: (code: string) => string;
}
interface CacheData {
    cipher: string;
    expired: string;
    version: string;
    encryption: boolean;
    wtime: string;
    rtime: string;
}
interface CacheDataMap {
    [key: string]: CacheData
}
const CacheDataProps = ['cipher', 'expired', 'version', 'encryption', 'wtime', 'rtime'];
export interface CacheOptions {
    value: string | undefined;
    expired: string | undefined;
    version: string | undefined;
    encryption: boolean | undefined;
}
const CacheOptionsProps = ['value', 'expired', 'version', 'encryption'];
interface CacheObject {
    value: string;
    version: string;
}
export interface Serialization {
    /**
     * 序列化解码´.
     * @param str 已编码字符串
     * @return 解码后对象
     */
    decode: (str: string) => any;
    encode: (data: any) => string;
}

function nowTime(): number {
    return Math.floor(Date.now() / 1000);
}
export class CacheResult {
    private _data: any;
    
    constructor(public readonly value: string, public readonly version: string, public readonly from: CacheType) {

    }
    toData(): any {
        if (this._data === undefined) {
            let n = this.value.indexOf(",");
            let code = this.value.substr(n + 1);
            let type = this.value.substr(0, n);
            this._data = parseContent(type, code);
        }
        return this._data;
    }
}
export function parseContent(contentType: string, content: string): any {
    let serialization: Serialization | null = config.serializations[contentType];
    return serialization ? serialization.decode(content) : content;
}
export class CacheContent {
    private _str: string;
    constructor(public readonly data?: any, public readonly dataType?: string, public readonly expired?: string, public readonly version?: string, public readonly encryption?: boolean) {

    }
    toValue(): string {
        if (this._str === undefined && this.data !== undefined) {
            let dataType: string = this.dataType || 'text';
            if (typeof (this.data) == 'string') {
                this._str = dataType + "," + this.data;
            } else {
                let serialization: Serialization | null = config.serializations[dataType];
                this._str = dataType + "," + (serialization ? serialization.encode(this.data) : this.data.toString());
            }
        }
        return this._str;
    }
    toOptions(): CacheOptions {
        let options: CacheOptions = assign<CacheOptions>(CacheOptionsProps, {}, this);
        options.value = this.toValue();
        return options;
    }
}
class CacheItem {
    static readonly Props = ['_value', '_cipher', '_valid', '_checkValidTime', 'expired', 'version', 'encryption', 'wtime', 'rtime'];
    private _value: string | undefined;
    private _cipher: string | undefined;
    private _valid: number;
    private _checkValidTime: number = -1;
    private expired: string = '20';
    private version: string = '';
    private encryption: boolean = false;
    private wtime: string = '0';
    public rtime: string = '0';

    constructor(item?: CacheData | CacheItem) {
        if (item) {
            if (item instanceof CacheItem) {
                assign(CacheItem.Props, this, item.toPropsData());
            } else {
                this.expired = item.expired;
                this.version = item.version;
                this.encryption = item.encryption;
                this.wtime = item.wtime;
                this.rtime = item.rtime;
                this._cipher = item.cipher;
            }
        }
    }

    public getValue(): string {
        if (this._value === undefined) {
            if (this.encryption && this._cipher) {
                this._value = config.encryption.decrypt(this._cipher);
            } else {
                this._value = this._cipher + '';
            }
        }
        return this._value;
    }
    public getCipher(): string {
        if (this._cipher === undefined) {
            if (this.encryption && this._value) {
                this._cipher = config.encryption.encrypt(this._value);
            } else {
                this._cipher = this._value + '';
            }
        }
        return this._cipher;
    }
    public getValid(): number {
        let now = Date.now();
        if (now - this._checkValidTime > 1000) {
            this._valid = this._countValid();
            this._checkValidTime = now;
        }
        return this._valid;
    }
    private _countValid(): number {
        let valid: boolean = true;
        let num: number = parseInt(this.expired);
        if (!isNaN(num)) {
            if (num > 0) {
                valid = (nowTime() - parseInt(this.wtime)) < parseInt(this.expired);
            } else if (num = 0) {
                valid = false;
            } else {
                valid = true;
            }
        } else {
            valid = new Date() < new Date(this.expired);
        }
        if (!valid && !this.version) {
            return -1;
        }
        return valid ? 1 : 0;
    }
    toObject(): CacheObject | null {
        let valid = this.getValid();
        if (valid == -1) {
            return null;
        } else if (valid == 0) {
            return { value: this.getValue(), version: this.version };
        } else {
            return { value: this.getValue(), version: '' };
        }

    }
    toCacheData(): CacheData {
        return {
            cipher: this.getCipher(),
            expired: this.expired,
            version: this.version,
            encryption: this.encryption,
            wtime: this.wtime,
            rtime: this.rtime
        };
    }
    toPropsData(): { _value: string, _cipher: string, _valid: number, _checkValidTime: number, expired: string, version: string, encryption: string, wtime: string, rtime: string } {
        return assign<{ _value: string, _cipher: string, _valid: number, _checkValidTime: number, expired: string, version: string, encryption: string, wtime: string, rtime: string }>(CacheItem.Props, {}, this);
    }
    setCacheOptions(options: CacheOptions) {
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
    }
    clone(): CacheItem {
        return new CacheItem(this);
    }
    updateReadTime() {
        this.rtime = nowTime() + '';
    }
}
interface CacheItemMap {
    [key: string]: CacheItem | null;
}
interface Entity {
    getItem: (key: string) => CacheData | null;
    setItem: (key: string, item: CacheData) => void;
    removeItem: (key: string) => void;
    keys: () => string[];
    clear: () => void;
}


function assign<U>(props: string[], target: any, ...objs): U {
    for (let obj of objs) {
        for (let key of props) {
            if (obj.hasOwnProperty(key)) {
                target[key] = obj[key];
            }
        }
    }
    return target;
}
function objectAssign(target: any, ...objs){
    for (let obj of objs) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                target[key] = obj[key];
            }
        }
    }
    return target;
}
class RamEntity implements Entity {
    private _data: CacheDataMap = {};
    constructor() {
    }
    getItem(key: string): CacheData | null {
        let data: CacheData | null = this._data[key];
        if (!data) { return null; }
        return assign<CacheData>(CacheDataProps, {}, data);
    }
    setItem(key: string, data: CacheData): void {
        this._data[key] = assign<CacheData>(CacheDataProps, {}, data);
    }
    removeItem(key: string): void {
        delete this._data[key];
    }
    keys(): string[] {
        return Object.keys(this._data);
    }
    clear(): void {
        this._data = {};
    }
}

class StorageEntity implements Entity {

    constructor(public readonly storage: Storage) {

    }
    keys(): string[] {
        let list: string[] = [];
        for (let i = 0, k = this.storage.length; i < k; i++) {
            let key: string = this.storage.key(i) || '';
            if (key.indexOf(config.namespace) == 0) {
                list.push(key.substr(config.namespace.length));
            }
        }
        return list;
    }
    clear(): void {
        for (let key of this.keys()) {
            this.removeItem(key);
        }
    }
    getItem(key: string): CacheData | null {
        let str = this.storage.getItem(config.namespace + key);
        if (!str) { return null; }
        let n = str.indexOf("|");
        let [expired, version, encryptionString, wtime, rtime] = str.substr(0, n).split(',');
        let encryption = encryptionString ? true : false;
        let cipher = str.substr(n + 1);
        return { cipher, expired, version, encryption, wtime, rtime };
    }
    setItem(key: string, data: CacheData): void {
        key = config.namespace + key;
        let value: string = `${data.expired},${data.version},${data.encryption ? '1' : ''},${data.wtime},${data.rtime}|${data.cipher}`;
        this.storage.setItem(key, value);
    }
    removeItem(key: string): void {
        this.storage.removeItem(config.namespace + key);
    }
}

class Shim {
    private _data: CacheItemMap = {};
    private _clearUpUnitNum: number = 1 * 1024 * 1024;

    constructor(public readonly enity: Entity) {
    }

    public clear(): void {
        this._data = {};
        this.enity.clear();
    }
    private _clearUp(size: number): void {
        let keys: string[] = this.enity.keys();
        let free: number = 0;
        let recover = function (item: CacheItem) {
            free += item.getCipher().length;
        }
        let list: Array<{ key: string, rtime: number, item: CacheItem }> = [];
        for (let key of keys) {
            let item = this._getItem(key, recover);
            if (item) {
                list.push({ key: key, rtime: parseInt(item.rtime), item: item });
            }
        }
        if (free - size < this._clearUpUnitNum) {
            list.sort(function (o: { key: string, rtime: number }, p: { key: string, rtime: number }) {
                let a: number = o.rtime;
                let b: number = p.rtime;
                if (a == b) { return 0; }
                return (a < b ? -1 : 1);
            });
            for (let obj of list) {
                let key = obj.key;
                this._data[key] = null;
                this.enity.removeItem(key);
                recover(obj.item);
                if (free - size >= this._clearUpUnitNum) {
                    return;
                }
            }
        }
    }
    getItem(key: string): CacheObject | null {
        let item: CacheItem | null = this._getItem(key);
        if (item) {
            item.updateReadTime();
            this._setItem(key, item);
            return item.toObject();
        } else {
            return null;
        }
    }
    private _getItem(key: string, recover?: (item: CacheItem) => void): CacheItem | null {
        if (!this._data.hasOwnProperty(key)) {
            let item: CacheData | null = this.enity.getItem(key);
            this._data[key] = item ? new CacheItem(item) : null;
        }
        let item: CacheItem | null = this._data[key];
        if (!item) { return null; }
        let valid = item.getValid();
        if (valid == -1) {
            this._data[key] = null;
            this.enity.removeItem(key);
            recover && recover(item);
            return null
        }
        return item.clone();
    }
    setItem(key: string, options: CacheOptions): boolean {
        let item: CacheItem | null = this._getItem(key);
        if (!item) { item = new CacheItem(); }
        item.setCacheOptions(options);
        return this._setItem(key, item);
    }
    private _setItem(key: string, item: CacheItem): boolean {
        let cacheData = item.toCacheData();
        try {
            this.enity.setItem(key, cacheData);
        } catch (error) {
            this._clearUp(cacheData.cipher.length);
            try {
                this.enity.setItem(key, cacheData);
            } catch (error) {
                return false;
            }
        }
        this._data[key] = item;
        return true;
    }
    removeItem(key: string): void {
        this.enity.removeItem(key);
    }
}

let config = {
    namespace: '_pt_',
    encryption: {
        encrypt: (str: string) => str,
        decrypt: (str: string) => str
    },
    serializations: {
        json: {
            encode: (data: any) => JSON.stringify(data),
            decode: (str: string) => JSON.parse(str)
        },
        text: {
            encode: (data: any) => data,
            decode: (str: string) => str
        }
    },
    mappingKey: (key: string) => key,
}

export enum CacheType { Ram, Session, Local };

let pool = {};
pool[CacheType.Ram] = new Shim(new RamEntity());
pool[CacheType.Session] = new Shim(new StorageEntity(sessionStorage));
pool[CacheType.Local] = new Shim(new StorageEntity(localStorage));


export function setConfig(options: { 
    namespace?: string, 
    encryption?: Encryption, 
    mappingKey?: (key: string) => string, 
    serializations?:{string:Serialization},
    request?: (requestOptions: IRequestOptions,success:(data:RequestResult)=>void,fail:(error:Error)=>void) => void,
}): void {
    if (options.namespace) {
        config.namespace = options.namespace;
    }
    if (options.encryption) {
        config.encryption = options.encryption;
    }
    if (options.mappingKey) {
        config.mappingKey = options.mappingKey;
    }
    if(options.serializations){
        objectAssign(config.serializations,options.serializations);
    }
    if (options.request) {
        request = options.request;
    }
}
export function getItem(key: string, type?: CacheType): CacheResult | null {
    key = config.mappingKey(key);
    let cacheObject: CacheObject | null;
    if (type !== undefined) {
        cacheObject = (pool[type] as Shim).getItem(key);
    } else {
        type = CacheType.Ram;
        cacheObject = (pool[type] as Shim).getItem(key);
        if (!cacheObject) {
            type = CacheType.Session;
            cacheObject = (pool[type] as Shim).getItem(key);
        }
        if (!cacheObject) {
            type = CacheType.Local;
            cacheObject = (pool[type] as Shim).getItem(key);
        }
    }
    if (cacheObject) {
        return new CacheResult(cacheObject.value, cacheObject.version, type);
    } else {
        return null;
    }
}
export function setItem(key: string, content: CacheContent, type?: CacheType): boolean {
    key = config.mappingKey(key);
    let options: CacheOptions = content.toOptions();
    if (type === undefined) {
        type = CacheType.Ram;
    }
    return (pool[type] as Shim).setItem(key, options);
}
export function removeItem(key: string, type?: CacheType): void {
    key = config.mappingKey(key);
    if (type !== undefined) {
        (pool[type] as Shim).removeItem(key);
    } else {
        (pool[CacheType.Ram] as Shim).removeItem(key);
        (pool[CacheType.Session] as Shim).removeItem(key);
        (pool[CacheType.Local] as Shim).removeItem(key);
    }
}
export function clear(type?: CacheType): void {
    if (type !== undefined) {
        (pool[type] as Shim).clear();
    } else {
        (pool[CacheType.Ram] as Shim).clear();
        (pool[CacheType.Session] as Shim).clear();
        (pool[CacheType.Local] as Shim).clear();
    }
}

export interface IRequestOptions {
    url: string;
    method?: string;
    data?:{[key:string]:any};
    render?(data:any):any;
    headers:{[key:string]:any};
    version?: string;
}

let request: (request: IRequestOptions,success:(data:RequestResult)=>void,fail:(error:Error)=>void) => void;

export interface RequestResult {
    cache?: { type?: CacheType, expired?: string, version?: string, encryption?: boolean },
    notModified?: boolean,
    dataType: string,
    data: any
}

export function load (requestOptions: IRequestOptions, succss?: (data:any) => void, fail?: (error:Error) => void): Promise<any> {
    return new Promise(function (resolve, reject) {
        let returnResult = function(data:any){
            let result = requestOptions.render?requestOptions.render(data):data;
            if(result instanceof Error){
                fail && fail(result);
                reject(result);
            }else{
                succss && succss(result);
                resolve(result);
            }
        }
        let cacheResult = getItem(requestOptions.url);
        if (cacheResult && !cacheResult.version) {
            returnResult(cacheResult.toData());
        }else{
            if (cacheResult && cacheResult.version) {
                requestOptions.version = cacheResult.version;
            }
            request(requestOptions,function (requestResult:RequestResult) {
                let data: any | undefined, dataType: string | undefined, type: CacheType | undefined, expired: string | undefined, version: string | undefined, encryption: boolean | undefined;
                let cacheData = requestResult.cache;
                let result: any;
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
                    } else {
                        result = data;
                    }
                } else if (cacheResult) {
                    result = cacheResult.toData();
                } else {
                    result = null;
                }
                if (type !== undefined) {
                    setItem(requestOptions.url, new CacheContent(data, dataType, expired, version, encryption), type);
                }
                returnResult(result)
            },returnResult)
        }
    })
}

// Cache.setConfig(encryption:
//     {
//         encode : function(str){
//             var key = 'dsfsdfsdfe';
//             var iv = key.substr(0,16);
//             key = CryptoJS.enc.Utf8.parse(key);
//             iv = CryptoJS.enc.Utf8.parse(iv);
//             str = CryptoJS.AES.encrypt(str,key,{iv:iv,padding:CryptoJS.pad.ZeroPadding});
//             return str.ciphertext.toString(CryptoJS.enc.Base64);
//         },
//         decode : function(str){
//             var key = 'dsfsdfsdfe';
//             var iv = key.substr(0,16);
//             key = CryptoJS.enc.Utf8.parse(key);
//             iv = CryptoJS.enc.Utf8.parse(iv);
//             str = CryptoJS.AES.decrypt(str,key,{iv:iv,padding:CryptoJS.pad.ZeroPadding});
//             return CryptoJS.enc.Utf8.stringify(str);
//         }
//     }
// )
