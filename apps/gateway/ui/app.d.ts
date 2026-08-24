/**
 * Typed boundary for the pure attention predicates exported by the browser
 * bundle. Runtime code remains in app.js; this sibling declaration lets
 * Workbench tests consume the stable browser entrypoint without suppressing
 * the module check.
 */
export function classifyWorkbenchAttention<T>(
  items: readonly T[],
): {
  readonly principal: T[];
  readonly system: T[];
};

export function isPrincipalNeedsYouWorkItem(item: unknown): boolean;

// The browser bundle is the source of these pure test seams. Keep this
// declaration narrow at the module boundary; runtime behavior remains in the
// generated JavaScript bundle.
export const classifyAgentResponsibility: (...args: any[]) => any;
export const isAgentEligibleWorkItem: (...args: any[]) => any;
export const isExactLiveAgentWork: (...args: any[]) => any;
export const isOrphanedAgentWorkItem: (...args: any[]) => any;
export const isPendingAgentWork: (...args: any[]) => any;
export const parsePrincipalLocus: (...args: any[]) => any;
export const principalLocusHref: (...args: any[]) => any;
export const hasPrincipalLocusRequest: (...args: any[]) => any;
export const persistablePrincipalWorkItemIdentifier: (...args: any[]) => any;
export const resolvePrincipalLocus: (...args: any[]) => any;
export const restoredPrincipalLocusState: (...args: any[]) => any;
export const buildConversationSocketUrl: (...args: any[]) => any;
export const classifyConversationEvent: (...args: any[]) => any;
export const conversationComposerStanding: (...args: any[]) => any;
export const conversationMessageSubmitFrame: (...args: any[]) => any;
export const conversationResponseInterruptFrame: (...args: any[]) => any;
export const conversationWorkControlFrame: (...args: any[]) => any;
export const CONVERSATION_TURN_TERMINAL_EVENTS: ReadonlySet<string>;
export const parseConversationServerFrame: (...args: any[]) => any;
export const renderConversationMarkdown: (...args: any[]) => any;
export const reduceDurableEvents: (...args: any[]) => any;
export const taskEvidenceLinkTarget: (...args: any[]) => any;
export const taskLocatorSearchText: (...args: any[]) => any;
export const workItemMatchesTaskLocator: (...args: any[]) => any;
export const taskLocatorOptions: (...args: any[]) => any;
export const taskLocatorSourceStanding: (...args: any[]) => any;
export const taskLocatorEmptySummary: (...args: any[]) => any;
