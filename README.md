# pt-cache
a shim library for operate browser storage

- 项目主页：[po-to.org/pt-cache](http://po-to.org/pt-cache)
- 项目地址：[Github](https://github.com/po-to/pt-cache)
- API文档： [查看文档](http://po-to.org/pt-cache/docs)
- 简介
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

>*最新列表*，需求希望页面刷新时拉取一次，其后每1小时自动拉取一次，而且点击“*立即更新*”的按钮，能立即拉取。

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

## 依赖

- 本库并不限制自定义缓存头的具体实现，如借用http协议自定义头X-Cache等，仅提供接口：
```
    interface RequestResult {
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
    }

    interface IRequest{
        (request: IRequestOptions,success:(data:RequestResult)=>void,fail:(error:Error)=>void) : void;
    }
```  
用户可自由引入第三方库，如jquery的$.ajax来封装实现以上接口，实现之后调用：ptcache.setConfig({request:requestFunction})，requestFunction就是你实现IRequest接口的外部请求方法

## 举例说明
>写入一笔cache，如：ptcache.setItem("list",new ptcache.CacheContent([...]))
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
        @param data?: any 为要写入cache的值
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
> 读取一笔cache，如var result = ptcache.getItem("list");
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
