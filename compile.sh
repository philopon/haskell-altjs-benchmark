#!/bin/bash

set -e

OUT=output
MINIFY=uglifyjs
HASTEC=hastec
FAY="fay --package-conf $HOME/cabal-sandbox/fay-0.22.0.0/.cabal-sandbox/x86_64-osx-ghc-7.8.3-packages.conf.d/"
PSC=psc
ELMMAKE=elm-make
GHCJS=ghcjs
IDRIS=idris

mkdir $OUT | true

echo javascript
$MINIFY javascript.js > $OUT/javascript.js

echo haste-no-opt
rm -r haskell.hi haskell.o haskell.js main | true
$HASTEC haskell.hs
cat extra/haste.js >> haskell.js
$MINIFY haskell.js > $OUT/haste-no-opt.js

echo haste-opt
rm -r haskell.hi haskell.o haskell.js main | true
$HASTEC -O2 --opt-all haskell.hs
cat extra/haste.js >> haskell.js
$MINIFY haskell.js > $OUT/haste-opt.js

echo fay-no-opt
$FAY -s fay.hs | sed 's/Fay$$_(Fay.main, true);//g' > fay.js
cat extra/fay.js >> fay.js
$MINIFY fay.js > $OUT/fay-no-opt.js

rm fay.js | true
echo fay-opt
$FAY -O -s fay.hs | sed 's/Fay$$_(Fay.main, true);//g' > fay.js
cat extra/fay.js >> fay.js
$MINIFY fay.js > $OUT/fay-opt.js

echo purescript
$PSC purescript.purs --module=Main --main=Main -o purescript.js
cat extra/purescript-pre.js purescript.js extra/purescript-post.js | $MINIFY > $OUT/purescript.js

echo elm
$ELMMAKE elm.elm
cat extra/elm.js >> elm.js
$MINIFY elm.js > $OUT/elm.js

echo ghcjs-no-opt
rm -r haskell.hi haskell.o haskell.js main | true
$GHCJS ghcjs.hs
$MINIFY ghcjs.jsexe/all.js > $OUT/ghcjs-no-opt.js

echo ghcjs-opt
rm -r haskell.hi haskell.o haskell.js main | true
$GHCJS -O2 ghcjs.hs
$MINIFY ghcjs.jsexe/all.js > $OUT/ghcjs-opt.js

echo idris
$IDRIS idris.idr --codegen javascript -o idris.js
sed 's/main()//g' idris.js > idris-no-main.js
cat extra/idris.js >> idris-no-main.js
$MINIFY idris-no-main.js > $OUT/idris.js

echo cleanup
rm -r haskell.hi haskell.o haskell.js haskell.js_hi haskell.js_o haskell.jsexe main elm.js idris.ibc idris.js idris-no-main.js fay.js ghcjs.js_hi ghcjs.js_o ghcjs.jsexe purescript.js | true
