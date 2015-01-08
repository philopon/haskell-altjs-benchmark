module Main where

tarai : Int -> Int -> Int -> Int
tarai x y z = tarai' x y z

tarai' : Int -> Int -> Int -> Int
tarai' x y z =
    if x <= y
    then y
    else tarai (tarai (x-1) y z) (tarai (y-1) z x) (tarai (z-1) x y)

test = (tarai 11 5 0)
