This extension is a Visual Studio Team Services (VSTS) build task. The task is used to copy files that are created, updated or renamed in the last commit. It takes multiple file entries as a parameter to define files to be copied to the different destination directories. The task works with all type of build agents (Windows, Linux or OSX).

### How it works

The task uses git command ([git show](https://git-scm.com/docs/git-show)) to get the changed files. it uses [Build.SourceVersion](https://docs.microsoft.com/en-us/vsts/pipelines/build/variables?view=vsts&tabs=batch#predefined-variables) build variable which returns commit hash to get changes.

**NOTE**: The task only works with Git based repositories and with build pipeline.

### Parameters of the task:

The parameters of the task are described in details. The parameters listed with a \* are required parameters for the task:

* **Working Directory**: Enter the working directory where the git command should run. This directory is also the base path for resolving glob patterns entered in the source file parameter. Working directory is optional and when not specified, task defaults to [System.DefaultWorkingDirectory](https://docs.microsoft.com/en-us/vsts/pipelines/build/variables?view=vsts&tabs=batch#predefined-variables) build variable.

* **Copy Parameters** \*: Enter file entries for files to be copied when they are changed in last commit. A file entry consists of multiple fields, they are:
   - Source File: Enter source file name (supports glob pattern) to be copied when changed in the last commit
   - Destination Directory: Enter directory or path where source file be copied to
   - Copy Always: Indicate whether to copy file always or only when is changed, default value is false
   - Dependent Files: Specify an array of dependent files (supports glob pattern) to be copied when source file is changed in the last commit

This input requires in specific [YAML](http://yaml.org/) format. Input should return an array of file entries.

For example,

\- sourceFile: source/file.txt
  destinationDirectory: $(Build.ArtifactStagingDirectory)/source
  dependentFiles:
  \- dependent-file1.txt
  \- my-files/*.txt
\- sourceFile: source/**/*.json
  destinationDirectory: $(Build.ArtifactStagingDirectory)/source/json

In above example there are two files entires, the first one will copy 'source/file.txt' to the '$(Build.ArtifactStagingDirectory)/source' directory and also copy dependent files 'dependent-file1.txt' and files match 'my-files/*.txt' pattern. The second entry will copy all files that match 'source/**/*.json' pattern to the '$(Build.ArtifactStagingDirectory)/source/json' directory.