#!/bin/bash

set -e

OUT=output
RESULT=result
NODE=node

mkdir result | true

for file in `ls $OUT`; do
  echo $file

  echo -n > $RESULT/$file

  for i in `seq 0 9`; do
    echo $i
    sleep 2
    $NODE $OUT/$file 2>> $RESULT/$file
  done
done
