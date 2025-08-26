const url = $request.url;
const queryParam = /q=([^&]+)/.exec(url);

if (queryParam) {
    let q = decodeURIComponent(queryParam[1]).toLowerCase().trim();
    q = q.replace(/\s+/g, ' '); // 压缩多空格
    const parts = q.split(' ');
    const prefix = parts[0];
    const searchTerm = parts.slice(1).join('+'); // 支持多词查询，用+连接
    
    let redirectUrl = null;
    
    switch (prefix) {
        case 'gh':
            redirectUrl = `https://github.com/search?q=${searchTerm}&type=users`;
            break;
        case 'bi':
            redirectUrl = `https://www.bing.com/search?q=${searchTerm}&setmkt=zh-CN&setlang=zh-CN`;
            break;
        case 'bd':
            redirectUrl = `https://www.baidu.com/s?wd=${searchTerm}&ie=utf-8`;
            break;
        case 'ddg':
            redirectUrl = `https://duckduckgo.com/?q=${searchTerm}`;
            break;
        case 'tb':
            redirectUrl = `https://s.taobao.com/search?q=${searchTerm}`;
            break;
        case 'tm':
            redirectUrl = `https://list.tmall.com/search_product.htm?q=${searchTerm}`;
            break;
        case 'jd':
            redirectUrl = `https://search.jd.com/Search?keyword=${searchTerm}&enc=utf-8`;
            break;
        default:
            console.log(`No matching prefix: ${prefix}`);
            $done({}); // 无匹配，放行
            return;
    }
    
    if (redirectUrl) {
        console.log(`Redirecting to: ${redirectUrl}`);
        $done({
            response: {
                status: 302,
                headers: { Location: redirectUrl }
            }
        });
    } else {
        $done({});
    }
} else {
    console.log('No q parameter in URL');
    $done({});
}
