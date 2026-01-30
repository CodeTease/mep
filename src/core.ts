import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions, ListOptions, SliderOptions, 
         DateOptions, FileOptions, MultiSelectOptions, RatingOptions, AutocompleteOptions, SortOptions, TableOptions, EditorOptions, TreeOptions, 
         KeypressOptions, FormOptions, SnippetOptions, SpamOptions, WaitOptions, CodeOptions, TreeSelectOptions, RangeOptions, TransferOptions, CronOptions,
         ColorOptions, GridOptions, CalendarOptions } from './types';
import { theme } from './theme';
import { Spinner } from './spinner';
import { TextPrompt } from './prompts/text';
import { SelectPrompt } from './prompts/select';
import { CheckboxPrompt } from './prompts/checkbox';
import { ConfirmPrompt } from './prompts/confirm';
import { TogglePrompt } from './prompts/toggle';
import { NumberPrompt } from './prompts/number';
import { ListPrompt } from './prompts/list';
import { SliderPrompt } from './prompts/slider';
import { RangePrompt } from './prompts/range';
import { TransferPrompt } from './prompts/transfer';
import { CronPrompt } from './prompts/cron';
import { DatePrompt } from './prompts/date';
import { FilePrompt } from './prompts/file';
import { MultiSelectPrompt } from './prompts/multi-select';
import { RatingPrompt } from './prompts/rating';
import { AutocompletePrompt } from './prompts/autocomplete';
import { SortPrompt } from './prompts/sort';
import { TablePrompt } from './prompts/table';
import { EditorPrompt } from './prompts/editor';
import { TreePrompt } from './prompts/tree';
import { KeypressPrompt } from './prompts/keypress';
import { FormPrompt } from './prompts/form';
import { SnippetPrompt } from './prompts/snippet';
import { SpamPrompt } from './prompts/spam';
import { WaitPrompt } from './prompts/wait';
import { CodePrompt } from './prompts/code';
import { TreeSelectPrompt } from './prompts/tree-select';
import { ColorPrompt } from './prompts/color';
import { GridPrompt } from './prompts/grid';
import { CalendarPrompt } from './prompts/calendar';

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

    static secret(options: TextOptions): Promise<string> {
        return new TextPrompt({ ...options, mask: '' }).run();
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

    static range(options: RangeOptions): Promise<[number, number]> {
        return new RangePrompt(options).run();
    }

    static transfer<const V>(options: TransferOptions<V>): Promise<[V[], V[]]> {
        return new TransferPrompt(options).run();
    }

    static cron(options: CronOptions): Promise<string> {
        return new CronPrompt(options).run();
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

    static autocomplete<const V>(options: AutocompleteOptions<V>): Promise<V> {
        return new AutocompletePrompt(options).run();
    }

    static sort(options: SortOptions): Promise<string[]> {
        return new SortPrompt(options).run();
    }

    static table<const V>(options: TableOptions<V>): Promise<V> {
        return new TablePrompt(options).run();
    }

    static editor(options: EditorOptions): Promise<string> {
        return new EditorPrompt(options).run();
    }

    static tree<const V>(options: TreeOptions<V>): Promise<V> {
        return new TreePrompt(options).run();
    }

    static keypress(options: KeypressOptions): Promise<string> {
        return new KeypressPrompt(options).run();
    }

    static form(options: FormOptions): Promise<Record<string, string>> {
        return new FormPrompt(options).run();
    }

    static snippet(options: SnippetOptions): Promise<string> {
        return new SnippetPrompt(options).run();
    }

    static spam(options: SpamOptions): Promise<boolean> {
        return new SpamPrompt(options).run();
    }

    static wait(options: WaitOptions): Promise<void> {
        return new WaitPrompt(options).run();
    }

    static code(options: CodeOptions): Promise<string> {
        return new CodePrompt(options).run();
    }

    static treeSelect<const V>(options: TreeSelectOptions<V>): Promise<V[]> {
        return new TreeSelectPrompt(options).run();
    }

    static color(options: ColorOptions): Promise<string> {
        return new ColorPrompt(options).run();
    }

    static grid(options: GridOptions): Promise<boolean[][]> {
        return new GridPrompt(options).run();
    }

    static calendar(options: CalendarOptions): Promise<Date | [Date, Date]> {
        return new CalendarPrompt(options).run();
    }
}
