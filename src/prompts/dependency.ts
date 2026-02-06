import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { DependencyOptions, MouseEvent } from '../types';

export class DependencyPrompt<V> extends Prompt<V[], DependencyOptions<V>> {
    private selectedIndex: number = 0;
    private checkedState: boolean[];
    private errorMsg: string = '';
    private warningMsg: string = '';

    // Pagination state
    private scrollTop: number = 0;
    private readonly pageSize: number = 10;

    constructor(options: DependencyOptions<V>) {
        super(options);
        // Initialize checked state from options (default selected)
        // We also need to run initial validation/resolution
        this.checkedState = options.choices.map(c => !!c.selected);

        if (options.autoResolve !== false) {
            // Run resolution for all initially selected items
            this.checkedState.forEach((isChecked, i) => {
                if (isChecked) {
                    this.resolveDependencies(i, true);
                }
            });
        }
    }

    private resolveDependencies(index: number, value: boolean) {
        // If autoResolve is false, we don't do anything automatically, 
        // validation will handle it on submit.
        if (this.options.autoResolve === false) return;

        const choices = this.options.choices;
        const visited = new Set<number>();
        const queue: { idx: number, val: boolean, reason?: string }[] = [];

        queue.push({ idx: index, val: value });

        // Process queue
        let loops = 0;
        while (queue.length > 0 && loops < 1000) { // Safety break
            loops++;
            const current = queue.shift()!;
            if (visited.has(current.idx)) continue;

            // Apply state
            // Only if it changes state
            if (this.checkedState[current.idx] !== current.val) {
                this.checkedState[current.idx] = current.val;
                if (current.reason) {
                    this.warningMsg = current.reason;
                }
            }
            visited.add(current.idx);

            const currentItem = choices[current.idx];

            if (current.val) {
                // Turning ON
                // 1. Check Conflicts (Disable items that THIS item conflicts with)
                if (currentItem.conflictsWith) {
                    currentItem.conflictsWith.forEach(conflictVal => {
                        const conflictIdx = choices.findIndex(c => c.value === conflictVal);
                        if (conflictIdx !== -1 && this.checkedState[conflictIdx]) {
                            queue.push({
                                idx: conflictIdx,
                                val: false,
                                reason: `Disabled ${choices[conflictIdx].title} due to conflict with ${currentItem.title}`
                            });
                        }
                    });
                }

                // [FIX] 1.5. Reverse Conflict Check (Disable items that conflict with THIS item)
                // Check if any currently SELECTED item has a conflict with the item we are enabling
                choices.forEach((other, otherIdx) => {
                    // Skip self and unchecked items
                    if (otherIdx === current.idx || !this.checkedState[otherIdx]) return;

                    if (other.conflictsWith && other.conflictsWith.includes(currentItem.value)) {
                        queue.push({
                            idx: otherIdx,
                            val: false,
                            reason: `Disabled ${other.title} because it conflicts with ${currentItem.title}`
                        });
                    }
                });
                // 2. Check Dependencies (Enable them)
                if (currentItem.dependsOn) {
                    currentItem.dependsOn.forEach(depVal => {
                        const depIdx = choices.findIndex(c => c.value === depVal);
                        if (depIdx !== -1 && !this.checkedState[depIdx]) {
                            queue.push({
                                idx: depIdx,
                                val: true,
                                reason: `Enabled ${choices[depIdx].title} because ${currentItem.title} requires it`
                            });
                        }
                    });
                }
                // 3. Check Triggers (Enable them)
                if (currentItem.triggers) {
                    currentItem.triggers.forEach(trigVal => {
                        const trigIdx = choices.findIndex(c => c.value === trigVal);
                        if (trigIdx !== -1 && !this.checkedState[trigIdx]) {
                            queue.push({
                                idx: trigIdx,
                                val: true,
                                reason: `Triggered ${choices[trigIdx].title} from ${currentItem.title}`
                            });
                        }
                    });
                }
            } else {
                // Turning OFF
                // Check if other ON items depend on this one. If so, disable them.
                choices.forEach((other, otherIdx) => {
                    if (this.checkedState[otherIdx] && other.dependsOn && other.dependsOn.includes(currentItem.value)) {
                        queue.push({
                            idx: otherIdx,
                            val: false,
                            reason: `Disabled ${other.title} because it depends on ${currentItem.title}`
                        });
                    }
                });
            }
        }
    }

    protected render(_firstRender: boolean) {
        // Adjust Scroll Top
        if (this.selectedIndex < this.scrollTop) {
            this.scrollTop = this.selectedIndex;
        } else if (this.selectedIndex >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.selectedIndex - this.pageSize + 1;
        }

        if (this.options.choices.length <= this.pageSize) {
            this.scrollTop = 0;
        }

        let output = '';

        // Header
        const icon = this.errorMsg ? `${theme.error}${symbols.cross}` : `${theme.success}?`;
        output += `${icon} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET} ${theme.muted}(Space: toggle, Enter: submit)${ANSI.RESET}`;

        // List
        const choices = this.options.choices;
        const visibleChoices = choices.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visibleChoices.forEach((choice, index) => {
            const actualIndex = this.scrollTop + index;
            output += '\n'; // New line for each item

            const cursor = actualIndex === this.selectedIndex ? `${theme.main}${symbols.pointer}${ANSI.RESET}` : ' ';
            const isChecked = this.checkedState[actualIndex];
            const checkbox = isChecked
                ? `${theme.success}${symbols.checked}${ANSI.RESET}`
                : `${theme.muted}${symbols.unchecked}${ANSI.RESET}`;

            let title = actualIndex === this.selectedIndex
                ? `${theme.main}${choice.title}${ANSI.RESET}`
                : choice.title;

            // Add tags for relationships
            if (choice.dependsOn && choice.dependsOn.length > 0) {
                title += ` ${theme.muted}[Req: ${choice.dependsOn.length}]${ANSI.RESET}`;
            }
            if (choice.conflictsWith && choice.conflictsWith.length > 0) {
                title += ` ${theme.error}[Con: ${choice.conflictsWith.length}]${ANSI.RESET}`;
            }

            output += `${cursor} ${checkbox} ${title}`;
        });

        if (this.errorMsg) {
            output += `\n${theme.error}>> ${this.errorMsg}${ANSI.RESET}`;
        } else if (this.warningMsg) {
            output += `\n${theme.main}>> ${this.warningMsg}${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
                this.render(false);
            } else if (event.scroll === 'down') {
                this.selectedIndex = this.selectedIndex < this.options.choices.length - 1 ? this.selectedIndex + 1 : 0;
                this.render(false);
            }
        }
    }

    protected handleInput(char: string) {
        if (char === '\r' || char === '\n') {
            // Final Validation
            const selectedCount = this.checkedState.filter(Boolean).length;
            const { min = 0, max } = this.options;

            if (selectedCount < min) {
                this.errorMsg = `You must select at least ${min} options.`;
                this.render(false);
                return;
            }
            if (max && selectedCount > max) {
                this.errorMsg = `You can only select up to ${max} options.`;
                this.render(false);
                return;
            }

            // Dependency Logic Check (if autoResolve was off, or double check)
            // Even if autoResolve is on, we check for cycles or invalid states that might have slipped? 
            // Or just check if manual toggle left things broken (if autoResolve is OFF).
            if (this.options.autoResolve === false) {
                const invalid = this.validateDependencies();
                if (invalid) {
                    this.errorMsg = invalid;
                    this.render(false);
                    return;
                }
            }

            this.cleanup();

            const results = this.options.choices
                .filter((_, i) => this.checkedState[i])
                .map(c => c.value);

            this.submit(results);
            return;
        }

        // Space Toggle
        if (char === ' ') {
            const currentChecked = this.checkedState[this.selectedIndex];
            // Toggle
            const newState = !currentChecked;

            // Check Max limit before enabling
            if (newState) {
                const selectedCount = this.checkedState.filter(Boolean).length;
                const { max } = this.options;
                if (max && selectedCount >= max) {
                    this.errorMsg = `Max ${max} selections allowed.`;
                    this.render(false);
                    return;
                }
            }

            this.errorMsg = '';
            this.warningMsg = '';

            if (this.options.autoResolve !== false) {
                this.resolveDependencies(this.selectedIndex, newState);
            } else {
                this.checkedState[this.selectedIndex] = newState;
            }

            this.render(false);
        }

        if (this.isUp(char)) { // Up
            this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : this.options.choices.length - 1;
            this.render(false);
        }
        if (this.isDown(char)) { // Down
            this.selectedIndex = this.selectedIndex < this.options.choices.length - 1 ? this.selectedIndex + 1 : 0;
            this.render(false);
        }
    }

    private validateDependencies(): string | null {
        const choices = this.options.choices;
        for (let i = 0; i < choices.length; i++) {
            if (!this.checkedState[i]) continue;

            const item = choices[i];

            // Check dependencies
            if (item.dependsOn) {
                for (const depVal of item.dependsOn) {
                    const depIdx = choices.findIndex(c => c.value === depVal);
                    if (depIdx === -1 || !this.checkedState[depIdx]) {
                        return `${item.title} requires ${depVal}`; // Should look up title for depVal ideally
                    }
                }
            }

            // Check conflicts
            if (item.conflictsWith) {
                for (const conVal of item.conflictsWith) {
                    const conIdx = choices.findIndex(c => c.value === conVal);
                    if (conIdx !== -1 && this.checkedState[conIdx]) {
                        return `${item.title} conflicts with ${choices[conIdx].title}`;
                    }
                }
            }
        }
        return null;
    }
}
