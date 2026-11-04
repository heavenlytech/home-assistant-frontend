import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-dialog";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../components/ha-select";
import type { AccessMode } from "../../../data/user";
import {
  ACCESS_MODES,
  fetchAccessDefaults,
  updateAccessDefaults,
} from "../../../data/user";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { AccessDefaultsDialogParams } from "./show-dialog-access-defaults";

@customElement("dialog-access-defaults")
class DialogAccessDefaults extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _mode?: AccessMode;

  @state() private _saving = false;

  @state() private _error?: string;

  @state() private _params?: AccessDefaultsDialogParams;

  @state() private _open = false;

  public async showDialog(params: AccessDefaultsDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._mode = undefined;
    this._open = true;
    try {
      const { mode } = await fetchAccessDefaults(this.hass);
      if (this._params === params) {
        this._mode = mode;
      }
    } catch (err: any) {
      if (this._params === params) {
        this._error = err?.message || "Unknown error";
      }
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.users.defaults.title"
        )}
        @closed=${this._dialogClosed}
      >
        <div>
          ${
            this._error
              ? html`<div class="error">${this._error}</div>`
              : nothing
          }
          <div class="secondary">
            ${this.hass.localize("ui.panel.config.users.defaults.description")}
          </div>
          ${
            this._mode === undefined
              ? nothing
              : html`
                  <ha-select
                    .label=${this.hass.localize(
                      "ui.panel.config.users.defaults.mode"
                    )}
                    .value=${this._mode}
                    .options=${this._modeOptions()}
                    .disabled=${this._saving}
                    @selected=${this._modeSelected}
                  ></ha-select>
                  <div class="mode-description">
                    ${this.hass.localize(
                      `ui.panel.config.users.defaults.mode_${this._mode}_description`
                    )}
                  </div>
                  <ha-alert alert-type="warning">
                    ${this.hass.localize(
                      "ui.panel.config.users.defaults.applies_to_existing"
                    )}
                  </ha-alert>
                `
          }
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._mode === undefined || this._saving}
          >
            ${this.hass!.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _modeOptions() {
    return ACCESS_MODES.map((mode) => ({
      value: mode,
      label: this.hass.localize(`ui.panel.config.users.defaults.mode_${mode}`),
    }));
  }

  private _modeSelected(ev: HaSelectSelectEvent) {
    this._mode = ev.detail.value as AccessMode;
  }

  private async _save() {
    if (!this._mode) {
      return;
    }
    this._saving = true;
    try {
      await updateAccessDefaults(this.hass, this._mode);
      this._params!.accessChangedCallback();
      this._close();
    } catch (err: any) {
      this._error = err?.message || "Unknown error";
    } finally {
      this._saving = false;
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
        .secondary {
          color: var(--secondary-text-color);
          margin-bottom: 16px;
        }
        ha-select {
          display: block;
        }
        .mode-description {
          margin-top: 8px;
          margin-bottom: 16px;
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
    "dialog-access-defaults": DialogAccessDefaults;
  }
}
