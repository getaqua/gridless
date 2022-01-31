import { Flow } from '../db/models/flowModel';

export const flowPresets: Record<string, Partial<Flow>> = {
    // TODO: set display and feature options!
    community: {
        public_permissions: {
            read: 'allow',
            post: 'allow',
            join: 'allow',
            view: 'allow'
        },
        joined_permissions: {}
    },
    private_group: {
        public_permissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joined_permissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
        }
    },
    story: {
        public_permissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joined_permissions: {
            post: 'allow',
            pin: 'deny',
            delete: 'deny',
            anonymous: 'force'
        }
    },
    channel: {
        public_permissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joined_permissions: {
            post: 'allow',
            pin: 'allow',
            delete: 'allow',
            anonymous: 'force'
        }
    },
    anonymous_group: {
        public_permissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joined_permissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
            anonymous: 'force'
        }
    },
    blog: {
        public_permissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joined_permissions: {
            post: 'allow',
            pin: 'allow',
            delete: 'allow'
        }
    },
    collection: {
        public_permissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joined_permissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
            anonymous: 'deny'
        }
    }
}