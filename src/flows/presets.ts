import { Flow } from "src/db/prisma/client";

export const flowPresets: Record<string, Partial<Flow>> = {
    // TODO: set display and feature options!
    community: {
        publicPermissions: {
            read: 'allow',
            post: 'allow',
            join: 'allow',
            view: 'allow'
        },
        joinedPermissions: {}
    },
    private_group: {
        publicPermissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joinedPermissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
        }
    },
    story: {
        publicPermissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joinedPermissions: {
            post: 'allow',
            pin: 'deny',
            delete: 'deny',
            anonymous: 'force'
        }
    },
    channel: {
        publicPermissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joinedPermissions: {
            post: 'allow',
            pin: 'allow',
            delete: 'allow',
            anonymous: 'force'
        }
    },
    anonymous_group: {
        publicPermissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joinedPermissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
            anonymous: 'force'
        }
    },
    blog: {
        publicPermissions: {
            read: 'allow',
            view: 'allow',
            post: 'deny',
            join: 'deny',
            pin: 'deny',
            delete: 'deny'
        },
        joinedPermissions: {
            post: 'allow',
            pin: 'allow',
            delete: 'allow'
        }
    },
    collection: {
        publicPermissions: {
            read: 'deny',
            post: 'deny',
            join: 'deny',
            view: 'deny',
        },
        joinedPermissions: {
            read: 'allow',
            post: 'allow',
            view: 'allow',
            delete: 'deny',
            pin: 'allow',
            anonymous: 'deny'
        }
    }
}