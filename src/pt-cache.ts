/*!
 * Copyright po-to.org All Rights Reserved.
 * https://github.com/po-to/
 * Licensed under the MIT license
 */

export interface IEncryption {
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
export interface ISerialization {
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
function parseContent(contentType: string, content: string): any {
    let serialization: ISerialization | null = config.serializations[contentType];
    return serialization ? serialization.decode(content) : content;
}
export class CacheContent {
    private _str: string;
    /**
     * 写入的cache数据必须先由CacheContent包装
     * @param data  要写入cache的值，如果data为null或是undefined，表示不写入data，只update其它信息
     * @param dataType data值的类型，由于sessionStorage和localStorage只能存储文本，当data值不为文本时，本库将根据此dataType来序列化和反序列化，此默认值为"json"
     * @param expired cache的过期时间
        - 如果expired为一个数字描述，代表相对时间：
        ```
             expired > 0 表示expired秒之后过期
             expired = 0 表示立即过期，等于写入缓存无效
             expired < 0 表示永不过期，除非缓存类型大生命周期结束
        ```
        - 如果expired为一个标准的日期描述，即可以用JS内置的new Date(expired)转化为时间，则表示到了expired时间后过期
    * @param version 需要的版本验证，类似于http协议中的ETag
        - 如果一笔cache在有效期内，将直接命中并返回该笔cache
        - 如果一笔cache已经失效：
        ```
             如果这笔cache无version描述，则表示命中失败，取出来的cache为null
             如果这笔cache有version描述，则表示该笔cache需要重新通过版本进行验证，验证结果有可能是not modified或是失效
        ```
     * @param encryption 是否需要加密存储，如果为true，本库将调用Encryption.encrypt()或decrypt()方法
        本库不直接提供加解密的实现，但提供接口：
        ```
        interface IEncryption {
            encrypt: (value: string) => string;
            decrypt: (code: string) => string;
        }
        ```
        用户可自行引用第三方加解密库，如：google的CryptoJS，使用案例中有演示
        使用此参数前，用户需要先调用setConfig({encryption:myEncryption})设置加解密方法
    */
    constructor(public readonly data?: any, public readonly dataType: string = "json", public readonly expired: string = '-1', public readonly version?: string, public readonly encryption?: boolean) {
        
    }
    /**
     * @return 输出序列化后的文本
     */
    toValue(): string {
        if (this._str === undefined && this.data !== undefined) {
            let dataType: string = this.dataType || 'text';
            if (typeof (this.data) == 'string') {
                this._str = dataType + "," + this.data;
            } else {
                let serialization: ISerialization | null = config.serializations[dataType];
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
            } else if (num == 0) {
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
            this._checkValidTime = -1;
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
function objectAssign(target: any, ...objs) {
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
    private _size: number = 0;
    constructor() {
    }
    getItem(key: string): CacheData | null {
        let data: CacheData | null = this._data[key];
        if (!data) { return null; }
        return assign<CacheData>(CacheDataProps, {}, data);
    }
    setItem(key: string, data: CacheData): void {
        let size = this._size + key.length + data.cipher.length;
        if (config.ramStorageLimit && size > config.ramStorageLimit) {
            throw "ramStorage overflow！"
        } else {
            this._size = size;
            this._data[key] = assign<CacheData>(CacheDataProps, {}, data);
        }
    }
    removeItem(key: string): void {
        let data: CacheData | null = this._data[key];
        if (data) {
            this._size -= key.length + data.cipher.length;
            delete this._data[key];
        }
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
    ramStorageLimit: 0,
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
        },
        xml: {
            encode: (xmldom: Document) => {
                if(window['XMLSerializer']){
                    return (new XMLSerializer()).serializeToString(xmldom);
                }else{
                    return (xmldom as any).xml;
                }
            },
            decode: (xmlString:string) => {
                xmlString = xmlString.trim();
                if(!xmlString){return null;}
                let xmlDoc:Document | null = null;
                if(window['DOMParser']){
                    try{
                        let domParser = new DOMParser();
                        xmlDoc = domParser.parseFromString(xmlString, 'text/xml');
                    }catch(e){
                        console.log(e);
                    }
                }else{
                    let arr = ['MSXML.2.DOMDocument.6.0','Microsoft.XMLDOM'];
                    for(let i=0,k=arr.length; i<k; i++){
                        try{
                            xmlDoc = new window['ActiveXObject'](arr[i]);
                            (xmlDoc as any).async = false;
                            (xmlDoc as any).loadXML(xmlString);
                        }catch(e){
                            console.log(e);
                        }
                    }
                }
                return xmlDoc;
            }
        }
    },
    mappingKey: (key: string) => key,
}
/**
 * 本库提供三种类型的缓存：memoryStorage,sessionStorage,localStorage
 */
export enum CacheType { Ram, Session, Local };

let pool = {};
pool[CacheType.Ram] = new Shim(new RamEntity());
pool[CacheType.Session] = new Shim(new StorageEntity(sessionStorage));
pool[CacheType.Local] = new Shim(new StorageEntity(localStorage));

/**
 * 配制项
 */
export function setConfig(options: {
    /** 在存入sessionStorage或是localStorage时，每一笔cache都会以此namespace为前缀，避免冲突 */
    namespace?: string,
    /** 内存型缓存最大占用内存空间，默认为0，表示无限制 */
    ramStorageLimit?: number,
    /** 加解密方法，由第三方库提供 */
    encryption?: IEncryption,
    /** 每笔cache的key，可以经过此方法映射，如:以url为key进行写入会太长，可将url进行md5之后再作为key写入 */
    mappingKey?: (key: string) => string,
    /** 由于sessionStorage或是localStorage只能储存文本，所以存入数据非文本时，将跟据dataType来调用此序列化方法进行序列化与反序列化 */
    serializations?: { string: ISerialization },
    /** 外部请求的方法，由第三方库提供 */
    request?: IRequest,
}): void {
    if (options.namespace) {
        config.namespace = options.namespace;
    }
    config.ramStorageLimit = options.ramStorageLimit || 0;
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
/**
 * 获取一笔缓存
 * @param key 要获取的缓存key
 * @param type  要从何种缓存池中获取，通常可不传，本库将按memoryStorage > sessionStorage > localStorage依次查找
 * @return 返回为null表示未命中缓存，返回为CacheResult解释如下：
```
    class CacheResult {
        readonly value: string; //cache序列化后的原始值，为字符串
        readonly version: string; //该cache的版本描述
        readonly from: CacheType; //该cache来自于哪个类型，参见CacheType
        toData(): any; //取出最终的cache值
    }
```
    - 从此可看出，getItem取出的cache并不是最终的缓存值，而是经过包装的CacheResult实例对象，调用此对象的toData()方法，才可以得到最终值。
    - 如果CacheResult实例对象的version属性为空，表示该cache是有效的；反之，表示虽然命中的cache，但还不一定是最终有效，需要根据此version值确认
*/
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
/**
 * 创建一笔缓存
 * @param key cache的key
 * @param content cache的值，参见CacheContent
 * @param type cache类型，取值为0,1,2 ，默认为0，即内存型
 * @return 是否创建成功
*/
export function setItem(key: string, content: CacheContent, type?: CacheType): boolean {
    key = config.mappingKey(key);
    let options: CacheOptions = content.toOptions();
    if (type === undefined) {
        type = CacheType.Ram;
    }
    return (pool[type] as Shim).setItem(key, options);
}
/**
 * 删除一笔缓存
 * @param key 要删除的缓存key
 * @param type 要从何种缓存池中删除，通常可不传，本库将按memoryStorage > sessionStorage > localStorage依次查找
*/
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
/**
 * 清空缓存池
 * @param type 要清空何种缓存池，不传为清空所有三种缓存
*/
export function clear(type?: CacheType): void {
    if (type !== undefined) {
        (pool[type] as Shim).clear();
    } else {
        (pool[CacheType.Ram] as Shim).clear();
        (pool[CacheType.Session] as Shim).clear();
        (pool[CacheType.Local] as Shim).clear();
    }
}
/**
 * 发起外部请求所需要的数据接口
 */
export interface IRequestOptions {
    /** 外部请求url */
    url: string;
    /** 外部请求方法，如Get/POST/PUT/DELETE */
    method?: string;
    /** 外部请求需要发送的数据 */
    data?: { [key: string]: any };
    /** 外部请求返回数据的加工函数 */
    render?(data: any): any;
    /** 外部请求需要发送的headers */
    headers: { [key: string]: any };
    /** 外部请求的版本标识 */
    version?: string;
    /** 外部请求的超时时间 */
    timeout?: number;
}

/**
 * 本库并不提供外部请求的具体实现，如ajax等，仅提供此接口，用户可自由引入第三方库，如jquery的$.ajax来封装实现此接口，调用：ptcache.setConfig({request:mRequest})来配置使用
 */
export interface IRequest {
    /**
     * @param request 请求发送数据
     * @param success 请求成功回调
     * @param fail  请求失败回调
     */
    (request: IRequestOptions, success: (data: IRequestResult) => void, fail: (error: Error) => void): void;
}
let request: IRequest = function (request, success, fail) { };
/**
 * 使用IRequest发起外部请求后，成功返回的数据格式接口
 */
export interface IRequestResult {
    /** 返回数据的cache设置 */
    cache?: { type?: CacheType, expired?: string, version?: string, encryption?: boolean },
    /** 返回数据是否没更改 */
    notModified?: boolean,
    /** 返回数据的数据类型 */
    dataType: string,
    /** 返回数据体 */
    data: any
}
/**
 *发起外部请求，使用此方法前，请先实现IRequest接口，并调用setConfig设置 
* @param requestOptions 发起外部请求的数据，该数据将传入第三方外部请求实现IRequest，进行外部请求
* @param succss 请求成功回调
* @param fail 请求失败回调
*/
export function load(requestOptions: IRequestOptions, succss?: (data: any) => void, fail?: (error: Error) => void): Promise<any> {
    return new Promise(function (resolve, reject) {
        let returnResult = function (data: any) {
            let result = requestOptions.render ? requestOptions.render(data) : data;
            if (result instanceof Error) {
                fail && fail(result);
                reject(result);
            } else {
                succss && succss(result);
                resolve(result);
            }
        }
        let cacheResult = getItem(requestOptions.url);
        if (cacheResult && !cacheResult.version) {
            returnResult(cacheResult.toData());
        } else {
            if (cacheResult && cacheResult.version) {
                requestOptions.version = cacheResult.version;
            }
            request(requestOptions, function (requestResult: IRequestResult) {
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
            }, returnResult)
        }
    })
}


