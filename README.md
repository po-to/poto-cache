# pt-cache
a shim library for operate browser storage

- 项目主页：[po-to.org/pt-cache](http://po-to.org/pt-cache)
- 项目地址：[Github](https://github.com/po-to/pt-cache)
- API文档： [在线文档](http://po-to.org/pt-cache/docs) 或见 /docs
- 案例应用：[在线文档](http://po-to.org/pt-cache/examples) 或见 /examples
- 概述简介
- 使用说明



> 为方便描述说明，以下可能会使用typescript或es6的糖衣语法，实际使用本库时并不要求使用typescript或es6


# 简介
 关于网页的cache，我们知道HTTP协议中处理缓存的机制一般有：Expires、Last-Modified、Etag等，由浏览器实现并封装，不可以编程方式访问。  
 H5提供由manifest指定的AppCache,可对站点文件的离线存储进行简单配制，使用场景很有限。  
 在实际开发中，我们经常需要可编程控制的数据级cache，基于H5为我们提供了*sessionStorage*和*localStorage*，在此之上进行抽象与封装，因此产生了此框架。

## 更广泛的概念

 我们假定缓存除了创建时设定的有效条件和周期，还存在不同类别的生命周期：
- memoryStorage -- 存于内存中，即JS变量，刷新页面将消失
- sessionStorage -- 存于浏览器sessionStorage中，关闭浏览器将消失
- localStorage -- 存在于浏览品localStorage中，可认为长久存在

浏览器原生为我们维护了三种不同生命周期的cache，但是却不能在此基础上与缓存自身的周期设定取并集，以此来满足我们在实际开发中某些应用场景。比如：


> *最新列表*，需求希望页面刷新时拉取一次，其后每1小时自动拉取一次，而且点击“*立即更新*”的按钮，能立即拉取。


- 如果使用http缓存：
    1. 最新列表不一定是一个独立的API接口。
    2. 设定有效期为1小时，但是无法做到页面刷新或点击“*立即更新*”按钮时立即更新。
- 我们不得不用*setInterval*方法：
    1. 针对这个具体需求，需要具体的编程
    2. 如果某一天需求变更为半小时拉取一次，我们又不得不翻出这段JS来更改
- 如果使用pt-cache：

    ```
    var ptcache = require("po-to/pt-cache");

    /* 假设我们有一个取数据的api接口，url是"xxx" */
    var url = "xxx";

    /* 每1秒拉取1次数据 */
    setInterval(function(){
        ptcache.load({url:url}).then(function(data){
            //对比data并更新dom
        });
    },1000)

    /* 点击“*立即更新*”按钮，删除该笔缓存即可 */
    $("#btn-update").on("click",function(){
        ptcache.removeItem(url);
    })

    /* 此时，api可输出一个自定义的http响应头X-Cache=r3600s，r表示该api输出的数据将缓存放入内存，3600s表示缓存1小时 */
    ```

    这样一来：JS虽然每1秒会去拉取一次数据，但因为我们设定了X-Cache=r3600s的自定义http头，所以在1小时内，JS拉取的只是缓存在内存中的数据。对于前端来说，用一个通用的前后端协议即可简化并节省针对特定业务的编程。而且对于某些**高频的适时刷新**，访问内存或sessionStorage，远比访问浏览器XMLHttpRequest并命中http协议的cache要高性能得多

## 除此之外

浏览器原生的memoryStorage、sessionStorage、localStorage不提供缓存命中、失效、回收、溢出、加密机制，本库扩展了以上功能

# 使用说明

## 兼容性与扩展性

兼容所有支持sessionStorage、localStorage的浏览器，如IE8  
除localStorage外，如果需要可扩展至websql等本地数据库

## 安装

> npm install @po-to/pt-cache --save-dev

> define([ "@po-to/pt-cache" ],function( ptcache ){ ... });

## 目录结构

> 源文件：./src， 案例：./examples， 文档：./docs

## 编译

> npm start

## 运行案例

> npm run examples

## 依赖

- 本库并不限制自定义缓存头的具体实现，如借用http协议自定义头X-Cache等，仅提供接口：
```
    interface IRequestResult {
        cache?: { type?: CacheType, expired?: string, version?: string, encryption?: boolean },
        notModified?: boolean,
        dataType: string,
        data: any
    }
```

- 本库并不提供外部请求的具体实现，如ajax等，仅提供接口：
```
    interface IRequestOptions {
        url: string;
        method?: string;
        data?:{[key:string]:any};
        render?(data:any):any;
        headers:{[key:string]:any};
        version?: string;
        timeout?: number;
    }

    interface IRequest{
        (request: IRequestOptions,success:(data:IRequestResult)=>void,fail:(error:Error)=>void) : void;
    }

    //用户可自由引入第三方库，如jquery的$.ajax来封装实现以上接口，假设requestFunction就是你实现IRequest接口的外部请求方法，
    //调用：ptcache.setConfig({request:requestFunction})来配置使用
```  


- 本库并不提供对缓存写入的字符加密解密的具体实现，仅提供接口：
```
    interface IEncryption {
        encrypt: (value: string) => string;
        decrypt: (code: string) => string;
    }
    //用户可自由引入第三方库，如：goolge的CryptoJS.AES，假设myEncryption就是你实现IEncryption接口的方法
    /*
        ptcache.setConfig(encryption:{
            encode : function(str){
                var key = 'dsfsdfsdfe';//key可由服务端生成
                var iv = key.substr(0,16);
                key = CryptoJS.enc.Utf8.parse(key);
                iv = CryptoJS.enc.Utf8.parse(iv);
                str = CryptoJS.AES.encrypt(str,key,{iv:iv,padding:CryptoJS.pad.ZeroPadding});
                return str.ciphertext.toString(CryptoJS.enc.Base64);
            },
            decode : function(str){
                var key = 'dsfsdfsdfe';//key可由服务端生成
                var iv = key.substr(0,16);
                key = CryptoJS.enc.Utf8.parse(key);
                iv = CryptoJS.enc.Utf8.parse(iv);
                str = CryptoJS.AES.decrypt(str,key,{iv:iv,padding:CryptoJS.pad.ZeroPadding});
                return CryptoJS.enc.Utf8.stringify(str);
            }
        })
    */
```

- 本库仅提供一种序列化对象进行存储的序列化器：json，如果你需要别的序列化器，请实现接口：
```
    interface ISerialization {
        decode: (str: string) => any;
        encode: (data: any) => string;
    }
    /*
    比如，你想在缓存中存入xml对象，请调用：ptcache.setConfig({
        serializations:{
            xml : {
                decode: (str: string) => xml //具体请自行实现
                encode: (data: xml) => string //具体请自行实现
            }
        }
    })
    */
```

## API说明


### 写入一笔cache

> 如：ptcache.setItem("list",new ptcache.CacheContent([...]))

```
/*
@param key:string 为cache的key
@param content: CacheContent 为cache的值，稍后会详细说明
@param type?: CacheType 为cache类型，取值为0,1,2 ，默认为0，即内存型
    enum CacheType {
        Ram = 0, 内存型
        Session = 1, //会话型
        Local = 2, //持久型
    }
@return boolean 是否创建成功
*/
function setItem(key: string, content: CacheContent, type?: CacheType): boolean;
```
ptcache.CacheContent是本库的一个类，写入缓存的数据必须用这个类包装：
```
class CacheContent {
    /*
    @param data?: any 为要写入cache的值，如果data为null或是undefined，表示不写入data，即表示更新某cache
    @param dataType?: string 为data值的类型，由于sessionStorage和localStorage只能存储文本，当data值不为文本时，本库将根据此dataType来序列化和反序列化，此默认值为"json"
    @param expired?: string 为cache的过期时间
        如果expired为一个数字描述，代表相对时间：
            expired > 0 表示expired秒之后过期
            expired = 0 表示立即过期，等于写入缓存无效
            expired < 0 表示永不过期，除非缓存类型大生命周期结束
        如果expired为一个标准的日期描述，即可以用JS内置的new Date(expired)转化为时间，则表示到了expired时间后过期
    @param version?: string 为需要的版本验证，类似于http协议中的ETag。
        如果一笔cache在有效期内，将直接命中并返回该笔cache
        如果一笔cache已经失效：
            如果这笔cache无version描述，则表示命中失败，取出来的cache为null
            如果这笔cache有version描述，则表示该笔cache需要重新通过版本进行验证，验证结果有可能是not modified或是失效
    @param encryption?: boolean 是否需要加密存储，如果为true，本库将调用Encryption.encrypt()或decrypt()方法加、解密之后再储存。
        本库不直接提供加解密的实现，但提供接口：
        interface IEncryption {
            encrypt: (value: string) => string;
            decrypt: (code: string) => string;
        }
        用户可自行引用第三方加解密库，如：google的CryptoJS，使用案例中有演示。
        使用此参数前，用户需要先调用setConfig({encryption:myEncryption})设置加解密方法
    */
    constructor(data?: any, dataType?: string, expired?: string, version?: string, encryption?: boolean);
}
```

### 读取一笔cache

> 如：var result = ptcache.getItem("list");

```
/*
@param key: string 要获取的缓存key
@param type?: CacheType 要从何种缓存池中获取，通常可不传，本库将按memoryStorage > sessionStorage > localStorage依次查找
@return CacheResult | null 返回为null表示未命中缓存，返回为CacheResult解释如下：
    class CacheResult {
        readonly value: string; //cache序列化后的原始值，为字符串
        readonly version: string; //该cache的版本描述
        readonly from: CacheType; //该cache来自于哪个类型，参见CacheType
        toData(): any; //取出最终的cache值
    }
    从此可看出，getItem取出的cache并不是最终的缓存值，而是经过包装的CacheResult实例对象，调用此对象的toData()方法，才可以得到最终值。
    如果CacheResult实例对象的version属性为空，表示该cache是有效的；反之，表示虽然命中的cache，但还不一定是最终有效，需要根据此version值确认
*/
function getItem(key: string, type?: CacheType): CacheResult | null;
```

### 更新一笔cache

> 如：ptcache.setItem("list",new ptcache.CacheContent(null,null,100))

本库不直接提供更新一笔cache的方法，用户可直接调用setItem重设即可；
如果需要更新的仅仅是过期时间或是版本标识，不需要更新内容，在调用setItem方法的时候，new ptcache.CacheContent(data,dataType,expired,version,encryption),其中data,dataType传入null值即可；
如 ptcache.setItem("list",new ptcache.CacheContent(null,null,100))，就表示将key为"list"的这笔cache往后增加100秒有效期


### 删除一笔cache

> 如：ptcache.removeItem("list");

```
/*
    @param key: string 要删除的缓存key
    @param type?: CacheType 要从何种缓存池中删除，通常可不传，本库将按memoryStorage > sessionStorage > localStorage依次查找
*/
function removeItem(key: string, type?: CacheType): void;
```

### 清空所有cache

> 如：ptcache.clear(1);

```
/*
    @param type?: CacheType 要清空何种缓存池，不传为清空所有三种缓存
*/
function clear(type?: CacheType): void;
```

### 与外部请求相结合

> 如：ptcache.load({url:"xxx"}).then(function(data){...});

```
/*
    @param requestOptions: IRequestOptions 发起外部请求的数据，该数据将传入第三方外部请求实现API:IRequest，进行外部请求
        interface IRequestOptions {
            url: string; //请求地址
            method?: string; //方法，如"get","post","put","delete"
            data?: { //请求参数
                [key: string]: any;
            };
            render?(data: any): any; //对请求结果加工
            headers: { //请求头设置
                [key: string]: any;
            };
            version?: string; //版本验证
            timeout?: number; //外部请求的超时时间
        }
    @param succss?: (data: any) => void 请求成功回调
    @param fail?: (error: Error) => void) 请求失败回调
    @return  Promise<any>
*/
function load(requestOptions: IRequestOptions, succss?: (data: any) => void, fail?: (error: Error) => void): Promise<any>;
```
注意：ptcache.load方法封装了ptcache.getItem方法，在发起外部请求之前，会查询缓存中是否存在以url为key的缓存，如果存在，则进一步验证version的有效性。如果验证有效，则不发起真实的外部请求，而返回cache值
所以回调函数中接受的data: any，是最终的值，而非CacheResult实例对象。

外部请求，可由server端输出一个自定义的responseHeader X-Cache,值为"1,3600,Wed Dec 21 2016 17:25:57"，表示要将该数据放入sessionStorage中缓存，缓存有效期是3600秒，版本识别号为Wed Dec 21 2016 17:25:57，缓存到期后将version:Wed Dec 21 2016 17:25:57发送回server进行验证，如果无需更新，server可返回304,(Not Modified),并重新给该缓存增加有效期


### config配置

> 如：ptcache.setConfig({namespace:"$#@"}})

```
function setConfig(options: {
    namespace?: string; //在存入sessionStorage或是localStorage时，每一笔cache都会以此namespace为前缀，避免冲突
    ramStorageLimit?: number //内存型缓存最大占用内存空间，默认为0，表示无限制
    encryption?: IEncryption; // 加解密方法，由第三方库提供
    mappingKey?: (key: string) => string; //每笔cache的key，可以经过此方法映射，比如以url为key进行写入会太长，可将url进行md5之后再作为key写入
    /* 
    由于sessionStorage或是localStorage只能储存文本，所以存入数据非文本时，将跟据dataType来调用此序列化方法进行序列化与反序列化
    interface ISerialization {
        decode: (str: string) => any;
        encode: (data: any) => string;
    }
    本库默认提供一种ISerialization，名字为"json"
    */
    serializations?: { 
        string: ISerialization;
    };
    //外部请求的方法，由第三方库提供
    request?: IRequest
}): void;
```

### 缓存空间的回收与溢出处理

> 内部自动执行

设置一笔缓存时，sessionStorage和localStorage在写满溢出时会抛出一个错误，本库会捕获这个错误，之后会采取回收策略  
memoryStorage不会产生溢出错误，可自行设置一个存储上限值（本库会将所有写入memoryStorage的每笔cache的key，value长度求和，作为占用空间值），超过这个值后，本库会采取回收策略。  
用户可以通过setConfig({ramStorageLimit: 1024*20})来设置此值，由于js无法真正管理内存，所以此值单位为字符个数，并不精准  
回收策略为：
- 先将缓存池中所有失效的缓存清除，如果依然不够存储空间
- 将缓存池中所有缓存按**访问时间**排序，回收较久没访问的冷门数据





