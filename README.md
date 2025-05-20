# ili-vscode


```
git clone ...
cd ili2c
```

ggf: `npm install --save-dev npm-run-all`

```
npm install
```

Das integrierte Terminal findet ggf npm nicht:

settings.json:
```
    "terminal.integrated.env.osx": {
        "PATH": "/usr/local/miniconda3/bin:/usr/local/miniconda3/condabin:/Users/stefan/.sdkman/candidates/maven/current/bin:/Users/stefan/.sdkman/candidates/jbang/current/bin:/Users/stefan/.sdkman/candidates/jbake/current/bin:/Users/stefan/.sdkman/candidates/java/current/bin:/Users/stefan/.sdkman/candidates/groovy/current/bin:/Users/stefan/.sdkman/candidates/gradle/current/bin:/Users/stefan/bin:/usr/local/bin:/Users/stefan/apps/graalpy-24.1.1-macos-amd64/bin:/Users/stefan/apps/node-v22.13.1-darwin-x64/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/stefan/apps/dita-ot-4.1.2/bin:/Users/stefan/apps/vackup"
    }
```




---------------------------

```
npm install -g yo generator-code
```

```
yo code
```
- esbuild verwenden


Wir posten files und benötigen fetch:
```
cd ili2c
npm install node-fetch@3
npm install --save-dev @types/node-fetch
```

```
npm run compile
```

```
npm install -g vsce
```

```
vsce package
```
- Readme anpassen
- repository in package.json
- licence file


https://marketplace.visualstudio.com/manage/publishers/edigonzales

vsce login <publisher id>

