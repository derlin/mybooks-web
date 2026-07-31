export type TagPopupAction = {
  type: 'filter' | 'rename' | 'delete';
  oldTag: string;
  newTag?: string;
};
