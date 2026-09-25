declare namespace foundry {
    namespace utils {
        function isNewerVersion(v1: string, v0: string): boolean;
    }
    namespace applications {
        const instances: Map<string, FoundryApp>;
        namespace api {
            const ApplicationV2: any;
            const DialogV2: any;
            function HandlebarsApplicationMixin(base: any): any;
        }
        namespace apps {
            const FilePicker: { implementation: any };
        }
        namespace handlebars {
            function loadTemplates(paths: string[]): Promise<unknown>;
            function renderTemplate(path: string, data: object): Promise<string>;
        }
        namespace ux {
            const FormDataExtended: any;
            const TextEditor: { implementation: any };
        }
    }
}

interface Math {
    clamp(value: number, min: number, max: number): number;
}

interface FoundryApp {
    render(options?: unknown): unknown;
}

interface SettingsSheet extends FoundryApp {
    element: HTMLElement;
    changeTab(tab: string, group: string, options?: { force?: boolean }): void;
}

interface FoundryModule {
    id: string;
    title: string;
    version: string;
    manifest: string;
    relationships: {
        requires: Set<{ id: string }>;
    };
    active: boolean;
    api?: unknown;
}

interface FoundryUser {
    id: string;
    isGM: boolean;
    active: boolean;
}

interface FoundryCombatant {
    id: string;
    tokenId: string | null;
    actorId: string | null;
}

interface FoundryCombat {
    id: string;
    round: number;
    turn: number | null;
    started: boolean;
    combatant: FoundryCombatant | undefined;
}

interface FoundryToken {
    id: string;
}

interface FontDefinition {
    editor: boolean;
    fonts: {
        urls: string[];
        weight?: string;
    }[];
}

declare const CONFIG: {
    fontDefinitions: Record<string, FontDefinition>;
};

declare const game: {
    version: string;
    clipboard: {
        copyPlainText(text: string): Promise<void>;
    };
    system: {
        id: string;
        version: string;
    };
    combat: FoundryCombat | null;
    combats: {
        viewed: FoundryCombat | null;
    };
    modules: {
        get(id: string): FoundryModule | undefined;
        filter(predicate: (module: FoundryModule) => boolean): FoundryModule[];
    };
    i18n: {
        localize(key: string): string;
        format(key: string, data?: Record<string, unknown>): string
    };
    settings: {
        register(namespace: string, key: string, data: object): void;
        registerMenu(namespace: string, key: string, data: object): void;
        get(namespace: string, key: string): unknown;
        set(namespace: string, key: string, value: unknown): Promise<unknown>;
        settings: Map<string, unknown>;
        sheet: SettingsSheet;
    };
    user: FoundryUser;
    users: {
        activeGM: FoundryUser | null;
        filter(predicate: (user: FoundryUser) => boolean): FoundryUser[];
    };
};

declare const canvas: {
    tokens?: {
        get(id: string): FoundryToken | undefined;
    };
};

declare const Hooks: {
    events: Record<string, {
        id: number;
        fn: unknown
    }[] | undefined>;
    once(hook: string, fn: (...args: any[]) => void): number;
    on(hook: string, fn: (...args: any[]) => void): number;
    off(hook: string, id: number): void;
    callAll(hook: string, ...args: any[]): boolean;
};

interface PostedNotification {
    element?: HTMLElement;
}

declare const ui: {
    windows: Record<number, FoundryApp>;
    notifications?: {
        info(message: string): PostedNotification;
        warn(message: string): PostedNotification;
        error(message: string): PostedNotification
    };
};

declare const Handlebars: {
    registerHelper(name: string, fn: (...args: any[]) => unknown): void;
};
