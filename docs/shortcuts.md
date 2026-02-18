# Keyboard & Mouse Support

MepCLI automatically detects modern terminals and enables **Mouse Tracking** (using SGR 1006 protocol) for scrolling and clicking.

## Advanced Shortcuts

<details>
<summary><b>Calendar Prompt</b></summary>

Mep's Calendar prompt supports advanced navigation and selection shortcuts for power users.

*   **Keyboard:**
    *   `Arrow Keys`: Move cursor day by day.
    *   `PageUp` / `PageDown`: Jump to previous/next **Month**.
    *   `Ctrl + Up` / `Ctrl + Down`: Jump to previous/next **Year**.
    *   `Home` / `End`: Jump to the first/last day of the current month.
    *   `t`: Jump immediately to **Today**.
    *   `Enter`: Select date (or start/end of range).

*   **Mouse:**
    *   `Scroll`: Navigate **Months**.
    *   `Ctrl + Scroll`: Adjust the selected **Day** (cursor movement).

</details>

<details>
<summary><b>Color Prompt</b></summary>

*   **Keyboard:**
    *   `Tab`: Switch between RGB channels.
    *   `Up` / `Down`: Move between channels.
    *   `Left` / `Right`: Adjust current channel value.
    *   `Shift + Left` / `Shift + Right`: Fast adjust current channel value.

*   **Mouse:**
    *   `Scroll`: Adjust the current channel value.
    *   `Ctrl + Scroll`: Fast adjust.

</details>

<details>
<summary><b>Checkbox Prompt</b></summary>

*   **Keyboard:**
    *   `Space`: Toggle selection.
    *   `a`: Select **All**.
    *   `x` / `n`: Select **None**.
    *   `i`: **Invert** selection.

</details>

<details>
<summary><b>MultiSelect Prompt</b></summary>

*   **Keyboard:**
    *   `Space`: Toggle selection.
    *   `Ctrl + A`: Select **All** (Visible).
    *   `Ctrl + X`: Deselect **All** (Visible).
    *   `Typing`: Filter list.

</details>

<details>
<summary><b>Transfer Prompt</b></summary>

*   **Keyboard:**
    *   `Tab` / `Left` / `Right`: Switch focus between Source and Target.
    *   `Space`: Move selected item.
    *   `a` / `>`: Move **All** to Target.
    *   `r` / `<`: Move **All** to Source (Reset).

</details>

<details>
<summary><b>Tree & TreeSelect Prompt</b></summary>

*   **Keyboard:**
    *   `Right`: Expand folder or jump to child.
    *   `Left`: Collapse folder or jump to parent.
    *   `Space`: Toggle expansion (Tree) or Checkbox (TreeSelect).
    *   `e`: **Expand** all recursively.
    *   `c`: **Collapse** all recursively.

</details>

<details>
<summary><b>Grid Prompt</b></summary>

The Grid prompt (Matrix selection) includes robust shortcuts for bulk actions.

*   **Keyboard:**
    *   `Arrow Keys`: Move cursor.
    *   `PageUp` / `PageDown`: Jump to the first/last **Row**.
    *   `Home` / `End`: Jump to the first/last **Column**.
    *   `Space`: Toggle current cell.
    *   `r`: Toggle entire **Row**.
    *   `c`: Toggle entire **Column**.
    *   `a`: Select **All**.
    *   `x`: Deselect **All** (None).
    *   `i`: **Invert** selection.

*   **Mouse:**
    *   `Scroll`: Vertical navigation (Rows).
    *   `Shift + Scroll`: Horizontal navigation (Columns).

</details>

<details>
<summary><b>Map Prompt</b></summary>

*   **Keyboard:**
    *   `Ctrl + N`: Add new row.
    *   `Ctrl + D`: Delete current row.
    *   `Arrows` / `Tab`: Navigate cells.

</details>

<details>
<summary><b>IP Prompt</b></summary>

*   **Keyboard:**
    *   `typing...`: Auto-jumps to next octet after 3 digits or `.`.
    *   `Backspace`: Navigates back to previous octet if empty.

</details>

<details>
<summary><b>Kanban Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate items/columns.
    *   `Space`: Grab/Drop item (Drag & Drop mode).
    *   `Enter`: Submit.

*   **Mouse:**
    *   `Scroll`: Navigate items (Normal) or Move item Left/Right (Grabbed).

</details>

<details>
<summary><b>Time Prompt</b></summary>

*   **Keyboard:**
    *   `Up` / `Down`: Adjust value.
    *   `Left` / `Right` / `Tab`: Switch unit (Hour/Minute/AM-PM).

*   **Mouse:**
    *   `Scroll`: Adjust value (Up/Down).

</details>

<details>
<summary><b>Heatmap Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate cells.
    *   `Tab` / `Shift+Tab`: Navigate cells (Horizontal).
    *   `Space`: Cycle value.
    *   `0-9`: Set value directly.

*   **Mouse:**
    *   `Scroll`: Navigate rows (Vertical).

</details>

<details>
<summary><b>Emoji Prompt & MultiColumnSelect</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate grid.
    *   `Typing`: Filter/Search (Emoji only).

</details>

<details>
<summary><b>Miller Prompt</b></summary>

*   **Keyboard:**
    *   `Up` / `Down`: Navigate items.
    *   `Right` / `Enter` / `Tab`: Expand child or Drill down.
    *   `Left` / `Shift + Tab`: Collapse or Go back.

</details>

<details>
<summary><b>Match Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate lists.
    *   `Tab`: Switch Source/Target.
    *   `Space`: Pick Source or Toggle Link.

</details>

<details>
<summary><b>Diff Prompt</b></summary>

*   **Keyboard:**
    *   `Left` / `Right`: Switch Action (Original / Modified / Edit).
    *   `Enter`: Submit selection.

</details>

<details>
<summary><b>Dial Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Adjust value (rotate knob).
    *   `Enter`: Submit.

*   **Mouse:**
    *   `Scroll`: Adjust value.

</details>

<details>
<summary><b>Draw Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Move cursor.
    *   `Space`: Toggle pixel.
    *   `c`: Clear canvas.
    *   `i`: Invert canvas.
    *   `Enter`: Submit.

*   **Mouse:**
    *   `Drag`: Paint (Left Click) or Erase (Right Click).
    *   `Click`: Toggle pixel.

</details>

<details>
<summary><b>Breadcrumb Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate list.
    *   `Enter`: Drill down into folder.
    *   `Backspace`: Go up one level.

*  **Mouse:**
    *   `Scroll`: Navigate list.

</details>

<details>
<summary><b>Schedule Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Move task in time.
    *   `Tab` / `Shift + Tab`: Switch between tasks.
    *   `Shift + Left/Right`: Resize task duration.
    *   `PageUp` / `PageDown`: Scroll timeline horizontally.

* **Mouse:**
    *   `Scroll`: Scroll timeline horizontally.

</details>

<details>
<summary><b>Data Inspector</b></summary>

*   **Keyboard:**
    *   `Space` / `Arrows`: Expand/Collapse nodes.
    *   `Enter`: Toggle Boolean or Edit String/Number.

*   **Mouse:**
    *   `Scroll`: Navigate tree.

</details>

<details>
<summary><b>Seat Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate seat grid.
    *   `Tab` / `Shift+Tab`: Navigate Left/Right.
    *   `Space`: Select/Deselect seat.

*   **Mouse:**
    *   `Scroll`: Navigate Up/Down.

</details>

<details>
<summary><b>Select Range Prompt & Multi Range Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows (Up/Down)`: Navigate items.
    *   `Space`: Set/Unset anchor point (drag start) or commit range (drag end).
    *   `Enter`: Submit selected range(s).

</details>

<details>
<summary><b>Breadcrumb Search Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate.
    *   `Typing`: Enter **Search Mode** (filters current folder).
    *   `Esc`: Exit Search Mode.
    *   `Enter`: Drill down (Folder) or Select (File).

</details>

<details>
<summary><b>Sort Grid Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate grid.
    *   `Tab` / `Shift+Tab`: Navigate Left/Right.
    *   `Space`: Grab/Drop item.
    *   `Enter`: Submit grid.

*   **Mouse:**
    *   `Scroll`: Navigate Up/Down.

</details>

<details>
<summary><b>Dependency Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows`: Navigate items.
    *   `Space`: Toggle item (Triggers auto-resolution).
    *   `Enter`: Submit selection.

*   **Mouse:**
    *   `Scroll`: Navigate Up/Down.

</details>

<details>
<summary><b>Box Prompt</b></summary>

*   **Keyboard:**
    *   `Arrows` / `Tab`: Navigate (Top -> Right -> Bottom -> Left).
    *   `Shift + Tab`: Navigate backwards.
    *   `+` / `-`: Increment/Decrement value.
    *   `0-9`: Type value directly.

*   **Mouse:**
    *   `Scroll`: Cycle focus (Up=Backwards, Down=Forwards).

</details>

<details>
<summary><b>Phone Prompt</b></summary>

*   **Keyboard:**
    *   `Tab`: Switch between **Country Code** and **Number** sections.
    *   `Typing` (in Country section): Fuzzy search for country (e.g., "Viet", "US").
    *   `Arrows (Up/Down)`: Cycle through countries.
    *   `Backspace`: Delete digit or clear search.

*   **Mouse:**
    *   `Scroll`: Cycle through countries (when Country section is active).

</details>

<details>
<summary><b>cURL Prompt</b></summary>

*   **Global:**
    *   `Tab` / `Shift+Tab`: Switch between **Method**, **URL**, **Headers**, and **Body** sections.
    *   `s`: Toggle Shell Output (Bash / PowerShell / CMD).

*   **Method Section:**
    *   `Arrows (Up/Down/Left/Right)` / `Space`: Cycle HTTP methods (GET, POST, etc.).
    *   `Enter`: Submit immediately.

*   **URL Section:**
    *   `Typing`: Enter URL.
    *   `Arrows (Left/Right)`: Move cursor.
    *   `Home` / `End`: Jump to start/end.
    *   `Ctrl + U`: Clear input.
    *   `Ctrl + W`: Delete word backwards.
    *   `Enter`: Submit immediately.

*   **Headers & Body Section:**
    *   `Enter`: Open editor (Map Editor for Headers, Code Editor for Body).

</details>
