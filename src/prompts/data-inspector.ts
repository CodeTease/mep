import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { DataInspectorOptions, MouseEvent } from '../types';
import { stripAnsi } from '../utils';
import { symbols } from '../symbols';

interface InspectorNode {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'date' | 'function';
    depth: number;
    path: string; // Unique ID for expansion
    parentRef: any; // Reference to parent object/array for mutation
    refKey: string | number; // Key in parent
    isLeaf: boolean;
}

export class DataInspectorPrompt extends Prompt<any, DataInspectorOptions> {
    private cursor: number = 0;
    private flatList: InspectorNode[] = [];
    private expandedPaths: Set<string> = new Set();
    private scrollTop: number = 0;
    private readonly pageSize: number = 15;

    // Edit Mode State
    private editMode: boolean = false;
    private editBuffer: string = '';

    // Config
    private rootData: any;

    constructor(options: DataInspectorOptions) {
        super(options);
        this.rootData = options.data; // We mutate this directly
        this.expandedPaths.add('root'); // Always expand root if it's an object
        this.recalculateFlatList();
    }

    private getType(value: any): InspectorNode['type'] {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Date) return 'date';
        return typeof value as InspectorNode['type'];
    }

    private recalculateFlatList() {
        this.flatList = [];
        this.traverse(this.rootData, 'root', 0, null, 'root');
    }

    private traverse(data: any, key: string | number, depth: number, parentRef: any, currentPath: string) {
        const type = this.getType(data);
        const isLeaf = !['object', 'array'].includes(type) || data === null;

        const node: InspectorNode = {
            key: String(key),
            value: data,
            type,
            depth,
            path: currentPath,
            parentRef,
            refKey: key,
            isLeaf
        };

        this.flatList.push(node);

        if (!isLeaf && this.expandedPaths.has(currentPath)) {
            const keys = Object.keys(data);
            keys.forEach(k => {
                this.traverse(data[k], k, depth + 1, data, `${currentPath}.${k}`);
            });
        }
    }

    private getValueColor(type: string): string {
        switch (type) {
            case 'string': return ANSI.FG_GREEN;
            case 'number': return ANSI.FG_YELLOW;
            case 'boolean': return ANSI.FG_MAGENTA;
            case 'null':
            case 'undefined': return ANSI.FG_GRAY;
            case 'date': return ANSI.FG_BLUE;
            default: return ANSI.RESET;
        }
    }

    private formatValue(value: any, type: string): string {
        if (type === 'string') return `"${value}"`;
        if (type === 'date') return value.toISOString();
        if (type === 'array') return `Array(${value.length})`;
        if (type === 'object') return `Object{${Object.keys(value).length}}`;
        return String(value);
    }

    protected render(_firstRender: boolean) {
        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        if (this.cursor < this.scrollTop) {
            this.scrollTop = this.cursor;
        } else if (this.cursor >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.cursor - this.pageSize + 1;
        }

        const visible = this.flatList.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visible.forEach((node, index) => {
            const actualIndex = this.scrollTop + index;
            const isSelected = actualIndex === this.cursor;

            // Indentation & Tree Lines
            const indent = '  '.repeat(node.depth);
            const prefix = isSelected ? `${theme.main}${symbols.pointer} ` : '  ';

            // Icon
            let icon = '';
            if (!node.isLeaf) {
                icon = this.expandedPaths.has(node.path) ? '▾ ' : '▸ ';
            } else {
                icon = '• '; // Leaf
            }

            // Key
            let keyStr = node.key;
            if (node.path === 'root') keyStr = 'ROOT';

            // Value Representation
            let valueStr = '';

            if (isSelected && this.editMode) {
                // Editing View
                valueStr = `${ANSI.BG_BLUE}${ANSI.FG_WHITE} ${this.editBuffer}_ ${ANSI.RESET}`;
            } else {
                // Normal View
                const color = this.getValueColor(node.type);
                const formatted = this.formatValue(node.value, node.type);
                valueStr = `${color}${formatted}${ANSI.RESET}`;
            }

            // Type Label (Right aligned or just dimmed next to key)
            const typeLabel = `${ANSI.FG_GRAY}(${node.type})${ANSI.RESET}`;

            let line = `${indent}${icon}${ANSI.BOLD}${keyStr}${ANSI.RESET}: ${valueStr} ${typeLabel}`;

            if (isSelected && !this.editMode) {
                line = `${theme.main}${stripAnsi(line)}${ANSI.RESET}`; // Highlight whole line
            } else if (isSelected && this.editMode) {
                // In edit mode, we don't highlight the whole line, just the input box
                line = `${indent}${icon}${ANSI.BOLD}${keyStr}${ANSI.RESET}: ${valueStr} ${typeLabel}`;
            }

            output += `${prefix}${line}\n`;
        });

        // Footer
        if (this.editMode) {
            output += `\n${theme.main}EDIT MODE${ANSI.RESET} Enter: Save, Esc: Cancel`;
        } else {
            output += `\n${theme.muted}(Arrows: Nav, Space: Toggle, Enter: Edit/Submit)${ANSI.RESET}`;
        }

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.editMode) {
            this.handleEditInput(char, key);
            return;
        }

        const node = this.flatList[this.cursor];

        if (this.isUp(char)) {
            this.cursor = (this.cursor - 1 + this.flatList.length) % this.flatList.length;
            this.render(false);
            return;
        }
        if (this.isDown(char)) {
            this.cursor = (this.cursor + 1) % this.flatList.length;
            this.render(false);
            return;
        }

        // Expand/Collapse
        if (char === ' ' || this.isRight(char) || this.isLeft(char)) {
            if (!node.isLeaf) {
                const isExpanded = this.expandedPaths.has(node.path);

                if (this.isRight(char) && !isExpanded) {
                    this.expandedPaths.add(node.path);
                } else if (this.isLeft(char) && isExpanded) {
                    this.expandedPaths.delete(node.path);
                } else if (char === ' ') {
                    if (isExpanded) this.expandedPaths.delete(node.path);
                    else this.expandedPaths.add(node.path);
                } else if (this.isLeft(char) && !isExpanded && node.parentRef) {
                    // Jump to parent
                    // This requires finding parent index, but simplification: just do nothing or standard logic
                }

                this.recalculateFlatList();
                this.render(false);
            }
            return;
        }

        // Enter: Edit or Submit
        if (char === '\r' || char === '\n') {
            if (node.path === 'root') {
                this.submit(this.rootData);
                return;
            }

            // Toggle Boolean immediately
            if (node.type === 'boolean') {
                const newVal = !node.value;
                node.parentRef[node.refKey] = newVal;
                this.recalculateFlatList(); // Value changed
                this.render(false);
                return;
            }

            // Enter Edit Mode for String/Number
            if (['string', 'number'].includes(node.type)) {
                this.editMode = true;
                this.editBuffer = String(node.value);
                this.render(false);
                return;
            }

            this.submit(this.rootData);
        }
    }

    private handleEditInput(char: string, key: Buffer) {
        const node = this.flatList[this.cursor];

        // Enter: Save
        if (char === '\r' || char === '\n') {
            let newValue: any = this.editBuffer;
            if (node.type === 'number') {
                newValue = Number(this.editBuffer);
                if (isNaN(newValue)) newValue = 0; // Fallback
            }

            // Update Data
            node.parentRef[node.refKey] = newValue;

            this.editMode = false;
            this.recalculateFlatList();
            this.render(false);
            return;
        }

        // Esc: Cancel
        if (key[0] === 27 && key.length === 1) { // Standard ESC
            this.editMode = false;
            this.render(false);
            return;
        }

        // Backspace
        if (key.toString() === '\x7f' || char === '\b') {
            this.editBuffer = this.editBuffer.slice(0, -1);
            this.render(false);
            return;
        }

        // Typing
        if (char && char.length === 1 && char.charCodeAt(0) >= 32) {
            this.editBuffer += char;
            this.render(false);
        }
    }

    protected handleMouse(event: MouseEvent) {
        if (this.editMode) return; // Disable scroll in edit mode for now

        if (event.action === 'scroll') {
            if (event.scroll === 'up') {
                this.cursor = (this.cursor - 1 + this.flatList.length) % this.flatList.length;
            } else if (event.scroll === 'down') {
                this.cursor = (this.cursor + 1) % this.flatList.length;
            }
            this.render(false);
        }
    }
}
