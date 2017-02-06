/*!
 * Copyright po-to.org All Rights Reserved.
 * https://github.com/po-to/
 * Licensed under the MIT license
 */
export interface ITaskCounter {
    /**
     * 如果要实现异步请求计数，请设置实现该接口的TaskCounter´.
     * @param promise 异步请求返回的Promise对象
     * @param note 异步请求的注解
     */
    addItem(promise: Promise<any>, note?: string): void;
}
export interface IEncryption {
    encrypt: (value: string) => string;
    decrypt: (code: string) => string;
}
export interface CacheOptions {
    value: string | undefined;
    expired: string | undefined;
    version: string | undefined;
    encryption: boolean | undefined;
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
export declare class CacheResult {
    readonly value: string;
    readonly version: string;
    readonly from: CacheType;
    private _data;
    constructor(value: string, version: string, from: CacheType);
    toData(): any;
}
export declare class CacheContent {
    readonly data: any;
    readonly dataType: string;
    readonly expired: string;
    readonly version: string;
    readonly encryption: boolean;
    private _str;
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
    constructor(data?: any, dataType?: string, expired?: string, version?: string, encryption?: boolean);
    /**
     * @return 输出序列化后的文本
     */
    toValue(): string;
    toOptions(): CacheOptions;
}
/**
 * 本库提供三种类型的缓存：memoryStorage,sessionStorage,localStorage
 */
export declare enum CacheType {
    Ram = 0,
    Session = 1,
    Local = 2,
}
/**
 * 配制项
 */
export declare function setConfig(options: {
    /** 在存入sessionStorage或是localStorage时，每一笔cache都会以此namespace为前缀，避免冲突 */
    namespace?: string;
    /** 内存型缓存最大占用内存空间，默认为0，表示无限制 */
    ramStorageLimit?: number;
    /** 加解密方法，由第三方库提供 */
    encryption?: IEncryption;
    /** 每笔cache的key，可以经过此方法映射，如:以url为key进行写入会太长，可将url进行md5之后再作为key写入 */
    mappingKey?: (key: string) => string;
    /** 由于sessionStorage或是localStorage只能储存文本，所以存入数据非文本时，将跟据dataType来调用此序列化方法进行序列化与反序列化 */
    serializations?: {
        string: ISerialization;
    };
    /** 外部请求的方法，由第三方库提供 */
    request?: IRequest;
    /** 异步请求计数器，由第三方库提供 */
    taskCounter?: ITaskCounter;
}): void;
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
export declare function getItem(key: string, type?: CacheType): CacheResult | null;
/**
 * 创建一笔缓存
 * @param key cache的key
 * @param content cache的值，参见CacheContent
 * @param type cache类型，取值为0,1,2 ，默认为0，即内存型
 * @return 是否创建成功
*/
export declare function setItem(key: string, content: CacheContent, type?: CacheType): boolean;
/**
 * 删除一笔缓存
 * @param key 要删除的缓存key
 * @param type 要从何种缓存池中删除，通常可不传，本库将按memoryStorage > sessionStorage > localStorage依次查找
*/
export declare function removeItem(key: string, type?: CacheType): void;
/**
 * 清空缓存池
 * @param type 要清空何种缓存池，不传为清空所有三种缓存
*/
export declare function clear(type?: CacheType): void;
/**
 * 发起外部请求所需要的数据接口
 */
export interface IRequestOptions {
    /** 外部请求url */
    url: string;
    /** 外部请求方法，如Get/POST/PUT/DELETE */
    method?: string;
    /** 外部请求需要发送的数据 */
    data?: {
        [key: string]: any;
    };
    /** 外部请求返回数据的加工函数 */
    render?(data: any): any;
    /** 外部请求需要发送的headers */
    headers?: {
        [key: string]: any;
    };
    /** 外部请求的版本标识 */
    version?: string;
    /** 外部请求的超时时间 */
    timeout?: number;
    /** 加载信息说明 */
    note?: string;
    /** 如果设置了taskCounter，该参数控制是否将该请求加入异步计数器 */
    hideLoading?: boolean;
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
/**
 * 使用IRequest发起外部请求后，成功返回的数据格式接口
 */
export interface IRequestResult {
    /** 返回数据的cache设置 */
    cache?: {
        type?: CacheType;
        expired?: string;
        version?: string;
        encryption?: boolean;
    };
    /** 返回数据是否没更改 */
    notModified?: boolean;
    /** 返回数据的数据类型 */
    dataType: string;
    /** 返回数据体 */
    data: any;
}
/**
 *发起外部请求，使用此方法前，请先实现IRequest接口，并调用setConfig设置
* @param requestOptions 发起外部请求的数据，该数据将传入第三方外部请求实现IRequest，进行外部请求
* @param succss 请求成功回调
* @param fail 请求失败回调
*/
export declare function load(requestOptions: IRequestOptions, succss?: (data: any) => void, fail?: (error: Error) => void): Promise<any>;
