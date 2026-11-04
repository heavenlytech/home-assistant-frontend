import { fireEvent } from "../../../common/dom/fire_event";

export interface GroupsListDialogParams {
  groupsChangedCallback?: () => void;
}

export const showGroupsListDialog = (
  element: HTMLElement,
  params: GroupsListDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-groups-list",
    dialogImport: () => import("./dialog-groups-list"),
    dialogParams: params,
  });
};
