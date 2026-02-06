// Originally from example.ts

import { MepCLI } from "../src"

try {
    const otpCode = await MepCLI.otp({
        message: "Enter Verification Code (OTP):",
        length: 6,
        mask: "•",
        secure: false // Set true to hide input like password
    });
    console.log(`\n OTP Result: ${otpCode}`);
} catch (e) {
    if (e instanceof Error && e.message === 'User force closed') {
        console.log("\nOperation cancelled by user.");
    } else {
        console.error("\nAn error occurred:", e);
    }
}