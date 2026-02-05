// This file originally comes from example.ts


import { MepCLI } from "../src";

async function codePrompt() {
  console.clear();
  console.log("--- Code Prompt Demo ---\n");

  try {
    console.log("JSON Demo")
    const configJSON = await MepCLI.code({
      message: "Configure Server (JSON) - Tab to nav:",
      language: "json",
      highlight: true, // Experimental syntax highlighting
      template: `
{
  "host": "\${host}",
  "port": \${port},
  "debug": \${debug}
}
`
    });
    console.log(`\n JSON Result: Config: ${configJSON.replace(/\n/g, ' ')}`);

    console.log("\nTOML Demo")
    const configTOML = await MepCLI.code({
      message: "Configure Server (TOML)",
      language: "toml",
      highlight: true,
      template: `
[server]
host = "\${host}"
port = \${port}
debug = \${debug}
`
    });
    console.log(`\n TOML Result: Config: ${configTOML.replace(/\n/g, ' ')}`);

    console.log("\nEnv (Key-value) Demo")
    const configEnv = await MepCLI.code({
      message: "Configure Server (Env)",
      language: "env",
      highlight: true,
      template: `
# Server config
HOST="\${HOST}"
PORT=\${PORT}
DEBUG=\${DEBUG}
`
    });
    console.log(`\n Env Result: Config: ${configEnv.replace(/\n/g, ' ')}`);

    console.log("\nCSV Demo")
    const csvData = await MepCLI.code({
      message: "Data Entry (CSV)",
      language: "csv",
      highlight: true,
      template: `
id,name,role
1,\${name1},admin
2,\${name2},user
3,\${name3},guest
`
    });
    console.log(`\n CSV Result: ${csvData.replace(/\n/g, ' ')}`);

    console.log("\nShell Script Demo")
    const shellScript = await MepCLI.code({
      message: "Deploy Script (Shell)",
      language: "sh",
      highlight: true,
      template: `
#!/bin/bash
# Deploy script
TARGET="\${target}"
BRANCH="\${branch}"

echo "Deploying $BRANCH to $TARGET"
./deploy.sh --env $TARGET --ref $BRANCH
`
    });
    console.log(`\n Shell Result: ${shellScript.replace(/\n/g, ' ')}`);

    console.log("\nProperties Demo")
    const props = await MepCLI.code({
      message: "Application Properties",
      language: "properties",
      highlight: true,
      template: `
# App settings
app.name=\${appName}
app.version=\${version}
app.features.enabled=\${features}
`
    });
    console.log(`\n Properties Result: ${props.replace(/\n/g, ' ')}`);

  } catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
      console.log("\nOperation cancelled by user.");
    }
    else {
      console.error("\nAn error occurred:", e);
    }
  }
}

codePrompt();
