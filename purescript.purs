module Main where

import Debug.Trace

tarai :: Number -> Number -> Number -> Number
tarai x y z = tarai' x y z

tarai' :: Number -> Number -> Number -> Number
tarai' x y z =
    if x <= y
    then y
    else tarai (tarai (x-1) y z) (tarai (y-1) z x) (tarai (z-1) x y)

main = print (tarai 11 5 0)
