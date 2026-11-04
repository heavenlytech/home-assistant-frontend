import { mdiDelete, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/device/ha-device-picker";
import "../../../components/ha-area-picker";
import "../../../components/ha-button";
import "../../../components/ha-icon-button";
import "../../../components/ha-select";
import "../../../components/ha-svg-icon";
import "../../../components/ha-switch";
import type {
  EntityRule,
  EntityRuleValue,
  UserPolicy,
  UserPolicyEntities,
} from "../../../data/user";
import { normalizeRule, ruleHasRights } from "../../../data/user";
import type { HomeAssistant } from "../../../types";

type PermissionRight = keyof EntityRule;

const RIGHTS: PermissionRight[] = ["read", "control", "edit", "configure"];

type RuleSubcategory = "device_ids" | "area_ids" | "domains";

const SECTIONS = [
  {
    subcategory: "device_ids",
    titleKey: "ui.panel.config.users.editor.permissions.devices",
    pickerKey: "ui.panel.config.users.editor.permissions.select_device",
  },
  {
    subcategory: "area_ids",
    titleKey: "ui.panel.config.users.editor.permissions.areas",
    pickerKey: "ui.panel.config.users.editor.permissions.select_area",
  },
  {
    subcategory: "domains",
    titleKey: "ui.panel.config.users.editor.permissions.domains",
    pickerKey: "ui.panel.config.users.editor.permissions.select_domain",
  },
] as const;

type SectionConfig = (typeof SECTIONS)[number];

@customElement("user-permissions-editor")
export class UserPermissionsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public policy: UserPolicy = {};

  @property({ type: Boolean }) public disabled = false;

  @state() private _newTarget: Record<RuleSubcategory, string> = {
    device_ids: "",
    area_ids: "",
    domains: "",
  };

  protected render() {
    return html`
      <div class="intro">
        ${this.hass.localize(
          "ui.panel.config.users.editor.permissions.description"
        )}
      </div>
      ${this._sectionTemplates()}
    `;
  }

  private _sectionTemplates() {
    return SECTIONS.map((section) => this._renderSection(section));
  }

  private _renderSection(section: SectionConfig) {
    const subcategoryValue = this.policy.entities?.[section.subcategory];
    const rules: [string, EntityRuleValue][] =
      subcategoryValue && typeof subcategoryValue === "object"
        ? Object.entries(subcategoryValue)
        : [];
    const pending = this._newTarget[section.subcategory];

    return html`
      <div class="section">
        <div class="section-title">${this.hass.localize(section.titleKey)}</div>
        ${
          rules.length === 0
            ? html`<div class="secondary">
                ${this.hass.localize(
                  "ui.panel.config.users.editor.permissions.no_rules"
                )}
              </div>`
            : nothing
        }
        ${this._ruleTemplates(section.subcategory, rules)}
        <div class="add-row">
          ${
            section.subcategory === "device_ids"
              ? html`
                  <ha-device-picker
                    .label=${this.hass.localize(section.pickerKey)}
                    .value=${pending}
                    .disabled=${this.disabled}
                    .subcategory=${section.subcategory}
                    @value-changed=${this._targetPicked}
                  ></ha-device-picker>
                `
              : nothing
          }
          ${
            section.subcategory === "area_ids"
              ? html`
                  <ha-area-picker
                    .label=${this.hass.localize(section.pickerKey)}
                    .value=${pending}
                    .disabled=${this.disabled}
                    .subcategory=${section.subcategory}
                    @value-changed=${this._targetPicked}
                  ></ha-area-picker>
                `
              : nothing
          }
          ${
            section.subcategory === "domains"
              ? html`
                  <ha-select
                    .label=${this.hass.localize(section.pickerKey)}
                    .value=${pending}
                    .options=${this._domains()}
                    .disabled=${this.disabled}
                    .subcategory=${section.subcategory}
                    @selected=${this._targetPicked}
                  ></ha-select>
                `
              : nothing
          }
          <ha-button
            appearance="plain"
            .disabled=${!pending || this.disabled}
            .subcategory=${section.subcategory}
            @click=${this._addRule}
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.users.editor.permissions.add"
            )}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _ruleTemplates(
    subcategory: RuleSubcategory,
    rules: [string, EntityRuleValue][]
  ) {
    return rules.map(([target, value]) =>
      this._renderRule(subcategory, target, normalizeRule(value))
    );
  }

  private _renderRule(
    subcategory: RuleSubcategory,
    target: string,
    rule: EntityRule
  ) {
    return html`
      <div class="rule">
        <div class="rule-target" title=${target}>
          ${this._targetName(subcategory, target)}
        </div>
        <div class="rights">
          ${this._rightTemplates(subcategory, target, rule)}
          <ha-icon-button
            .path=${mdiDelete}
            .disabled=${this.disabled}
            .subcategory=${subcategory}
            .ruleTarget=${target}
            .label=${this.hass.localize(
              "ui.panel.config.users.editor.permissions.remove_rule"
            )}
            @click=${this._removeRule}
          ></ha-icon-button>
        </div>
      </div>
    `;
  }

  private _rightTemplates(
    subcategory: RuleSubcategory,
    target: string,
    rule: EntityRule
  ) {
    return RIGHTS.map(
      (right) => html`
        <label class="right" title=${right}>
          <ha-switch
            .checked=${rule[right] === true}
            .disabled=${this.disabled}
            .subcategory=${subcategory}
            .ruleTarget=${target}
            .permissionRight=${right}
            @change=${this._rightChanged}
          ></ha-switch>
          <span>
            ${this.hass.localize(
              `ui.panel.config.users.editor.permissions.right_${right}`
            )}
          </span>
        </label>
      `
    );
  }

  private _targetName(subcategory: RuleSubcategory, target: string): string {
    if (subcategory === "device_ids") {
      const device = this.hass.devices?.[target];
      if (device) {
        return computeDeviceNameDisplay(device, this.hass.localize);
      }
      return target;
    }
    if (subcategory === "area_ids") {
      return this.hass.areas?.[target]?.name ?? target;
    }
    return target;
  }

  private _domains(): string[] {
    const domains = new Set<string>();
    for (const entityId of Object.keys(this.hass.states)) {
      domains.add(entityId.split(".", 1)[0]);
    }
    return [...domains].sort();
  }

  private _targetPicked(ev: CustomEvent) {
    const subcategory = (ev.currentTarget as any).subcategory as
      RuleSubcategory | undefined;
    if (!subcategory) {
      return;
    }
    this._newTarget = {
      ...this._newTarget,
      [subcategory]: ev.detail.value ?? "",
    };
  }

  private _addRule(ev: Event) {
    const subcategory = (ev.currentTarget as any).subcategory as
      RuleSubcategory | undefined;
    if (!subcategory) {
      return;
    }
    const target = this._newTarget[subcategory];
    if (!target) {
      return;
    }
    const entities: UserPolicyEntities = { ...(this.policy.entities ?? {}) };
    const current = entities[subcategory];
    const rules: Record<string, EntityRuleValue> =
      current && typeof current === "object" ? { ...current } : {};
    if (!(target in rules)) {
      rules[target] = { read: true };
    }
    entities[subcategory] = rules;
    this._newTarget = { ...this._newTarget, [subcategory]: "" };
    fireEvent(this, "value-changed", { value: { entities } });
  }

  private _removeRule(ev: Event) {
    const element = ev.currentTarget as any;
    const subcategory = element.subcategory as RuleSubcategory | undefined;
    const target = element.ruleTarget as string | undefined;
    if (!subcategory || !target) {
      return;
    }
    const entities: UserPolicyEntities = { ...(this.policy.entities ?? {}) };
    const current = entities[subcategory];
    if (!current || typeof current !== "object") {
      return;
    }
    const rules = { ...current };
    delete rules[target];
    if (Object.keys(rules).length === 0) {
      delete entities[subcategory];
    } else {
      entities[subcategory] = rules;
    }
    fireEvent(this, "value-changed", { value: { entities } });
  }

  private _rightChanged(ev: Event) {
    const element = ev.currentTarget as any;
    const subcategory = element.subcategory as RuleSubcategory | undefined;
    const target = element.ruleTarget as string | undefined;
    const right = element.permissionRight as PermissionRight | undefined;
    if (!subcategory || !target || !right) {
      return;
    }
    const checked = (ev.target as HTMLInputElement).checked;
    const entities: UserPolicyEntities = { ...(this.policy.entities ?? {}) };
    const current = entities[subcategory];
    const rules: Record<string, EntityRuleValue> =
      current && typeof current === "object" ? { ...current } : {};
    const rule: EntityRule = {
      ...normalizeRule(rules[target]),
      [right]: checked,
    };
    if (ruleHasRights(rule)) {
      const clean: EntityRule = {};
      for (const key of RIGHTS) {
        if (rule[key] === true) {
          clean[key] = true;
        }
      }
      rules[target] = clean;
    } else {
      delete rules[target];
    }
    if (Object.keys(rules).length === 0) {
      delete entities[subcategory];
    } else {
      entities[subcategory] = rules;
    }
    fireEvent(this, "value-changed", { value: { entities } });
  }

  static styles: CSSResultGroup = css`
    .intro {
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
    .section {
      margin-top: 16px;
    }
    .section-title {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .secondary {
      color: var(--secondary-text-color);
    }
    .rule {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color);
    }
    .rule-target {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rights {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
    }
    .right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .add-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .add-row ha-device-picker,
    .add-row ha-area-picker,
    .add-row ha-select {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "user-permissions-editor": UserPermissionsEditor;
  }
}
