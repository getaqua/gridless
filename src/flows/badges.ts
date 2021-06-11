import * as mongoose from "mongoose";
export interface FlowBadge {
  /** The badge's internal ID. Probably a snowflake. */
  id: string
  /** The badge's display name. */
  name: string
  // avatar_url: string
  description?: string
  /** The hex code for the badge's color. */
  color?: string
  /** If this is true, the badge should appear next to someone's name in chat/content. */
  important: boolean
  // /** Like Discord, holders of this badge will be listed above other members in the member list. */
  // hoist: boolean
  // icon_url: string
}

export const FlowBadgeSchema = new mongoose.Schema({
  id: {type: String, required: true},
  name: {type: String, required: true},
  color: {
    type: String,
    required: false,
    maxLength: 9,
    match: /#[0-9a-fA-F]{6}/
  },
  description: {
    type: String, 
    required: false,
    maxLength: 200
  },
  important: {type: Boolean, default: false},
});