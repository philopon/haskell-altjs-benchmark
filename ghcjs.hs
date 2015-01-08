{-# LANGUAGE JavaScriptFFI #-}
module Main where

import System.IO
import qualified GHCJS.Types   as T
import qualified GHCJS.Foreign as F
import qualified GHCJS.Marshal as M

type HrTime = T.JSArray Int

foreign import javascript unsafe "$r = process['hrtime']()" start :: IO HrTime
foreign import javascript unsafe "$r = process['hrtime']($1)" diff :: HrTime -> IO HrTime
foreign import javascript unsafe "console.warn($1[0] * 1e9 + $1[1])" putResult :: HrTime -> IO ()

tarai :: Int -> Int -> Int -> Int
tarai x y z = x `seq` y `seq` z `seq` tarai' x y z

tarai' :: Int -> Int -> Int -> Int
tarai' x y z =
    if x <= y
    then y
    else tarai (tarai (x-1) y z) (tarai (y-1) z x) (tarai (z-1) x y)

main :: IO ()
main = do
    st <- start
    print (tarai 11 5 0)
    diff st >>= putResult
