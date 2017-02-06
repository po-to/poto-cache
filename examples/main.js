define(["pt-cache", "tomato"], function (ptcache, tomato) {
	var idkey = 'dsfsdfsdfe';
	ptcache.setConfig({
		encryption:
		{
			encrypt: function (str) {
				var key = idkey;
				var iv = key.substr(0, 16);
				key = CryptoJS.enc.Utf8.parse(key);
				iv = CryptoJS.enc.Utf8.parse(iv);
				str = CryptoJS.AES.encrypt(str, key, { iv: iv, padding: CryptoJS.pad.ZeroPadding });
				return str.ciphertext.toString(CryptoJS.enc.Base64);
			},
			decrypt: function (str) {
				var key = idkey;
				var iv = key.substr(0, 16);
				key = CryptoJS.enc.Utf8.parse(key);
				iv = CryptoJS.enc.Utf8.parse(iv);
				str = CryptoJS.AES.decrypt(str, key, { iv: iv, padding: CryptoJS.pad.ZeroPadding });
				return CryptoJS.enc.Utf8.stringify(str);
			}
		}
	});
	ptcache.setConfig({
		request:
		function (requestOptions, success, fail) {
			var data = Object.assign({
				success: function (data) {
					var headers = data.responseHeaders;
					var body = data.responseBody;
					var cacheSet = headers['X-Cache'].split(",");
					success({ dataType: "json", data: body, cache: { type: cacheSet[0], expired: cacheSet[1], version: cacheSet[2], encryption: cacheSet[3] }, notModified: headers.httpcode == 304 })
				},
				error: function (data) {
					fail(new Error(data.toString()))
				}
			}, requestOptions, { headers: { "X-Cache-Version": requestOptions.version } })
			$.ajax(data);
		}
	});
	ptcache.setConfig({
		taskCounter: tomato.taskCounter
	});
	tomato.taskCounter.addListener(tomato.TaskCountEvent.Added, function (e) {
		console.log("Added");
	}).addListener(tomato.TaskCountEvent.Completed, function (e) {
		console.log("Completed");
	}).addListener(tomato.TaskCountEvent.Busy, function (e) {
		console.log("Busy");
	}).addListener(tomato.TaskCountEvent.Free, function (e) {
		console.log("Free");
	});
	$(document.body).on("click", "button.case", function (e) {
		var caseID = e.target.getAttribute("data-case");
		switch (caseID) {
			case "1":
				ptcache.setItem("list", new ptcache.CacheContent([1, 2, 3]));
				console.log(ptcache.getItem("list"));
				break;
			case "2":
				ptcache.setItem("user", new ptcache.CacheContent({ userName: "jimmy", userId: "1", nickname: "Knight" }, "json", 10), 1);
				console.log(ptcache.getItem("user").toData());
				break;
			case "3":
				console.log(ptcache.getItem("user"));
				break;
			case "4":
				ptcache.setItem("doc", new ptcache.CacheContent("<a>test</a>", "xml", 10, "v0.1"), 1);
				console.log(ptcache.getItem("doc"));
				console.log(ptcache.getItem("doc").toData());
				break;
			case "5":
				console.log(ptcache.getItem("doc"));
				break;
			case "6":
				ptcache.setItem("ciphertext", new ptcache.CacheContent([1, 2, 3], "json", -1, '', true), 1);
				console.log(ptcache.getItem("ciphertext"));
				break;
			case "7":
				ptcache.load({ url: "ajax.json", hideLoading: true }).then(function (data) {
					console.log(data);
				});
				break;
			case "8":
				ptcache.load({ url: "ajax.json" }).then(function (data) {
					console.log(data);
				});
				break;
		}
	});

});