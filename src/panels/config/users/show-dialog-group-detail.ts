import { fireEvent } from "../../../common/dom/fire_event";
import type { AccessGroup } from "../../../data/access_group";

export interface GroupDetailDialogParams {
  entry?: AccessGroup;
  groupUpdatedCallback: (group: AccessGroup) => void;
  groupDeletedCallback?: (group: AccessGroup) => Promise<void>;
}

export const showGroupDetailDialog = (
  element: HTMLElement,
  params: GroupDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-group-detail",
    dialogImport: () => import("./dialog-group-detail"),
    dialogParams: params,
  });
};
