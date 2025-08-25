/*
 * Surge Search Engine Redirect Script
 */

// 定义搜索引擎映射
// 格式： "前缀": "目标URL模板"
// $1 将被替换为实际的搜索关键词
const searchEngines = {
    'bi': 'https://www.bing.com/search?q=$1&setmkt=zh-CN&setlang=zh-CN',
    'bd': 'https://www.baidu.com/s?wd=$1',
    'ddg': 'https://duckduckgo.com/?q=$1', // 示例：轻松添加DuckDuckGo
    'gh': 'https://github.com/search?q=$1' // 示例：轻松添加GitHub搜索
};

function main(request) {
    const url = request.url;
    const urlObject = new URL(url);

    // 只处理 Google 搜索的 q 参数
    if (urlObject.hostname.includes("google") && urlObject.searchParams.has("q")) {
        const query = urlObject.searchParams.get("q").trim();

        // 遍历我们定义的搜索引擎映射
        for (const prefix in searchEngines) {
            // 检查查询是否以 "前缀 + 空格" 开始
            if (query.startsWith(prefix + ' ')) {
                // 提取真正的搜索词
                const searchTerm = query.substring(prefix.length).trim();

                // 如果搜索词不为空
                if (searchTerm) {
                    // 使用模板构建新的URL
                    const newUrl = searchEngines[prefix].replace('$1', encodeURIComponent(searchTerm));

                    // 返回一个 302 重定向响应
                    const response = {
                        status: 302, // 或 307
                        headers: {
                            'Location': newUrl
                        }
                    };

                    return { response };
                }
            }
        }
    }

    // 如果没有匹配到任何前缀，或者不是Google搜索，则不进行任何操作
    return {};
}

// Surge 脚本的入口点
$done(main($request));
