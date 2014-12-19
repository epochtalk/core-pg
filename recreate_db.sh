#!/usr/bin/env bash
wd=`dirname $BASH_SOURCE`
dropdb epoch_dev
createdb epoch_dev
psql epoch_dev < $wd/schema/schema.sql
psql epoch_dev < $wd/schema/add_constraints.sql
psql epoch_dev < $wd/schema/user_schema.sql
