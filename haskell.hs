module Main where

tarai :: Int -> Int -> Int -> Int
tarai x y z = x `seq` y `seq` z `seq` tarai' x y z

tarai' :: Int -> Int -> Int -> Int
tarai' x y z =
    if x <= y
    then y
    else tarai (tarai (x-1) y z) (tarai (y-1) z x) (tarai (z-1) x y)

main :: IO ()
main = print (tarai 11 5 0)
