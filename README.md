# poto-cache
poto-cache是一个JS库，主要用来封装浏览器客户端缓存，它并不依赖于poto生态，如果需要，你也可以独立使用它。关于网页的cache，我们知道HTTP协议中处理缓存的机制一般有：Expires、Last-Modified、Etag等，由浏览器实现并封装，不可以编程方式访问。H5提供由manifest指定的AppCache,可对站点文件的离线存储进行简单配制，使用场景很有限。在实际开发中，我们经常需要可编程控制的数据级cache，基于H5为我们提供了sessionStorage和localStorage，在此之上进行抽象与封装，因此产生了此库。

# 项目主页
[www.po-to.org](http://www.po-to.org/page/articles/poto_cache/s01)

# 仓库
[Github](https://github.com/po-to/poto-cache)

# 案例
[在线浏览](http://www.po-to.org/static/examples/poto_cache) 或 /examples

# 兼容
兼容所有支持sessionStorage、localStorage的浏览器，如IE8。除localStorage外，你还可以利用其提供的接口，自行扩展至websql等本地数据库。 

# 依赖
sessionStorage、localStorage或者本地数据库

# 安装
- 使用NPM安装：npm install @po-to/poto-cache
- 手动下载安装：[Github](https://github.com/po-to/poto-cache)

# 引入
使用AMD标准模块化，推荐使用requireJS引入

# 文档
[API](http://www.po-to.org/static/api/poto_cache)

# 设置
poto-cache中的设置主要通过其对外函数setConfig()来实现：
```
export declare function setConfig(options: {
	namespace?: string;
	ramStorageLimit?: number
	encryption?: IEncryption;
	mappingKey?: (key: string) => string;
	serializations?: { 
		string: ISerialization;
	};
	request?: IRequest
}): void;　　
```

- namespace?: string;   
在存入sessionStorage或是localStorage时，每一笔cache都会以此namespace为前缀，避免冲突
- ramStorageLimit?: number;   
内存型缓存最大占用内存空间，默认为0，表示无限制
- encryption?: IEncryption;  
加解密方法，由第三方库提供
- mappingKey?: (key: string) => string;   
每笔cache的key，可以经过此方法映射，比如以url为key进行写入会太长，可将url进行md5之后再作为key写入
- serializations?: {string: ISerialization;}  
由于sessionStorage或是localStorage只能储存文本，所以存入数据非文本时，将跟据dataType来调用此序列化方法进行序列化与反序列化
- request?: IRequest  
外部请求的方法，由第三方库提供