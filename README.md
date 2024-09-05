# Puzzle Studio

The Swiss Army knife of mechanical puzzle design.

The focus is on any assembly, disassembly, or interlocking puzzle which can be
placed on a grid. MPS is very extensible: with some programming knowledge, you
can create new grid types, arbitrary constraints for when a puzzle is
considered solved, and more.

[Try it online](https://mbrown1413.github.io/Mechanical-Puzzle-Studio/)! It
runs completely in the browser, with no data sent off your computer.

**Note: This software is in early development.** To track progress, see the
[Planning Project](https://github.com/users/mbrown1413/projects/1/).


## Puzzling Resources

Communities
* [Mechanical Puzzles Discord (MPD)](https://discord.gg/H8qYN4uKCG) - Active community of friendly puzzle enthusiasts.
* [r/mechanicalpuzzles](https://www.reddit.com/r/mechanicalpuzzles/)

Other puzzle programs
* [Burr Tools](https://burrtools.sourceforge.net/) - Widely used puzzle design software. Install the latest version from [github.com/burr-tools/burrtools](https://github.com/burr-tools/burr-tools)
* [puzzlecad](https://github.com/aaron-siegel/puzzlecad) - Generate 3d-printable models of puzzles.
* [Polyform Puzzler](https://puzzler.sourceforge.net/)
  * [Fork for Python 3.7+](https://github.com/johnrudge/puzzler)
* PUZZLESOLVER3D - Referenced [here](https://burrtools.sourceforge.net/gui-doc/Prologue.html) as abandoned
* [BCPBOX / GENDA](https://billcutlerpuzzles.com/stock/program.html) - Discontinued


## Why not BurrTools?

BurrTools is great! It's a powerful piece of software and the interface is
usable after getting acquainted with it. While it's the industry-standard in
designing many types of puzzles, it's now very old software, and it's missing
some modern design patterns and standards. It's also not actively maintained
and difficult to add features to.

I'd like MPS to:
* have an "Undo" button
* run on the web
* allow to easily add new grids, solving algorithms, problem types, ways of inputting pieces, etc.
* be written using modern tools (Typescript and Vue) which are accessible to more developers
* explore faster solver algorithms including running on the GPU and/or distributed computations
* easily share puzzles


## Developing

Requirements:
  * node (version v20+)
  * [yarn 1 / classic](https://classic.yarnpkg.com/en/docs/install)

Getting started:

    $ yarn install  # Install dependencies
    $ yarn dev  # Run development server

Testing:

    $ yarn test  # Run tests and watch for changes
    $ yarn coverage  # Coverage outputs in coverage/
    $ yarn test --coverage  # Watch for changes plus outputs coverage

Linting:

    $ yarn lint

Production build:

    $ yarn build  # Outputs static site to dist/

    # Use a web-server to test the build:
    $ cd dist/ && python -m http.server

Note that without server-side redirects, starting at a page other than `/` will
throw a 404-not-found error.

The source code is divided into two main sections:
  * [`lib/`](lib/): Contains the data structures and algorithms for puzzles. Basically, a stand-alone puzzle library without a gui.
  * [`ui/`](ui/): User interface built on top of `lib/`.


## License

This project is licensed under **Mozilla Public License Version 2.0**. See
[LICENSE.txt](LICENSE.txt) for details.