| CPU | mode | renderer | projection | avg FPS | frame mean ms | frame p95 ms | JS work mean ms | JS work p95 ms | cmds | draw calls |
|---|---|---|---|---|---|---|---|---|---|---|
| 1x | normal | pixi | oblique | 59 | 16.9 | 16.8 | 7.52 | 11.9 | 163 | 12 |
| 1x | normal | pixi | topdown | 59.5 | 16.8 | 16.8 | 5.2 | 9.4 | 89 | 12 |
| 1x | normal | canvas | oblique | 59.3 | 16.9 | 16.8 | 2.03 | 3.1 | 162 | 214 |
| 1x | normal | canvas | topdown | 60 | 16.7 | 16.7 | 1.4 | 2.1 | 89 | 138 |
| 1x | stress | pixi | oblique | 59.5 | 16.8 | 16.7 | 12.76 | 17.8 | 388 | 20 |
| 1x | stress | pixi | topdown | 59 | 16.9 | 16.8 | 10.62 | 17.6 | 199 | 20 |
| 1x | stress | canvas | oblique | 51.5 | 19.4 | 33.4 | 3.48 | 5.3 | 387 | 439 |
| 1x | stress | canvas | topdown | 48.4 | 20.7 | 33.4 | 2.86 | 4.5 | 199 | 253 |
| 4x | normal | pixi | oblique | 16.5 | 60.6 | 116.7 | 53.04 | 109.9 | 247 | 16 |
| 4x | normal | pixi | topdown | 28.5 | 35.1 | 66.6 | 27.85 | 47.9 | 94 | 14 |
| 4x | normal | canvas | oblique | 56.8 | 17.6 | 16.8 | 9.59 | 16.9 | 166 | 218 |
| 4x | normal | canvas | topdown | 55.4 | 18 | 33.3 | 9.73 | 15.9 | 88 | 137 |
| 4x | stress | pixi | oblique | 7.7 | 129.4 | 250 | 120.94 | 239.9 | 450 | 16 |
| 4x | stress | pixi | topdown | 12.9 | 77.5 | 133.4 | 68.82 | 123.7 | 206 | 20 |
| 4x | stress | canvas | oblique | 15.3 | 65.4 | 133.4 | 46.49 | 100.1 | 472 | 540 |
| 4x | stress | canvas | topdown | 11.6 | 86 | 150 | 61.27 | 112.1 | 233 | 307 |
