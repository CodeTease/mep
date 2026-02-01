import { TextOptions, SelectOptions, ConfirmOptions, CheckboxOptions, ThemeConfig, NumberOptions, ToggleOptions, ListOptions, SliderOptions, 
         DateOptions, FileOptions, MultiSelectOptions, RatingOptions, AutocompleteOptions, SortOptions, TableOptions, EditorOptions, TreeOptions, 
         KeypressOptions, FormOptions, SnippetOptions, SpamOptions, WaitOptions, CodeOptions, TreeSelectOptions, RangeOptions, TransferOptions, CronOptions,
         ColorOptions, GridOptions, CalendarOptions, MapOptions, SemVerOptions, IPOptions, OTPOptions, QuizSelectOptions, QuizTextOptions,
         KanbanOptions, KanbanItem, TimeOptions, HeatmapOptions, ByteOptions, PatternOptions, RegionOptions, SpreadsheetOptions, SelectRangeOptions, SortGridOptions } from './types';
import { SlotOptions, GaugeOptions, CalculatorOptions, EmojiOptions, MatchOptions, DiffOptions, DialOptions, DrawOptions, MultiColumnSelectOptions, FuzzySelectOptions, MillerOptions, ScrollOptions, BreadcrumbOptions, ScheduleOptions, ScheduleTask, DataInspectorOptions, ExecOptions, ShortcutOptions, ShortcutResult, SeatOptions, TerminalOptions } from './types';
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
import { MapPrompt } from './prompts/map';
import { SemVerPrompt } from './prompts/semver';
import { IPPrompt } from './prompts/ip';
import { OTPPrompt } from './prompts/otp';
import { QuizSelectPrompt } from './prompts/quiz-select';
import { QuizTextPrompt } from './prompts/quiz-text';
import { KanbanPrompt } from './prompts/kanban';
import { TimePrompt } from './prompts/time';
import { HeatmapPrompt } from './prompts/heatmap';
import { BytePrompt } from './prompts/byte';
import { SlotPrompt } from './prompts/slot';
import { GaugePrompt } from './prompts/gauge';
import { CalculatorPrompt } from './prompts/calculator';
import { EmojiPrompt } from './prompts/emoji';
import { MatchPrompt } from './prompts/match';
import { DiffPrompt } from './prompts/diff';
import { DialPrompt } from './prompts/dial';
import { DrawPrompt } from './prompts/draw';
import { MultiColumnSelectPrompt } from './prompts/multi-column-select';
import { FuzzySelectPrompt } from './prompts/fuzzy';
import { MillerPrompt } from './prompts/miller';
import { PatternPrompt } from './prompts/pattern';
import { RegionPrompt } from './prompts/region';
import { SpreadsheetPrompt } from './prompts/spreadsheet';
import { ScrollPrompt } from './prompts/scroll';
import { BreadcrumbPrompt } from './prompts/breadcrumb';
import { SchedulePrompt } from './prompts/schedule';
import { DataInspectorPrompt } from './prompts/data-inspector';
import { ExecPrompt } from './prompts/exec';
import { ShortcutPrompt } from './prompts/shortcut';
import { SeatPrompt } from './prompts/seat';
import { SelectRangePrompt } from './prompts/select-range';
import { SortGridPrompt } from './prompts/sort-grid';
import { TerminalPrompt } from './prompts/terminal';

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

    /**
     * Tree Select Prompt (Multi-selection)
     * * @param options Configuration for the tree selection
     * @returns A promise that resolves to an array of selected values
     * * @notice Windows Compatibility:
     * When used in a long sequence of prompts, this component may experience 
     * an input delay. If it feels "blocked", simply press 'Enter' once 
     * to refresh the TTY stream. 
     */
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

    static map(options: MapOptions): Promise<Record<string, string>> {
        return new MapPrompt(options).run();
    }

    static semver(options: SemVerOptions): Promise<string> {
        return new SemVerPrompt(options).run();
    }

    static ip(options: IPOptions): Promise<string> {
        return new IPPrompt(options).run();
    }

    static otp(options: OTPOptions): Promise<string> {
        return new OTPPrompt(options).run();
    }

    static quizSelect<const V>(options: QuizSelectOptions<V>): Promise<V> {
        return new QuizSelectPrompt(options).run();
    }

    static quizText(options: QuizTextOptions): Promise<string> {
        return new QuizTextPrompt(options).run();
    }

    static kanban<V extends KanbanItem>(options: KanbanOptions<V>): Promise<Record<string, V[]>> {
        return new KanbanPrompt(options).run();
    }

    static time(options: TimeOptions): Promise<string> {
        return new TimePrompt(options).run();
    }

    static heatmap(options: HeatmapOptions): Promise<number[][]> {
        return new HeatmapPrompt(options).run();
    }

    static byte(options: ByteOptions): Promise<number> {
        return new BytePrompt(options).run();
    }

    static slot(options: SlotOptions): Promise<string> {
        return new SlotPrompt(options).run();
    }

    static gauge(options: GaugeOptions): Promise<string> {
        return new GaugePrompt(options).run();
    }

    static calculator(options: CalculatorOptions): Promise<number> {
        return new CalculatorPrompt(options).run();
    }

    static emoji(options: EmojiOptions): Promise<string> {
        return new EmojiPrompt(options).run();
    }

    static match(options: MatchOptions): Promise<Record<string, any[]>> {
        return new MatchPrompt(options).run();
    }

    static diff(options: DiffOptions): Promise<string> {
        return new DiffPrompt(options).run();
    }

    static dial(options: DialOptions): Promise<number> {
        return new DialPrompt(options).run();
    }

    static draw(options: DrawOptions): Promise<string | boolean[][]> {
        return new DrawPrompt(options).run();
    }

    static multiColumnSelect<V>(options: MultiColumnSelectOptions<V>): Promise<V> {
        return new MultiColumnSelectPrompt(options).run();
    }

    static fuzzySelect<V>(options: FuzzySelectOptions<V>): Promise<V> {
        return new FuzzySelectPrompt(options).run();
    }

    static miller<V>(options: MillerOptions<V>): Promise<V[]> {
        return new MillerPrompt(options).run();
    }

    static pattern(options: PatternOptions): Promise<number[]> {
        return new PatternPrompt(options).run();
    }

    static region(options: RegionOptions): Promise<string> {
        return new RegionPrompt(options).run();
    }

    static spreadsheet(options: SpreadsheetOptions): Promise<Record<string, any>[]> {
        return new SpreadsheetPrompt(options).run();
    }

    static scroll(options: ScrollOptions): Promise<boolean> {
        return new ScrollPrompt(options).run();
    }

    static breadcrumb(options: BreadcrumbOptions): Promise<string> {
        return new BreadcrumbPrompt(options).run();
    }

    static schedule(options: ScheduleOptions): Promise<ScheduleTask[]> {
        return new SchedulePrompt(options).run();
    }

    static inspector(options: DataInspectorOptions): Promise<any> {
        return new DataInspectorPrompt(options).run();
    }

    static exec(options: ExecOptions): Promise<void> {
        return new ExecPrompt(options).run();
    }

    static shortcut(options: ShortcutOptions): Promise<ShortcutResult> {
        return new ShortcutPrompt(options).run();
    }

    static seat(options: SeatOptions): Promise<string[]> {
        return new SeatPrompt(options).run();
    }

    static selectRange<const V>(options: SelectRangeOptions<V>): Promise<V[]> {
        return new SelectRangePrompt(options).run();
    }

    static sortGrid(options: SortGridOptions): Promise<string[][]> {
        return new SortGridPrompt(options).run();
    }

    static terminal(options: TerminalOptions): Promise<string> {
        return new TerminalPrompt(options).run();
    }
}
