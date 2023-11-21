# Riddlewood Studio

Mechanical puzzle design software.

The focus is on put-together / take-apart / interlocking puzzles. Riddlewood Studio is very extensible; with some programming knowledge, you can create new grid types, arbitrary constraints for when a puzzle is considered solved, and more.

**Note: This software is in pre-alpha development.** To track progress, see the [MVP Planning](https://github.com/mbrown1413/Riddlewood-Studio/issues/1) issue.


## Puzzling Resources

Communities
* [Mechanical Puzzles Discord (MPD)](https://discord.gg/waaZ2K9M) - Active community of friendly puzzle enthusiasts.
* [r/mechanicalpuzzles](https://www.reddit.com/r/mechanicalpuzzles/)

Other puzzle programs
* [Burr Tools](https://burrtools.sourceforge.net/) - Widely used puzzle design software. Install the latest version from [github.com/burr-tools/burrtools](https://github.com/burr-tools/burr-tools)
* [puzzlecad](https://github.com/aaron-siegel/puzzlecad) - Generate 3d-printable models of puzzles.
* [Polyform Puzzler](https://puzzler.sourceforge.net/)
  * [Fork for Python 3.7+](https://github.com/johnrudge/puzzler)
* PUZZLESOLVER3D - Referenced [here](https://burrtools.sourceforge.net/gui-doc/Prologue.html) as abandoned
* [BCPBOX / GENDA](https://billcutlerpuzzles.com/stock/program.html) - Discontinued


## Developing

Requirements:
  * [yarn 1 / classic](https://classic.yarnpkg.com/en/docs/install)

Getting started:

    $ yarn install  # Install dependencies
    $ yarn dev  # Run development server

Testing:

    $ yarn test  # Run tests and watch for changes
    $ yarn coverage  # Coverage output to coverage/
    $ yarn test --coverage  # Watch for changes plus output coverage

Production build:

    $ yarn build  # Outputs static site to dist/
    
    # You need a webserver to run the build:
    $ cd dist/ && python -m http.server
    
The source code is divided into two main sections:
  * [`lib/`](lib/): Contains the data structures and algorithms for puzzles. Basically, a stand-alone puzzle library without a gui.
  * [`ui/`](ui/): User interface built on top of `lib/`.