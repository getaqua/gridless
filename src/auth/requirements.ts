/// Password requirements. Configuration will be validated against this interface.
export interface IPasswordRequirements {
    /** Minimum number of characters in a password. */
    minLength: number
    /** Maximum password length. If null, there is no limit. */
    maxLength?: number

    /** Minimum number of capital/uppercase letters: /[A-Z]/ */
    minCapitals: number
    /** Maximum number of capital/uppercase letters: /[A-Z]/
     * 
     *  If null, there is no limit. */
    maxCapitals?: number

    /** Minimum number of capital/uppercase letters: /[a-z]/ */
    minLowercase: number
    /** Maximum number of lowercase letters: /[a-z]/
     * 
     *  If null, there is no limit. */
    maxLowercase?: number

    /** Minimum number of numerals. /[0-9]/ */
    minDigits: number
    /** Maximum number of numerals. /[0-9]/
     * 
     * If null, there is no limit. */
    maxDigits?: number

    /** Minimum number of symbols. The following are categorized as "symbols":
      * `~!#@$%^&*()-_+=?><:"'{}[]\\| */
    minSymbols: number
    /** Maximum number of symbols. If null, there is no limit. */
    maxSymbols?: number
}

export const defaultPasswordRequirements: IPasswordRequirements = {
    minLength: 8,
    minCapitals: 1,
    minDigits: 1,
    minLowercase: 1,
    minSymbols: 1
}

export const passwordSymbols: String[] = Array.from(`\`~!#@$%^&*()-_+=?><:"'{}[]\\|`);

/** The characters allowed in a username or flow slug (ID).
 * Other requirements include:
 * * Another user does not have this username.
 * * An ID does not exist on this server with this username.
 * * A search for `//` cannot succeed. That is, two or more successive forward slashes are not allowed.
 * However, one is allowed anywhere in the **middle** of the string (that is, not at the beginning or the end).
 * * A search for `/#/` cannot succeed. That is a separator for "internal" Flows for a user, such as
 * Friends and Following.
 * 
 * Errors should be provided to the user as follows:
 * * Username taken. (`USERNAME_TAKEN`)
 * * Invalid formatting. Two or more consecutive forward-slashes (/) are not allowed. (`INVALID_FORMAT_SLASHES`)
 * * Invalid formatting. Forward-slashes (/) are not allowed at the beginning or end of the name. (`INVALID_FORMAT_SLASHES_PLACEMENT`)
 * * Invalid formatting. The sequence /#/ is not allowed. (`INVALID_FORMAT_INTERNAL`)
 */
export const usernameRequirements: RegExp = /^[a-zA-Z0-9*!#@._\-+=,\/]{3,}$/