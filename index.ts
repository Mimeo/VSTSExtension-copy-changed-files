import tl = require('vsts-task-lib/task');
import git = require('simple-git/promise');
import jsYml = require('js-yaml');
import path = require('path');
import fs = require('fs');
import { isArray } from 'util';

const inputs = {
    workingDirectory: tl.getInput('WorkingDirectory', false),
    copyParametersYaml: tl.getInput('CopyParametersYaml', true)
};

const variables = {
    defaultWorkingDirectory: tl.getVariable('System.DefaultWorkingDirectory'),
    sourceVersion: tl.getVariable('Build.SourceVersion')
};

async function run() {
    try {
        let workingDir = path.normalize(inputs.workingDirectory || variables.defaultWorkingDirectory);
        console.log(`Working Directory: ${workingDir}`);

        let copyParameters = loadParametersFromYml(inputs.copyParametersYaml);
        tl.debug(`Parameters Yaml: \r\n${inputs.copyParametersYaml}`);

        let changedFiles = await getChangedFiles(workingDir);

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
                })
            }

            if (!foundChange) {
                tl.debug(`No change found for source file ${p.sourceFile}`);
            }
        });
    }
    catch (err) {        
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

async function getChangedFiles(workingDir: string): Promise<Array<string>> {
    let result: string = null;
    let commitHash = variables.sourceVersion;

    console.log(`Using commit hash ${commitHash}`);

    try {
        result = await git(workingDir).show(["--name-only", commitHash, "--pretty=format:"]);
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
}

function copyFile(file: string, destDir: string) {
    tl.debug(`Copying ${file} to ${destDir}`);

    let destFile = path.join(destDir, path.sep, path.basename(file));

    tl.cp(file, destFile, '-f');

    console.log(`File ${file} copied to the destination directory`);
}

function loadParametersFromYml(yaml: string): Array<Parameter> {
    try {
        let parameters = jsYml.safeLoad(yaml);
        let msg = 'parameters must be an array of object in format { sourceFile: "", destinationDirectory: "", dependentFiles: [""] }';

        if (!isArray(parameters)) {
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

            if (parameter.dependentFiles && !isArray(parameter.dependentFiles)) {
                throw `dependentFiles must be an array of string in parameter index ${i} - ${msg}`;
            }
        }

        return parameters;
    }
    catch (e) {        
        throw `could not load yaml, error: ${e}`;
    }
}

interface Parameter {
    sourceFile: string;
    destinationDirectory: string;
    copyAlways: boolean;
    dependentFiles: Array<string>;
}

run();