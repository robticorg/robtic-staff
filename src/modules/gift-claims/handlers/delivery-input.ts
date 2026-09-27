import type { ModalSubmitInteraction } from "discord.js";
import type { UploadedProof } from "../services/delivery/manual-gift-delivery.service.ts";

export function modalText(interaction: ModalSubmitInteraction, id: string): string {
  try {
    return interaction.fields.getTextInputValue(id).trim();
  } catch {
    return "";
  }
}

export function modalUploads(interaction: ModalSubmitInteraction, id: string): UploadedProof[] {
  try {
    const files = interaction.fields.getUploadedFiles(id);
    return [...(files?.values() ?? [])].map((file) => ({
      name: file.name,
      url: file.url,
      contentType: file.contentType,
      size: file.size,
    }));
  } catch {
    return [];
  }
}
