
export interface StaffInfoPanelContent {
  image: string;
  text: string[];
  selectPlaceholder: string;
  footer?: string;
}

export const staffInfoPanelContent: StaffInfoPanelContent = {
  image: "",
  text: [
    "## معلومات الإدارة",
    "كل المعلومات والموارد التي تحتاجها كعضو في فريق الإدارة موجودة هنا.",
    "-# اختر القسم الذي تريد معرفة تفاصيله من القائمة بالأسفل، وستظهر المعلومات لك بشكل خاص.",
    "",
    "## Staff Information",
    "All the information and resources you need as a staff member are available here.",
    "-# Select the category you want to know more about from the menu below, and the information will be displayed to you privately.",
  ],
  selectPlaceholder: "اختر المعلومة اللي تحتاجها | Choose the information you need",
};

export const staffInfoLimits = {
  maxInfos: 25,
  maxPages: 25,
  nameMaxLength: 80,
  descriptionMaxLength: 100,
  contentMaxLength: 4000,
} as const;
