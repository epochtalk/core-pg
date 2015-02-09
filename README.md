# PostgreSQL core implementation for Epochtalk
Epochtalk's core implementation using PostgreSQL 9.x

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
