#!/usr/bin/env bash
if [ $# -eq 1 ]
then
  database=$1
else
  database="epoch_dev"
fi
wd=`dirname $BASH_SOURCE`
dropdb $database
createdb $database
psql $database < $wd/schema/schema.sql
psql $database < $wd/schema/add_constraints.sql
psql $database < $wd/schema/user_schema.sql
psql $database < $wd/schema/metadata_schema.sql
