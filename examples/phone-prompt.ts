import { MepCLI } from '../src/index';

async function main() {
    console.clear();
    console.log("Phone Prompt Demo");

    try {
        const phone = await MepCLI.phone({
            message: "Enter your phone number (Default VN)",
            defaultCountry: 'VN',
            strict: true
        });
        console.log(`Result 1: ${phone}`);
        
        const phone2 = await MepCLI.phone({
            message: "Enter US phone (Default US)",
            defaultCountry: 'US',
            strict: false
        });
        console.log(`Result 2: ${phone2}`);

    } catch (e) {
        console.log("Cancelled");
    }
}

main();
