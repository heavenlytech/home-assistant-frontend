import type { HomeAssistant } from "../types";
import type { UserPolicy } from "./user";

export interface AccessGroup {
  id: string;
  name: string | null;
  system_generated: boolean;
  policy: UserPolicy;
  member_ids: string[];
}

export interface GroupMutableParams {
  name?: string;
  policy?: UserPolicy;
}

export const fetchGroups = async (hass: HomeAssistant) =>
  hass.callWS<AccessGroup[]>({
    type: "config/auth/group/list",
  });

export const createGroup = async (
  hass: HomeAssistant,
  name: string,
  policy?: UserPolicy
) =>
  hass.callWS<{ group: AccessGroup }>({
    type: "config/auth/group/create",
    name,
    policy,
  });

export const updateGroup = async (
  hass: HomeAssistant,
  groupId: string,
  params: GroupMutableParams
) =>
  hass.callWS<{ group: AccessGroup }>({
    type: "config/auth/group/update",
    group_id: groupId,
    ...params,
  });

export const deleteGroup = async (hass: HomeAssistant, groupId: string) =>
  hass.callWS<undefined>({
    type: "config/auth/group/delete",
    group_id: groupId,
  });
