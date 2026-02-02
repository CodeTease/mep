export type PipelineAction<Ctx, T> = (context: Ctx) => Promise<T>;
export type PipelineCondition<Ctx> = (context: Ctx) => boolean;

export interface PipelineStep<Ctx> {
  name: keyof Ctx;
  action: PipelineAction<Ctx, any>;
  condition?: PipelineCondition<Ctx>;
}

/**
 * Pipeline (Workflow Engine)
 * 
 * Implements a sequential workflow where steps are executed one by one,
 * accumulating results into a Context object.
 * 
 * Philosophy: Enter-and-Forget (EAF), Zero-Dependency, Method Chaining.
 */
export class Pipeline<Ctx extends Record<string, any> = Record<string, any>> {
  private steps: PipelineStep<Ctx>[] = [];

  constructor() {}

  /**
   * Adds a step to the pipeline.
   * @param name The key in the context to store the result.
   * @param action The function to execute, returning a Promise (usually a Prompt).
   */
  public step<K extends keyof Ctx>(name: K, action: PipelineAction<Ctx, Ctx[K]>): this {
    this.steps.push({ name, action });
    return this;
  }

  /**
   * Adds a conditional step to the pipeline.
   * @param condition A function that returns true if the step should run.
   * @param name The key in the context to store the result.
   * @param action The function to execute.
   */
  public stepIf<K extends keyof Ctx>(
    condition: PipelineCondition<Ctx>,
    name: K,
    action: PipelineAction<Ctx, Ctx[K]>
  ): this {
    this.steps.push({ name, action, condition });
    return this;
  }

  /**
   * Executes the pipeline steps sequentially.
   * @param initialContext Optional initial context.
   */
  public async run(initialContext: Partial<Ctx> = {}): Promise<Ctx> {
    const context: Ctx = { ...initialContext } as Ctx;

    for (const step of this.steps) {
      if (step.condition && !step.condition(context)) {
        continue;
      }

      // In EAF (Enter-And-Forget) philosophy, if a prompt fails or is cancelled,
      // the exception will propagate up and stop the pipeline.
      const result = await step.action(context);
      context[step.name] = result;
    }

    return context;
  }
}
