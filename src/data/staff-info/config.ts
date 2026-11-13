import { L, currentLang } from "../../shared/utils/lang-context.ts";

export interface StaffInfoPanelContent {
  image: string;
  text: string[];
  selectPlaceholder: string;
  footer?: string;
}

export const staffInfoPanelContent: StaffInfoPanelContent = {
  image: "",
  get text() {
    return currentLang() === "en"
      ? ["## Staff information", "Everything you need as a staff member is here.", "-# Pick a topic below; it's shown to you privately."]
      : ["## معلومات الإدارة", "كل اللي تحتاجه كإداري موجود هنا.", "-# اختر الموضوع من القائمة، ويظهر لك بشكل خاص."];
  },
  get selectPlaceholder() { return L("Choose what you need", "اختر المعلومة اللي تحتاجها"); },
};

export const staffInfoLimits = {
  maxInfos: 25,
  maxPages: 25,
  nameMaxLength: 80,
  descriptionMaxLength: 100,
  contentMaxLength: 4000,
} as const;
