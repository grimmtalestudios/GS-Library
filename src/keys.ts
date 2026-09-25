// Core's keybindings pan the canvas on the arrow keys
export function consumeKey(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
}
