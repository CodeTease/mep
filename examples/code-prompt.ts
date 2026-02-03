// This file originally comes from example.ts


import { MepCLI } from "../src";

const config = await MepCLI.code({
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
console.log(`\n Code Result: Config: ${config.replace(/\n/g, ' ')}`);