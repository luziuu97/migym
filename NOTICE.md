# Third-party notices

openGym — Copyright (C) 2026 Duarte Santos.
MiGYM (this modified version) — Copyright (C) 2026 Lucius Porta.

This repository is a **modified version** of [openGym](https://github.com/DuarteSantos8/openGym)
(also mirrored at [gitea.com/DuarteSantos/openGym](https://gitea.com/DuarteSantos/openGym)).
Modifications dated **August 2026** include multi-tenant gyms, membership recording, trainer
plan assignment, instance branding, and a Capacitor shell that talks to a hosted API.

The entire work, including those modifications, is licensed under the **GNU AGPL v3.0**
(see [LICENSE](LICENSE)). The original copyright notices are preserved. Recipients of this
modified version receive the same freedoms (and the same copyleft obligations) as for openGym.

Corresponding source for this modified version is this repository. Operators who run it as a
network service must offer that source to their users (AGPL §13); the in-app Settings footer
links here.

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the openGym mobile application through app store platforms (such as the
Apple App Store and Google Play) whose terms of service would otherwise be incompatible
with the AGPL, provided the corresponding source code remains available under the AGPL at
the project repository. This permission applies to the distribution channel only and does
not otherwise limit the license.

## Body diagram geometry

The muscle outlines the body maps are drawn from (`frontend/src/lib/body-paths.js`) are derived
from [**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, used under the
**MIT License** and reproduced below. MuscleMap ships its path data as Swift source rather than
`.svg` files; the paths were converted to a JSON module, its sub-group shapes were dropped, and
nothing else about the artwork was changed.

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise data & media

The exercise names, instructions (English in `frontend/src/lib/exercises-data.js`, other
languages in `frontend/src/instr/`, regenerated via `scripts/build-instructions.mjs`), images
and animations (fetched into `media/` at build time) come from
[**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset)
and are **not** covered by openGym's AGPL license — they remain under that dataset's own terms.
The media files are not distributed in this repository; they are downloaded from the upstream
source on first run. If you redistribute openGym with the media included, review the upstream
license first.
