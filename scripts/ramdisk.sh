#!/usr/bin/env bash

if [ -z "$1" ]; then
  echo "Must specify command 'create' or 'destroy'. Nothing done."
  exit 1
fi

if [ "$1" = "create" ]; then
  # creates a ~500mb ram disk
  diskutil erasevolume HFS+ 'VoyeurTestingDisk' `hdiutil attach -nomount ram://1024000`
fi

if [ "$1" = "destroy" ]; then
  echo "Not implemented"
  exit 1
fi

exit $?
