import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TreeSelectOptions, TreeSelectNode, MouseEvent } from '../types';

interface FlatNode<V> {
    node: TreeSelectNode<V>;
    depth: number;
    parent: TreeSelectNode<V> | null;
}

export class TreeSelectPrompt<V> extends Prompt<V[], TreeSelectOptions<V>> {
    private cursor: number = 0;
    private expandedNodes: Set<TreeSelectNode<V>> = new Set();
    private flatList: FlatNode<V>[] = [];
    private scrollTop: number = 0;
    private readonly pageSize: number = 15;
    private parentMap: Map<TreeSelectNode<V>, TreeSelectNode<V>> = new Map();

    private readonly ICON_CLOSED = symbols.pointer === '>' ? '+' : '▸';
    private readonly ICON_OPEN = symbols.pointer === '>' ? '-' : '▾';
    
    constructor(options: TreeSelectOptions<V>) {
        super(options);
        this.buildParentMap(this.options.data, null);
        this.initializeExpanded(this.options.data);
        
        if (this.options.initial) {
             const initialSet = new Set(this.options.initial);
             this.initializeSelection(this.options.data, initialSet);
             this.recalculateAllParents(this.options.data);
        }
        
        this.recalculateFlatList();
    }
    
    private buildParentMap(nodes: TreeSelectNode<V>[], parent: TreeSelectNode<V> | null) {
        for (const node of nodes) {
            if (parent) this.parentMap.set(node, parent);
            if (node.children) {
                this.buildParentMap(node.children, node);
            }
        }
    }
    
    private initializeExpanded(nodes: TreeSelectNode<V>[]) {
        for (const node of nodes) {
            if (node.expanded) {
                this.expandedNodes.add(node);
            }
            if (node.children) {
                this.initializeExpanded(node.children);
            }
        }
    }
    
    private initializeSelection(nodes: TreeSelectNode<V>[], initialValues: Set<V>) {
        for (const node of nodes) {
            if (initialValues.has(node.value)) {
                this.setNodeState(node, true, false); 
            }
            if (node.children) {
                this.initializeSelection(node.children, initialValues);
            }
        }
    }

    private recalculateAllParents(nodes: TreeSelectNode<V>[]) {
        for (const node of nodes) {
             if (node.children) {
                 this.recalculateAllParents(node.children);
                 this.updateNodeStateFromChildren(node);
             }
        }
    }

    private updateNodeStateFromChildren(node: TreeSelectNode<V>) {
        if (!node.children || node.children.length === 0) return;
        
        const allChecked = node.children.every(c => c.selected === true);
        const allUnchecked = node.children.every(c => !c.selected); 
        
        if (allChecked) {
            node.selected = true;
        } else if (allUnchecked) {
            node.selected = false;
        } else {
            node.selected = 'indeterminate';
        }
    }

    private setNodeState(node: TreeSelectNode<V>, state: boolean, updateParents: boolean = true) {
        node.selected = state;
        
        if (node.children) {
            node.children.forEach(c => this.setNodeState(c, state, false));
        }
        
        if (updateParents) {
            let curr = node;
            while (this.parentMap.has(curr)) {
                const parent = this.parentMap.get(curr)!;
                this.updateNodeStateFromChildren(parent);
                curr = parent;
            }
        }
    }
    
    private recalculateFlatList() {
        this.flatList = [];
        this.traverse(this.options.data, 0, null);
        if (this.cursor >= this.flatList.length) {
            this.cursor = Math.max(0, this.flatList.length - 1);
        }
    }

    private traverse(nodes: TreeSelectNode<V>[], depth: number, parent: TreeSelectNode<V> | null) {
        for (const node of nodes) {
            this.flatList.push({ node, depth, parent });
            if (node.children && node.children.length > 0 && this.expandedNodes.has(node)) {
                this.traverse(node.children, depth + 1, node);
            }
        }
    }

    private toggleRecursive(node: TreeSelectNode<V>, expand: boolean) {
        if (expand) this.expandedNodes.add(node);
        else this.expandedNodes.delete(node);

        if (node.children) {
            node.children.forEach(child => this.toggleRecursive(child, expand));
        }
    }

    protected render(firstRender: boolean) {
        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        if (this.flatList.length === 0) {
            output += `  ${theme.muted}No data${ANSI.RESET}`;
            this.renderFrame(output);
            return;
        }

        if (this.cursor < this.scrollTop) {
            this.scrollTop = this.cursor;
        } else if (this.cursor >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.cursor - this.pageSize + 1;
        }

        const visible = this.flatList.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visible.forEach((item, index) => {
            const actualIndex = this.scrollTop + index;
            const isSelected = actualIndex === this.cursor;
            
            const indentSize = this.options.indent || 2;
            const indentation = ' '.repeat(item.depth * indentSize);

            let linePrefix = isSelected ? `${theme.main}${symbols.pointer} ` : '  ';

            let folderIcon = '  '; 
            const hasChildren = item.node.children && item.node.children.length > 0;
            if (hasChildren) {
                folderIcon = this.expandedNodes.has(item.node) ? `${this.ICON_OPEN} ` : `${this.ICON_CLOSED} `;
            }
            
            // Checkbox
            let checkIcon = `[ ]`;
            if (item.node.selected === true) {
                checkIcon = `${theme.success}[x]${ANSI.RESET}`;
            } else if (item.node.selected === 'indeterminate') {
                checkIcon = `${ANSI.FG_YELLOW}[-]${ANSI.RESET}`;
            } else {
                checkIcon = `${theme.muted}[ ]${ANSI.RESET}`;
            }

            let title = item.node.title;
            if (item.node.disabled) {
                title = `${theme.muted}${title} (disabled)${ANSI.RESET}`;
            }

            let line = `${indentation}${folderIcon}${checkIcon} ${title}`;
            if (isSelected) {
                line = `${theme.main}${line}${ANSI.RESET}`;
            }

            output += linePrefix + line;
            if (index < visible.length - 1) output += '\n';
        });
        
        output += `\n${theme.muted}(e: Expand All, c: Collapse All, Space: Toggle)${ANSI.RESET}`;

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.flatList.length === 0) return;

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

        const currentItem = this.flatList[this.cursor];
        const node = currentItem.node;
        const hasChildren = node.children && node.children.length > 0;

        // Recursive Expand (e)
        if (char === 'e' && hasChildren) {
            this.toggleRecursive(node, true);
            this.recalculateFlatList();
            this.render(false);
            return;
        }

        // Recursive Collapse (c)
        if (char === 'c' && hasChildren) {
            this.toggleRecursive(node, false);
            this.recalculateFlatList();
            this.render(false);
            return;
        }

        // Right/Left
        if (this.isRight(char)) {
            if (hasChildren) {
                if (!this.expandedNodes.has(node)) {
                    this.expandedNodes.add(node);
                    this.recalculateFlatList();
                } else if (this.cursor + 1 < this.flatList.length) {
                    this.cursor++;
                }
                this.render(false);
                return;
            }
        }
        if (this.isLeft(char)) {
            if (hasChildren && this.expandedNodes.has(node)) {
                this.expandedNodes.delete(node);
                this.recalculateFlatList();
                this.render(false);
                return;
            } else if (currentItem.parent) {
                const parentIndex = this.flatList.findIndex(x => x.node === currentItem.parent);
                if (parentIndex !== -1) {
                    this.cursor = parentIndex;
                    this.render(false);
                    return;
                }
            }
        }

        // Toggle (Space)
        if (char === ' ') {
            if (!node.disabled) {
                const newState = node.selected === true ? false : true; 
                this.setNodeState(node, newState);
                this.render(false);
            }
            return;
        }

        // Submit (Enter)
        if (char === '\r' || char === '\n') {
            const selectedValues: V[] = [];
            this.collectSelected(this.options.data, selectedValues);
            this.submit(selectedValues);
        }
    }
    
    private collectSelected(nodes: TreeSelectNode<V>[], result: V[]) {
        for (const node of nodes) {
            if (node.selected === true) {
                result.push(node.value);
            }
            if (node.children) {
                this.collectSelected(node.children, result);
            }
        }
    }
    
    protected handleMouse(event: MouseEvent) {
        if (event.action === 'scroll') {
             if (event.scroll === 'up') {
                 this.cursor = (this.cursor - 1 + this.flatList.length) % this.flatList.length;
                 this.render(false);
            } else if (event.scroll === 'down') {
                 this.cursor = (this.cursor + 1) % this.flatList.length;
                 this.render(false);
            }
        }
    }
}
