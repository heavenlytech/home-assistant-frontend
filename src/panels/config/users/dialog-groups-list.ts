import { mdiPencil, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { AccessGroup } from "../../../data/access_group";
import { deleteGroup, fetchGroups } from "../../../data/access_group";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showGroupDetailDialog } from "./show-dialog-group-detail";
import type { GroupsListDialogParams } from "./show-dialog-groups-list";

@customElement("dialog-groups-list")
class DialogGroupsList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _groups: AccessGroup[] = [];

  @state() private _loading = true;

  @state() private _error?: string;

  @state() private _params?: GroupsListDialogParams;

  @state() private _open = false;

  public async showDialog(params: GroupsListDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._open = true;
    await this._fetchGroups();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.config.users.groups.title")}
        @closed=${this._dialogClosed}
      >
        <div>
          ${
            this._error
              ? html`<div class="error">${this._error}</div>`
              : nothing
          }
          ${
            this._loading
              ? html`<div class="secondary">
                  ${this.hass.localize("ui.common.loading")}
                </div>`
              : html`
                  <div class="groups">
                    ${this._groups.map(
                      (group) => html`
                        <div class="group-row">
                          <div class="group-info">
                            <div class="group-name">${group.name}</div>
                            <div class="secondary">
                              ${this.hass.localize(
                                "ui.panel.config.users.groups.member_count",
                                { count: group.member_ids.length }
                              )}
                              ${
                                group.system_generated
                                  ? html` ·
                                    ${this.hass.localize(
                                      "ui.panel.config.users.groups.system_group"
                                    )}`
                                  : nothing
                              }
                            </div>
                          </div>
                          ${
                            group.system_generated
                              ? nothing
                              : html`
                                  <ha-icon-button
                                    .path=${mdiPencil}
                                    .label=${this.hass.localize("ui.common.edit")}
                                    data-group-id=${group.id}
                                    @click=${this._editGroupClick}
                                  ></ha-icon-button>
                                `
                          }
                        </div>
                      `
                    )}
                  </div>
                `
          }
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this._addGroup}>
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.users.groups.add_group")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _fetchGroups() {
    this._loading = true;
    try {
      this._groups = await fetchGroups(this.hass);
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._loading = false;
    }
  }

  private _addGroup() {
    showGroupDetailDialog(this, {
      groupUpdatedCallback: (group: AccessGroup) => {
        this._groups = [...this._groups, group];
      },
    });
  }

  private _editGroupClick(ev: Event) {
    const groupId = (ev.currentTarget as HTMLElement).dataset.groupId;
    const group = this._groups.find((entry) => entry.id === groupId);
    if (group) {
      this._editGroup(group);
    }
  }

  private _editGroup(group: AccessGroup) {
    showGroupDetailDialog(this, {
      entry: group,
      groupUpdatedCallback: (updated: AccessGroup) => {
        this._groups = this._groups.map((entry) =>
          entry.id === updated.id ? updated : entry
        );
      },
      groupDeletedCallback: async (toDelete: AccessGroup) => {
        if (
          !(await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.users.groups.confirm_deletion_title",
              { name: toDelete.name }
            ),
            text: this.hass.localize(
              "ui.panel.config.users.groups.confirm_deletion_text"
            ),
            dismissText: this.hass.localize("ui.common.cancel"),
            confirmText: this.hass.localize("ui.common.delete"),
            destructive: true,
          }))
        ) {
          return;
        }
        await deleteGroup(this.hass, toDelete.id);
        this._groups = this._groups.filter((entry) => entry.id !== toDelete.id);
      },
    });
  }

  private _close(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .groups {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 320px;
        }
        .group-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        .group-name {
          font-weight: 500;
        }
        .secondary {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .error {
          color: var(--error-color);
          margin-bottom: 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-groups-list": DialogGroupsList;
  }
}
