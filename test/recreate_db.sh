#!/usr/bin/env bash
dropdb epoch_dev
createdb epoch_dev
psql epoch_dev < ../schema/schema.sql

