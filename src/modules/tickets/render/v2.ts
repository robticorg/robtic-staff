import {
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  type BaseMessageOptions,
} from "discord.js";
import type { TicketV2Content } from "../../../data/tickets/index.ts";

export function v2MessageOptions(container: ContainerBuilder): BaseMessageOptions {
  return { components: [container], flags: MessageFlags.IsComponentsV2 } as BaseMessageOptions;
}

export function applyV2Content(container: ContainerBuilder, content: TicketV2Content): ContainerBuilder {
  if (typeof content.accentColor === "number") container.setAccentColor(content.accentColor);

  const blocks = content.text.filter((b) => b.trim().length > 0);

  if (content.thumbnail && blocks.length > 0) {
    const [first, ...rest] = blocks;
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(first!))
        .setThumbnailAccessory((t) => t.setURL(content.thumbnail!)),
    );
    for (const block of rest) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
    }
  } else {
    for (const block of blocks) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block));
    }
  }

  if (content.image) {
    container.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(content.image!)));
  }

  if (content.footer) {
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${content.footer}`));
  }

  return container;
}
