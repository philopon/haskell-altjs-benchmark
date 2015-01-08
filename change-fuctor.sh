#!/bin/bash

SED=gsed

[ "" = "$3" ] && exit 1

X=$1
Y=$2
Z=$3

D='[0-9]\+'
JSED_QUERY="s/tarai($D,$D,$D)/tarai($X,$Y,$Z)/"
HSED_QUERY="s/(tarai $D $D $D)/(tarai $X $Y $Z)/"
PSED_QUERY="s/Tarai(x=$D,y=$D,z=$D)/Tarai(x=$X,y=$Y,z=$Z)/"

$SED -i "$JSED_QUERY" javascript.js
for file in haskell.hs fay.hs purescript.purs elm.elm ghcjs.hs idris.idr; do
  $SED -i "$HSED_QUERY" $file
done

$SED -i "$PSED_QUERY" plot.py
