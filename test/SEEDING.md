Seeding
=======

For seeding the test database.

Seeding is designed to be readable and somewhat easily configurable.
The current fixture style is as follows...

fixture.js
```javascript
module.exports = {
  run: [         // order in which to run "methods" on "data", by typeName
    'firstTypeName',
    'secondTypeName'
  ],
  methods: {     // keyed method to run for each "data" type of typeName
    typeName: function
  },
  data: {         // keyed by typename
    typeName: [   // array of objects to create
      {           // options for respective "method"
        option_name: 'otherTypeName.arrayIndex.field'
      }
    ]
  }
}
```

(See [example fixture](./seed/example-fixture.js) for more help)

### data

The `typeName` specifies what kind of data you are generating. The name itself
is not important, but it does need to remain consistent throughout the
fixture file in `methods` and `run`.

For each object, `data[typeName][index]` in the array `data[typeName]`, the
process will call the method defined in `methods` with the same `typeName` using
the contents of the object as arguments for the method.  An empty object will
pass no arguments into the method.

Options can pull from previously run data.  The populator keeps a runtime object
containing the results from each method.  The fields can be accessed:

```javascript
// array entry for typeName
{ optionName: 'otherTypeName.arrayIndex.field' }
// example for getting id from parent
{ child: 'parent.0.id' }
```

The `otherTypeName` specifies the type to pull from in the `data` object, and
the `arrayIndex` specifies which entry within the typeName array to pull from.
The idea is that the field is uniquely generated at runtime and is nessecary to
create the relationship between the two types of data.

### methods

Each key in `methods` has a function type value.  The function will take options
from the corresponding data type as explained above.

### run

An array of strings to specify what order the `methods` will run on `data`.
This allows tiering of data, in the case that certain data types will need to
exists before creating other types of data.
