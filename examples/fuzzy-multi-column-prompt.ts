import { MepCLI } from '../src';

async function main() {
    console.clear();
    console.log("--- Fuzzy Multi-Column Prompt Example ---\n");

    try {
        const selected = await MepCLI.fuzzyMultiColumn({
            message: "Select a Pokemon (Type to search in grid):",
            choices: [
                { title: 'Bulbasaur', value: 'bulbasaur' },
                { title: 'Ivysaur', value: 'ivysaur' },
                { title: 'Venusaur', value: 'venusaur' },
                { title: 'Charmander', value: 'charmander' },
                { title: 'Charmeleon', value: 'charmeleon' },
                { title: 'Charizard', value: 'charizard' },
                { title: 'Squirtle', value: 'squirtle' },
                { title: 'Wartortle', value: 'wartortle' },
                { title: 'Blastoise', value: 'blastoise' },
                { title: 'Caterpie', value: 'caterpie' },
                { title: 'Metapod', value: 'metapod' },
                { title: 'Butterfree', value: 'butterfree' },
                { title: 'Weedle', value: 'weedle' },
                { title: 'Kakuna', value: 'kakuna' },
                { title: 'Beedrill', value: 'beedrill' },
                { title: 'Pidgey', value: 'pidgey' },
                { title: 'Pidgeotto', value: 'pidgeotto' },
                { title: 'Pidgeot', value: 'pidgeot' },
                { title: 'Rattata', value: 'rattata' },
                { title: 'Raticate', value: 'raticate' },
            ],
            cols: 3
        });

        console.log(`\nSelected: ${selected}`);
    } catch (error) {
        console.log("\nCancelled.");
    }
}

main();
