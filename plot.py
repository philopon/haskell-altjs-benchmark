#!/usr/bin/env python

import sys
import numpy
import os.path as path
import matplotlib.pyplot as plot

class BenchmarkResult(object):
    def __init__(self, file):
        self.file = file
        self.name = path.splitext(path.basename(file))[0]

        self.data = []
        with open(file, 'r') as f:
            for line in f:
                self.data.append(int(line))
        
        self.mean = numpy.mean(self.data)
        self.std  = numpy.std(self.data)
    
    def __str__(self):
        return self.name + ":" + str(self.mean) + "+-" + str(self.std)

X = []
Y = []
stds = []
names = []

for i, p in enumerate(sys.argv[2:]):
    result = BenchmarkResult(p)
    X.insert(0, i)
    stds.append(result.std / 1e9)
    Y.append(result.mean / 1e9)
    names.append(result.name)

plot.title("benchmark of Tarai(x=11,y=5,z=0)")
plot.barh(X, Y, align="center", xerr=stds)
plot.yticks(X, names)
plot.xlabel("time (sec)")
plot.savefig(sys.argv[1])
