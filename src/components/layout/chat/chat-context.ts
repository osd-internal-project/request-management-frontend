/** What the AI assistant is told the user is looking at. */
export interface ChatContext {
  id: string;
  type: string;
  title: string;
  content: string;
}

/** `page` comes from the menu on every route; `record` from a detail page and wins over it. */
export type ChatContextLayer = "page" | "record";

interface LibreChatWidgetApi {
  setContext: (context: ChatContext) => void;
  clearContext: () => void;
}

let pageContext: ChatContext | null = null;
let recordContext: ChatContext | null = null;
let activeWidget: LibreChatWidgetApi | null = null;
let lastSentKey: string | null = null;

function isWidgetApi(value: unknown): value is LibreChatWidgetApi {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "setContext") === "function" &&
    typeof Reflect.get(value, "clearContext") === "function"
  );
}

function contextKey(context: ChatContext | null) {
  return context
    ? JSON.stringify([context.id, context.type, context.title, context.content])
    : "";
}

function push() {
  const widget = activeWidget;
  // Not loaded yet (chat never opened): the value waits here until `attachChatWidget`.
  if (!widget) return;

  const context = recordContext ?? pageContext;
  const key = contextKey(context);
  if (key === lastSentKey) return;

  try {
    if (context) widget.setContext(context);
    else widget.clearContext();
    lastSentKey = key;
  } catch (error) {
    console.warn("[chat] could not update the assistant context", error);
  }
}

/** Tells the AI assistant what the user is looking at; safe to call before the chat is opened. */
export function updateChatContext(
  context: ChatContext,
  layer: ChatContextLayer = "record",
) {
  if (layer === "page") pageContext = context;
  else recordContext = context;
  push();
}

/** Forgets one layer, or both when none is given (logout, account change). */
export function clearChatContext(layer?: ChatContextLayer) {
  if (layer !== "record") pageContext = null;
  if (layer !== "page") recordContext = null;
  push();
}

/** The widget instance the user sees; sends whatever was set while it was loading. */
export function attachChatWidget(widget: unknown) {
  activeWidget = isWidgetApi(widget) ? widget : null;
  lastSentKey = null;
  push();
}

export function detachChatWidget(widget: unknown) {
  if (activeWidget === widget) activeWidget = null;
}
