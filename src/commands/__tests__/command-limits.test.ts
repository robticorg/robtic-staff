import { describe, expect, it } from "bun:test";
import { commands } from "../index.ts";

const DISCORD_MAX_SUBCOMMANDS = 25;
const DISCORD_MAX_OPTIONS = 25;
const DISCORD_MAX_CHOICES = 25;
const DISCORD_MAX_DESCRIPTION = 100;
const DISCORD_MAX_NAME = 32;

interface RawOption {
  type: number;
  name: string;
  description: string;
  options?: RawOption[];
  choices?: unknown[];
}

const SUBCOMMAND = 1;
const SUBCOMMAND_GROUP = 2;

function json(command: (typeof commands)[number]) {
  return command.data.toJSON() as unknown as {
    name: string;
    description: string;
    options?: RawOption[];
  };
}

describe("slash command Discord limits", () => {
  it("keeps every command within the 25-subcommand cap", () => {
    for (const command of commands) {
      const built = json(command);
      const subs = (built.options ?? []).filter(
        (o) => o.type === SUBCOMMAND || o.type === SUBCOMMAND_GROUP,
      );
      expect(
        subs.length,
        `/${built.name} has ${subs.length} subcommands (max ${DISCORD_MAX_SUBCOMMANDS})`,
      ).toBeLessThanOrEqual(DISCORD_MAX_SUBCOMMANDS);
    }
  });

  it("keeps every subcommand within the 25-option cap", () => {
    for (const command of commands) {
      const built = json(command);
      for (const option of built.options ?? []) {
        const children = option.options ?? [];
        expect(
          children.length,
          `/${built.name} ${option.name} has ${children.length} options`,
        ).toBeLessThanOrEqual(DISCORD_MAX_OPTIONS);
      }
    }
  });

  it("keeps every choice list within the 25-choice cap", () => {
    const walk = (options: RawOption[], path: string): void => {
      for (const option of options) {
        const choices = option.choices ?? [];
        expect(
          choices.length,
          `${path} ${option.name} has ${choices.length} choices`,
        ).toBeLessThanOrEqual(DISCORD_MAX_CHOICES);
        if (option.options) walk(option.options, `${path} ${option.name}`);
      }
    };
    for (const command of commands) {
      const built = json(command);
      walk(built.options ?? [], `/${built.name}`);
    }
  });

  it("keeps names and descriptions inside Discord's length limits", () => {
    const walk = (options: RawOption[], path: string): void => {
      for (const option of options) {
        expect(option.name.length, `${path} ${option.name} name`).toBeLessThanOrEqual(
          DISCORD_MAX_NAME,
        );
        expect(
          option.description.length,
          `${path} ${option.name} description`,
        ).toBeLessThanOrEqual(DISCORD_MAX_DESCRIPTION);
        if (option.options) walk(option.options, `${path} ${option.name}`);
      }
    };
    for (const command of commands) {
      const built = json(command);
      expect(built.name.length, `/${built.name} name`).toBeLessThanOrEqual(DISCORD_MAX_NAME);
      expect(built.description.length, `/${built.name} description`).toBeLessThanOrEqual(
        DISCORD_MAX_DESCRIPTION,
      );
      walk(built.options ?? [], `/${built.name}`);
    }
  });

  it("gives every command a unique name", () => {
    const names = commands.map((c) => json(c).name);
    expect(new Set(names).size).toBe(names.length);
  });
});
