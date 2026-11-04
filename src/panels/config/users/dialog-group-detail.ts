import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/input/ha-input";
import type { HaInput } from "../../../components/input/ha-input";
import { createGroup, updateGroup } from "../../../data/access_group";
import type { UserPolicy } from "../../../data/user";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { GroupDetailDialogParams } from "./show-dialog-group-detail";
import "./user-permissions-editor";

@customElement("dialog-group-detail")
class DialogGroupDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _name = "";

  @state() private _policy: UserPolicy = {};

  @state() private _error?: string;

  @state() private _params?: GroupDetailDialogParams;

  @state() private _open = false;

  @state() private _submitting = false;

  public async showDialog(params: GroupDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry?.name ?? "";
    this._policy = params.entry?.policy ?? {};
    this._open = true;
    await this.updateComplete;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isNew = !this._params.entry;
    const systemGroup = this._params.entry?.system_generated ?? false;
    return html`
      <ha-dialog
        .open=${this._open}
        .headerTitle=${
          isNew
            ? this.hass.localize("ui.panel.config.users.groups.add_group")
            : this._params.entry!.name
        }
        @closed=${this._dialogClosed}
      >
        <div>
          ${
            this._error
              ? html`<div class="error">${this._error}</div>`
              : nothing
          }
          <div class="form">
            <ha-input
              autofocus
              .value=${this._name}
              @input=${this._nameChanged}
              .label=${this.hass.localize("ui.panel.config.users.groups.name")}
              .disabled=${this._submitting || systemGroup}
            ></ha-input>
            ${
              systemGroup
                ? html`<div class="secondary">
                    ${this.hass.localize(
                      "ui.panel.config.users.groups.system_read_only"
                    )}
                  </div>`
                : html`
                    <div class="permissions-header">
                      ${this.hass.localize(
                        "ui.panel.config.users.editor.permissions.title"
                      )}
                    </div>
                    <user-permissions-editor
                      .hass=${this.hass}
                      .policy=${this._policy}
                      .disabled=${this._submitting}
                      @value-changed=${this._policyChanged}
                    ></user-permissions-editor>
                  `
            }
          </div>
        </div>

        <ha-dialog-footer slot="footer">
          ${
            !isNew && !systemGroup
              ? html`
                  <ha-button
                    slot="secondaryAction"
                    variant="danger"
                    appearance="plain"
                    @click=${this._deleteEntry}
                    .disabled=${this._submitting}
                  >
                    ${this.hass.localize("ui.common.delete")}
                  </ha-button>
                `
              : nothing
          }
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${!this._name.trim() || this._submitting || systemGroup}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: InputEvent) {
    this._error = undefined;
    this._name = (ev.target as HaInput).value ?? "";
  }

  private _policyChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    if (typeof value !== "object" || value === null) {
      return;
    }
    this._policy = value;
  }

  private async _save() {
    this._submitting = true;
    try {
      if (this._params!.entry) {
        const { group } = await updateGroup(this.hass, this._params!.entry.id, {
          name: this._name.trim(),
          policy: this._policy,
        });
        this._params!.groupUpdatedCallback(group);
      } else {
        const { group } = await createGroup(
          this.hass,
          this._name.trim(),
          this._policy
        );
        this._params!.groupUpdatedCallback(group);
      }
      this._close();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    if (!this._params!.entry || !this._params!.groupDeletedCallback) {
      return;
    }
    this._submitting = true;
    try {
      await this._params!.groupDeletedCallback(this._params!.entry);
      this._close();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
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
        .form {
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .permissions-header {
          font-weight: 500;
        }
        .secondary {
          color: var(--secondary-text-color);
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
    "dialog-group-detail": DialogGroupDetail;
  }
}
