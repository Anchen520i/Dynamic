
const redirectMap = new Map([
    ['gh', 'https://github.com/search?q=$1&type=users'],      // GitHub Users
    ['bi', 'https://www.bing.com/search?q=$1&setmkt=zh-CN'],  // Bing (Simplified Chinese)
    ['bd', 'https://www.baidu.com/s?wd=$1&ie=utf-8'],         // Baidu
    ['ddg', 'https://duckduckgo.com/?q=$1'],                  // DuckDuckGo
    ['tb', 'https://s.taobao.com/search?q=$1'],               // Taobao
    ['tm', 'https://list.tmall.com/search_product.htm?q=$1'], // Tmall
    ['jd', 'https://search.jd.com/Search?keyword=$1&enc=utf-8'] // JD.com
]);

// --- Script Logic ---
(function() {
    // Get the original request URL
    const url = $request.url;

    // The regex is designed to capture the prefix (e.g., 'gh') and the query.
    // It matches URLs like: https://www.google.com/search?q=gh+some+query
    // Breakdown of the regex:
    // ^https?://www\.google\.[^/]+/search\?  - Matches the base Google search URL
    // .*?q=                                - Lazily matches until the query parameter 'q='
    // ([a-zA-Z]{2,3})                       - Captures the 2 or 3 letter prefix (e.g., 'gh', 'ddg') -> $1 in regex
    // (?:\+|%20)+                           - Matches the space separator ('+' or '%20')
    // ([^&]+)                               - Captures the actual search term -> $2 in regex
    // (?:&.*)?$                             - Optionally matches any other parameters at the end
    const regex = /^https?:\/\/www\.google\.[^\/]+\/search\?.*?q=([a-zA-Z]{2,3})(?:\+|%20)+([^&]+)(?:&.*)?$/i;
    const match = url.match(regex);

    // If the URL doesn't match the pattern, do nothing and let the request proceed.
    if (!match) {
        $done();
        return;
    }

    // Extract the prefix and the query from the regex match
    const prefix = match[1].toLowerCase(); // Convert to lowercase for case-insensitive matching
    const query = match[2]; // The query is already URL-encoded, which is what we want

    // Check if the extracted prefix exists in our redirection map
    if (redirectMap.has(prefix)) {
        // Get the target URL template from the map
        const targetUrlTemplate = redirectMap.get(prefix);
        // Replace the placeholder '$1' with the captured query
        const newUrl = targetUrlTemplate.replace('$1', query);

        // Log the redirection for debugging purposes
        console.log(`[Search Redirect] Redirecting "${prefix}" search for "${decodeURIComponent(query)}" to: ${newUrl}`);

        // Construct the HTTP 302 Found response to perform the redirect
        const response = {
            status: 302,
            headers: {
                'Location': newUrl
            }
        };

        // Complete the script by returning the redirection response
        $done({ response });

    } else {
        // If the prefix is not in our map, let the original Google search request proceed
        $done();
    }
})();
