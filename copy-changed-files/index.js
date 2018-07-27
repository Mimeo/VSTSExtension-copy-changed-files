"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("vsts-task-lib/task");
const git = require("simple-git/promise");
const jsYml = require("js-yaml");
const path = require("path");
const fs = require("fs");
const util_1 = require("util");
const inputs = {
    workingDirectory: tl.getInput('WorkingDirectory', false),
    copyParametersYaml: tl.getInput('CopyParametersYaml', true)
};
const variables = {
    defaultWorkingDirectory: tl.getVariable('System.DefaultWorkingDirectory'),
    sourceVersion: tl.getVariable('Build.SourceVersion')
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let workingDir = path.normalize(inputs.workingDirectory || variables.defaultWorkingDirectory);
            console.log(`Working Directory: ${workingDir}`);
            let copyParameters = loadParametersFromYml(inputs.copyParametersYaml);
            tl.debug(`Parameters Yaml: \r\n${inputs.copyParametersYaml}`);
            let changedFiles = yield getChangedFiles(workingDir);
            copyParameters.forEach(p => {
                let matches = tl.findMatch(workingDir, p.sourceFile);
                let foundChange = false;
                if (!fs.existsSync(p.destinationDirectory)) {
                    fs.mkdirSync(p.destinationDirectory);
                }
                matches.forEach(f => {
                    if (p.copyAlways) {
                        tl.debug(`Copy always is true`);
                        foundChange = true;
                        copyFile(f, p.destinationDirectory);
                        return;
                    }
                    let file = f.replace(path.join(workingDir, path.sep), '');
                    tl.debug(`Checking file ${file}`);
                    changedFiles.forEach(cf => {
                        if (cf.indexOf(file.toLocaleLowerCase()) > -1) {
                            foundChange = true;
                            copyFile(f, p.destinationDirectory);
                        }
                    });
                });
                if (foundChange && p.dependentFiles && p.dependentFiles.length > 0) {
                    tl.debug('Checking dependent files');
                    p.dependentFiles.forEach(dependentFile => {
                        tl.findMatch(workingDir, dependentFile)
                            .forEach(df => copyFile(df, p.destinationDirectory));
                    });
                }
                if (!foundChange) {
                    tl.debug(`No change found for source file ${p.sourceFile}`);
                }
            });
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err);
        }
    });
}
function getChangedFiles(workingDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = null;
        let commitHash = variables.sourceVersion;
        console.log(`Using commit hash ${commitHash}`);
        try {
            result = yield git(workingDir).show(["--name-only", commitHash, "--pretty=format:"]);
        }
        catch (e) {
            throw `could not get changed files, error: ${e}`;
        }
        console.log('Changed files...');
        var files = result.split('\n').filter(f => f.trim() !== '');
        for (let i = 0; i < files.length; i++) {
            files[i] = path.normalize(files[i].toLocaleLowerCase());
            console.log(files[i]);
        }
        return files;
    });
}
function copyFile(file, destDir) {
    tl.debug(`Copying ${file} to ${destDir}`);
    let destFile = path.join(destDir, path.sep, path.basename(file));
    tl.cp(file, destFile, '-f');
    console.log(`File ${file} copied to the destination directory`);
}
function loadParametersFromYml(yaml) {
    try {
        let parameters = jsYml.safeLoad(yaml);
        let msg = 'parameters must be an array of object in format { sourceFile: "", destinationDirectory: "", dependentFiles: [""] }';
        if (!util_1.isArray(parameters)) {
            throw `invalid copy parameters - ${msg}`;
        }
        for (let i = 0; i < parameters.length; i++) {
            let parameter = parameters[i];
            if (!parameter.sourceFile || parameter.sourceFile.trim() === '') {
                throw `could not find sourceFile in parameter index ${i} - ${msg}`;
            }
            if (!parameter.destinationDirectory || parameter.destinationDirectory.trim() === '') {
                throw `could not find destinationDirectory in parameter index ${i} - ${msg}`;
            }
            if (parameter.dependentFiles && !util_1.isArray(parameter.dependentFiles)) {
                throw `dependentFiles must be an array of string in parameter index ${i} - ${msg}`;
            }
        }
        return parameters;
    }
    catch (e) {
        throw `could not load yaml, error: ${e}`;
    }
}
run();
