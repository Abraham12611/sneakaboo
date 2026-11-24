| CPU | mode | renderer | projection | avg FPS | frame mean ms | frame p95 ms | JS work mean ms | JS work p95 ms | cmds | draw calls |
|---|---|---|---|---|---|---|---|---|---|---|
| 1x | normal | pixi | oblique | 59.8 | 16.7 | 16.7 | 9.52 | 15.2 | 206 | 8 |
| 1x | normal | pixi | topdown | 59.8 | 16.7 | 16.7 | 7.36 | 14 | 103 | 8 |
| 1x | normal | canvas | oblique | 59.1 | 16.9 | 16.8 | 2.47 | 4.2 | 205 | 257 |
| 1x | normal | canvas | topdown | 57.1 | 17.5 | 33.2 | 1.9 | 3.3 | 104 | 174 |
| 1x | stress | pixi | oblique | 52.4 | 19.1 | 33.4 | 17.02 | 26.8 | 561 | 8 |
| 1x | stress | pixi | topdown | 57.9 | 17.3 | 16.8 | 13.92 | 21.1 | 213 | 8 |
| 1x | stress | canvas | oblique | 59.1 | 16.9 | 16.8 | 3.48 | 5.1 | 561 | 613 |
| 1x | stress | canvas | topdown | 51.2 | 19.5 | 33.4 | 2.83 | 4.5 | 214 | 369 |
| 4x | normal | pixi | oblique | 16.6 | 60.2 | 100 | 48.8 | 87.2 | 221 | 8 |
| 4x | normal | pixi | topdown | 21.9 | 45.6 | 66.8 | 36.9 | 58.4 | 101 | 8 |
| 4x | normal | canvas | oblique | 46.1 | 21.7 | 33.4 | 14.59 | 23.7 | 259 | 331 |
| 4x | normal | canvas | topdown | 49.3 | 20.3 | 33.4 | 13.09 | 20.4 | 106 | 176 |
| 4x | stress | pixi | oblique | 5.2 | 191.2 | 366.6 | 182.6 | 343 | 615 | 8 |
| 4x | stress | pixi | topdown | 8.5 | 118.3 | 333.4 | 112.18 | 321.1 | 229 | 8 |
| 4x | stress | canvas | oblique | 12.3 | 81.4 | 150 | 67.74 | 130.1 | 629 | 675 |
| 4x | stress | canvas | topdown | 26.8 | 37.3 | 66.7 | 29.34 | 50.3 | 204 | 349 |
