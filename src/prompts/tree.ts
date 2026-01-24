import { ANSI } from '../ansi';
import { Prompt } from '../base';
import { theme } from '../theme';
import { symbols } from '../symbols';
import { TreeOptions, TreeNode, MouseEvent } from '../types';

interface FlatNode<V> {
    node: TreeNode<V>;
    depth: number;
    parent: TreeNode<V> | null;
}

export class TreePrompt<V> extends Prompt<V, TreeOptions<V>> {
    private cursor: number = 0;
    private expandedNodes: Set<TreeNode<V>> = new Set();
    private flatList: FlatNode<V>[] = [];
    private scrollTop: number = 0;
    private readonly pageSize: number = 15;

    // Icons
    private readonly ICON_CLOSED = symbols.pointer === '>' ? '+' : '▸';
    private readonly ICON_OPEN = symbols.pointer === '>' ? '-' : '▾';
    private readonly ICON_LEAF = symbols.pointer === '>' ? ' ' : ' '; // No specific icon for leaf, just indentation

    constructor(options: TreeOptions<V>) {
        super(options);
        this.initializeExpanded(this.options.data);

        // Handle initial value
        if (this.options.initial !== undefined) {
            this.expandPathTo(this.options.initial);
        }

        this.recalculateFlatList();
        
        if (this.options.initial !== undefined) {
            const index = this.flatList.findIndex(item => item.node.value === this.options.initial);
            if (index !== -1) {
                this.cursor = index;
            }
        }
    }

    private expandPathTo(value: V) {
        const find = (nodes: TreeNode<V>[]): boolean => {
            for (const node of nodes) {
                if (node.value === value) return true;
                if (node.children) {
                    if (find(node.children)) {
                        this.expandedNodes.add(node);
                        return true;
                    }
                }
            }
            return false;
        };
        find(this.options.data);
    }

    private initializeExpanded(nodes: TreeNode<V>[]) {
        for (const node of nodes) {
            if (node.expanded) {
                this.expandedNodes.add(node);
            }
            if (node.children) {
                this.initializeExpanded(node.children);
            }
        }
    }

    private recalculateFlatList() {
        this.flatList = [];
        this.traverse(this.options.data, 0, null);
        
        // Adjust cursor if it went out of bounds (e.g. collapsing a folder above cursor)
        if (this.cursor >= this.flatList.length) {
            this.cursor = Math.max(0, this.flatList.length - 1);
        }
    }

    private traverse(nodes: TreeNode<V>[], depth: number, parent: TreeNode<V> | null) {
        for (const node of nodes) {
            this.flatList.push({
                node,
                depth,
                parent
            });
            
            if (node.children && node.children.length > 0 && this.expandedNodes.has(node)) {
                this.traverse(node.children, depth + 1, node);
            }
        }
    }

    protected render(firstRender: boolean) {
        let output = `${theme.success}?${ANSI.RESET} ${ANSI.BOLD}${theme.title}${this.options.message}${ANSI.RESET}\n`;

        if (this.flatList.length === 0) {
            output += `  ${theme.muted}No data${ANSI.RESET}`;
            this.renderFrame(output);
            return;
        }

        // Adjust Scroll
        if (this.cursor < this.scrollTop) {
            this.scrollTop = this.cursor;
        } else if (this.cursor >= this.scrollTop + this.pageSize) {
            this.scrollTop = this.cursor - this.pageSize + 1;
        }

        const visible = this.flatList.slice(this.scrollTop, this.scrollTop + this.pageSize);

        visible.forEach((item, index) => {
            const actualIndex = this.scrollTop + index;
            const isSelected = actualIndex === this.cursor;
            
            // Indentation
            const indentSize = this.options.indent || 2;
            const indentation = ' '.repeat(item.depth * indentSize);

            // Pointer
            let linePrefix = '';
            if (isSelected) {
                linePrefix = `${theme.main}${symbols.pointer} `;
            } else {
                linePrefix = '  ';
            }

            // Folder Icon
            let icon = '  '; // Default 2 spaces for alignment
            const hasChildren = item.node.children && item.node.children.length > 0;
            
            if (hasChildren) {
                if (this.expandedNodes.has(item.node)) {
                    icon = `${this.ICON_OPEN} `;
                } else {
                    icon = `${this.ICON_CLOSED} `;
                }
            }

            // Title
            let title = item.node.title;
            if (item.node.disabled) {
                title = `${theme.muted}${title} (disabled)${ANSI.RESET}`;
            }

            // Compose line
            let line = `${indentation}${icon}${title}`;
            if (isSelected) {
                line = `${theme.main}${line}${ANSI.RESET}`;
            }

            output += linePrefix + line;
            if (index < visible.length - 1) output += '\n';
        });

        this.renderFrame(output);
    }

    protected handleInput(char: string, key: Buffer) {
        if (this.flatList.length === 0) return;

        // Navigation
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

        // Right: Expand or Go Down
        if (this.isRight(char)) {
            if (hasChildren) {
                if (!this.expandedNodes.has(node)) {
                    this.expandedNodes.add(node);
                    this.recalculateFlatList();
                } else {
                    // Go to first child (next item in flat list)
                    if (this.cursor + 1 < this.flatList.length) {
                        this.cursor++;
                    }
                }
                this.render(false);
                return;
            }
        }

        // Left: Collapse or Go Up (Parent)
        if (this.isLeft(char)) {
            if (hasChildren && this.expandedNodes.has(node)) {
                this.expandedNodes.delete(node);
                this.recalculateFlatList();
                this.render(false);
                return;
            } else {
                // Go to parent
                if (currentItem.parent) {
                    const parentIndex = this.flatList.findIndex(x => x.node === currentItem.parent);
                    if (parentIndex !== -1) {
                        this.cursor = parentIndex;
                        this.render(false);
                        return;
                    }
                }
            }
        }

        // Toggle (Space)
        if (char === ' ') {
            if (hasChildren) {
                if (this.expandedNodes.has(node)) {
                    this.expandedNodes.delete(node);
                } else {
                    this.expandedNodes.add(node);
                }
                this.recalculateFlatList();
                this.render(false);
            }
            return;
        }

        // Submit (Enter)
        if (char === '\r' || char === '\n') {
            if (!node.disabled) {
                this.submit(node.value);
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
