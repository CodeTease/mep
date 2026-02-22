import { TaskRunner } from './tasks';

export const PipelineExit = Symbol.for('PipelineExit');

export type PipelineAction<Ctx, T> = (context: Ctx, tasks?: TaskRunner) => Promise<T | typeof PipelineExit> | T | typeof PipelineExit;
export type PipelineCondition<Ctx> = (context: Readonly<Ctx>) => boolean;

export interface ValidationSchema {
  parse?: (data: any) => any;
  safeParse?: (data: any) => { success: boolean; error?: any; issues?: any; data?: any };
}

export type Validator = ((value: any) => boolean | string | Promise<boolean | string>) | ValidationSchema;
export type Transformer<Ctx> = (value: any, context: Readonly<Ctx>) => any | Promise<any>;

export interface PipelineStep<Ctx> {
  name?: keyof Ctx;
  action: PipelineAction<Ctx, any>;
  condition?: PipelineCondition<Ctx>;
  validate?: Validator;
  transform?: Transformer<Ctx>;
}

export interface StepConfig<Ctx> {
  validate?: Validator;
  transform?: Transformer<Ctx>;
}

export interface StepMetadata {
  index: number;
  name?: string;
  type: 'named' | 'anonymous';
}

export interface PipelineOptions<Ctx> {
  onStepStart?: (meta: StepMetadata, context: Readonly<Ctx>) => void | Promise<void>;
  onStepComplete?: (meta: StepMetadata, context: Readonly<Ctx>) => void | Promise<void>;
  onError?: (error: unknown, meta: StepMetadata, context: Readonly<Ctx>) => void | Promise<void>;
}

export class PipelineValidationError<Ctx = any> extends Error {
  public step?: StepMetadata;
  public context?: Ctx;

  constructor(message: string, step?: StepMetadata, context?: Ctx) {
    super(message);
    this.name = 'PipelineValidationError';
    this.step = step;
    this.context = context;
  }
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
  private options: PipelineOptions<Ctx>;

  constructor(options?: PipelineOptions<Ctx>) {
    this.options = options || {};
  }

  /**
   * Adds a named step to the pipeline. The result of the action is stored in the context under the given name.
   */
  public step<K extends keyof Ctx>(name: K, action: PipelineAction<Ctx, Ctx[K]> | Pipeline<any>, config?: StepConfig<Ctx>): this;
  /**
   * Adds an anonymous step to the pipeline. The action can mutate the context directly or return a partial context to merge in.
   */
  public step(action: PipelineAction<Ctx, void | Partial<Ctx>> | Pipeline<any>, config?: StepConfig<Ctx>): this;
  public step(
    nameOrAction: keyof Ctx | PipelineAction<Ctx, any> | Pipeline<any>,
    actionOrConfig?: PipelineAction<Ctx, any> | Pipeline<any> | StepConfig<Ctx>,
    config?: StepConfig<Ctx>
  ): this {
    if (typeof nameOrAction === 'function' || nameOrAction instanceof Pipeline) {
      const action = nameOrAction instanceof Pipeline
        ? ((ctx: Ctx, tasks?: TaskRunner) => nameOrAction.run(ctx, tasks))
        : nameOrAction;
      this.steps.push({
        action: action as PipelineAction<Ctx, any>,
        ...(actionOrConfig as StepConfig<Ctx> || {})
      });
    } else {
      const action = actionOrConfig instanceof Pipeline
        ? ((ctx: Ctx, tasks?: TaskRunner) => actionOrConfig.run(ctx, tasks))
        : actionOrConfig as PipelineAction<Ctx, any>;
      this.steps.push({
        name: nameOrAction as keyof Ctx,
        action: action,
        ...(config || {})
      });
    }
    return this;
  }

  /**
   * Adds a conditional named step to the pipeline.
   */
  public stepIf<K extends keyof Ctx>(condition: PipelineCondition<Ctx>, name: K, action: PipelineAction<Ctx, Ctx[K]> | Pipeline<any>, config?: StepConfig<Ctx>): this;
  /**
   * Adds a conditional anonymous step to the pipeline.
   */
  public stepIf(condition: PipelineCondition<Ctx>, action: PipelineAction<Ctx, void | Partial<Ctx>> | Pipeline<any>, config?: StepConfig<Ctx>): this;
  public stepIf(
    condition: PipelineCondition<Ctx>,
    nameOrAction: keyof Ctx | PipelineAction<Ctx, any> | Pipeline<any>,
    actionOrConfig?: PipelineAction<Ctx, any> | Pipeline<any> | StepConfig<Ctx>,
    config?: StepConfig<Ctx>
  ): this {
    if (typeof nameOrAction === 'function' || nameOrAction instanceof Pipeline) {
      const action = nameOrAction instanceof Pipeline
        ? ((ctx: Ctx, tasks?: TaskRunner) => nameOrAction.run(ctx, tasks))
        : nameOrAction;
      this.steps.push({
        condition,
        action: action as PipelineAction<Ctx, any>,
        ...(actionOrConfig as StepConfig<Ctx> || {})
      });
    } else {
      const action = actionOrConfig instanceof Pipeline
        ? ((ctx: Ctx, tasks?: TaskRunner) => actionOrConfig.run(ctx, tasks))
        : actionOrConfig as PipelineAction<Ctx, any>;
      this.steps.push({
        condition,
        name: nameOrAction as keyof Ctx,
        action: action,
        ...(config || {})
      });
    }
    return this;
  }

  /**
   * Executes the pipeline steps sequentially.
   * @param initialContext Optional initial context.
   * @param tasks Optional TaskRunner instance to pass to steps.
   */
  public async run(initialContext: Partial<Ctx> = {}, tasks?: TaskRunner): Promise<Ctx> {
    const context: Ctx = { ...initialContext } as Ctx;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const meta: StepMetadata = {
        index: i,
        name: step.name as string | undefined,
        type: step.name ? 'named' : 'anonymous'
      };

      if (step.condition && !step.condition(context)) {
        continue;
      }

      if (this.options.onStepStart) {
        await this.options.onStepStart(meta, { ...context });
      }

      try {
        let result = await step.action(context, tasks);

        if (result === PipelineExit) {
          break;
        }

        if (!step.name) {
          // Anonymous action
          if (result && typeof result === 'object' && !Array.isArray(result)) {
            Object.assign(context, result);
          }
        } else {
          // Named action
          if (step.transform) {
            result = await step.transform(result, { ...context });
          }

          if (step.validate) {
            const validator = step.validate;
            if (typeof validator === 'function') {
              const valid = await validator(result);
              if (valid === false) {
                throw new PipelineValidationError(`Validation failed for step at index ${i} (${String(step.name)})`, meta, context);
              }
              if (typeof valid === 'string') {
                throw new PipelineValidationError(valid, meta, context);
              }
            } else if (typeof validator === 'object') {
              if (typeof validator.safeParse === 'function') {
                const res = validator.safeParse(result);
                if (!res.success) {
                  const errorMsg = res.error?.message || res.issues?.[0]?.message || 'Schema validation failed';
                  throw new PipelineValidationError(`Validation failed: ${errorMsg}`, meta, context);
                }
                result = res.data !== undefined ? res.data : result;
              } else if (typeof validator.parse === 'function') {
                try {
                  const parsed = validator.parse(result);
                  result = parsed !== undefined ? parsed : result;
                } catch (err: any) {
                  throw new PipelineValidationError(`Validation failed: ${err.message || 'Schema parsing error'}`, meta, context);
                }
              }
            }
          }

          context[step.name] = result;
        }

        if (this.options.onStepComplete) {
          await this.options.onStepComplete(meta, { ...context });
        }
      } catch (err) {
        if (this.options.onError) {
          await this.options.onError(err, meta, { ...context });
        }
        throw err;
      }
    }

    return context;
  }
}
