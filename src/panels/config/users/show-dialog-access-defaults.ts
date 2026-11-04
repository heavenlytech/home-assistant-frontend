import { fireEvent } from "../../../common/dom/fire_event";

export interface AccessDefaultsDialogParams {
  accessChangedCallback: () => void;
}

export const loadAccessDefaultsDialog = () =>
  import("./dialog-access-defaults");

export const showAccessDefaultsDialog = (
  element: HTMLElement,
  dialogParams: AccessDefaultsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-access-defaults",
    dialogImport: loadAccessDefaultsDialog,
    dialogParams,
  });
};
