import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Interactive CURL Builder Demo ---");
    console.log("A single-view dashboard to compose HTTP requests.");
    console.log("Navigation: Tab/Shift+Tab. Actions: Space (Toggle), Enter (Edit).\n");

    try {
        const result = await MepCLI.curl({
            message: "Construct API Request",
            defaultMethod: "POST",
            defaultUrl: "https://jsonplaceholder.typicode.com/posts",
            defaultHeaders: {
                "Content-Type": "application/json",
                "Authorization": "Bearer <token>"
            },
            defaultBody: JSON.stringify({
                title: 'foo',
                body: 'bar',
                userId: 1,
            }, null, 2)
        });

        console.log("\n--- Final CURL Command ---");
        console.log(result.command);
        
        console.log("\n--- Structured Data ---");
        console.log("Method:", result.method);
        console.log("URL:", result.url);
        console.log("Headers:", result.headers);
        console.log("Body Length:", result.body ? result.body.length : 0);

    } catch (_e) {
        console.log("Cancelled by user");
    }
}

main();
