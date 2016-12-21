# pt-cache
a shim library for operate browser storage

- 项目主页：[po-to.org/pt-cache](http://po-to.org/pt-cache)
- 项目地址：[Github](https://github.com/po-to/pt-cache)
- API文档： [查看文档](http://po-to.org/pt-cache/docs)
- 简介
- 使用说明

# 简介
 关于网页的cache，我们知道HTTP协议中处理缓存的机制一般有：Expires、Last-Modified、Etag等，由浏览器实现并封装，不可以编程方式访问。  
 H5提供由manifest指定的AppCache,可对站点文件的离线存储进行简单配制，使用场景很有限。  
 在实际开发中，我们经常需要可编程控制的数据级cache，基于H5为我们提供了*sessionStorage*和*locationStorage*，在此之上进行抽象与封装，因此产生了此框架。

 ## 更广泛的概念
 我们假定缓存除了创建时设定的有效条件和周期，还存在不同类别的生命周期：
- memoryStorage -- 存于内存中，即JS变量，刷新页面将消失
- sessionStorage -- 存于浏览器sessionStorage中，关闭浏览器将消失
- locationStorage -- 存在于浏览品locationStorage中，可认为长久存在

浏览器原生为我们维护了三种不同生命周期的cache，但是却不能在此基础上与缓存自身的周期设定取并集，以此来满足我们在实际开发中某些应用场景。比如：

>*最新列表*，需求希望页面刷新时拉取一次，其后每1小时自动拉取一次，而且点击“*立即更新*”的按钮，能立即拉取。

- 如果使用http缓存：
    1. 最新列表不一定是一个独立的API接口。
    2. 设定有效期为1小时，但是无法做到页面刷新或点击“*立即更新*”按钮时立即更新。
- 我们不得不用*setInterval*方法：
    1. 针对这个具体需求，需要具体的编程
    2. 如果某一天需求变更为半小时拉取一次，我们又不得不翻出这段JS来更改
- 如果使用pt-cache：

    `
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

    /* 此时，api可输出一个自定义的X-Cache=r3600s，**r**表示该api输出的数据将缓存放入内存，**3600s**表示缓存1小时 */
    `

    这样一来：JS虽然每1秒会去拉取一次数据，但因为我们设定了X-Cache=r3600s的自定义http头，所以在1小时内，JS拉取的只是缓存在内存中的数据。对于前端来说，用一个通用的前后端协议即可简化并节省针对特定业务的编程。而且对于某些**高频的适时刷新**，访问内存或sessionStorage，远比访问浏览器XMLHttpRequest并命中http协议的cache要高性能得多
## 除此之外

浏览器原生的memoryStorage、sessionStorage、locationStorage不提供缓存命中、失效、回收、溢出、加密机制，本库扩展了以上功能

# 使用说明

## 安装
> npm install @po-to/pt-cache --save-dev

> define([ "@po-to/pt-cache" ],function( ptcache ){ ... });

## 依赖

- 本库并不提供外部请求的具体实现，如ajax等，仅提供接口：
·
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
·  
用户可自由引入第三方库，如jquery的$.ajax来封装实现以上接口

- 本库并不限制自定义缓存头的具体实现，如借用http协议自定义头X-Cache等，仅提供接口：
·
    interface RequestResult {
        cache?: { type?: CacheType, expired?: string, version?: string, encryption?: boolean },
        notModified?: boolean,
        dataType: string,
        data: any
    }
·