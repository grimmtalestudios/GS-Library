declare namespace foundry {
    namespace applications {
        namespace api {
            const ApplicationV2: any;
            function HandlebarsApplicationMixin(base: any): any;
        }
        namespace handlebars {
            function loadTemplates(paths: string[]): Promise<unknown>;
        }
    }
}

interface FoundryModule {
    id: string;
    title: string;
    version: string;
    active: boolean;
    api?: unknown;
}

interface FoundryUser {
    id: string;
    name: string;
    isGM: boolean;
    active: boolean;
}

interface FontDefinition {
    editor: boolean;
    fonts: {
        urls: string[];
        weight?: string;
    }[];
}

interface SceneControls {
    tokens: {
        tools: Record<string, {}>;
    }
}

declare const CONFIG: {
    fontDefinitions: Record<string, FontDefinition>;
};

declare const game: {
    modules: {
        get(id: string): FoundryModule | undefined
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, unknown>): string
    };
    settings: {
        register(namespace: string, key: string, data: object): void;
        get(namespace: string, key: string): unknown;
    };
    user: FoundryUser;
    users: {
        activeGM: FoundryUser | null;
        filter(predicate: (user: FoundryUser) => boolean): FoundryUser[];
    };
};

declare const Hooks: {
    once(hook: string, fn: (...args: any[]) => void): number;
    on(hook: string, fn: (...args: any[]) => void): number;
    off(hook: string, id: number): void;
    callAll(hook: string, ...args: any[]): boolean;
};

interface PostedNotification {
    element?: HTMLElement;
}

declare const ui: {
    notifications?: {
        info(message: string): PostedNotification;
        warn(message: string): PostedNotification;
        error(message: string): PostedNotification
    };
};

declare const Handlebars: {
    registerHelper(name: string, fn: (...args: any[]) => unknown): void;
};
