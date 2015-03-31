# Coverage

The Expectations sections are used to check that the correct values for each
data type have been stored and can be recalled with the db's find utilities.

## Users

* Expectations

    * Existence of user

    * username

    * email

    * id

* users.all()

    * Length of response array

* users.userByUsername(username)

    * Expectations

* users.userByEmail(email)

    * Expectations

* users.find(id)

    * Expectations

## Categories

* Expectations

    * Existence of category

    * id

    * name

* categories.all()

    * Length of response array

* categories.find(id)

    * Expectations
