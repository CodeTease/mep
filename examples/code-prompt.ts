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
