import { ANSI } from './ansi';
import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions, ListOptions, SliderOptions, DateOptions, FileOptions, MultiSelectOptions, RatingOptions } from './types';
import { theme } from './theme';
import { symbols } from './symbols';
import { Spinner } from './spinner';
import { TextPrompt } from './prompts/text';
import { SelectPrompt } from './prompts/select';
import { CheckboxPrompt } from './prompts/checkbox';
import { ConfirmPrompt } from './prompts/confirm';
import { TogglePrompt } from './prompts/toggle';
import { NumberPrompt } from './prompts/number';
import { ListPrompt } from './prompts/list';
import { SliderPrompt } from './prompts/slider';
import { DatePrompt } from './prompts/date';
import { FilePrompt } from './prompts/file';
import { MultiSelectPrompt } from './prompts/multi-select';
import { RatingPrompt } from './prompts/rating';

/**
 * Public Facade for MepCLI
 */
export class MepCLI {
    public static theme: ThemeConfig = theme;

    /**
     * Creates a new Spinner instance.
     */
    static spinner(message: string): Spinner {
        return new Spinner(message);
    }

    static text(options: TextOptions): Promise<string> {
        return new TextPrompt(options).run();
    }

    static select<const V>(options: SelectOptions<V>): Promise<V> {
        return new SelectPrompt(options).run();
    }

    static checkbox<const V>(options: CheckboxOptions<V>): Promise<V[]> {
        return new CheckboxPrompt(options).run();
    }

    static confirm(options: ConfirmOptions): Promise<boolean> {
        return new ConfirmPrompt(options).run();
    }

    static password(options: TextOptions): Promise<string> {
        return new TextPrompt({ ...options, isPassword: true }).run();
    }
    
    static number(options: NumberOptions): Promise<number> {
        return new NumberPrompt(options).run();
    }
    
    static toggle(options: ToggleOptions): Promise<boolean> {
        return new TogglePrompt(options).run();
    }

    static list(options: ListOptions): Promise<string[]> {
        return new ListPrompt(options).run();
    }

    static slider(options: SliderOptions): Promise<number> {
        return new SliderPrompt(options).run();
    }

    static date(options: DateOptions): Promise<Date> {
        return new DatePrompt(options).run();
    }

    static file(options: FileOptions): Promise<string> {
        return new FilePrompt(options).run();
    }

    static multiSelect<const V>(options: MultiSelectOptions<V>): Promise<V[]> {
        return new MultiSelectPrompt(options).run();
    }

    static rating(options: RatingOptions): Promise<number> {
        return new RatingPrompt(options).run();
    }
}
