import {
  mdiCrownCircleOutline,
  mdiAlphaSCircleOutline,
  mdiHomeCircleOutline,
  mdiCancel,
} from "@mdi/js";
import type { HomeAssistant, TranslationDict } from "../types";
import type { Credential } from "./auth";

export const SYSTEM_GROUP_ID_ADMIN = "system-admin";
export const SYSTEM_GROUP_ID_USER = "system-users";
export const SYSTEM_GROUP_ID_READ_ONLY = "system-read-only";

export const GROUPS = [SYSTEM_GROUP_ID_USER, SYSTEM_GROUP_ID_ADMIN];

export interface User {
  id: string;
  username: string | null;
  name: string;
  is_owner: boolean;
  is_active: boolean;
  local_only: boolean;
  system_generated: boolean;
  group_ids: (keyof TranslationDict["groups"])[];
  credentials: Credential[];
}

export interface UpdateUserParams {
  name?: User["name"];
  is_active?: User["is_active"];
  group_ids?: User["group_ids"];
  local_only?: boolean;
}

export interface EntityRule {
  read?: boolean;
  control?: boolean;
  edit?: boolean;
  configure?: boolean;
}

export type EntityRuleValue = EntityRule | true;

export interface UserPolicyEntities {
  entity_ids?: Record<string, EntityRuleValue>;
  device_ids?: Record<string, EntityRuleValue>;
  area_ids?: Record<string, EntityRuleValue>;
  domains?: Record<string, EntityRuleValue>;
  all?: EntityRuleValue;
}

export interface UserPolicy {
  entities?: UserPolicyEntities;
}

export const fetchUserPermissions = async (
  hass: HomeAssistant,
  userId: string
) =>
  hass.callWS<{ policy: UserPolicy }>({
    type: "config/auth/permissions/get",
    user_id: userId,
  });

export const updateUserPermissions = async (
  hass: HomeAssistant,
  userId: string,
  policy: UserPolicy | null
) =>
  hass.callWS<{ policy: UserPolicy }>({
    type: "config/auth/permissions/update",
    user_id: userId,
    policy,
  });

export const normalizeRule = (
  value: EntityRuleValue | undefined
): EntityRule => {
  if (value === true) {
    return { read: true, control: true, edit: true, configure: true };
  }
  return { ...(value ?? {}) };
};

export const ruleHasRights = (rule: EntityRule): boolean =>
  Boolean(rule.read || rule.control || rule.edit || rule.configure);

export type AccessMode =
  "open" | "read_only" | "least_privileged" | "open_unless_specified";

export const ACCESS_MODES: AccessMode[] = [
  "open",
  "read_only",
  "least_privileged",
  "open_unless_specified",
];

export const fetchAccessDefaults = async (hass: HomeAssistant) =>
  hass.callWS<{ mode: AccessMode }>({
    type: "config/auth/defaults/get",
  });

export const updateAccessDefaults = async (
  hass: HomeAssistant,
  mode: AccessMode
) =>
  hass.callWS<{ mode: AccessMode }>({
    type: "config/auth/defaults/update",
    mode,
  });

export const policyHasRules = (policy: UserPolicy | null): boolean => {
  if (!policy?.entities) {
    return false;
  }
  return Object.values(policy.entities).some(
    (subcategory) =>
      subcategory === true ||
      (typeof subcategory === "object" &&
        Object.values(subcategory).some(
          (rule) => rule === true || ruleHasRights(rule as EntityRule)
        ))
  );
};

export const fetchUsers = async (callWS: HomeAssistant["callWS"]) =>
  callWS<User[]>({
    type: "config/auth/list",
  });

export const createUser = async (
  hass: HomeAssistant,
  name: string,
  // eslint-disable-next-line: variable-name
  group_ids?: User["group_ids"],
  local_only?: boolean
) =>
  hass.callWS<{ user: User }>({
    type: "config/auth/create",
    name,
    group_ids,
    local_only,
  });

export const updateUser = async (
  hass: HomeAssistant,
  userId: string,
  params: UpdateUserParams
) =>
  hass.callWS<{ user: User }>({
    ...params,
    type: "config/auth/update",
    user_id: userId,
  });

export const deleteUser = async (hass: HomeAssistant, userId: string) =>
  hass.callWS<undefined>({
    type: "config/auth/delete",
    user_id: userId,
  });

export const computeUserInitials = (name: string) => {
  if (!name) {
    return "?";
  }
  return (
    name
      .trim()
      // Split by space and take first 3 words
      .split(" ")
      .slice(0, 3)
      // Of each word, take first letter
      .map((s) => s.substring(0, 1))
      .join("")
  );
};

const OWNER_ICON = mdiCrownCircleOutline;
const SYSTEM_ICON = mdiAlphaSCircleOutline;
const LOCAL_ICON = mdiHomeCircleOutline;
const DISABLED_ICON = mdiCancel;

export const computeUserBadges = (
  hass: HomeAssistant,
  user: User,
  includeSystem: boolean
) => {
  const labels: [string, string][] = [];
  const translate = (
    key: Extract<
      keyof TranslationDict["ui"]["panel"]["config"]["users"],
      `is_${string}`
    >
  ) => hass.localize(`ui.panel.config.users.${key}`);

  if (user.is_owner) {
    labels.push([OWNER_ICON, translate("is_owner")]);
  }
  if (includeSystem && user.system_generated) {
    labels.push([SYSTEM_ICON, translate("is_system")]);
  }
  if (user.local_only) {
    labels.push([LOCAL_ICON, translate("is_local")]);
  }
  if (!user.is_active) {
    labels.push([DISABLED_ICON, translate("is_not_active")]);
  }

  return labels;
};
