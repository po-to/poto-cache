/*!
 * Copyright po-to.org All Rights Reserved.
 * https://github.com/po-to/
 * Licensed under the MIT license
 */
export interface Encryption {
    encrypt: (value: string) => string;
    decrypt: (code: string) => string;
}
export interface CacheOptions {
    value: string | undefined;
    expired: string | undefined;
    version: string | undefined;
    encryption: boolean | undefined;
}
export interface Serialization {
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
export declare function parseContent(contentType: string, content: string): any;
export declare class CacheContent {
    readonly data: any;
    readonly dataType: string;
    readonly expired: string;
    readonly version: string;
    readonly encryption: boolean;
    private _str;
    constructor(data?: any, dataType?: string, expired?: string, version?: string, encryption?: boolean);
    toValue(): string;
    toOptions(): CacheOptions;
}
export declare enum CacheType {
    Ram = 0,
    Session = 1,
    Local = 2,
}
export declare function setConfig(options: {
    namespace?: string;
    encryption?: Encryption;
    mappingKey?: (key: string) => string;
    serializations?: {
        string: Serialization;
    };
    request?: (requestOptions: IRequestOptions, success: (data: RequestResult) => void, fail: (error: Error) => void) => void;
}): void;
export declare function getItem(key: string, type?: CacheType): CacheResult | null;
export declare function setItem(key: string, content: CacheContent, type?: CacheType): boolean;
export declare function removeItem(key: string, type?: CacheType): void;
export declare function clear(type?: CacheType): void;
export interface IRequestOptions {
    url: string;
    method?: string;
    data?: {
        [key: string]: any;
    };
    render?(data: any): any;
    headers: {
        [key: string]: any;
    };
    version?: string;
}
export interface RequestResult {
    cache?: {
        type?: CacheType;
        expired?: string;
        version?: string;
        encryption?: boolean;
    };
    notModified?: boolean;
    dataType: string;
    data: any;
}
export declare function load(requestOptions: IRequestOptions, succss?: (data: any) => void, fail?: (error: Error) => void): Promise<any>;
