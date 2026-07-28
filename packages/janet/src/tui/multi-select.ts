import {
  getKeybindings,
  matchesKey,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import type {
  Component,
  SelectItem,
  SelectListTheme,
} from "@earendil-works/pi-tui";

/**
 * Minimal checkbox picker that follows pi-tui's SelectList keybindings and
 * visual language. pi-tui does not currently ship a multi-select component.
 */
export class MultiSelectList implements Component {
  private selectedIndex = 0;
  private readonly selectedValues: Set<string>;

  onConfirm?: (items: SelectItem[]) => void;
  onCancel?: () => void;

  constructor(
    private readonly items: SelectItem[],
    private readonly maxVisible: number,
    private readonly theme: SelectListTheme,
    initiallySelected: ReadonlyArray<string> = [],
  ) {
    this.selectedValues = new Set(initiallySelected);
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(index, this.items.length - 1));
  }

  getSelectedItems(): SelectItem[] {
    return this.items.filter((item) => this.selectedValues.has(item.value));
  }

  invalidate(): void {
    // No cached rendering state.
  }

  render(width: number): string[] {
    if (!this.items.length) {
      return [this.theme.noMatch("  No options")];
    }

    const startIndex = Math.max(
      0,
      Math.min(
        this.selectedIndex - Math.floor(this.maxVisible / 2),
        this.items.length - this.maxVisible,
      ),
    );
    const endIndex = Math.min(
      startIndex + Math.max(1, this.maxVisible),
      this.items.length,
    );
    const lines = this.items
      .slice(startIndex, endIndex)
      .map((item, offset) =>
        this.renderItem(item, startIndex + offset === this.selectedIndex, width),
      );

    if (startIndex > 0 || endIndex < this.items.length) {
      lines.push(
        this.theme.scrollInfo(
          truncateToWidth(
            `  (${this.selectedIndex + 1}/${this.items.length})`,
            Math.max(1, width - 2),
            "",
          ),
        ),
      );
    }
    return lines;
  }

  handleInput(keyData: string): void {
    const keybindings = getKeybindings();
    if (!this.items.length) {
      if (keybindings.matches(keyData, "tui.select.cancel")) this.onCancel?.();
      return;
    }

    if (keybindings.matches(keyData, "tui.select.up")) {
      this.selectedIndex =
        this.selectedIndex === 0 ? this.items.length - 1 : this.selectedIndex - 1;
    } else if (keybindings.matches(keyData, "tui.select.down")) {
      this.selectedIndex =
        this.selectedIndex === this.items.length - 1 ? 0 : this.selectedIndex + 1;
    } else if (keybindings.matches(keyData, "tui.select.pageUp")) {
      this.selectedIndex = Math.max(0, this.selectedIndex - this.maxVisible);
    } else if (keybindings.matches(keyData, "tui.select.pageDown")) {
      this.selectedIndex = Math.min(
        this.items.length - 1,
        this.selectedIndex + this.maxVisible,
      );
    } else if (matchesKey(keyData, "space")) {
      const item = this.items[this.selectedIndex]!;
      if (this.selectedValues.has(item.value)) {
        this.selectedValues.delete(item.value);
      } else {
        this.selectedValues.add(item.value);
      }
    } else if (keybindings.matches(keyData, "tui.select.confirm")) {
      this.onConfirm?.(this.getSelectedItems());
    } else if (keybindings.matches(keyData, "tui.select.cancel")) {
      this.onCancel?.();
    }
  }

  private renderItem(item: SelectItem, isActive: boolean, width: number): string {
    const checked = this.selectedValues.has(item.value);
    const prefix = isActive ? "→ " : "  ";
    const checkbox = checked ? "[x]" : "[ ]";
    const maxWidth = Math.max(1, width - 2);
    const primary = truncateToWidth(
      `${prefix}${checkbox} ${item.label || item.value}`,
      maxWidth,
      "",
    );

    let plain = primary;
    if (item.description && width > 40) {
      const remaining = maxWidth - visibleWidth(primary) - 2;
      if (remaining > 10) {
        plain += `  ${truncateToWidth(
          item.description.replace(/[\r\n]+/g, " ").trim(),
          remaining,
          "",
        )}`;
      }
    }

    if (isActive) return this.theme.selectedText(plain);
    if (!checked) return plain;

    const markStart = prefix.length;
    return (
      plain.slice(0, markStart) +
      this.theme.selectedPrefix(checkbox) +
      plain.slice(markStart + checkbox.length)
    );
  }
}
