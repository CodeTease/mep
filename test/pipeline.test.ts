import { Pipeline, PipelineValidationError, StepMetadata, PipelineExit } from '../src/pipeline';

describe('Pipeline', () => {
  it('should run steps sequentially and collect context', async () => {
    type Ctx = { a: string; b: number };
    const p = new Pipeline<Ctx>();
    p.step('a', async () => 'hello');
    p.step('b', async () => 42);

    const result = await p.run();
    expect(result.a).toBe('hello');
    expect(result.b).toBe(42);
  });

  it('should support condition execution (stepIf)', async () => {
    type Ctx = { a: string; runB: boolean; b: number };
    const p = new Pipeline<Ctx>();
    p.step('runB', async () => false);
    p.stepIf((ctx) => ctx.runB, 'b', async () => 42);
    p.step('a', async () => 'always');

    const result = await p.run();
    expect(result.a).toBe('always');
    expect(result.b).toBeUndefined();
  });

  it('should allow anonymous steps that mutate the context directly or return partial context', async () => {
    type Ctx = { count: number; a: string };
    const p = new Pipeline<Ctx>();
    p.step(async () => {
      return { count: 10 }; // Return partial context
    });
    p.step(async (ctx) => {
      ctx.a = `count is ${ctx.count}`; // Mutate directly
    });

    const result = await p.run();
    expect(result.count).toBe(10);
    expect(result.a).toBe('count is 10');
  });

  describe('Early Exit', () => {
    it('should stop pipeline execution and return context when PipelineExit is returned', async () => {
      type Ctx = { a: number; b: number; c: number };
      const p = new Pipeline<Ctx>();
      p.step('a', async () => 1);
      p.step('b', async () => PipelineExit as any);
      p.step('c', async () => 3);

      const res = await p.run();
      expect(res.a).toBe(1);
      expect(res.b).toBeUndefined();
      expect(res.c).toBeUndefined();
    });

    it('should stop and return context for anonymous steps returning PipelineExit', async () => {
      type Ctx = { count: number };
      const p = new Pipeline<Ctx>();
      p.step(async () => ({ count: 1 }));
      p.step(async () => PipelineExit as any);
      p.step(async () => ({ count: 2 }));

      const res = await p.run();
      expect(res.count).toBe(1);
    });
  });

  describe('Sub-pipelines', () => {
    it('should allow a Pipeline instance as a step', async () => {
      type Ctx = { a: number; b: number; c: number };
      const main = new Pipeline<Ctx>();
      const sub = new Pipeline<Ctx>();

      sub.step('b', async () => 2);

      main.step('a', async () => 1);
      main.step(sub);
      main.step('c', async () => 3);

      const res = await main.run();
      expect(res.a).toBe(1);
      expect(res.b).toBe(2);
      expect(res.c).toBe(3);
    });

    it('should allow a Pipeline instance as a named step', async () => {
      type Ctx = { a: number; nested: { x: number } };
      const main = new Pipeline<Ctx>();
      const sub = new Pipeline<{ x: number }>();

      sub.step('x', async () => 42);

      main.step('nested', sub);

      const res = await main.run();
      expect(res.nested.x).toBe(42);
    });
  });

  describe('Validation Layer', () => {
    it('should pass if validate returns true', async () => {
      type Ctx = { age: number };
      const p = new Pipeline<Ctx>();
      p.step('age', async () => 20, {
        validate: (v) => v > 18
      });

      const res = await p.run();
      expect(res.age).toBe(20);
    });

    it('should throw PipelineValidationError with step and context details if validate returns false', async () => {
      type Ctx = { a: number, age: number };
      const p = new Pipeline<Ctx>();
      p.step('a', async () => 1);
      p.step('age', async () => 15, {
        validate: (v) => v > 18
      });

      let caughtErr: any;
      try {
        await p.run();
      } catch (err) {
        caughtErr = err;
      }
      expect(caughtErr).toBeInstanceOf(PipelineValidationError);
      expect(caughtErr.message).toBe('Validation failed for step at index 1 (age)');
      expect(caughtErr.step).toEqual({ index: 1, name: 'age', type: 'named' });
      expect(caughtErr.context).toEqual({ a: 1 });
    });

    it('should throw PipelineValidationError with string message if validate returns string', async () => {
      type Ctx = { age: number };
      const p = new Pipeline<Ctx>();
      p.step('age', async () => 15, {
        validate: (v) => (v > 18 ? true : 'Age must be over 18')
      });

      await expect(p.run()).rejects.toThrow(PipelineValidationError);
      await expect(p.run()).rejects.toThrow('Age must be over 18');
    });

    it('should duck-type Zod/Valibot safeParse implementation', async () => {
      type Ctx = { name: string };
      const p = new Pipeline<Ctx>();
      p.step('name', async () => 123 as any, {
        validate: {
          safeParse: (val: any) => {
            if (typeof val === 'string') return { success: true, data: val };
            return { success: false, error: { message: 'Expected string' } };
          }
        }
      });

      await expect(p.run()).rejects.toThrow(PipelineValidationError);
      await expect(p.run()).rejects.toThrow('Validation failed: Expected string');
    });

    it('should parse and update value on success with SafeParse', async () => {
      type Ctx = { num: number };
      const p = new Pipeline<Ctx>();
      p.step('num', async () => '42' as any, {
        validate: {
          safeParse: (val: any) => ({ success: true, data: Number(val) }) // updates val
        }
      });

      const res = await p.run();
      expect(res.num).toBe(42);
    });
  });

  describe('Transform Layer', () => {
    it('should transform data before setting into context', async () => {
      type Ctx = { cleanText: string };
      const p = new Pipeline<Ctx>();
      p.step('cleanText', async () => '  Hello World  ', {
        transform: (val) => val.trim().toLowerCase()
      });

      const res = await p.run();
      expect(res.cleanText).toBe('hello world');
    });

    it('should transform then validate', async () => {
      type Ctx = { val: number };
      const p = new Pipeline<Ctx>();
      p.step('val', async () => '99' as any, {
        transform: (val) => Number(val),
        validate: (val) => typeof val === 'number'
      });

      const res = await p.run();
      expect(res.val).toBe(99);
    });
  });

  describe('Event-Driven Hooks', () => {
    it('should trigger onStepStart and onStepComplete hooks', async () => {
      type Ctx = { a: string };
      const startMock = jest.fn();
      const completeMock = jest.fn();

      const p = new Pipeline<Ctx>({
        onStepStart: startMock,
        onStepComplete: completeMock
      });

      p.step('a', async () => 'test');
      await p.run();

      expect(startMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, name: 'a', type: 'named' }),
        expect.any(Object)
      );

      expect(completeMock).toHaveBeenCalledTimes(1);
      expect(completeMock).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, name: 'a', type: 'named' }),
        expect.objectContaining({ a: 'test' })
      );
    });

    it('should trigger onError hook and rethrow', async () => {
      type Ctx = { a: string };
      const errorMock = jest.fn();
      const testErr = new Error('fail');

      const p = new Pipeline<Ctx>({
        onError: errorMock
      });

      p.step('a', async () => { throw testErr; });

      await expect(p.run()).rejects.toThrow(testErr);

      expect(errorMock).toHaveBeenCalledTimes(1);
      expect(errorMock).toHaveBeenCalledWith(
        testErr,
        expect.objectContaining({ index: 0, name: 'a' }),
        expect.any(Object)
      );
    });
  });
});
