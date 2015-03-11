# PostgreSQL core implementation for Epochtalk
Epochtalk's core implementation using PostgreSQL 9.x

# Schema
Epochtalk uses UUIDs that are reverse compatible with existing systems that use serial/integer based keying. UUIDs are at a clear advantage in more advanced systems:

> This is 16-octet / 128 bit type compatible with most common GUID and UUID generators, supporting distributed application design, defined by [RFC 4122, ISO/IEC 9834-8:2005](http://tools.ietf.org/html/rfc4122). It is represented by 32 lowercase hexadecimal digits, displayed in five groups separated by hyphens, in the form 8-4-4-4-12 for a total of 36 characters (32 alphanumeric characters and four hyphens).

# Usage
Recommended: Use a separate module to use this require and depend it throughout your project. This allows the initialization from the configuration variables to be in just one place.
```javascript
var path = require('path');
var config = require(path.join(__dirname, 'config'));
var core = require('epochtalk-core-pg');
module.exports = core(config.db);
```
# API
Doc generation coming soon. For now look for code in the following models:
* `boards`
* `categories`
* `posts`
* `threads`
* `users`

# License
[ISC](LICENSE.md) Copyright (c) 2015, Slickage Studios LLC
