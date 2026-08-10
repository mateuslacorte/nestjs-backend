export interface ActiveDirectoryProfilePayload {
    activeDirectoryId: string;
    email: string;
    firstName: string;
    lastName: string;
    samAccountName?: string;
    /** AD `memberOf` group DNs (security groups from AD / GPO membership). */
    groups: string[];
}
