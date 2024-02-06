import {test, expect, describe} from "vitest"
import * as fs from "fs"
import * as path from "path"

function forEachFile(dir: string, func: (filePath: string) => void) {
    fs.readdirSync(
        dir,
        {
            encoding: "utf8",
            recursive: true,
            withFileTypes: true,
        }
    ).forEach((dirent: fs.Dirent) => {
        if(dirent.isFile()) {
            func(path.join(dirent.path, dirent.name))
        }
    })
}

/** Search for regex in all files in a directory. Returns filenames with matches. */
function findMatchingFiles(dir: string, regex: RegExp) {
    const matches: string[] = []
    forEachFile(dir, (path: string) => {
        const fileContents = fs.readFileSync(path, {encoding: "utf8"})
        const fileMatches = fileContents.match(regex)
        if(fileMatches) {
            matches.push(path)
        }
    })
    return matches
}

describe("imports", () => {
    test("in lib/ should not import ui/", () => {
        expect(
            findMatchingFiles("lib/", new RegExp("^import.*~ui/", "gm"))
        ).toEqual([])
    })
})

describe("imports", () => {
    test('in ui/ may only import lib/ via index.ts at "~lib"', () => {
        expect(
            findMatchingFiles("ui/", new RegExp("^import.*~/?lib/", "gm"))
        ).toEqual([])
    })
})