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

# Boards

* Expectations

    * Existence of board

    * name

    * description

    * id

* boards.all()

    * Existence of results array

    * Length of results array

* boards.find(id)

    * Expectations

    * children_ids (or lack thereof)

    * parent_board_id (or lack thereof)

    * category_id (or lack thereof)

# Threads

* Expectations

    * Existence of thread

    * board_id

* threads.find(id)

    * Expectations

* threads.byBoard(board_id)

    * Existence of response array (or lack thereof)

    * Length of response array (if array exists)
