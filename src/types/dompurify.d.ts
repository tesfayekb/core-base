
declare module 'dompurify' {
  interface DOMPurifyI {
    sanitize(dirty: string | Node, config?: Config): string;
    sanitize(dirty: string | Node, config: Config & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM?: false }): string;
    sanitize(dirty: string | Node, config: Config & { RETURN_DOM_FRAGMENT: true }): DocumentFragment;
    sanitize(dirty: string | Node, config: Config & { RETURN_DOM: true }): HTMLElement;
    setConfig(cfg: Config): void;
    clearConfig(): void;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
    addHook(entryPoint: string, hookFunction: (currentNode?: Element, data?: any) => any): void;
    removeHook(entryPoint: string): void;
    removeHooks(entryPoint: string): void;
    removeAllHooks(): void;
  }

  interface Config {
    ALLOWED_TAGS?: string[] | false;
    ALLOWED_ATTR?: string[] | false;
    ALLOW_DATA_ATTR?: boolean;
    FORBID_TAGS?: string[];
    FORBID_ATTR?: string[];
    ALLOW_UNKNOWN_PROTOCOLS?: boolean;
    WHOLE_DOCUMENT?: boolean;
    RETURN_DOM?: boolean;
    RETURN_DOM_FRAGMENT?: boolean;
    RETURN_TRUSTED_TYPE?: boolean;
    SANITIZE_DOM?: boolean;
    KEEP_CONTENT?: boolean;
    IN_PLACE?: boolean;
    USE_PROFILES?: false | { [key: string]: any };
    NAMESPACE?: string;
  }

  const DOMPurify: DOMPurifyI;
  export = DOMPurify;
}
