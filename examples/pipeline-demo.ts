import { MepCLI } from '../src/index';

interface UserProfile {
  name: string;
  age?: number;
  confirmed: boolean;
}

async function main() {
  console.log('Starting Pipeline Demo...\n');

  try {
    const result = await MepCLI.pipeline<UserProfile>()
      .step('name', () => MepCLI.text({
        message: 'What is your name?',
        placeholder: 'John Doe'
      }))
      .stepIf(
        (ctx) => ctx.name !== 'admin',
        'age',
        () => MepCLI.number({
          message: 'How old are you?',
          initial: 18
        })
      )
      .step('confirmed', (ctx) => MepCLI.confirm({
        message: `Confirm details for ${ctx.name}?`
      }))
      .run();

    console.log('\nPipeline Completed!');
    console.log('Result:', result);
  } catch (err) {
    console.error('\nPipeline Failed:', err);
  }
}

main();
