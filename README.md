# MITM
client-source-address = 127.0.0.1

# URL Rewrite
^https?://(www\.)?g(oogle)?\.cn https://www.google.com 302
^http://g\.cn http://www.google.com header
^https?://www\.google\.cn https://www.google.com 302
