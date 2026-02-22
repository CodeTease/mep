import { MepCLI, Pipeline } from '../src/index';

interface UserProfile {
  name: string;
  age?: number;
  email?: string;
  confirmed: boolean;
}

async function main() {
  console.log('Starting Advanced Pipeline Demo...\n');

  try {
    const result = await new Pipeline<UserProfile>({
      onPipelineStart: () => console.log('--- Pipeline Initiated ---'),
      onPipelineComplete: () => console.log('--- Pipeline Finished ---'),
      onError: (err, meta) => console.log(`[Error in ${meta.name}]:`, err instanceof Error ? err.message : String(err))
    })
      // 1. Named step with validation
      .step('name', () => MepCLI.text({
        message: 'What is your username?',
        placeholder: 'admin'
      }), {
        validate: (val) => val.trim().length > 0 || 'Username is required',
        transform: (val) => val.trim().toLowerCase()
      })

      // 2. Conditional step with transformation
      .stepIf(
        (ctx) => ctx.name !== 'admin',
        'age',
        () => MepCLI.number({
          message: 'How old are you?',
          initial: 18
        }),
        {
          transform: (val) => Number(val),
          validate: (val) => val >= 13 || 'You must be at least 13 years old'
        }
      )

      // 3. Anonymous step returning partial context based on the previous step
      .step(async (ctx) => {
        if (ctx.age && ctx.age >= 18) {
          const email = await MepCLI.text({ message: 'Enter your email for newsletters (optional):' });
          if (email) return { email };
        }
      })

      // 4. Fallback execution on error
      .step('confirmed', async (ctx) => {
        return await MepCLI.confirm({
          message: `Confirm details for ${ctx.name}?`
        });
      }, {
        fallback: false
      })
      .run();

    console.log('\nPipeline Result Context:');
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('\nPipeline Fatal Error:', err);
  }
}

main();
