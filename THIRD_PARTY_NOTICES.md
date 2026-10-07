# Third-party notices

RetryCanvas's MIT license covers its original code and documentation. It does
not replace or relicense third-party dependencies. Preserve their applicable
license text, copyright notices, and other notices when redistributing them.

## Application dependencies

The installed runtime dependency chain reviewed on 2026-10-07 is:

| Package | Version | Declared license |
| --- | --- | --- |
| react | 19.3.0 | MIT |
| react-dom | 19.3.0 | MIT |
| scheduler (transitive) | 0.28.0 | MIT |

These three installed packages contain the same following license text. Their
upstream project is [React](https://github.com/facebook/react).

```text
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

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

## Development dependencies

Direct development dependencies, as declared by the installed packages and
locked in package-lock.json:

<!-- development-dependencies:start -->
| Package | Version | Declared license |
| --- | --- | --- |
| @eslint/js | 10.0.1 | MIT |
| @playwright/test | 1.63.0 | Apache-2.0 |
| @testing-library/react | 16.3.3 | MIT |
| @testing-library/user-event | 14.6.7 | MIT |
| @types/node | 26.6.4 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @vitejs/plugin-react | 6.1.2 | MIT |
| eslint | 10.12.0 | MIT |
| globals | 17.13.0 | MIT |
| jsdom | 30.1.2 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| typescript-eslint | 8.71.1 | MIT |
| vite | 8.3.3 | MIT |
| vitest | 5.0.3 | MIT |
<!-- development-dependencies:end -->

The complete declared-license inventory, including transitive and optional
platform dependencies, is in [docs/dependency-licenses.json](docs/dependency-licenses.json).
It records which packages were installed and where their top-level license and
notice files were found. The lockfile digest in that inventory identifies the
reviewed snapshot. It is an inventory, not an exhaustive legal audit of every
file or bundled subcomponent.

Do not assume every dependency is MIT-licensed: the toolchain also includes
Apache-2.0, BSD, ISC, MPL-2.0, BlueOak-1.0.0, MIT-0, and CC0-1.0 declarations.
Dependencies retain
their own terms. Review the installed package's complete notices and the actual
build output if changing the bundle or redistributing development tools.

After changing dependencies, run `node docs/update-licenses.mjs` from the
repository root to refresh the inventory and development-dependency table.
Then review runtime versions, upstream license/notice files, and this document.
The script does not perform a legal audit or copy new license text. Do not commit node_modules as a substitute for proper notices.

## Algorithms and background

Exponential backoff, full jitter, and equal jitter are established techniques.
RetryCanvas's source code and interface were independently written. This
project does not claim authorship of the algorithms or affiliation with AWS.

The documentation cites [Exponential Backoff And Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
and the [AWS SDK retry behavior reference](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
as background. No AWS source code, article illustrations, screenshots, logos,
or simulator implementation are included.

## Project assets

The repository's SVG brand artwork, interface icons, charts, and documentation
hero are original project assets and are covered by the project MIT license.
The hero is explicitly illustrative. Application screenshots, when present,
show this project's synthetic interface. The app uses system fonts; it does not
bundle a third-party font or remote image asset.
