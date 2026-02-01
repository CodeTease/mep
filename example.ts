import { MepCLI } from './src'; // Or 'mepcli' if installed via NPM

/**
 * Runs a comprehensive demo showcasing all MepCLI prompt types and utilities.
 * This demonstrates all core functionalities including Text, Password, Select,
 * Checkbox, Number, Toggle, Confirm, List, Slider, Date, File, MultiSelect,
 * Autocomplete, Sort, Table, and the Spin utility.
 */
async function runComprehensiveDemo() {
    console.clear();
    console.log("--- MepCLI Comprehensive Demo (All Prompts + Spin Utility) ---\n");

    try {
        // --- 1. Text Prompt (Input with Validation and initial value) ---
        const projectName = await MepCLI.text({
            message: "Enter the name for your new project:",
            placeholder: "e.g., minimalist-cli-app",
            initial: "MepProject",
            validate: (value) => {
                if (value.length < 3) return "Project name must be at least 3 characters long.";
                return true;
            }
        });
        console.log(`\n Text Result: Project name set to '${projectName}'`);

        // --- 1.5 Text Prompt with Suggestion (Ghost Text) ---
        const gitCommand = await MepCLI.text({
            message: "Enter a git command (try typing 'git c' and press Tab):",
            placeholder: "git ...",
            suggest: (input) => {
                if (!input) return "";
                const suggestions = ["git commit", "git checkout", "git clone", "git push", "git pull", "git status"];
                const match = suggestions.find(s => s.startsWith(input));
                return match || "";
            }
        });
        console.log(`\n Text Suggestion Result: '${gitCommand}'`);

        // --- 2. Password Prompt (Hidden input) ---
        const apiKey = await MepCLI.password({
            message: "Enter the project's external API key:",
            placeholder: "Input will be hidden..."
        });
        console.log(`\n Password Result: API key entered (length: ${apiKey.length})`);

        // --- 2.5. Secret Prompt (Completely hidden input) ---
        const secretToken = await MepCLI.secret({
            message: "Enter secret token (no feedback):",
            validate: (v) => v.length > 0 || "Token required"
        });
        console.log(`\n Secret Result: Token entered (length: ${secretToken.length})`);

        // --- 3. Select Prompt (Single choice, supports filtering/searching by typing) ---
        const theme = await MepCLI.select({
            message: "Choose your preferred editor color theme:",
            choices: [
                { title: "Dark Mode (Default)", value: "dark" },
                { title: "Light Mode (Classic)", value: "light" },
                { title: "High Contrast (Accessibility)", value: "contrast" },
                // Demonstrates a separator option
                { separator: true, text: "--- Pro Themes ---" },
                { title: "Monokai Pro", value: "monokai" },
            ]
        });
        console.log(`\n Select Result: Chosen theme is: ${theme}`);

        // --- 4. Checkbox Prompt (Multi-choice with Min/Max limits) ---
        const buildTools = await MepCLI.checkbox({
            message: "Select your required bundlers/build tools (Min 1, Max 2):",
            min: 1, 
            max: 2, 
            choices: [
                { title: "Webpack", value: "webpack" },
                { title: "Vite", value: "vite", selected: true }, // Default selected state
                { title: "Rollup", value: "rollup" },
                { title: "esbuild", value: "esbuild" }
            ]
        });
        console.log(`\n Checkbox Result: Selected build tools: [${buildTools.join(', ')}]`);

        // --- 5. Number Prompt (Numeric input, supports Min/Max and Up/Down arrow for Step) ---
        const port = await MepCLI.number({
            message: "Which port should the server run on?",
            initial: 3000,
            min: 1024,
            max: 65535,
            step: 100 // Increments/decrements by 100 with arrows
        });
        console.log(`\n Number Result: Server port: ${port}`);
        
        // --- 6. Toggle Prompt (Boolean input, supports custom labels) ---
        const isSecure = await MepCLI.toggle({
            message: "Enable HTTPS/SSL for production?",
            initial: false,
            activeText: "SECURE", // Custom 'on' label
            inactiveText: "INSECURE" // Custom 'off' label
        });
        console.log(`\n Toggle Result: HTTPS enabled: ${isSecure}`);

        // --- 7. List / Tags Input ---
        const keywords = await MepCLI.list({
            message: "Enter keywords for package.json (Enter to add, Backspace to remove):",
            initial: ["cli", "mep"],
            validate: (tags) => tags.length > 0 || "Please add at least one keyword."
        });
        console.log(`\n List Result: Keywords: [${keywords.join(', ')}]`);

        // --- 8. Slider / Scale ---
        const brightness = await MepCLI.slider({
            message: "Set initial brightness:",
            min: 0,
            max: 100,
            initial: 80,
            step: 5,
            unit: "%"
        });
        console.log(`\n Slider Result: Brightness: ${brightness}%`);

        // --- 8.1. Range Prompt (Dual Slider) ---
        const priceRange = await MepCLI.range({
            message: "Filter by price range:",
            min: 0,
            max: 1000,
            initial: [200, 800],
            step: 50,
            unit: "$"
        });
        console.log(`\n Range Result: $${priceRange[0]} - $${priceRange[1]}`);

        // --- 9. Rating Prompt ---
        const userRating = await MepCLI.rating({
            message: "How would you rate this CLI tool?",
            min: 1,
            max: 5,
            initial: 5
        });
        console.log(`\n Rating Result: You rated it: ${userRating}/5`);

        // --- 10. Date / Time Picker ---
        // We capture 'now' once to ensure initial >= min
        const now = new Date();
        const releaseDate = await MepCLI.date({
            message: "Schedule release date:",
            initial: now,
            min: now // Cannot be in the past
        });
        console.log(`\n Date Result: Release set for: ${releaseDate.toLocaleString()}`);

        // --- 11. File Path Selector  ---
        const configPath = await MepCLI.file({
            message: "Select configuration file (Tab to autocomplete):",
            basePath: process.cwd()
        });
        console.log(`\n File Result: Path: ${configPath}`);

        // --- 12. Multi-Select Autocomplete ---
        const linters = await MepCLI.multiSelect({
            message: "Select linters to install (Type to search, Space to select):",
            choices: [
                { title: "ESLint", value: "eslint", selected: true },
                { title: "Prettier", value: "prettier" },
                { title: "Stylelint", value: "stylelint" },
                { title: "TSLint (Deprecated)", value: "tslint" },
                { title: "JSHint", value: "jshint" },
                { title: "StandardJS", value: "standard" }
            ],
            min: 1
        });
        console.log(`\n MultiSelect Result: Linters: [${linters.join(', ')}]`);

        // --- 13. Autocomplete Prompt ---
        const city = await MepCLI.autocomplete({
            message: "Search for a city (simulated async):",
            suggest: async (query) => {
                const cities = [
                    { title: "New York", value: "NY" },
                    { title: "London", value: "LDN" },
                    { title: "Paris", value: "PAR" },
                    { title: "Tokyo", value: "TKY" },
                    { title: "Berlin", value: "BER" },
                    { title: "San Francisco", value: "SF" },
                    { title: "Toronto", value: "TOR" }
                ];
                // Simulate delay
                await new Promise(r => setTimeout(r, 400));
                return cities.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
            }
        });
        console.log(`\n Autocomplete Result: City code: ${city}`);

        // --- 14. Sort Prompt ---
        const priorities = await MepCLI.sort({
            message: "Rank your top priorities (Space to grab/drop, Arrows to move):",
            items: ["Performance", "Security", "Features", "Usability", "Cost"]
        });
        console.log(`\n Sort Result: Priorities: [${priorities.join(', ')}]`);

        // --- 14.1 Transfer Prompt (PickList) ---
        const teamA = await MepCLI.transfer({
            message: "Assign members to Team A (Space to move):",
            source: ["Alice", "Bob", "Charlie", "David", "Eve"],
            target: ["Frank"] // Pre-assigned
        });
        console.log(`\n Transfer Result: Team A: [${teamA[1].join(', ')}] (Remaining: [${teamA[0].join(', ')}])`);

        // --- 15. Table Prompt ---
        const userId = await MepCLI.table({
            message: "Select a user from the database:",
            columns: ["ID", "Name", "Role", "Status"],
            data: [
                { value: 1, row: ["001", "Alice", "Admin", "Active"] },
                { value: 2, row: ["002", "Bob", "Dev", "Offline"] },
                { value: 3, row: ["003", "Charlie", "User", "Active"] },
                { value: 4, row: ["004", "David", "Manager", "Active"] },
            ]
        });
        console.log(`\n Table Result: Selected User ID: ${userId}`);

        // --- 16. Confirm Prompt (Simple Yes/No) ---
        const proceed = await MepCLI.confirm({
            message: "Ready to deploy the project now?",
            initial: true
        });
        console.log(`\n Confirm Result: Deployment decision: ${proceed ? 'Proceed' : 'Cancel'}`);

        // --- 17. Editor Prompt ---
        const bio = await MepCLI.editor({
            message: "Write your biography (opens default editor):",
            initial: "Hi, I am a developer...",
            extension: ".md",
            waitUserInput: true
        });
        console.log(`\n Editor Result: Biography length: ${bio.length} chars`);

        // --- 18. Keypress Prompt ---
        console.log("\n--- Press any key to continue to the Tree Prompt Demo... ---");
        const key = await MepCLI.keypress({
            message: "Press any key to proceed (or 'q' to quit):",
            keys: ['q', 'enter', 'space', 'escape'] // Optional whitelist, or leave undefined for any
        });
        console.log(`\n Keypress Result: You pressed '${key}'`);
        if (key === 'q') return;

        // --- 19. Tree Prompt ---
        const selectedFile = await MepCLI.tree({
             message: "Select a file from the project structure (Space to toggle, Enter to select):",
             data: [
                 {
                     title: "src",
                     value: "src",
                     children: [
                         { title: "index.ts", value: "src/index.ts" },
                         { title: "utils.ts", value: "src/utils.ts" },
                         { 
                             title: "prompts", 
                             value: "src/prompts", 
                             expanded: true,
                             children: [
                                 { title: "text.ts", value: "src/prompts/text.ts" },
                                 { title: "select.ts", value: "src/prompts/select.ts" }
                             ]
                         }
                     ]
                 },
                 {
                     title: "package.json",
                     value: "package.json"
                 },
                 {
                     title: "README.md",
                     value: "README.md"
                 }
             ]
        });
        console.log(`\n Tree Result: Selected path: ${selectedFile}`);

        // --- 20. Form Prompt ---
        const userDetails = await MepCLI.form({
            message: "Enter User Details (Up/Down/Tab to navigate):",
            fields: [
                { name: "firstname", message: "First Name", initial: "John" },
                { name: "lastname", message: "Last Name", validate: (v) => v.length > 0 ? true : "Required" },
                { name: "email", message: "Email", validate: (v) => v.includes("@") || "Invalid email" },
                { name: "role", message: "Job Role", initial: "Developer" }
            ]
        });
        console.log(`\n Form Result: User: ${JSON.stringify(userDetails)}`);

        // --- 21. Snippet Prompt ---
        const commitMsg = await MepCLI.snippet({
            message: "Compose Commit Message (Tab/Shift+Tab to navigate variables):",
            template: "feat(${scope}): ${message} (Refs: #${issue})",
            values: {
                scope: "cli",
                issue: "123"
            }
        });
        console.log(`\n Snippet Result: "${commitMsg}"`);

        // --- 22. Spam Prompt ---
        const spamConfirmed = await MepCLI.spam({
            message: "Hold on! Confirm deployment by mashing the Space key!",
            threshold: 10,
            decay: false, // We're not devil
            spamKey: ' ' // Space key
        });
        console.log(`\n Spam Result: Deployment confirmed: ${spamConfirmed}`);

        // --- 23. Wait Prompt ---
        await MepCLI.wait({
            message: "Please wait while we finalize the setup...",
            seconds: 3, // Just 3 seconds for demo
            autoSubmit: true // Automatically proceeds after time is up
        });
        console.log("\n Wait Result: Wait complete.");

        // --- 24. Code Prompt ---
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

        // --- 25. Tree Select Prompt ---
        const selectedTreeItems = await MepCLI.treeSelect({
             message: "Select files to backup (Multi-select Tree):",
             data: [
                 {
                     title: "src",
                     value: "src",
                     children: [
                         { title: "index.ts", value: "src/index.ts" },
                         { title: "utils.ts", value: "src/utils.ts" }
                     ]
                 },
                 {
                     title: "tests",
                     value: "tests",
                     expanded: true,
                     children: [
                         { title: "e2e", value: "tests/e2e", selected: true },
                         { title: "unit", value: "tests/unit" }
                     ]
                 }
             ]
        });
        console.log(`\n TreeSelect Result: Selected: [${selectedTreeItems.join(', ')}]`);

        // --- 26. Cron Prompt ---
        const schedule = await MepCLI.cron({
            message: "Set backup schedule (Cron):",
            initial: "0 4 * * *" // Daily at 4:00 AM
        });
        console.log(`\n Cron Result: "${schedule}"`);

        // --- 27. Color Prompt ---
        const themeColor = await MepCLI.color({
            message: "Pick your brand color (RGB):",
            initial: "#6366f1"
        });
        console.log(`\n Color Result: "${themeColor}"`);

        // --- 28. Grid Prompt ---
        const permissions = await MepCLI.grid({
            message: "Configure Access Permissions:",
            rows: ["Admin", "User", "Guest"],
            columns: ["Read", "Write", "Execute"]
        });
        console.log(`\n Grid Result: (Boolean Matrix)`, permissions);

        // --- 29. Calendar Prompt ---
        const bookingRange = await MepCLI.calendar({
            message: "Select booking period:",
            mode: "range"
        });
        console.log(`\n Calendar Result:`, bookingRange);

        // --- 30. Map Prompt ---
        const envVars = await MepCLI.map({
            message: "Configure Environment Variables (Map):",
            initial: { "API_URL": "http://localhost:8080", "DB_HOST": "127.0.0.1" }
        });
        console.log(`\n Map Result:`, envVars);

        // --- 31. IP Prompt ---
        const ipAddress = await MepCLI.ip({
            message: "Enter Server IP Address:",
            initial: "192.168.0.1"
        });
        console.log(`\n IP Result: ${ipAddress}`);

        // --- 32. SemVer Prompt ---
        const nextVersion = await MepCLI.semver({
            message: "Bump Package Version:",
            currentVersion: "1.0.5"
        });
        console.log(`\n SemVer Result: ${nextVersion}`);

        // --- 33. OTP Prompt ---
        const otpCode = await MepCLI.otp({
            message: "Enter Verification Code (OTP):",
            length: 6,
            mask: "•",
            secure: false // Set true to hide input like password
        });
        console.log(`\n OTP Result: ${otpCode}`);

        // --- 34. Quiz Select Prompt ---
        const quizResult1 = await MepCLI.quizSelect({
            message: "Quiz: Which language runs in the browser?",
            choices: [
                { title: "C++", value: "cpp" },
                { title: "JavaScript", value: "js" },
                { title: "Python", value: "py" }
            ],
            correctValue: "js",
            explanation: "JavaScript is the primary scripting language for the web."
        });
        console.log(`\n Quiz Select Result: ${quizResult1}`);

        // --- 35. Quiz Text Prompt ---
        const quizResult2 = await MepCLI.quizText({
            message: "Quiz: What is the largest planet in our solar system?",
            correctAnswer: "Jupiter",
            explanation: "Jupiter is a gas giant and the largest planet.",
            // Optional custom verify function (e.g., allow case insensitive)
            verify: (val) => val.trim().toLowerCase() === "jupiter"
        });
        console.log(`\n Quiz Text Result: ${quizResult2}`);

        // --- 36. Kanban Prompt ---
        const kanbanBoard = await MepCLI.kanban({
            message: "Manage Project Tasks (Kanban):",
            columns: [
                { 
                    id: "todo", 
                    title: "To Do", 
                    items: [
                        { id: "t1", title: "Setup Repo" },
                        { id: "t2", title: "Design DB" }
                    ] 
                },
                { 
                    id: "in-progress", 
                    title: "In Progress", 
                    items: [
                        { id: "t3", title: "Auth Module" }
                    ] 
                },
                { 
                    id: "done", 
                    title: "Done", 
                    items: [] 
                }
            ]
        });
        console.log(`\n Kanban Result:`, kanbanBoard);

        // --- 37. Time Prompt ---
        const meetingTime = await MepCLI.time({
            message: "Schedule Daily Standup:",
            format: "12h",
            step: 15,
            initial: new Date()
        });
        console.log(`\n Time Result: ${meetingTime}`);

        // --- 38. Heatmap Prompt ---
        const weeklyAvailability = await MepCLI.heatmap({
            message: "Set Availability (0=Busy, 1=Free, 2=Preferred):",
            rows: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            columns: ["9AM", "1PM", "5PM"],
            legend: [
                { value: 0, char: "x", color: (s) => `\x1b[31m${s}\x1b[0m` }, // Red
                { value: 1, char: "o", color: (s) => `\x1b[33m${s}\x1b[0m` }, // Yellow
                { value: 2, char: "✓", color: (s) => `\x1b[32m${s}\x1b[0m` }  // Green
            ]
        });
        console.log(`\n Heatmap Result:`, weeklyAvailability);

        // --- 39. Byte Prompt ---
        const size = await MepCLI.byte({
            message: "Set docker container memory limit",
            initial: 512 * 1024 * 1024, // 512 MB
            min: 1024 * 1024 // Min 1 MB
        });
        console.log(`Configured: ${size} bytes`); 

        // --- 40. Slot Machine Prompt ---
        const slotPrize = await MepCLI.slot({
            message: "Spin for your daily bonus:",
            choices: ["💎 Diamond", "🥇 Gold", "🥈 Silver", "🥉 Bronze", "🪵 Wood"],
            rows: 5
        });
        console.log(`\n Slot Result: ${slotPrize}`);

        // --- 41. Rhythm Gauge Prompt ---
        const gaugeScore = await MepCLI.gauge({
            message: "Stop the needle in the GREEN zone!",
            width: 40,
            safeZone: 0.15 // 15% safe zone
        });
        console.log(`\n Gauge Result: ${gaugeScore}`);

        // --- 42. Calculator Prompt ---
        const calcTotal = await MepCLI.calculator({
            message: "Calculate invoice total (price * qty):",
            initial: "price * qty",
            variables: { price: 29.99, qty: 5 },
            precision: 2
        });
        console.log(`\n Calculator Result: ${calcTotal}`);

        // --- 43. Emoji Prompt ---
        const pickedEmoji = await MepCLI.emoji({
            message: "Pick an emoji for your avatar:",
            emojis: [
                { char: '😀', name: 'Grinning' },
                { char: '🚀', name: 'Rocket' },
                { char: '💻', name: 'Tech' },
                { char: '🎉', name: 'Party' },
                { char: '🔥', name: 'Fire' }
            ],
            recent: ['Rocket']
        });
        console.log(`\n Emoji Result: ${pickedEmoji}`);

        // --- 44. Match Prompt ---
        const linkedItems = await MepCLI.match({
            message: "Match capitals to countries:",
            source: ['Paris', 'Berlin', 'Tokyo'],
            target: ['Germany', 'Japan', 'France'],
            constraints: { required: true }
        });
        console.log(`\n Match Result:`, linkedItems);

        // --- 45. Diff Prompt ---
        const diffResult = await MepCLI.diff({
            message: "Resolve Conflict:",
            original: "const x = 10;",
            modified: "const x = 20; // Updated value"
        });
        console.log(`\n Diff Result: ${diffResult}`);

        // --- 46. Dial Prompt ---
        const dialVal = await MepCLI.dial({
            message: "Set Volume:",
            min: 0, 
            max: 100,
            initial: 50,
            radius: 5
        });
        console.log(`\n Dial Result: ${dialVal}`);

        // --- 47. Draw Prompt ---
        const drawing = await MepCLI.draw({
             message: "Draw a smiley face:",
             width: 20,
             height: 10,
             exportType: 'text'
        });
        console.log(`\n Drawing:\n${drawing}`);

        // --- 49. Multi-Column Select Prompt ---
        const mcSelection = await MepCLI.multiColumnSelect({
            message: "Pick a technology (Multi-Column):",
            choices: [
                { title: "React", value: "react" },
                { title: "Vue", value: "vue" },
                { title: "Angular", value: "angular" },
                { title: "Svelte", value: "svelte" },
                { title: "Node.js", value: "node" },
                { title: "Python", value: "python" },
                { title: "Ruby", value: "ruby" },
                { title: "Go", value: "go" },
                { title: "Rust", value: "rust" },
                { title: "Java", value: "java" },
                { title: "C#", value: "csharp" },
                { title: "PHP", value: "php" }
            ],
            cols: 4 // or 'auto'
        });
        console.log(`\n Multi-Column Result: ${mcSelection}`);

        // --- 50. Fuzzy Select Prompt ---
        const fuzzyResult = await MepCLI.fuzzySelect({
            message: "Search a package (Fuzzy):",
            choices: [
                { title: "react", value: "react" },
                { title: "react-dom", value: "react-dom" },
                { title: "react-router", value: "react-router" },
                { title: "redux", value: "redux" },
                { title: "vue", value: "vue" },
                { title: "vite", value: "vite" },
                { title: "webpack", value: "webpack" },
                { title: "lodash", value: "lodash" },
                { title: "moment", value: "moment" },
                { title: "express", value: "express" },
                { title: "git status", value: "git-status" },
                { title: "git commit", value: "git-commit" }
            ]
        });
        console.log(`\n Fuzzy Result: ${fuzzyResult}`);
        
        // --- 51. Miller Columns Prompt ---
        const millerPath = await MepCLI.miller({
            message: "Navigate Hierarchy (Miller Columns):",
            data: [
                {
                    title: "USA",
                    value: "usa",
                    children: [
                        {
                            title: "California",
                            value: "ca",
                            children: [
                                { title: "San Francisco", value: "sf" },
                                { title: "Los Angeles", value: "la" }
                            ]
                        },
                        {
                            title: "New York",
                            value: "ny",
                            children: [
                                { title: "NYC", value: "nyc" },
                                { title: "Albany", value: "albany" }
                            ]
                        }
                    ]
                },
                {
                    title: "Canada",
                    value: "canada",
                    children: [
                        {
                            title: "Ontario",
                            value: "on",
                            children: [
                                { title: "Toronto", value: "toronto" },
                                { title: "Ottawa", value: "ottawa" }
                            ]
                        },
                         {
                            title: "Quebec",
                            value: "qc",
                             children: [
                                { title: "Montreal", value: "montreal" }
                            ]
                        }
                    ]
                }
            ]
        });
        console.log(`\n Miller Result: ${millerPath.join(' -> ')}`);

        // --- 52. Pattern Lock Prompt ---
        const pattern = await MepCLI.pattern({
            message: "Draw a pattern (at least 2 nodes):",
            rows: 3,
            cols: 3
        });
        console.log(`\n Pattern Result: ${pattern}`);

        // --- 53. Region Selector Prompt ---
        const mapArt = 
`       ___
    __/   \\__
   /         \\
  |           |
   \\         /
    \\__   __/
       | |
    ___| |___
   /         \\
  |           |
   \\_________/`;
        const region = await MepCLI.region({
            message: "Select a region on the map:",
            mapArt: mapArt,
            regions: [
                { id: 'North', label: 'North Base', x: 8, y: 3, description: 'The northern stronghold' },
                { id: 'South', label: 'South Outpost', x: 8, y: 9, description: 'The southern trading post' }
            ]
        });
        console.log(`\n Region Result: ${region}`);

        // --- 54. Spreadsheet Prompt ---
        const sheetData = await MepCLI.spreadsheet({
            message: "Edit User Data (Spreadsheet):",
            columns: [
                { name: 'ID', key: 'id', width: 5, editable: false },
                { name: 'Name', key: 'name', width: 15 },
                { name: 'Role', key: 'role', width: 15 },
                { name: 'Active', key: 'active', width: 8 }
            ],
            data: [
                { id: 1, name: 'Alice', role: 'Admin', active: 'Yes' },
                { id: 2, name: 'Bob', role: 'User', active: 'Yes' },
                { id: 3, name: 'Charlie', role: 'Guest', active: 'No' },
                { id: 4, name: 'Dave', role: 'User', active: 'Yes' },
            ],
            rows: 5
        });
        console.log(`\n Spreadsheet Result:`, sheetData);

        // --- 55. Scroll Prompt (License Agreement) ---
        const dummyLicense = Array(40).fill("").map((_, i) => 
            `Clause ${i + 1}: This is a sample clause text that is quite long to ensure it wraps correctly or at least takes up some space.`
        ).join('\n');

        await MepCLI.scroll({
            message: "Read and Accept the License Agreement (Scroll to bottom):",
            content: dummyLicense,
            height: 10,
            requireScrollToBottom: true
        });
        console.log(`\n Scroll Result: License Accepted`);

        // --- 56. Breadcrumb Prompt ---
        const breadcrumbPath = await MepCLI.breadcrumb({
            message: "Select a folder (Breadcrumb):",
            root: process.cwd(),
            showHidden: false
        });
        console.log(`\n Breadcrumb Result: ${breadcrumbPath}`);

        // --- 57. Schedule Prompt ---
        const timeline = await MepCLI.schedule({
            message: "Project Timeline (Shift+Arrows to resize):",
            data: [
                { name: "Planning", start: new Date(), end: new Date(Date.now() + 86400000 * 2) },
                { name: "Development", start: new Date(Date.now() + 86400000 * 3), end: new Date(Date.now() + 86400000 * 7) }
            ]
        });
        console.log(`\n Schedule Result:`, timeline);

        // --- 58. Data Inspector Prompt ---
        const finalConfig = await MepCLI.inspector({
            message: "Verify Final Configuration (Data Inspector):",
            data: {
                env: "production",
                debug: false,
                database: {
                    host: "10.0.0.5",
                    port: 5432,
                    pool: { max: 20, min: 5 }
                },
                services: ["api", "worker", "auth"]
            }
        });
        console.log(`\n Inspector Result:`, JSON.stringify(finalConfig, null, 2));

        // --- 59. Exec Prompt (Background Command) ---
        console.log("\n--- Exec Prompt Demo (Simulating Background Task) ---");
        try {
            await MepCLI.exec({
                message: "Simulating a build process...",
                command: "node -e \"setTimeout(() => {}, 2000)\"", // 2s delay
                timeout: 5000
            });
            console.log(" -> Build Success!");
        } catch (e) {
            console.log(" -> Build Failed!", e);
        }

        // --- 60. Shortcut Prompt ---
        const keyShortcut = await MepCLI.shortcut({
             message: "Press any key combination (e.g. Ctrl+Shift+A):"
        });
        console.log(`\n Shortcut Result: ${keyShortcut.name} (Ctrl:${keyShortcut.ctrl}, Alt:${keyShortcut.meta}, Shift:${keyShortcut.shift})`);

        // --- 61. Seat Prompt ---
        const seats = await MepCLI.seat({
            message: "Select your seats (Use arrows, jump over gaps):",
            layout: [
                "AA_AA",
                "AA_AA",
                "_____",
                "BB_BB",
                "XX_BB" // XX is occupied
            ],
            multiple: true
        });
        console.log(`\n Seat Result: [${seats.join(', ')}]`);

        // --- 62. Select Range Prompt ---
        const selectedRange = await MepCLI.selectRange({
            message: "Select a range of commits (Space to anchor):",
            choices: [
                { title: "feat: initial commit", value: "c1" },
                { title: "feat: add login", value: "c2" },
                { title: "fix: login bug", value: "c3" },
                { title: "docs: readme", value: "c4" },
                { title: "chore: cleanup", value: "c5" },
                { title: "feat: dashboard", value: "c6" }
            ]
        });
        console.log(`\n SelectRange Result: [${selectedRange.join(', ')}]`);

        // --- 63. Sort Grid Prompt ---
        const sortedGrid = await MepCLI.sortGrid({
            message: "Rearrange the grid (Space to grab):",
            data: [
                ["A", "B", "C"],
                ["D", "E", "F"],
                ["G", "H", "I"]
            ]
        });
        console.log(`\n SortGrid Result:`, sortedGrid);

        // --- 65. Dependency Prompt ---
        const deps = await MepCLI.dependency({
            message: "Select Features (with Dependencies):",
            choices: [
                { title: "Core System", value: "core", selected: true },
                { title: "Plugin A (Requires Core)", value: "plugin-a", dependsOn: ['core'] },
                { title: "Plugin B (Conflicts A)", value: "plugin-b", conflictsWith: ['plugin-a'] },
                { title: "Dev Tools (Triggers Docs)", value: "devtools", triggers: ['docs'] },
                { title: "Documentation", value: "docs" }
            ],
            autoResolve: true
        });
        console.log(`\n Dependency Result: [${deps.join(', ')}]`);

        // --- 66. License Prompt (Split View) ---
        const license = await MepCLI.license({
            message: "Choose an Open Source License:",
            defaultLicense: 'MIT'
        });
        console.log(`\n License Result: ${license}`);

        // --- 67. Spin Utility (Loading/Async Task Indicator) ---
        const s = MepCLI.spinner("Finalizing configuration and deploying...").start();
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulates a 1.5 second async task
        s.success();
        
        console.log("\n--- Deployment successful! All MepCLI features demonstrated! ---");

    } catch (e) {
        // Global handler for Ctrl+C closure
        if (e instanceof Error && e.message === 'User force closed') {
             console.log("\nOperation cancelled by user (Ctrl+C).");
        } else {
             console.error("\nAn error occurred during prompt execution:", e);
        }
    }
}

runComprehensiveDemo();
